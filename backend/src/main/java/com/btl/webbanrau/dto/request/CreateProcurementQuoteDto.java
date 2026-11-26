package com.btl.webbanrau.dto.request;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;

@Data
public class CreateProcurementQuoteDto {
    @NotNull(message = "Vui lòng chọn lô nông sản đã được duyệt để chào giá")
    private Long harvestLotId;

    @NotNull(message = "Giá chào bán không được để trống")
    @DecimalMin(value = "100.0", message = "Giá chào bán tối thiểu 100đ/kg")
    private BigDecimal offeredPricePerKg;

    @NotNull(message = "Sản lượng cam kết không được để trống")
    @DecimalMin(value = "1.0", message = "Sản lượng cam kết tối thiểu 1kg")
    private BigDecimal offeredQuantityKg;

    private LocalDate deliveryDate;

    private String notes;
}
