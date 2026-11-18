package com.btl.webbanrau.dto.request;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.math.BigDecimal;

@Data
public class DriverLoadStopRequest {
    @NotNull(message = "Khối lượng thực tế không được để trống")
    private BigDecimal actualWeightKg;

    private Integer actualPackageCount;
    private String handoverPhotoUrl;
    private String handoverSignatureData;
    private String notes;
}
