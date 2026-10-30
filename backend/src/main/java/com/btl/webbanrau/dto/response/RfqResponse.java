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
public class RfqResponse {
    private Long id;
    private String rfqCode;
    private Long harvestLotId;
    private String harvestLotCode;
    private String productName;
    private String buyerName;
    private String buyerPhone;
    private String buyerCompany;
    private Double requestedQuantity;
    private BigDecimal targetPrice;
    private BigDecimal counterPrice;
    private Double counterQuantity;
    private String rejectReason;
    private LocalDate deliveryDate;
    private String hubLocation;
    private String status;
    private LocalDateTime createdAt;
}
