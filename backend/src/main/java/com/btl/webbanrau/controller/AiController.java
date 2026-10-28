package com.btl.webbanrau.controller;

import com.btl.webbanrau.dto.request.AiChatRequest;
import com.btl.webbanrau.dto.response.*;
import com.btl.webbanrau.service.AiSearchService;
import com.btl.webbanrau.service.GeminiService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/ai")
@RequiredArgsConstructor
@Tag(name = "AI & Vector Search", description = "Các API tìm kiếm ngữ nghĩa với pgvector, Hybrid Search và trợ lý ảo Gemini RAG")
public class AiController {

    private final AiSearchService aiSearchService;
    private final GeminiService geminiService;

    @Operation(summary = "Tìm kiếm sản phẩm theo ngữ nghĩa (pgvector Semantic Search)")
    @GetMapping("/search")
    public ResponseEntity<ApiResponse<SemanticSearchResponse>> semanticSearch(
            @RequestParam("q") String query,
            @RequestParam(value = "limit", defaultValue = "6") int limit) {
        SemanticSearchResponse result = aiSearchService.searchByVector(query, limit);
        return ResponseEntity.ok(ApiResponse.<SemanticSearchResponse>builder()
                .code(200)
                .message("Tìm kiếm ngữ nghĩa thành công")
                .result(result)
                .build());
    }

    @Operation(summary = "4. Hybrid Search (Tìm kiếm lai - PostgreSQL Keyword + Vector pgvector + RRF)")
    @GetMapping("/hybrid-search")
    public ResponseEntity<ApiResponse<HybridSearchResponse>> hybridSearch(
            @RequestParam("q") String query,
            @RequestParam(value = "limit", defaultValue = "12") int limit) {
        HybridSearchResponse result = aiSearchService.hybridSearch(query, limit);
        return ResponseEntity.ok(ApiResponse.<HybridSearchResponse>builder()
                .code(200)
                .message("Tìm kiếm lai Hybrid Search (RRF) thành công")
                .result(result)
                .build());
    }

    @Operation(summary = "Gợi ý sản phẩm tương tự bằng Vector DB (Cosine Similarity)")
    @GetMapping("/similar-products/{id}")
    public ResponseEntity<ApiResponse<List<ProductResponse>>> getSimilarProducts(
            @PathVariable Long id,
            @RequestParam(value = "limit", defaultValue = "4") int limit) {
        List<ProductResponse> result = aiSearchService.findSimilarProducts(id, limit);
        return ResponseEntity.ok(ApiResponse.<List<ProductResponse>>builder()
                .code(200)
                .message("Lấy danh sách sản phẩm tương tự thành công")
                .result(result)
                .build());
    }

    @Operation(summary = "Gợi ý sản phẩm tương tự theo Slug bằng Vector DB (Cosine Similarity)")
    @GetMapping("/similar-products/slug/{slug}")
    public ResponseEntity<ApiResponse<List<ProductResponse>>> getSimilarProductsBySlug(
            @PathVariable String slug,
            @RequestParam(value = "limit", defaultValue = "4") int limit) {
        List<ProductResponse> result = aiSearchService.findSimilarProductsBySlug(slug, limit);
        return ResponseEntity.ok(ApiResponse.<List<ProductResponse>>builder()
                .code(200)
                .message("Lấy danh sách sản phẩm tương tự thành công")
                .result(result)
                .build());
    }

    @Operation(summary = "Trợ lý ảo nông sản thông minh RAG với Guardrails (Khách hỏi → Vector DB → Gemini → Trả lời)")
    @PostMapping("/chat")
    public ResponseEntity<ApiResponse<AiChatResponse>> chatRag(@Valid @RequestBody AiChatRequest request) {
        AiChatResponse response = aiSearchService.chatWithRag(request.getMessage());
        return ResponseEntity.ok(ApiResponse.<AiChatResponse>builder()
                .code(200)
                .message("Phản hồi AI thành công")
                .result(response)
                .build());
    }


    @Operation(summary = "Trợ lý HoNa Fresh AI chuyên biệt dành riêng cho Nông Dân & HTX")
    @PostMapping("/farmer-chat")
    public ResponseEntity<ApiResponse<Map<String, String>>> farmerChat(@RequestBody Map<String, String> request) {
        String query = request.get("message");
        String answer = geminiService.generateFarmerChat(query);
        return ResponseEntity.ok(ApiResponse.<Map<String, String>>builder()
                .code(200)
                .message("Phản hồi AI Nông Dân thành công")
                .result(Map.of("answer", answer))
                .build());
    }

    @Operation(summary = "Đồng bộ vector embedding cho toàn bộ nông sản trong DB")
    @PostMapping("/sync-embeddings")
    public ResponseEntity<ApiResponse<Map<String, Object>>> syncEmbeddings() {
        int count = aiSearchService.syncAllProductEmbeddings();
        return ResponseEntity.ok(ApiResponse.<Map<String, Object>>builder()
                .code(200)
                .message("Đồng bộ vector embedding hoàn tất")
                .result(Map.of(
                        "syncedCount", count,
                        "vectorDimension", 768,
                        "hasGeminiKey", geminiService.hasApiKey()
                ))
                .build());
    }

    @Operation(summary = "Kiểm tra trạng thái kết nối Google Gemini & pgvector")
    @GetMapping("/status")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getStatus() {
        return ResponseEntity.ok(ApiResponse.<Map<String, Object>>builder()
                .code(200)
                .message("Trạng thái AI")
                .result(Map.of(
                        "hasGeminiKey", geminiService.hasApiKey(),
                        "vectorDimension", 768,
                        "database", "PostgreSQL với pgvector extension"
                ))
                .build());
    }

    @Operation(summary = "Cấu hình Google Gemini API Key trực tiếp tại runtime")
    @PostMapping("/config-key")
    public ResponseEntity<ApiResponse<Map<String, Object>>> configApiKey(@RequestBody Map<String, String> body) {
        String key = body.get("apiKey");
        if (key == null || key.trim().isEmpty()) {
            geminiService.setApiKey("");
            return ResponseEntity.ok(ApiResponse.<Map<String, Object>>builder()
                    .code(200)
                    .message("Đã xóa API Key thành công")
                    .result(Map.of("hasGeminiKey", false, "valid", false))
                    .build());
        }

        String cleanKey = key.trim();
        // Kiểm tra xem key có bắt đầu hợp lệ không và gọi test Google API
        boolean isValid = geminiService.validateApiKey(cleanKey);
        if (isValid) {
            geminiService.setApiKey(cleanKey);
            return ResponseEntity.ok(ApiResponse.<Map<String, Object>>builder()
                    .code(200)
                    .message("✅ Đã xác thực và kích hoạt Google Gemini API Key thành công!")
                    .result(Map.of("hasGeminiKey", true, "valid", true))
                    .build());
        } else {
            return ResponseEntity.badRequest().body(ApiResponse.<Map<String, Object>>builder()
                    .code(400)
                    .message("API Key không hợp lệ hoặc không có quyền truy cập Google AI Studio. Vui lòng lấy API Key dạng 'AIzaSy...' tại https://aistudio.google.com")
                    .result(Map.of("hasGeminiKey", false, "valid", false))
                    .build());
        }
    }
}
