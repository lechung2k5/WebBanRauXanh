package com.btl.webbanrau.dto.request;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DriverOutboundEpodRequest {

    @NotNull(message = "Khối lượng thực giao (Q4) không được để trống")
    @DecimalMin(value = "0.01", message = "Khối lượng thực giao phải lớn hơn 0")
    private BigDecimal actualDeliveredWeightKg;

    @DecimalMin(value = "0.0", message = "Khối lượng từ chối/hư hao không được âm")
    private BigDecimal rejectedWeightKg;

    private String rejectionReason;

    @NotBlank(message = "Chữ ký tài xế không được để trống")
    private String driverSignatureData;

    private String driverNotes;

    private String handoverPhotoUrl;
}
