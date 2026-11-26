package com.btl.webbanrau.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class CreateProcurementRequestDto {
    @NotBlank(message = "Tiêu đề tin thu mua không được để trống")
    @Size(max = 255, message = "Tiêu đề tối đa 255 ký tự")
    private String title;

    @NotBlank(message = "Ngành hàng nông sản không được để trống")
    @Size(max = 80, message = "Ngành hàng tối đa 80 ký tự")
    private String category;

    @NotBlank(message = "Sản lượng cần thu mua không được để trống")
    @Size(max = 100, message = "Sản lượng tối đa 100 ký tự")
    private String volumeNeeded;

    @NotBlank(message = "Giá sỉ kỳ vọng không được để trống")
    @Size(max = 120, message = "Giá kỳ vọng tối đa 120 ký tự")
    private String targetPriceRange;

    @NotBlank(message = "Địa điểm giao hàng không được để trống")
    @Size(max = 255, message = "Địa điểm giao tối đa 255 ký tự")
    private String destination;
}
