package com.btl.webbanrau.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;

@Getter
@Setter
public class BuyerEpodRequest {
    @NotNull private BigDecimal deliveredWeightKg;
    private BigDecimal damagedWeightKg = BigDecimal.ZERO;
    @NotBlank private String signatureName;
    @NotBlank private String signatureData;
    @NotBlank private String photoUrl;
}
