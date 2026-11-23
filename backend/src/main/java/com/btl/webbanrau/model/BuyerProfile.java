package com.btl.webbanrau.model;

import jakarta.persistence.*;
import com.fasterxml.jackson.annotation.JsonIgnore;
import lombok.*;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "buyer_profiles")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class BuyerProfile extends BaseEntity {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false, unique = true)
    @JsonIgnore
    private User user;

    @Column(length = 200)
    private String companyName;

    @Column(length = 50)
    private String taxCode;

    @Column(length = 100)
    private String contactName;

    @Column(length = 20)
    private String contactPhone;

    @Builder.Default
    @Column(precision = 15, scale = 2, nullable = false)
    private BigDecimal creditLimit = BigDecimal.ZERO;

    @Builder.Default
    @Column(precision = 3, scale = 2, nullable = false)
    private BigDecimal reputationScore = new BigDecimal("5.00");

    @Builder.Default
    @Column(length = 30, nullable = false)
    private String buyerTier = "STANDARD";

    @Builder.Default
    @OneToMany(mappedBy = "buyerProfile", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<BuyerWarehouse> warehouses = new ArrayList<>();
}
