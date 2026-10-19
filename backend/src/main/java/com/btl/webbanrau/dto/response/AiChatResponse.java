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
public class AiChatResponse {
    private String answer;
    private List<ProductResponse> recommendedProducts;
    private List<ProductResponse> hotDeals;
    private boolean hasGeminiKey;
    private String modelUsed;
}
