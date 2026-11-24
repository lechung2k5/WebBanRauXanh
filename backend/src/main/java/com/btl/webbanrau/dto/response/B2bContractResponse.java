package com.btl.webbanrau.dto.response;

import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class B2bContractResponse {
    private Long id;
    private String contractCode;
    private Long rfqId;
    private String rfqCode;
    private Long harvestLotId;
    private String lotCode;
    private String productName;
    private String imageUrl;
    private String buyerName;
    private String buyerPhone;
    private Double quantity;
    private BigDecimal unitPrice;
    private BigDecimal totalAmount;
    private BigDecimal depositAmount;
    private BigDecimal remainingAmount;
    private String depositStatus;
    private String fulfillmentStatus;
    private LocalDateTime depositPaidAt;
    private LocalDate hubDeliveryDate;
    private String hubName;
    private String deliveryTimeSlot;
    private String truckType;
    private String deliveryNotes;
    private LocalDateTime createdAt;
    private boolean hasQc;

    // Thông tin bổ trợ nhà vườn & vùng trồng
    private String pucCode;
    private String farmName;
    private String farmerPhone;
    private String farmerAddress;
    private Long settlementId;

    // Tiến trình sau cọc (Thu hoạch -> Lấy hàng vườn -> Kho HoNa QC -> Xuất kho -> ePOD -> Quyết toán)
    private BigDecimal actualHarvestWeightKg;
    private String harvestProofImageUrl;
    private Integer packageCount;
    private String packageType;
    private String qrCodeData;
    private LocalDateTime harvestedAt;
    private Boolean packagingApproved;
    private LocalDateTime packagingApprovedAt;

    private String farmPickupAddress;
    private String pickupTruckPlate;
    private String pickupDriverName;
    private String pickupDriverPhone;
    private BigDecimal farmHandoverTemp;
    private LocalDateTime farmPickupSignedAt;

    private String hubWarehouseZone;
    private String hubRackBin;
    private Integer maxStorageDays;
    private LocalDateTime hubInboundAt;
    private String qcStatus;
    private LocalDateTime qcPassedAt;
    private String qcCertUrl;

    private String outboundTruckPlate;
    private String outboundDriverName;
    private LocalDateTime outboundDispatchedAt;
    private String remainingPaymentStatus;
    private LocalDateTime remainingPaidAt;

    private BigDecimal epodDeliveredWeightKg;
    private BigDecimal epodDamagedWeightKg;
    private String epodSignatureUrl;
    private LocalDateTime epodDeliveredAt;
    private BigDecimal farmerPayoutAmount;
    private LocalDateTime settledAt;
}
