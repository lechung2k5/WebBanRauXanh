package com.btl.webbanrau.controller;

import com.btl.webbanrau.dto.request.SepayWebhookRequest;
import com.btl.webbanrau.service.SepayService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/sepay")
@RequiredArgsConstructor
@Tag(name = "SePay Payment Controller", description = "Cổng thanh toán tự động VietQR SePay")
public class SepayController {

    private final SepayService sepayService;

    @Value("${sepay.account-number:0987654321}")
    private String accountNumber;

    @Value("${sepay.bank-code:MB}")
    private String bankCode;

    @Operation(summary = "Tiếp nhận Webhook biến động số dư từ SePay")
    @PostMapping("/webhook")
    public ResponseEntity<Map<String, Object>> handleWebhook(
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            @RequestBody(required = false) SepayWebhookRequest payload) {
        Map<String, Object> result = sepayService.processWebhook(authHeader, payload);
        return ResponseEntity.ok(result);
    }

    @Operation(summary = "Tra cứu trạng thái thanh toán đơn hàng B2C")
    @GetMapping("/check-order/{orderCode}")
    public ResponseEntity<Map<String, Object>> checkOrderStatus(@PathVariable String orderCode) {
        return ResponseEntity.ok(sepayService.checkOrderStatus(orderCode));
    }

    @Operation(summary = "Tra cứu trạng thái cọc hợp đồng B2B")
    @GetMapping("/check-contract/{contractCode}")
    public ResponseEntity<Map<String, Object>> checkContractStatus(@PathVariable String contractCode) {
        return ResponseEntity.ok(sepayService.checkContractStatus(contractCode));
    }

    @Operation(summary = "Lấy thông tin tài khoản thụ hưởng VietQR mặc định")
    @GetMapping("/qr-config")
    public ResponseEntity<Map<String, String>> getQrConfig() {
        return ResponseEntity.ok(Map.of(
                "bankCode", bankCode != null && !bankCode.isBlank() ? bankCode : "MB",
                "bankName", "MB Bank (Ngân Hàng Quân Đội)",
                "accountNumber", accountNumber != null && !accountNumber.isBlank() ? accountNumber : "0987654321",
                "accountName", "HO NA FRESH"
        ));
    }
}

