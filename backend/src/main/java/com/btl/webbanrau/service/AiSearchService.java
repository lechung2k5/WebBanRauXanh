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
        // 1. Vector Search: Lấy top 4 sản phẩm liên quan nhất
        SemanticSearchResponse vectorResults = searchByVector(userQuery, 4);
        List<ProductResponse> recommendedProducts = vectorResults.getItems().stream()
                .map(SemanticSearchResponse.SemanticProductItem::getProduct)
                .collect(Collectors.toList());

        // 2. Lấy top 3 sản phẩm có ưu đãi / giá tốt hiện tại
        List<ProductResponse> hotDeals = productRepository.findByIsFeaturedTrueAndIsActiveTrue().stream()
                .limit(3)
                .map(p -> productService.getProductBySlug(p.getSlug()))
                .collect(Collectors.toList());

        // 3. Xây dựng Context nông sản cho Gemini
        StringBuilder contextBuilder = new StringBuilder();
        contextBuilder.append("--- DANH SÁCH NÔNG SẢN LIÊN QUAN TRONG CỬA HÀNG ---\n");
        for (ProductResponse p : recommendedProducts) {
            contextBuilder.append(String.format("- %s (Mã slug: %s): Giá %s đ/%s, Xuất xứ: %s, Chuẩn: %s. Mô tả: %s\n",
                    p.getName(), p.getSlug(), formatCurrency(p.getPrice()), p.getUnit(),
                    p.getOrigin() != null ? p.getOrigin() : "Đà Lạt",
                    Boolean.TRUE.equals(p.getIsOrganic()) ? "Hữu cơ Organic" : "VietGAP",
                    p.getDescription() != null ? p.getDescription() : "Tươi ngon trong ngày"));
        }

        contextBuilder.append("\n--- SẢN PHẨM ƯU ĐÃI & GIÁ TỐT HÔM NAY ---\n");
        for (ProductResponse d : hotDeals) {
            contextBuilder.append(String.format("- %s: Giá khuyến mãi %s đ/%s (Giảm giá %s%%)\n",
                    d.getName(), formatCurrency(d.getPrice()), d.getUnit(),
                    d.getDiscountPercent() != null ? d.getDiscountPercent() : 15));
        }

        String systemPrompt = """
            Bạn là Trợ lý Dinh Dưỡng & Đầu Bếp Ẩm Thực Thông Minh của Siêu Thị Nông Sản Sạch HoNa Fresh.
            Nhiệm vụ của bạn:
            1. Giải đáp câu hỏi, nhu cầu ăn uống của khách (gợi ý món ăn, cách chế biến, tác dụng dinh dưỡng, thanh nhiệt, giữ dáng...).
            2. Khéo léo gợi ý và hướng dẫn khách mua các loại rau củ đang có sẵn trong cửa hàng HoNa Fresh (dựa trên danh sách nông sản được cung cấp).
            3. Thông báo các combo ưu đãi, giá tốt để khách mua sắm tiết kiệm nhất.
            4. Trả lời súc tích, định dạng markdown đẹp mắt, dùng các emoji phù hợp (🥦, 🥕, 🍲, 💚, 🏷️). Luôn nhiệt tình, lịch sự bằng tiếng Việt.
            
            Dưới đây là thông tin nông sản thực tế trong kho:
            """ + contextBuilder.toString();

        String answer = geminiService.generateAnswer(systemPrompt, userQuery);

        return AiChatResponse.builder()
                .answer(answer)
                .recommendedProducts(recommendedProducts)
                .hotDeals(hotDeals)
                .hasGeminiKey(geminiService.hasApiKey())
                .modelUsed(geminiService.getLastSuccessfulModel() + " + PostgreSQL pgvector")
                .build();
    }

    /**
     * Tạo chuỗi ngữ nghĩa phong phú cho sản phẩm nông sản
     */
    private String buildSemanticText(Product p) {
        StringBuilder sb = new StringBuilder();
        sb.append("Tên rau củ quả: ").append(p.getName()).append(". ");
        if (p.getCategory() != null) {
            sb.append("Phân loại danh mục: ").append(p.getCategory().getName()).append(". ");
        }
        if (p.getDescription() != null && !p.getDescription().isBlank()) {
            sb.append("Mô tả công dụng món ăn: ").append(p.getDescription()).append(". ");
        }
        if (p.getOrigin() != null) {
            sb.append("Nguồn gốc xuất xứ: ").append(p.getOrigin()).append(". ");
        }
        sb.append("Tiêu chuẩn canh tác: ").append(Boolean.TRUE.equals(p.getIsOrganic()) ? "Hữu cơ Organic, không hóa chất" : "Chuẩn VietGAP an toàn").append(". ");
        sb.append("Đơn vị bán: ").append(p.getUnit() != null ? p.getUnit() : "kg").append(". ");
        sb.append("Giá sỉ/lẻ: ").append(p.getPrice()).append(" đồng.");
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
