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
    private String categorySlug;
    private Long categoryId;
    private String pucCode;
    private String certification;
    private LocalDate harvestDate;
    private LocalDate expiryDate;
    private BigDecimal totalWeightKg;
    private Double totalQuantity;
    private BigDecimal availableWeightKg;
    private Double remainingQuantity;
    private String unit;
    private BigDecimal basePricePerKg;
    private String tierPricingJson;
    private BigDecimal reqTempMin;
    private Double minTemp;
    private BigDecimal reqTempMax;
    private Double maxTemp;
    private String status;
    private String imageUrl;
    private String rejectionReason;
    private String auditNote;
    private String warehouseLocation;
    private String hubLocation;
    private String region;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public Double getTotalQuantity() {
        if (totalQuantity != null) return totalQuantity;
        return totalWeightKg != null ? totalWeightKg.doubleValue() : null;
    }

    public Double getRemainingQuantity() {
        if (remainingQuantity != null) return remainingQuantity;
        return availableWeightKg != null ? availableWeightKg.doubleValue() : null;
    }

    public Double getMinTemp() {
        if (minTemp != null) return minTemp;
        return reqTempMin != null ? reqTempMin.doubleValue() : null;
    }

    public Double getMaxTemp() {
        if (maxTemp != null) return maxTemp;
        return reqTempMax != null ? reqTempMax.doubleValue() : null;
    }

    public String getCategorySlug() {
        return categorySlug != null ? categorySlug : category;
    }

    public String getHubLocation() {
        return hubLocation != null ? hubLocation : warehouseLocation;
    }

    public String getUnit() {
        return unit != null ? unit : "kg";
    }
}
