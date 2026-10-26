package com.btl.webbanrau.dto.request;

import jakarta.validation.constraints.*;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDate;

@Getter @Setter
public class BuyerRfqRequest {
    @NotNull private Long harvestLotId;
    @NotNull @DecimalMin("1.0") private BigDecimal quantityKg;
    @NotNull @DecimalMin("0.0") private BigDecimal proposedPricePerKg;
    @NotNull private LocalDate desiredDeliveryDate;
    @NotBlank private String deliveryLocation;
    private String shippingOption;
    private String notes;
}
