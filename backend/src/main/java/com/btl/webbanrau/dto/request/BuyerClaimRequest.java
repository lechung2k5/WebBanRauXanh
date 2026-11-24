package com.btl.webbanrau.dto.request;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;

@Getter
@Setter
public class BuyerClaimRequest {
    @NotNull
    private Long contractId;

    @NotNull
    @DecimalMin(value = "0.01")
    private BigDecimal damagedWeightKg;

    @NotBlank
    private String cause;
}
