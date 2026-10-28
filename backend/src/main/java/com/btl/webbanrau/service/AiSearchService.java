package com.btl.webbanrau.service;

import com.btl.webbanrau.dto.response.AiChatResponse;
import com.btl.webbanrau.dto.response.HybridSearchResponse;
import com.btl.webbanrau.dto.response.ProductResponse;
import com.btl.webbanrau.dto.response.SemanticSearchResponse;
import com.btl.webbanrau.model.Product;
import com.btl.webbanrau.repository.ProductRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class AiSearchService {

    private final GeminiService geminiService;
    private final ProductRepository productRepository;
    private final ProductService productService;
    private final JdbcTemplate jdbcTemplate;

    /**
     * Đồng bộ vector embedding cho các sản phẩm trong database
     */
    @Transactional
    public int syncAllProductEmbeddings() {
        List<Product> products = productRepository.findAll();
        int count = 0;

        boolean canCallGemini = geminiService.hasApiKey() && geminiService.testEmbeddingCall();

        for (Product product : products) {
            String semanticText = buildSemanticText(product);
            List<Double> vector;
            if (canCallGemini) {
                vector = geminiService.getEmbedding(semanticText);
            } else {
                vector = geminiService.generateMockEmbedding(semanticText);
            }
            String vectorStr = formatVector(vector);

            String sql = "UPDATE products SET embedding = cast(? as vector) WHERE id = ?";
            jdbcTemplate.update(sql, vectorStr, product.getId());
            count++;
        }

        try {
            jdbcTemplate.execute("REINDEX INDEX products_embedding_hnsw_idx;");
        } catch (Exception e) {
            log.warn("Reindex index error: {}", e.getMessage());
        }

        log.info("Đã đồng bộ vector embedding thành công cho {} sản phẩm.", count);
        return count;
    }

    /**
     * Tìm kiếm ngữ nghĩa bằng pgvector Cosine Distance (Tối ưu map trực tiếp)
     */
    public SemanticSearchResponse searchByVector(String query, int limit) {
        if (query == null || query.trim().isEmpty()) {
            return SemanticSearchResponse.builder()
                    .query(query)
                    .totalMatches(0)
                    .items(Collections.emptyList())
                    .build();
        }

        List<Double> queryVector = geminiService.getEmbedding(query.trim());
        String vectorStr = formatVector(queryVector);

        String sql = """
            SELECT id, 1 - (embedding <=> cast(? as vector)) AS similarity
            FROM products
            WHERE is_active = true AND embedding IS NOT NULL
            ORDER BY embedding <=> cast(? as vector) ASC
            LIMIT ?
        """;

        List<Map<String, Object>> rows = jdbcTemplate.queryForList(sql, vectorStr, vectorStr, Math.max(1, limit));
        List<SemanticSearchResponse.SemanticProductItem> items = new ArrayList<>();

        for (Map<String, Object> row : rows) {
            Long productId = ((Number) row.get("id")).longValue();
            Double similarity = ((Number) row.get("similarity")).doubleValue();

            // Loại bỏ các vector có độ tương đồng quá thấp (< 0.08 là từ khóa rác / không liên quan)
            if (similarity < 0.08) {
                continue;
            }

            productRepository.findById(productId).ifPresent(p -> {
                ProductResponse pResp = productService.mapToResponse(p);
                items.add(SemanticSearchResponse.SemanticProductItem.builder()
                        .product(pResp)
                        .similarity(Math.round(similarity * 100.0) / 100.0)
                        .build());
            });
        }

        return SemanticSearchResponse.builder()
                .query(query)
                .totalMatches(items.size())
                .items(items)
                .build();
    }

    /**
     * 4. Hybrid Search (Tìm kiếm lai - Kết hợp PostgreSQL Keyword + Vector pgvector bằng thuật toán Reciprocal Rank Fusion - RRF)
     */
    public HybridSearchResponse hybridSearch(String query, int limit) {
        if (query == null || query.trim().isEmpty()) {
            return HybridSearchResponse.builder()
                    .query(query)
                    .totalMatches(0)
                    .searchStrategy("HYBRID_RRF")
                    .items(Collections.emptyList())
                    .build();
        }

        String cleanQuery = query.trim();
        String queryLower = cleanQuery.toLowerCase();
        int poolSize = Math.max(30, limit * 3);

        // 1. Luồng 1: SQL Keyword Search (Tên sản phẩm, slug, xuất xứ, danh mục, mô tả)
        List<Long> sqlRankedIds = new ArrayList<>();
        try {
            String expandedTerm = cleanQuery;
            if (queryLower.contains("canh chua")) {
                expandedTerm = "cà chua|đậu bắp|bạc hà|dọc mùng|khóm|dứa|ngò gai";
            } else if (queryLower.contains("nấu lẩu") || queryLower.contains("ăn lẩu")) {
                expandedTerm = "nấm|cải thảo|rau muống|hoa chuối|bắp ngọt";
            } else if (queryLower.contains("xào tỏi") || queryLower.contains("món xào")) {
                expandedTerm = "cải thìa|bông cải|đậu cove|rau muống";
            }

            String sql = """
                SELECT id FROM products 
                WHERE is_active = true AND (
                    LOWER(name) LIKE ? OR LOWER(slug) LIKE ? OR LOWER(origin) LIKE ? 
                    OR LOWER(brand) LIKE ? OR LOWER(description) LIKE ?
                    OR (CASE WHEN ? != ? THEN (
                        LOWER(name) ~ ? OR LOWER(description) ~ ?
                    ) ELSE false END)
                )
                ORDER BY (
                    CASE 
                        WHEN LOWER(name) = ? THEN 1
                        WHEN LOWER(name) LIKE ? THEN 2
                        WHEN LOWER(origin) LIKE ? THEN 3
                        ELSE 4 
                    END
                ) ASC, id DESC
                LIMIT ?
            """;
            String likePattern = "%" + queryLower + "%";
            List<Map<String, Object>> sqlRows = jdbcTemplate.queryForList(
                    sql,
                    likePattern, likePattern, likePattern, likePattern, likePattern,
                    expandedTerm, cleanQuery, expandedTerm.toLowerCase(), expandedTerm.toLowerCase(),
                    queryLower, queryLower + "%", likePattern,
                    poolSize
            );
            for (Map<String, Object> row : sqlRows) {
                sqlRankedIds.add(((Number) row.get("id")).longValue());
            }
        } catch (Exception e) {
            log.warn("SQL Keyword search failed in Hybrid Search: {}", e.getMessage());
        }

        // 2. Luồng 2: Vector Semantic Search bằng pgvector
        List<Long> vectorRankedIds = new ArrayList<>();
        Map<Long, Double> similarityMap = new HashMap<>();
        try {
            List<Double> queryVector = geminiService.getEmbedding(cleanQuery);
            String vectorStr = formatVector(queryVector);

            String vecSql = """
                SELECT id, 1 - (embedding <=> cast(? as vector)) AS similarity
                FROM products
                WHERE is_active = true AND embedding IS NOT NULL
                ORDER BY embedding <=> cast(? as vector) ASC
                LIMIT ?
            """;
            List<Map<String, Object>> vecRows = jdbcTemplate.queryForList(vecSql, vectorStr, vectorStr, poolSize);
            for (Map<String, Object> row : vecRows) {
                Long id = ((Number) row.get("id")).longValue();
                Double sim = ((Number) row.get("similarity")).doubleValue();
                // Ngưỡng lọc độ tương đồng: Chỉ nhận kết quả có độ tương đồng ngữ nghĩa >= 0.08
                // Các từ khóa vô nghĩa, gõ bậy như 'helllo', 'asdfgh' có similarity <= 0.04 sẽ bị loại bỏ hoàn toàn
                if (sim >= 0.08) {
                    vectorRankedIds.add(id);
                    similarityMap.put(id, sim);
                }
            }
        } catch (Exception e) {
            log.warn("Vector search failed in Hybrid Search: {}", e.getMessage());
        }

        // Nếu cả SQL tìm kiếm chính xác và Vector ngữ nghĩa đều không tìm thấy sản phẩm nào đạt chuẩn
        if (sqlRankedIds.isEmpty() && vectorRankedIds.isEmpty()) {
            return HybridSearchResponse.builder()
                    .query(cleanQuery)
                    .totalMatches(0)
                    .searchStrategy("HYBRID_RRF")
                    .items(Collections.emptyList())
                    .build();
        }

        // 3. Thuật toán Reciprocal Rank Fusion (RRF)
        final double k = 60.0;
        Map<Long, Double> rrfScores = new HashMap<>();

        for (int rank = 0; rank < sqlRankedIds.size(); rank++) {
            Long id = sqlRankedIds.get(rank);
            rrfScores.put(id, rrfScores.getOrDefault(id, 0.0) + (1.0 / (k + rank + 1)));
        }

        for (int rank = 0; rank < vectorRankedIds.size(); rank++) {
            Long id = vectorRankedIds.get(rank);
            rrfScores.put(id, rrfScores.getOrDefault(id, 0.0) + (1.0 / (k + rank + 1)));
        }

        List<Map.Entry<Long, Double>> sortedEntries = rrfScores.entrySet().stream()
                .sorted((a, b) -> Double.compare(b.getValue(), a.getValue()))
                .limit(limit)
                .toList();

        List<HybridSearchResponse.HybridProductItem> items = new ArrayList<>();
        for (Map.Entry<Long, Double> entry : sortedEntries) {
            Long id = entry.getKey();
            Double score = Math.round(entry.getValue() * 10000.0) / 10000.0;
            Double rawSim = similarityMap.get(id);
            final Double finalSim = (rawSim != null) ? (Math.round(rawSim * 100.0) / 100.0) : null;

            boolean inSql = sqlRankedIds.contains(id);
            boolean inVec = vectorRankedIds.contains(id);
            String matchType;
            if (inSql && inVec) {
                matchType = "HYBRID";
            } else if (inVec) {
                matchType = "SEMANTIC_VECTOR";
            } else {
                matchType = "KEYWORD_EXACT";
            }

            productRepository.findById(id).ifPresent(p -> {
                ProductResponse pResp = productService.mapToResponse(p);
                items.add(HybridSearchResponse.HybridProductItem.builder()
                        .product(pResp)
                        .rrfScore(score)
                        .similarity(finalSim)
                        .matchType(matchType)
                        .build());
            });
        }

        return HybridSearchResponse.builder()
                .query(cleanQuery)
                .totalMatches(items.size())
                .searchStrategy("HYBRID_RRF (PostgreSQL SQL + pgvector Cosine + Reciprocal Rank Fusion)")
                .items(items)
                .build();
    }

    /**
     * Gợi ý sản phẩm tương tự bằng Cosine Similarity trong Vector Database
     */
    public List<ProductResponse> findSimilarProducts(Long productId, int limit) {
        if (productId == null) return Collections.emptyList();

        String sql = """
            SELECT p2.id, 1 - (p2.embedding <=> p1.embedding) AS similarity
            FROM products p1, products p2
            WHERE p1.id = ? 
              AND p2.id != p1.id 
              AND p2.is_active = true 
              AND p1.embedding IS NOT NULL
              AND p2.embedding IS NOT NULL
            ORDER BY p2.embedding <=> p1.embedding ASC
            LIMIT ?
        """;

        List<Map<String, Object>> rows = jdbcTemplate.queryForList(sql, productId, Math.max(1, limit));
        List<ProductResponse> result = new ArrayList<>();

        for (Map<String, Object> row : rows) {
            Long id = ((Number) row.get("id")).longValue();
            productRepository.findById(id).ifPresent(p -> result.add(productService.mapToResponse(p)));
        }

        // Fallback: Nếu sản phẩm chưa có vector, lấy theo danh mục cùng loại
        if (result.isEmpty()) {
            productRepository.findById(productId).ifPresent(p -> {
                if (p.getCategory() != null) {
                    List<Product> sameCat = productRepository.findByCategoryIdAndIsActiveTrue(p.getCategory().getId());
                    sameCat.stream()
                            .filter(other -> !other.getId().equals(productId))
                            .limit(limit)
                            .forEach(other -> result.add(productService.mapToResponse(other)));
                }
            });
        }

        return result;
    }

    public List<ProductResponse> findSimilarProductsBySlug(String slug, int limit) {
        return productRepository.findBySlug(slug)
                .map(p -> findSimilarProducts(p.getId(), limit))
                .orElse(Collections.emptyList());
    }

    /**
     * Guardrail: Kiểm tra xem người dùng có hỏi các chủ đề ngoài lề bị cấm không
     */
    private boolean isOffTopicQuery(String text) {
        if (text == null) return false;
        String lower = text.toLowerCase().trim();
        String[] offTopicPatterns = {
            "viết code", "viết chương trình", "python", "javascript", "java code", "html", "css",
            "giải toán", "phương trình", "đạo hàm", "tích phân", "hình học", "bài toán",
            "chính trị", "bầu cử", "tổng thống", "đảng phái", "chiến tranh", "tôn giáo",
            "người nổi tiếng", "ca sĩ", "diễn viên", "thời tiết ngày mai", "xem bói", "tử vi"
        };
        for (String pattern : offTopicPatterns) {
            if (lower.contains(pattern)) {
                return true;
            }
        }
        return false;
    }

    /**
     * RAG (Retrieval-Augmented Generation) Chatbot với Tốc Độ Phản Hồi Tối Ưu Cao
     */
    public AiChatResponse chatWithRag(String userQuery) {
        String queryLower = (userQuery != null) ? userQuery.toLowerCase().trim() : "";

        // GUARDRAIL 2 (RULE 2): TỪ CHỐI NGOÀI LỀ LỊCH SỰ NGAY LẬP TỨC (0ms)
        if (isOffTopicQuery(queryLower)) {
            String politeRefusal = "Xin lỗi anh/chị, chuyên môn của em là hỗ trợ thông tin về các mặt hàng nông sản và giao dịch trên hệ thống. Anh/chị có đang cần tìm nguồn hàng hoặc nhà cung cấp nào không ạ?";
            return AiChatResponse.builder()
                    .answer(politeRefusal)
                    .recommendedProducts(Collections.emptyList())
                    .hotDeals(Collections.emptyList())
                    .hasGeminiKey(geminiService.hasApiKey())
                    .modelUsed("HoNa Fresh Guardrail Safe Agent")
                    .build();
        }

        String matchedLocation = null;
        String matchedKey = null;

        // 1. Nhận diện địa danh từ điển (in-memory, siêu nhanh)
        for (Map.Entry<String, String> entry : ProductService.LOCATION_PATTERNS.entrySet()) {
            if (queryLower.contains(entry.getKey())) {
                matchedKey = entry.getKey();
                matchedLocation = entry.getValue();
                break;
            }
        }

        // 2. Nhận diện các từ khóa ngành hàng nông sản cụ thể
        String[] productKeywords = {
            "nấm", "cải", "xà lách", "cà chua", "cà rốt", "ớt chuông", "ớt", "khoai tây", "khoai",
            "bí đỏ", "bắp cải", "su su", "rau muống", "rau dền", "đậu bắp", "chanh", "dưa", "hành", "tỏi"
        };
        String matchedProductKeyword = null;
        for (String pk : productKeywords) {
            if (queryLower.contains(pk)) {
                matchedProductKeyword = pk;
                break;
            }
        }

        List<ProductResponse> recommendedProducts = new ArrayList<>();

        if (matchedLocation != null) {
            // Khách hỏi đích danh địa phương: SQL nhanh lấy thẳng sản phẩm
            String productTerm = (matchedProductKeyword != null) ? matchedProductKeyword :
                    queryLower.replace(matchedKey, " ")
                            .replaceAll("\\b(ở|tại|vùng|khu vực|tỉnh|thành phố|tp|huyện|thị xã|sản phẩm|nông sản|lô|cho tôi|muốn|tìm|có|không)\\b", " ")
                            .replaceAll("\\s+", " ")
                            .trim();

            List<Product> matchedProducts;
            if (!productTerm.isEmpty()) {
                String sql = "SELECT * FROM products WHERE is_active = true AND " +
                        "(LOWER(origin) LIKE ? OR LOWER(brand) LIKE ?) AND " +
                        "(LOWER(name) LIKE ? OR LOWER(description) LIKE ?) LIMIT 5";
                matchedProducts = jdbcTemplate.query(sql,
                        (rs, rowNum) -> productRepository.findById(rs.getLong("id")).orElse(null),
                        "%" + matchedLocation.toLowerCase() + "%",
                        "%" + matchedLocation.toLowerCase() + "%",
                        "%" + productTerm + "%",
                        "%" + productTerm + "%");
                matchedProducts = matchedProducts.stream().filter(Objects::nonNull).toList();
            } else {
                matchedProducts = Collections.emptyList();
            }

            if (matchedProducts.isEmpty()) {
                String sql = "SELECT * FROM products WHERE is_active = true AND " +
                        "(LOWER(origin) LIKE ? OR LOWER(brand) LIKE ?) LIMIT 5";
                matchedProducts = jdbcTemplate.query(sql,
                        (rs, rowNum) -> productRepository.findById(rs.getLong("id")).orElse(null),
                        "%" + matchedLocation.toLowerCase() + "%",
                        "%" + matchedLocation.toLowerCase() + "%");
                matchedProducts = matchedProducts.stream().filter(Objects::nonNull).toList();
            }

            recommendedProducts = matchedProducts.stream()
                    .map(productService::mapToResponse)
                    .collect(Collectors.toList());
        } else if (matchedProductKeyword != null) {
            // Khách hỏi theo loại nông sản cụ thể
            String sql = "SELECT * FROM products WHERE is_active = true AND " +
                    "(LOWER(name) LIKE ? OR LOWER(category_slug) LIKE ? OR LOWER(description) LIKE ?) " +
                    "ORDER BY is_featured DESC LIMIT 5";
            List<Product> matchedProducts = jdbcTemplate.query(sql,
                    (rs, rowNum) -> productRepository.findById(rs.getLong("id")).orElse(null),
                    "%" + matchedProductKeyword + "%",
                    "%" + matchedProductKeyword + "%",
                    "%" + matchedProductKeyword + "%");
            recommendedProducts = matchedProducts.stream()
                    .filter(Objects::nonNull)
                    .map(productService::mapToResponse)
                    .collect(Collectors.toList());
        } else if (queryLower.contains("tất cả") || queryLower.contains("danh sách") || queryLower.contains("database") || queryLower.contains("có gì") || queryLower.contains("sản phẩm nào") || queryLower.contains("bao nhiêu")) {
            // Khách hỏi tổng quan sàn
            String sql = """
                (SELECT * FROM products WHERE origin ILIKE '%Đắk Lắk%' LIMIT 1)
                UNION ALL
                (SELECT * FROM products WHERE origin ILIKE '%Đồng Nai%' LIMIT 1)
                UNION ALL
                (SELECT * FROM products WHERE origin ILIKE '%Đà Lạt%' LIMIT 1)
                UNION ALL
                (SELECT * FROM products WHERE origin ILIKE '%Gia Lai%' LIMIT 1)
                UNION ALL
                (SELECT * FROM products WHERE origin ILIKE '%Mộc Châu%' LIMIT 1)
            """;
            List<Product> sampleProducts = jdbcTemplate.query(sql,
                    (rs, rowNum) -> productRepository.findById(rs.getLong("id")).orElse(null));
            recommendedProducts = sampleProducts.stream()
                    .filter(Objects::nonNull)
                    .map(productService::mapToResponse)
                    .collect(Collectors.toList());
        } else {
            // Tìm kiếm vector ngữ nghĩa (pgvector)
            SemanticSearchResponse vectorResults = searchByVector(userQuery, 4);
            recommendedProducts = vectorResults.getItems().stream()
                    .map(SemanticSearchResponse.SemanticProductItem::getProduct)
                    .collect(Collectors.toList());
        }

        // Lấy top 2 sản phẩm ưu đãi sỉ
        List<ProductResponse> hotDeals = new ArrayList<>();
        if (matchedLocation != null && !recommendedProducts.isEmpty()) {
            hotDeals = recommendedProducts.stream().limit(2).collect(Collectors.toList());
        } else {
            hotDeals = productRepository.findByIsFeaturedTrueAndIsActiveTrue().stream()
                    .limit(2)
                    .map(productService::mapToResponse)
                    .collect(Collectors.toList());
        }

        // Xây dựng {context} nông sản cô đọng, mật độ cao (giảm token, tăng tốc độ sinh của LLM)
        StringBuilder contextBuilder = new StringBuilder();

        // 1. CSDL rút gọn (High-Density Context)
        contextBuilder.append("""
            --- CƠ SỞ DỮ LIỆU SÀN B2B HONA FRESH (639 MÃ / 17 VÙNG TRỒNG) ---
            - ĐẮK LẮK (108 mã - HTX Buôn Hồ): Cà rốt, Củ sắn, Cải sậy, Đậu bắp, Ớt chuông. (Lô 5-35 Tấn, MOQ ≥ 200kg, VietGAP).
            - LÂM ĐỒNG (317 mã - Đà Lạt, Đơn Dương, Đức Trọng): Bắp cải tím, Cải thìa, Xà lách thủy canh, Cà chua cherry/beef, Khoai tây, Cải bó xôi (VietGAP, GlobalGAP, Organic).
            - ĐỒNG NAI (10 mã - HTX Long Khánh): Chuyên các loại Nấm sạch (Nấm bào ngư xám, Đùi gà baby, Kim châm, Đông cô tươi/khô, Nấm hương).
            - GIA LAI (100 mã - HTX Chư Prông): Bí đỏ hạt đậu, Chanh dây tím, Chuối Laba, Khoai lang mật, Bơ sáp (Organic).
            - SƠN LA (7 mã - HTX Mộc Châu): Bắp cải trái tim, Su su, Cải mèo Tây Bắc.
            - HẢI DƯƠNG & QUẢNG NINH (43 mã): Cà rốt xuất khẩu, Hành tỏi Kinh Môn, Củ cải, Dưa bao tử.
            - MIỀN TÂY (27 mã): Khóm Tân Lập, Khổ qua, Rau muống nước, Xà lách xoong Bình Minh.
            - CHÍNH SÁCH B2B: Bán buôn sỉ theo lô (Tấn/Tạ, MOQ ≥ 200kg). Đơn ≥ 2 Tấn giảm 8%, ≥ 5 Tấn giảm 15%. Giao tại vườn (FOB) hoặc xe lạnh giao kho.

            --- THỊ TRƯỜNG GIÁ NÔNG SẢN SỈ CHỢ ĐẦU MỐI HÔM NAY (THỦ ĐỨC, BÌNH ĐIỀN, HÓC MÔN) ---
            - Cà chua beef Đà Lạt: 14.500 - 16.500 đ/kg (chuẩn VietGAP đẹp, quả chắc, tai xanh).
            - Cà chua bi / Cherry đỏ: 22.000 - 26.000 đ/kg. Cà chua trứng: 15.000 - 16.500 đ/kg.
            - Xà lách lô lô xanh / Roman: 21.000 - 24.500 đ/kg (cầu tiêu thụ nhà hàng tăng 15%).
            - Xà lách mỡ / Carol: 18.000 - 20.500 đ/kg. Xà lách thủy canh VietGAP: 28.000 - 32.000 đ/kg.
            - Bắp cải trái tim: 11.500 - 13.000 đ/kg. Bắp cải tím: 16.000 - 18.500 đ/kg.
            - Ớt chuông Sweet Paler / Đà Lạt: 38.000 - 43.000 đ/kg (đỏ/vàng), ớt chuông xanh: 30.000 - 34.000 đ/kg.
            - Khoai tây vàng Đà Lạt: 17.000 - 20.000 đ/kg. Cà rốt Buôn Hồ / Hải Dương: 12.000 - 15.000 đ/kg.
            - Dưa leo baby: 16.000 - 19.500 đ/kg. Cải thìa / Cải ngọt: 13.000 - 16.000 đ/kg. Cải bó xôi: 22.000 - 26.000 đ/kg.
            - Nấm sạch các loại (Bào ngư, đùi gà, kim châm, đông cô): 45.000 - 75.000 đ/kg.
            - Xu hướng & Khuyến nghị: Giá sỉ theo bậc (Tier pricing) hiện đang khớp rất tốt các hợp đồng xe tải container lạnh giao các trạm trung chuyển TP.HCM.

            --- QUY CHUẨN KHUNG GIỜ THU HOẠCH LÝ TƯỞNG THEO CHUỖI CUNG ỨNG LẠNH ---
            1. Rau ăn lá (Xà lách thủy canh, xà lách cuộn, cải thìa, cải ngọt, cải bó xôi, rau thơm):
               - Khung giờ vàng: 05:00 - 07:30 sáng hoặc sau 16:30 chiều.
               - Cơ chế sinh lý: Cây vừa kết thúc hô hấp đêm và tích lũy quang hợp, mô tế bào ngậm nước căng mọng, giữ độ giòn ngọt Brix cao nhất.
               - Tuyệt đối tránh: Thu hoạch lúc trưa nắng gắt (10:30 - 14:30) khiến lá thoát hơi nước cấp tốc, khi đưa vào trạm lạnh dễ bị sốc nhiệt và thâm viền mép lá.
            2. Rau ăn quả (Cà chua, ớt chuông, dưa leo baby, đậu bắp):
               - Khung giờ vàng: 07:30 - 10:00 sáng sau khi ráo sương đêm.
               - Yêu cầu: Độ ẩm vỏ quả < 85% để tránh đọng ẩm cuống gây mốc cuống và thối nhũn vi khuẩn khi đóng thùng. Tránh hái lúc trời mưa dầm.
            3. Rau ăn củ (Cà rốt, khoai tây, củ dền, củ sắn):
               - Khung giờ vàng: 06:00 - 09:00 sáng khi mặt đất ráo nhẹ, giúp thu hoạch củ sạch sẽ, không bết dính bùn đất hoặc bị khô cứng đứt rễ.
            4. Nấm sạch các loại:
               - Khung giờ vàng: 04:30 - 06:30 sáng khi tai nấm vừa mở biên độ 80%, thu hái nhẹ nhàng trong phòng lạnh khép kín giữ trọn tán nấm.

            --- KỸ THUẬT HẠ NHIỆT SƠ BỘ (PRE-COOLING) & TIÊU CHUẨN XE LẠNH GIAO TRẠM ---
            - Mục đích sống còn: Nông sản sau cắt tiếp tục hô hấp và tỏa nhiệt nội tại (Field Heat). Nếu đưa ngay vào xe lạnh, máy lạnh xe không đủ công suất hạ nhiệt cấp tốc, gây hiện tượng sốc nhiệt, hấp hơi, đọng sương và thối nhũn lá. Pre-cooling giúp hạ nhiệt tâm trong 30 - 60 phút sau thu hoạch.
            - 3 Phương pháp Pre-cooling chuyên dụng:
              1. Forced-Air Cooling (Khí lạnh ẩm cưỡng bức): Thổi khí lạnh 6.0°C - 8.0°C (độ ẩm 90 - 95% RH) xuyên qua các sọt nan thông thoáng trong 45 - 90 phút. Tối ưu nhất cho xà lách, ớt chuông, cà chua, súp lơ.
              2. Hydro-Cooling (Xối / ngâm nước lạnh khử khuẩn): Dùng nước lạnh sạch 2.0°C - 4.0°C pha Clo hoạt tính nồng độ thấp (50 - 100 ppm) khử khuẩn bề mặt. Tối ưu cho cà rốt, bắp ngọt, cần tây, củ quả.
              3. Room-Cooling (Phòng đệm mát): Phòng mát 10.0°C - 12.0°C có quạt đảo chiều.
            - Kiểm tra nhiệt độ tâm (Pulp Temperature): Phải đo que kiểm tra nhiệt độ tâm nông sản đạt dưới 8°C (tối ưu từ 4°C - 6°C) trước khi ký biên bản QC bàn giao lên xe container lạnh.
            - Quy chuẩn xe lạnh trung chuyển:
              • Nhiệt độ cài đặt thùng xe: 2.0°C đến 5.0°C.
              • Độ ẩm: 90% - 95% RH.
              • Cách xếp sọt: Xếp sọt chừa rãnh thoáng khí dọc sàn T-floor, cách trần tối thiểu 20cm, không bịt kín cửa thổi gió dàn lạnh để đạt tỷ lệ kiểm định QC trên 96%.
            \n""");

        // 2. Lô hàng trích xuất
        if (matchedLocation != null) {
            contextBuilder.append(String.format("--- CÁC LÔ NÔNG SẢN THỰC TẾ TẠI %s ---\n", matchedLocation.toUpperCase()));
        } else {
            contextBuilder.append("--- CÁC LÔ NÔNG SẢN SỈ PHÙ HỢP TỪ CƠ SỞ DỮ LIỆU ---\n");
        }

        for (ProductResponse p : recommendedProducts) {
            contextBuilder.append(String.format("- Lô: %s | Vùng: %s (%s) | Giá sỉ: %s đ/%s | Chuẩn: %s | Tình trạng: Thu hoạch rộ | Đặc tính: %s\n",
                    p.getName(),
                    p.getOrigin() != null ? p.getOrigin() : "Đà Lạt, Lâm Đồng",
                    p.getBrand() != null ? p.getBrand() : "HTX Nông Nghiệp",
                    formatCurrency(p.getPrice()), p.getUnit() != null ? p.getUnit() : "kg",
                    Boolean.TRUE.equals(p.getIsOrganic()) ? "Organic / OCOP" : "VietGAP",
                    p.getDescription() != null ? p.getDescription() : "Nông sản tươi thu hái trực tiếp tại vườn"));
        }

        contextBuilder.append("\n--- LÔ NÔNG SẢN ƯU ĐÃI SỈ HÔM NAY ---\n");
        for (ProductResponse d : hotDeals) {
            contextBuilder.append(String.format("- Lô: %s | Vùng: %s | Giá sỉ: %s đ/%s (Giảm %s%%)\n",
                    d.getName(),
                    d.getOrigin() != null ? d.getOrigin() : "Đà Lạt",
                    formatCurrency(d.getPrice()), d.getUnit() != null ? d.getUnit() : "kg",
                    d.getDiscountPercent() != null ? d.getDiscountPercent() : 15));
        }

        // System Prompt & Guardrails chuẩn
        String systemPrompt = """
            Bạn là Trợ Lý HoNa Fresh - Chuyên gia cố vấn Nông nghiệp B2B & Chuỗi cung ứng lạnh (Cold Chain) của hệ thống HoNa Fresh.
            Bạn giao tiếp chuyên nghiệp, nhiệt tình, am hiểu sâu sắc về:
            1. Tra cứu biến động giá nông sản sỉ chợ đầu mối hôm nay (Thủ Đức, Bình Điền, Hóc Môn) và tư vấn giá sỉ theo bậc (Tier price) cho Hợp tác xã và Nhà vườn.
            2. Tư vấn khung giờ thu hoạch lý tưởng, sinh lý cây trồng theo từng loại nông sản (rau ăn lá, ăn quả, củ, nấm) và điều kiện thời tiết (tránh mưa dầm, tránh nắng gắt, thu hoạch khi ráo sương).
            3. Hướng dẫn kỹ thuật hạ nhiệt sơ bộ (Pre-cooling) tại vườn (Forced-Air Cooling, Hydro-Cooling, Room-cooling), kiểm soát nhiệt độ tâm Pulp Temperature < 8°C (tối ưu 4-6°C), dải nhiệt xe lạnh 2.0°C - 5.0°C và độ ẩm 90-95% để đạt tỷ lệ kiểm định QC trên 96%.
            4. Quy trình đóng gói sọt nan thoáng khí, chứng từ mã số vùng trồng PUC, tiêu chuẩn VietGAP/GlobalGAP và giải ngân bảo chứng Escrow.

            QUY TẮC BẮT BUỘC (GUARDRAILS):
            1. GIỚI HẠN CHỦ ĐỀ: Chỉ trả lời các câu hỏi liên quan đến nông nghiệp, giá chợ đầu mối, mùa vụ, thu hoạch, kỹ thuật bảo quản lạnh/pre-cooling, kiểm định QC và vận hành sàn B2B.
            2. TỪ CHỐI NGOÀI LỀ: Nếu người dùng hỏi về chính trị, tôn giáo, viết code, giải toán, người nổi tiếng hoặc chủ đề hoàn toàn ngoài lề, từ chối lịch sự: "Xin lỗi anh/chị, chuyên môn của em là hỗ trợ thông tin nông sản, giá chợ đầu mối, kỹ thuật thu hoạch và chuỗi cung ứng lạnh HoNa Fresh. Anh/chị cần tư vấn thêm về vụ mùa hoặc lô hàng nào không ạ?".
            3. TRÌNH BÀY & GIỌNG ĐIỆU: Giao tiếp bằng tiếng Việt lịch sự, xưng hô "Trợ lý HoNa Fresh" hoặc "em" với bà con nông dân và anh/chị thương lái. Trình bày rõ ràng, sử dụng gạch đầu dòng mạch lạc, cung cấp thông tin kỹ thuật chính xác, thực tế và dễ áp dụng.
            """;

        String userTurnPrompt = String.format("""
            NGỮ CẢNH ĐƯỢC TRÍCH XUẤT TỪ CƠ SỞ DỮ LIỆU:
            %s

            CÂU HỎI CỦA KHÁCH HÀNG:
            %s

            CÂU TRẢ LỜI CỦA BẠN:
            """, contextBuilder.toString(), userQuery);

        String answer = geminiService.generateAnswer(systemPrompt, userTurnPrompt);

        return AiChatResponse.builder()
                .answer(answer)
                .recommendedProducts(recommendedProducts)
                .hotDeals(hotDeals)
                .hasGeminiKey(geminiService.hasApiKey())
                .modelUsed("Trợ Lý Nông Sản B2B HoNa Fresh")
                .build();
    }

    /**
     * Tạo chuỗi ngữ nghĩa cho sản phẩm nông sản
     */
    private String buildSemanticText(Product p) {
        StringBuilder sb = new StringBuilder();
        sb.append("Lô hàng sỉ: ").append(p.getName()).append(". ");
        if (p.getCategory() != null) {
            sb.append("Ngành hàng: ").append(p.getCategory().getName()).append(". ");
        }
        if (p.getOrigin() != null) {
            sb.append("Vùng trồng & Xuất xứ: ").append(p.getOrigin()).append(". ");
        }
        if (p.getBrand() != null) {
            sb.append("Đơn vị canh tác / HTX: ").append(p.getBrand()).append(". ");
        }
        sb.append("Tiêu chuẩn nông sản: ").append(Boolean.TRUE.equals(p.getIsOrganic()) ? "Hữu cơ Organic, OCOP 4 sao" : "Chuẩn VietGAP, mã số vùng trồng PUC").append(". ");
        sb.append("Quy cách & Đơn vị: Lô sỉ (Tấn/Tạ/Kg), Đơn tối thiểu MOQ từ 200kg - 500kg. ");
        sb.append("Giá sỉ tham chiếu: ").append(p.getPrice()).append(" đồng/kg. ");
        sb.append("Tình trạng vụ mùa: Đang vào mùa thu hoạch rầm rộ, sản lượng dồi dào tại vườn. ");
        if (p.getDescription() != null && !p.getDescription().isBlank()) {
            sb.append("Đặc tính & Chất lượng: ").append(p.getDescription());
        }
        return sb.toString();
    }

    private String formatVector(List<Double> vector) {
        StringBuilder sb = new StringBuilder("[");
        for (int i = 0; i < vector.size(); i++) {
            if (i > 0) sb.append(",");
            sb.append(vector.get(i));
        }
        sb.append("]");
        return sb.toString();
    }

    private String formatCurrency(BigDecimal amount) {
        if (amount == null) return "0";
        return String.format("%,.0f", amount.doubleValue());
    }
}
