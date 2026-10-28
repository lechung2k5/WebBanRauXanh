package com.btl.webbanrau.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import lombok.*;

import java.time.LocalDate;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class HarvestLotRequest {

    @NotBlank(message = "Tên nông sản không được để trống")
    private String productName;

    private String categorySlug;

    private String imageUrl;

    @NotBlank(message = "Mã số vùng trồng PUC không được để trống")
    private String pucCode;

    @NotNull(message = "Ngày thu hoạch không được để trống")
    private LocalDate harvestDate;

    @NotNull(message = "Hạn bảo quản tươi không được để trống")
    private LocalDate expiryDate;

    @NotNull(message = "Tổng sản lượng không được để trống")
    @Positive(message = "Sản lượng phải lớn hơn 0")
    private Double totalQuantity;

    private String unit;

    private Double minTemp;

    private Double maxTemp;

    @NotBlank(message = "Ma trận giá sỉ phân tầng không được để trống")
    private String tierPricingJson;

    private String hubLocation;
}
