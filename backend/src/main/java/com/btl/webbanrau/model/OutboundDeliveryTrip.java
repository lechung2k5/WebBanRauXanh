package com.btl.webbanrau.model;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "outbound_delivery_trips")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class OutboundDeliveryTrip extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "trip_code", nullable = false, unique = true, length = 50)
    private String tripCode;

    @ManyToOne(fetch = FetchType.EAGER, optional = false)
    @JoinColumn(name = "hub_id", nullable = false)
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    private WarehouseHub hub;

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
    private String status = "ASSIGNED"; // DRAFT, ASSIGNED, ON_DELIVERY, COMPLETED, CANCELLED

    @Column(name = "planned_departure_at")
    private LocalDateTime plannedDepartureAt;

    @Column(name = "departed_at")
    private LocalDateTime departedAt;

    @Column(name = "completed_at")
    private LocalDateTime completedAt;

    @Builder.Default
    @Column(name = "total_loaded_weight_kg", nullable = false, precision = 10, scale = 2)
    private BigDecimal totalLoadedWeightKg = BigDecimal.ZERO;

    @Builder.Default
    @Column(name = "total_volume_m3", nullable = false, precision = 10, scale = 2)
    private BigDecimal totalVolumeM3 = BigDecimal.ZERO;

    @Builder.Default
    @Column(name = "total_stops", nullable = false)
    private Integer totalStops = 0;

    @Column(columnDefinition = "TEXT")
    private String notes;

    @Column(name = "created_by", length = 100)
    private String createdBy;

    @Builder.Default
    @OneToMany(mappedBy = "trip", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.EAGER)
    @OrderBy("stopSequence ASC")
    private List<OutboundDeliveryStop> stops = new ArrayList<>();
}
