package com.btl.webbanrau.model;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "qc_inspections")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class QcInspection extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "contract_id", nullable = false, unique = true)
    private B2bContract contract;

    @Column(nullable = false)
    private Double grossWeight; // Khối lượng thực nhận tại bàn cân (kg)

    @Column(nullable = false)
    private Double netQualifiedWeight; // Khối lượng đạt chuẩn lưu kho lạnh (kg)

    @Column(nullable = false)
    private Double rejectedWeight; // Khối lượng phế phẩm loại bỏ trả lại vườn (kg)

    @Column(nullable = false)
    private Double qualifiedPercent; // Tỷ lệ đạt chuẩn (%)

    @Column(nullable = false)
    private Double brixScore; // Độ ngọt Brix (°Bx)

    @Column(nullable = false)
    private Double moisturePercent; // Độ ẩm (%)

    @Column(length = 100)
    private String inspectorName; // Chuyên viên kiểm định QC (VD: KS. Trần Hữu Phúc)

    @Column(length = 500)
    private String qcNotes; // Ghi chú cảm quan (Màu sắc tươi, không dập cuống, đạt VietGAP)

    @Column(length = 500)
    private String samplePhotoUrl; // Ảnh chụp mẫu đo

    @Column(nullable = false)
    private LocalDateTime inspectedAt;
}
