package com.btl.webbanrau.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class HarvestLotAllocationResponse {
    private Long lotId;
    private String lotCode;
    private String productName;
    private BigDecimal totalWeightKg;
    private BigDecimal allocatedWeightKg;
    private BigDecimal availableWeightKg;
    private Double soldPercentage;
    private String status;
    private List<ContractAllocationDto> allocations;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ContractAllocationDto {
        private Long contractId;
        private String contractCode;
        private String buyerName;
        private String buyerPhone;
        private Double quantityKg;
        private BigDecimal unitPrice;
        private BigDecimal totalAmount;
        private String depositStatus;
        private String fulfillmentStatus;
        private String destinationWarehouse;
        private LocalDate deliveryDate;
        private String shipmentCode;
        private String shipmentStatus;
    }
}
