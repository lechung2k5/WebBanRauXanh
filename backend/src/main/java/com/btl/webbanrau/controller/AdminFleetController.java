package com.btl.webbanrau.controller;

import com.btl.webbanrau.dto.request.*;
import com.btl.webbanrau.dto.response.ApiResponse;
import com.btl.webbanrau.dto.response.DispatchOptimizationResultDto;
import com.btl.webbanrau.model.*;
import com.btl.webbanrau.service.AuthService;
import com.btl.webbanrau.service.FleetManagementService;
import com.btl.webbanrau.service.InboundDispatchOptimizationService;
import com.btl.webbanrau.service.InboundLogisticsExecutionService;
import org.springframework.jdbc.core.JdbcTemplate;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/admin/dispatch")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('ADMIN', 'WAREHOUSE_MANAGER')")
public class AdminFleetController {

    private final FleetManagementService fleetManagementService;
    private final InboundDispatchOptimizationService dispatchService;
    private final InboundLogisticsExecutionService inboundLogisticsExecutionService;
    private final JdbcTemplate jdbcTemplate;

    // --- HUBS ---
    @GetMapping("/hubs")
    public Object listHubs() {
        return ApiResponse.success(fleetManagementService.getAllHubs());
    }

    @GetMapping("/hubs/{id}")
    public Object getHub(@PathVariable Long id) {
        return ApiResponse.success(fleetManagementService.getHubById(id));
    }

    // --- VEHICLES ---
    @GetMapping("/vehicles")
    public Object listVehicles(@RequestParam Long warehouseId, @RequestParam(required = false) String status) {
        if ("AVAILABLE".equalsIgnoreCase(status)) {
            return ApiResponse.success(fleetManagementService.getAvailableVehiclesByHub(warehouseId));
        }
        return ApiResponse.success(fleetManagementService.getVehiclesByHub(warehouseId));
    }

    @PostMapping("/vehicles")
    public Object createVehicle(@Valid @RequestBody FleetVehicleRequest request) {
        return ApiResponse.success("Đã thêm phương tiện mới vào đội xe", fleetManagementService.createVehicle(request));
    }

    @PatchMapping("/vehicles/{id}/status")
    public Object updateVehicleStatus(@PathVariable Long id, @RequestBody Map<String, String> payload) {
        String status = payload.get("status");
        if (status == null || status.isBlank()) {
            throw new IllegalArgumentException("Trạng thái không được để trống");
        }
        return ApiResponse.success("Đã cập nhật trạng thái phương tiện", fleetManagementService.updateVehicleStatus(id, status));
    }

    // --- DRIVERS & STAFF ---
    @GetMapping("/drivers")
    public Object listDrivers(
            @RequestParam(required = false) Long warehouseId,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String role) {
        if ("AVAILABLE".equalsIgnoreCase(status) && warehouseId != null) {
            return ApiResponse.success(fleetManagementService.getAvailableDriversByHub(warehouseId));
        }
        return ApiResponse.success(fleetManagementService.getStaff(warehouseId, role));
    }

    @PostMapping("/drivers")
    public Object createDriver(@Valid @RequestBody FleetDriverRequest request) {
        return ApiResponse.success("Đã thêm nhân viên mới vào kho", fleetManagementService.createDriver(request));
    }

    @PutMapping("/drivers/{id}")
    public Object updateDriver(@PathVariable Long id, @Valid @RequestBody FleetDriverRequest request) {
        return ApiResponse.success("Đã cập nhật thông tin nhân viên", fleetManagementService.updateDriver(id, request));
    }

    @PatchMapping("/drivers/{id}/status")
    public Object updateDriverStatus(@PathVariable Long id, @RequestBody Map<String, String> payload) {
        String status = payload.get("status");
        if (status == null || status.isBlank()) {
            throw new IllegalArgumentException("Trạng thái không được để trống");
        }
        return ApiResponse.success("Đã cập nhật trạng thái nhân viên", fleetManagementService.updateDriverStatus(id, status));
    }

    @DeleteMapping("/drivers/{id}")
    public Object deleteDriver(@PathVariable Long id) {
        fleetManagementService.deleteDriver(id);
        return ApiResponse.success("Đã xóa nhân viên khỏi hệ thống", null);
    }

    // --- DISPATCH CORE ---
    @GetMapping("/waiting-lots")
    public Object getWaitingLots(@RequestParam(required = false) Long warehouseId) {
        return ApiResponse.success(dispatchService.getWaitingLots(warehouseId));
    }

    @PostMapping("/auto-optimize")
    public Object autoOptimize(@Valid @RequestBody AutoOptimizeRequest request) {
        DispatchOptimizationResultDto result = dispatchService.autoOptimize(request);
        return ApiResponse.success("Đã phân tích và đề xuất phương án điều phối tối ưu", result);
    }

    @PostMapping("/confirm-trip")
    public Object confirmTrip(@RequestParam Long warehouseId, @Valid @RequestBody ConfirmTripRequest request) {
        PickupTrip trip = dispatchService.confirmTrip(warehouseId, request);
        return ApiResponse.success("Đã xác nhận phân công chuyến lấy hàng " + trip.getTripCode(), trip);
    }

    @PostMapping("/trips/{id}/cancel")
    public Object cancelTrip(@PathVariable Long id, @RequestBody(required = false) CancelTripRequest request) {
        Map<String, Object> result = dispatchService.cancelTrip(id, request);
        return ApiResponse.success("Đã hủy chuyến và giải phóng tài nguyên thành công", result);
    }

    @GetMapping("/trips")
    public Object listTrips(@RequestParam Long warehouseId) {
        return ApiResponse.success(dispatchService.getTripsByWarehouse(warehouseId));
    }

    @GetMapping("/trips/{id}")
    public Object getTrip(@PathVariable Long id) {
        return ApiResponse.success(dispatchService.getTripById(id));
    }

    // --- RECEIVING AT HUB & GATE WEIGHING ---
    @PostMapping("/trips/{id}/arrive")
    public Object arriveTrip(@PathVariable Long id) {
        PickupTrip trip = inboundLogisticsExecutionService.warehouseConfirmTruckArrival(id);
        return ApiResponse.success("Đã ghi nhận xe " + (trip.getVehicle() != null ? trip.getVehicle().getPlateNumber() : "") + " đã đến cổng kho", trip);
    }

    @PostMapping("/trips/{id}/complete")
    public Object completeReceiving(@PathVariable Long id, @Valid @RequestBody WarehouseReceivingCompleteRequest request) {
        var user = AuthService.current();
        if (request.getReceivingStaffId() == null && user != null) {
            request.setReceivingStaffId(user.getId());
        }
        PickupTrip trip = inboundLogisticsExecutionService.warehouseCompleteReceiving(id, request);
        return ApiResponse.success("Đã hoàn tất kiểm đếm nhập kho cho chuyến xe " + trip.getTripCode(), trip);
    }

    @GetMapping("/inventory")
    public Object getHubInventory(@RequestParam(required = false) Long warehouseId) {
        String sql = """
            SELECT c.id, c.contract_code, c.lot_id, c.status, c.fulfillment_status,
                   c.hub_name, c.hub_warehouse_zone, c.hub_rack_bin, c.hub_inbound_at,
                   c.max_storage_days, c.qc_status, c.qc_passed_at, c.qc_cert_url,
                   c.qc_brix, c.qc_nitrate_ppm, c.qc_pesticide_safe,
                   c.actual_harvest_weight_kg, c.offered_weight_kg, c.package_count, c.package_type,
                   c.inbound_gross_weight_kg, c.inbound_tare_weight_kg, c.inbound_net_weight_kg,
                   hl.product_name, hl.category,
                   u.full_name as farmer_name,
                   b.full_name as buyer_name,
                   c.created_at, c.updated_at
            FROM b2b_contracts c
            LEFT JOIN harvest_lots hl ON c.lot_id = hl.id
            LEFT JOIN users u ON c.farmer_id = u.id
            LEFT JOIN users b ON c.buyer_id = b.id
            WHERE c.status IN ('IN_TRANSIT_HUB', 'AT_HUB_QC', 'HUB_DELIVERED', 'QC_PASSED', 'QC_FAILED', 'READY_OUTBOUND', 'PICKUP_DISPATCHED', 'OUTBOUND_DISPATCHED')
               OR c.fulfillment_status IN ('IN_TRANSIT_HUB', 'AT_HUB_QC', 'HUB_DELIVERED', 'QC_PASSED', 'QC_FAILED', 'READY_OUTBOUND')
            ORDER BY c.hub_inbound_at ASC NULLS LAST, c.updated_at DESC
        """;
        List<Map<String, Object>> rows = jdbcTemplate.queryForList(sql);
        return ApiResponse.success(rows);
    }
}
