package com.btl.webbanrau.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.*;

import java.time.LocalDate;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class FarmerProfileRequest {

    @NotBlank(message = "Tên nông trại/HTX không được để trống")
    private String farmName;

    private String farmerType; // HOUSEHOLD | COOPERATIVE

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
}
