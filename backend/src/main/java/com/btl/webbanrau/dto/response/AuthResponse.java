package com.btl.webbanrau.dto.response;

import lombok.*;

import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AuthResponse {

    private Long id;
    private String username;
    private String fullName;
    private String email;
    private String phone;
    private String address;
    private List<String> roles;
    private boolean enabled;
    private boolean emailVerified;
    private String companyName;
    private String taxCode;
    private String warehouseAddress;
    private String bankAccountNo;
    private String bankName;
    private boolean householdFarmer;
    private boolean individualBuyer;
    private String pucCode;
    private String certification;
    private String certificationUrl;
    private String kycStatus;
    private String kycNote;
    private boolean profileComplete;
    private String accessToken;
    private String refreshToken;
    private long expiresInSeconds;
    private long refreshExpiresInSeconds;
}
