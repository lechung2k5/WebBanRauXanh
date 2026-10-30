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
public class HarvestLotRequest {

    private String lotCode; // Tùy chọn, nếu trống hệ thống tự sinh theo quy chuẩn LOT-LD-yyyy-xxx

    private Long farmerId;

    private String farmerName;

    @NotBlank(message = "Tên nông sản không được để trống")
    private String productName;

    private String category; // RAU_AN_LA, CU_QUA, NAM_TUOI, TRAI_CAY, RAU_GIA_VI

    private String categorySlug;

    private Long categoryId;

    @NotBlank(message = "Mã số vùng trồng (PUC) không được để trống")
    private String pucCode;

    private String certification; // VietGAP, GlobalGAP, Organic, OCOP 4 Sao

    @NotNull(message = "Ngày thu hoạch không được để trống")
    private LocalDate harvestDate;

    @NotNull(message = "Hạn sử dụng (FEFO) không được để trống")
    private LocalDate expiryDate;

    private BigDecimal totalWeightKg;

    private Double totalQuantity;

    private BigDecimal availableWeightKg;

    private String unit;

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
    private Double minTemp;

    public void setTempMin(BigDecimal val) {
        this.reqTempMin = val;
        if (val != null) this.minTemp = val.doubleValue();
    }

    private BigDecimal reqTempMax; // Mặc định 6.0°C
    private Double maxTemp;

    public void setTempMax(BigDecimal val) {
        this.reqTempMax = val;
        if (val != null) this.maxTemp = val.doubleValue();
    }

    private String status; // OPEN, PENDING_APPROVAL, REJECTED, SUSPENDED, SOLD_OUT

    private String imageUrl;

    private String auditNote;

    private String warehouseLocation;

    private String hubLocation;

    private String region;

    public Double getTotalQuantity() {
        if (totalQuantity != null) return totalQuantity;
        return totalWeightKg != null ? totalWeightKg.doubleValue() : null;
    }

    public void setTotalQuantity(Double val) {
        this.totalQuantity = val;
        if (val != null && this.totalWeightKg == null) {
            this.totalWeightKg = BigDecimal.valueOf(val);
        }
    }

    public BigDecimal getTotalWeightKg() {
        if (totalWeightKg != null) return totalWeightKg;
        return totalQuantity != null ? BigDecimal.valueOf(totalQuantity) : null;
    }

    public void setTotalWeightKg(BigDecimal val) {
        this.totalWeightKg = val;
        if (val != null && this.totalQuantity == null) {
            this.totalQuantity = val.doubleValue();
        }
    }

    public String getCategorySlug() {
        return categorySlug != null ? categorySlug : category;
    }

    public void setCategorySlug(String val) {
        this.categorySlug = val;
        if (this.category == null) this.category = val;
    }

    public String getCategory() {
        return category != null ? category : categorySlug;
    }

    public void setCategory(String val) {
        this.category = val;
        if (this.categorySlug == null) this.categorySlug = val;
    }

    public String getHubLocation() {
        return hubLocation != null ? hubLocation : warehouseLocation;
    }

    public void setHubLocation(String val) {
        this.hubLocation = val;
        if (this.warehouseLocation == null) this.warehouseLocation = val;
    }

    public String getWarehouseLocation() {
        return warehouseLocation != null ? warehouseLocation : hubLocation;
    }

    public void setWarehouseLocation(String val) {
        this.warehouseLocation = val;
        if (this.hubLocation == null) this.hubLocation = val;
    }

    public Double getMinTemp() {
        if (minTemp != null) return minTemp;
        return reqTempMin != null ? reqTempMin.doubleValue() : null;
    }

    public void setMinTemp(Double val) {
        this.minTemp = val;
        if (val != null && this.reqTempMin == null) this.reqTempMin = BigDecimal.valueOf(val);
    }

    public BigDecimal getReqTempMin() {
        if (reqTempMin != null) return reqTempMin;
        return minTemp != null ? BigDecimal.valueOf(minTemp) : null;
    }

    public void setReqTempMin(BigDecimal val) {
        this.reqTempMin = val;
        if (val != null && this.minTemp == null) this.minTemp = val.doubleValue();
    }

    public Double getMaxTemp() {
        if (maxTemp != null) return maxTemp;
        return reqTempMax != null ? reqTempMax.doubleValue() : null;
    }

    public void setMaxTemp(Double val) {
        this.maxTemp = val;
        if (val != null && this.reqTempMax == null) this.reqTempMax = BigDecimal.valueOf(val);
    }

    public BigDecimal getReqTempMax() {
        if (reqTempMax != null) return reqTempMax;
        return maxTemp != null ? BigDecimal.valueOf(maxTemp) : null;
    }

    public void setReqTempMax(BigDecimal val) {
        this.reqTempMax = val;
        if (val != null && this.maxTemp == null) this.maxTemp = val.doubleValue();
    }
}
