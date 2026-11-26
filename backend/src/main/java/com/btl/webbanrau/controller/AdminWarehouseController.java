package com.btl.webbanrau.controller;

import com.btl.webbanrau.dto.response.ApiResponse;
import com.btl.webbanrau.service.WarehouseStorageService;
import com.fasterxml.jackson.databind.JsonNode;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/admin/warehouses")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('ADMIN', 'WAREHOUSE_MANAGER')")
public class AdminWarehouseController {

    private final WarehouseStorageService warehouseStorageService;

    @GetMapping("/{hubId}/layout")
    @PreAuthorize("hasAnyRole('ADMIN', 'WAREHOUSE_MANAGER', 'WAREHOUSE_QC')")
    public Object getWarehouseLayout(@PathVariable Long hubId) {
        return ApiResponse.success(warehouseStorageService.getWarehouseLayout(hubId));
    }

    @PutMapping("/{hubId}")
    public Object updateHub(@PathVariable Long hubId, @RequestBody JsonNode payload) {
        return ApiResponse.success("Đã cập nhật thông tin & sức chứa kho", warehouseStorageService.updateHub(hubId, payload));
    }

    @PostMapping("/{hubId}/zones")
    public Object createZone(@PathVariable Long hubId, @RequestBody JsonNode payload) {
        return ApiResponse.success("Đã tạo khu vực buồng lạnh mới", warehouseStorageService.createZone(hubId, payload));
    }

    @PutMapping("/zones/{zoneId}")
    public Object updateZone(@PathVariable Long zoneId, @RequestBody JsonNode payload) {
        return ApiResponse.success("Đã cập nhật khu vực buồng lạnh", warehouseStorageService.updateZone(zoneId, payload));
    }

    @DeleteMapping("/zones/{zoneId}")
    public Object deleteZone(@PathVariable Long zoneId) {
        warehouseStorageService.deleteZone(zoneId);
        return ApiResponse.success("Đã xóa khu vực buồng lạnh", null);
    }

    @PostMapping("/zones/{zoneId}/bins")
    public Object createBins(@PathVariable Long zoneId, @RequestBody JsonNode payload) {
        return ApiResponse.success("Đã thêm kệ / ô chứa mới", warehouseStorageService.createBins(zoneId, payload));
    }

    @PutMapping("/bins/{binId}")
    public Object updateBin(@PathVariable Long binId, @RequestBody JsonNode payload) {
        return ApiResponse.success("Đã cập nhật thông tin ô kệ", warehouseStorageService.updateBin(binId, payload));
    }

    @DeleteMapping("/bins/{binId}")
    public Object deleteBin(@PathVariable Long binId) {
        warehouseStorageService.deleteBin(binId);
        return ApiResponse.success("Đã xóa ô kệ", null);
    }

    @PostMapping("/contracts/{contractId}/move-bin")
    public Object moveContractBin(@PathVariable Long contractId, @RequestBody JsonNode payload) {
        Long targetBinId = payload.path("targetBinId").asLong();
        return ApiResponse.success("Đã điều chuyển lô hàng sang ô kệ mới", warehouseStorageService.moveContractBin(contractId, targetBinId));
    }
}
