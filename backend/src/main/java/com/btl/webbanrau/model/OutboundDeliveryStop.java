package com.btl.webbanrau.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "outbound_delivery_stops")
@EntityListeners(AuditingEntityListener.class)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class OutboundDeliveryStop {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "trip_id", nullable = false)
    @JsonIgnore
    private OutboundDeliveryTrip trip;

    @ManyToOne(fetch = FetchType.EAGER, optional = false)
    @JoinColumn(name = "contract_id", nullable = false)
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler", "buyer", "farmer", "harvestLot", "rfq"})
    private B2bContract contract;

    @JsonProperty("contractId")
    public Long getContractId() {
        try {
            return contract != null ? contract.getId() : null;
        } catch (Exception e) {
            return null;
        }
    }

    @JsonProperty("contractCode")
    public String getContractCode() {
        try {
            return contract != null ? contract.getContractCode() : null;
        } catch (Exception e) {
            return null;
        }
    }

    @JsonProperty("tripId")
    public Long getTripId() {
        try {
            return trip != null ? trip.getId() : null;
        } catch (Exception e) {
            return null;
        }
    }

    @Transient
    private String resolvedDeliveryAddress;

    @JsonProperty("resolvedDeliveryAddress")
    public String getResolvedDeliveryAddress() {
        if (resolvedDeliveryAddress != null && !resolvedDeliveryAddress.isBlank()) {
            return resolvedDeliveryAddress;
        }
        try {
            if (buyerWarehouse != null && buyerWarehouse.getAddress() != null && !buyerWarehouse.getAddress().isBlank()) {
                return buyerWarehouse.getAddress().trim();
            }
            if (contract != null) {
                if (contract.getBuyer() != null && contract.getBuyer().getWarehouseAddress() != null && !contract.getBuyer().getWarehouseAddress().isBlank()) {
                    return contract.getBuyer().getWarehouseAddress().trim();
                }
                if (contract.getDeliveryAddress() != null && !contract.getDeliveryAddress().isBlank()) {
                    return contract.getDeliveryAddress().trim();
                }
                if (contract.getRfq() != null && contract.getRfq().getHubLocation() != null && !contract.getRfq().getHubLocation().isBlank()) {
                    return contract.getRfq().getHubLocation().trim();
                }
            }
        } catch (Exception ignored) {}
        return deliveryAddressSnapshot;
    }

    @JsonProperty("tripCode")
    public String getTripCode() {
        try {
            return trip != null ? trip.getTripCode() : null;
        } catch (Exception e) {
            return null;
        }
    }

    @JsonProperty("vehiclePlate")
    public String getVehiclePlate() {
        try {
            return trip != null && trip.getVehicle() != null ? trip.getVehicle().getPlateNumber() : null;
        } catch (Exception e) {
            return null;
        }
    }

    @JsonProperty("driverName")
    public String getDriverName() {
        try {
            return trip != null && trip.getDriver() != null ? trip.getDriver().getFullName() : null;
        } catch (Exception e) {
            return null;
        }
    }

    @JsonProperty("hubName")
    public String getHubName() {
        try {
            return trip != null && trip.getHub() != null ? trip.getHub().getHubName() : null;
        } catch (Exception e) {
            return null;
        }
    }

    @JsonProperty("productName")
    public String getProductName() {
        try {
            return contract != null && contract.getHarvestLot() != null ? contract.getHarvestLot().getProductName() : null;
        } catch (Exception e) {
            return null;
        }
    }

    @JsonProperty("unitPrice")
    public BigDecimal getUnitPrice() {
        try {
            if (contract == null) return null;
            return contract.getOfferedPricePerKg() != null ? contract.getOfferedPricePerKg() : contract.getUnitPrice();
        } catch (Exception e) {
            return null;
        }
    }

    @JsonProperty("packageCount")
    public Integer getPackageCount() {
        try {
            return contract != null ? contract.getPackageCount() : null;
        } catch (Exception e) {
            return null;
        }
    }

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "buyer_warehouse_id")
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler", "buyerProfile"})
    private BuyerWarehouse buyerWarehouse;

    @JsonProperty("buyerWarehouseId")
    public Long getBuyerWarehouseId() {
        try {
            return buyerWarehouse != null ? buyerWarehouse.getId() : null;
        } catch (Exception e) {
            return null;
        }
    }

    @Column(name = "stop_sequence", nullable = false)
    private Integer stopSequence;

    @Column(name = "delivery_address_snapshot", nullable = false, length = 255)
    private String deliveryAddressSnapshot;

    @Column(name = "contact_name_snapshot", length = 100)
    private String contactNameSnapshot;

    @Column(name = "contact_phone_snapshot", length = 50)
    private String contactPhoneSnapshot;

    @Column(name = "expected_weight_kg", nullable = false, precision = 10, scale = 2)
    private BigDecimal expectedWeightKg;

    @Builder.Default
    @Column(nullable = false, length = 30)
    private String status = "ASSIGNED"; // PLANNED, ASSIGNED, ARRIVED, DRIVER_SUBMITTED, PENDING_BUYER_CONFIRMATION, BUYER_CONFIRMED, REJECTED, CANCELLED

    @Column(name = "arrived_at")
    private LocalDateTime arrivedAt;

    @Column(name = "driver_submitted_at")
    private LocalDateTime driverSubmittedAt;

    @Column(name = "buyer_confirmed_at")
    private LocalDateTime buyerConfirmedAt;

    @Column(name = "actual_delivered_weight_kg", precision = 10, scale = 2)
    private BigDecimal actualDeliveredWeightKg;

    @Builder.Default
    @Column(name = "rejected_weight_kg", precision = 10, scale = 2)
    private BigDecimal rejectedWeightKg = BigDecimal.ZERO;

    @Column(name = "rejection_reason", length = 255)
    private String rejectionReason;

    @Column(name = "driver_signature_data", columnDefinition = "TEXT")
    private String driverSignatureData;

    @Column(name = "driver_notes", columnDefinition = "TEXT")
    private String driverNotes;

    @Column(name = "buyer_signer_name", length = 100)
    private String buyerSignerName;

    @Column(name = "buyer_signer_phone", length = 50)
    private String buyerSignerPhone;

    @Column(name = "buyer_signature_data", columnDefinition = "TEXT")
    private String buyerSignatureData;

    @Column(name = "buyer_notes", columnDefinition = "TEXT")
    private String buyerNotes;

    @Column(name = "handover_photo_url", columnDefinition = "TEXT")
    private String handoverPhotoUrl;

    @CreatedDate
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @LastModifiedDate
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
