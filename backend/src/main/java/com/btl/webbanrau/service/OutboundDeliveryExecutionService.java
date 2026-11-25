package com.btl.webbanrau.service;

import com.btl.webbanrau.dto.request.BuyerEpodConfirmRequest;
import com.btl.webbanrau.dto.request.DriverOutboundEpodRequest;
import com.btl.webbanrau.model.*;
import com.btl.webbanrau.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class OutboundDeliveryExecutionService {

    private final OutboundDeliveryTripRepository outboundDeliveryTripRepository;
    private final OutboundDeliveryStopRepository outboundDeliveryStopRepository;
    private final FleetVehicleRepository fleetVehicleRepository;
    private final FleetDriverRepository fleetDriverRepository;
    private final B2bContractRepository b2bContractRepository;
    private final B2bRealtimeService b2bRealtimeService;
    private final JdbcTemplate jdbcTemplate;

    @Transactional(readOnly = true)
    public List<OutboundDeliveryTrip> getDriverTrips(String driverPhone, boolean isAdmin) {
        if (isAdmin) {
            return outboundDeliveryTripRepository.findAll();
        }
        var user = AuthService.current();
        boolean isDemoDriver = user != null && "driver_tms".equalsIgnoreCase(user.getUsername());
        List<String> activeStatuses = List.of("ASSIGNED", "ON_DELIVERY", "COMPLETED");
        return outboundDeliveryTripRepository.findAll().stream()
                .filter(trip -> activeStatuses.contains(trip.getStatus()))
                .filter(trip -> trip.getDriver() != null && (samePhone(driverPhone, trip.getDriver().getPhone()) || isDemoDriver))
                .sorted((left, right) -> right.getId().compareTo(left.getId()))
                .toList();
    }

    @Transactional(readOnly = true)
    public OutboundDeliveryTrip getTripDetail(Long tripId) {
        return outboundDeliveryTripRepository.findById(tripId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy chuyến xe outbound id: " + tripId));
    }

    @Transactional(readOnly = true)
    public OutboundDeliveryTrip getDriverTripDetail(Long tripId, String driverPhone, boolean isAdmin) {
        OutboundDeliveryTrip trip = getTripDetail(tripId);
        if (!isDriverAuthorized(trip, driverPhone, isAdmin)) {
            throw new IllegalArgumentException("Bạn không được phân công chuyến xe này");
        }
        return trip;
    }

    @Transactional
    public OutboundDeliveryTrip driverDepartTrip(Long tripId, String driverPhone, boolean isAdmin) {
        OutboundDeliveryTrip trip = outboundDeliveryTripRepository.findById(tripId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy chuyến xe outbound id: " + tripId));

        if (!isDriverAuthorized(trip, driverPhone, isAdmin)) {
            throw new IllegalArgumentException("Bạn không được phân công chuyến xe này");
        }

        if (!"ASSIGNED".equals(trip.getStatus())) {
            throw new IllegalStateException("Chuyến xe không ở trạng thái ASSIGNED (hiện tại: " + trip.getStatus() + ")");
        }

        LocalDateTime now = LocalDateTime.now();
        trip.setStatus("ON_DELIVERY");
        trip.setDepartedAt(now);

        // Update vehicle and driver status
        if (trip.getVehicle() != null) {
            trip.getVehicle().setStatus("ON_TRIP");
            fleetVehicleRepository.save(trip.getVehicle());
        }
        if (trip.getDriver() != null) {
            trip.getDriver().setStatus("ON_TRIP");
            fleetDriverRepository.save(trip.getDriver());
        }

        // Update contracts and shipments to IN_TRANSIT
        for (OutboundDeliveryStop stop : trip.getStops()) {
            B2bContract contract = stop.getContract();
            if (contract != null) {
                contract.setStatus("IN_TRANSIT");
                contract.setFulfillmentStatus("IN_TRANSIT");
                b2bContractRepository.save(contract);
                jdbcTemplate.update("UPDATE shipments SET status = 'IN_TRANSIT', departed_at = ? WHERE contract_id = ? AND status <> 'DELIVERED'",
                        now, contract.getId());
                b2bRealtimeService.notifyContractUpdated("IN_TRANSIT", contract.getContractCode(), contract);
            }
        }

        return outboundDeliveryTripRepository.save(trip);
    }

    @Transactional
    public OutboundDeliveryStop driverArriveStop(Long stopId, String driverPhone, boolean isAdmin) {
        OutboundDeliveryStop stop = outboundDeliveryStopRepository.findById(stopId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy điểm dừng id: " + stopId));

        OutboundDeliveryTrip trip = stop.getTrip();
        if (!isDriverAuthorized(trip, driverPhone, isAdmin)) {
            throw new IllegalArgumentException("Bạn không có quyền thao tác trên điểm dừng này");
        }

        if (!"ON_DELIVERY".equals(trip.getStatus())) {
            throw new IllegalStateException("Chuyến xe chưa bắt đầu khởi hành");
        }

        if ("BUYER_CONFIRMED".equals(stop.getStatus()) || "REJECTED".equals(stop.getStatus())) {
            throw new IllegalStateException("Điểm dừng đã được hoàn tất trước đó");
        }

        stop.setStatus("ARRIVED");
        stop.setArrivedAt(LocalDateTime.now());
        return outboundDeliveryStopRepository.save(stop);
    }

    @Transactional
    public OutboundDeliveryStop driverSubmitEpod(Long stopId, DriverOutboundEpodRequest req, String driverPhone, boolean isAdmin) {
        OutboundDeliveryStop stop = outboundDeliveryStopRepository.findById(stopId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy điểm dừng id: " + stopId));

        OutboundDeliveryTrip trip = stop.getTrip();
        if (!isDriverAuthorized(trip, driverPhone, isAdmin)) {
            throw new IllegalArgumentException("Bạn không có quyền thao tác trên điểm dừng này");
        }

        if ("BUYER_CONFIRMED".equals(stop.getStatus())) {
            throw new IllegalStateException("Điểm dừng này đã được Buyer xác nhận nhận hàng");
        }

        LocalDateTime now = LocalDateTime.now();
        BigDecimal actualDelivered = req.getActualDeliveredWeightKg();
        BigDecimal rejected = req.getRejectedWeightKg() != null ? req.getRejectedWeightKg() : BigDecimal.ZERO;

        stop.setActualDeliveredWeightKg(actualDelivered);
        stop.setRejectedWeightKg(rejected);
        stop.setRejectionReason(req.getRejectionReason());
        stop.setDriverSignatureData(req.getDriverSignatureData());
        stop.setDriverNotes(req.getDriverNotes());
        stop.setHandoverPhotoUrl(req.getHandoverPhotoUrl());
        stop.setDriverSubmittedAt(now);
        stop.setStatus("PENDING_BUYER_CONFIRMATION");

        B2bContract contract = stop.getContract();
        if (contract != null) {
            contract.setEpodDeliveredWeightKg(actualDelivered);
            contract.setEpodDamagedWeightKg(rejected);
            b2bContractRepository.save(contract);

            // Decision 5: If there is damaged / rejected weight, auto create an open claim in spoilage_claims
            if (rejected.compareTo(BigDecimal.ZERO) > 0) {
                BigDecimal unitPrice = contract.getOfferedPricePerKg() != null ? contract.getOfferedPricePerKg() : BigDecimal.ZERO;
                BigDecimal compensation = rejected.multiply(unitPrice);
                String claimCode = "CLM-OUT-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();
                String cause = req.getRejectionReason() != null && !req.getRejectionReason().isBlank()
                        ? req.getRejectionReason()
                        : "Hao hụt/Hư hại ghi nhận trong biên bản giao hàng ePOD Outbound";
                jdbcTemplate.update(
                        "INSERT INTO spoilage_claims(claim_code, contract_id, damaged_weight_kg, cause, liable_party, compensation_amount, status) VALUES (?,?,?,?,?,?,'OPEN')",
                        claimCode, contract.getId(), rejected, cause, "TRANSPORTER", compensation
                );
                log.warn("[Outbound ePOD] Đã tự động tạo khiếu nại {} với {} kg hư hao cho hợp đồng {}", claimCode, rejected, contract.getContractCode());
            }

            b2bRealtimeService.notifyContractUpdated("PENDING_BUYER_CONFIRMATION", contract.getContractCode(), contract);
        }

        return outboundDeliveryStopRepository.save(stop);
    }

    @Transactional(readOnly = true)
    public List<OutboundDeliveryStop> getBuyerPendingDeliveries(Long buyerUserId, boolean isAdmin) {
        if (isAdmin) {
            return outboundDeliveryStopRepository.findAllWithTripAndContract().stream()
                    .filter(s -> "PENDING_BUYER_CONFIRMATION".equals(s.getStatus()) || "ARRIVED".equals(s.getStatus()))
                    .toList();
        }
        return outboundDeliveryStopRepository.findByBuyerUserIdAndStatusIn(buyerUserId, List.of("PENDING_BUYER_CONFIRMATION", "ARRIVED"));
    }

    @Transactional(readOnly = true)
    public List<OutboundDeliveryStop> getBuyerDeliveries(Long buyerUserId, boolean isAdmin) {
        if (isAdmin) {
            return outboundDeliveryStopRepository.findAllWithTripAndContract();
        }
        return outboundDeliveryStopRepository.findByBuyerUserIdOrderByCreatedAtDesc(buyerUserId);
    }

    @Transactional(readOnly = true)
    public OutboundDeliveryStop getBuyerStopDetail(Long stopId, Long buyerUserId, boolean isAdmin) {
        OutboundDeliveryStop stop = outboundDeliveryStopRepository.findById(stopId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy thông tin điểm dừng id: " + stopId));
        if (!isAdmin && (stop.getContract() == null || stop.getContract().getBuyer() == null
                || !stop.getContract().getBuyer().getId().equals(buyerUserId))) {
            throw new IllegalArgumentException("Bạn không có quyền xem chuyến giao hàng của người khác");
        }
        return stop;
    }

    @Transactional
    public OutboundDeliveryStop buyerConfirmEpod(Long stopId, BuyerEpodConfirmRequest req, Long currentUserId, boolean isAdmin) {
        OutboundDeliveryStop stop = outboundDeliveryStopRepository.findById(stopId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy điểm dừng id: " + stopId));

        B2bContract contract = stop.getContract();
        if (contract == null) {
            throw new IllegalStateException("Điểm dừng không liên kết hợp đồng");
        }

        if (!isAdmin && (contract.getBuyer() == null || !contract.getBuyer().getId().equals(currentUserId))) {
            throw new IllegalArgumentException("Bạn không có quyền xác nhận đơn hàng của người khác");
        }

        if (!"PENDING_BUYER_CONFIRMATION".equals(stop.getStatus())) {
            throw new IllegalStateException("Biên bản giao hàng chưa được tài xế nộp hoặc đã được xác nhận (hiện tại: " + stop.getStatus() + ")");
        }

        LocalDateTime now = LocalDateTime.now();
        stop.setBuyerSignerName(req.getBuyerSignerName());
        stop.setBuyerSignerPhone(req.getBuyerSignerPhone());
        stop.setBuyerSignatureData(req.getBuyerSignatureData());
        stop.setBuyerNotes(req.getBuyerNotes());
        stop.setBuyerConfirmedAt(now);
        stop.setStatus("BUYER_CONFIRMED");

        // Decision 3: Q4 locking on contract & shipments
        BigDecimal q4AcceptedWeight = stop.getActualDeliveredWeightKg();
        contract.setStatus("DELIVERED");
        contract.setFulfillmentStatus("DELIVERED");
        contract.setEpodDeliveredAt(now);
        contract.setEpodSignatureUrl(stop.getHandoverPhotoUrl());

        // Calculate remaining balance due based on Q4
        BigDecimal unitPrice = contract.getOfferedPricePerKg() != null ? contract.getOfferedPricePerKg() : BigDecimal.ZERO;
        BigDecimal totalActualGoodsAmount = q4AcceptedWeight.multiply(unitPrice);
        BigDecimal depositReceived = contract.getDeposit30Amount() != null ? contract.getDeposit30Amount() : BigDecimal.ZERO;
        BigDecimal remainingDue = totalActualGoodsAmount.subtract(depositReceived);
        if (remainingDue.signum() > 0) {
            contract.setRemainingAmount(remainingDue);
            contract.setRemainingPaymentStatus("UNPAID");
        } else {
            contract.setRemainingAmount(BigDecimal.ZERO);
            contract.setRemainingPaymentStatus("PAID");
        }

        b2bContractRepository.save(contract);

        // Update legacy shipment table with Q4
        jdbcTemplate.update("UPDATE shipments SET delivered_weight_kg = ?, status = 'DELIVERED', delivered_at = ? WHERE contract_id = ?",
                q4AcceptedWeight, now, contract.getId());

        // Check if all stops in the trip are completed
        OutboundDeliveryTrip trip = stop.getTrip();
        List<OutboundDeliveryStop> allStops = outboundDeliveryStopRepository.findByTripIdOrderByStopSequenceAsc(trip.getId());
        boolean allFinished = allStops.stream().allMatch(s -> {
            if (s.getId().equals(stop.getId())) return true; // current stop is just confirmed
            return "BUYER_CONFIRMED".equals(s.getStatus()) || "REJECTED".equals(s.getStatus()) || "CANCELLED".equals(s.getStatus());
        });

        if (allFinished) {
            trip.setStatus("COMPLETED");
            trip.setCompletedAt(now);
            outboundDeliveryTripRepository.save(trip);

            // Release vehicle and driver back to AVAILABLE
            if (trip.getVehicle() != null) {
                trip.getVehicle().setStatus("AVAILABLE");
                fleetVehicleRepository.save(trip.getVehicle());
            }
            if (trip.getDriver() != null) {
                trip.getDriver().setStatus("AVAILABLE");
                fleetDriverRepository.save(trip.getDriver());
            }
            log.info("[Outbound Trip Completed] Chuyến giao {} đã giao hết toàn bộ các điểm. Phương tiện và tài xế đã được giải phóng về AVAILABLE.", trip.getTripCode());
        }

        b2bRealtimeService.notifyContractUpdated("DELIVERED", contract.getContractCode(), contract);
        return outboundDeliveryStopRepository.save(stop);
    }

    private boolean isDriverAuthorized(OutboundDeliveryTrip trip, String driverPhone, boolean isAdmin) {
        if (isAdmin) return true;
        if (trip != null && trip.getDriver() != null && samePhone(driverPhone, trip.getDriver().getPhone())) {
            return true;
        }
        var user = AuthService.current();
        return user != null && ("driver_tms".equalsIgnoreCase(user.getUsername()) || AuthService.has(user, "ADMIN"));
    }

    private static boolean samePhone(String left, String right) {
        if (left == null || right == null) return false;
        return left.replaceAll("\\D", "").equals(right.replaceAll("\\D", ""));
    }
}
