package com.btl.webbanrau.dto.request;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import lombok.*;

import java.math.BigDecimal;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class VerifyHarvestRequest {
    @NotNull(message = "Khối lượng thu hoạch thực tế không được để trống")
    @DecimalMin(value = "1.0", message = "Khối lượng thu hoạch tối thiểu 1 kg")
    private BigDecimal actualHarvestWeightKg;

    private String harvestProofImageUrl;
    private Integer packageCount;
    private String packageType;
    private String qrCodeData;
    private String farmPickupAddress;
    private String notes;
    private BigDecimal grade1Ratio;
}
