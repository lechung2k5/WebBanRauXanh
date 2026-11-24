package com.btl.webbanrau.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class DriverIssueReportRequest {
    @NotBlank(message = "Lý do sự cố không được để trống")
    private String issueReason;

    private String issueNotes;
}
