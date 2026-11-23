package com.btl.webbanrau.dto.response;

import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;

@Data
@Builder
public class EligibleOutboundContractDto {
    private Long contractId;
    private String contractCode;
    private Long buyerId;
    private String buyerName;
    private String buyerPhone;
    private String deliveryAddress;
    private Long buyerWarehouseId;
    private String productName;
    private BigDecimal qualifiedWeightKg;
    private BigDecimal volumeM3;
    private Integer packageCount;
    private String hubName;
    private String coldZone;
    private String rackBin;
    private LocalDate hubDeliveryDate;
    private String qcStatus;
}
