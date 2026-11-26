package com.btl.webbanrau.service;

import com.btl.webbanrau.dto.request.AutoOptimizeRequest;
import com.btl.webbanrau.dto.request.CancelTripRequest;
import com.btl.webbanrau.dto.request.ConfirmTripRequest;
import com.btl.webbanrau.dto.response.DispatchOptimizationResultDto;
import com.btl.webbanrau.dto.response.DispatchOptimizationResultDto.ProposedStopDto;
import com.btl.webbanrau.dto.response.DispatchOptimizationResultDto.ProposedTripDto;
import com.btl.webbanrau.dto.response.DispatchOptimizationResultDto.UnassignedContractDto;
import com.btl.webbanrau.model.*;
import com.btl.webbanrau.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.*;

@Service
@RequiredArgsConstructor
@Slf4j
public class InboundDispatchOptimizationService {

    private final JdbcTemplate jdbcTemplate;
    private final WarehouseHubRepository warehouseHubRepository;
    private final FleetVehicleRepository fleetVehicleRepository;
    private final FleetDriverRepository fleetDriverRepository;
    private final PickupTripRepository pickupTripRepository;
    private final PickupTripStopRepository pickupTripStopRepository;
    private final B2bContractRepository b2bContractRepository;
    private final B2bRealtimeService b2bRealtimeService;

    /**
     * 1. Lấy danh sách hợp đồng chờ điều phối lấy hàng (Gating từ duyệt đóng gói)
     */
    public List<Map<String, Object>> getWaitingLots(Long warehouseId) {
        WarehouseHub hub = null;
        if (warehouseId != null) {
            hub = warehouseHubRepository.findById(warehouseId).orElse(null);
        }

        String sql = """
            SELECT c.id, c.contract_code, c.lot_id, c.status, c.fulfillment_status,
                   c.packaging_approved, c.pickup_truck_plate, c.hub_name,
                   c.farm_pickup_address, c.actual_harvest_weight_kg, c.offered_weight_kg,
                   c.package_count, c.package_type, c.created_at,
                   hl.product_name, hl.category,
                   u.full_name as farmer_name, u.phone as farmer_phone,
                   u.company_name as farmer_company
            FROM b2b_contracts c
            LEFT JOIN harvest_lots hl ON c.lot_id = hl.id
            LEFT JOIN users u ON c.farmer_id = u.id
            WHERE c.packaging_approved = TRUE
              AND c.pickup_truck_plate IS NULL
              AND (c.status = 'PACKAGING_APPROVED' OR c.fulfillment_status = 'PACKAGING_APPROVED')
            ORDER BY c.created_at ASC
        """;

        List<Map<String, Object>> rows = jdbcTemplate.queryForList(sql);
        List<Map<String, Object>> result = new ArrayList<>();

        for (Map<String, Object> r : rows) {
            String contractHub = Objects.toString(r.get("hub_name"), "").trim();
            String address = Objects.toString(r.get("farm_pickup_address"), "").trim();

            if (hub != null && !isLotBelongingToHub(hub, contractHub, address)) {
                continue;
            }

            Map<String, Object> item = new HashMap<>(r);
            BigDecimal weight = r.get("actual_harvest_weight_kg") != null
                    ? new BigDecimal(r.get("actual_harvest_weight_kg").toString())
                    : (r.get("offered_weight_kg") != null ? new BigDecimal(r.get("offered_weight_kg").toString()) : new BigDecimal("100.0"));
            Integer packages = r.get("package_count") != null ? ((Number) r.get("package_count")).intValue()
                    : Math.max(1, weight.divide(BigDecimal.valueOf(20), 0, RoundingMode.CEILING).intValue());
            String packageType = Objects.toString(r.get("package_type"), "THÙNG NHỰA 20KG");
            BigDecimal volume = calculateContractVolume(weight, packages, packageType);

            item.put("computedWeightKg", weight);
            item.put("computedVolumeM3", volume);
            item.put("computedPackageCount", packages);
            item.put("computedPackageType", packageType);
            result.add(item);
        }

        return result;
    }

    /**
     * 2. Tính toán thể tích dựa trên số kiện, quy cách và tỷ trọng
     */
    public BigDecimal calculateContractVolume(BigDecimal weightKg, Integer packageCount, String packageType) {
        if (packageCount != null && packageCount > 0 && packageType != null) {
            String pt = packageType.toUpperCase();
            if (pt.contains("THÙNG") || pt.contains("CARTON") || pt.contains("BOX")) {
                return BigDecimal.valueOf(packageCount * 0.045).setScale(2, RoundingMode.HALF_UP);
            } else if (pt.contains("SỌT") || pt.contains("RỔ") || pt.contains("CRATE")) {
                return BigDecimal.valueOf(packageCount * 0.060).setScale(2, RoundingMode.HALF_UP);
            } else if (pt.contains("BAO") || pt.contains("BAG")) {
                return BigDecimal.valueOf(packageCount * 0.050).setScale(2, RoundingMode.HALF_UP);
            }
        }
        if (weightKg != null && weightKg.compareTo(BigDecimal.ZERO) > 0) {
            return weightKg.divide(BigDecimal.valueOf(250), 2, RoundingMode.HALF_UP);
        }
        return BigDecimal.valueOf(0.50);
    }

    /**
     * 3. Ma trận kiểm tra hạng giấy phép lái xe linh hoạt (Bằng cũ + Luật 2024 hiệu lực 2025)
     */
    public boolean isDriverEligible(String licenseClass, BigDecimal capacityKg) {
        if (licenseClass == null || licenseClass.isBlank() || capacityKg == null) {
            return false;
        }
        String lc = licenseClass.trim().toUpperCase();
        double tons = capacityKg.doubleValue() / 1000.0;

        // Giấy phép theo phân loại cũ (trước 2025)
        if ("B2".equals(lc)) return tons <= 3.5;
        if ("C".equals(lc)) return true;
        if ("FC".equals(lc)) return true;

        // Giấy phép theo Luật Trật tự ATGT Đường bộ 2024 (hiệu lực 01/01/2025)
        if ("B".equals(lc)) return tons <= 3.5;
        if ("C1".equals(lc)) return tons <= 7.5;
        if ("CE".equals(lc)) return true;

        return false;
    }

    /**
     * Kiểm tra lô hàng có thuộc phạm vi quản lý gom hàng của Hub hay không (Ưu tiên theo vị trí rẫy / vườn)
     */
    public boolean isLotBelongingToHub(WarehouseHub hub, String contractHub, String farmAddress) {
        if (hub == null) return true;
        String hubCode = hub.getHubCode() != null ? hub.getHubCode().toUpperCase() : "";
        String textToMatch = ((farmAddress != null ? farmAddress : "") + " " + (contractHub != null ? contractHub : "")).toLowerCase();

        switch (hubCode) {
            case "HUB-DUC-TRONG":
                boolean isOtherHub = textToMatch.contains("củ chi") || textToMatch.contains("cái bè") || textToMatch.contains("buôn hồ") || textToMatch.contains("hà nội");
                if (isOtherHub && !textToMatch.contains("đà lạt") && !textToMatch.contains("lâm đồng") && !textToMatch.contains("đức trọng") && !textToMatch.contains("xuân hương")) {
                    return false;
                }
                return true; // Mặc định Hub Lâm Đồng tiếp nhận các lô nông sản rẫy vùng cao hoặc chưa phân bổ
            case "HUB-CU-CHI":
                return textToMatch.contains("củ chi") || textToMatch.contains("tân an hội") || textToMatch.contains("bình dương")
                        || textToMatch.contains("đồng nai") || textToMatch.contains("tây ninh") || textToMatch.contains("hub-cu-chi");
            case "HUB-CAI-BE":
                return textToMatch.contains("cái bè") || textToMatch.contains("tiền giang") || textToMatch.contains("đồng tháp")
                        || textToMatch.contains("bến tre") || textToMatch.contains("vĩnh long") || textToMatch.contains("cần thơ")
                        || textToMatch.contains("đbscl") || textToMatch.contains("hub-cai-be");
            case "HUB-BUON-HO":
                return textToMatch.contains("buôn hồ") || textToMatch.contains("đắk lắk") || textToMatch.contains("dak lak")
                        || textToMatch.contains("buôn ma thuột") || textToMatch.contains("đoàn kết") || textToMatch.contains("hub-buon-ho");
            case "HUB-HA-NOI":
                return textToMatch.contains("hà nội") || textToMatch.contains("sài đồng") || textToMatch.contains("long biên")
                        || textToMatch.contains("bắc bộ") || textToMatch.contains("bắc ninh") || textToMatch.contains("mộc châu")
                        || textToMatch.contains("quảng ninh") || textToMatch.contains("hub-ha-noi");
            default:
                return true;
        }
    }

    /**
     * 4. Thuật toán tự động đề xuất điều phối tối ưu (In-memory, không ghi DB)
     */
    public DispatchOptimizationResultDto autoOptimize(AutoOptimizeRequest request) {
        WarehouseHub hub = warehouseHubRepository.findById(request.getWarehouseId())
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy Hub: " + request.getWarehouseId()));

        List<Map<String, Object>> waitingLots = getWaitingLots(hub.getId());
        if (request.getContractIds() != null && !request.getContractIds().isEmpty()) {
            Set<Long> filterIds = new HashSet<>(request.getContractIds());
            waitingLots = waitingLots.stream()
                    .filter(lot -> filterIds.contains(((Number) lot.get("id")).longValue()))
                    .toList();
        }

        List<FleetVehicle> availableVehicles = fleetVehicleRepository
                .findByWarehouseIdAndStatusOrderByCapacityKgDesc(hub.getId(), "AVAILABLE");
        List<FleetDriver> availableDrivers = fleetDriverRepository
                .findByWarehouseIdAndStatusOrderByExperienceYearsDesc(hub.getId(), "AVAILABLE");

        List<ProposedTripDto> proposedTrips = new ArrayList<>();
        List<UnassignedContractDto> unassigned = new ArrayList<>();

        if (waitingLots.isEmpty()) {
            return DispatchOptimizationResultDto.builder()
                    .warehouseId(hub.getId())
                    .hubCode(hub.getHubCode())
                    .hubName(hub.getHubName())
                    .totalWaitingLots(0)
                    .assignedLotsCount(0)
                    .unassignedLotsCount(0)
                    .proposedTrips(proposedTrips)
                    .unassignedContracts(unassigned)
                    .build();
        }

        if (availableVehicles.isEmpty()) {
            for (Map<String, Object> lot : waitingLots) {
                unassigned.add(UnassignedContractDto.builder()
                        .contractId(((Number) lot.get("id")).longValue())
                        .contractCode(Objects.toString(lot.get("contract_code"), ""))
                        .farmerName(Objects.toString(lot.get("farmer_name"), ""))
                        .pickupAddress(Objects.toString(lot.get("farm_pickup_address"), ""))
                        .weightKg((BigDecimal) lot.get("computedWeightKg"))
                        .volumeM3((BigDecimal) lot.get("computedVolumeM3"))
                        .reasonCode("NO_AVAILABLE_VEHICLE")
                        .reasonDescription("Không có xe tải lạnh khả dụng tại " + hub.getHubName())
                        .build());
            }
            return buildResult(hub, waitingLots.size(), proposedTrips, unassigned);
        }

        // Pool of available vehicles (sorted ascending by capacity/volume for Best-Fit right-sizing) & drivers
        List<FleetVehicle> vehiclePoolAsc = new ArrayList<>(availableVehicles);
        vehiclePoolAsc.sort(Comparator.comparing(FleetVehicle::getCapacityKg)
                .thenComparing(FleetVehicle::getVolumeM3));
        List<FleetDriver> driverPool = new ArrayList<>(availableDrivers);
        int tripCounter = 1;

        // Best-Fit Dual-Constraint Bin Packing:
        // - Nếu tổng hàng còn lại vừa trong 1 xe -> chọn xe NHỎ NHẤT đủ tải & thể tích (tránh lấy xe 8 tấn chở 200kg)
        // - Nếu tổng hàng vượt sức chứa 1 xe -> ưu tiên xe lớn nhất để giảm số chuyến, phần dư vòng sau lại chọn xe nhỏ nhất vừa khít
        List<Map<String, Object>> remainingLots = new ArrayList<>(waitingLots);

        while (!remainingLots.isEmpty() && !vehiclePoolAsc.isEmpty() && !driverPool.isEmpty()) {
            BigDecimal totalRemainingWeight = remainingLots.stream()
                    .map(l -> (BigDecimal) l.get("computedWeightKg"))
                    .reduce(BigDecimal.ZERO, BigDecimal::add);
            BigDecimal totalRemainingVolume = remainingLots.stream()
                    .map(l -> (BigDecimal) l.get("computedVolumeM3"))
                    .reduce(BigDecimal.ZERO, BigDecimal::add);

            FleetVehicle selectedVehicle = null;
            FleetDriver matchedDriver = null;

            // 1. Tìm xe nhỏ nhất (Best-Fit) chứa được toàn bộ phần hàng còn lại
            for (FleetVehicle v : vehiclePoolAsc) {
                if (v.getCapacityKg().compareTo(totalRemainingWeight) >= 0
                        && v.getVolumeM3().compareTo(totalRemainingVolume) >= 0) {
                    FleetDriver d = findEligibleDriver(driverPool, v.getCapacityKg());
                    if (d != null) {
                        selectedVehicle = v;
                        matchedDriver = d;
                        break;
                    }
                }
            }

            // 2. Nếu không xe nào chở hết một lần, chọn xe lớn nhất có tài xế phù hợp và chở được ít nhất 1 đơn
            if (selectedVehicle == null) {
                for (int i = vehiclePoolAsc.size() - 1; i >= 0; i--) {
                    FleetVehicle v = vehiclePoolAsc.get(i);
                    FleetDriver d = findEligibleDriver(driverPool, v.getCapacityKg());
                    if (d == null) continue;
                    boolean fitsAny = remainingLots.stream().anyMatch(lot ->
                            ((BigDecimal) lot.get("computedWeightKg")).compareTo(v.getCapacityKg()) <= 0 &&
                            ((BigDecimal) lot.get("computedVolumeM3")).compareTo(v.getVolumeM3()) <= 0);
                    if (fitsAny) {
                        selectedVehicle = v;
                        matchedDriver = d;
                        break;
                    }
                }
            }

            if (selectedVehicle == null || matchedDriver == null) {
                break;
            }

            FleetVehicle vehicle = selectedVehicle;
            vehiclePoolAsc.remove(vehicle);

            BigDecimal currentWeight = BigDecimal.ZERO;
            BigDecimal currentVolume = BigDecimal.ZERO;
            int totalPackages = 0;
            List<ProposedStopDto> stops = new ArrayList<>();
            List<Map<String, Object>> packedLots = new ArrayList<>();

            for (Map<String, Object> lot : remainingLots) {
                BigDecimal lotWeight = (BigDecimal) lot.get("computedWeightKg");
                BigDecimal lotVolume = (BigDecimal) lot.get("computedVolumeM3");
                int lotPackages = (Integer) lot.get("computedPackageCount");

                BigDecimal nextWeight = currentWeight.add(lotWeight);
                BigDecimal nextVolume = currentVolume.add(lotVolume);

                // DUAL-CONSTRAINT CHECK: Both weight and volume must be within vehicle limits
                if (nextWeight.compareTo(vehicle.getCapacityKg()) <= 0 &&
                    nextVolume.compareTo(vehicle.getVolumeM3()) <= 0) {
                    currentWeight = nextWeight;
                    currentVolume = nextVolume;
                    totalPackages += lotPackages;

                    stops.add(ProposedStopDto.builder()
                            .stopOrder(stops.size() + 1)
                            .contractId(((Number) lot.get("id")).longValue())
                            .contractCode(Objects.toString(lot.get("contract_code"), ""))
                            .farmerName(Objects.toString(lot.get("farmer_name"), ""))
                            .farmerPhone(Objects.toString(lot.get("farmer_phone"), ""))
                            .pickupAddress(Objects.toString(lot.get("farm_pickup_address"), "Địa chỉ vườn nhà nông"))
                            .productName(Objects.toString(lot.get("product_name"), "Nông sản tươi"))
                            .weightKg(lotWeight)
                            .volumeM3(lotVolume)
                            .packageCount(lotPackages)
                            .packageType(Objects.toString(lot.get("computedPackageType"), ""))
                            .build());

                    packedLots.add(lot);
                }
            }

            if (!stops.isEmpty()) {
                driverPool.remove(matchedDriver);
                remainingLots.removeAll(packedLots);

                double weightPct = currentWeight.divide(vehicle.getCapacityKg(), 4, RoundingMode.HALF_UP).doubleValue() * 100.0;
                double volumePct = currentVolume.divide(vehicle.getVolumeM3(), 4, RoundingMode.HALF_UP).doubleValue() * 100.0;

                proposedTrips.add(ProposedTripDto.builder()
                        .tempTripId("PROP-TRIP-" + tripCounter++)
                        .vehicleId(vehicle.getId())
                        .plateNumber(vehicle.getPlateNumber())
                        .vehicleModel(vehicle.getVehicleModel())
                        .capacityKg(vehicle.getCapacityKg())
                        .volumeM3(vehicle.getVolumeM3())
                        .driverId(matchedDriver.getId())
                        .driverName(matchedDriver.getFullName())
                        .driverPhone(matchedDriver.getPhone())
                        .licenseClass(matchedDriver.getLicenseClass())
                        .totalWeightKg(currentWeight)
                        .totalVolumeM3(currentVolume)
                        .weightLoadPercentage(Math.round(weightPct * 10.0) / 10.0)
                        .volumeLoadPercentage(Math.round(volumePct * 10.0) / 10.0)
                        .totalPackages(totalPackages)
                        .stops(stops)
                        .build());
            }
        }

        // Remaining unassigned lots with specific reasons
        for (Map<String, Object> lot : remainingLots) {
            BigDecimal lotWeight = (BigDecimal) lot.get("computedWeightKg");
            BigDecimal lotVolume = (BigDecimal) lot.get("computedVolumeM3");

            String reasonCode;
            String reasonDesc;

            if (driverPool.isEmpty()) {
                reasonCode = "NO_AVAILABLE_DRIVER";
                reasonDesc = "Đã hết tài xế sẵn sàng trực tiếp nhận thêm chuyến tại kho";
            } else {
                reasonCode = "OVER_FLEET_CAPACITY";
                reasonDesc = String.format("Vượt sức chứa đội xe hiện có (Khối lượng: %s kg, Thể tích: %s m³)", lotWeight, lotVolume);
            }

            unassigned.add(UnassignedContractDto.builder()
                    .contractId(((Number) lot.get("id")).longValue())
                    .contractCode(Objects.toString(lot.get("contract_code"), ""))
                    .farmerName(Objects.toString(lot.get("farmer_name"), ""))
                    .pickupAddress(Objects.toString(lot.get("farm_pickup_address"), ""))
                    .weightKg(lotWeight)
                    .volumeM3(lotVolume)
                    .reasonCode(reasonCode)
                    .reasonDescription(reasonDesc)
                    .build());
        }

        return buildResult(hub, waitingLots.size(), proposedTrips, unassigned);
    }

    private FleetDriver findEligibleDriver(List<FleetDriver> driverPool, BigDecimal capacityKg) {
        for (FleetDriver d : driverPool) {
            if (isDriverEligible(d.getLicenseClass(), capacityKg)) {
                return d;
            }
        }
        return null;
    }

    private DispatchOptimizationResultDto buildResult(WarehouseHub hub, int totalLots,
                                                      List<ProposedTripDto> trips,
                                                      List<UnassignedContractDto> unassigned) {
        int assigned = trips.stream().mapToInt(t -> t.getStops().size()).sum();
        return DispatchOptimizationResultDto.builder()
                .warehouseId(hub.getId())
                .hubCode(hub.getHubCode())
                .hubName(hub.getHubName())
                .totalWaitingLots(totalLots)
                .assignedLotsCount(assigned)
                .unassignedLotsCount(unassigned.size())
                .proposedTrips(trips)
                .unassignedContracts(unassigned)
                .build();
    }

    /**
     * 5. Xác nhận chuyến phân công chính thức (Database Transaction + Pessimistic Lock + Zero-Trust Backend Verification)
     */
    @Transactional
    public PickupTrip confirmTrip(Long warehouseId, ConfirmTripRequest request) {
        // 1. Pessimistic lock Vehicle
        FleetVehicle vehicle = fleetVehicleRepository.findByIdForUpdate(request.getVehicleId())
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy phương tiện: " + request.getVehicleId()));

        if (!Objects.equals(vehicle.getWarehouse().getId(), warehouseId)) {
            throw new IllegalArgumentException("Phương tiện " + vehicle.getPlateNumber() + " không thuộc kho đang điều phối (Hub ID: " + warehouseId + ")");
        }
        if (!"AVAILABLE".equals(vehicle.getStatus())) {
            throw new IllegalStateException("Phương tiện " + vehicle.getPlateNumber() + " đang ở trạng thái: " + vehicle.getStatus() + ", không sẵn sàng nhận chuyến");
        }

        // 2. Pessimistic lock Driver
        FleetDriver driver = fleetDriverRepository.findByIdForUpdate(request.getDriverId())
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy tài xế: " + request.getDriverId()));

        if (!Objects.equals(driver.getWarehouse().getId(), warehouseId)) {
            throw new IllegalArgumentException("Tài xế " + driver.getFullName() + " không thuộc kho đang điều phối (Hub ID: " + warehouseId + ")");
        }
        if (!"AVAILABLE".equals(driver.getStatus())) {
            throw new IllegalStateException("Tài xế " + driver.getFullName() + " đang ở trạng thái: " + driver.getStatus() + ", không sẵn sàng nhận chuyến");
        }

        // 3. Check Driver License vs Vehicle Capacity
        if (!isDriverEligible(driver.getLicenseClass(), vehicle.getCapacityKg())) {
            throw new IllegalArgumentException("Tài xế " + driver.getFullName() + " (Bằng: " + driver.getLicenseClass() +
                    ") không đủ điều kiện điều khiển xe tải " + vehicle.getCapacityKg() + " kg");
        }

        // 4. ZERO-TRUST: Fetch contracts directly from DB and compute actual weights and volumes
        BigDecimal totalWeight = BigDecimal.ZERO;
        BigDecimal totalVolume = BigDecimal.ZERO;
        int totalPackages = 0;

        List<B2bContract> contractsToUpdate = new ArrayList<>();
        List<PickupTripStop> stopsToCreate = new ArrayList<>();

        int orderIndex = 1;
        for (ConfirmTripRequest.StopOrderRequest stopReq : request.getStops()) {
            B2bContract contract = b2bContractRepository.findById(stopReq.getContractId())
                    .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy hợp đồng: " + stopReq.getContractId()));

            // Verify packaging approval
            if (!Boolean.TRUE.equals(contract.getPackagingApproved())) {
                throw new IllegalStateException("Hợp đồng " + contract.getContractCode() + " chưa được duyệt quy cách đóng gói");
            }

            // Verify not already assigned to another vehicle
            if (contract.getPickupTruckPlate() != null && !contract.getPickupTruckPlate().isBlank()) {
                throw new IllegalStateException("Hợp đồng " + contract.getContractCode() + " đã được điều phối đón xe (" + contract.getPickupTruckPlate() + ")");
            }

            // Verify not already in an active pickup trip
            if (pickupTripStopRepository.existsByContractIdAndStatusIn(contract.getId(), List.of("PENDING", "ARRIVED"))) {
                throw new IllegalStateException("Hợp đồng " + contract.getContractCode() + " đang thuộc chuyến lấy hàng chưa hoàn tất");
            }

            // Calculate metrics strictly from DB values
            BigDecimal weight = contract.getActualHarvestWeightKg() != null
                    ? contract.getActualHarvestWeightKg()
                    : (contract.getOfferedWeightKg() != null ? contract.getOfferedWeightKg() : new BigDecimal("100.0"));
            Integer packages = contract.getPackageCount() != null ? contract.getPackageCount()
                    : Math.max(1, weight.divide(BigDecimal.valueOf(20), 0, RoundingMode.CEILING).intValue());
            String packageType = contract.getPackageType() != null ? contract.getPackageType() : "THÙNG NHỰA 20KG";
            BigDecimal volume = calculateContractVolume(weight, packages, packageType);

            totalWeight = totalWeight.add(weight);
            totalVolume = totalVolume.add(volume);
            totalPackages += packages;

            int order = stopReq.getStopOrder() != null && stopReq.getStopOrder() > 0 ? stopReq.getStopOrder() : orderIndex;

            String farmerName = contract.getFarmer() != null ? contract.getFarmer().getFullName() : "Nhà Vườn";
            String contactPhone = contract.getFarmer() != null ? contract.getFarmer().getPhone() : "";
            String pickupAddr = contract.getFarmPickupAddress() != null && !contract.getFarmPickupAddress().isBlank()
                    ? contract.getFarmPickupAddress() : "Rẫy nhà vườn HoNa Fresh";

            PickupTripStop stop = PickupTripStop.builder()
                    .contract(contract)
                    .stopOrder(order)
                    .farmerName(farmerName)
                    .pickupAddress(pickupAddr)
                    .contactPhone(contactPhone)
                    .weightKg(weight)
                    .volumeM3(volume)
                    .packageCount(packages)
                    .status("PENDING")
                    .build();

            stopsToCreate.add(stop);
            contractsToUpdate.add(contract);
            orderIndex++;
        }

        // 5. Dual-constraint capacity validation
        if (totalWeight.compareTo(vehicle.getCapacityKg()) > 0) {
            throw new IllegalArgumentException(String.format("Tổng khối lượng hàng (%s kg) vượt quá tải trọng xe (%s kg)", totalWeight, vehicle.getCapacityKg()));
        }
        if (totalVolume.compareTo(vehicle.getVolumeM3()) > 0) {
            throw new IllegalArgumentException(String.format("Tổng thể tích hàng (%s m³) vượt quá thể tích thùng xe (%s m³)", totalVolume, vehicle.getVolumeM3()));
        }

        // 6. Create Pickup Trip
        WarehouseHub hub = vehicle.getWarehouse();
        String dateStr = LocalDate.now().format(DateTimeFormatter.BASIC_ISO_DATE);
        String tripCode = "TRIP-" + dateStr + "-" + String.format("%04d", System.currentTimeMillis() % 10000);

        PickupTrip trip = PickupTrip.builder()
                .tripCode(tripCode)
                .warehouse(hub)
                .vehicle(vehicle)
                .driver(driver)
                .status("ASSIGNED")
                .totalWeightKg(totalWeight)
                .totalVolumeM3(totalVolume)
                .totalPackages(totalPackages)
                .totalStops(stopsToCreate.size())
                .createdBy("DISPATCH_COORDINATOR")
                .build();

        trip = pickupTripRepository.save(trip);

        // Save stops linked to trip
        for (PickupTripStop stop : stopsToCreate) {
            stop.setTrip(trip);
            pickupTripStopRepository.save(stop);
        }

        // 7. Update Vehicle & Driver to ASSIGNED
        vehicle.setStatus("ASSIGNED");
        fleetVehicleRepository.save(vehicle);

        driver.setStatus("ASSIGNED");
        fleetDriverRepository.save(driver);

        // 8. Update Contracts
        for (B2bContract contract : contractsToUpdate) {
            contract.setPickupTruckPlate(vehicle.getPlateNumber());
            contract.setPickupDriverName(driver.getFullName());
            contract.setPickupDriverPhone(driver.getPhone());
            contract.setFulfillmentStatus("PICKUP_DISPATCHED");
            contract.setStatus("PICKUP_DISPATCHED");
            b2bContractRepository.save(contract);

            // Notify parties
            b2bRealtimeService.notifyContractUpdated("PICKUP_DISPATCHED", contract.getContractCode(), contract);
        }

        // Notify dispatch board
        b2bRealtimeService.notifyDispatchTripUpdated("TRIP_CREATED", trip.getId(), trip);
        log.info("Xác nhận thành công chuyến điều phối {} gồm {} điểm dừng cho xe {}", tripCode, stopsToCreate.size(), vehicle.getPlateNumber());

        return trip;
    }

    /**
     * 6. Hủy chuyến điều phối lấy hàng (Giải phóng xe, tài xế và trả lô hàng về hàng chờ)
     */
    @Transactional
    public Map<String, Object> cancelTrip(Long tripId, CancelTripRequest request) {
        PickupTrip trip = pickupTripRepository.findById(tripId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy chuyến điều phối: " + tripId));

        if ("CANCELLED".equals(trip.getStatus())) {
            throw new IllegalStateException("Chuyến xe " + trip.getTripCode() + " đã bị hủy trước đó");
        }
        if ("COMPLETED".equals(trip.getStatus())) {
            throw new IllegalStateException("Không thể hủy chuyến " + trip.getTripCode() + " đã hoàn tất hành trình");
        }

        String reason = request != null && request.getCancelReason() != null && !request.getCancelReason().isBlank()
                ? request.getCancelReason().trim() : "Điều phối viên hủy chuyến";

        trip.setStatus("CANCELLED");
        trip.setCancellationReason(reason);
        pickupTripRepository.save(trip);

        List<PickupTripStop> stops = pickupTripStopRepository.findByTripIdOrderByStopOrderAsc(tripId);
        int releasedCount = 0;

        for (PickupTripStop stop : stops) {
            stop.setStatus("CANCELLED");
            pickupTripStopRepository.save(stop);

            B2bContract contract = stop.getContract();
            if (contract != null) {
                contract.setPickupTruckPlate(null);
                contract.setPickupDriverName(null);
                contract.setPickupDriverPhone(null);
                contract.setFulfillmentStatus("PACKAGING_APPROVED");
                contract.setStatus("PACKAGING_APPROVED");
                b2bContractRepository.save(contract);
                releasedCount++;

                b2bRealtimeService.notifyContractUpdated("PACKAGING_APPROVED", contract.getContractCode(), contract);
            }
        }

        // Revert vehicle to AVAILABLE if not in MAINTENANCE
        FleetVehicle vehicle = trip.getVehicle();
        if (vehicle != null && !"MAINTENANCE".equals(vehicle.getStatus())) {
            vehicle.setStatus("AVAILABLE");
            fleetVehicleRepository.save(vehicle);
        }

        // Revert driver to AVAILABLE if not OFF_DUTY
        FleetDriver driver = trip.getDriver();
        if (driver != null && !"OFF_DUTY".equals(driver.getStatus())) {
            driver.setStatus("AVAILABLE");
            fleetDriverRepository.save(driver);
        }

        b2bRealtimeService.notifyDispatchTripUpdated("TRIP_CANCELLED", trip.getId(), trip);
        log.info("Đã hủy chuyến {} (Lý do: {}), giải phóng {} hợp đồng", trip.getTripCode(), reason, releasedCount);

        Map<String, Object> result = new HashMap<>();
        result.put("tripId", trip.getId());
        result.put("tripCode", trip.getTripCode());
        result.put("status", "CANCELLED");
        result.put("releasedContractsCount", releasedCount);
        result.put("vehicleStatus", vehicle != null ? vehicle.getStatus() : null);
        result.put("driverStatus", driver != null ? driver.getStatus() : null);

        return result;
    }

    /**
     * 7. Lấy danh sách chuyến theo kho
     */
    @Transactional(readOnly = true)
    public List<PickupTrip> getTripsByWarehouse(Long warehouseId) {
        return pickupTripRepository.findByWarehouseIdOrderByCreatedAtDesc(warehouseId);
    }

    @Transactional(readOnly = true)
    public PickupTrip getTripById(Long id) {
        return pickupTripRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy chuyến xe: " + id));
    }
}
