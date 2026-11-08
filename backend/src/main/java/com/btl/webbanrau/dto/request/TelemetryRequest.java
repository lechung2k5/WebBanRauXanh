package com.btl.webbanrau.dto.request;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;
import java.math.BigDecimal;

@Getter @Setter
public class TelemetryRequest {
    @NotNull @DecimalMin("-20.0") @DecimalMax("60.0") private BigDecimal temperature;
    @NotNull @DecimalMin("0.0") @DecimalMax("100.0") private BigDecimal humidity;
}
