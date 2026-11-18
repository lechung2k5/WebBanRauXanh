package com.btl.webbanrau.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.math.BigDecimal;
import java.util.List;

@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class DispatchOptimizationResultDto {
    private Long warehouseId;
    private String hubCode;
    private String hubName;
    private int totalWaitingLots;
    private int assignedLotsCount;
    private int unassignedLotsCount;
    private List<ProposedTripDto> proposedTrips;
    private List<UnassignedContractDto> unassignedContracts;

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class ProposedTripDto {
        private String tempTripId;
        private Long vehicleId;
        private String plateNumber;
        private String vehicleModel;
        private BigDecimal capacityKg;
        private BigDecimal volumeM3;
        private Long driverId;
        private String driverName;
        private String driverPhone;
        private String licenseClass;
        private BigDecimal totalWeightKg;
        private BigDecimal totalVolumeM3;
        private double weightLoadPercentage;
        private double volumeLoadPercentage;
        private int totalPackages;
        private List<ProposedStopDto> stops;
    }

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class ProposedStopDto {
        private int stopOrder;
        private Long contractId;
        private String contractCode;
        private String farmerName;
        private String farmerPhone;
        private String pickupAddress;
        private String productName;
        private BigDecimal weightKg;
        private BigDecimal volumeM3;
        private int packageCount;
        private String packageType;
    }

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class UnassignedContractDto {
        private Long contractId;
        private String contractCode;
        private String farmerName;
        private String pickupAddress;
        private BigDecimal weightKg;
        private BigDecimal volumeM3;
        private String reasonCode;
        private String reasonDescription;
    }
}
