package com.btl.webbanrau.service;

import com.btl.webbanrau.model.B2bContract;
import com.btl.webbanrau.model.WarehouseBin;
import com.btl.webbanrau.model.WarehouseHub;
import com.btl.webbanrau.model.WarehouseZone;
import com.btl.webbanrau.repository.B2bContractRepository;
import com.btl.webbanrau.repository.WarehouseBinRepository;
import com.btl.webbanrau.repository.WarehouseHubRepository;
import com.btl.webbanrau.repository.WarehouseZoneRepository;
import com.fasterxml.jackson.databind.JsonNode;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.*;

@Service
@RequiredArgsConstructor
public class WarehouseStorageService {

    private final WarehouseHubRepository hubRepository;
    private final WarehouseZoneRepository zoneRepository;
    private final WarehouseBinRepository binRepository;
    private final B2bContractRepository contractRepository;
    private final JdbcTemplate jdbcTemplate;

    private WarehouseHub findHub(Long hubId) {
        return hubRepository.findById(hubId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy Kho / Trạm với ID: " + hubId));
    }

    @Transactional
    public void ensureDefaultLayoutForHub(WarehouseHub hub) {
        jdbcTemplate.queryForMap("SELECT id FROM warehouse_hubs WHERE id = ? FOR UPDATE", hub.getId());
        List<WarehouseZone> existing = zoneRepository.findByWarehouseIdOrderByZoneCodeAsc(hub.getId());
        if (!existing.isEmpty()) return;

        if (hub.getTotalCapacityKg() == null) {
            hub.setTotalCapacityKg(new BigDecimal("50000.00"));
            hubRepository.save(hub);
        }

        WarehouseZone zoneA = zoneRepository.save(WarehouseZone.builder()
                .warehouse(hub)
                .zoneCode("ZONE-A")
                .zoneName("Zone A — Kho Lạnh Rau Ăn Lá & Thảo Mộc")
                .description("Chuyên biệt: Xà lách, lá é, cải bó xôi, rau thơm VietGAP")
                .tempMin(new BigDecimal("2.0"))
                .tempMax(new BigDecimal("4.0"))
                .humidityTarget(92)
                .capacityKg(new BigDecimal("20000.00"))
                .status("ACTIVE")
                .build());

        WarehouseZone zoneB = zoneRepository.save(WarehouseZone.builder()
                .warehouse(hub)
                .zoneCode("ZONE-B")
                .zoneName("Zone B — Kho Mát Củ Quả Nhiệt Đới")
                .description("Chuyên biệt: Cà chua beef, khoai tây, cà rốt, ớt chuông")
                .tempMin(new BigDecimal("6.0"))
                .tempMax(new BigDecimal("10.0"))
                .humidityTarget(85)
                .capacityKg(new BigDecimal("15000.00"))
                .status("ACTIVE")
                .build());

        WarehouseZone zoneC = zoneRepository.save(WarehouseZone.builder()
                .warehouse(hub)
                .zoneCode("ZONE-C")
                .zoneName("Zone C — Kho Mát Trái Cây & Nông Sản Cao Cấp")
                .description("Chuyên biệt: Dâu tây, dưa lưới, bơ booth")
                .tempMin(new BigDecimal("8.0"))
                .tempMax(new BigDecimal("12.0"))
                .humidityTarget(88)
                .capacityKg(new BigDecimal("15000.00"))
                .status("ACTIVE")
                .build());

        createBatchBinsInternal(hub, zoneA, "R-01", "BIN A-", 1, 4, new BigDecimal("5000.00"));
        createBatchBinsInternal(hub, zoneB, "R-02", "BIN B-", 1, 4, new BigDecimal("3750.00"));
        createBatchBinsInternal(hub, zoneC, "R-03", "BIN C-", 1, 4, new BigDecimal("3750.00"));
    }

    private List<WarehouseBin> createBatchBinsInternal(
            WarehouseHub hub, WarehouseZone zone, String rackCode, String prefix,
            int startIndex, int count, BigDecimal maxWeightKg) {
        List<WarehouseBin> created = new ArrayList<>();
        for (int i = 0; i < count; i++) {
            String num = String.format("%02d", startIndex + i);
            String binCode = (prefix + num).trim().toUpperCase();
            if (binRepository.findByWarehouseIdAndBinCode(hub.getId(), binCode).isPresent()) {
                continue;
            }
            created.add(binRepository.save(WarehouseBin.builder()
                    .warehouse(hub)
                    .zone(zone)
                    .rackCode(rackCode.trim().toUpperCase())
                    .binCode(binCode)
                    .maxWeightKg(maxWeightKg)
                    .status("ACTIVE")
                    .build()));
        }
        return created;
    }

    /**
     * Chỉ lấy các lô hàng ĐANG CÒN TRONG KHO (đã nhập kho và chưa xuất giao Buyer).
     * Khi xuất kho (OUTBOUND_DISPATCHED / IN_TRANSIT / DELIVERED / SETTLED / COMPLETED) -> tự động mất khỏi kệ.
     */
    private List<Map<String, Object>> getActiveStoredContracts() {
        String sql = """
            SELECT c.id, c.contract_code, c.status, c.fulfillment_status,
                   c.hub_name, c.hub_warehouse_zone, c.hub_rack_bin, c.hub_inbound_at,
                   c.hub_delivery_date, r.delivery_date AS buyer_delivery_date,
                   c.max_storage_days, c.qc_status, c.qc_passed_at,
                   c.actual_harvest_weight_kg, c.offered_weight_kg, c.inbound_net_weight_kg,
                   c.package_count, c.package_type,
                   hl.product_name, u.full_name AS farmer_name, b.full_name AS buyer_name
            FROM b2b_contracts c
            LEFT JOIN harvest_lots hl ON COALESCE(c.lot_id, c.harvest_lot_id) = hl.id
            LEFT JOIN rfq_negotiations r ON c.rfq_id = r.id
            LEFT JOIN users u ON c.farmer_id = u.id
            LEFT JOIN users b ON c.buyer_id = b.id
            WHERE c.status IN ('AT_HUB_QC', 'HUB_DELIVERED', 'QC_PASSED', 'QC_FAILED', 'READY_OUTBOUND')
              AND c.hub_inbound_at IS NOT NULL
            ORDER BY c.hub_inbound_at ASC
        """;
        return jdbcTemplate.queryForList(sql);
    }

    private boolean matchesBin(Map<String, Object> contractRow, WarehouseBin bin) {
        String rawBin = contractRow.get("hub_rack_bin") != null
                ? String.valueOf(contractRow.get("hub_rack_bin")).toUpperCase()
                : "";
        if (rawBin.isBlank()) return false;
        String code = bin.getBinCode().toUpperCase();
        String shortCode = code.replace("BIN ", "").trim();
        return rawBin.contains(code) || (!shortCode.isEmpty() && rawBin.contains(shortCode));
    }

    @Transactional
    public Map<String, Object> getWarehouseLayout(Long hubId) {
        WarehouseHub hub = findHub(hubId);
        ensureDefaultLayoutForHub(hub);

        List<WarehouseZone> zones = zoneRepository.findByWarehouseIdOrderByZoneCodeAsc(hubId);
        List<WarehouseBin> allBins = binRepository.findByWarehouseIdOrderByRackCodeAscBinCodeAsc(hubId);
        List<Map<String, Object>> activeContracts = getActiveStoredContracts();

        BigDecimal totalUsed = BigDecimal.ZERO;
        List<Map<String, Object>> zoneDtos = new ArrayList<>();

        for (WarehouseZone z : zones) {
            List<WarehouseBin> zoneBins = allBins.stream()
                    .filter(b -> b.getZone() != null && b.getZone().getId().equals(z.getId()))
                    .toList();

            BigDecimal zoneUsed = BigDecimal.ZERO;
            int zonePackages = 0;
            List<Map<String, Object>> binDtos = new ArrayList<>();

            for (WarehouseBin b : zoneBins) {
                List<Map<String, Object>> matched = activeContracts.stream()
                        .filter(c -> matchesBin(c, b))
                        .toList();

                BigDecimal binUsed = BigDecimal.ZERO;
                int binPackages = 0;
                for (Map<String, Object> c : matched) {
                    Object wObj = c.get("inbound_net_weight_kg") != null
                            ? c.get("inbound_net_weight_kg")
                            : (c.get("actual_harvest_weight_kg") != null ? c.get("actual_harvest_weight_kg") : c.get("offered_weight_kg"));
                    if (wObj != null) {
                        binUsed = binUsed.add(new BigDecimal(String.valueOf(wObj)));
                    }
                    if (c.get("package_count") != null) {
                        binPackages += Integer.parseInt(String.valueOf(c.get("package_count")));
                    }
                }

                zoneUsed = zoneUsed.add(binUsed);
                zonePackages += binPackages;

                double binPct = b.getMaxWeightKg() != null && b.getMaxWeightKg().compareTo(BigDecimal.ZERO) > 0
                        ? binUsed.multiply(BigDecimal.valueOf(100)).divide(b.getMaxWeightKg(), 1, RoundingMode.HALF_UP).doubleValue()
                        : 0.0;

                Map<String, Object> binMap = new LinkedHashMap<>();
                binMap.put("id", b.getId());
                binMap.put("warehouseId", hub.getId());
                binMap.put("zoneId", z.getId());
                binMap.put("rackCode", b.getRackCode());
                binMap.put("binCode", b.getBinCode());
                binMap.put("maxWeightKg", b.getMaxWeightKg());
                binMap.put("usedKg", binUsed);
                binMap.put("availableKg", b.getMaxWeightKg().subtract(binUsed).max(BigDecimal.ZERO));
                binMap.put("utilizationPct", Math.min(100.0, binPct));
                binMap.put("packageCount", binPackages);
                binMap.put("status", b.getStatus());
                binMap.put("notes", b.getNotes());
                binMap.put("contracts", matched);
                binDtos.add(binMap);
            }

            totalUsed = totalUsed.add(zoneUsed);
            double zonePct = z.getCapacityKg() != null && z.getCapacityKg().compareTo(BigDecimal.ZERO) > 0
                    ? zoneUsed.multiply(BigDecimal.valueOf(100)).divide(z.getCapacityKg(), 1, RoundingMode.HALF_UP).doubleValue()
                    : 0.0;

            Map<String, Object> zoneMap = new LinkedHashMap<>();
            zoneMap.put("id", z.getId());
            zoneMap.put("warehouseId", hub.getId());
            zoneMap.put("zoneCode", z.getZoneCode());
            zoneMap.put("zoneName", z.getZoneName());
            zoneMap.put("description", z.getDescription());
            zoneMap.put("tempMin", z.getTempMin());
            zoneMap.put("tempMax", z.getTempMax());
            int hTarget = z.getHumidityTarget() != null ? z.getHumidityTarget() : 90;
            int hMin = z.getHumidityMin() != null ? z.getHumidityMin() : Math.max(0, hTarget - 5);
            int hMax = z.getHumidityMax() != null ? z.getHumidityMax() : Math.min(100, hTarget + 5);
            zoneMap.put("humidityTarget", hTarget);
            zoneMap.put("humidityMin", hMin);
            zoneMap.put("humidityMax", hMax);
            zoneMap.put("capacityKg", z.getCapacityKg());
            zoneMap.put("usedKg", zoneUsed);
            zoneMap.put("availableKg", z.getCapacityKg().subtract(zoneUsed).max(BigDecimal.ZERO));
            zoneMap.put("utilizationPct", Math.min(100.0, zonePct));
            zoneMap.put("packageCount", zonePackages);
            zoneMap.put("status", z.getStatus());
            zoneMap.put("bins", binDtos);
            zoneDtos.add(zoneMap);
        }

        BigDecimal totalCap = hub.getTotalCapacityKg() != null ? hub.getTotalCapacityKg() : new BigDecimal("50000.00");
        double totalPct = totalCap.compareTo(BigDecimal.ZERO) > 0
                ? totalUsed.multiply(BigDecimal.valueOf(100)).divide(totalCap, 1, RoundingMode.HALF_UP).doubleValue()
                : 0.0;

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("hub", hub);
        result.put("totalCapacityKg", totalCap);
        result.put("totalUsedKg", totalUsed);
        result.put("totalAvailableKg", totalCap.subtract(totalUsed).max(BigDecimal.ZERO));
        result.put("utilizationPct", Math.min(100.0, totalPct));
        result.put("totalZones", zoneDtos.size());
        result.put("totalBins", allBins.size());
        result.put("zones", zoneDtos);
        return result;
    }

    @Transactional
    public WarehouseHub updateHub(Long hubId, JsonNode n) {
        WarehouseHub hub = findHub(hubId);
        if (n.hasNonNull("hubName") && !n.path("hubName").asText("").isBlank()) {
            hub.setHubName(n.path("hubName").asText().trim());
        }
        if (n.hasNonNull("managerName")) hub.setManagerName(n.path("managerName").asText().trim());
        if (n.hasNonNull("hotline")) hub.setHotline(n.path("hotline").asText().trim());
        if (n.hasNonNull("address") && !n.path("address").asText("").isBlank()) {
            hub.setAddress(n.path("address").asText().trim());
        }
        if (n.hasNonNull("totalCapacityKg")) {
            hub.setTotalCapacityKg(new BigDecimal(n.path("totalCapacityKg").asText("50000")));
        }
        if (n.has("active")) {
            hub.setActive(n.path("active").asBoolean(true));
        }
        return hubRepository.save(hub);
    }

    @Transactional
    public WarehouseZone createZone(Long hubId, JsonNode n) {
        WarehouseHub hub = findHub(hubId);
        String zoneCode = n.path("zoneCode").asText("").trim().toUpperCase();
        String zoneName = n.path("zoneName").asText("").trim();
        if (zoneCode.isEmpty() || zoneName.isEmpty()) {
            throw new IllegalArgumentException("Mã Zone và tên Zone không được để trống.");
        }
        if (zoneRepository.findByWarehouseIdAndZoneCode(hubId, zoneCode).isPresent()) {
            throw new IllegalArgumentException("Mã Zone đã tồn tại trong kho này: " + zoneCode);
        }
        return zoneRepository.save(WarehouseZone.builder()
                .warehouse(hub)
                .zoneCode(zoneCode)
                .zoneName(zoneName)
                .description(n.path("description").asText(""))
                .tempMin(new BigDecimal(n.path("tempMin").asText("2.0")))
                .tempMax(new BigDecimal(n.path("tempMax").asText("6.0")))
                .humidityTarget(n.hasNonNull("humidityMin") && n.hasNonNull("humidityMax")
                        ? (n.path("humidityMin").asInt(85) + n.path("humidityMax").asInt(95)) / 2
                        : n.path("humidityTarget").asInt(90))
                .humidityMin(n.path("humidityMin").asInt(Math.max(0, n.path("humidityTarget").asInt(90) - 5)))
                .humidityMax(n.path("humidityMax").asInt(Math.min(100, n.path("humidityTarget").asInt(90) + 5)))
                .capacityKg(new BigDecimal(n.path("capacityKg").asText("20000")))
                .status(n.path("status").asText("ACTIVE").toUpperCase())
                .build());
    }

    @Transactional
    public WarehouseZone updateZone(Long zoneId, JsonNode n) {
        WarehouseZone zone = zoneRepository.findById(zoneId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy Zone ID: " + zoneId));
        if (n.hasNonNull("zoneName") && !n.path("zoneName").asText("").isBlank()) {
            zone.setZoneName(n.path("zoneName").asText().trim());
        }
        if (n.hasNonNull("description")) zone.setDescription(n.path("description").asText().trim());
        if (n.hasNonNull("tempMin")) zone.setTempMin(new BigDecimal(n.path("tempMin").asText("2.0")));
        if (n.hasNonNull("tempMax")) zone.setTempMax(new BigDecimal(n.path("tempMax").asText("6.0")));
        if (n.hasNonNull("humidityMin")) zone.setHumidityMin(n.path("humidityMin").asInt(85));
        if (n.hasNonNull("humidityMax")) zone.setHumidityMax(n.path("humidityMax").asInt(95));
        if (n.hasNonNull("humidityMin") && n.hasNonNull("humidityMax")) {
            zone.setHumidityTarget((zone.getHumidityMin() + zone.getHumidityMax()) / 2);
        } else if (n.hasNonNull("humidityTarget")) {
            zone.setHumidityTarget(n.path("humidityTarget").asInt(90));
        }
        if (n.hasNonNull("capacityKg")) zone.setCapacityKg(new BigDecimal(n.path("capacityKg").asText("20000")));
        if (n.hasNonNull("status")) zone.setStatus(n.path("status").asText("ACTIVE").toUpperCase());
        return zoneRepository.save(zone);
    }

    @Transactional
    public void deleteZone(Long zoneId) {
        WarehouseZone zone = zoneRepository.findById(zoneId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy Zone ID: " + zoneId));
        List<WarehouseBin> bins = binRepository.findByZoneIdOrderByRackCodeAscBinCodeAsc(zoneId);
        List<Map<String, Object>> activeContracts = getActiveStoredContracts();
        for (WarehouseBin b : bins) {
            if (activeContracts.stream().anyMatch(c -> matchesBin(c, b))) {
                throw new IllegalArgumentException("Zone đang có hàng lưu kho tại ô " + b.getBinCode() + ", không thể xóa.");
            }
        }
        binRepository.deleteAll(bins);
        zoneRepository.delete(zone);
    }

    @Transactional
    public List<WarehouseBin> createBins(Long zoneId, JsonNode n) {
        WarehouseZone zone = zoneRepository.findById(zoneId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy Zone ID: " + zoneId));
        WarehouseHub hub = zone.getWarehouse();

        String rackCode = n.path("rackCode").asText("R-01").trim().toUpperCase();
        BigDecimal maxWeight = new BigDecimal(n.path("maxWeightKg").asText("5000"));

        if (n.has("count") && n.path("count").asInt(1) > 1) {
            String prefix = n.path("binPrefix").asText("BIN ");
            int startIndex = n.path("startIndex").asInt(1);
            int count = Math.min(24, Math.max(1, n.path("count").asInt(4)));
            List<WarehouseBin> created = createBatchBinsInternal(hub, zone, rackCode, prefix, startIndex, count, maxWeight);
            if (created.isEmpty()) {
                throw new IllegalArgumentException("Các mã ô kệ trong dải này đã tồn tại trong kho.");
            }
            return created;
        }

        String binCode = n.path("binCode").asText("").trim().toUpperCase();
        if (binCode.isEmpty()) {
            throw new IllegalArgumentException("Mã ô chứa (Bin) không được để trống.");
        }
        if (binRepository.findByWarehouseIdAndBinCode(hub.getId(), binCode).isPresent()) {
            throw new IllegalArgumentException("Mã ô chứa đã tồn tại trong kho: " + binCode);
        }
        WarehouseBin saved = binRepository.save(WarehouseBin.builder()
                .warehouse(hub)
                .zone(zone)
                .rackCode(rackCode)
                .binCode(binCode)
                .maxWeightKg(maxWeight)
                .status(n.path("status").asText("ACTIVE").toUpperCase())
                .notes(n.path("notes").asText(null))
                .build());
        return List.of(saved);
    }

    @Transactional
    public WarehouseBin updateBin(Long binId, JsonNode n) {
        WarehouseBin bin = binRepository.findById(binId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy ô kệ ID: " + binId));
        if (n.hasNonNull("rackCode") && !n.path("rackCode").asText("").isBlank()) {
            bin.setRackCode(n.path("rackCode").asText().trim().toUpperCase());
        }
        if (n.hasNonNull("binCode") && !n.path("binCode").asText("").isBlank()) {
            String nextCode = n.path("binCode").asText().trim().toUpperCase();
            binRepository.findByWarehouseIdAndBinCode(bin.getWarehouse().getId(), nextCode).ifPresent(existing -> {
                if (!existing.getId().equals(binId)) {
                    throw new IllegalArgumentException("Mã ô kệ đã tồn tại: " + nextCode);
                }
            });
            bin.setBinCode(nextCode);
        }
        if (n.hasNonNull("maxWeightKg")) {
            bin.setMaxWeightKg(new BigDecimal(n.path("maxWeightKg").asText("5000")));
        }
        if (n.hasNonNull("status")) {
            bin.setStatus(n.path("status").asText("ACTIVE").toUpperCase());
        }
        if (n.has("notes")) {
            bin.setNotes(n.path("notes").asText(""));
        }
        return binRepository.save(bin);
    }

    @Transactional
    public void deleteBin(Long binId) {
        WarehouseBin bin = binRepository.findById(binId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy ô kệ ID: " + binId));
        boolean hasGoods = getActiveStoredContracts().stream().anyMatch(c -> matchesBin(c, bin));
        if (hasGoods) {
            throw new IllegalArgumentException("Ô kệ " + bin.getBinCode() + " đang chứa hàng, vui lòng chuyển hàng sang ô khác trước khi xóa.");
        }
        binRepository.delete(bin);
    }

    @Transactional
    public Map<String, Object> moveContractBin(Long contractId, Long targetBinId) {
        B2bContract contract = contractRepository.findById(contractId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy hợp đồng ID: " + contractId));
        WarehouseBin targetBin = binRepository.findById(targetBinId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy ô kệ đích ID: " + targetBinId));
        if (!"ACTIVE".equalsIgnoreCase(targetBin.getStatus())) {
            throw new IllegalArgumentException("Ô kệ đích đang bảo trì, không thể chuyển hàng vào.");
        }

        BigDecimal contractWeight = contract.getInboundNetWeightKg() != null
                ? contract.getInboundNetWeightKg()
                : (contract.getActualHarvestWeightKg() != null ? contract.getActualHarvestWeightKg() : contract.getOfferedWeightKg());
        if (contractWeight == null) contractWeight = BigDecimal.ZERO;

        List<Map<String, Object>> activeContracts = getActiveStoredContracts();
        BigDecimal currentUsed = BigDecimal.ZERO;
        for (Map<String, Object> c : activeContracts) {
            Long cid = Long.valueOf(String.valueOf(c.get("id")));
            if (!cid.equals(contractId) && matchesBin(c, targetBin)) {
                Object wObj = c.get("inbound_net_weight_kg") != null
                        ? c.get("inbound_net_weight_kg")
                        : (c.get("actual_harvest_weight_kg") != null ? c.get("actual_harvest_weight_kg") : c.get("offered_weight_kg"));
                if (wObj != null) currentUsed = currentUsed.add(new BigDecimal(String.valueOf(wObj)));
            }
        }
        if (currentUsed.add(contractWeight).compareTo(targetBin.getMaxWeightKg()) > 0) {
            throw new IllegalArgumentException("Ô kệ " + targetBin.getBinCode() + " không đủ sức chứa còn lại.");
        }

        contract.setHubWarehouseZone(targetBin.getZone().getZoneName());
        contract.setHubRackBin(targetBin.getRackCode() + " / " + targetBin.getBinCode());
        B2bContract saved = contractRepository.save(contract);

        Map<String, Object> res = new LinkedHashMap<>();
        res.put("id", saved.getId());
        res.put("contractCode", saved.getContractCode());
        res.put("hubWarehouseZone", saved.getHubWarehouseZone());
        res.put("hubRackBin", saved.getHubRackBin());
        return res;
    }
}
