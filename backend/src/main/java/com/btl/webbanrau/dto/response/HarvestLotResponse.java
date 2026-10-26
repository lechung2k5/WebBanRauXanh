package com.btl.webbanrau.dto.response;

import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class HarvestLotResponse {

    private Long id;
    private String lotCode;
    private Long farmerId;
    private String farmerName;
    private String productName;
    private String category;
    private Long categoryId;
    private String pucCode;
    private String certification;
    private LocalDate harvestDate;
    private LocalDate expiryDate;
    private BigDecimal totalWeightKg;
    private BigDecimal availableWeightKg;
    private BigDecimal basePricePerKg;
    private String tierPricingJson;
    private BigDecimal reqTempMin;
    private BigDecimal reqTempMax;
    private String status;
    private String imageUrl;
    private String rejectionReason;
    private String auditNote;
    private String warehouseLocation;
    private String region;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
