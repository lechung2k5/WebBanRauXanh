package com.btl.webbanrau.model;

import jakarta.persistence.*;
import com.fasterxml.jackson.annotation.JsonIgnore;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;

@Entity
@Table(name = "buyer_rfqs")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class BuyerRfq extends BaseEntity {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 40)
    private String rfqCode;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "buyer_id", nullable = false)
    @JsonIgnore
    private User buyer;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "harvest_lot_id", nullable = false)
    private HarvestLot harvestLot;

    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal quantityKg;

    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal proposedPricePerKg;

    @Column(nullable = false)
    private LocalDate desiredDeliveryDate;

    @Column(nullable = false, length = 255)
    private String deliveryLocation;

    @Column(length = 40)
    private String shippingOption;

    @Column(columnDefinition = "TEXT")
    private String notes;

    @Column(precision = 12, scale = 2)
    private BigDecimal counterPricePerKg;

    @Builder.Default
    @Column(nullable = false, length = 30)
    private String status = "PENDING";
}
