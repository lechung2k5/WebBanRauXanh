package com.btl.webbanrau.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.*;

import java.math.BigDecimal;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RfqRespondRequest {

    @NotBlank(message = "Hành động đàm phán không được để trống (ACCEPT, COUNTER, REJECT)")
    private String action; // ACCEPT, COUNTER, REJECT

    private BigDecimal counterPrice; // Đơn giá nếu COUNTER

    private Double counterQuantity; // Khối lượng nếu COUNTER

    private String rejectReason; // Lý do nếu REJECT
}
