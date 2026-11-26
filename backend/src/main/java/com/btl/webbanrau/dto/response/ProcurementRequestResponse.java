package com.btl.webbanrau.dto.response;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
public class ProcurementRequestResponse {
    private Long id;
    private String requestCode;
    private Long buyerId;
    private String buyerName;
    private String buyerCompany;
    private String category;
    private String title;
    private String volumeNeeded;
    private String targetPriceRange;
    private String destination;
    private String status;
    private long quoteCount;
    private boolean quotedByCurrentUser;
    private LocalDateTime createdAt;
}
