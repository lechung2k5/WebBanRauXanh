package com.btl.webbanrau.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;
import java.math.BigDecimal;

@Data
public class FleetVehicleRequest {
    @NotNull(message = "Mã kho không được để trống")
    private Long warehouseId;

    @NotBlank(message = "Biển số xe không được để trống")
    private String plateNumber;

    @NotBlank(message = "Tên dòng xe không được để trống")
    private String vehicleModel;

    private String vehicleType = "REFRIGERATED_TRUCK";

    @NotNull(message = "Tải trọng không được để trống")
    private BigDecimal capacityKg;

    @NotNull(message = "Thể tích không được để trống")
    private BigDecimal volumeM3;

    private BigDecimal minTemp = new BigDecimal("2.0");
    private BigDecimal maxTemp = new BigDecimal("6.0");
    private String status = "AVAILABLE";
    private String notes;
}
