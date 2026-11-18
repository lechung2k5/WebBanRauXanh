package com.btl.webbanrau.controller;

import com.btl.webbanrau.dto.request.BuyerEpodConfirmRequest;
import com.btl.webbanrau.dto.response.ApiResponse;
import com.btl.webbanrau.model.OutboundDeliveryStop;
import com.btl.webbanrau.service.AuthService;
import com.btl.webbanrau.service.OutboundDeliveryExecutionService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/buyer/outbound-deliveries")
@RequiredArgsConstructor
@Slf4j
@PreAuthorize("hasAnyRole('BUYER', 'ADMIN')")
@Transactional(readOnly = true)
public class BuyerOutboundDeliveryController {

    private final OutboundDeliveryExecutionService outboundDeliveryExecutionService;

    @GetMapping("/pending")
    public Object getPendingDeliveries() {
        var user = AuthService.current();
        boolean isAdmin = AuthService.has(user, "ADMIN");
        List<OutboundDeliveryStop> stops = outboundDeliveryExecutionService.getBuyerPendingDeliveries(user.getId(), isAdmin);
        return ApiResponse.success(stops);
    }

    @GetMapping("/my-deliveries")
    public Object getMyDeliveries() {
        var user = AuthService.current();
        boolean isAdmin = AuthService.has(user, "ADMIN");
        List<OutboundDeliveryStop> stops = outboundDeliveryExecutionService.getBuyerDeliveries(user.getId(), isAdmin);
        return ApiResponse.success(stops);
    }

    @GetMapping("/stops/{stopId}")
    public Object getStopDetail(@PathVariable Long stopId) {
        OutboundDeliveryStop stop = outboundDeliveryExecutionService.getStopDetail(stopId);
        return ApiResponse.success(stop);
    }

    @PostMapping("/stops/{stopId}/confirm-epod")
    public Object confirmEpod(@PathVariable Long stopId, @Valid @RequestBody BuyerEpodConfirmRequest req) {
        var user = AuthService.current();
        boolean isAdmin = AuthService.has(user, "ADMIN");
        OutboundDeliveryStop stop = outboundDeliveryExecutionService.buyerConfirmEpod(stopId, req, user.getId(), isAdmin);
        return ApiResponse.success("Buyer đã ký nhận thành công biên bản ePOD", stop);
    }
}
