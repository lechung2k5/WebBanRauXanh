package com.btl.webbanrau.controller;

import com.btl.webbanrau.dto.request.DriverIssueReportRequest;
import com.btl.webbanrau.dto.request.DriverLoadStopRequest;
import com.btl.webbanrau.dto.response.ApiResponse;
import com.btl.webbanrau.model.PickupTrip;
import com.btl.webbanrau.model.PickupTripStop;
import com.btl.webbanrau.repository.PickupTripRepository;
import com.btl.webbanrau.repository.PickupTripStopRepository;
import com.btl.webbanrau.service.AuthService;
import com.btl.webbanrau.service.InboundLogisticsExecutionService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/driver/pickup-trips")
@RequiredArgsConstructor
@Slf4j
@PreAuthorize("hasAnyRole('DRIVER', 'ADMIN')")
public class DriverPickupController {

    private final PickupTripRepository pickupTripRepository;
    private final PickupTripStopRepository pickupTripStopRepository;
    private final InboundLogisticsExecutionService inboundLogisticsExecutionService;

    @GetMapping("/my-trips")
    public Object getMyTrips() {
        var user = AuthService.current();
        List<PickupTrip> trips;
        List<String> activeStatuses = List.of("ASSIGNED", "ACKNOWLEDGED", "ON_TRIP", "RETURNING", "ARRIVED_AT_WAREHOUSE");
        if (AuthService.has(user, "ADMIN")) {
            trips = pickupTripRepository.findAll();
        } else {
            String normalizedUserPhone = normalizePhone(user.getPhone());
            trips = pickupTripRepository.findByStatusInWithDriverOrderByIdDesc(activeStatuses).stream()
                    .filter(t -> t.getDriver() != null && (
                            (t.getDriver().getUserId() != null && t.getDriver().getUserId().equals(user.getId())) ||
                            (!normalizedUserPhone.isEmpty() && normalizedUserPhone.equals(normalizePhone(t.getDriver().getPhone())))
                    ))
                    .toList();
        }
        return ApiResponse.success(trips);
    }

    private String normalizePhone(String phone) {
        return phone == null ? "" : phone.replaceAll("[^0-9]", "");
    }

    @GetMapping("/{tripId}")
    public Object getTripDetail(@PathVariable Long tripId) {
        PickupTrip trip = pickupTripRepository.findById(tripId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy chuyến: " + tripId));
        return ApiResponse.success(trip);
    }

    /**
     * Giai đoạn 2: Tài xế tiếp nhận chuyến
     */
    @PostMapping("/{tripId}/acknowledge")
    public Object acknowledgeTrip(@PathVariable Long tripId) {
        PickupTrip trip = inboundLogisticsExecutionService.driverAcknowledgeTrip(tripId);
        return ApiResponse.success("Đã tiếp nhận chuyến xe " + trip.getTripCode(), trip);
    }

    /**
     * Giai đoạn 3: Bắt đầu chuyến xe (Xuất bến)
     */
    @PostMapping("/{tripId}/depart")
    public Object markDeparted(@PathVariable Long tripId) {
        PickupTrip trip = inboundLogisticsExecutionService.driverDepartTrip(tripId);
        return ApiResponse.success("Đã xuất bến chuyến xe " + trip.getTripCode(), trip);
    }

    /**
     * Giai đoạn 4.1: Đến điểm dừng rẫy
     */
    @PostMapping("/stops/{stopId}/arrive")
    public Object markStopArrived(@PathVariable Long stopId) {
        PickupTripStop stop = inboundLogisticsExecutionService.driverArriveStop(stopId);
        return ApiResponse.success("Đã đến điểm lấy hàng", stop);
    }

    /**
     * Giai đoạn 4.2: Bốc hàng và xác nhận khối lượng thực tế
     */
    @PostMapping("/stops/{stopId}/load")
    public Object markStopLoaded(@PathVariable Long stopId, @Valid @RequestBody DriverLoadStopRequest request) {
        PickupTripStop stop = inboundLogisticsExecutionService.driverLoadStop(stopId, request);
        return ApiResponse.success("Đã xác nhận bốc hàng thành công (" + stop.getActualWeightKg() + " kg)", stop);
    }

    /**
     * Giai đoạn 5: Báo cáo sự cố điểm dừng
     */
    @PostMapping("/stops/{stopId}/report-issue")
    public Object reportStopIssue(@PathVariable Long stopId, @Valid @RequestBody DriverIssueReportRequest request) {
        PickupTripStop stop = inboundLogisticsExecutionService.driverReportIssue(stopId, request);
        return ApiResponse.success("Đã ghi nhận báo cáo sự cố tại điểm dừng", stop);
    }

    /**
     * Giai đoạn 6: Xe lấy xong hàng và bắt đầu quay về kho
     */
    @PostMapping("/{tripId}/return-hub")
    public Object returnToHub(@PathVariable Long tripId) {
        PickupTrip trip = inboundLogisticsExecutionService.driverReturnToHub(tripId);
        return ApiResponse.success("Đã chuyển trạng thái xe sang đang quay về kho", trip);
    }

    /**
     * Fallback update stop status
     */
    @PostMapping("/stops/{stopId}/status")
    public Object updateStopStatusLegacy(@PathVariable Long stopId, @RequestBody Map<String, String> payload) {
        String status = payload.get("status");
        if ("ARRIVED".equals(status)) {
            return markStopArrived(stopId);
        } else if ("LOADED".equals(status)) {
            DriverLoadStopRequest req = new DriverLoadStopRequest();
            PickupTripStop s = pickupTripStopRepository.findById(stopId).orElseThrow();
            req.setActualWeightKg(s.getWeightKg());
            req.setActualPackageCount(s.getPackageCount());
            return markStopLoaded(stopId, req);
        }
        return ApiResponse.error(400, "Trạng thái không hỗ trợ qua API legacy: " + status);
    }
}
