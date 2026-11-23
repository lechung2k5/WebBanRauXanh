package com.btl.webbanrau.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class HybridSearchResponse {
    private String query;
    private int totalMatches;
    private String searchStrategy; // "HYBRID_RRF (PostgreSQL SQL + pgvector + Gemini)"
    private List<HybridProductItem> items;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class HybridProductItem {
        private ProductResponse product;
        private Double rrfScore;      // Điểm Reciprocal Rank Fusion (RRF)
        private Double similarity;    // Điểm tương đồng Cosine (0.0 - 1.0)
        private String matchType;     // "HYBRID", "KEYWORD_EXACT", "SEMANTIC_VECTOR"
    }
}
