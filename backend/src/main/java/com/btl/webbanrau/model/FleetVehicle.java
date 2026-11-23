package com.btl.webbanrau.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;

@Entity
@Table(name = "fleet_vehicles")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class FleetVehicle extends BaseEntity {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "warehouse_id", nullable = false)
    @JsonIgnore
    private WarehouseHub warehouse;

    @JsonProperty("warehouseId")
    public Long getWarehouseId() {
        return warehouse != null ? warehouse.getId() : null;
    }

    @Column(name = "plate_number", nullable = false, unique = true, length = 20)
    private String plateNumber;

    @Column(name = "vehicle_model", nullable = false, length = 100)
    private String vehicleModel;

    @Builder.Default
    @Column(name = "vehicle_type", nullable = false, length = 50)
    private String vehicleType = "REFRIGERATED_TRUCK";

    @Column(name = "capacity_kg", nullable = false, precision = 10, scale = 2)
    private BigDecimal capacityKg;

    @Column(name = "volume_m3", nullable = false, precision = 10, scale = 2)
    private BigDecimal volumeM3;

    @Builder.Default
    @Column(name = "min_temp", precision = 4, scale = 1)
    private BigDecimal minTemp = new BigDecimal("2.0");

    @Builder.Default
    @Column(name = "max_temp", precision = 4, scale = 1)
    private BigDecimal maxTemp = new BigDecimal("6.0");

    @Builder.Default
    @Column(nullable = false, length = 30)
    private String status = "AVAILABLE"; // AVAILABLE, ASSIGNED, ON_TRIP, MAINTENANCE

    @Column(columnDefinition = "TEXT")
    private String notes;
}
