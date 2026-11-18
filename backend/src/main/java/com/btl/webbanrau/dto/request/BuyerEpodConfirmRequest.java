package com.btl.webbanrau.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BuyerEpodConfirmRequest {

    @NotBlank(message = "Họ tên người nhận hàng không được để trống")
    private String buyerSignerName;

    @NotBlank(message = "Số điện thoại người nhận hàng không được để trống")
    private String buyerSignerPhone;

    @NotBlank(message = "Chữ ký xác nhận của Buyer không được để trống")
    private String buyerSignatureData;

    private String buyerNotes;
}
