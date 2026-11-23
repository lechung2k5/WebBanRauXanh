package com.btl.webbanrau.controller;

import com.btl.webbanrau.dto.request.OrderRequest;
import com.btl.webbanrau.dto.response.ApiResponse;
import com.btl.webbanrau.dto.response.OrderResponse;
import com.btl.webbanrau.dto.response.PageResponse;
import com.btl.webbanrau.model.OrderStatus;
import com.btl.webbanrau.service.OrderService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/orders")
@RequiredArgsConstructor
@Tag(name = "Order Controller", description = "Quản lý và đặt hàng rau củ quả")
public class OrderController {

    private final OrderService orderService;

    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Lấy tất cả đơn hàng (Chỉ ADMIN)")
    public ResponseEntity<ApiResponse<PageResponse<OrderResponse>>> getAllOrders(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        return ResponseEntity.ok(ApiResponse.success(orderService.getAllOrders(page, size)));
    }

    @GetMapping("/user/{userId}")
    @Operation(summary = "Lấy danh sách đơn hàng của một người dùng")
    public ResponseEntity<ApiResponse<PageResponse<OrderResponse>>> getOrdersByUser(
            @PathVariable Long userId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        return ResponseEntity.ok(ApiResponse.success(orderService.getOrdersByUser(userId, page, size)));
    }

    @GetMapping("/code/{orderCode}")
    @Operation(summary = "Tra cứu đơn hàng bằng Mã Đơn Hàng (Công khai)")
    public ResponseEntity<ApiResponse<OrderResponse>> getOrderByCode(@PathVariable String orderCode) {
        try {
            OrderResponse response = orderService.getOrderByCode(orderCode);
            return ResponseEntity.ok(ApiResponse.success(response));
        } catch (Exception ex) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(ApiResponse.error(404, ex.getMessage()));
        }
    }

    @PostMapping
    @Operation(summary = "Tạo đơn hàng mới (Checkout) - Tự động trừ tồn kho")
    public ResponseEntity<ApiResponse<OrderResponse>> createOrder(@Valid @RequestBody OrderRequest request) {
        try {
            OrderResponse response = orderService.createOrder(request);
            return ResponseEntity.status(HttpStatus.CREATED)
                    .body(ApiResponse.success("Đặt hàng thành công!", response));
        } catch (Exception ex) {
            return ResponseEntity.badRequest().body(ApiResponse.error(400, ex.getMessage()));
        }
    }

    @PatchMapping("/{id}/status")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Cập nhật trạng thái đơn hàng (Chỉ ADMIN)")
    public ResponseEntity<ApiResponse<OrderResponse>> updateOrderStatus(
            @PathVariable Long id,
            @RequestParam OrderStatus status) {
        OrderResponse response = orderService.updateOrderStatus(id, status);
        return ResponseEntity.ok(ApiResponse.success("Cập nhật trạng thái thành công!", response));
    }
}
