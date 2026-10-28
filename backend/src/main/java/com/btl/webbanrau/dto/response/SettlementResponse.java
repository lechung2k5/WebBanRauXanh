package com.btl.webbanrau.dto.response;

import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SettlementResponse {
    private Long id;
    private String settlementCode;
    private Long contractId;
    private String contractCode;
    private String productName;
    private Double qualifiedWeight;
    private BigDecimal unitPrice;
    private BigDecimal grossAmount;
    private Double platformFeePercent;
    private BigDecimal platformFee;
    private BigDecimal payoutAmount;
    private String bankAccount;
    private String bankName;
    private String bankAccountName;
    private String bankReference;
    private boolean isPaid;
    private LocalDateTime paidAt;
    private String taxFormType;
    private LocalDateTime createdAt;
}
