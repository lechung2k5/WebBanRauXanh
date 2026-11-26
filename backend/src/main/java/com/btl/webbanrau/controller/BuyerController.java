package com.btl.webbanrau.controller;

import com.btl.webbanrau.dto.request.BuyerEpodRequest;
import com.btl.webbanrau.dto.request.BuyerProfileRequest;
import com.btl.webbanrau.dto.request.BuyerRfqActionRequest;
import com.btl.webbanrau.dto.request.BuyerRfqRequest;
import com.btl.webbanrau.dto.request.BuyerWarehouseRequest;
import com.btl.webbanrau.dto.request.B2bReviewRequest;
import com.btl.webbanrau.dto.request.BuyerClaimRequest;
import com.btl.webbanrau.dto.response.ApiResponse;
import com.btl.webbanrau.dto.response.BuyerProfileResponse;
import com.btl.webbanrau.dto.response.OrderResponse;
import com.btl.webbanrau.dto.response.PageResponse;
import com.btl.webbanrau.model.BuyerWarehouse;
import com.btl.webbanrau.service.BuyerWorkflowService;
import com.btl.webbanrau.service.B2bReviewService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/buyer")
@RequiredArgsConstructor
@PreAuthorize("hasRole('BUYER')")
public class BuyerController {
    private final BuyerWorkflowService buyer;
    private final B2bReviewService reviews;

    @GetMapping("/profile")
    public ApiResponse<BuyerProfileResponse> getProfile() { return ApiResponse.success(buyer.profile()); }

    @PutMapping("/profile")
    public ApiResponse<BuyerProfileResponse> updateProfile(@Valid @RequestBody BuyerProfileRequest request) {
        return ApiResponse.success("Cập nhật hồ sơ Buyer thành công", buyer.updateProfile(request));
    }

    @GetMapping("/orders")
    public ApiResponse<PageResponse<OrderResponse>> orders(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ApiResponse.success(buyer.orders(Math.max(page, 0), Math.min(Math.max(size, 1), 50)));
    }

    @GetMapping("/addresses")
    public ApiResponse<List<BuyerWarehouse>> addresses() { return ApiResponse.success(buyer.addresses()); }

    @PostMapping("/addresses")
    public ApiResponse<BuyerWarehouse> addAddress(@Valid @RequestBody BuyerWarehouseRequest request) {
        return ApiResponse.success("Đã thêm địa chỉ nhận hàng", buyer.addAddress(request));
    }

    @PutMapping("/addresses/{id}")
    public ApiResponse<BuyerWarehouse> updateAddress(@PathVariable Long id, @Valid @RequestBody BuyerWarehouseRequest request) {
        return ApiResponse.success("Đã cập nhật địa chỉ nhận hàng", buyer.updateAddress(id, request));
    }

    @DeleteMapping("/addresses/{id}")
    public ApiResponse<Void> deleteAddress(@PathVariable Long id) {
        buyer.deleteAddress(id);
        return ApiResponse.success("Đã xóa địa chỉ nhận hàng", null);
    }

    @GetMapping("/rfq")
    public ApiResponse<List<Map<String, Object>>> getRfqs() { return ApiResponse.success(buyer.listRfqs()); }

    @GetMapping("/rfq/{id}/history")
    public ApiResponse<List<Map<String, Object>>> rfqHistory(@PathVariable Long id) {
        return ApiResponse.success(buyer.rfqHistory(id));
    }

    @PostMapping("/rfq")
    public ApiResponse<Map<String, Object>> createRfq(@Valid @RequestBody BuyerRfqRequest request) {
        return ApiResponse.success("Gửi RFQ thành công", buyer.createRfq(request));
    }

    @PutMapping("/rfq/{id}")
    public ApiResponse<Map<String, Object>> updateRfq(@PathVariable Long id, @Valid @RequestBody BuyerRfqRequest request) {
        return ApiResponse.success("Cập nhật đơn đàm phán thành công", buyer.updateRfq(id, request));
    }

    @DeleteMapping("/rfq/{id}")
    public ApiResponse<Map<String, Object>> cancelRfq(@PathVariable Long id) {
        return ApiResponse.success("Hủy đơn đàm phán thành công", buyer.cancelRfq(id));
    }

    @PatchMapping("/rfq/{id}/respond")
    public ApiResponse<Map<String, Object>> respondToRfq(@PathVariable Long id, @Valid @RequestBody BuyerRfqActionRequest request) {
        return ApiResponse.success("Đã cập nhật phiên đàm phán", buyer.respondToRfq(id, request));
    }

    @PatchMapping("/rfq/{id}/accept-counter")
    public ApiResponse<Map<String, Object>> acceptCounter(@PathVariable Long id) {
        BuyerRfqActionRequest request = new BuyerRfqActionRequest();
        request.setAction("ACCEPT");
        return ApiResponse.success("Đã chấp nhận giá phản hồi và tạo hợp đồng", buyer.respondToRfq(id, request));
    }

    @GetMapping("/contracts")
    public ApiResponse<List<Map<String, Object>>> contracts() { return ApiResponse.success(buyer.contracts()); }

    @GetMapping("/contracts/{id}/qr-deposit")
    public ApiResponse<Map<String, Object>> depositQr(@PathVariable Long id) { return ApiResponse.success(buyer.depositQr(id)); }

    @PostMapping("/contracts/{id}/deposit/confirm")
    public ApiResponse<Map<String, Object>> confirmDeposit(@PathVariable Long id) {
        return ApiResponse.success("Đã xác nhận cọc giả lập", buyer.confirmDeposit(id));
    }

    @GetMapping("/contracts/{id}/qc-report")
    public ApiResponse<List<Map<String, Object>>> qc(@PathVariable Long id) { return ApiResponse.success(buyer.qc(id)); }

    @GetMapping("/contracts/{id}/telemetry")
    public ApiResponse<List<Map<String, Object>>> telemetry(@PathVariable Long id) { return ApiResponse.success(buyer.telemetry(id)); }

    @PostMapping("/contracts/{id}/sign-epod")
    public ApiResponse<Map<String, Object>> signEpod(@PathVariable Long id, @Valid @RequestBody BuyerEpodRequest request) {
        return ApiResponse.success("Đã ký nhận ePOD", buyer.signEpod(id, request));
    }

    @PostMapping("/contracts/{id}/self-pickup-dispatch")
    public ApiResponse<Map<String, Object>> dispatchSelfPickup(@PathVariable Long id, @RequestBody Map<String, Object> body) {
        return ApiResponse.success("Đã đăng ký xe đến kho HoNa lấy hàng", buyer.dispatchSelfPickup(id, body));
    }

    @GetMapping("/contracts/{id}/qr-final-payment")
    public ApiResponse<Map<String, Object>> finalPaymentQr(@PathVariable Long id) { return ApiResponse.success(buyer.finalPaymentQr(id)); }

    @PostMapping("/contracts/{id}/final-payment/confirm")
    public ApiResponse<Map<String, Object>> confirmFinalPayment(@PathVariable Long id) {
        return ApiResponse.success("Đã xác nhận thanh toán phần còn lại và hoàn tất hợp đồng", buyer.confirmFinalPayment(id));
    }

    @GetMapping("/claims")
    public ApiResponse<List<Map<String, Object>>> claims() {
        return ApiResponse.success(buyer.claims());
    }

    @PostMapping("/claims")
    public ApiResponse<Map<String, Object>> createClaim(@Valid @RequestBody BuyerClaimRequest request) {
        return ApiResponse.success("Đã gửi khiếu nại và tạm khóa quyết toán hợp đồng", buyer.createClaim(request));
    }

    @GetMapping("/contracts/{id}/reviews")
    public ApiResponse<List<Map<String, Object>>> reviews(@PathVariable Long id) {
        return ApiResponse.success(reviews.list(id, "BUYER"));
    }

    @PostMapping("/contracts/{id}/reviews")
    public ApiResponse<Map<String, Object>> submitReview(@PathVariable Long id, @Valid @RequestBody B2bReviewRequest request) {
        return ApiResponse.success("Đã lưu đánh giá giao dịch", reviews.submit(id, request, "BUYER"));
    }

    @GetMapping(value = "/contracts/{id}/invoice", produces = MediaType.TEXT_HTML_VALUE)
    public String invoice(@PathVariable Long id) { return buyer.invoiceHtml(id); }
}
