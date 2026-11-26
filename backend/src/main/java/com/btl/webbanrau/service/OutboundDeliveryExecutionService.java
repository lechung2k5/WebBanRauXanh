package com.btl.webbanrau.service;

import com.btl.webbanrau.dto.request.BuyerEpodConfirmRequest;
import com.btl.webbanrau.dto.request.DepartOutboundTripRequest;
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
import java.util.Map;
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
        List<OutboundDeliveryTrip> trips;
        if (isAdmin) {
            trips = outboundDeliveryTripRepository.findAll();
        } else {
            List<String> activeStatuses = List.of("ASSIGNED", "ON_DELIVERY", "COMPLETED");
            trips = outboundDeliveryTripRepository.findAll().stream()
                    .filter(trip -> activeStatuses.contains(trip.getStatus()))
                    .filter(trip -> trip.getDriver() != null && samePhone(driverPhone, trip.getDriver().getPhone()))
                    .sorted((left, right) -> right.getId().compareTo(left.getId()))
                    .toList();
        }
        enrichResolvedAddresses(trips);
        return trips;
    }

    @Transactional(readOnly = true)
    public OutboundDeliveryTrip getTripDetail(Long tripId) {
        OutboundDeliveryTrip trip = outboundDeliveryTripRepository.findById(tripId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy chuyến xe outbound id: " + tripId));
        enrichResolvedAddresses(List.of(trip));
        return trip;
    }

    private void enrichResolvedAddresses(List<OutboundDeliveryTrip> trips) {
        for (OutboundDeliveryTrip trip : trips) {
            if (trip.getStops() == null) continue;
            for (OutboundDeliveryStop stop : trip.getStops()) {
                String resolved = stop.getResolvedDeliveryAddress();
                if (resolved != null && !resolved.isBlank()) {
                    stop.setResolvedDeliveryAddress(resolved);
                }
            }
        }
    }

    @Transactional(readOnly = true)
    public OutboundDeliveryTrip getDriverTripDetail(Long tripId, String driverPhone) {
        OutboundDeliveryTrip trip = getTripDetail(tripId);
        if (trip.getDriver() == null || !samePhone(driverPhone, trip.getDriver().getPhone())) {
            throw new IllegalArgumentException("Bạn không được phân công chuyến xe này");
        }
        return trip;
    }

    @Transactional
    public OutboundDeliveryTrip driverDepartTrip(Long tripId, DepartOutboundTripRequest req, String driverPhone, boolean isAdmin) {
        OutboundDeliveryTrip trip = outboundDeliveryTripRepository.findById(tripId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy chuyến xe outbound id: " + tripId));

        if (!isAdmin && (trip.getDriver() == null || !samePhone(driverPhone, trip.getDriver().getPhone()))) {
            throw new IllegalArgumentException("Bạn không được phân công chuyến xe này");
        }

        if (!"ASSIGNED".equals(trip.getStatus())) {
            throw new IllegalStateException("Chuyến xe không ở trạng thái ASSIGNED (hiện tại: " + trip.getStatus() + ")");
        }

        if (trip.getStops() != null) {
            for (OutboundDeliveryStop stop : trip.getStops()) {
                B2bContract c = stop.getContract();
                if (c == null) continue;
                String fs = c.getFulfillmentStatus() != null ? c.getFulfillmentStatus().trim().toUpperCase() : "";
                String st = c.getStatus() != null ? c.getStatus().trim().toUpperCase() : "";
                boolean isWarehousePrepared = "PICKED_FROM_BIN".equals(fs)
                        || "OUTBOUND_DISPATCHED".equals(fs)
                        || "OUTBOUND_DISPATCHED".equals(st);
                if (!isWarehousePrepared) {
                    throw new IllegalStateException(
                            "Kho chưa hoàn tất soạn hàng & xuất kho cho đơn " + c.getContractCode()
                                    + ". Vui lòng đợi nhân viên kho soạn hàng xong!"
                    );
                }
            }
        }

        LocalDateTime now = LocalDateTime.now();
        trip.setStatus("ON_DELIVERY");
        trip.setDepartedAt(now);

        // Lưu thông tin Hợp đồng vận chuyển & chữ ký 2 bên trước khi xuất bến
        trip.setTransportContractCode("HDVC-" + trip.getTripCode());
        trip.setTransportContractSignedAt(now);
        if (req != null) {
            if (req.getDispatcherName() != null && !req.getDispatcherName().isBlank()) {
                trip.setDispatcherName(req.getDispatcherName().trim());
            }
            if (req.getDispatcherSignatureData() != null && !req.getDispatcherSignatureData().isBlank()) {
                trip.setDispatcherSignatureData(req.getDispatcherSignatureData());
            }
            if (req.getDriverPickupSignatureData() != null && !req.getDriverPickupSignatureData().isBlank()) {
                trip.setDriverPickupSignatureData(req.getDriverPickupSignatureData());
            }
            if (req.getDeparturePhotoUrl() != null && !req.getDeparturePhotoUrl().isBlank()) {
                trip.setDeparturePhotoUrl(req.getDeparturePhotoUrl());
            }
            if (req.getNotes() != null && !req.getNotes().isBlank()) {
                trip.setNotes(req.getNotes());
            }
        }

        // Khởi tạo tọa độ GPS xuất phát tại Hub nếu chưa có (sẵn sàng cho App Tài xế cập nhật tiếp)
        if (trip.getCurrentLat() == null || trip.getCurrentLng() == null) {
            double[] hubCoords = resolveHubCoords(trip.getHub() != null ? trip.getHub().getId() : 2L);
            trip.setCurrentLat(hubCoords[0]);
            trip.setCurrentLng(hubCoords[1]);
        }
        trip.setGpsUpdatedAt(now);

        // Update vehicle and driver status
        if (trip.getVehicle() != null) {
            trip.getVehicle().setStatus("ON_TRIP");
            fleetVehicleRepository.save(trip.getVehicle());
        }
        if (trip.getDriver() != null) {
            trip.getDriver().setStatus("ON_TRIP");
            fleetDriverRepository.save(trip.getDriver());
        }

        String plate = trip.getVehicle() != null ? trip.getVehicle().getPlateNumber() : null;
        String driverName = trip.getDriver() != null ? trip.getDriver().getFullName() : null;

        // Update contracts and shipments to IN_TRANSIT
        for (OutboundDeliveryStop stop : trip.getStops()) {
            B2bContract contract = stop.getContract();
            if (contract != null) {
                contract.setStatus("IN_TRANSIT");
                contract.setFulfillmentStatus("IN_TRANSIT");
                if (plate != null) contract.setOutboundTruckPlate(plate);
                if (driverName != null) contract.setOutboundDriverName(driverName);
                contract.setOutboundDispatchedAt(now);
                b2bContractRepository.save(contract);
                jdbcTemplate.update("UPDATE shipments SET status = 'IN_TRANSIT', departed_at = ? WHERE contract_id = ? AND status <> 'DELIVERED'",
                        now, contract.getId());
                java.util.Map<String, Object> contractEvent = new java.util.LinkedHashMap<>();
                contractEvent.put("id", contract.getId());
                contractEvent.put("contractCode", contract.getContractCode());
                contractEvent.put("status", "IN_TRANSIT");
                contractEvent.put("fulfillmentStatus", "IN_TRANSIT");
                contractEvent.put("outboundTruckPlate", plate);
                contractEvent.put("outboundDriverName", driverName);
                contractEvent.put("driverGpsLat", trip.getCurrentLat());
                contractEvent.put("driverGpsLng", trip.getCurrentLng());
                contractEvent.put("driverGpsUpdatedAt", now.toString());
                b2bRealtimeService.notifyContractUpdated("IN_TRANSIT", contract.getContractCode(), contractEvent);
            }
        }

        OutboundDeliveryTrip saved = outboundDeliveryTripRepository.save(trip);
        java.util.Map<String, Object> tripEvent = new java.util.LinkedHashMap<>();
        tripEvent.put("id", saved.getId());
        tripEvent.put("tripCode", saved.getTripCode());
        tripEvent.put("status", saved.getStatus());
        tripEvent.put("currentLat", saved.getCurrentLat());
        tripEvent.put("currentLng", saved.getCurrentLng());
        b2bRealtimeService.notifyDispatchTripUpdated("OUTBOUND_TRIP_DEPARTED", saved.getId(), tripEvent);
        return saved;
    }

    @Transactional
    public OutboundDeliveryTrip updateTripGps(Long tripId, Double lat, Double lng, String driverPhone, boolean isAdmin) {
        if (lat == null || lng == null) {
            throw new IllegalArgumentException("Tọa độ GPS (lat, lng) không hợp lệ.");
        }
        OutboundDeliveryTrip trip = outboundDeliveryTripRepository.findById(tripId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy chuyến xe outbound id: " + tripId));

        if (!isAdmin && (trip.getDriver() == null || !samePhone(driverPhone, trip.getDriver().getPhone()))) {
            throw new IllegalArgumentException("Bạn không được phân công chuyến xe này");
        }

        LocalDateTime now = LocalDateTime.now();
        trip.setCurrentLat(lat);
        trip.setCurrentLng(lng);
        trip.setGpsUpdatedAt(now);
        OutboundDeliveryTrip saved = outboundDeliveryTripRepository.save(trip);

        for (OutboundDeliveryStop stop : saved.getStops()) {
            B2bContract contract = stop.getContract();
            if (contract != null) {
                b2bRealtimeService.notifyContractUpdated("TRIP_GPS_UPDATED", contract.getContractCode(),
                        java.util.Map.of("contractId", contract.getId(), "lat", lat, "lng", lng, "gpsUpdatedAt", now.toString()));
            }
        }
        b2bRealtimeService.notifyDispatchTripUpdated("OUTBOUND_TRIP_GPS_UPDATED", saved.getId(), saved);
        return saved;
    }

    private double[] resolveHubCoords(Long hubId) {
        if (hubId == null) return new double[]{11.7346, 108.3712};
        return switch (hubId.intValue()) {
            case 1 -> new double[]{10.9733, 106.5162}; // Củ Chi - TP.HCM
            case 3 -> new double[]{10.3315, 106.0342}; // Cái Bè - Tiền Giang
            case 4 -> new double[]{12.9125, 108.2643}; // Buôn Hồ - Đắk Lắk
            case 5 -> new double[]{21.0368, 105.9154}; // Hà Nội
            default -> new double[]{11.7346, 108.3712}; // Đức Trọng - Lâm Đồng
        };
    }

    @Transactional
    public OutboundDeliveryStop driverArriveStop(Long stopId, String driverPhone, boolean isAdmin) {
        OutboundDeliveryStop stop = outboundDeliveryStopRepository.findById(stopId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy điểm dừng id: " + stopId));

        OutboundDeliveryTrip trip = stop.getTrip();
        if (!isAdmin && (trip.getDriver() == null || !samePhone(driverPhone, trip.getDriver().getPhone()))) {
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
        OutboundDeliveryStop savedStop = outboundDeliveryStopRepository.save(stop);
        if (stop.getContract() != null) {
            java.util.Map<String, Object> arriveEvent = new java.util.LinkedHashMap<>();
            arriveEvent.put("id", stop.getContract().getId());
            arriveEvent.put("contractCode", stop.getContract().getContractCode());
            arriveEvent.put("stopId", savedStop.getId());
            arriveEvent.put("stopStatus", "ARRIVED");
            b2bRealtimeService.notifyContractUpdated("ARRIVED", stop.getContract().getContractCode(), arriveEvent);
        }
        b2bRealtimeService.notifyDispatchTripUpdated("OUTBOUND_STOP_ARRIVED", trip.getId(),
                java.util.Map.of("tripId", trip.getId(), "stopId", savedStop.getId(), "status", "ARRIVED"));
        return savedStop;
    }

    @Transactional
    public OutboundDeliveryStop driverSubmitEpod(Long stopId, DriverOutboundEpodRequest req, String driverPhone, boolean isAdmin) {
        OutboundDeliveryStop stop = outboundDeliveryStopRepository.findById(stopId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy điểm dừng id: " + stopId));

        OutboundDeliveryTrip trip = stop.getTrip();
        if (!isAdmin && (trip.getDriver() == null || !samePhone(driverPhone, trip.getDriver().getPhone()))) {
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

            java.util.Map<String, Object> epodEvent = new java.util.LinkedHashMap<>();
            epodEvent.put("id", contract.getId());
            epodEvent.put("contractCode", contract.getContractCode());
            epodEvent.put("stopId", stop.getId());
            epodEvent.put("stopStatus", "PENDING_BUYER_CONFIRMATION");
            epodEvent.put("epodDeliveredWeightKg", actualDelivered);
            b2bRealtimeService.notifyContractUpdated("PENDING_BUYER_CONFIRMATION", contract.getContractCode(), epodEvent);
        }

        OutboundDeliveryStop savedEpod = outboundDeliveryStopRepository.save(stop);
        if (stop.getTrip() != null) {
            b2bRealtimeService.notifyDispatchTripUpdated("OUTBOUND_STOP_EPOD_SUBMITTED", stop.getTrip().getId(),
                    java.util.Map.of("tripId", stop.getTrip().getId(), "stopId", savedEpod.getId(), "status", "PENDING_BUYER_CONFIRMATION"));
        }
        return savedEpod;
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

        // Calculate remaining balance due based on Q4 (Tiền hàng thực giao + Cước vận chuyển - Tiền cọc)
        BigDecimal unitPrice = contract.getOfferedPricePerKg() != null ? contract.getOfferedPricePerKg() : BigDecimal.ZERO;
        BigDecimal totalActualGoodsAmount = q4AcceptedWeight.multiply(unitPrice);
        Map<String, Object> contractFin = jdbcTemplate.queryForMap(
                "SELECT COALESCE(logistics_fee_amount, 0) AS logistics_fee, COALESCE(NULLIF(deposit_received, 0), deposit_30_amount, 0) AS deposit_paid FROM b2b_contracts WHERE id = ?",
                contract.getId()
        );
        BigDecimal logisticsFee = contractFin.get("logistics_fee") != null ? new BigDecimal(String.valueOf(contractFin.get("logistics_fee"))) : BigDecimal.ZERO;
        BigDecimal grandTotalInvoice = totalActualGoodsAmount.add(logisticsFee);
        BigDecimal depositReceived = contractFin.get("deposit_paid") != null ? new BigDecimal(String.valueOf(contractFin.get("deposit_paid"))) : BigDecimal.ZERO;
        BigDecimal remainingDue = grandTotalInvoice.subtract(depositReceived);
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
        OutboundDeliveryStop savedConfirmed = outboundDeliveryStopRepository.save(stop);
        if (trip != null) {
            b2bRealtimeService.notifyDispatchTripUpdated("OUTBOUND_STOP_CONFIRMED", trip.getId(),
                    java.util.Map.of("tripId", trip.getId(), "stopId", savedConfirmed.getId(), "status", "BUYER_CONFIRMED", "tripStatus", trip.getStatus()));
        }
        return savedConfirmed;
    }

    private static boolean samePhone(String left, String right) {
        if (left == null || right == null) return false;
        return left.replaceAll("\\D", "").equals(right.replaceAll("\\D", ""));
    }
}
