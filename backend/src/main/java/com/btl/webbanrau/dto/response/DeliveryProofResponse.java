package com.btl.webbanrau.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DeliveryProofResponse {
    private Long contractId;
    private String contractCode;
    private String shipmentCode;
    private LocalDateTime departedAt;
    private LocalDateTime deliveredAt;
    private String epodPhotoUrl;
    private String epodSignatureName;
    private String epodSignatureData;
    private BigDecimal loadedWeightKg;
    private BigDecimal deliveredWeightKg;
    private BigDecimal naturalShrinkageKg;
    private Double shrinkagePercent;
    private BigDecimal damagedWeightKg;
    private String status;
    private SpoilageClaimDto spoilageClaim;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class SpoilageClaimDto {
        private String claimCode;
        private BigDecimal damagedWeightKg;
        private String cause;
        private String liableParty;
        private BigDecimal compensationAmount;
        private String status;
        private String resolutionNote;
    }
}
