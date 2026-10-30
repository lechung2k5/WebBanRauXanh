package com.btl.webbanrau.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PublicRfqDepositRequest {

    private Long harvestLotId;
    private Long productId;
    private String productName;

    @NotBlank(message = "Tên người đại diện không được để trống")
    private String buyerName;

    @NotBlank(message = "Số điện thoại liên hệ không được để trống")
    private String buyerPhone;

    private String buyerCompany;

    @NotNull(message = "Khối lượng thu mua không được để trống")
    private Double requestedQuantity;

    @NotNull(message = "Mức giá đề xuất không được để trống")
    private BigDecimal targetPrice;

    private BigDecimal depositAmount; // Tiền cọc 30%
    private Boolean isDepositPaid;    // true nếu thương lái quét VietQR đặt cọc ngay

    private LocalDate deliveryDate;
    private String hubLocation;
    private String shippingOption;
    private String notes;
}
