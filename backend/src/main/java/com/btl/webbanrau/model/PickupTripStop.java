package com.btl.webbanrau.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "pickup_trip_stops")
@EntityListeners(AuditingEntityListener.class)
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class PickupTripStop {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "trip_id", nullable = false)
    @JsonIgnore
    private PickupTrip trip;

    @ManyToOne(fetch = FetchType.EAGER, optional = false)
    @JoinColumn(name = "contract_id", nullable = false)
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler", "buyer", "farmer", "harvestLot", "rfq"})
    private B2bContract contract;

    @JsonProperty("contractId")
    public Long getContractId() {
        return contract != null ? contract.getId() : null;
    }

    @JsonProperty("contractCode")
    public String getContractCode() {
        return contract != null ? contract.getContractCode() : null;
    }

    @Column(name = "stop_order", nullable = false)
    private Integer stopOrder;

    @Column(name = "farmer_name", length = 100)
    private String farmerName;

    @Column(name = "pickup_address", nullable = false, length = 255)
    private String pickupAddress;

    @Column(name = "contact_phone", length = 50)
    private String contactPhone;

    @Column(name = "weight_kg", nullable = false, precision = 10, scale = 2)
    private BigDecimal weightKg;

    @Column(name = "volume_m3", nullable = false, precision = 10, scale = 2)
    private BigDecimal volumeM3;

    @Column(name = "package_count", nullable = false)
    private Integer packageCount;

    @Builder.Default
    @Column(nullable = false, length = 30)
    private String status = "PENDING"; // PENDING, ARRIVED, LOADED, ISSUE_REPORTED, SKIPPED, CANCELLED

    @Column(name = "arrived_at")
    private LocalDateTime arrivedAt;

    @Column(name = "loaded_at")
    private LocalDateTime loadedAt;

    @Column(name = "actual_weight_kg", precision = 10, scale = 2)
    private BigDecimal actualWeightKg;

    @Column(name = "actual_package_count")
    private Integer actualPackageCount;

    @Column(name = "handover_photo_url", columnDefinition = "TEXT")
    private String handoverPhotoUrl;

    @Column(name = "handover_signature_data", columnDefinition = "TEXT")
    private String handoverSignatureData;

    @Column(name = "issue_reason", length = 100)
    private String issueReason;

    @Column(name = "issue_notes", columnDefinition = "TEXT")
    private String issueNotes;

    @Column(columnDefinition = "TEXT")
    private String notes;

    @CreatedDate
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;
}
