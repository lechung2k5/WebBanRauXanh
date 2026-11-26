package com.btl.webbanrau.model;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;

@Entity
@Table(
        name = "procurement_quotes",
        uniqueConstraints = @UniqueConstraint(columnNames = {"procurement_request_id", "farmer_id", "harvest_lot_id"})
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ProcurementQuote extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "procurement_request_id", nullable = false)
    private Long procurementRequestId;

    @Column(name = "farmer_id", nullable = false)
    private Long farmerId;

    @Column(name = "farmer_name", nullable = false, length = 150)
    private String farmerName;

    @Column(name = "harvest_lot_id", nullable = false)
    private Long harvestLotId;

    @Column(name = "lot_code", nullable = false, length = 50)
    private String lotCode;

    @Column(name = "product_name", nullable = false, length = 150)
    private String productName;

    @Column(name = "puc_code", length = 50)
    private String pucCode;

    @Column(length = 100)
    private String certification;

    @Column(name = "offered_price_per_kg", nullable = false, precision = 12, scale = 2)
    private BigDecimal offeredPricePerKg;

    @Column(name = "offered_quantity_kg", nullable = false, precision = 12, scale = 2)
    private BigDecimal offeredQuantityKg;

    @Column(name = "delivery_date")
    private LocalDate deliveryDate;

    @Column(columnDefinition = "TEXT")
    private String notes;

    @Column(nullable = false, length = 30)
    @Builder.Default
    private String status = "PENDING"; // PENDING, ACCEPTED, REJECTED
}
