package com.btl.webbanrau.model;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;

@Entity
@Table(name = "farmer_profiles")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class FarmerProfile extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false, unique = true)
    private User user;

    @Column(nullable = false, length = 200)
    private String farmName;

    @Column(nullable = false, length = 50)
    @Builder.Default
    private String farmerType = "COOPERATIVE"; // HOUSEHOLD (Hộ cá thể) | COOPERATIVE (Hợp tác xã)

    @Column(length = 100)
    private String pucCode; // Mã số vùng trồng (VD: VN-LDO-PUC-0849)

    @Column(length = 255)
    private String certifications; // VietGAP, GlobalGAP, Organic

    @Column
    private LocalDate certExpiryDate;

    @Column(length = 500)
    private String certImageUrl;

    @Column(length = 50)
    private String taxCode; // Mã số thuế (nếu là HTX xuất Hóa đơn KCT)

    @Column(length = 50)
    private String idCardNumber; // CCCD người đại diện (cho Bảng kê 01/TNDN)

    @Column(length = 50)
    private String bankAccount; // Số tài khoản thụ hưởng

    @Column(length = 100)
    private String bankAccountName; // Tên chủ tài khoản

    @Column(length = 100)
    private String bankName; // Tên ngân hàng (Agribank, Vietcombank,...)

    @Column(length = 255)
    private String location; // Vị trí nông trại (xã, huyện, tỉnh)

    @Column(length = 100)
    private String cultivatedArea; // Diện tích canh tác (VD: "45 Hecta")
}
