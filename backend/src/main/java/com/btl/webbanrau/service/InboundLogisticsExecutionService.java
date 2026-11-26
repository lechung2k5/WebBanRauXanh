package com.btl.webbanrau.service;

import com.btl.webbanrau.dto.request.DriverIssueReportRequest;
import com.btl.webbanrau.dto.request.DriverLoadStopRequest;
import com.btl.webbanrau.dto.request.WarehouseReceivingCompleteRequest;
import com.btl.webbanrau.model.*;
import com.btl.webbanrau.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class InboundLogisticsExecutionService {

    private final PickupTripRepository pickupTripRepository;
    private final PickupTripStopRepository pickupTripStopRepository;
    private final FleetVehicleRepository fleetVehicleRepository;
    private final FleetDriverRepository fleetDriverRepository;
    private final B2bContractRepository b2bContractRepository;
    private final HubInspectionRepository hubInspectionRepository;
    private final B2bRealtimeService b2bRealtimeService;

    /**
     * Giai đoạn 2: Tài xế tiếp nhận chuyến xe được phân công
     */
    @Transactional
    public PickupTrip driverAcknowledgeTrip(Long tripId) {
        PickupTrip trip = pickupTripRepository.findById(tripId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy chuyến xe: " + tripId));

        if (!"ASSIGNED".equals(trip.getStatus())) {
            throw new IllegalStateException("Chuyến xe hiện không ở trạng thái ASSIGNED (Trạng thái hiện tại: " + trip.getStatus() + ")");
        }

        trip.setStatus("ACKNOWLEDGED");
        trip.setAcknowledgedAt(LocalDateTime.now());
        PickupTrip saved = pickupTripRepository.save(trip);

        b2bRealtimeService.notifyDispatchTripUpdated("TRIP_ACKNOWLEDGED", trip.getId(), saved);
        log.info("Driver acknowledged trip {}", trip.getTripCode());
        return saved;
    }

    /**
     * Giai đoạn 3: Tài xế xuất phát đi thu gom nông sản
     */
    @Transactional
    public PickupTrip driverDepartTrip(Long tripId) {
        PickupTrip trip = pickupTripRepository.findById(tripId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy chuyến xe: " + tripId));

        if (!"ASSIGNED".equals(trip.getStatus()) && !"ACKNOWLEDGED".equals(trip.getStatus())) {
            throw new IllegalStateException("Chuyến xe không thể xuất phát khi ở trạng thái: " + trip.getStatus());
        }

        trip.setStatus("ON_TRIP");
        trip.setDepartureTime(LocalDateTime.now());
        pickupTripRepository.save(trip);

        FleetVehicle vehicle = trip.getVehicle();
        if (vehicle != null) {
            vehicle.setStatus("ON_TRIP");
            fleetVehicleRepository.save(vehicle);
        }

        FleetDriver driver = trip.getDriver();
        if (driver != null) {
            driver.setStatus("ON_TRIP");
            fleetDriverRepository.save(driver);
        }

        b2bRealtimeService.notifyDispatchTripUpdated("TRIP_DEPARTED", trip.getId(), Map.of("tripId", trip.getId(), "tripCode", trip.getTripCode(), "status", trip.getStatus()));
        if (trip.getStops() != null) {
            for (PickupTripStop s : trip.getStops()) {
                if (s.getContract() != null) {
                    b2bRealtimeService.notifyContractUpdated("PICKUP_DISPATCHED", s.getContract().getContractCode(), Map.of("id", s.getContract().getId(), "status", s.getContract().getStatus()));
                }
            }
        }
        log.info("Trip {} departed, vehicle and driver set to ON_TRIP", trip.getTripCode());
        return trip;
    }

    /**
     * Giai đoạn 4.1: Tài xế đến điểm rẫy nhà vườn
     */
    @Transactional
    public PickupTripStop driverArriveStop(Long stopId) {
        PickupTripStop stop = pickupTripStopRepository.findById(stopId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy điểm dừng: " + stopId));

        stop.setStatus("ARRIVED");
        stop.setArrivedAt(LocalDateTime.now());
        PickupTripStop saved = pickupTripStopRepository.save(stop);

        b2bRealtimeService.notifyDispatchTripUpdated("STOP_ARRIVED", stop.getTrip().getId(), Map.of("stopId", saved.getId(), "tripId", stop.getTrip().getId(), "status", saved.getStatus()));
        if (stop.getContract() != null) {
            b2bRealtimeService.notifyContractUpdated("DRIVER_ARRIVED_FARM", stop.getContract().getContractCode(), Map.of("id", stop.getContract().getId(), "stopId", saved.getId()));
        }
        return saved;
    }

    /**
     * Giai đoạn 4.2: Tài xế kiểm đếm, chụp ảnh biên bản và bốc hàng lên xe
     */
    @Transactional
    public PickupTripStop driverLoadStop(Long stopId, DriverLoadStopRequest request) {
        PickupTripStop stop = pickupTripStopRepository.findById(stopId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy điểm dừng: " + stopId));

        stop.setStatus("LOADED");
        stop.setLoadedAt(LocalDateTime.now());
        stop.setActualWeightKg(request.getActualWeightKg());
        if (request.getActualPackageCount() != null) {
            stop.setActualPackageCount(request.getActualPackageCount());
        } else {
            stop.setActualPackageCount(stop.getPackageCount());
        }

        if (request.getHandoverPhotoUrl() != null) {
            stop.setHandoverPhotoUrl(request.getHandoverPhotoUrl());
        }
        if (request.getHandoverSignatureData() != null) {
            stop.setHandoverSignatureData(request.getHandoverSignatureData());
        }
        if (request.getNotes() != null) {
            stop.setNotes(request.getNotes());
        }

        PickupTripStop saved = pickupTripStopRepository.save(stop);

        // Chuyển hợp đồng sang IN_TRANSIT_HUB
        B2bContract contract = stop.getContract();
        if (contract != null) {
            contract.setStatus("IN_TRANSIT_HUB");
            contract.setFulfillmentStatus("IN_TRANSIT_HUB");
            contract.setFarmPickupSignedAt(LocalDateTime.now());
            if (contract.getFarmHandoverTemp() == null) {
                contract.setFarmHandoverTemp(new BigDecimal("18.0")); // Tiêu chuẩn xe lạnh
            }
            b2bContractRepository.save(contract);
            b2bRealtimeService.notifyContractUpdated("IN_TRANSIT_HUB", contract.getContractCode(), contract);
        }

        // Cập nhật trạng thái chuyến xe & tổng khối lượng thực tế
        PickupTrip trip = stop.getTrip();
        if (trip != null) {
            if ("ASSIGNED".equals(trip.getStatus()) || "ACKNOWLEDGED".equals(trip.getStatus())) {
                trip.setStatus("ON_TRIP");
                if (trip.getDepartureTime() == null) {
                    trip.setDepartureTime(LocalDateTime.now());
                }
            }
            // Tính lại actualTotalWeightKg của chuyến
            BigDecimal totalActualWeight = trip.getStops() != null
                    ? trip.getStops().stream()
                        .map(s -> s.getId().equals(stop.getId())
                                ? (request.getActualWeightKg() != null ? request.getActualWeightKg() : (s.getWeightKg() != null ? s.getWeightKg() : BigDecimal.ZERO))
                                : (s.getActualWeightKg() != null ? s.getActualWeightKg() : (s.getWeightKg() != null ? s.getWeightKg() : BigDecimal.ZERO)))
                        .reduce(BigDecimal.ZERO, BigDecimal::add)
                    : request.getActualWeightKg();
            trip.setActualTotalWeightKg(totalActualWeight);
            PickupTrip savedTrip = pickupTripRepository.save(trip);
            b2bRealtimeService.notifyDispatchTripUpdated("STOP_LOADED", trip.getId(), savedTrip);
        } else {
            b2bRealtimeService.notifyDispatchTripUpdated("STOP_LOADED", null, saved);
        }
        return saved;
    }

    /**
     * Giai đoạn 5: Báo cáo sự cố tại điểm lấy hàng
     */
    @Transactional
    public PickupTripStop driverReportIssue(Long stopId, DriverIssueReportRequest request) {
        PickupTripStop stop = pickupTripStopRepository.findById(stopId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy điểm dừng: " + stopId));

        stop.setStatus("ISSUE_REPORTED");
        stop.setIssueReason(request.getIssueReason());
        stop.setIssueNotes(request.getIssueNotes());
        PickupTripStop saved = pickupTripStopRepository.save(stop);

        String issueText = saved.getIssueReason() != null ? saved.getIssueReason() : "";
        b2bRealtimeService.notifyDispatchTripUpdated("STOP_ISSUE_REPORTED", stop.getTrip().getId(), Map.of("stopId", saved.getId(), "tripId", stop.getTrip().getId(), "issue", issueText));
        if (stop.getContract() != null) {
            b2bRealtimeService.notifyContractUpdated("DRIVER_ISSUE_REPORTED", stop.getContract().getContractCode(), Map.of("id", stop.getContract().getId(), "issue", issueText));
        }
        log.warn("Issue reported on stop {}: {}", stopId, request.getIssueReason());
        return saved;
    }

    /**
     * Giai đoạn 6: Xe lấy xong hàng và bắt đầu quay về Hub
     */
    @Transactional
    public PickupTrip driverReturnToHub(Long tripId) {
        PickupTrip trip = pickupTripRepository.findById(tripId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy chuyến xe: " + tripId));

        trip.setStatus("RETURNING");
        trip.setReturningTime(LocalDateTime.now());
        PickupTrip saved = pickupTripRepository.save(trip);

        // Chuyển các hợp đồng đã bốc hàng trong chuyến sang Mốc 4 (AT_HUB_QC) để Buyer & Farmer thấy ngay
        if (trip.getStops() != null) {
            for (PickupTripStop stop : trip.getStops()) {
                if ("LOADED".equalsIgnoreCase(stop.getStatus()) && stop.getContract() != null) {
                    B2bContract contract = stop.getContract();
                    contract.setStatus("AT_HUB_QC");
                    contract.setFulfillmentStatus("AT_HUB_QC");
                    b2bContractRepository.save(contract);
                    b2bRealtimeService.notifyContractUpdated("AT_HUB_QC", contract.getContractCode(), contract);
                }
            }
        }

        b2bRealtimeService.notifyDispatchTripUpdated("TRIP_RETURNING", trip.getId(), saved);
        log.info("Trip {} is returning to hub {}", trip.getTripCode(), trip.getWarehouse().getHubCode());
        return saved;
    }

    /**
     * Giai đoạn 7.1: Xe đến cổng kho trung chuyển
     */
    @Transactional
    public PickupTrip warehouseConfirmTruckArrival(Long tripId) {
        PickupTrip trip = pickupTripRepository.findById(tripId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy chuyến xe: " + tripId));

        trip.setStatus("ARRIVED_AT_WAREHOUSE");
        trip.setArrivedWarehouseTime(LocalDateTime.now());
        PickupTrip saved = pickupTripRepository.save(trip);

        b2bRealtimeService.notifyDispatchTripUpdated("TRIP_ARRIVED_AT_WAREHOUSE", trip.getId(), saved);
        return saved;
    }

    /**
     * Giai đoạn 7.2: Kho kiểm đếm, đối soát tải trọng, tiếp nhận và hoàn tất chuyến
     */
    @Transactional
    public PickupTrip warehouseCompleteReceiving(Long tripId, WarehouseReceivingCompleteRequest request) {
        PickupTrip trip = pickupTripRepository.findById(tripId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy chuyến xe: " + tripId));

        trip.setStatus("COMPLETED");
        trip.setCompletionTime(LocalDateTime.now());
        trip.setReceivingNotes(request.getReceivingNotes());
        if (request.getReceivingStaffId() != null) {
            trip.setReceivingStaffId(request.getReceivingStaffId());
        }

        BigDecimal calculatedTotalWeight = BigDecimal.ZERO;
        int calculatedPackages = 0;

        List<PickupTripStop> stops = pickupTripStopRepository.findByTripIdOrderByStopOrderAsc(trip.getId());

        // Duyệt qua từng stop và cập nhật hợp đồng nhập kho
        for (PickupTripStop stop : stops) {
            BigDecimal actualWeight = stop.getActualWeightKg() != null ? stop.getActualWeightKg() : stop.getWeightKg();
            calculatedTotalWeight = calculatedTotalWeight.add(actualWeight);
            calculatedPackages += (stop.getActualPackageCount() != null ? stop.getActualPackageCount() : stop.getPackageCount());

            B2bContract contract = stop.getContract();
            if (contract != null) {
                contract.setStatus("AT_HUB_QC");
                contract.setFulfillmentStatus("HUB_DELIVERED");
                contract.setHubInboundAt(LocalDateTime.now());
                contract.setQcStatus("PENDING_QC");

                // Kiểm tra xem có cấu hình kho mát / QC riêng từ request không
                WarehouseReceivingCompleteRequest.LotReceivingItem overrideItem = null;
                if (request.getLotItems() != null) {
                    overrideItem = request.getLotItems().stream()
                            .filter(i -> contract.getId().equals(i.getContractId()))
                            .findFirst()
                            .orElse(null);
                }

                BigDecimal recWeight = (overrideItem != null && overrideItem.getReceivedWeightKg() != null)
                        ? overrideItem.getReceivedWeightKg() : actualWeight;
                BigDecimal qualWeight = (overrideItem != null && overrideItem.getQualifiedWeightKg() != null)
                        ? overrideItem.getQualifiedWeightKg() : recWeight;
                BigDecimal rejWeight = (overrideItem != null && overrideItem.getRejectedWeightKg() != null)
                        ? overrideItem.getRejectedWeightKg() : recWeight.subtract(qualWeight);
                if (rejWeight.compareTo(BigDecimal.ZERO) < 0) {
                    rejWeight = BigDecimal.ZERO;
                }
                // Check constraint requirement: received_weight_kg = qualified_weight_kg + rejected_weight_kg
                if (qualWeight.add(rejWeight).compareTo(recWeight) != 0) {
                    qualWeight = recWeight.subtract(rejWeight);
                }

                if (overrideItem != null) {
                    String zone = (overrideItem.getColdZone() != null && !overrideItem.getColdZone().isBlank())
                            ? overrideItem.getColdZone() : "Zone A — Kho Lạnh Rau Ăn Lá & Thảo Mộc";
                    String rackBin = (overrideItem.getRackBin() != null && !overrideItem.getRackBin().isBlank() && !"BIN-IN-01".equalsIgnoreCase(overrideItem.getRackBin().trim()))
                            ? overrideItem.getRackBin() : "R-01 / BIN A-01";
                    contract.setHubWarehouseZone(zone);
                    contract.setHubRackBin(rackBin);
                } else {
                    contract.setHubWarehouseZone("Zone A — Kho Lạnh Rau Ăn Lá & Thảo Mộc");
                    contract.setHubRackBin("R-01 / BIN A-0" + Math.min(stop.getStopOrder(), 4));
                }

                if (trip.getWarehouse() != null && (contract.getHubName() == null || contract.getHubName().isBlank())) {
                    contract.setHubName(trip.getWarehouse().getHubName());
                }

                contract.setInboundNetWeightKg(recWeight);

                // Upsert hub_inspections: kiểm tra xem hợp đồng đã có record kiểm định chưa để tránh lỗi UNIQUE contract_id
                List<HubInspection> existingInspections = hubInspectionRepository.findByContractIdOrderByCreatedAtDesc(contract.getId());
                HubInspection inspection = existingInspections.isEmpty() ? null : existingInspections.get(0);
                String qcNoteText = (overrideItem != null && overrideItem.getQcNotes() != null)
                        ? overrideItem.getQcNotes()
                        : "Đã tiếp nhận kiểm đếm từ xe " + (trip.getVehicle() != null ? trip.getVehicle().getPlateNumber() : "");

                if (inspection == null) {
                    String insCode = "INS-" + System.currentTimeMillis() + "-" + (contract.getContractCode() != null ? contract.getContractCode().replace("#", "") : stop.getId());
                    inspection = HubInspection.builder()
                            .inspectionCode(insCode)
                            .contract(contract)
                            .coldRoomId(9L)
                            .qcStaffId(request.getReceivingStaffId() != null ? request.getReceivingStaffId() : 1L)
                            .receivedWeightKg(recWeight)
                            .qualifiedWeightKg(qualWeight)
                            .rejectedWeightKg(rejWeight)
                            .qcNote(qcNoteText)
                            .build();
                } else {
                    inspection.setReceivedWeightKg(recWeight);
                    inspection.setQualifiedWeightKg(qualWeight);
                    inspection.setRejectedWeightKg(rejWeight);
                    inspection.setQcNote(qcNoteText);
                }
                hubInspectionRepository.save(inspection);

                b2bContractRepository.save(contract);
                b2bRealtimeService.notifyContractUpdated("AT_HUB_QC", contract.getContractCode(), contract);
            }
        }

        trip.setActualTotalWeightKg(request.getActualTotalWeightKg() != null ? request.getActualTotalWeightKg() : calculatedTotalWeight);
        trip.setActualTotalPackages(request.getActualTotalPackages() != null ? request.getActualTotalPackages() : calculatedPackages);

        // Trả phương tiện và tài xế về AVAILABLE
        FleetVehicle vehicle = trip.getVehicle();
        if (vehicle != null && !"MAINTENANCE".equals(vehicle.getStatus())) {
            vehicle.setStatus("AVAILABLE");
            fleetVehicleRepository.save(vehicle);
        }

        FleetDriver driver = trip.getDriver();
        if (driver != null && !"OFF_DUTY".equals(driver.getStatus())) {
            driver.setStatus("AVAILABLE");
            fleetDriverRepository.save(driver);
        }

        PickupTrip completedTrip = pickupTripRepository.save(trip);
        b2bRealtimeService.notifyDispatchTripUpdated("TRIP_COMPLETED", trip.getId(), completedTrip);
        log.info("Warehouse completed receiving for trip {}. Vehicle and driver set back to AVAILABLE", trip.getTripCode());
        return completedTrip;
    }
}
