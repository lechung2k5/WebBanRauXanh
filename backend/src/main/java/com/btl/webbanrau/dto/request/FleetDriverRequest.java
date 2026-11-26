package com.btl.webbanrau.dto.request;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class FleetDriverRequest {
    @NotNull(message = "Mã kho không được để trống")
    private Long warehouseId;

    @NotBlank(message = "Mã tài xế không được để trống")
    private String driverCode;

    @NotBlank(message = "Họ tên tài xế không được để trống")
    private String fullName;

    @NotBlank(message = "Số điện thoại không được để trống")
    private String phone;

    @NotBlank(message = "Số GPLX không được để trống")
    private String licenseNumber;

    @NotBlank(message = "Hạng bằng lái không được để trống")
    private String licenseClass; // B, C1, C, CE hoặc B2, C, FC

    private String status = "AVAILABLE";
    private Integer experienceYears = 1;

    private String username;

    @Email(message = "Email không hợp lệ")
    private String email;

    private String password;
}
