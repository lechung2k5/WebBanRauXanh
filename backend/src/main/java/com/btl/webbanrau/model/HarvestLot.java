package com.btl.webbanrau.model;

import jakarta.persistence.*;
import lombok.*;

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

    @Column(nullable = false, unique = true, length = 50)
    private String lotCode; // Mã lô (VD: LOT-2026-DL01)

    @Column(nullable = false, length = 200)
    private String productName;

    @Column(length = 100)
    private String categorySlug;

    @Column(length = 500)
    private String imageUrl;

    @Column(nullable = false, length = 100)
    private String pucCode; // Mã số vùng trồng kiểm định

    @Column(nullable = false)
    private LocalDate harvestDate; // Ngày dự kiến thu hoạch

    @Column(nullable = false)
    private LocalDate expiryDate; // Hạn dùng bảo quản lạnh tươi (FEFO)

    @Column(nullable = false)
    private Double totalQuantity; // Tổng sản lượng (kg)

    @Column(nullable = false)
    private Double remainingQuantity; // Sản lượng còn lại (kg)

    @Column(length = 20)
    @Builder.Default
    private String unit = "kg";

    @Column(nullable = false)
    @Builder.Default
    private Double minTemp = 2.0; // Nhiệt độ bảo quản tối thiểu (°C)

    @Column(nullable = false)
    @Builder.Default
    private Double maxTemp = 6.0; // Nhiệt độ bảo quản tối đa (°C)

    @Column(columnDefinition = "TEXT", nullable = false)
    private String tierPricingJson; // JSON lưu ma trận giá sỉ phân tầng: [{"minKg":500,"pricePerKg":15000},...]

    @Column(nullable = false, length = 30)
    @Builder.Default
    private String status = "OPEN"; // OPEN (Đang chào bán), NEGOTIATING (Đang đàm phán), SOLD_OUT (Đã chốt bán)

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "farmer_id", nullable = false)
    private User farmer;

    @Column(length = 200)
    private String hubLocation; // Trạm Cross-docking tiếp nhận dự kiến
}
