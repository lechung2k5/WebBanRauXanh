package com.btl.webbanrau.model;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;

@Entity
@Table(name = "hub_inspections")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
@AttributeOverrides({
    @AttributeOverride(name = "createdAt", column = @Column(name = "created_at", nullable = true)),
    @AttributeOverride(name = "updatedAt", column = @Column(name = "updated_at", nullable = true))
})
public class HubInspection extends BaseEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "inspection_code", nullable = false, length = 64)
    private String inspectionCode;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "contract_id", nullable = false)
    private B2bContract contract;

    @Column(name = "cold_room_id")
    private Long coldRoomId;

    @Column(name = "qc_staff_id")
    private Long qcStaffId;

    @Column(name = "received_weight_kg", nullable = false, precision = 12, scale = 2)
    private BigDecimal receivedWeightKg;

    @Column(name = "qualified_weight_kg", nullable = false, precision = 12, scale = 2)
    private BigDecimal qualifiedWeightKg;

    @Builder.Default
    @Column(name = "rejected_weight_kg", nullable = false, precision = 12, scale = 2)
    private BigDecimal rejectedWeightKg = BigDecimal.ZERO;

    @Column(name = "brix_degree", precision = 4, scale = 1)
    private BigDecimal brixDegree;

    @Column(name = "moisture_pct", precision = 4, scale = 1)
    private BigDecimal moisturePercent;

    @Column(name = "qc_note", length = 500)
    private String qcNote;

    @PrePersist
    public void ensureInspectionCode() {
        if (this.inspectionCode == null || this.inspectionCode.isBlank()) {
            this.inspectionCode = "INS-" + System.currentTimeMillis();
        }
        if (this.coldRoomId == null) {
            this.coldRoomId = 9L;
        }
        if (this.qcStaffId == null) {
            this.qcStaffId = 1L;
        }
    }
}
