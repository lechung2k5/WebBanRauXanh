package com.btl.webbanrau.controller;

import com.btl.webbanrau.dto.request.DepartOutboundTripRequest;
import com.btl.webbanrau.dto.request.DriverOutboundEpodRequest;
import com.btl.webbanrau.dto.response.ApiResponse;
import com.btl.webbanrau.model.OutboundDeliveryStop;
import com.btl.webbanrau.model.OutboundDeliveryTrip;
import com.btl.webbanrau.service.AuthService;
import com.btl.webbanrau.service.OutboundDeliveryExecutionService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/driver/outbound-trips")
@RequiredArgsConstructor
@Slf4j
@PreAuthorize("hasRole('DRIVER')")
public class DriverOutboundController {

    private final OutboundDeliveryExecutionService outboundDeliveryExecutionService;

    @GetMapping("/my-trips")
    public Object getMyTrips() {
        var user = AuthService.current();
        List<OutboundDeliveryTrip> trips = outboundDeliveryExecutionService.getDriverTrips(user.getPhone(), false);
        return ApiResponse.success(trips);
    }

    @GetMapping("/{tripId}")
    public Object getTripDetail(@PathVariable Long tripId) {
        var user = AuthService.current();
        OutboundDeliveryTrip trip = outboundDeliveryExecutionService.getDriverTripDetail(tripId, user.getPhone());
        return ApiResponse.success(trip);
    }

    @PostMapping("/{tripId}/depart")
    public Object departTrip(@PathVariable Long tripId, @RequestBody(required = false) DepartOutboundTripRequest req) {
        var user = AuthService.current();
        OutboundDeliveryTrip trip = outboundDeliveryExecutionService.driverDepartTrip(tripId, req, user.getPhone(), false);
        return ApiResponse.success("Chuyến giao hàng xuất phát thành công", trip);
    }

    @PostMapping("/{tripId}/gps")
    public Object updateTripGps(@PathVariable Long tripId, @RequestBody java.util.Map<String, Double> payload) {
        var user = AuthService.current();
        Double lat = payload != null ? payload.get("lat") : null;
        Double lng = payload != null ? payload.get("lng") : null;
        OutboundDeliveryTrip trip = outboundDeliveryExecutionService.updateTripGps(tripId, lat, lng, user.getPhone(), false);
        return ApiResponse.success("Đã cập nhật vị trí GPS chuyến xe", trip);
    }

    @PostMapping("/stops/{stopId}/arrive")
    public Object arriveStop(@PathVariable Long stopId) {
        var user = AuthService.current();
        OutboundDeliveryStop stop = outboundDeliveryExecutionService.driverArriveStop(stopId, user.getPhone(), false);
        return ApiResponse.success("Đã xác nhận đến điểm giao hàng", stop);
    }

    @PostMapping("/stops/{stopId}/submit-epod")
    public Object submitEpod(@PathVariable Long stopId, @Valid @RequestBody DriverOutboundEpodRequest req) {
        var user = AuthService.current();
        OutboundDeliveryStop stop = outboundDeliveryExecutionService.driverSubmitEpod(stopId, req, user.getPhone(), false);
        return ApiResponse.success("Đã nộp biên bản bàn giao ePOD, chờ Buyer xác nhận", stop);
    }
}
