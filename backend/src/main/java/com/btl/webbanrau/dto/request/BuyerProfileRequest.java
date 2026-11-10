package com.btl.webbanrau.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

@Getter @Setter
public class BuyerProfileRequest {
    @NotBlank private String companyName;
    @NotBlank @Size(max = 100) private String fullName;
    private String taxCode;
    private String contactName;
    @Size(max = 20) private String phone;
    @Size(max = 255) private String address;
    @Size(max = 255) private String warehouseAddress;
    private String contactPhone;
}
