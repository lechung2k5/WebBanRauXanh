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

            // 1b. Loại trừ đơn PA3 (Buyer tự tới kho HoNa lấy hàng) khỏi điều phối xe giao hàng Outbound
            String rawOpt = (c.getRfq() != null && c.getRfq().getShippingOption() != null)
                    ? c.getRfq().getShippingOption().trim().toUpperCase()
                    : "";
            boolean isSelfPickup = rawOpt.equals("PA3") || rawOpt.equals("FARM_PICKUP")
                    || rawOpt.equals("BUYER_SELF_TRANSPORT") || rawOpt.contains("PICKUP") || rawOpt.contains("SELF");
            if (isSelfPickup) continue;

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
                    .deliveryAddress(resolveBuyerDeliveryAddress(c))
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

            String rawItemAddr = item.getDeliveryAddress();
            if (rawItemAddr != null && (rawItemAddr.isBlank() || rawItemAddr.equalsIgnoreCase("Kho Buyer tiếp nhận") || rawItemAddr.equalsIgnoreCase("Kho Buyer"))) {
                rawItemAddr = null;
            }
            String address = rawItemAddr != null
                    ? rawItemAddr
                    : (bw != null && bw.getAddress() != null && !bw.getAddress().isBlank()
                        ? bw.getAddress()
                        : resolveBuyerDeliveryAddress(contract));

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

            // Cập nhật hợp đồng: đã xếp xe sẵn sàng tại kho, CHỜ XUẤT BẾN (chỉ chuyển IN_TRANSIT khi bấm Xuất Bến)
            contract.setStatus("READY_OUTBOUND");
            contract.setOutboundTruckPlate(vehicle.getPlateNumber());
            contract.setOutboundDriverName(driver.getFullName());
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
        List<OutboundDeliveryTrip> trips = (hubId == null)
                ? outboundDeliveryTripRepository.findAll().stream().sorted((a, b) -> b.getId().compareTo(a.getId())).toList()
                : outboundDeliveryTripRepository.findByHubIdOrderByCreatedAtDesc(hubId);
        // Khởi tạo lazy harvestLot trong transaction để OutboundDeliveryStop trả đúng productName
        for (OutboundDeliveryTrip t : trips) {
            if (t.getStops() != null) {
                for (OutboundDeliveryStop s : t.getStops()) {
                    if (s.getContract() != null && s.getContract().getHarvestLot() != null) {
                        s.getContract().getHarvestLot().getProductName();
                    }
                }
            }
        }
        return trips;
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
        List<OutboundDeliveryStop> result = all.stream()
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
        for (OutboundDeliveryStop s : result) {
            if (s.getContract() != null && s.getContract().getHarvestLot() != null) {
                s.getContract().getHarvestLot().getProductName();
            }
        }
        return result;
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

    /**
     * Tối ưu giao hàng: Tự động ghép các đơn QC_PASSED vào xe phù hợp sức chứa (kg & m³).
     * Nếu xe đang bận giao chuyến khác (ON_TRIP/ASSIGNED), chuyển sang xe rảnh khác hoặc xếp vào Chuyến sau (Chờ xe về).
     */
    @Transactional(readOnly = true)
    public Map<String, Object> generateAutoDispatchPlan(Long hubId) {
        WarehouseHub hub = warehouseHubRepository.findById(hubId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy Hub: " + hubId));

        List<EligibleOutboundContractDto> eligible = new ArrayList<>(getEligibleContracts(hubId));
        eligible.sort((a, b) -> {
            if (a.getHubDeliveryDate() != null && b.getHubDeliveryDate() != null) {
                int cmp = a.getHubDeliveryDate().compareTo(b.getHubDeliveryDate());
                if (cmp != 0) return cmp;
            } else if (a.getHubDeliveryDate() != null) {
                return -1;
            } else if (b.getHubDeliveryDate() != null) {
                return 1;
            }
            BigDecimal wa = a.getQualifiedWeightKg() != null ? a.getQualifiedWeightKg() : BigDecimal.ZERO;
            BigDecimal wb = b.getQualifiedWeightKg() != null ? b.getQualifiedWeightKg() : BigDecimal.ZERO;
            return wb.compareTo(wa);
        });

        List<FleetVehicle> allVehicles = fleetVehicleRepository.findByWarehouseIdOrderByPlateNumberAsc(hubId)
                .stream()
                .filter(v -> !"MAINTENANCE".equalsIgnoreCase(v.getStatus()))
                .toList();

        List<FleetVehicle> vehiclePoolAsc = allVehicles.stream()
                .filter(v -> "AVAILABLE".equalsIgnoreCase(v.getStatus()))
                .sorted(Comparator
                        .comparing((FleetVehicle v) -> v.getCapacityKg() != null ? v.getCapacityKg() : BigDecimal.ZERO)
                        .thenComparing(v -> v.getVolumeM3() != null ? v.getVolumeM3() : BigDecimal.ZERO))
                .collect(java.util.stream.Collectors.toCollection(ArrayList::new));

        List<FleetVehicle> busyVehicles = allVehicles.stream()
                .filter(v -> "ON_TRIP".equalsIgnoreCase(v.getStatus()) || "ASSIGNED".equalsIgnoreCase(v.getStatus()))
                .sorted((a, b) -> {
                    BigDecimal ca = a.getCapacityKg() != null ? a.getCapacityKg() : BigDecimal.ZERO;
                    BigDecimal cb = b.getCapacityKg() != null ? b.getCapacityKg() : BigDecimal.ZERO;
                    return cb.compareTo(ca);
                })
                .toList();

        Set<String> nonDriverRoles = Set.of("QC_TECH", "WH_STAFF", "DISPATCH", "ACCOUNTANT");
        List<FleetDriver> driverPool = fleetDriverRepository
                .findByWarehouseIdAndStatusOrderByExperienceYearsDesc(hubId, "AVAILABLE")
                .stream()
                .filter(d -> d.getLicenseClass() == null || !nonDriverRoles.contains(d.getLicenseClass().trim().toUpperCase()))
                .collect(java.util.stream.Collectors.toCollection(ArrayList::new));

        List<EligibleOutboundContractDto> remaining = new ArrayList<>(eligible);
        List<Map<String, Object>> readyTrips = new ArrayList<>();
        List<Map<String, Object>> queuedTrips = new ArrayList<>();

        while (!remaining.isEmpty() && !vehiclePoolAsc.isEmpty() && !driverPool.isEmpty()) {
            BigDecimal totalRemainingKg = remaining.stream()
                    .map(c -> c.getQualifiedWeightKg() != null ? c.getQualifiedWeightKg() : BigDecimal.ZERO)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);
            BigDecimal totalRemainingM3 = remaining.stream()
                    .map(c -> c.getVolumeM3() != null ? c.getVolumeM3() : BigDecimal.ZERO)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);

            // Best-Fit:
            // 1. Tìm xe NHỎ NHẤT chứa được toàn bộ các đơn còn lại
            FleetVehicle selectedVehicle = null;
            for (FleetVehicle v : vehiclePoolAsc) {
                BigDecimal capKg = v.getCapacityKg() != null ? v.getCapacityKg() : BigDecimal.ZERO;
                BigDecimal capM3 = v.getVolumeM3() != null ? v.getVolumeM3() : new BigDecimal("999");
                if (capKg.compareTo(totalRemainingKg) >= 0 && capM3.compareTo(totalRemainingM3) >= 0) {
                    selectedVehicle = v;
                    break;
                }
            }
            // 2. Nếu không xe nào chở hết một lần, chọn xe LỚN NHẤT để tối thiểu số chuyến
            if (selectedVehicle == null) {
                for (int i = vehiclePoolAsc.size() - 1; i >= 0; i--) {
                    FleetVehicle v = vehiclePoolAsc.get(i);
                    BigDecimal capKg = v.getCapacityKg() != null ? v.getCapacityKg() : BigDecimal.ZERO;
                    BigDecimal capM3 = v.getVolumeM3() != null ? v.getVolumeM3() : new BigDecimal("999");
                    boolean fitsAny = remaining.stream().anyMatch(c -> {
                        BigDecimal w = c.getQualifiedWeightKg() != null ? c.getQualifiedWeightKg() : BigDecimal.ZERO;
                        BigDecimal vol = c.getVolumeM3() != null ? c.getVolumeM3() : BigDecimal.ZERO;
                        return w.compareTo(capKg) <= 0 && vol.compareTo(capM3) <= 0;
                    });
                    if (fitsAny) {
                        selectedVehicle = v;
                        break;
                    }
                }
            }

            if (selectedVehicle == null) break;
            vehiclePoolAsc.remove(selectedVehicle);

            BigDecimal capKg = selectedVehicle.getCapacityKg() != null ? selectedVehicle.getCapacityKg() : BigDecimal.ZERO;
            BigDecimal capM3 = selectedVehicle.getVolumeM3() != null ? selectedVehicle.getVolumeM3() : new BigDecimal("999");

            List<EligibleOutboundContractDto> packed = new ArrayList<>();
            BigDecimal usedKg = BigDecimal.ZERO;
            BigDecimal usedM3 = BigDecimal.ZERO;

            Iterator<EligibleOutboundContractDto> it = remaining.iterator();
            while (it.hasNext()) {
                EligibleOutboundContractDto c = it.next();
                BigDecimal w = c.getQualifiedWeightKg() != null ? c.getQualifiedWeightKg() : BigDecimal.ZERO;
                BigDecimal vol = c.getVolumeM3() != null ? c.getVolumeM3() : BigDecimal.ZERO;
                if (usedKg.add(w).compareTo(capKg) <= 0 && usedM3.add(vol).compareTo(capM3) <= 0) {
                    packed.add(c);
                    usedKg = usedKg.add(w);
                    usedM3 = usedM3.add(vol);
                    it.remove();
                }
            }

            if (!packed.isEmpty()) {
                // Sắp xếp thứ tự điểm dừng theo địa chỉ giao để gom cung đường gọn hơn
                packed.sort(Comparator.comparing(c -> Objects.toString(c.getDeliveryAddress(), ""), String.CASE_INSENSITIVE_ORDER));
                FleetDriver drv = driverPool.remove(0);
                int utilPct = capKg.compareTo(BigDecimal.ZERO) > 0
                        ? usedKg.multiply(BigDecimal.valueOf(100)).divide(capKg, 0, RoundingMode.HALF_UP).intValue()
                        : 0;

                Map<String, Object> tripPlan = new LinkedHashMap<>();
                tripPlan.put("vehicleId", selectedVehicle.getId());
                tripPlan.put("plateNumber", selectedVehicle.getPlateNumber());
                tripPlan.put("vehicleModel", selectedVehicle.getVehicleModel());
                tripPlan.put("capacityKg", capKg);
                tripPlan.put("volumeM3", capM3);
                tripPlan.put("driverId", drv.getId());
                tripPlan.put("driverName", drv.getFullName());
                tripPlan.put("driverPhone", drv.getPhone());
                tripPlan.put("totalWeightKg", usedKg);
                tripPlan.put("totalVolumeM3", usedM3.setScale(2, RoundingMode.HALF_UP));
                tripPlan.put("utilizationPct", Math.min(100, utilPct));
                tripPlan.put("stops", packed);
                readyTrips.add(tripPlan);
            }
        }

        // Các đơn còn lại: nếu hết xe rảnh / tài xế rảnh -> xếp dự kiến vào chuyến sau (chờ xe đang giao quay về)
        for (FleetVehicle v : busyVehicles) {
            if (remaining.isEmpty()) break;

            BigDecimal capKg = v.getCapacityKg() != null ? v.getCapacityKg() : BigDecimal.ZERO;
            BigDecimal capM3 = v.getVolumeM3() != null ? v.getVolumeM3() : new BigDecimal("999");

            List<EligibleOutboundContractDto> packed = new ArrayList<>();
            BigDecimal usedKg = BigDecimal.ZERO;
            BigDecimal usedM3 = BigDecimal.ZERO;

            Iterator<EligibleOutboundContractDto> it = remaining.iterator();
            while (it.hasNext()) {
                EligibleOutboundContractDto c = it.next();
                BigDecimal w = c.getQualifiedWeightKg() != null ? c.getQualifiedWeightKg() : BigDecimal.ZERO;
                BigDecimal vol = c.getVolumeM3() != null ? c.getVolumeM3() : BigDecimal.ZERO;
                if (usedKg.add(w).compareTo(capKg) <= 0 && usedM3.add(vol).compareTo(capM3) <= 0) {
                    packed.add(c);
                    usedKg = usedKg.add(w);
                    usedM3 = usedM3.add(vol);
                    it.remove();
                }
            }

            if (!packed.isEmpty()) {
                Map<String, Object> queuedPlan = new LinkedHashMap<>();
                queuedPlan.put("vehicleId", v.getId());
                queuedPlan.put("plateNumber", v.getPlateNumber());
                queuedPlan.put("vehicleModel", v.getVehicleModel());
                queuedPlan.put("capacityKg", capKg);
                queuedPlan.put("currentVehicleStatus", v.getStatus());
                queuedPlan.put("estimatedReason", "Xe đang thực hiện chuyến khác — dự kiến tự động ghép chuyến sau khi xe về kho");
                queuedPlan.put("totalWeightKg", usedKg);
                queuedPlan.put("totalVolumeM3", usedM3.setScale(2, RoundingMode.HALF_UP));
                queuedPlan.put("stops", packed);
                queuedTrips.add(queuedPlan);
            }
        }

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("hubId", hub.getId());
        result.put("hubName", hub.getHubName());
        result.put("totalEligible", eligible.size());
        result.put("readyTrips", readyTrips);
        result.put("queuedTrips", queuedTrips);
        result.put("unassignedContracts", remaining);
        return result;
    }

    @Transactional
    public Map<String, Object> executeAutoDispatch(Long hubId, List<ConfirmOutboundTripRequest> requests) {
        if (requests == null || requests.isEmpty()) {
            throw new IllegalArgumentException("Không có chuyến xe nào để xác nhận.");
        }
        List<String> tripCodes = new ArrayList<>();
        for (ConfirmOutboundTripRequest req : requests) {
            OutboundDeliveryTrip created = confirmOutboundTrip(hubId, req);
            tripCodes.add(created.getTripCode());
        }
        Map<String, Object> res = new LinkedHashMap<>();
        res.put("createdCount", tripCodes.size());
        res.put("tripCodes", tripCodes);
        return res;
    }

    private String resolveBuyerDeliveryAddress(B2bContract c) {
        if (c == null) return "Địa chỉ Thương lái";
        if (c.getBuyer() != null && c.getBuyer().getWarehouseAddress() != null && !c.getBuyer().getWarehouseAddress().isBlank()) {
            return c.getBuyer().getWarehouseAddress().trim();
        }
        if (c.getDeliveryAddress() != null && !c.getDeliveryAddress().isBlank()) {
            return c.getDeliveryAddress().trim();
        }
        if (c.getRfq() != null && c.getRfq().getHubLocation() != null && !c.getRfq().getHubLocation().isBlank()) {
            return c.getRfq().getHubLocation().trim();
        }
        if (c.getBuyer() != null && c.getBuyer().getAddress() != null && !c.getBuyer().getAddress().isBlank()) {
            return c.getBuyer().getAddress().trim();
        }
        return "Địa chỉ Thương lái";
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
