package com.btl.webbanrau.model;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;

@Entity
@Table(name = "warehouse_hubs")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class WarehouseHub extends BaseEntity {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "hub_code", nullable = false, unique = true, length = 50)
    private String hubCode;

    @Column(name = "hub_name", nullable = false, length = 150)
    private String hubName;

    @Column(nullable = false, length = 50)
    private String region;

    @Column(nullable = false, length = 255)
    private String address;

    @Column(precision = 10, scale = 7)
    private BigDecimal latitude;

    @Column(precision = 10, scale = 7)
    private BigDecimal longitude;

    @Column(length = 20)
    private String hotline;

    @Column(name = "manager_name", length = 100)
    private String managerName;

    @Builder.Default
    @Column(name = "is_active", nullable = false)
    private boolean active = true;
}
