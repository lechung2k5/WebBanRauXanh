package com.btl.webbanrau.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;

@Getter
@Setter
public class BuyerRfqActionRequest {
    @NotBlank private String action;
    private BigDecimal counterPrice;
    private Double counterQuantity;
    private String rejectReason;
}
