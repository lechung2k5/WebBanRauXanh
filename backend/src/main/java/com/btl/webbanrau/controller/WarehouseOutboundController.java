package com.btl.webbanrau.controller;

import com.btl.webbanrau.dto.response.ApiResponse;
import com.btl.webbanrau.service.AuthService;
import com.btl.webbanrau.service.WarehouseOutboundExecutionService;
import com.fasterxml.jackson.databind.JsonNode;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;

@RestController
@RequestMapping("/warehouse/outbound")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('WAREHOUSE_QC', 'WAREHOUSE_MANAGER', 'ADMIN')")
public class WarehouseOutboundController {

    private final WarehouseOutboundExecutionService warehouseOutboundExecutionService;

    @GetMapping("/tasks")
    public Object getOutboundTasks(@RequestParam(required = false) Long warehouseId) {
        return ApiResponse.success(warehouseOutboundExecutionService.getOutboundTasks(warehouseId));
    }

    @PostMapping("/contracts/{contractId}/start-picking")
    public Object startPicking(@PathVariable Long contractId) {
        var staff = AuthService.current();
        return ApiResponse.success(
                "Đã nhận lệnh đi lấy hàng tại kệ",
                warehouseOutboundExecutionService.startPicking(contractId, staff)
        );
    }

    @PostMapping("/contracts/{contractId}/confirm-picked")
    public Object confirmPicked(@PathVariable Long contractId, @RequestBody JsonNode body) {
        var staff = AuthService.current();
        Integer pickedPackages = body.has("pickedPackages") ? body.get("pickedPackages").asInt() : 0;
        BigDecimal actualWeightKg = body.has("actualWeightKg")
                ? new BigDecimal(body.get("actualWeightKg").asText("0"))
                : BigDecimal.ZERO;
        BigDecimal outboundTemp = body.has("outboundTemp")
                ? new BigDecimal(body.get("outboundTemp").asText("3.2"))
                : new BigDecimal("3.2");
        String notes = body.path("notes").asText("");
        return ApiResponse.success(
                "Đã xác nhận lấy đủ thùng hàng & kiểm tra xuất kho",
                warehouseOutboundExecutionService.confirmPicked(
                        contractId, pickedPackages, actualWeightKg, outboundTemp, notes, staff
                )
        );
    }

    @PostMapping("/contracts/{contractId}/complete-handover")
    public Object completeHandover(@PathVariable Long contractId, @RequestBody JsonNode body) {
        var staff = AuthService.current();
        String handoverType = body.path("handoverType").asText("PA2_TRUCK");
        String receiverName = body.path("receiverName").asText("");
        String receiverPhone = body.path("receiverPhone").asText("");
        String truckPlate = body.path("truckPlate").asText("");
        String signatureData = body.path("signatureData").asText("");
        String notes = body.path("notes").asText("");
        return ApiResponse.success(
                "Hoàn tất bàn giao xuất kho",
                warehouseOutboundExecutionService.completeHandover(
                        contractId, handoverType, receiverName, receiverPhone, truckPlate, signatureData, notes, staff
                )
        );
    }
}
