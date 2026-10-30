package com.btl.webbanrau.model;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;

@Entity
@Table(name = "rfq_negotiations")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RfqNegotiation extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 50)
    private String rfqCode; // Mã RFQ (VD: RFQ-2026-0089)

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "harvest_lot_id", nullable = false)
    private HarvestLot harvestLot;

    @Column(nullable = false, length = 150)
    private String buyerName; // Tên thương lái / Doanh nghiệp thu mua

    @Column(length = 20)
    private String buyerPhone;

    @Column(length = 200)
    private String buyerCompany; // Tên công ty/chuỗi siêu thị thu mua

    @Column(nullable = false)
    private Double requestedQuantity; // Khối lượng cần mua (kg)

    @Column(nullable = false, precision = 15, scale = 2)
    private BigDecimal targetPrice; // Đơn giá thương lái mong muốn (VNĐ/kg)

    @Column(precision = 15, scale = 2)
    private BigDecimal counterPrice; // Đơn giá nông dân đề xuất thương lượng lại (VNĐ/kg)

    @Column
    private Double counterQuantity; // Khối lượng nông dân điều chỉnh lại

    @Column(length = 500)
    private String rejectReason; // Lý do từ chối nếu không chốt được

    @Column(nullable = false)
    private LocalDate deliveryDate; // Ngày hẹn nhận hàng tại trạm

    @Column(length = 200)
    private String hubLocation; // Trạm trung chuyển tiếp nhận

    @Column(nullable = false, length = 30)
    @Builder.Default
    private String status = "PENDING"; // PENDING (Chờ phản hồi), ACCEPTED (Đồng ý), COUNTER_OFFER (Thương lượng lại), REJECTED (Từ chối)
}
