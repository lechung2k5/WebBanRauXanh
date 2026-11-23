package com.btl.webbanrau.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AiChatRequest {
    @NotBlank(message = "Câu hỏi hoặc nhu cầu không được để trống")
    private String message;
}
