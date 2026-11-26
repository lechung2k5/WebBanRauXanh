package com.btl.webbanrau.service;

import com.btl.webbanrau.dto.request.HarvestLotRequest;
import com.btl.webbanrau.dto.request.HarvestLotStatusUpdateRequest;
import com.btl.webbanrau.dto.response.HarvestLotResponse;
import com.btl.webbanrau.dto.response.PageResponse;
import com.btl.webbanrau.model.HarvestLot;
import com.btl.webbanrau.repository.HarvestLotRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Objects;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class HarvestLotService {

    private final HarvestLotRepository harvestLotRepository;
    private final com.btl.webbanrau.repository.UserRepository userRepository;
    private final com.btl.webbanrau.repository.FarmerProfileRepository farmerProfileRepository;
    private final B2bRealtimeService b2bRealtimeService;
    private final org.springframework.jdbc.core.JdbcTemplate jdbcTemplate;

    @Transactional(readOnly = true)
    public PageResponse<HarvestLotResponse> getLots(
            String keyword,
            String status,
            String category,
            int page,
            int size,
            String sortBy,
            String sortDir
    ) {
        Sort.Direction direction = sortDir.equalsIgnoreCase("ASC")
                ? Sort.Direction.ASC
                : Sort.Direction.DESC;
        // Thêm id làm tiêu chí phụ để các bản ghi cùng createdAt/giá luôn có
        // thứ tự ổn định, tránh trùng hoặc bỏ sót lô giữa hai trang.
        Sort sort = Sort.by(direction, sortBy)
                .and(Sort.by(Sort.Direction.DESC, "id"));

        Pageable pageable = PageRequest.of(page, size, sort);
        Page<HarvestLot> lotPage = harvestLotRepository.searchLots(keyword, status, category, pageable);

        return PageResponse.<HarvestLotResponse>builder()
                .currentPage(lotPage.getNumber())
                .totalPages(lotPage.getTotalPages())
                .pageSize(lotPage.getSize())
                .totalElements(lotPage.getTotalElements())
                .data(lotPage.getContent().stream().map(this::mapToResponse).toList())
                .build();
    }

    @Transactional(readOnly = true)
    public HarvestLotResponse getLotById(Long id) {
        HarvestLot lot = harvestLotRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy lô nông sản với ID: " + id));
        return mapToResponse(lot);
    }

    @Transactional(readOnly = true)
    public HarvestLotResponse getLotByCode(String lotCode) {
        HarvestLot lot = harvestLotRepository.findByLotCode(lotCode)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy lô nông sản với mã: " + lotCode));
        return mapToResponse(lot);
    }

    @Transactional
    public HarvestLotResponse createLot(HarvestLotRequest request) {
        String lotCode = request.getLotCode();
        if (lotCode == null || lotCode.isBlank()) {
            lotCode = generateLotCode(request.getRegion());
        }

        if (harvestLotRepository.existsByLotCode(lotCode)) {
            throw new IllegalArgumentException("Mã lô nông sản '" + lotCode + "' đã tồn tại!");
        }

        BigDecimal availableWeight = request.getAvailableWeightKg() != null
                ? request.getAvailableWeightKg()
                : request.getTotalWeightKg();

        String status = (request.getStatus() != null && !request.getStatus().isBlank())
                ? request.getStatus()
                : "PENDING_APPROVAL";

        BigDecimal minTemp = request.getReqTempMin() != null ? request.getReqTempMin() : new BigDecimal("2.0");
        BigDecimal maxTemp = request.getReqTempMax() != null ? request.getReqTempMax() : new BigDecimal("6.0");

        Long resolvedFarmerId = request.getFarmerId();
        if (resolvedFarmerId == null) {
            resolvedFarmerId = userRepository.findByUsername("farmer_dalat")
                    .map(com.btl.webbanrau.model.User::getId)
                    .orElseGet(() -> userRepository.findAll().stream()
                            .filter(u -> u.getRoles() != null && u.getRoles().stream().anyMatch(r -> "ROLE_FARMER".equals(r.getName())))
                            .map(com.btl.webbanrau.model.User::getId)
                            .findFirst()
                            .orElse(1L));
        }

        String resolvedFarmerName = request.getFarmerName();
        if ((resolvedFarmerName == null || resolvedFarmerName.isBlank()) && resolvedFarmerId != null) {
            resolvedFarmerName = userRepository.findById(resolvedFarmerId)
                    .map(u -> (u.getCompanyName() != null && !u.getCompanyName().isBlank()) ? u.getCompanyName() : u.getFullName())
                    .orElse("Nông trại");
        }
        if (resolvedFarmerName == null || resolvedFarmerName.isBlank()) {
            resolvedFarmerName = "Nông trại";
        }

        HarvestLot lot = HarvestLot.builder()
                .lotCode(lotCode.trim().toUpperCase())
                .farmerId(resolvedFarmerId)
                .farmerName(resolvedFarmerName.trim())
                .productName(request.getProductName().trim())
                .category(request.getCategory().trim().toUpperCase())
                .categoryId(request.getCategoryId())
                .pucCode(request.getPucCode().trim().toUpperCase())
                .certification(request.getCertification() != null ? request.getCertification().trim() : "VietGAP")
                .harvestDate(request.getHarvestDate())
                .expiryDate(request.getExpiryDate())
                .totalWeightKg(request.getTotalWeightKg())
                .availableWeightKg(availableWeight)
                .basePricePerKg(request.getBasePricePerKg())
                .tierPricingJson((request.getTierPricingJson() != null && !request.getTierPricingJson().isBlank()) ? request.getTierPricingJson() : "[]")
                .reqTempMin(minTemp)
                .reqTempMax(maxTemp)
                .status(status)
                .imageUrl(request.getImageUrl())
                .auditNote(request.getAuditNote())
                .warehouseLocation(request.getWarehouseLocation())
                .region(request.getRegion())
                .build();

        HarvestLotResponse response = mapToResponse(harvestLotRepository.save(lot));
        b2bRealtimeService.notifyLotUpdated("LOT_CREATED", response);
        return response;
    }

    @Transactional
    public HarvestLotResponse updateLot(Long id, HarvestLotRequest request) {
        HarvestLot lot = harvestLotRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy lô nông sản với ID: " + id));

        if (request.getLotCode() != null && !request.getLotCode().isBlank() && !request.getLotCode().equalsIgnoreCase(lot.getLotCode())) {
            if (harvestLotRepository.existsByLotCode(request.getLotCode())) {
                throw new IllegalArgumentException("Mã lô '" + request.getLotCode() + "' đã được sử dụng!");
            }
            lot.setLotCode(request.getLotCode().trim().toUpperCase());
        }

        if (request.getFarmerId() != null) {
            lot.setFarmerId(request.getFarmerId());
        }
        if (request.getFarmerName() != null && !request.getFarmerName().isBlank()) {
            lot.setFarmerName(request.getFarmerName().trim());
        }
        lot.setProductName(request.getProductName().trim());
        if (request.getCategory() != null && !request.getCategory().isBlank()) {
            lot.setCategory(request.getCategory().trim().toUpperCase());
        }
        if (request.getCategoryId() != null) lot.setCategoryId(request.getCategoryId());
        if (request.getPucCode() != null && !request.getPucCode().isBlank()) lot.setPucCode(request.getPucCode().trim().toUpperCase());
        if (request.getCertification() != null) lot.setCertification(request.getCertification().trim());
        if (request.getHarvestDate() != null) lot.setHarvestDate(request.getHarvestDate());
        if (request.getExpiryDate() != null) lot.setExpiryDate(request.getExpiryDate());
        lot.setTotalWeightKg(request.getTotalWeightKg());
        if (request.getAvailableWeightKg() != null) {
            lot.setAvailableWeightKg(request.getAvailableWeightKg());
        }
        lot.setBasePricePerKg(request.getBasePricePerKg());
        if (request.getTierPricingJson() != null) lot.setTierPricingJson(request.getTierPricingJson());
        if (request.getReqTempMin() != null) lot.setReqTempMin(request.getReqTempMin());
        if (request.getReqTempMax() != null) lot.setReqTempMax(request.getReqTempMax());
        if (request.getStatus() != null && !request.getStatus().isBlank()) lot.setStatus(request.getStatus());
        if (request.getImageUrl() != null) lot.setImageUrl(request.getImageUrl());
        if (request.getAuditNote() != null) lot.setAuditNote(request.getAuditNote());
        if (request.getWarehouseLocation() != null) lot.setWarehouseLocation(request.getWarehouseLocation());
        if (request.getRegion() != null) lot.setRegion(request.getRegion());

        HarvestLotResponse response = mapToResponse(harvestLotRepository.save(lot));
        b2bRealtimeService.notifyLotUpdated("LOT_UPDATED", response);
        return response;
    }

    @Transactional
    public HarvestLotResponse updateLotStatus(Long id, HarvestLotStatusUpdateRequest request) {
        HarvestLot lot = harvestLotRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy lô nông sản với ID: " + id));

        String newStatus = request.getStatus().trim().toUpperCase();
        lot.setStatus(newStatus);

        if (request.getRejectionReason() != null) {
            lot.setRejectionReason(request.getRejectionReason());
        }
        if (request.getAuditNote() != null) {
            lot.setAuditNote(request.getAuditNote());
            lot.setReviewNote(request.getAuditNote());
        }

        log.info("Cập nhật trạng thái Lô {} -> {} (Lý do: {})", lot.getLotCode(), newStatus, request.getRejectionReason());
        HarvestLotResponse response = mapToResponse(harvestLotRepository.save(lot));
        b2bRealtimeService.notifyLotUpdated("LOT_STATUS_CHANGED", response);
        return response;
    }

    @Transactional
    public HarvestLotResponse updateFarmerAvailableWeight(Long lotId, Long farmerId, BigDecimal availableWeightKg) {
        HarvestLot lot = harvestLotRepository.findById(lotId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy lô nông sản với ID: " + lotId));

        if (!Objects.equals(lot.getFarmerId(), farmerId)) {
            throw new AuthException(403, "OWNER_REQUIRED", "Lô nông sản này không thuộc tài khoản nhà vườn của bạn.");
        }

        String currentStatus = lot.getStatus() != null ? lot.getStatus().trim().toUpperCase() : "";
        if ("REJECTED".equals(currentStatus) || "SUSPENDED".equals(currentStatus)) {
            throw new IllegalArgumentException("Không thể điều chỉnh sản lượng của lô đang ở trạng thái " + currentStatus);
        }

        if (availableWeightKg == null || availableWeightKg.compareTo(BigDecimal.ZERO) < 0) {
            throw new IllegalArgumentException("Sản lượng còn lại phải lớn hơn hoặc bằng 0 kg.");
        }
        if (lot.getTotalWeightKg() != null && availableWeightKg.compareTo(lot.getTotalWeightKg()) > 0) {
            throw new IllegalArgumentException(
                    "Sản lượng còn lại (" + availableWeightKg + " kg) không được vượt quá sản lượng dự kiến (" + lot.getTotalWeightKg() + " kg)."
            );
        }

        lot.setAvailableWeightKg(availableWeightKg);
        if (availableWeightKg.compareTo(BigDecimal.ZERO) == 0 && "OPEN".equals(currentStatus)) {
            lot.setStatus("SOLD_OUT");
        } else if (availableWeightKg.compareTo(BigDecimal.ZERO) > 0 && "SOLD_OUT".equals(currentStatus)) {
            lot.setStatus("OPEN");
        }

        HarvestLotResponse response = mapToResponse(harvestLotRepository.save(lot));
        b2bRealtimeService.notifyLotUpdated("LOT_UPDATED", response);
        return response;
    }

    @Transactional
    public void deleteLot(Long id) {
        HarvestLot lot = harvestLotRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy lô nông sản với ID: " + id));

        Integer rfqCount = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM rfq_negotiations WHERE harvest_lot_id = ?", Integer.class, id);
        Integer buyerRfqCount = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM buyer_rfqs WHERE harvest_lot_id = ?", Integer.class, id);
        Integer contractCount = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM b2b_contracts WHERE harvest_lot_id = ? OR lot_id = ?", Integer.class, id, id);

        int totalRefs = (rfqCount != null ? rfqCount : 0)
                + (buyerRfqCount != null ? buyerRfqCount : 0)
                + (contractCount != null ? contractCount : 0);

        if (totalRefs > 0) {
            throw new IllegalArgumentException(
                    "Lô nông sản '" + lot.getLotCode() + "' đã phát sinh yêu cầu báo giá (RFQ) hoặc Hợp đồng B2B lịch sử, không thể xóa cứng để bảo toàn chứng từ. Vui lòng chuyển sang 'Tạm khóa (SUSPENDED)' hoặc 'Từ chối (REJECTED)' kèm lý do!"
            );
        }

        Map<String, Object> deletedInfo = new HashMap<>();
        deletedInfo.put("id", lot.getId());
        deletedInfo.put("lotCode", lot.getLotCode());
        deletedInfo.put("productName", lot.getProductName());
        deletedInfo.put("farmerId", lot.getFarmerId());
        harvestLotRepository.delete(lot);
        b2bRealtimeService.notifyLotUpdated("LOT_DELETED", deletedInfo);
    }

    @Transactional(readOnly = true)
    public Map<String, Object> getLotStats() {
        Map<String, Object> stats = new HashMap<>();
        long total = harvestLotRepository.count();
        long open = harvestLotRepository.countByStatus("OPEN");
        long pending = harvestLotRepository.countByStatus("PENDING_APPROVAL");
        long suspended = harvestLotRepository.countByStatus("SUSPENDED");
        long rejected = harvestLotRepository.countByStatus("REJECTED");
        long soldOut = harvestLotRepository.countByStatus("SOLD_OUT");

        stats.put("totalLots", total);
        stats.put("openLots", open);
        stats.put("pendingLots", pending);
        stats.put("suspendedLots", suspended);
        stats.put("rejectedLots", rejected);
        stats.put("soldOutLots", soldOut);
        return stats;
    }

    private String generateLotCode(String region) {
        int year = LocalDate.now().getYear();
        String regionPrefix = "LD"; // Lâm Đồng default
        if (region != null) {
            String lower = region.toLowerCase();
            if (lower.contains("mộc châu") || lower.contains("sơn la")) regionPrefix = "SLA";
            else if (lower.contains("bến tre") || lower.contains("ba tri")) regionPrefix = "BTR";
            else if (lower.contains("đơn dương")) regionPrefix = "DD";
            else if (lower.contains("đà lạt")) regionPrefix = "LD";
        }
        String randomSuffix = UUID.randomUUID().toString().substring(0, 4).toUpperCase();
        return String.format("LOT-%s-%d-%s", regionPrefix, year, randomSuffix);
    }

    private HarvestLotResponse mapToResponse(HarvestLot lot) {
        var farmer = lot.getFarmer();
        if (farmer == null && lot.getFarmerId() != null) {
            farmer = userRepository.findById(lot.getFarmerId()).orElse(null);
        }
        var profile = farmer != null ? farmerProfileRepository.findByUser(farmer).orElse(null) : null;

        String resolvedFarmName = (profile != null && profile.getFarmName() != null && !profile.getFarmName().isBlank())
                ? profile.getFarmName()
                : (farmer != null && farmer.getCompanyName() != null && !farmer.getCompanyName().isBlank()
                    ? farmer.getCompanyName()
                    : lot.getFarmerName());
        String resolvedFarmLocation = (profile != null && profile.getLocation() != null && !profile.getLocation().isBlank())
                ? profile.getLocation()
                : (farmer != null ? farmer.getAddress() : null);
        String resolvedPuc = (lot.getPucCode() != null && !lot.getPucCode().isBlank())
                ? lot.getPucCode()
                : (profile != null && profile.getPucCode() != null && !profile.getPucCode().isBlank()
                    ? profile.getPucCode()
                    : (farmer != null ? farmer.getPucCode() : null));
        String resolvedCert = (lot.getCertification() != null && !lot.getCertification().isBlank())
                ? lot.getCertification()
                : (profile != null && profile.getCertifications() != null && !profile.getCertifications().isBlank()
                    ? profile.getCertifications()
                    : (farmer != null ? farmer.getCertification() : null));

        return HarvestLotResponse.builder()
                .id(lot.getId())
                .lotCode(lot.getLotCode())
                .farmerId(lot.getFarmerId())
                .farmerName(resolvedFarmName)
                .productName(lot.getProductName())
                .category(lot.getCategory())
                .categoryId(lot.getCategoryId())
                .pucCode(resolvedPuc)
                .certification(resolvedCert)
                .harvestDate(lot.getHarvestDate())
                .expiryDate(lot.getExpiryDate())
                .totalWeightKg(lot.getTotalWeightKg())
                .availableWeightKg(lot.getAvailableWeightKg())
                .basePricePerKg(lot.getBasePricePerKg())
                .tierPricingJson(lot.getTierPricingJson())
                .reqTempMin(lot.getReqTempMin())
                .reqTempMax(lot.getReqTempMax())
                .status(lot.getStatus())
                .imageUrl(lot.getImageUrl())
                .rejectionReason(lot.getRejectionReason())
                .auditNote(lot.getAuditNote())
                .warehouseLocation(lot.getWarehouseLocation())
                .region(lot.getRegion())
                .farmName(resolvedFarmName)
                .farmLocation(resolvedFarmLocation)
                .farmOwner(farmer != null ? farmer.getFullName() : null)
                .farmArea(profile != null ? profile.getCultivatedArea() : null)
                .farmContactPhone(farmer != null ? farmer.getPhone() : null)
                .createdAt(lot.getCreatedAt())
                .updatedAt(lot.getUpdatedAt())
                .build();
    }

    @Transactional(readOnly = true)
    public java.util.List<com.btl.webbanrau.dto.response.FarmerPublicProfileResponse> getPublicFarmers() {
        var farmers = userRepository.findAllActiveFarmers();
        // Lấy tất cả lô đã từng được duyệt mở bán (OPEN + đã bán/hoàn tất/tạm ngưng, loại trừ PENDING_APPROVAL và REJECTED)
        var allLots = harvestLotRepository.findAll(Sort.by(Sort.Direction.DESC, "createdAt"));

        Map<Long, java.util.List<HarvestLot>> lotsByFarmerId = new HashMap<>();
        Map<String, java.util.List<HarvestLot>> lotsByFarmerName = new HashMap<>();
        for (HarvestLot lot : allLots) {
            String st = lot.getStatus() != null ? lot.getStatus().trim().toUpperCase() : "";
            if ("PENDING_APPROVAL".equals(st) || "REJECTED".equals(st) || "DRAFT".equals(st)) {
                continue;
            }
            if (lot.getFarmerId() != null) {
                lotsByFarmerId.computeIfAbsent(lot.getFarmerId(), k -> new java.util.ArrayList<>()).add(lot);
            }
            if (lot.getFarmerName() != null && !lot.getFarmerName().isBlank()) {
                lotsByFarmerName.computeIfAbsent(lot.getFarmerName().trim().toLowerCase(), k -> new java.util.ArrayList<>()).add(lot);
            }
        }

        java.util.List<com.btl.webbanrau.dto.response.FarmerPublicProfileResponse> result = new java.util.ArrayList<>();
        for (var user : farmers) {
            var profile = farmerProfileRepository.findByUserId(user.getId()).orElse(null);

            String farmName = (profile != null && profile.getFarmName() != null && !profile.getFarmName().isBlank())
                    ? profile.getFarmName()
                    : (user.getCompanyName() != null && !user.getCompanyName().isBlank() ? user.getCompanyName() : user.getFullName());

            java.util.Map<Long, HarvestLot> mergedLotsMap = new java.util.LinkedHashMap<>();
            for (HarvestLot l : lotsByFarmerId.getOrDefault(user.getId(), java.util.Collections.emptyList())) {
                mergedLotsMap.put(l.getId(), l);
            }
            if (farmName != null && !farmName.isBlank()) {
                for (HarvestLot l : lotsByFarmerName.getOrDefault(farmName.trim().toLowerCase(), java.util.Collections.emptyList())) {
                    mergedLotsMap.putIfAbsent(l.getId(), l);
                }
            }
            if (user.getFullName() != null && !user.getFullName().isBlank()) {
                for (HarvestLot l : lotsByFarmerName.getOrDefault(user.getFullName().trim().toLowerCase(), java.util.Collections.emptyList())) {
                    mergedLotsMap.putIfAbsent(l.getId(), l);
                }
            }
            var userLots = new java.util.ArrayList<>(mergedLotsMap.values());
            String address = (profile != null && profile.getLocation() != null && !profile.getLocation().isBlank())
                    ? profile.getLocation()
                    : (user.getAddress() != null && !user.getAddress().isBlank() ? user.getAddress() : "Vùng trồng liên kết");
            String pucCode = (profile != null && profile.getPucCode() != null && !profile.getPucCode().isBlank())
                    ? profile.getPucCode()
                    : user.getPucCode();
            String certification = (user.getCertification() != null && !user.getCertification().isBlank())
                    ? user.getCertification()
                    : "VietGAP";

            BigDecimal totalAvailableKg = BigDecimal.ZERO;
            int openCount = 0;
            int pastCount = 0;
            java.util.LinkedHashSet<String> produceSet = new java.util.LinkedHashSet<>();
            java.util.List<com.btl.webbanrau.dto.response.FarmerPublicProfileResponse.OpenLotSummary> lotSummaries = new java.util.ArrayList<>();
            String coverUrl = null;

            for (HarvestLot l : userLots) {
                boolean isOpen = "OPEN".equalsIgnoreCase(l.getStatus());
                if (isOpen) {
                    openCount++;
                    if (l.getAvailableWeightKg() != null) {
                        totalAvailableKg = totalAvailableKg.add(l.getAvailableWeightKg());
                    }
                } else {
                    pastCount++;
                }
                if (l.getProductName() != null && !l.getProductName().isBlank()) {
                    produceSet.add(l.getProductName());
                }
                if (coverUrl == null && l.getImageUrl() != null && !l.getImageUrl().isBlank()) {
                    coverUrl = l.getImageUrl();
                }
                lotSummaries.add(com.btl.webbanrau.dto.response.FarmerPublicProfileResponse.OpenLotSummary.builder()
                        .id(l.getId())
                        .lotCode(l.getLotCode())
                        .productName(l.getProductName())
                        .basePricePerKg(l.getBasePricePerKg())
                        .availableWeightKg(l.getAvailableWeightKg())
                        .totalWeightKg(l.getTotalWeightKg())
                        .status(l.getStatus())
                        .pucCode(l.getPucCode())
                        .build());
            }

            result.add(com.btl.webbanrau.dto.response.FarmerPublicProfileResponse.builder()
                    .id(user.getId())
                    .farmName(farmName)
                    .ownerName(user.getFullName())
                    .householdFarmer(user.isHouseholdFarmer())
                    .pucCode(pucCode)
                    .certification(certification)
                    .kycStatus(user.getKycStatus())
                    .address(address)
                    .openLotCount(openCount)
                    .pastLotCount(pastCount)
                    .totalAvailableKg(totalAvailableKg)
                    .mainProduce(new java.util.ArrayList<>(produceSet))
                    .coverImageUrl(coverUrl)
                    .openLots(lotSummaries)
                    .build());
        }
        result.sort((a, b) -> Integer.compare(b.getOpenLotCount() + b.getPastLotCount(), a.getOpenLotCount() + a.getPastLotCount()));
        return result;
    }
}
