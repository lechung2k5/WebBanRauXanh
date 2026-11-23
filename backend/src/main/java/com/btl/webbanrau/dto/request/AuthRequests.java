package com.btl.webbanrau.dto.request;

import jakarta.validation.constraints.*;

public final class AuthRequests {
    private AuthRequests() {}
    public record Verify(@NotBlank @jakarta.validation.constraints.Email String email, @Pattern(regexp="[0-9]{6}") @NotBlank String otp, String type) {}
    public record Email(@NotBlank @jakarta.validation.constraints.Email String email) {}
    public record Resend(@NotBlank @jakarta.validation.constraints.Email String email, @NotBlank String type) {}
    public record Refresh(@NotBlank String refreshToken) {}
    public record Google(@NotBlank String idToken, String roleIfNewUser) {}
    public record Reset(@NotBlank @jakarta.validation.constraints.Email String email,
                        @NotBlank @Pattern(regexp="[0-9]{6}") String otp,
                        @NotBlank @Size(min=10, max=72) String password) {}
    public record Provision(@NotBlank @Size(min=3,max=50) String username,
                            @NotBlank @jakarta.validation.constraints.Email String email,
                            @NotBlank @Size(max=100) String fullName, @NotBlank String role) {}
    public record Kyc(@NotBlank String status, @Size(max=255) String note) {}
    public record RoleChange(@NotBlank String role) {}
    public record Profile(@NotBlank @Size(max=150) String companyName, @Size(max=50) String taxCode,
                          boolean isHouseholdFarmer, @Size(max=50) String bankAccountNo,
                          @Size(max=50) String bankName, @Size(max=255) String warehouseAddress,
                          @Size(max=50) String pucCode, @Size(max=100) String certification,
                          @Size(max=500) @Pattern(regexp="^$|https://[^\\s]+") String certificationUrl,
                          @NotBlank @Size(max=20) String phone, @NotBlank @Size(max=255) String address) {}
}
