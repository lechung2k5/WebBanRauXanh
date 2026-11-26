package com.btl.webbanrau.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;

@Entity
@Table(name = "warehouse_bins")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class WarehouseBin extends BaseEntity {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "warehouse_id", nullable = false)
    @JsonIgnore
    private WarehouseHub warehouse;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "zone_id", nullable = false)
    @JsonIgnore
    private WarehouseZone zone;

    @JsonProperty("warehouseId")
    public Long getWarehouseId() {
        return warehouse != null ? warehouse.getId() : null;
    }

    @JsonProperty("zoneId")
    public Long getZoneId() {
        return zone != null ? zone.getId() : null;
    }

    @Column(name = "rack_code", nullable = false, length = 30)
    private String rackCode;

    @Column(name = "bin_code", nullable = false, length = 40)
    private String binCode;

    @Builder.Default
    @Column(name = "max_weight_kg", nullable = false, precision = 12, scale = 2)
    private BigDecimal maxWeightKg = new BigDecimal("5000.00");

    @Builder.Default
    @Column(nullable = false, length = 30)
    private String status = "ACTIVE"; // ACTIVE, MAINTENANCE

    @Column(columnDefinition = "TEXT")
    private String notes;
}
