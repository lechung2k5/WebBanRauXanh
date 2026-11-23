package com.btl.webbanrau.dto.response;

import lombok.*;

import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class QcInspectionResponse {
    private Long id;
    private Long contractId;
    private String contractCode;
    private String productName;
    private Double grossWeight;
    private Double netQualifiedWeight;
    private Double rejectedWeight;
    private Double qualifiedPercent;
    private Double brixScore;
    private Double moisturePercent;
    private String inspectorName;
    private String qcNotes;
    private String samplePhotoUrl;
    private LocalDateTime inspectedAt;
}
