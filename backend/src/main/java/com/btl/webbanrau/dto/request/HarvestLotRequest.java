package com.btl.webbanrau.dto.request;

import jakarta.validation.constraints.DecimalMin;
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
public class HarvestLotRequest {

    private String lotCode; // Tùy chọn, nếu trống hệ thống tự sinh theo quy chuẩn LOT-LD-yyyy-xxx

    private Long farmerId;

    private String farmerName;

    @NotBlank(message = "Tên nông sản không được để trống")
    private String productName;

    @NotBlank(message = "Danh mục không được để trống")
    private String category; // RAU_AN_LA, CU_QUA, NAM_TUOI, TRAI_CAY, RAU_GIA_VI

    private Long categoryId;

    @NotBlank(message = "Mã số vùng trồng (PUC) không được để trống")
    private String pucCode;

    private String certification; // VietGAP, GlobalGAP, Organic, OCOP 4 Sao

    @NotNull(message = "Ngày thu hoạch không được để trống")
    private LocalDate harvestDate;

    @NotNull(message = "Hạn sử dụng (FEFO) không được để trống")
    private LocalDate expiryDate;

    @NotNull(message = "Tổng sản lượng không được để trống")
    @DecimalMin(value = "1.0", message = "Tổng sản lượng tối thiểu là 1 kg")
    private BigDecimal totalWeightKg;

    private BigDecimal availableWeightKg;

    @NotNull(message = "Giá cơ sở không được để trống")
    @DecimalMin(value = "500.0", message = "Đơn giá tối thiểu là 500đ/kg")
    private BigDecimal basePricePerKg;

    private String tierPricingJson; // JSON bảng giá phân tầng: [{"minKg": 500, "price": 15000}]

    public void setTierPricing(Object obj) {
        if (obj != null) {
            try {
                this.tierPricingJson = new com.fasterxml.jackson.databind.ObjectMapper().writeValueAsString(obj);
            } catch (Exception ignored) {}
        }
    }

    private BigDecimal reqTempMin; // Mặc định 2.0°C

    public void setTempMin(BigDecimal val) {
        this.reqTempMin = val;
    }

    private BigDecimal reqTempMax; // Mặc định 6.0°C

    public void setTempMax(BigDecimal val) {
        this.reqTempMax = val;
    }

    private String status; // OPEN, PENDING_APPROVAL, REJECTED, SUSPENDED, SOLD_OUT

    private String imageUrl;

    private String auditNote;

    private String warehouseLocation;

    private String region;
}
