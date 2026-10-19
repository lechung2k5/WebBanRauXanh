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
public class SemanticSearchResponse {
    private String query;
    private int totalMatches;
    private List<SemanticProductItem> items;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class SemanticProductItem {
        private ProductResponse product;
        private Double similarity; // Điểm tương đồng ngữ nghĩa (0.0 đến 1.0)
    }
}
