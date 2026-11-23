package com.btl.webbanrau.dto.response;

import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ProductResponse {

    private Long id;
    private String name;
    private String slug;
    private String description;
    private BigDecimal price;
    private BigDecimal originalPrice;
    private Integer stockQuantity;
    private String unit;
    private String imageUrl;
    private String origin;
    private String brand;
    private Integer discountPercent;
    private String categorySlug;
    private Double rating;
    private Integer reviewCount;
    private Boolean isOrganic;
    private Boolean isFeatured;
    private Boolean isActive;
    private Long categoryId;
    private String categoryName;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
