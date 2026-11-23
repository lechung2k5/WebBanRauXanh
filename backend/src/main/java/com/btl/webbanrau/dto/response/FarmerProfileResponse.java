package com.btl.webbanrau.dto.response;

import lombok.*;

import java.time.LocalDate;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class FarmerProfileResponse {
    private Long id;
    private String farmName;
    private String farmerType;
    private String pucCode;
    private String certifications;
    private LocalDate certExpiryDate;
    private String certImageUrl;
    private String taxCode;
    private String idCardNumber;
    private String bankAccount;
    private String bankAccountName;
    private String bankName;
    private String location;
    private String cultivatedArea;
    private String username;
    private String fullName;
    private String phone;
    private String email;
}
