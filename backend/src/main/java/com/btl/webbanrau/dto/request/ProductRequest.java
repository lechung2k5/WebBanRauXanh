package com.btl.webbanrau.dto.request;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.*;

import java.math.BigDecimal;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ProductRequest {

    @NotBlank(message = "Tên sản phẩm không được để trống")
    private String name;

    private String description;

    @NotNull(message = "Giá không được để trống")
    @DecimalMin(value = "0.0", message = "Giá sản phẩm phải lớn hơn hoặc bằng 0")
    private BigDecimal price;

    private BigDecimal originalPrice;

    @NotNull(message = "Số lượng kho không được để trống")
    private Integer stockQuantity;

    private String unit;
    private String imageUrl;
    private String origin;
    private String brand;
    private Integer discountPercent;
    private String categorySlug;
    private Double rating;
    private Integer reviewCount;

    @Builder.Default
    private Boolean isOrganic = true;

    @Builder.Default
    private Boolean isFeatured = false;

    @Builder.Default
    private Boolean isActive = true;

    private Long categoryId;
}
