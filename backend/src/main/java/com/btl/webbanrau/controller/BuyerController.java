package com.btl.webbanrau.controller;

import com.btl.webbanrau.dto.request.BuyerProfileRequest;
import com.btl.webbanrau.dto.request.BuyerRfqRequest;
import com.btl.webbanrau.dto.response.ApiResponse;
import com.btl.webbanrau.model.BuyerProfile;
import com.btl.webbanrau.model.BuyerRfq;
import com.btl.webbanrau.model.B2bContract;
import com.btl.webbanrau.model.HubInspection;
import com.btl.webbanrau.model.IotSensorLog;
import com.btl.webbanrau.model.HarvestLot;
import com.btl.webbanrau.model.User;
import com.btl.webbanrau.repository.BuyerProfileRepository;
import com.btl.webbanrau.repository.BuyerRfqRepository;
import com.btl.webbanrau.repository.B2bContractRepository;
import com.btl.webbanrau.repository.HubInspectionRepository;
import com.btl.webbanrau.repository.IotSensorLogRepository;
import com.btl.webbanrau.repository.HarvestLotRepository;
import com.btl.webbanrau.repository.UserRepository;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.LinkedHashMap;
import java.util.UUID;
import java.math.BigDecimal;

@RestController
@RequestMapping("/buyer")
@RequiredArgsConstructor
@PreAuthorize("hasRole('BUYER')")
public class BuyerController {
    private final UserRepository userRepository;
    private final BuyerProfileRepository profileRepository;
    private final BuyerRfqRepository rfqRepository;
    private final B2bContractRepository contractRepository;
    private final HubInspectionRepository inspectionRepository;
    private final IotSensorLogRepository sensorLogRepository;
    private final HarvestLotRepository harvestLotRepository;

    @GetMapping("/profile")
    public ApiResponse<BuyerProfile> getProfile(java.security.Principal principal) {
        User user = currentUser(principal);
        BuyerProfile profile = profileRepository.findByUserId(user.getId()).orElseGet(() -> profileRepository.save(BuyerProfile.builder().user(user).contactName(user.getFullName()).contactPhone(user.getPhone()).build()));
        return ApiResponse.success(profile);
    }

    @PutMapping("/profile")
    public ApiResponse<BuyerProfile> updateProfile(java.security.Principal principal, @Valid @RequestBody BuyerProfileRequest request) {
        User user = currentUser(principal);
        BuyerProfile profile = profileRepository.findByUserId(user.getId()).orElseGet(() -> BuyerProfile.builder().user(user).build());
        profile.setCompanyName(request.getCompanyName().trim());
        profile.setTaxCode(request.getTaxCode());
        profile.setContactName(request.getContactName());
        profile.setContactPhone(request.getContactPhone());
        return ApiResponse.success("Cập nhật hồ sơ Buyer thành công", profileRepository.save(profile));
    }

    @GetMapping("/rfq")
    public ApiResponse<List<BuyerRfq>> getRfqs(java.security.Principal principal) {
        return ApiResponse.success(rfqRepository.findByBuyerIdOrderByCreatedAtDesc(currentUser(principal).getId()));
    }

    @PostMapping("/rfq")
    public ApiResponse<BuyerRfq> createRfq(java.security.Principal principal, @Valid @RequestBody BuyerRfqRequest request) {
        User buyer = currentUser(principal);
        HarvestLot lot = harvestLotRepository.findById(request.getHarvestLotId()).orElseThrow(() -> new IllegalArgumentException("Không tìm thấy lô nông sản"));
        if (!"OPEN".equals(lot.getStatus()) || lot.getAvailableWeightKg().compareTo(request.getQuantityKg()) < 0) throw new IllegalArgumentException("Lô hàng không đủ sản lượng hoặc đã đóng");
        BuyerRfq rfq = BuyerRfq.builder().rfqCode("RFQ-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase()).buyer(buyer).harvestLot(lot).quantityKg(request.getQuantityKg()).proposedPricePerKg(request.getProposedPricePerKg()).desiredDeliveryDate(request.getDesiredDeliveryDate()).deliveryLocation(request.getDeliveryLocation().trim()).shippingOption(request.getShippingOption()).notes(request.getNotes()).build();
        return ApiResponse.success("Gửi RFQ thành công", rfqRepository.save(rfq));
    }

    @PatchMapping("/rfq/{id}/accept-counter")
    public ApiResponse<BuyerRfq> acceptCounter(java.security.Principal principal, @PathVariable Long id) {
        BuyerRfq rfq = rfqRepository.findById(id).orElseThrow(() -> new IllegalArgumentException("Không tìm thấy RFQ"));
        if (!rfq.getBuyer().getId().equals(currentUser(principal).getId())) throw new IllegalArgumentException("Bạn không có quyền với RFQ này");
        if (rfq.getCounterPricePerKg() == null) throw new IllegalArgumentException("RFQ chưa có giá phản hồi");
        rfq.setProposedPricePerKg(rfq.getCounterPricePerKg());
        rfq.setStatus("ACCEPTED");
        BuyerRfq savedRfq = rfqRepository.save(rfq);
        BigDecimal total = savedRfq.getQuantityKg().multiply(savedRfq.getProposedPricePerKg());
        contractRepository.save(B2bContract.builder().contractCode("HD-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase())
                .harvestLot(savedRfq.getHarvestLot()).farmer(savedRfq.getHarvestLot().getFarmer())
                .buyerName(savedRfq.getBuyer().getFullName()).buyerPhone(savedRfq.getBuyer().getPhone())
                .quantity(savedRfq.getQuantityKg().doubleValue()).unitPrice(savedRfq.getProposedPricePerKg())
                .totalAmount(total).depositAmount(total.multiply(new BigDecimal("0.30")))
                .deliveryNotes(savedRfq.getDeliveryLocation()).build());
        return ApiResponse.success("Đã chấp nhận giá counter-offer và tạo hợp đồng", savedRfq);
    }

    @GetMapping("/contracts")
    public ApiResponse<List<B2bContract>> getContracts(java.security.Principal principal) {
        return ApiResponse.success(contractRepository.findByBuyerPhoneOrderByCreatedAtDesc(currentUser(principal).getPhone()));
    }

    @GetMapping("/contracts/{id}/qr-deposit")
    public ApiResponse<Map<String, Object>> getDepositQr(java.security.Principal principal, @PathVariable Long id) {
        B2bContract contract = ownedContract(principal, id);
        return ApiResponse.success(Map.of("contractCode", contract.getContractCode(), "amount", contract.getDepositAmount(), "status", contract.getDepositStatus(), "bank", "MB Bank", "accountNumber", "0987654321"));
    }

    @PostMapping("/contracts/{id}/deposit/confirm")
    public ApiResponse<B2bContract> confirmDeposit(java.security.Principal principal, @PathVariable Long id) {
        B2bContract contract = ownedContract(principal, id);
        contract.setDepositStatus("DEPOSIT_PAID");
        contract.setDepositPaidAt(java.time.LocalDateTime.now());
        return ApiResponse.success("Đã xác nhận cọc giả lập", contractRepository.save(contract));
    }

    @GetMapping("/contracts/{id}/qc-report")
    public ApiResponse<List<Map<String, Object>>> getQcReport(java.security.Principal principal, @PathVariable Long id) {
        ownedContract(principal, id);
        List<Map<String, Object>> result = inspectionRepository.findByContractIdOrderByCreatedAtDesc(id).stream().map(this::inspectionView).toList();
        return ApiResponse.success(result);
    }

    @GetMapping("/contracts/{id}/telemetry")
    public ApiResponse<List<Map<String, Object>>> getTelemetry(java.security.Principal principal, @PathVariable Long id) {
        ownedContract(principal, id);
        List<Map<String, Object>> result = sensorLogRepository.findTop50ByContractIdOrderByRecordedAtDesc(id).stream().map(this::sensorView).toList();
        return ApiResponse.success(result);
    }

    private Map<String, Object> inspectionView(HubInspection inspection) {
        Map<String, Object> view = new LinkedHashMap<>();
        view.put("id", inspection.getId()); view.put("receivedWeightKg", inspection.getReceivedWeightKg());
        view.put("qualifiedWeightKg", inspection.getQualifiedWeightKg()); view.put("rejectedWeightKg", inspection.getRejectedWeightKg());
        view.put("brixDegree", inspection.getBrixDegree()); view.put("moisturePercent", inspection.getMoisturePercent());
        view.put("qcNote", inspection.getQcNote()); view.put("createdAt", inspection.getCreatedAt());
        return view;
    }

    private Map<String, Object> sensorView(IotSensorLog log) {
        Map<String, Object> view = new LinkedHashMap<>();
        view.put("id", log.getId()); view.put("temperature", log.getTemperature()); view.put("humidity", log.getHumidity());
        view.put("alert", log.isAlert()); view.put("recordedAt", log.getRecordedAt());
        return view;
    }

    private User currentUser(java.security.Principal principal) {
        return userRepository.findByUsername(principal.getName()).orElseThrow(() -> new IllegalArgumentException("Không tìm thấy tài khoản Buyer"));
    }

    private B2bContract ownedContract(java.security.Principal principal, Long id) {
        B2bContract contract = contractRepository.findById(id).orElseThrow(() -> new IllegalArgumentException("Không tìm thấy hợp đồng"));
        if (!java.util.Objects.equals(contract.getBuyerPhone(), currentUser(principal).getPhone())) throw new IllegalArgumentException("Bạn không có quyền với hợp đồng này");
        return contract;
    }
}
