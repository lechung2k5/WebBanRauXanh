package com.btl.webbanrau.controller;

import com.btl.webbanrau.dto.request.WarehouseReceivingCompleteRequest;
import com.btl.webbanrau.dto.response.ApiResponse;
import com.btl.webbanrau.model.PickupTrip;
import com.btl.webbanrau.repository.PickupTripRepository;
import com.btl.webbanrau.service.AuthService;
import com.btl.webbanrau.service.InboundLogisticsExecutionService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/warehouse/receiving")
@RequiredArgsConstructor
@Slf4j
@PreAuthorize("hasAnyRole('WAREHOUSE_QC', 'ADMIN')")
public class WarehouseReceivingController {

    private final PickupTripRepository pickupTripRepository;
    private final InboundLogisticsExecutionService inboundLogisticsExecutionService;
    private final JdbcTemplate jdbcTemplate;

    /**
     * Danh sách các chuyến xe cần tiếp nhận / đang về kho / đã hoàn tất
     */
    @GetMapping("/trips")
    public Object getReceivingTrips(@RequestParam(required = false) Long warehouseId) {
        List<String> statuses = List.of("ON_TRIP", "RETURNING", "ARRIVED_AT_WAREHOUSE", "COMPLETED");
        List<PickupTrip> trips;
        if (warehouseId != null) {
            trips = pickupTripRepository.findByWarehouseIdAndStatusInOrderByCreatedAtDesc(warehouseId, statuses);
        } else {
            trips = pickupTripRepository.findAll().stream()
                    .filter(t -> statuses.contains(t.getStatus()))
                    .sorted((a, b) -> b.getCreatedAt().compareTo(a.getCreatedAt()))
                    .toList();
        }
        return ApiResponse.success(trips);
    }

    /**
     * Tồn kho trạm trung chuyển & Giám sát FEFO
     */
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
            WHERE c.status IN ('IN_TRANSIT_HUB', 'AT_HUB_QC', 'HUB_DELIVERED', 'READY_OUTBOUND', 'PICKUP_DISPATCHED', 'OUTBOUND_DISPATCHED')
               OR c.fulfillment_status IN ('IN_TRANSIT_HUB', 'AT_HUB_QC', 'HUB_DELIVERED', 'READY_OUTBOUND')
            ORDER BY c.hub_inbound_at ASC NULLS LAST, c.updated_at DESC
        """;
        List<Map<String, Object>> rows = jdbcTemplate.queryForList(sql);
        return ApiResponse.success(rows);
    }

    /**
     * Chi tiết chuyến xe cần tiếp nhận
     */
    @GetMapping("/trips/{tripId}")
    public Object getTripReceivingDetail(@PathVariable Long tripId) {
        PickupTrip trip = pickupTripRepository.findById(tripId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy chuyến xe: " + tripId));
        return ApiResponse.success(trip);
    }

    /**
     * Giai đoạn 7.1: Xác nhận xe đã đến cổng kho
     */
    @PostMapping("/trips/{tripId}/arrive")
    public Object confirmTruckArrival(@PathVariable Long tripId) {
        PickupTrip trip = inboundLogisticsExecutionService.warehouseConfirmTruckArrival(tripId);
        return ApiResponse.success("Đã ghi nhận xe " + (trip.getVehicle() != null ? trip.getVehicle().getPlateNumber() : "") + " đã đến cổng kho", trip);
    }

    /**
     * Giai đoạn 7.2: Kiểm đếm đối soát, lưu kho mát và hoàn tất nhập kho
     */
    @PostMapping("/trips/{tripId}/complete")
    public Object completeReceiving(@PathVariable Long tripId, @Valid @RequestBody WarehouseReceivingCompleteRequest request) {
        var user = AuthService.current();
        if (request.getReceivingStaffId() == null && user != null) {
            request.setReceivingStaffId(user.getId());
        }
        PickupTrip trip = inboundLogisticsExecutionService.warehouseCompleteReceiving(tripId, request);
        return ApiResponse.success("Đã hoàn tất kiểm đếm nhập kho cho chuyến xe " + trip.getTripCode(), trip);
    }
}
