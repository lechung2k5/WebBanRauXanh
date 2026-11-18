package com.btl.webbanrau.model;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
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
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler", "contract"})
    private RfqNegotiation rfq;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "harvest_lot_id", nullable = false)
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler", "farmer"})
    private HarvestLot harvestLot;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "farmer_id")
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler", "password", "roles"})
    private User farmer;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "buyer_id")
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler", "password", "roles"})
    private User buyer;

    @Column(nullable = false, length = 150)
    private String buyerName;

    @Column(length = 20)
    private String buyerPhone;

    @Column(nullable = false)
    private Double quantity; // Khối lượng chốt (kg)

    @Column(precision = 12, scale = 2)
    private BigDecimal quantityKg;

    @Column(nullable = false, precision = 15, scale = 2)
    private BigDecimal unitPrice; // Đơn giá chốt (VNĐ/kg)

    @Column(precision = 12, scale = 2)
    private BigDecimal agreedPricePerKg;

    @Column(nullable = false, precision = 15, scale = 2)
    private BigDecimal totalAmount; // Tổng giá trị hợp đồng = quantity * unitPrice

    @Column(nullable = false, precision = 15, scale = 2)
    private BigDecimal depositAmount; // Cọc 30% bảo chứng Escrow = totalAmount * 0.3

    @Column(length = 30)
    private String status;

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

    @Column(length = 255)
    private String deliveryAddress;

    @Column(name = "lot_id")
    private Long accountingLotId;

    @Column(name = "offered_weight_kg")
    private BigDecimal offeredWeightKg;

    @Column(name = "offered_price_per_kg")
    private BigDecimal offeredPricePerKg;

    @Column(name = "total_goods_amount")
    private BigDecimal totalGoodsAmount;

    @Column(name = "deposit_30_amount")
    private BigDecimal deposit30Amount;

    // Logistics, Cold Storage, Inspection & Settlement Lifecycle Fields
    @Column(name = "actual_harvest_weight_kg", precision = 12, scale = 2)
    private BigDecimal actualHarvestWeightKg;

    @Column(name = "harvest_proof_image_url", columnDefinition = "TEXT")
    private String harvestProofImageUrl;

    @Column(name = "package_count")
    private Integer packageCount;

    @Column(name = "package_type", length = 100)
    private String packageType;

    @Column(name = "qr_code_data", length = 255)
    private String qrCodeData;

    @Column(name = "harvested_at")
    private LocalDateTime harvestedAt;

    @Column(name = "packaging_approved")
    private Boolean packagingApproved;

    @Column(name = "packaging_approved_at")
    private LocalDateTime packagingApprovedAt;

    @Column(name = "farm_pickup_address", columnDefinition = "TEXT")
    private String farmPickupAddress;

    @Column(name = "pickup_truck_plate", length = 50)
    private String pickupTruckPlate;

    @Column(name = "pickup_driver_name", length = 100)
    private String pickupDriverName;

    @Column(name = "pickup_driver_phone", length = 20)
    private String pickupDriverPhone;

    @Column(name = "farm_handover_temp", precision = 5, scale = 2)
    private BigDecimal farmHandoverTemp;

    @Column(name = "farm_pickup_signed_at")
    private LocalDateTime farmPickupSignedAt;

    @Column(name = "hub_warehouse_zone", length = 50)
    private String hubWarehouseZone;

    @Column(name = "hub_rack_bin", length = 50)
    private String hubRackBin;

    @Column(name = "max_storage_days")
    private Integer maxStorageDays;

    @Column(name = "hub_inbound_at")
    private LocalDateTime hubInboundAt;

    @Column(name = "qc_status", length = 30)
    @Builder.Default
    private String qcStatus = "PENDING_QC";

    @Column(name = "qc_passed_at")
    private LocalDateTime qcPassedAt;

    @Column(name = "qc_cert_url", columnDefinition = "TEXT")
    private String qcCertUrl;

    @Column(name = "outbound_truck_plate", length = 50)
    private String outboundTruckPlate;

    @Column(name = "outbound_driver_name", length = 100)
    private String outboundDriverName;

    @Column(name = "outbound_dispatched_at")
    private LocalDateTime outboundDispatchedAt;

    @Column(name = "remaining_amount", precision = 18, scale = 2)
    private BigDecimal remainingAmount;

    @Column(name = "remaining_payment_status", length = 30)
    @Builder.Default
    private String remainingPaymentStatus = "UNPAID";

    @Column(name = "remaining_paid_at")
    private LocalDateTime remainingPaidAt;

    @Column(name = "epod_delivered_weight_kg", precision = 12, scale = 2)
    private BigDecimal epodDeliveredWeightKg;

    @Column(name = "epod_damaged_weight_kg", precision = 12, scale = 2)
    private BigDecimal epodDamagedWeightKg;

    @Column(name = "epod_signature_url", columnDefinition = "TEXT")
    private String epodSignatureUrl;

    @Column(name = "epod_delivered_at")
    private LocalDateTime epodDeliveredAt;

    @Column(name = "farmer_payout_amount", precision = 18, scale = 2)
    private BigDecimal farmerPayoutAmount;

    @Column(name = "settled_at")
    private LocalDateTime settledAt;

    @Column(name = "grade1_ratio", precision = 5, scale = 2)
    @Builder.Default
    private BigDecimal grade1Ratio = new BigDecimal("95.0");

    @Column(name = "inbound_gross_weight_kg", precision = 12, scale = 2)
    private BigDecimal inboundGrossWeightKg;

    @Column(name = "inbound_tare_weight_kg", precision = 12, scale = 2)
    private BigDecimal inboundTareWeightKg;

    @Column(name = "inbound_net_weight_kg", precision = 12, scale = 2)
    private BigDecimal inboundNetWeightKg;

    @Column(name = "qc_brix", precision = 5, scale = 2)
    private BigDecimal qcBrix;

    @Column(name = "qc_nitrate_ppm", precision = 7, scale = 2)
    private BigDecimal qcNitratePpm;

    @Column(name = "qc_pesticide_safe")
    @Builder.Default
    private Boolean qcPesticideSafe = true;

    @Column(name = "outbound_manifest_code", length = 100)
    private String outboundManifestCode;

    @Column(name = "bank_transfer_ref", length = 100)
    private String bankTransferRef;

    @Column(name = "farmer_bank_name", length = 100)
    private String farmerBankName;

    @Column(name = "farmer_bank_account", length = 50)
    private String farmerBankAccount;

    @Column(name = "farmer_bank_owner", length = 100)
    private String farmerBankOwner;

    @PrePersist
    @PreUpdate
    private void synchronizeAccountingFields() {
        if (harvestLot != null) accountingLotId = harvestLot.getId();
        if (quantity != null) offeredWeightKg = BigDecimal.valueOf(quantity);
        if (unitPrice != null) offeredPricePerKg = unitPrice;
        if (totalAmount != null) totalGoodsAmount = totalAmount;
        if (depositAmount != null) deposit30Amount = depositAmount;
    }
}
