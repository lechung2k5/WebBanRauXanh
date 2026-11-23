package com.btl.webbanrau.dto.request;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;
import java.math.BigDecimal;

@Getter @Setter
public class QcInspectionRequest {
    @NotNull @DecimalMin("0.0") private BigDecimal receivedWeightKg;
    @NotNull @DecimalMin("0.0") private BigDecimal qualifiedWeightKg;
    @DecimalMin("0.0") private BigDecimal rejectedWeightKg;
    private BigDecimal brixDegree;
    private BigDecimal moisturePercent;
    private String qcNote;
}
