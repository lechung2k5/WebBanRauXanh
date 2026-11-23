package com.btl.webbanrau.model;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "pickup_trips")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class PickupTrip extends BaseEntity {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "trip_code", nullable = false, unique = true, length = 50)
    private String tripCode;

    @ManyToOne(fetch = FetchType.EAGER, optional = false)
    @JoinColumn(name = "warehouse_id", nullable = false)
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    private WarehouseHub warehouse;

    @ManyToOne(fetch = FetchType.EAGER, optional = false)
    @JoinColumn(name = "vehicle_id", nullable = false)
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler", "warehouse"})
    private FleetVehicle vehicle;

    @ManyToOne(fetch = FetchType.EAGER, optional = false)
    @JoinColumn(name = "driver_id", nullable = false)
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler", "warehouse"})
    private FleetDriver driver;

    @Builder.Default
    @Column(nullable = false, length = 30)
    private String status = "ASSIGNED"; // ASSIGNED, ACKNOWLEDGED, ON_TRIP, RETURNING, ARRIVED_AT_WAREHOUSE, COMPLETED, CANCELLED

    @Builder.Default
    @Column(name = "total_weight_kg", nullable = false, precision = 10, scale = 2)
    private BigDecimal totalWeightKg = BigDecimal.ZERO;

    @Builder.Default
    @Column(name = "total_volume_m3", nullable = false, precision = 10, scale = 2)
    private BigDecimal totalVolumeM3 = BigDecimal.ZERO;

    @Builder.Default
    @Column(name = "total_packages", nullable = false)
    private Integer totalPackages = 0;

    @Builder.Default
    @Column(name = "total_stops", nullable = false)
    private Integer totalStops = 0;

    @Column(name = "acknowledged_at")
    private LocalDateTime acknowledgedAt;

    @Column(name = "departure_time")
    private LocalDateTime departureTime;

    @Column(name = "returning_time")
    private LocalDateTime returningTime;

    @Column(name = "arrived_warehouse_time")
    private LocalDateTime arrivedWarehouseTime;

    @Column(name = "completion_time")
    private LocalDateTime completionTime;

    @Column(name = "actual_total_weight_kg", precision = 10, scale = 2)
    private BigDecimal actualTotalWeightKg;

    @Column(name = "actual_total_packages")
    private Integer actualTotalPackages;

    @Column(name = "receiving_staff_id")
    private Long receivingStaffId;

    @Column(name = "receiving_notes", columnDefinition = "TEXT")
    private String receivingNotes;

    @Column(name = "cancellation_reason", columnDefinition = "TEXT")
    private String cancellationReason;

    @Column(name = "created_by", length = 100)
    private String createdBy;

    @Builder.Default
    @OneToMany(mappedBy = "trip", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.EAGER)
    @OrderBy("stopOrder ASC")
    private List<PickupTripStop> stops = new ArrayList<>();
}
