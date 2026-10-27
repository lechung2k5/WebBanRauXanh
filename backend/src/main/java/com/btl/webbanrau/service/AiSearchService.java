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
                expandedTerm = "cà chua|đậu bắp|bạc hà|dọc mùng|khóm|dứa|ngò gai|rau muống|thơm|me";
            } else if (queryLower.contains("nấu lẩu") || queryLower.contains("ăn lẩu") || queryLower.contains("lẩu")) {
                expandedTerm = "nấm|cải thảo|rau muống|hoa chuối|bắp ngọt|mồng tơi|đậu phụ";
            } else if (queryLower.contains("xào tỏi") || queryLower.contains("món xào") || queryLower.contains("xào")) {
                expandedTerm = "cải thìa|bông cải|đậu cove|rau muống|bắp cải|đậu bắp";
            } else if (queryLower.contains("salad") || queryLower.contains("trộn") || queryLower.contains("giảm cân")) {
                expandedTerm = "xà lách|dưa leo|cà chua|bắp cải|ớt chuông|cải bó xôi";
            } else if (queryLower.contains("canh") || queryLower.contains("súp") || queryLower.contains("hầm")) {
                expandedTerm = "bí đỏ|cà rốt|khoai tây|cải bó xôi|rau ngót|bắp cải";
            }

            String sql = """
                SELECT id FROM products 
                WHERE is_active = true AND (
                    LOWER(name) LIKE ? OR LOWER(slug) LIKE ? OR LOWER(origin) LIKE ? 
                    OR LOWER(brand) LIKE ? OR LOWER(description) LIKE ?
                    OR (CASE WHEN ? != ? THEN (
                        LOWER(name) ~* ? OR LOWER(description) ~* ?
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
                vectorRankedIds.add(id);
                similarityMap.put(id, sim);
            }
        } catch (Exception e) {
            log.warn("Vector search failed in Hybrid Search: {}", e.getMessage());
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
            // Tìm kiếm lai thông minh Hybrid Search (pgvector + Keyword + RRF)
            HybridSearchResponse hybridResults = hybridSearch(userQuery, 6);
            recommendedProducts = hybridResults.getItems().stream()
                    .map(HybridSearchResponse.HybridProductItem::getProduct)
                    .filter(Objects::nonNull)
                    .collect(Collectors.toList());

            if (recommendedProducts.isEmpty()) {
                SemanticSearchResponse vectorResults = searchByVector(userQuery, 4);
                recommendedProducts = vectorResults.getItems().stream()
                        .map(SemanticSearchResponse.SemanticProductItem::getProduct)
                        .filter(Objects::nonNull)
                        .collect(Collectors.toList());
            }
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
            Bạn là trợ lý AI chuyên nghiệp, nhiệt tình và am hiểu về hệ thống sàn giao dịch nông sản B2B HoNa Fresh - nơi kết nối trực tiếp các trang trại, nhà vườn với thương lái và doanh nghiệp thu mua.

            NHIỆM VỤ CỦA BẠN:
            Trả lời các câu hỏi của khách hàng về sản phẩm nông sản, tư vấn nguyên liệu cho các món ăn (như canh chua, nấu lẩu, món xào, món canh, salad...), thông tin mùa vụ, chính sách vận chuyển, giá cả, và cách sử dụng nền tảng, CHỈ DỰA TRÊN thông tin được cung cấp trong phần "Ngữ cảnh được trích xuất" bên dưới.

            QUY TẮC BẮT BUỘC (GUARDRAILS):
            1. TƯ VẤN MÓN ĂN & CÔNG DỤNG NÔNG SẢN: Khi khách hỏi về nguyên liệu cho món ăn cụ thể (ví dụ: "nguyên liệu nấu canh chua", "rau ăn lẩu"...), hãy giới thiệu các loại nông sản phù hợp có trong ngữ cảnh và giải thích ngắn gọn vai trò của từng loại (ví dụ: cà chua và khóm tạo vị chua ngọt thanh mát, đậu bắp và bạc hà tạo độ giòn ngọt mọng nước, rau muống ăn kèm giải nhiệt, ngò gai/húng quế dậy mùi thơm nồng đặc trưng). Nếu món ăn còn thiếu nguyên liệu nào chưa có trên sàn (như cá tươi, me chua), hãy giải thích lịch sự.
            2. GIỚI HẠN CHỦ ĐỀ & TỪ CHỐI NGOÀI LỀ: Chỉ trả lời các câu hỏi liên quan đến nông nghiệp, sản phẩm trên sàn, món ăn chế biến từ nông sản, mua bán, vận chuyển. Nếu người dùng hỏi về chính trị, tôn giáo, viết code, giải toán, người nổi tiếng... BẠN PHẢI TỪ CHỐI LỊCH SỰ: "Xin lỗi anh/chị, chuyên môn của em là hỗ trợ thông tin về các mặt hàng nông sản và giao dịch trên hệ thống. Anh/chị có đang cần tìm nguồn hàng hoặc nhà cung cấp nào không ạ?".
            3. KHÔNG BỊA ĐẶT (NO HALLUCINATION): Nếu câu hỏi liên quan đến sản phẩm nhưng trong "Ngữ cảnh được trích xuất" không có thông tin, tuyệt đối không tự bịa ra dữ liệu. Hãy trả lời: "Dạ, hiện tại em chưa tìm thấy thông tin chính xác về sản phẩm/vấn đề này trên hệ thống. Anh/chị có thể cung cấp thêm chi tiết hoặc từ khóa khác để em kiểm tra lại không ạ?".
            4. NGÔN NGỮ & GIỌNG ĐIỆU: Giao tiếp bằng tiếng Việt chuẩn, xưng hô "em" và gọi khách hàng là "anh/chị". Thái độ tôn trọng, hỗ trợ và hướng tới việc thúc đẩy giao dịch. Trả lời súc tích, ngắn gọn, đúng trọng tâm.
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
        sb.append("Nông sản: ").append(p.getName()).append(". ");
        if (p.getCategory() != null) {
            sb.append("Danh mục: ").append(p.getCategory().getName()).append(". ");
        }
        if (p.getDescription() != null && !p.getDescription().isBlank()) {
            sb.append("Mô tả, công dụng và cách chế biến món ăn: ").append(p.getDescription()).append(". ");
        }
        if (p.getOrigin() != null) {
            sb.append("Vùng trồng & Xuất xứ: ").append(p.getOrigin()).append(". ");
        }
        if (p.getBrand() != null) {
            sb.append("Đơn vị canh tác / HTX: ").append(p.getBrand()).append(". ");
        }
        sb.append("Tiêu chuẩn: ").append(Boolean.TRUE.equals(p.getIsOrganic()) ? "Hữu cơ Organic, OCOP" : "Chuẩn VietGAP, PUC").append(". ");
        sb.append("Quy cách: Lô sỉ (Tấn/Tạ/Kg), Đơn tối thiểu MOQ từ 200kg - 500kg. ");
        sb.append("Giá sỉ tham chiếu: ").append(p.getPrice()).append(" đồng/kg.");
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
