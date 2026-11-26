package com.btl.webbanrau.model;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "procurement_requests")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ProcurementRequest extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "request_code", nullable = false, unique = true, length = 50)
    private String requestCode;

    @Column(name = "buyer_id", nullable = false)
    private Long buyerId;

    @Column(name = "buyer_name", nullable = false, length = 150)
    private String buyerName;

    @Column(name = "buyer_company", length = 200)
    private String buyerCompany;

    @Column(nullable = false, length = 80)
    private String category;

    @Column(nullable = false, length = 255)
    private String title;

    @Column(name = "volume_needed", nullable = false, length = 100)
    private String volumeNeeded;

    @Column(name = "target_price_range", nullable = false, length = 120)
    private String targetPriceRange;

    @Column(nullable = false, length = 255)
    private String destination;

    @Column(nullable = false, length = 30)
    @Builder.Default
    private String status = "OPEN"; // OPEN, CLOSED, FULFILLED
}
