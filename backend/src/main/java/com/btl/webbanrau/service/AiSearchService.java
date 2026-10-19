package com.btl.webbanrau.service;

import com.btl.webbanrau.dto.response.AiChatResponse;
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

        // Kiểm tra xem Gemini API có thực sự phản hồi nhanh không
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
     * Tìm kiếm ngữ nghĩa bằng pgvector Cosine Distance
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
                ProductResponse pResp = productService.getProductBySlug(p.getSlug());
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
     * RAG (Retrieval-Augmented Generation): Khách hỏi → Vector DB lọc sản phẩm → Gửi Gemini → Trả lời
     */
    public AiChatResponse chatWithRag(String userQuery) {
        String queryLower = (userQuery != null) ? userQuery.toLowerCase().trim() : "";
        String matchedLocation = null;
        String matchedKey = null;

        // 1. Nhận diện địa danh từ điển
        for (Map.Entry<String, String> entry : ProductService.LOCATION_PATTERNS.entrySet()) {
            if (queryLower.contains(entry.getKey())) {
                matchedKey = entry.getKey();
                matchedLocation = entry.getValue();
                break;
            }
        }

        // 2. Nhận diện các từ khóa ngành hàng / nông sản cụ thể
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
            // Trường hợp 1: Khách hỏi đích danh địa phương
            String productTerm = (matchedProductKeyword != null) ? matchedProductKeyword :
                    queryLower.replace(matchedKey, " ")
                            .replaceAll("\\b(ở|tại|vùng|khu vực|tỉnh|thành phố|tp|huyện|thị xã|sản phẩm|nông sản|lô|cho tôi|muốn|tìm|có|không)\\b", " ")
                            .replaceAll("\\s+", " ")
                            .trim();

            List<Product> matchedProducts;
            if (!productTerm.isEmpty()) {
                String sql = "SELECT * FROM products WHERE is_active = true AND " +
                        "(LOWER(origin) LIKE ? OR LOWER(brand) LIKE ?) AND " +
                        "(LOWER(name) LIKE ? OR LOWER(description) LIKE ?) LIMIT 6";
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
                        "(LOWER(origin) LIKE ? OR LOWER(brand) LIKE ?) LIMIT 6";
                matchedProducts = jdbcTemplate.query(sql,
                        (rs, rowNum) -> productRepository.findById(rs.getLong("id")).orElse(null),
                        "%" + matchedLocation.toLowerCase() + "%",
                        "%" + matchedLocation.toLowerCase() + "%");
                matchedProducts = matchedProducts.stream().filter(Objects::nonNull).toList();
            }

            recommendedProducts = matchedProducts.stream()
                    .map(p -> productService.getProductBySlug(p.getSlug()))
                    .filter(Objects::nonNull)
                    .collect(Collectors.toList());
        } else if (matchedProductKeyword != null) {
            // Trường hợp 2: Khách hỏi theo loại nông sản cụ thể (ví dụ: có những loại nấm gì, các loại cải...)
            String sql = "SELECT * FROM products WHERE is_active = true AND " +
                    "(LOWER(name) LIKE ? OR LOWER(category_slug) LIKE ? OR LOWER(description) LIKE ?) " +
                    "ORDER BY is_featured DESC LIMIT 6";
            List<Product> matchedProducts = jdbcTemplate.query(sql,
                    (rs, rowNum) -> productRepository.findById(rs.getLong("id")).orElse(null),
                    "%" + matchedProductKeyword + "%",
                    "%" + matchedProductKeyword + "%",
                    "%" + matchedProductKeyword + "%");
            recommendedProducts = matchedProducts.stream()
                    .filter(Objects::nonNull)
                    .map(p -> productService.getProductBySlug(p.getSlug()))
                    .filter(Objects::nonNull)
                    .collect(Collectors.toList());
        } else if (queryLower.contains("tất cả") || queryLower.contains("danh sách") || queryLower.contains("database") || queryLower.contains("có gì") || queryLower.contains("sản phẩm nào") || queryLower.contains("bao nhiêu")) {
            // Trường hợp 3: Khách hỏi tổng quan sàn / CSDL có những gì
            // Lấy mẫu đại diện các sản phẩm tiêu biểu từ các vùng khác nhau
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
                UNION ALL
                (SELECT * FROM products WHERE origin ILIKE '%Hải Dương%' LIMIT 1)
            """;
            List<Product> sampleProducts = jdbcTemplate.query(sql,
                    (rs, rowNum) -> productRepository.findById(rs.getLong("id")).orElse(null));
            recommendedProducts = sampleProducts.stream()
                    .filter(Objects::nonNull)
                    .map(p -> productService.getProductBySlug(p.getSlug()))
                    .filter(Objects::nonNull)
                    .collect(Collectors.toList());
        } else {
            // Trường hợp 4: Tìm kiếm vector ngữ nghĩa
            SemanticSearchResponse vectorResults = searchByVector(userQuery, 4);
            recommendedProducts = vectorResults.getItems().stream()
                    .map(SemanticSearchResponse.SemanticProductItem::getProduct)
                    .collect(Collectors.toList());
        }

        // 3. Lấy top sản phẩm ưu đãi phù hợp
        List<ProductResponse> hotDeals = new ArrayList<>();
        if (matchedLocation != null && !recommendedProducts.isEmpty()) {
            hotDeals = recommendedProducts.stream().limit(2).collect(Collectors.toList());
        } else {
            hotDeals = productRepository.findByIsFeaturedTrueAndIsActiveTrue().stream()
                    .limit(3)
                    .map(p -> productService.getProductBySlug(p.getSlug()))
                    .collect(Collectors.toList());
        }

        // 4. Xây dựng Context nông sản B2B chi tiết cho Gemini
        StringBuilder contextBuilder = new StringBuilder();
        if (matchedLocation != null) {
            contextBuilder.append(String.format("--- DANH SÁCH LÔ NÔNG SẢN THỰC TẾ TẠI KHU VỰC %s (TRÍCH XUẤT TỪ DATABASE HONA FRESH) ---\n", matchedLocation.toUpperCase()));
        } else {
            contextBuilder.append("--- DANH SÁCH LÔ NÔNG SẢN SỈ TẠI CÁC TRANG TRẠI / HTX ĐỐI TÁC TRÊN SÀN ---\n");
        }

        for (ProductResponse p : recommendedProducts) {
            contextBuilder.append(String.format("- Lô: %s | Vùng trồng/HTX: %s (%s) | Giá sỉ: %s đ/%s | Chuẩn: %s | Tình trạng: Đang thu hoạch rộ | Đặc tính: %s\n",
                    p.getName(),
                    p.getOrigin() != null ? p.getOrigin() : "Đà Lạt, Lâm Đồng",
                    p.getBrand() != null ? p.getBrand() : "HTX Nông Nghiệp",
                    formatCurrency(p.getPrice()), p.getUnit() != null ? p.getUnit() : "kg",
                    Boolean.TRUE.equals(p.getIsOrganic()) ? "Hữu cơ Organic / OCOP" : "VietGAP",
                    p.getDescription() != null ? p.getDescription() : "Nông sản tươi thu hái trực tiếp tại vườn"));
        }

        contextBuilder.append("\n--- LÔ NÔNG SẢN ĐANG CÓ CHÍNH SÁCH CHIẾT KHẤU SỈ TỐT NHẤT HÔM NAY ---\n");
        for (ProductResponse d : hotDeals) {
            contextBuilder.append(String.format("- Lô: %s | Vùng trồng: %s | Giá sỉ ưu đãi: %s đ/%s (Chiết khấu lô lớn %s%%)\n",
                    d.getName(),
                    d.getOrigin() != null ? d.getOrigin() : "Đà Lạt",
                    formatCurrency(d.getPrice()), d.getUnit() != null ? d.getUnit() : "kg",
                    d.getDiscountPercent() != null ? d.getDiscountPercent() : 15));
        }

        String locationConstraint = "";
        if (matchedLocation != null) {
            locationConstraint = "\nLƯU Ý ĐẶC BIỆT VỀ ĐỊA PHƯƠNG:\n" +
                    "- Khách hàng đang hỏi về nguồn hàng tại: " + matchedLocation + ".\n" +
                    "- Bạn CHỈ ĐƯỢC tư vấn và báo giá các lô nông sản thuộc khu vực " + matchedLocation + " được liệt kê trong danh sách ở trên.\n" +
                    "- TUYỆT ĐỐI KHÔNG giới thiệu nhầm sang nông sản ở địa phương khác (như Đà Lạt, Lâm Đồng khi khách đang hỏi Đồng Nai hay Đắk Lắk)!\n" +
                    "- Nếu khách hỏi một tỉnh mà sàn chưa có hàng, hãy nói rõ chưa có HTX liên kết tại đó và gợi ý các vùng lân cận.\n";
        }

        String masterDatabaseKnowledge = """
            --- BẢN ĐỒ TOÀN BỘ CƠ SỞ DỮ LIỆU NÔNG SẢN TRÊN SÀN B2B HONA FRESH (639 MÃ SẢN PHẨM / 17 VÙNG TRỒNG) ---
            Hệ thống HoNa Fresh kết nối trực tiếp với 17 Hợp tác xã (HTX) quy mô lớn tại các vùng chuyên canh nông sản:
            1. ĐẮK LẮK (108 sản phẩm) - HTX Rau Củ Quả Buôn Hồ (Thị xã Buôn Hồ):
               * Mặt hàng chủ lực: Cà rốt Buôn Hồ, Củ sắn, Rau dền baby, Cải sậy, Ớt chuông xanh, Đậu bắp, Bắp ngọt...
               * Quy mô lô: 5 - 35 Tấn, MOQ: 200 - 500kg. Chuẩn VietGAP, PUC: VN-DLK-06-xxx.
            2. LÂM ĐỒNG (317 sản phẩm) - 3 Vùng chuyên canh rau củ lớn nhất nước:
               * TP. Đà Lạt (103 sản phẩm) - Liên Minh HTX Rau Sạch Đà Lạt GAP: Bắp cải tím, Cải thìa, Xà lách mỡ thủy canh, Cải bó xôi (Spinach), Chanh không hạt, Dâu tây...
               * Huyện Đơn Dương (107 sản phẩm) - HTX Nông Nghiệp Công Nghệ Cao Đơn Dương: Cải ngọt, Cà chua cherry, Ớt chuông, Cà rốt Đà Lạt...
               * Huyện Đức Trọng (101 sản phẩm) - HTX Rau Củ Quả Đức Trọng: Khoai tây vàng/hồng, Cải thảo, Hành tây, Cà chua beef...
            3. ĐỒNG NAI (10 sản phẩm) - HTX Nấm Sạch & Rau Màu Long Khánh (TP. Long Khánh):
               * Mặt hàng chủ lực: Đầy đủ các dòng Nấm tươi & Nấm khô thượng hạng (Nấm bào ngư xám, Nấm đùi gà baby, Nấm kim châm, Nấm đông cô khô/tươi, Nấm mèo thái sợi, Nấm hương, Lẩu nấm Việt Hàn...).
            4. GIA LAI (100 sản phẩm) - HTX Nông Nghiệp Hữu Cơ Chư Prông (Huyện Chư Prông):
               * Mặt hàng chủ lực: Bí đỏ hạt đậu, Chanh dây tím, Chuối Laba, Khoai lang mật, Bơ sáp Tây Nguyên...
            5. SƠN LA (7 sản phẩm) - Hợp Tác Xã Nông Nghiệp Xanh Mộc Châu (Cao nguyên Mộc Châu):
               * Mặt hàng chủ lực: Bắp cải trái tim Mộc Châu, Su su, Cải mèo Tây Bắc, Củ cải tuyết Mộc Châu...
            6. HẢI DƯƠNG (26 sản phẩm) & QUẢNG NINH (17 sản phẩm) - HTX Nam Sách & HTX Đông Triều:
               * Mặt hàng: Cà rốt xuất khẩu, Hành tây, Tỏi Kinh Môn, Củ cải, Dưa chuột bao tử...
            7. HÀ NỘI (12 sản phẩm) - HTX Rau An Toàn Ba Vì:
               * Mặt hàng: Rau muống sạch, Rau dền, Mồng tơi, Cải xanh bán sơn địa...
            8. MIỀN TÂY (Cần Thơ 11 mã, Vĩnh Long 7 mã, Tiền Giang 6 mã, Bến Tre 3 mã):
               * Mặt hàng: Rau muống nước, Khổ qua, Khóm Tân Lập, Xà lách xoong Bình Minh, Mướp hương Ba Tri...
            9. TP. HỒ CHÍ MINH (5 sản phẩm) - HTX Nông Nghiệp CNC Củ Chi:
               * Mặt hàng: Rau mầm hữu cơ, Dưa lưới nhà màng công nghệ cao...

            --- 4 PHÂN LOẠI NGÀNH HÀNG NÔNG SẢN SỈ CHÍNH ---
            - Rau Ăn Lá Sỉ: 331 mã sản phẩm (các loại Cải, Xà lách, Rau dền, Rau muống, Cải thảo, Bắp cải...).
            - Củ & Quả Tươi Sỉ: 228 mã sản phẩm (Cà rốt, Cà chua, Củ sắn, Củ cải, Ớt chuông, Bí đỏ, Su su, Khoai tây...).
            - Nấm Tươi & Nấm Khô Sỉ: 42 mã sản phẩm (Đùi gà, Bào ngư, Kim châm, Đông cô, Nấm hương, Nấm mèo...).
            - Rau Gia Vị & Khác Sỉ: 38 mã sản phẩm (Húng quế, Ngò gai, Ngò rí, Hành tỏi, Gừng, Sả, Ớt...).

            --- CHÍNH SÁCH BÁN BUÔN B2B TRÊN TOÀN SÀN HONA FRESH ---
            - Đối tượng phục vụ: Chuỗi siêu thị, Bếp ăn công nghiệp, Nhà hàng, Vựa buôn và Thương lái thu mua số lượng lớn.
            - Sản lượng lô chào bán: 5 Tấn đến 35 Tấn / lô. Đơn đặt hàng tối thiểu (MOQ): 200kg - 500kg.
            - Chính sách chiết khấu bậc thang: Đơn hàng ≥ 2 Tấn giảm 8%, Đơn hàng ≥ 5 Tấn hoặc hợp đồng dài hạn giảm 15%.
            - Kiểm định chất lượng: 100% đạt chuẩn VietGAP, GlobalGAP, OCOP 4 sao, Hữu cơ Organic, có Mã số vùng trồng (PUC) xuất khẩu và vào siêu thị.
            - Giao nhận: Tại cổng nông trại (FOB) hoặc xe tải lạnh bảo ôn điều phối giao tận kho người mua.
            """;

        String systemPrompt = """
            Bạn là Cố Vấn Nguồn Hàng Nông Sản B2B Thông Minh của Sàn Giao Dịch Sỉ HoNa Fresh.
            Nền tảng HoNa Fresh là sàn B2B trung gian kết nối TRỰC TIẾP giữa các Trang trại/Hợp tác xã (HTX) quy mô lớn với các Chuỗi siêu thị, Bếp ăn công nghiệp, Nhà hàng và Thương lái thu mua số lượng lớn (Tạ, Tấn, MOQ ≥ 200kg - 1 Tấn).
            LƯU Ý QUAN TRỌNG:
            - KHÔNG bán lẻ cho 1-2 người, KHÔNG hướng dẫn nấu ăn gia đình hay mẹo làm bếp!
            - Bạn PHẢI HIỂU TOÀN BỘ CƠ SỞ DỮ LIỆU CỦA HONA FRESH (được cung cấp chi tiết bên dưới) để trả lời chính xác mọi câu hỏi về số lượng, danh mục, vùng trồng, HTX và mặt hàng có trên sàn.
            """ + masterDatabaseKnowledge + locationConstraint + """

            Nhiệm vụ của bạn:
            1. Trả lời các câu hỏi kinh doanh, thị trường và nguồn cung sỉ nông sản:
               - Giải đáp chi tiết sàn có những sản phẩm gì, các nhóm ngành hàng, từng vùng trồng và từng HTX cụ thể.
               - Phân tích và giải đáp sản phẩm nào đang hoặc sắp vào mùa thu hoạch rầm rộ (sản lượng dồi dào, giá xuất vườn tốt nhất).
               - Thông tin vùng trồng (Đà Lạt, Lâm Đồng, Đơn Dương, Mộc Châu, Buôn Hồ - Đắk Lắk, Long Khánh - Đồng Nai, Gia Lai...), chứng nhận tiêu chuẩn (VietGAP, GlobalGAP, OCOP), mã số vùng trồng PUC để xuất khẩu hoặc vào siêu thị.
               - Chính sách giá sỉ theo bậc khối lượng (MOQ tối thiểu 200-500kg, đơn hàng 2 Tấn giảm 8%, đơn hàng 5 Tấn giảm 15%), điều kiện giao nhận (tại cổng trang trại FOB hoặc xe lạnh giao kho).
            2. Khéo léo gợi ý các lô hàng sỉ đang có sẵn trong kho/vườn (dựa trên danh sách nông sản được cung cấp).
            3. Trả lời súc tích, chuyên nghiệp theo phong cách chuyên viên thu mua/kinh doanh B2B, trình bày Markdown rõ ràng (các đề mục ###, gạch đầu dòng -, in đậm các số liệu quan trọng như Tấn, Tạ, %, VNĐ).
            
            Dưới đây là thông tin chi tiết các lô nông sản trích xuất theo yêu cầu của khách hàng:
            """ + contextBuilder.toString();

        String answer = geminiService.generateAnswer(systemPrompt, userQuery);

        return AiChatResponse.builder()
                .answer(answer)
                .recommendedProducts(recommendedProducts)
                .hotDeals(hotDeals)
                .hasGeminiKey(geminiService.hasApiKey())
                .modelUsed("Cố Vấn Nguồn Hàng B2B HoNa Fresh")
                .build();
    }

    /**
     * Tạo chuỗi ngữ nghĩa phong phú cho sản phẩm nông sản
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
