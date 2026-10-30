package com.btl.webbanrau.dto.request;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RegisterRequest {

    @NotBlank(message = "Tên đăng nhập không được để trống")
    @Size(min = 3, max = 50, message = "Tên đăng nhập từ 3 đến 50 ký tự")
    private String username;

    @NotBlank(message = "Mật khẩu không được để trống")
    @Size(min = 10, max = 72, message = "Mật khẩu từ 10 đến 72 ký tự")
    private String password;

    @NotBlank(message = "Họ và tên không được để trống")
    private String fullName;

    @NotBlank(message = "Email không được để trống")
    @Email(message = "Email không đúng định dạng")
    private String email;

    private String phone;
    private String address;

    @NotBlank
    @jakarta.validation.constraints.Pattern(regexp="FARMER|BUYER")
    private String registerRole;
    @Builder.Default
    @com.fasterxml.jackson.annotation.JsonProperty("isHouseholdFarmer")
    private boolean isHouseholdFarmer = true;
    @Builder.Default
    @com.fasterxml.jackson.annotation.JsonProperty("isIndividualBuyer")
    private boolean isIndividualBuyer = false;
    @Size(max=150) private String companyName;
    @Size(max=50) private String taxCode;
    @Size(max=50) private String bankAccountNo;
    @Size(max=50) private String bankName;
    @Size(max=255) private String warehouseAddress;
    @Size(max=50) private String pucCode;
    @Size(max=100) private String certification;
    @Size(max=500) @jakarta.validation.constraints.Pattern(regexp="^$|https://[^\\s]+") private String certificationUrl;
}
