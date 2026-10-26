package com.btl.webbanrau.model;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;

@Entity
@Table(name = "b2b_contracts")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class B2BContract extends BaseEntity {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @Column(nullable = false, unique = true, length = 50) private String contractCode;
    @ManyToOne(fetch = FetchType.LAZY, optional = false) @JoinColumn(name = "buyer_id", nullable = false) private User buyer;
    @ManyToOne(fetch = FetchType.LAZY, optional = false) @JoinColumn(name = "harvest_lot_id", nullable = false) private HarvestLot harvestLot;
    @OneToOne(fetch = FetchType.LAZY, optional = false) @JoinColumn(name = "rfq_id", nullable = false, unique = true) private BuyerRfq rfq;
    @Column(nullable = false, precision = 12, scale = 2) private BigDecimal quantityKg;
    @Column(nullable = false, precision = 12, scale = 2) private BigDecimal agreedPricePerKg;
    @Column(nullable = false, precision = 15, scale = 2) private BigDecimal totalAmount;
    @Column(nullable = false, precision = 15, scale = 2) private BigDecimal depositAmount;
    @Column(nullable = false, length = 30) @Builder.Default private String status = "WAITING_DEPOSIT";
    @Column(nullable = false, length = 30) @Builder.Default private String depositStatus = "UNPAID";
    @Column(nullable = false, length = 255) private String deliveryAddress;
}
