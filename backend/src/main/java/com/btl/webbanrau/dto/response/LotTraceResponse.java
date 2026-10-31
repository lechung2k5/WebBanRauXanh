package com.btl.webbanrau.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LotTraceResponse {
    private String lotCode;
    private String productName;
    private String farmName;
    private String farmerType;
    private String pucCode;
    private String farmAddress;
    private String certifications;
    private LocalDate harvestDate;
    private LocalDate expiryDate;
    private Double brixScore;
    private Double moisturePercent;
    private String inspectionNotes;
    private String inspectorName;
    private String status;
    private String imageUrl;
}
