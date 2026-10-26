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

    @Column(name = "farmer_id")
    private Long farmerId;

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
    private BigDecimal basePricePerKg;

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
    private String status = "OPEN"; // OPEN, PENDING_APPROVAL, REJECTED, SUSPENDED, SOLD_OUT

    @Column(name = "image_url", columnDefinition = "TEXT")
    private String imageUrl;

    @Column(name = "rejection_reason", columnDefinition = "TEXT")
    private String rejectionReason; // Ghi chú khi từ chối duyệt hoặc tạm khóa dư lượng thuốc BVTV

    @Column(name = "audit_note", columnDefinition = "TEXT")
    private String auditNote; // Ghi chú thẩm định của Quản Trị Viên

    @Column(name = "review_note", columnDefinition = "TEXT")
    private String reviewNote;

    @Column(name = "warehouse_location", length = 100)
    private String warehouseLocation; // VD: Trạm Trung Chuyển Đức Trọng - Buồng Lạnh A1

    @Column(length = 100)
    private String region; // Tây Nguyên & Lâm Đồng, Bắc Bộ, ĐBSCL,...
}
