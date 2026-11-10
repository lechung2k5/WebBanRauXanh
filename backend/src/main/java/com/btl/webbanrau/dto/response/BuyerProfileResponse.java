package com.btl.webbanrau.dto.response;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BuyerProfileResponse {
    private Long userId;
    private String username;
    private String email;
    private String fullName;
    private String phone;
    private String address;
    private String companyName;
    private String taxCode;
    private String contactName;
    private String contactPhone;
    private String warehouseAddress;
    private String kycStatus;
    private boolean emailVerified;
}
