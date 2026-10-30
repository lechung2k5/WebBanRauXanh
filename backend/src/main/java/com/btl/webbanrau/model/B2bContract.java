package com.btl.webbanrau.model;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "b2b_contracts")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class B2bContract extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 50)
    private String contractCode; // Mã hợp đồng điện tử (VD: HD-2026-0089)

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "rfq_id", nullable = false)
    private RfqNegotiation rfq;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "harvest_lot_id", nullable = false)
    private HarvestLot harvestLot;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "farmer_id", nullable = false)
    private User farmer;

    @Column(nullable = false, length = 150)
    private String buyerName;

    @Column(length = 20)
    private String buyerPhone;

    @Column(nullable = false)
    private Double quantity; // Khối lượng chốt (kg)

    @Column(nullable = false, precision = 15, scale = 2)
    private BigDecimal unitPrice; // Đơn giá chốt (VNĐ/kg)

    @Column(nullable = false, precision = 15, scale = 2)
    private BigDecimal totalAmount; // Tổng giá trị hợp đồng = quantity * unitPrice

    @Column(nullable = false, precision = 15, scale = 2)
    private BigDecimal depositAmount; // Cọc 30% bảo chứng Escrow = totalAmount * 0.3

    @Column(nullable = false, length = 30)
    @Builder.Default
    private String depositStatus = "PENDING_DEPOSIT"; // PENDING_DEPOSIT (Chờ cọc 30%), DEPOSIT_PAID (Đã cọc 30% Escrow)

    @Column(nullable = false, length = 30)
    @Builder.Default
    private String fulfillmentStatus = "WAITING_HARVEST"; // WAITING_HARVEST, HARVESTING, HUB_DELIVERED, IN_TRANSIT, COMPLETED

    @Column
    private LocalDateTime depositPaidAt; // Thời điểm sàn ghi nhận nhận cọc 30%

    @Column
    private LocalDate hubDeliveryDate; // Ngày hẹn giao tại Trạm

    @Column(length = 200)
    private String hubName; // Trạm Cross-docking tiếp nhận

    @Column(length = 50)
    private String deliveryTimeSlot; // Khung giờ giao trạm (VD: 06:00 - 09:00)

    @Column(length = 100)
    private String truckType; // Loại xe tải lạnh chuyên chở

    @Column(columnDefinition = "TEXT")
    private String deliveryNotes; // Ghi chú giao hàng trạm
}
