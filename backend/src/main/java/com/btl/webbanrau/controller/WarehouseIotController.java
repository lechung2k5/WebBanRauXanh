package com.btl.webbanrau.controller;

import com.btl.webbanrau.dto.request.WarehouseIotTelemetryRequest;
import com.btl.webbanrau.dto.response.ApiResponse;
import com.btl.webbanrau.service.AuthException;
import com.btl.webbanrau.service.WarehouseIotService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequiredArgsConstructor
@Tag(name = "Warehouse IoT Telemetry", description = "Giám sát nhiệt độ & độ ẩm kho lạnh từ Wokwi ESP32 và giả lập")
public class WarehouseIotController {

    private final WarehouseIotService warehouseIotService;

    @Value("${app.iot.ingest-key:hona-iot-dev-key-2026}")
    private String iotIngestKey;

    @PostMapping("/iot/warehouse-telemetry")
    @Operation(summary = "Nhận dữ liệu nhiệt độ & độ ẩm từ thiết bị Wokwi ESP32")
    public ApiResponse<Map<String, Object>> ingestFromWokwi(
            @RequestHeader(value = "X-IOT-KEY", required = false) String apiKey,
            @Valid @RequestBody WarehouseIotTelemetryRequest request) {
        if (apiKey == null || !apiKey.trim().equals(iotIngestKey)) {
            throw new AuthException(401, "INVALID_IOT_KEY", "Khóa xác thực thiết bị IoT (X-IOT-KEY) không hợp lệ.");
        }
        if (request.getSource() == null || request.getSource().isBlank()) {
            request.setSource("WOKWI");
        }
        return ApiResponse.success("Đã ghi nhận dữ liệu cảm biến kho", warehouseIotService.recordTelemetry(request));
    }

    @PostMapping("/admin/warehouses/{hubId}/iot/simulate")
    @PreAuthorize("hasAnyRole('ADMIN', 'WAREHOUSE_MANAGER', 'WAREHOUSE_QC')")
    @Operation(summary = "Giả lập dữ liệu nhiệt độ & độ ẩm trực tiếp từ giao diện kho hàng")
    public ApiResponse<Map<String, Object>> simulateWarehouseSensor(
            @PathVariable Long hubId,
            @Valid @RequestBody WarehouseIotTelemetryRequest request) {
        request.setHubId(hubId);
        request.setSource("SIMULATOR");
        if (request.getDeviceId() == null || request.getDeviceId().isBlank()) {
            request.setDeviceId("WEB-SIMULATOR");
        }
        return ApiResponse.success("Đã phát tín hiệu giả lập cảm biến kho", warehouseIotService.recordTelemetry(request));
    }

    @GetMapping("/admin/warehouses/{hubId}/iot/latest")
    @PreAuthorize("hasAnyRole('ADMIN', 'WAREHOUSE_MANAGER', 'WAREHOUSE_QC')")
    @Operation(summary = "Lấy nhiệt độ & độ ẩm mới nhất của từng khu vực lạnh trong kho")
    public ApiResponse<Object> getLatestByHub(@PathVariable Long hubId) {
        return ApiResponse.success(warehouseIotService.getLatestByHub(hubId));
    }

    @GetMapping("/admin/warehouses/{hubId}/iot/history")
    @PreAuthorize("hasAnyRole('ADMIN', 'WAREHOUSE_MANAGER', 'WAREHOUSE_QC')")
    @Operation(summary = "Lấy lịch sử nhiệt độ & độ ẩm của kho")
    public ApiResponse<Object> getHistoryByHub(
            @PathVariable Long hubId,
            @RequestParam(required = false) String zoneCode,
            @RequestParam(defaultValue = "30") int limit) {
        return ApiResponse.success(warehouseIotService.getHistoryByHub(hubId, zoneCode, limit));
    }
}
