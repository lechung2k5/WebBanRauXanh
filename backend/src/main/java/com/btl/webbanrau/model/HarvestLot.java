package com.btl.webbanrau.model;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;

@Entity
@Table(name = "harvest_lots")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class HarvestLot extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "lot_code", nullable = false, unique = true, length = 50)
    private String lotCode; // VD: LOT-LD-2026-001

    @Column(name = "farmer_id", nullable = false)
    private Long farmerId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "farmer_id", insertable = false, updatable = false)
    private User farmer;

    @Column(name = "farmer_name", length = 150)
    private String farmerName; // VD: HTX Nông Nghiệp Đơn Dương

    @Column(name = "product_name", nullable = false, length = 100)
    private String productName;

    @Column(nullable = false, length = 50)
    private String category; // RAU_AN_LA, CU_QUA, NAM_TUOI, TRAI_CAY, RAU_GIA_VI

    @Column(name = "category_id")
    private Long categoryId;

    @Column(name = "puc_code", nullable = false, length = 50)
    private String pucCode; // Mã số vùng trồng kiểm định (VD: VN-LDO-04-100)

    @Column(length = 100)
    @Builder.Default
    private String certification = "VietGAP"; // VietGAP, GlobalGAP, Organic USDA, OCOP 4 Sao

    @Column(name = "harvest_date", nullable = false)
    private LocalDate harvestDate;

    @Column(name = "expiry_date", nullable = false)
    private LocalDate expiryDate; // Dùng cho phân loại & xuất kho FEFO

    @Column(name = "total_weight_kg", nullable = false, precision = 12, scale = 2)
    private BigDecimal totalWeightKg;

    @Column(name = "available_weight_kg", nullable = false, precision = 12, scale = 2)
    private BigDecimal availableWeightKg;

    @Column(name = "base_price_per_kg", nullable = false, precision = 12, scale = 2)
    @Builder.Default
    private BigDecimal basePricePerKg = new BigDecimal("15000.00");

    @org.hibernate.annotations.JdbcTypeCode(org.hibernate.type.SqlTypes.JSON)
    @Column(name = "tier_pricing_json", columnDefinition = "jsonb")
    @Builder.Default
    private String tierPricingJson = "[]"; // [{"minKg": 500, "price": 15000}, {"minKg": 2000, "price": 13500}]

    @Column(name = "req_temp_min", precision = 4, scale = 1)
    @Builder.Default
    private BigDecimal reqTempMin = new BigDecimal("2.0");

    @Column(name = "req_temp_max", precision = 4, scale = 1)
    @Builder.Default
    private BigDecimal reqTempMax = new BigDecimal("6.0");

    @Column(length = 30)
    @Builder.Default
    private String status = "OPEN"; // OPEN, PENDING_APPROVAL, REJECTED, SUSPENDED, SOLD_OUT, NEGOTIATING

    @Column(name = "image_url", columnDefinition = "TEXT")
    private String imageUrl;

    @Column(name = "image_public_id", length = 255)
    private String imagePublicId;

    @Column(name = "rejection_reason", columnDefinition = "TEXT")
    private String rejectionReason;

    @Column(name = "audit_note", columnDefinition = "TEXT")
    private String auditNote;

    @Column(name = "review_note", columnDefinition = "TEXT")
    private String reviewNote;

    @Column(name = "warehouse_location", length = 100)
    private String warehouseLocation;

    @Column(length = 100)
    private String region;

    // Transient fields to bridge Farmer portal & backend
    @Transient
    private Double totalQuantity;

    @Transient
    private Double remainingQuantity;

    @Transient
    private Double minTemp;

    @Transient
    private Double maxTemp;

    @Transient
    private String categorySlug;

    @Transient
    private String hubLocation;

    @Transient
    @Builder.Default
    private String unit = "kg";

    public void setFarmer(User farmer) {
        this.farmer = farmer;
        if (farmer != null) {
            this.farmerId = farmer.getId();
            if (this.farmerName == null || this.farmerName.isBlank()) {
                this.farmerName = farmer.getFullName() != null ? farmer.getFullName() : farmer.getCompanyName();
            }
        }
    }

    public Double getTotalQuantity() {
        if (totalQuantity != null) return totalQuantity;
        return totalWeightKg != null ? totalWeightKg.doubleValue() : null;
    }

    public void setTotalQuantity(Double totalQuantity) {
        this.totalQuantity = totalQuantity;
        if (totalQuantity != null) {
            this.totalWeightKg = BigDecimal.valueOf(totalQuantity);
        }
    }

    public Double getRemainingQuantity() {
        if (remainingQuantity != null) return remainingQuantity;
        return availableWeightKg != null ? availableWeightKg.doubleValue() : null;
    }

    public void setRemainingQuantity(Double remainingQuantity) {
        this.remainingQuantity = remainingQuantity;
        if (remainingQuantity != null) {
            this.availableWeightKg = BigDecimal.valueOf(remainingQuantity);
        }
    }

    public String getCategorySlug() {
        return categorySlug != null ? categorySlug : category;
    }

    public void setCategorySlug(String categorySlug) {
        this.categorySlug = categorySlug;
        if (categorySlug != null) {
            this.category = categorySlug;
        }
    }

    public String getHubLocation() {
        return hubLocation != null ? hubLocation : warehouseLocation;
    }

    public void setHubLocation(String hubLocation) {
        this.hubLocation = hubLocation;
        if (hubLocation != null) {
            this.warehouseLocation = hubLocation;
        }
    }

    public Double getMinTemp() {
        if (minTemp != null) return minTemp;
        return reqTempMin != null ? reqTempMin.doubleValue() : null;
    }

    public void setMinTemp(Double minTemp) {
        this.minTemp = minTemp;
        if (minTemp != null) {
            this.reqTempMin = BigDecimal.valueOf(minTemp);
        }
    }

    public Double getMaxTemp() {
        if (maxTemp != null) return maxTemp;
        return reqTempMax != null ? reqTempMax.doubleValue() : null;
    }

    public void setMaxTemp(Double maxTemp) {
        this.maxTemp = maxTemp;
        if (maxTemp != null) {
            this.reqTempMax = BigDecimal.valueOf(maxTemp);
        }
    }

    public String getUnit() {
        return unit != null ? unit : "kg";
    }

    public void setUnit(String unit) {
        this.unit = unit;
    }

    @PrePersist
    @PreUpdate
    public void syncFields() {
        if (this.category == null && this.categorySlug != null) {
            this.category = this.categorySlug;
        } else if (this.categorySlug == null && this.category != null) {
            this.categorySlug = this.category;
        }

        if (this.totalWeightKg == null && this.totalQuantity != null) {
            this.totalWeightKg = BigDecimal.valueOf(this.totalQuantity);
        } else if (this.totalQuantity == null && this.totalWeightKg != null) {
            this.totalQuantity = this.totalWeightKg.doubleValue();
        }

        if (this.availableWeightKg == null && this.remainingQuantity != null) {
            this.availableWeightKg = BigDecimal.valueOf(this.remainingQuantity);
        } else if (this.remainingQuantity == null && this.availableWeightKg != null) {
            this.remainingQuantity = this.availableWeightKg.doubleValue();
        }

        if (this.reqTempMin == null && this.minTemp != null) {
            this.reqTempMin = BigDecimal.valueOf(this.minTemp);
        } else if (this.minTemp == null && this.reqTempMin != null) {
            this.minTemp = this.reqTempMin.doubleValue();
        }

        if (this.reqTempMax == null && this.maxTemp != null) {
            this.reqTempMax = BigDecimal.valueOf(this.maxTemp);
        } else if (this.maxTemp == null && this.reqTempMax != null) {
            this.maxTemp = this.reqTempMax.doubleValue();
        }

        if (this.warehouseLocation == null && this.hubLocation != null) {
            this.warehouseLocation = this.hubLocation;
        } else if (this.hubLocation == null && this.warehouseLocation != null) {
            this.hubLocation = this.warehouseLocation;
        }

        if (this.farmer != null && this.farmerId == null) {
            this.farmerId = this.farmer.getId();
        }
        if (this.farmer != null && (this.farmerName == null || this.farmerName.isBlank())) {
            this.farmerName = this.farmer.getFullName() != null ? this.farmer.getFullName() : this.farmer.getCompanyName();
        }

        if (this.certification == null || this.certification.isBlank()) {
            this.certification = "VietGAP";
        }
        if (this.basePricePerKg == null) {
            this.basePricePerKg = new BigDecimal("15000.00");
        }
        if (this.tierPricingJson == null || this.tierPricingJson.isBlank()) {
            this.tierPricingJson = "[]";
        }
        if (this.status == null || this.status.isBlank()) {
            this.status = "OPEN";
        }
    }

    @PostLoad
    public void postLoadSync() {
        if (this.categorySlug == null && this.category != null) {
            this.categorySlug = this.category;
        }
        if (this.totalQuantity == null && this.totalWeightKg != null) {
            this.totalQuantity = this.totalWeightKg.doubleValue();
        }
        if (this.remainingQuantity == null && this.availableWeightKg != null) {
            this.remainingQuantity = this.availableWeightKg.doubleValue();
        }
        if (this.minTemp == null && this.reqTempMin != null) {
            this.minTemp = this.reqTempMin.doubleValue();
        }
        if (this.maxTemp == null && this.reqTempMax != null) {
            this.maxTemp = this.reqTempMax.doubleValue();
        }
        if (this.hubLocation == null && this.warehouseLocation != null) {
            this.hubLocation = this.warehouseLocation;
        }
        if (this.unit == null) {
            this.unit = "kg";
        }
    }
}
