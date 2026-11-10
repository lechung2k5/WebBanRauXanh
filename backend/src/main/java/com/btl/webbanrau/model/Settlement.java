package com.btl.webbanrau.model;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "settlements")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Settlement extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 50)
    private String settlementCode; // Mã quyết toán (VD: STL-2026-0089)

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "contract_id", nullable = false, unique = true)
    private B2bContract contract;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "farmer_id", nullable = false)
    private User farmer;

    @Column(nullable = false)
    private Double qualifiedWeight; // Khối lượng đạt chuẩn từ QC (kg)

    @Column(nullable = false, precision = 15, scale = 2)
    private BigDecimal unitPrice; // Đơn giá chốt (VNĐ/kg)

    @Column(nullable = false, precision = 15, scale = 2)
    private BigDecimal grossAmount; // Tổng tiền hàng = qualifiedWeight * unitPrice

    @Column(nullable = false)
    @Builder.Default
    private Double platformFeePercent = 3.0; // Phí sàn trung gian 3%

    @Column(nullable = false, precision = 15, scale = 2)
    private BigDecimal platformFee; // Phí dịch vụ sàn = grossAmount * 0.03

    @Column(nullable = false, precision = 15, scale = 2)
    private BigDecimal payoutAmount; // Số tiền thực tế Sàn giải ngân về STK Nông dân = grossAmount - platformFee

    @Column(length = 50)
    private String bankAccount;

    @Column(length = 100)
    private String bankName;

    @Column(length = 100)
    private String bankAccountName;

    @Column(length = 100)
    private String bankReference; // Mã giao dịch ngân hàng chuyển khoản (VD: FT2610269871)

    @Column(nullable = false)
    @Builder.Default
    private boolean isPaid = false;

    @Column
    private LocalDateTime paidAt;

    @Column(nullable = false, length = 50)
    @Builder.Default
    private String taxFormType = "FORM_01_TNDN"; // FORM_01_TNDN (Bảng kê 01) | HOA_DON_KCT (Hóa đơn không chịu thuế)
}
