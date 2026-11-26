package com.btl.webbanrau.dto.request;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;

@Getter
@Setter
public class WarehouseIotTelemetryRequest {
    private Long hubId;
    private Long zoneId;
    private String zoneCode;
    private String deviceId;
    private String source; // WOKWI | SIMULATOR

    @NotNull(message = "Nhiệt độ không được để trống")
    @DecimalMin(value = "-30.0", message = "Nhiệt độ tối thiểu -30°C")
    @DecimalMax(value = "70.0", message = "Nhiệt độ tối đa 70°C")
    private BigDecimal temperature;

    @NotNull(message = "Độ ẩm không được để trống")
    @DecimalMin(value = "0.0", message = "Độ ẩm tối thiểu 0%")
    @DecimalMax(value = "100.0", message = "Độ ẩm tối đa 100%")
    private BigDecimal humidity;
}
