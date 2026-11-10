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
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class HarvestLotService {

    private final HarvestLotRepository harvestLotRepository;
    private final com.btl.webbanrau.repository.UserRepository userRepository;

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
        Sort sort = sortDir.equalsIgnoreCase("ASC")
                ? Sort.by(sortBy).ascending()
                : Sort.by(sortBy).descending();

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

        return mapToResponse(harvestLotRepository.save(lot));
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
        lot.setCategory(request.getCategory().trim().toUpperCase());
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

        return mapToResponse(harvestLotRepository.save(lot));
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
        return mapToResponse(harvestLotRepository.save(lot));
    }

    @Transactional
    public void deleteLot(Long id) {
        if (!harvestLotRepository.existsById(id)) {
            throw new IllegalArgumentException("Không tìm thấy lô nông sản với ID: " + id);
        }
        harvestLotRepository.deleteById(id);
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
        return HarvestLotResponse.builder()
                .id(lot.getId())
                .lotCode(lot.getLotCode())
                .farmerId(lot.getFarmerId())
                .farmerName(lot.getFarmerName())
                .productName(lot.getProductName())
                .category(lot.getCategory())
                .categoryId(lot.getCategoryId())
                .pucCode(lot.getPucCode())
                .certification(lot.getCertification())
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
                .createdAt(lot.getCreatedAt())
                .updatedAt(lot.getUpdatedAt())
                .build();
    }
}
