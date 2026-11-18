package com.btl.webbanrau.service;

import com.btl.webbanrau.dto.request.ConfirmOutboundTripRequest;
import com.btl.webbanrau.dto.response.EligibleOutboundContractDto;
import com.btl.webbanrau.model.*;
import com.btl.webbanrau.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.*;

@Service
@RequiredArgsConstructor
@Slf4j
public class OutboundDispatchService {

    private final OutboundDeliveryTripRepository outboundDeliveryTripRepository;
    private final OutboundDeliveryStopRepository outboundDeliveryStopRepository;
    private final WarehouseHubRepository warehouseHubRepository;
    private final FleetVehicleRepository fleetVehicleRepository;
    private final FleetDriverRepository fleetDriverRepository;
    private final B2bContractRepository b2bContractRepository;
    private final BuyerWarehouseRepository buyerWarehouseRepository;
    private final HubInspectionRepository hubInspectionRepository;
    private final B2bRealtimeService b2bRealtimeService;
    private final JdbcTemplate db;

    /**
     * Lấy danh sách hợp đồng đã đạt QC tại Hub, sẵn sàng xuất giao cho Buyer
     */
    @Transactional(readOnly = true)
    public List<EligibleOutboundContractDto> getEligibleContracts(Long hubId) {
        WarehouseHub hub = warehouseHubRepository.findById(hubId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy Hub: " + hubId));

        // Lấy tất cả hợp đồng ở trạng thái AT_HUB_QC hoặc QC_PASSED
        List<B2bContract> contracts = b2bContractRepository.findAll();
        List<EligibleOutboundContractDto> result = new ArrayList<>();

        for (B2bContract c : contracts) {
            // 1. Kiểm tra QC đã đạt
            boolean isQcPassed = "QC_PASSED".equalsIgnoreCase(c.getQcStatus()) || "PASSED".equalsIgnoreCase(c.getQcStatus());
            if (!isQcPassed) continue;

            // 2. Kiểm tra quy tắc ONCE: chưa có stop Outbound nào đang hoạt động
            if (outboundDeliveryStopRepository.existsActiveByContractId(c.getId())) {
                continue;
            }

            // 3. Kiểm tra Hub phụ trách
            if (!isContractAtHub(c, hub)) {
                continue;
            }

            // 4. Lấy khối lượng QC đạt
            BigDecimal qualifiedWeight = getContractQualifiedWeight(c);
            if (qualifiedWeight.compareTo(BigDecimal.ZERO) <= 0) {
                continue;
            }

            // Ước tính thể tích m3 và số kiện
            BigDecimal volumeM3 = qualifiedWeight.multiply(new BigDecimal("0.0035")).setScale(2, RoundingMode.HALF_UP);
            int packageCount = c.getPackageCount() != null && c.getPackageCount() > 0 ? c.getPackageCount() : qualifiedWeight.divide(new BigDecimal("25"), 0, RoundingMode.CEILING).intValue();

            // Tìm Buyer Warehouse mặc định nếu có
            Long buyerWarehouseId = null;
            if (c.getBuyer() != null) {
                List<Map<String, Object>> warehouses = db.queryForList(
                        "SELECT bw.id FROM buyer_warehouses bw JOIN buyer_profiles bp ON bp.id = bw.buyer_profile_id WHERE bp.user_id = ? ORDER BY bw.default_warehouse DESC LIMIT 1",
                        c.getBuyer().getId()
                );
                if (!warehouses.isEmpty()) {
                    buyerWarehouseId = ((Number) warehouses.get(0).get("id")).longValue();
                }
            }

            result.add(EligibleOutboundContractDto.builder()
                    .contractId(c.getId())
                    .contractCode(c.getContractCode())
                    .buyerId(c.getBuyer() != null ? c.getBuyer().getId() : null)
                    .buyerName(c.getBuyerName() != null ? c.getBuyerName() : (c.getBuyer() != null ? c.getBuyer().getFullName() : "Buyer"))
                    .buyerPhone(c.getBuyerPhone() != null ? c.getBuyerPhone() : (c.getBuyer() != null ? c.getBuyer().getPhone() : ""))
                    .deliveryAddress(c.getDeliveryAddress() != null ? c.getDeliveryAddress() : "Kho Buyer tiếp nhận")
                    .buyerWarehouseId(buyerWarehouseId)
                    .productName(c.getHarvestLot() != null ? c.getHarvestLot().getProductName() : "Nông sản")
                    .qualifiedWeightKg(qualifiedWeight)
                    .volumeM3(volumeM3)
                    .packageCount(packageCount)
                    .hubName(hub.getHubName())
                    .coldZone(c.getHubWarehouseZone() != null ? c.getHubWarehouseZone() : "Kho Mát A (15°C)")
                    .rackBin(c.getHubRackBin() != null ? c.getHubRackBin() : "BIN-IN-01")
                    .hubDeliveryDate(c.getHubDeliveryDate())
                    .qcStatus(c.getQcStatus())
                    .build());
        }

        return result;
    }

    /**
     * Xác nhận chuyến xe Outbound giao hàng đa điểm (MULTI) và đảm bảo ONCE per Contract
     */
    @Transactional
    public OutboundDeliveryTrip confirmOutboundTrip(Long hubId, ConfirmOutboundTripRequest request) {
        WarehouseHub hub = warehouseHubRepository.findById(hubId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy Hub: " + hubId));

        FleetVehicle vehicle = fleetVehicleRepository.findById(request.getVehicleId())
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy phương tiện: " + request.getVehicleId()));

        FleetDriver driver = fleetDriverRepository.findById(request.getDriverId())
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy tài xế: " + request.getDriverId()));

        if (!Objects.equals(vehicle.getWarehouse().getId(), hubId)) {
            throw new IllegalArgumentException("Phương tiện " + vehicle.getPlateNumber() + " không trực thuộc " + hub.getHubName());
        }
        if (!Objects.equals(driver.getWarehouse().getId(), hubId)) {
            throw new IllegalArgumentException("Tài xế " + driver.getFullName() + " không trực thuộc " + hub.getHubName());
        }

        BigDecimal totalWeight = BigDecimal.ZERO;
        BigDecimal totalVolume = BigDecimal.ZERO;
        List<B2bContract> contractsToUpdate = new ArrayList<>();

        // Kiểm tra từng hợp đồng
        for (ConfirmOutboundTripRequest.OutboundStopItem item : request.getStops()) {
            B2bContract contract = b2bContractRepository.findById(item.getContractId())
                    .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy hợp đồng: " + item.getContractId()));

            // ENFORCE ONCE: Chặn phân công lặp
            if (outboundDeliveryStopRepository.existsActiveByContractId(contract.getId())) {
                throw new IllegalStateException("Hợp đồng " + contract.getContractCode() + " đã được phân công chuyến Outbound trước đó (Quy tắc ONCE).");
            }

            BigDecimal qWeight = getContractQualifiedWeight(contract);
            totalWeight = totalWeight.add(qWeight);
            BigDecimal vol = qWeight.multiply(new BigDecimal("0.0035"));
            totalVolume = totalVolume.add(vol);
            contractsToUpdate.add(contract);
        }

        // Kiểm tra kép tải trọng và thể tích
        BigDecimal vehicleCapacity = vehicle.getCapacityKg() != null ? vehicle.getCapacityKg() : BigDecimal.ZERO;
        if (totalWeight.compareTo(vehicleCapacity) > 0) {
            throw new IllegalStateException("Tổng khối lượng (" + totalWeight + " kg) vượt quá tải trọng tối đa của xe " + vehicle.getPlateNumber() + " (" + vehicleCapacity + " kg)");
        }

        BigDecimal vehicleVolume = vehicle.getVolumeM3() != null ? vehicle.getVolumeM3() : BigDecimal.ZERO;
        if (totalVolume.compareTo(vehicleVolume) > 0) {
            throw new IllegalStateException("Tổng thể tích (" + totalVolume.setScale(2, RoundingMode.HALF_UP) + " m³) vượt quá thể tích thùng xe (" + vehicleVolume + " m³)");
        }

        // Tạo chuyến Outbound
        String tripCode = "OUT-" + hub.getHubCode() + "-" + (System.currentTimeMillis() % 100000);
        OutboundDeliveryTrip trip = OutboundDeliveryTrip.builder()
                .tripCode(tripCode)
                .hub(hub)
                .vehicle(vehicle)
                .driver(driver)
                .status("ASSIGNED")
                .totalLoadedWeightKg(totalWeight)
                .totalVolumeM3(totalVolume.setScale(2, RoundingMode.HALF_UP))
                .totalStops(request.getStops().size())
                .notes(request.getNotes())
                .createdBy("DISPATCHER")
                .build();

        OutboundDeliveryTrip savedTrip = outboundDeliveryTripRepository.save(trip);

        // Khóa xe và tài xế
        vehicle.setStatus("ASSIGNED");
        fleetVehicleRepository.save(vehicle);
        driver.setStatus("ASSIGNED");
        fleetDriverRepository.save(driver);

        // Tạo các điểm dừng (stops) và đồng bộ sang shipments
        for (int i = 0; i < request.getStops().size(); i++) {
            ConfirmOutboundTripRequest.OutboundStopItem item = request.getStops().get(i);
            B2bContract contract = contractsToUpdate.get(i);
            BigDecimal qWeight = getContractQualifiedWeight(contract);

            BuyerWarehouse bw = null;
            if (item.getBuyerWarehouseId() != null) {
                bw = buyerWarehouseRepository.findById(item.getBuyerWarehouseId()).orElse(null);
            }

            String address = item.getDeliveryAddress() != null && !item.getDeliveryAddress().isBlank()
                    ? item.getDeliveryAddress()
                    : (bw != null ? bw.getAddress() : contract.getDeliveryAddress());
            if (address == null || address.isBlank()) address = "Kho Buyer";

            String contactName = item.getContactName() != null ? item.getContactName() : contract.getBuyerName();
            String contactPhone = item.getContactPhone() != null ? item.getContactPhone() : contract.getBuyerPhone();

            OutboundDeliveryStop stop = OutboundDeliveryStop.builder()
                    .trip(savedTrip)
                    .contract(contract)
                    .buyerWarehouse(bw)
                    .stopSequence(item.getStopSequence() != null ? item.getStopSequence() : (i + 1))
                    .deliveryAddressSnapshot(address)
                    .contactNameSnapshot(contactName)
                    .contactPhoneSnapshot(contactPhone)
                    .expectedWeightKg(qWeight)
                    .status("ASSIGNED")
                    .build();

            outboundDeliveryStopRepository.save(stop);

            // Cập nhật hợp đồng
            contract.setStatus("OUTBOUND_DISPATCHED");
            contract.setOutboundTruckPlate(vehicle.getPlateNumber());
            contract.setOutboundDriverName(driver.getFullName());
            contract.setOutboundDispatchedAt(LocalDateTime.now());
            contract.setOutboundManifestCode(savedTrip.getTripCode());
            b2bContractRepository.save(contract);

            // Đồng bộ hồ sơ shipments tương thích
            syncLegacyShipmentRecord(contract.getId(), vehicle.getId(), driver.getId(), qWeight);
        }

        b2bRealtimeService.notifyDispatchTripUpdated("OUTBOUND_TRIP_CONFIRMED", savedTrip.getId(), savedTrip);
        log.info("Confirmed outbound delivery trip {} with {} stops", savedTrip.getTripCode(), savedTrip.getTotalStops());
        return savedTrip;
    }

    /**
     * Lấy danh sách các chuyến Outbound theo Hub
     */
    @Transactional(readOnly = true)
    public List<OutboundDeliveryTrip> getTripsByHub(Long hubId) {
        if (hubId == null) {
            return outboundDeliveryTripRepository.findAll().stream()
                    .sorted((a, b) -> b.getId().compareTo(a.getId()))
                    .toList();
        }
        return outboundDeliveryTripRepository.findByHubIdOrderByCreatedAtDesc(hubId);
    }

    /**
     * Chi tiết chuyến Outbound
     */
    @Transactional(readOnly = true)
    public OutboundDeliveryTrip getTripDetail(Long tripId) {
        return outboundDeliveryTripRepository.findById(tripId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy chuyến Outbound: " + tripId));
    }

    /**
     * Lấy danh sách các đơn hàng / điểm dừng đã hoàn tất giao hàng (BUYER_CONFIRMED, DELIVERED, SETTLED)
     */
    @Transactional(readOnly = true)
    public List<OutboundDeliveryStop> getCompletedDeliveries(Long hubId) {
        List<OutboundDeliveryStop> all = outboundDeliveryStopRepository.findAll();
        return all.stream()
                .filter(s -> hubId == null || (s.getTrip() != null && s.getTrip().getHub() != null && hubId.equals(s.getTrip().getHub().getId())))
                .filter(s -> "BUYER_CONFIRMED".equals(s.getStatus()) 
                        || "DELIVERED".equals(s.getStatus()) 
                        || (s.getContract() != null && ("DELIVERED".equals(s.getContract().getStatus()) || "SETTLED".equals(s.getContract().getStatus()))))
                .sorted((a, b) -> {
                    LocalDateTime t1 = a.getBuyerConfirmedAt() != null ? a.getBuyerConfirmedAt() : a.getCreatedAt();
                    LocalDateTime t2 = b.getBuyerConfirmedAt() != null ? b.getBuyerConfirmedAt() : b.getCreatedAt();
                    if (t1 != null && t2 != null) return t2.compareTo(t1);
                    return b.getId().compareTo(a.getId());
                })
                .toList();
    }

    /**
     * Hủy chuyến Outbound và rollback trạng thái tài nguyên
     */
    @Transactional
    public void cancelOutboundTrip(Long tripId, String reason) {
        OutboundDeliveryTrip trip = outboundDeliveryTripRepository.findById(tripId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy chuyến: " + tripId));

        if (!"ASSIGNED".equals(trip.getStatus())) {
            throw new IllegalStateException("Chỉ có thể hủy chuyến ở trạng thái ASSIGNED (Hiện tại: " + trip.getStatus() + ")");
        }

        trip.setStatus("CANCELLED");
        trip.setNotes((trip.getNotes() != null ? trip.getNotes() + " | " : "") + "Lý do hủy: " + reason);
        outboundDeliveryTripRepository.save(trip);

        // Giải phóng xe và tài xế
        FleetVehicle vehicle = trip.getVehicle();
        if (vehicle != null && "ASSIGNED".equals(vehicle.getStatus())) {
            vehicle.setStatus("AVAILABLE");
            fleetVehicleRepository.save(vehicle);
        }

        FleetDriver driver = trip.getDriver();
        if (driver != null && "ASSIGNED".equals(driver.getStatus())) {
            driver.setStatus("AVAILABLE");
            fleetDriverRepository.save(driver);
        }

        // Rollback các stop và hợp đồng
        List<OutboundDeliveryStop> stops = outboundDeliveryStopRepository.findByTripIdOrderByStopSequenceAsc(trip.getId());
        for (OutboundDeliveryStop s : stops) {
            s.setStatus("CANCELLED");
            outboundDeliveryStopRepository.save(s);

            B2bContract contract = s.getContract();
            if (contract != null) {
                contract.setStatus("AT_HUB_QC");
                contract.setOutboundTruckPlate(null);
                contract.setOutboundDriverName(null);
                contract.setOutboundDispatchedAt(null);
                contract.setOutboundManifestCode(null);
                b2bContractRepository.save(contract);
            }
        }

        b2bRealtimeService.notifyDispatchTripUpdated("OUTBOUND_TRIP_CANCELLED", trip.getId(), trip);
        log.info("Cancelled outbound trip {}", trip.getTripCode());
    }

    private BigDecimal getContractQualifiedWeight(B2bContract c) {
        List<HubInspection> inspections = hubInspectionRepository.findByContractIdOrderByCreatedAtDesc(c.getId());
        if (!inspections.isEmpty() && inspections.get(0).getQualifiedWeightKg() != null) {
            return inspections.get(0).getQualifiedWeightKg();
        }
        if (c.getInboundNetWeightKg() != null && c.getInboundNetWeightKg().compareTo(BigDecimal.ZERO) > 0) {
            return c.getInboundNetWeightKg();
        }
        if (c.getActualHarvestWeightKg() != null && c.getActualHarvestWeightKg().compareTo(BigDecimal.ZERO) > 0) {
            return c.getActualHarvestWeightKg();
        }
        return c.getOfferedWeightKg() != null ? c.getOfferedWeightKg() : BigDecimal.ZERO;
    }

    private boolean isContractAtHub(B2bContract c, WarehouseHub hub) {
        if (c.getHubName() != null && (c.getHubName().equalsIgnoreCase(hub.getHubName()) || c.getHubName().contains(hub.getHubName()))) {
            return true;
        }
        String hubCode = hub.getHubCode() != null ? hub.getHubCode().toUpperCase() : "";
        if (hubCode.contains("DUC-TRONG")) {
            String farm = c.getFarmPickupAddress() != null ? c.getFarmPickupAddress().toLowerCase() : "";
            if (farm.contains("đà lạt") || farm.contains("lâm đồng") || farm.contains("đức trọng") || farm.contains("phú yên")) {
                return true;
            }
        }
        return hub.getId() != null && hub.getId().equals(2L);
    }

    private void syncLegacyShipmentRecord(Long contractId, Long truckId, Long driverId, BigDecimal loadedWeight) {
        try {
            Long validColdTruckId = db.queryForList("SELECT id FROM cold_assets WHERE asset_type = 'REFRIGERATED_TRUCK' LIMIT 1").stream()
                    .findFirst().map(m -> ((Number) m.get("id")).longValue()).orElse(11L);

            Long validDriverUserId = db.queryForList("SELECT id FROM users WHERE email = 'driver@honafresh.vn' OR id = 7 LIMIT 1").stream()
                    .findFirst().map(m -> ((Number) m.get("id")).longValue()).orElse(1L);

            var existing = db.queryForList("SELECT id FROM shipments WHERE contract_id = ?", contractId);
            if (existing.isEmpty()) {
                String code = "SHP-" + (System.currentTimeMillis() % 100000);
                // Giữ truck_id và driver_id tương thích khóa ngoại cold_assets và users
                db.update("INSERT INTO shipments(shipment_code, contract_id, truck_id, driver_id, loaded_weight_kg, status) VALUES (?, ?, ?, ?, ?, 'SCHEDULED')",
                        code, contractId, validColdTruckId, validDriverUserId, loadedWeight);
            } else {
                db.update("UPDATE shipments SET truck_id = ?, driver_id = ?, loaded_weight_kg = ?, status = 'SCHEDULED' WHERE contract_id = ?",
                        validColdTruckId, validDriverUserId, loadedWeight, contractId);
            }
        } catch (Exception ex) {
            log.warn("Error syncing legacy shipment row for contract {}: {}", contractId, ex.getMessage());
        }
    }
}
