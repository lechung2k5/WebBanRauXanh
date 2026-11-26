package com.btl.webbanrau.service;

import com.btl.webbanrau.dto.request.CreateProcurementQuoteDto;
import com.btl.webbanrau.dto.request.CreateProcurementRequestDto;
import com.btl.webbanrau.dto.response.ProcurementQuoteResponse;
import com.btl.webbanrau.dto.response.ProcurementRequestResponse;
import com.btl.webbanrau.model.BuyerRfq;
import com.btl.webbanrau.model.HarvestLot;
import com.btl.webbanrau.model.ProcurementQuote;
import com.btl.webbanrau.model.ProcurementRequest;
import com.btl.webbanrau.model.RfqStatus;
import com.btl.webbanrau.model.User;
import com.btl.webbanrau.repository.BuyerRfqRepository;
import com.btl.webbanrau.repository.HarvestLotRepository;
import com.btl.webbanrau.repository.ProcurementQuoteRepository;
import com.btl.webbanrau.repository.ProcurementRequestRepository;
import com.btl.webbanrau.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class ProcurementService {

    private final ProcurementRequestRepository requestRepository;
    private final ProcurementQuoteRepository quoteRepository;
    private final HarvestLotRepository harvestLotRepository;
    private final BuyerRfqRepository buyerRfqRepository;
    private final UserRepository userRepository;
    private final B2bRealtimeService realtimeService;

    private Optional<User> getCurrentUserOptional() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated()) {
            return Optional.empty();
        }
        Object principal = auth.getPrincipal();
        if (principal instanceof User user) {
            return userRepository.findById(user.getId());
        }
        if (principal instanceof String name && !"anonymousUser".equals(name)) {
            return userRepository.findByUsernameOrEmail(name, name);
        }
        return Optional.empty();
    }

    private User requireCurrentUser() {
        return getCurrentUserOptional()
                .orElseThrow(() -> new IllegalStateException("Vui lòng đăng nhập để thực hiện thao tác này."));
    }

    @Transactional(readOnly = true)
    public List<ProcurementRequestResponse> getAllRequests() {
        Long currentUserId = getCurrentUserOptional().map(User::getId).orElse(null);
        return requestRepository.findAllByOrderByCreatedAtDesc().stream()
                .map(req -> toRequestResponse(req, currentUserId))
                .toList();
    }

    @Transactional
    public ProcurementRequestResponse createRequest(CreateProcurementRequestDto dto) {
        User buyer = requireCurrentUser();
        String code = "PR-" + System.currentTimeMillis() % 1000000;

        ProcurementRequest entity = ProcurementRequest.builder()
                .requestCode(code)
                .buyerId(buyer.getId())
                .buyerName(buyer.getFullName() != null && !buyer.getFullName().isBlank() ? buyer.getFullName() : buyer.getUsername())
                .buyerCompany(buyer.getCompanyName() != null && !buyer.getCompanyName().isBlank() ? buyer.getCompanyName() : buyer.getFullName())
                .category(dto.getCategory().trim())
                .title(dto.getTitle().trim())
                .volumeNeeded(dto.getVolumeNeeded().trim())
                .targetPriceRange(dto.getTargetPriceRange().trim())
                .destination(dto.getDestination().trim())
                .status("OPEN")
                .build();

        ProcurementRequest saved = requestRepository.save(entity);
        ProcurementRequestResponse response = toRequestResponse(saved, buyer.getId());
        realtimeService.notifyProcurementUpdated("PROCUREMENT_CREATED", response);
        return response;
    }

    @Transactional
    public ProcurementQuoteResponse submitQuote(Long requestId, CreateProcurementQuoteDto dto) {
        User farmer = requireCurrentUser();
        ProcurementRequest req = requestRepository.findById(requestId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy tin cần thu mua #" + requestId));

        if (!"OPEN".equalsIgnoreCase(req.getStatus())) {
            throw new IllegalArgumentException("Tin thu mua này đã đóng hoặc hoàn tất.");
        }

        // Bắt buộc kiểm tra lô nông sản thuộc chính nhà vườn và đã được BQT duyệt (OPEN)
        HarvestLot lot = harvestLotRepository.findById(dto.getHarvestLotId())
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy lô nông sản đã chọn."));

        if (!lot.getFarmerId().equals(farmer.getId())) {
            throw new IllegalArgumentException("Bạn chỉ có thể sử dụng lô nông sản thuộc quyền sở hữu của mình.");
        }

        if (!"OPEN".equalsIgnoreCase(lot.getStatus())) {
            throw new IllegalArgumentException("Lô nông sản này chưa được duyệt mở bán (trạng thái hiện tại: " + lot.getStatus() + "). Vui lòng đăng lô và chờ BQT duyệt trước.");
        }

        if (lot.getAvailableWeightKg() == null || lot.getAvailableWeightKg().compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("Lô nông sản đã hết sản lượng khả dụng.");
        }

        if (dto.getOfferedQuantityKg().compareTo(lot.getAvailableWeightKg()) > 0) {
            throw new IllegalArgumentException("Sản lượng cam kết vượt quá sản lượng còn lại của lô (" + lot.getAvailableWeightKg() + " kg).");
        }

        if (quoteRepository.existsByProcurementRequestIdAndFarmerIdAndHarvestLotId(requestId, farmer.getId(), lot.getId())) {
            throw new IllegalArgumentException("Bạn đã gửi chào giá với lô " + lot.getLotCode() + " cho tin thu mua này rồi.");
        }

        ProcurementQuote quote = ProcurementQuote.builder()
                .procurementRequestId(requestId)
                .farmerId(farmer.getId())
                .farmerName(lot.getFarmerName() != null && !lot.getFarmerName().isBlank() ? lot.getFarmerName() : farmer.getFullName())
                .harvestLotId(lot.getId())
                .lotCode(lot.getLotCode())
                .productName(lot.getProductName())
                .pucCode(lot.getPucCode())
                .certification(lot.getCertification())
                .offeredPricePerKg(dto.getOfferedPricePerKg())
                .offeredQuantityKg(dto.getOfferedQuantityKg())
                .deliveryDate(dto.getDeliveryDate())
                .notes(dto.getNotes())
                .status("PENDING")
                .build();

        ProcurementQuote saved = quoteRepository.save(quote);

        // Tự động tạo Đơn Đàm Phán (BuyerRfq) ở trạng thái WAITING_BUYER để 2 bên thương lượng / chốt hợp đồng ngay
        User buyer = userRepository.findById(req.getBuyerId())
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy tài khoản Thương lái đăng tin."));
        String rfqCode = "RFQ-PR-" + (System.currentTimeMillis() % 1000000);
        String combinedNotes = "[Chào giá từ tin " + req.getRequestCode() + "] "
                + (dto.getNotes() != null && !dto.getNotes().isBlank() ? dto.getNotes().trim() : req.getTitle());

        BuyerRfq rfq = BuyerRfq.builder()
                .rfqCode(rfqCode)
                .buyer(buyer)
                .harvestLot(lot)
                .quantityKg(dto.getOfferedQuantityKg())
                .proposedPricePerKg(dto.getOfferedPricePerKg())
                .counterPricePerKg(dto.getOfferedPricePerKg())
                .desiredDeliveryDate(dto.getDeliveryDate() != null ? dto.getDeliveryDate() : LocalDate.now().plusDays(3))
                .deliveryLocation(req.getDestination())
                .shippingOption("cold_storage_truck")
                .notes(combinedNotes)
                .status(RfqStatus.WAITING_BUYER)
                .build();
        buyerRfqRepository.save(rfq);

        ProcurementQuoteResponse response = toQuoteResponse(saved);
        realtimeService.notifyProcurementUpdated("PROCUREMENT_QUOTED", toRequestResponse(req, null));
        realtimeService.notifyRfqUpdated("RFQ_CREATED", rfqCode, Map.of("rfqCode", rfqCode, "status", rfq.getStatus()));
        return response;
    }

    @Transactional(readOnly = true)
    public List<ProcurementQuoteResponse> getQuotesForRequest(Long requestId) {
        User currentUser = requireCurrentUser();
        ProcurementRequest req = requestRepository.findById(requestId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy tin cần thu mua #" + requestId));

        boolean isAdmin = currentUser.getRoles() != null && currentUser.getRoles().stream()
                .anyMatch(r -> "ROLE_ADMIN".equalsIgnoreCase(r.getName()) || "ADMIN".equalsIgnoreCase(r.getName()));

        if (!req.getBuyerId().equals(currentUser.getId()) && !isAdmin) {
            throw new IllegalArgumentException("Bạn không có quyền xem danh sách báo giá của tin thu mua này.");
        }

        return quoteRepository.findByProcurementRequestIdOrderByCreatedAtDesc(requestId).stream()
                .map(this::toQuoteResponse)
                .toList();
    }

    private ProcurementRequestResponse toRequestResponse(ProcurementRequest req, Long currentUserId) {
        long quoteCount = quoteRepository.countByProcurementRequestId(req.getId());
        boolean quoted = currentUserId != null && quoteRepository.existsByProcurementRequestIdAndFarmerId(req.getId(), currentUserId);
        return ProcurementRequestResponse.builder()
                .id(req.getId())
                .requestCode(req.getRequestCode())
                .buyerId(req.getBuyerId())
                .buyerName(req.getBuyerName())
                .buyerCompany(req.getBuyerCompany())
                .category(req.getCategory())
                .title(req.getTitle())
                .volumeNeeded(req.getVolumeNeeded())
                .targetPriceRange(req.getTargetPriceRange())
                .destination(req.getDestination())
                .status(req.getStatus())
                .quoteCount(quoteCount)
                .quotedByCurrentUser(quoted)
                .createdAt(req.getCreatedAt())
                .build();
    }

    private ProcurementQuoteResponse toQuoteResponse(ProcurementQuote q) {
        return ProcurementQuoteResponse.builder()
                .id(q.getId())
                .procurementRequestId(q.getProcurementRequestId())
                .farmerId(q.getFarmerId())
                .farmerName(q.getFarmerName())
                .harvestLotId(q.getHarvestLotId())
                .lotCode(q.getLotCode())
                .productName(q.getProductName())
                .pucCode(q.getPucCode())
                .certification(q.getCertification())
                .offeredPricePerKg(q.getOfferedPricePerKg())
                .offeredQuantityKg(q.getOfferedQuantityKg())
                .deliveryDate(q.getDeliveryDate())
                .notes(q.getNotes())
                .status(q.getStatus())
                .createdAt(q.getCreatedAt())
                .build();
    }
}
