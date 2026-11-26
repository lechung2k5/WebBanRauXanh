package com.btl.webbanrau.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;

@Entity
@Table(name = "warehouse_zones")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class WarehouseZone extends BaseEntity {
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

    @Column(name = "zone_code", nullable = false, length = 30)
    private String zoneCode;

    @Column(name = "zone_name", nullable = false, length = 120)
    private String zoneName;

    @Column(length = 255)
    private String description;

    @Builder.Default
    @Column(name = "temp_min", nullable = false, precision = 4, scale = 1)
    private BigDecimal tempMin = new BigDecimal("2.0");

    @Builder.Default
    @Column(name = "temp_max", nullable = false, precision = 4, scale = 1)
    private BigDecimal tempMax = new BigDecimal("6.0");

    @Builder.Default
    @Column(name = "humidity_target")
    private Integer humidityTarget = 90;

    @Builder.Default
    @Column(name = "humidity_min")
    private Integer humidityMin = 85;

    @Builder.Default
    @Column(name = "humidity_max")
    private Integer humidityMax = 95;

    @Builder.Default
    @Column(name = "capacity_kg", nullable = false, precision = 12, scale = 2)
    private BigDecimal capacityKg = new BigDecimal("20000.00");

    @Builder.Default
    @Column(nullable = false, length = 30)
    private String status = "ACTIVE"; // ACTIVE, MAINTENANCE
}
