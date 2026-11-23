package com.btl.webbanrau.model;

import jakarta.persistence.*;
import com.fasterxml.jackson.annotation.JsonIgnore;
import lombok.*;

@Entity
@Table(name = "buyer_warehouses")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class BuyerWarehouse extends BaseEntity {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "buyer_profile_id", nullable = false)
    @JsonIgnore
    private BuyerProfile buyerProfile;

    @Column(nullable = false, length = 150)
    private String name;

    @Column(nullable = false, length = 255)
    private String address;

    @Column(length = 20)
    private String phone;

    @Builder.Default
    @Column(nullable = false)
    private boolean defaultWarehouse = false;
}
