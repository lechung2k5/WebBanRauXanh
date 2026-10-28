package com.btl.webbanrau.dto.response;

import lombok.*;

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
    private String productName;
    private String categorySlug;
    private String imageUrl;
    private String pucCode;
    private LocalDate harvestDate;
    private LocalDate expiryDate;
    private Double totalQuantity;
    private Double remainingQuantity;
    private String unit;
    private Double minTemp;
    private Double maxTemp;
    private String tierPricingJson;
    private String status;
    private String hubLocation;
    private String farmerName;
    private LocalDateTime createdAt;
}
