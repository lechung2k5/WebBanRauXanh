package com.btl.webbanrau.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FarmerPublicProfileResponse {
    private Long id;
    private String farmName;
    private String ownerName;
    private boolean householdFarmer;
    private String pucCode;
    private String certification;
    private String kycStatus;
    private String address;
    private int openLotCount;
    private int pastLotCount;
    private BigDecimal totalAvailableKg;
    private List<String> mainProduce;
    private String coverImageUrl;
    private List<OpenLotSummary> openLots;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class OpenLotSummary {
        private Long id;
        private String lotCode;
        private String productName;
        private BigDecimal basePricePerKg;
        private BigDecimal availableWeightKg;
        private BigDecimal totalWeightKg;
        private String status;
        private String pucCode;
    }
}
