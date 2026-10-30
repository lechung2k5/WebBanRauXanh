package com.btl.webbanrau.model;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;

@Entity
@Table(name = "hub_inspections")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class HubInspection extends BaseEntity {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @ManyToOne(fetch = FetchType.LAZY, optional = false) @JoinColumn(name = "contract_id", nullable = false) private B2bContract contract;
    @Column(nullable = false, precision = 12, scale = 2) private BigDecimal receivedWeightKg;
    @Column(nullable = false, precision = 12, scale = 2) private BigDecimal qualifiedWeightKg;
    @Builder.Default @Column(nullable = false, precision = 12, scale = 2) private BigDecimal rejectedWeightKg = BigDecimal.ZERO;
    @Column(precision = 4, scale = 1) private BigDecimal brixDegree;
    @Column(precision = 4, scale = 1) private BigDecimal moisturePercent;
    @Column(length = 500) private String qcNote;
}
