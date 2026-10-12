package com.btl.webbanrau.model;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;

@Entity
@Table(name = "products")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Product extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 200)
    private String name;

    @Column(nullable = false, unique = true, length = 250)
    private String slug;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(nullable = false, precision = 15, scale = 2)
    private BigDecimal price;

    @Column(precision = 15, scale = 2)
    private BigDecimal originalPrice;

    @Column(nullable = false)
    private Integer stockQuantity;

    @Column(length = 50)
    private String unit; // kg, gói 500g, bó 400g, hộp, túi

    @Column(length = 500)
    private String imageUrl;

    @Column(length = 100)
    private String origin; // Đà Lạt, Mộc Châu, VietGAP, Thái Lan, Hàn Quốc,...

    @Column(length = 100)
    private String brand; // Bách Hóa XANH, Đà Lạt Farm, Korea Farm,...

    @Column
    private Integer discountPercent; // Phần trăm giảm giá (VD: 20%)

    @Column(length = 100)
    private String categorySlug; // nam-tuoi, rau-sach, cu

    @Column
    private Double rating; // Điểm đánh giá (VD: 4.8)

    @Column
    private Integer reviewCount; // Số lượt đánh giá (VD: 124)

    @Builder.Default
    @Column(nullable = false)
    private Boolean isOrganic = true;

    @Builder.Default
    @Column(nullable = false)
    private Boolean isFeatured = false;

    @Builder.Default
    @Column(nullable = false)
    private Boolean isActive = true;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "category_id")
    private Category category;
}
