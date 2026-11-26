package com.btl.webbanrau.dto.response;

import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@Builder
public class ProcurementQuoteResponse {
    private Long id;
    private Long procurementRequestId;
    private Long farmerId;
    private String farmerName;
    private Long harvestLotId;
    private String lotCode;
    private String productName;
    private String pucCode;
    private String certification;
    private BigDecimal offeredPricePerKg;
    private BigDecimal offeredQuantityKg;
    private LocalDate deliveryDate;
    private String notes;
    private String status;
    private LocalDateTime createdAt;
}
