package com.btl.webbanrau.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.Setter;

@Getter @Setter
public class BuyerProfileRequest {
    @NotBlank private String companyName;
    private String taxCode;
    private String contactName;
    private String contactPhone;
}
