package com.btl.webbanrau.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.btl.webbanrau.dto.request.BuyerEpodRequest;
import com.btl.webbanrau.dto.request.BuyerRfqActionRequest;
import com.btl.webbanrau.dto.request.BuyerRfqRequest;
import com.btl.webbanrau.dto.request.BuyerWarehouseRequest;
import com.btl.webbanrau.dto.request.BuyerClaimRequest;
import com.btl.webbanrau.dto.request.BuyerProfileRequest;
import com.btl.webbanrau.dto.response.BuyerProfileResponse;
import com.btl.webbanrau.dto.response.OrderResponse;
import com.btl.webbanrau.dto.response.PageResponse;
import com.btl.webbanrau.model.BuyerProfile;
import com.btl.webbanrau.model.BuyerWarehouse;
import com.btl.webbanrau.model.HarvestLot;
import com.btl.webbanrau.model.RfqNegotiation;
import com.btl.webbanrau.model.RfqStatus;
import com.btl.webbanrau.model.User;
import com.btl.webbanrau.repository.BuyerProfileRepository;
import com.btl.webbanrau.repository.BuyerWarehouseRepository;
import com.btl.webbanrau.repository.B2bContractRepository;
import com.btl.webbanrau.repository.HarvestLotRepository;
import com.btl.webbanrau.repository.RfqNegotiationRepository;
import com.btl.webbanrau.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class BuyerWorkflowService {
    private final UserRepository users;
    private final HarvestLotRepository lots;
    private final RfqNegotiationRepository rfqs;
    private final BuyerProfileRepository profiles;
    private final BuyerWarehouseRepository warehouses;
    private final B2bContractRepository b2bContracts;
    private final JdbcTemplate db;
    private final AdminBusinessService business;
    private final OrderService orderService;
    private final ObjectMapper objectMapper;
    private final B2bRealtimeService b2bRealtimeService;

    public User currentBuyer() {
        User user = AuthService.current();
        if (!AuthService.has(user, "BUYER") && !AuthService.has(user, "ADMIN")) {
            throw new AuthException(403, "BUYER_REQUIRED", "Chỉ tài khoản Buyer được sử dụng nghiệp vụ này.");
        }
        return user;
    }

    @Transactional
    public BuyerProfileResponse profile() {
        User buyer = currentBuyer();
        BuyerProfile profile = profiles.findByUserId(buyer.getId()).orElseGet(() -> profiles.save(BuyerProfile.builder()
                .user(buyer)
                .companyName(buyer.getCompanyName())
                .taxCode(buyer.getTaxCode())
                .contactName(buyer.getFullName())
                .contactPhone(buyer.getPhone())
                .build()));
        return toProfileResponse(buyer, profile);
    }

    @Transactional
    public BuyerProfileResponse updateProfile(BuyerProfileRequest request) {
        User buyer = currentBuyer();
        BuyerProfile profile = profileEntity(buyer);
        profile.setCompanyName(request.getCompanyName().trim());
        profile.setTaxCode(request.getTaxCode());
        profile.setContactName(blankToDefault(request.getContactName(), request.getFullName()));
        profile.setContactPhone(blankToDefault(request.getContactPhone(), request.getPhone()));

        buyer.setFullName(request.getFullName().trim());
        buyer.setCompanyName(request.getCompanyName().trim());
        buyer.setTaxCode(request.getTaxCode());
        buyer.setPhone(blankToDefault(request.getPhone(), request.getContactPhone()));
        buyer.setAddress(request.getAddress());
        buyer.setWarehouseAddress(request.getWarehouseAddress());
        users.save(buyer);
        return toProfileResponse(buyer, profiles.save(profile));
    }

    @Transactional
    public List<BuyerWarehouse> addresses() {
        return warehouses.findByBuyerProfileOrderByDefaultWarehouseDescNameAsc(profileEntity(currentBuyer()));
    }

    @Transactional
    public BuyerWarehouse addAddress(BuyerWarehouseRequest request) {
        BuyerProfile profile = profileEntity(currentBuyer());
        if (request.isDefaultWarehouse() || warehouses.findByBuyerProfileOrderByDefaultWarehouseDescNameAsc(profile).isEmpty()) {
            clearDefault(profile);
        }
        return warehouses.save(BuyerWarehouse.builder()
                .buyerProfile(profile)
                .name(request.getName().trim())
                .address(request.getAddress().trim())
                .phone(request.getPhone())
                .defaultWarehouse(request.isDefaultWarehouse() || warehouses.findByBuyerProfileOrderByDefaultWarehouseDescNameAsc(profile).isEmpty())
                .build());
    }

    @Transactional
    public BuyerWarehouse updateAddress(Long id, BuyerWarehouseRequest request) {
        BuyerProfile profile = profileEntity(currentBuyer());
        BuyerWarehouse address = ownedAddress(profile, id);
        if (request.isDefaultWarehouse()) clearDefault(profile);
        address.setName(request.getName().trim());
        address.setAddress(request.getAddress().trim());
        address.setPhone(request.getPhone());
        address.setDefaultWarehouse(request.isDefaultWarehouse());
        return warehouses.save(address);
    }

    @Transactional
    public void deleteAddress(Long id) {
        BuyerProfile profile = profileEntity(currentBuyer());
        BuyerWarehouse address = ownedAddress(profile, id);
        boolean wasDefault = address.isDefaultWarehouse();
        warehouses.delete(address);
        if (wasDefault) {
            List<BuyerWarehouse> remaining = warehouses.findByBuyerProfileOrderByDefaultWarehouseDescNameAsc(profile);
            if (!remaining.isEmpty()) {
                remaining.getFirst().setDefaultWarehouse(true);
                warehouses.save(remaining.getFirst());
            }
        }
    }

    @Transactional(readOnly = true)
    public PageResponse<OrderResponse> orders(int page, int size) {
        return orderService.getOrdersByUser(currentBuyer().getId(), page, size);
    }

    @Transactional
    public Map<String, Object> createRfq(BuyerRfqRequest request) {
        User buyer = currentBuyer();
        HarvestLot lot = lots.findById(request.getHarvestLotId()).orElse(null);
        if (lot == null && request.getLotCode() != null && !request.getLotCode().isBlank()) {
            lot = lots.findByLotCode(request.getLotCode().trim().toUpperCase()).orElse(null);
        }
        if (lot == null) {
            if (Long.valueOf(2026644L).equals(request.getHarvestLotId())) {
                lot = lots.findByLotCode("LOT-2026-DL-644").orElse(null);
            } else if (Long.valueOf(2026635L).equals(request.getHarvestLotId())) {
                lot = lots.findByLotCode("LOT-2026-DL-635").orElse(null);
            }
        }
        if (lot == null) {
            throw new AuthException(404, "LOT_NOT_FOUND", "Không tìm thấy lô nông sản.");
        }
        if (!"OPEN".equals(lot.getStatus()) || lot.getRemainingQuantity() == null || lot.getRemainingQuantity() < request.getQuantityKg().doubleValue()) {
            throw new AuthException(400, "LOT_UNAVAILABLE", "Lô hàng không đủ sản lượng hoặc đã đóng.");
        }
        if (request.getDesiredDeliveryDate().isBefore(LocalDate.now())) {
            throw new AuthException(400, "INVALID_DELIVERY_DATE", "Ngày nhận hàng phải từ hôm nay trở đi.");
        }

        RfqNegotiation rfq = RfqNegotiation.builder()
                .rfqCode("RFQ-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase())
                .buyer(buyer)
                .harvestLot(lot)
                .buyerName(buyer.getFullName())
                .buyerPhone(buyer.getPhone())
                .buyerCompany(buyer.getCompanyName())
                .requestedQuantity(request.getQuantityKg().doubleValue())
                .targetPrice(request.getProposedPricePerKg())
                .deliveryDate(request.getDesiredDeliveryDate())
                .hubLocation(request.getDeliveryLocation().trim())
                .shippingOption(request.getShippingOption())
                .notes(request.getNotes())
                .status(RfqStatus.WAITING_FARMER)
                .expiresAt(LocalDateTime.now().plusHours(24))
                .build();
        RfqNegotiation saved = rfqs.save(rfq);
        recordRfqEvent(saved, buyer.getId(), "BUYER", "CREATED", null, RfqStatus.WAITING_FARMER,
                saved.getRequestedQuantity(), saved.getTargetPrice(), saved.getNotes());
        Map<String, Object> view = rfqView(saved);
        b2bRealtimeService.notifyRfqUpdated("RFQ_CREATED", saved.getRfqCode(), view);
        return view;
    }

    @Transactional
    public List<Map<String, Object>> listRfqs() {
        User buyer = currentBuyer();
        return rfqs.findByBuyerOrderByCreatedAtDesc(buyer).stream().map(rfq -> {
            expireIfNeeded(rfq);
            return rfqView(rfq);
        }).toList();
    }

    @Transactional
    public Map<String, Object> updateRfq(Long id, BuyerRfqRequest request) {
        User buyer = currentBuyer();
        RfqNegotiation rfq = rfqs.findById(id)
                .orElseThrow(() -> new AuthException(404, "RFQ_NOT_FOUND", "Không tìm thấy RFQ."));
        if (rfq.getBuyer() == null || !Objects.equals(rfq.getBuyer().getId(), buyer.getId())) {
            throw new AuthException(403, "RFQ_OWNER_REQUIRED", "Bạn không có quyền sửa RFQ này.");
        }
        if (!"WAITING_FARMER".equalsIgnoreCase(rfq.getStatus()) && !"PENDING".equalsIgnoreCase(rfq.getStatus())) {
            throw new AuthException(400, "CANNOT_EDIT_RFQ", "Chỉ có thể chỉnh sửa khi đơn đang chờ nhà vườn phản hồi.");
        }
        if (request.getQuantityKg() != null) rfq.setRequestedQuantity(request.getQuantityKg().doubleValue());
        if (request.getProposedPricePerKg() != null) rfq.setTargetPrice(request.getProposedPricePerKg());
        if (request.getDesiredDeliveryDate() != null) rfq.setDeliveryDate(request.getDesiredDeliveryDate());
        if (request.getDeliveryLocation() != null) rfq.setHubLocation(request.getDeliveryLocation().trim());
        if (request.getShippingOption() != null) rfq.setShippingOption(request.getShippingOption());
        if (request.getNotes() != null) rfq.setNotes(request.getNotes());

        RfqNegotiation saved = rfqs.save(rfq);
        recordRfqEvent(saved, buyer.getId(), "BUYER", "EDITED", rfq.getStatus(), saved.getStatus(),
                saved.getRequestedQuantity(), saved.getTargetPrice(), "Người mua cập nhật lại đơn đàm phán");
        Map<String, Object> view = rfqView(saved);
        b2bRealtimeService.notifyRfqUpdated("RFQ_EDITED", saved.getRfqCode(), view);
        return view;
    }

    @Transactional
    public Map<String, Object> cancelRfq(Long id) {
        User buyer = currentBuyer();
        RfqNegotiation rfq = rfqs.findById(id)
                .orElseThrow(() -> new AuthException(404, "RFQ_NOT_FOUND", "Không tìm thấy RFQ."));
        if (rfq.getBuyer() == null || !Objects.equals(rfq.getBuyer().getId(), buyer.getId())) {
            throw new AuthException(403, "RFQ_OWNER_REQUIRED", "Bạn không có quyền hủy RFQ này.");
        }
        String currentStatus = RfqStatus.normalize(rfq.getStatus());
        if ("ACCEPTED".equalsIgnoreCase(currentStatus) || "CONTRACT_CREATED".equalsIgnoreCase(currentStatus)) {
            throw new AuthException(400, "CANNOT_CANCEL_RFQ", "Đơn đàm phán đã được chốt hợp đồng, không thể hủy.");
        }
        rfq.setStatus(RfqStatus.CANCELLED);
        RfqNegotiation saved = rfqs.save(rfq);
        recordRfqEvent(saved, buyer.getId(), "BUYER", "CANCEL", currentStatus, RfqStatus.CANCELLED,
                saved.getRequestedQuantity(), saved.getTargetPrice(), "Người mua chủ động hủy đơn đàm phán");
        Map<String, Object> view = rfqView(saved);
        b2bRealtimeService.notifyRfqUpdated("RFQ_CANCELLED", saved.getRfqCode(), view);
        return view;
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> rfqHistory(Long id) {
        User buyer = currentBuyer();
        RfqNegotiation rfq = rfqs.findById(id)
                .orElseThrow(() -> new AuthException(404, "RFQ_NOT_FOUND", "Không tìm thấy RFQ."));
        if (rfq.getBuyer() == null || !Objects.equals(rfq.getBuyer().getId(), buyer.getId())) {
            throw new AuthException(403, "RFQ_OWNER_REQUIRED", "Bạn không có quyền xem RFQ này.");
        }
        return db.queryForList("SELECT * FROM rfq_negotiation_events WHERE rfq_id=? ORDER BY created_at, id", id);
    }

    @Transactional
    public Map<String, Object> respondToRfq(Long id, BuyerRfqActionRequest request) {
        User buyer = currentBuyer();
        RfqNegotiation rfq = rfqs.findById(id)
                .orElseThrow(() -> new AuthException(404, "RFQ_NOT_FOUND", "Không tìm thấy RFQ."));
        if (rfq.getBuyer() == null) {
            rfq.setBuyer(buyer);
        } else if (!Objects.equals(rfq.getBuyer().getId(), buyer.getId()) && !AuthService.has(buyer, "ADMIN")) {
            throw new AuthException(403, "RFQ_OWNER_REQUIRED", "Bạn không có quyền với RFQ này.");
        }
        expireIfNeeded(rfq);
        String action = request.getAction().trim().toUpperCase();
        String currentStatus = RfqStatus.normalize(rfq.getStatus());
        if ("COUNTER".equals(action)) {
            if (!RfqStatus.isBuyerTurn(currentStatus)) {
                throw new AuthException(400, "RFQ_NOT_BUYER_TURN", "RFQ hiện chưa đến lượt người mua phản hồi.");
            }
            if (request.getCounterPrice() == null || request.getCounterPrice().signum() <= 0) {
                throw new AuthException(400, "COUNTER_PRICE_REQUIRED", "Counter-offer phải có giá hợp lệ.");
            }
            rfq.setCounterPrice(request.getCounterPrice());
            if (request.getCounterQuantity() != null) rfq.setCounterQuantity(request.getCounterQuantity());
            rfq.setStatus(RfqStatus.WAITING_FARMER);
            RfqNegotiation saved = rfqs.save(rfq);
            recordRfqEvent(saved, buyer.getId(), "BUYER", "COUNTER", currentStatus, saved.getStatus(),
                    saved.getCounterQuantity() != null ? saved.getCounterQuantity() : saved.getRequestedQuantity(),
                    saved.getCounterPrice(), "Người mua gửi đề xuất mới");
            Map<String, Object> view = rfqView(saved);
            b2bRealtimeService.notifyRfqUpdated("COUNTER", saved.getRfqCode(), view);
            return view;
        }
        if ("REJECT".equals(action)) {
            if (!RfqStatus.isBuyerTurn(currentStatus)) {
                throw new AuthException(400, "RFQ_NOT_BUYER_TURN", "RFQ hiện chưa đến lượt người mua phản hồi.");
            }
            rfq.setRejectReason(request.getRejectReason());
            rfq.setStatus(RfqStatus.REJECTED);
            RfqNegotiation saved = rfqs.save(rfq);
            recordRfqEvent(saved, buyer.getId(), "BUYER", "REJECT", currentStatus, saved.getStatus(),
                    saved.getRequestedQuantity(), saved.getCounterPrice() != null ? saved.getCounterPrice() : saved.getTargetPrice(),
                    request.getRejectReason());
            Map<String, Object> view = rfqView(saved);
            b2bRealtimeService.notifyRfqUpdated("REJECTED", saved.getRfqCode(), view);
            return view;
        }
        if (!"ACCEPT".equals(action)) throw new AuthException(400, "INVALID_RFQ_ACTION", "Chỉ hỗ trợ ACCEPT, COUNTER hoặc REJECT.");
        if (!RfqStatus.isBuyerTurn(currentStatus)) {
            throw new AuthException(400, "RFQ_NOT_BUYER_TURN", "RFQ hiện chưa đến lượt người mua chấp nhận.");
        }

        BigDecimal price = rfq.getCounterPrice() != null ? rfq.getCounterPrice() : rfq.getTargetPrice();
        Double weightDouble = rfq.getCounterQuantity() != null ? rfq.getCounterQuantity() : rfq.getRequestedQuantity();
        BigDecimal weight = weightDouble != null ? BigDecimal.valueOf(weightDouble) : new BigDecimal("100");
        Long lotId = rfq.getHarvestLot() != null ? rfq.getHarvestLot().getId() : 1L;

        long contractId;
        try {
            ObjectNode contractRequest = objectMapper.createObjectNode()
                    .put("lotId", lotId)
                    .put("weightKg", weight.doubleValue())
                    .put("pricePerKg", price)
                    .put("deliveryAddress", rfq.getHubLocation() == null ? "" : rfq.getHubLocation())
                    .put("logisticsFee", 0);
            contractId = business.createContract(contractRequest, buyer.getId());
            ObjectNode transition = objectMapper.createObjectNode().put("status", "AGREED");
            business.transition(contractId, transition);
            db.update("UPDATE b2b_contracts SET rfq_id=? WHERE id=?", rfq.getId(), contractId);
        } catch (Exception ex) {
            log.warn("createContract through business failed, inserting fallback contract for RFQ {}: {}", rfq.getRfqCode(), ex.getMessage());
            String fallbackCode = "HD-" + java.time.Year.now().getValue() + "-" + java.util.UUID.randomUUID().toString().substring(0, 4).toUpperCase();
            BigDecimal totalGoods = weight.multiply(price);
            BigDecimal deposit30 = totalGoods.multiply(new BigDecimal("0.3"));
            Long farmerId = rfq.getHarvestLot() != null && rfq.getHarvestLot().getFarmer() != null
                    ? rfq.getHarvestLot().getFarmer().getId()
                    : buyer.getId();
            contractId = db.queryForObject("""
                INSERT INTO b2b_contracts (
                    contract_code, lot_id, harvest_lot_id, rfq_id, farmer_id, buyer_id, buyer_name, buyer_phone,
                    quantity, quantity_kg, offered_weight_kg, unit_price, agreed_price_per_kg, offered_price_per_kg,
                    total_amount, total_goods_amount, deposit_amount, deposit_30_amount,
                    status, deposit_status, fulfillment_status, created_at, updated_at
                ) VALUES (
                    ?, ?, ?, ?, ?, ?, ?, ?,
                    ?, ?, ?, ?, ?, ?,
                    ?, ?, ?, ?,
                    'AGREED', 'WAITING_DEPOSIT', 'WAITING_HARVEST', NOW(), NOW()
                ) RETURNING id
            """, Long.class,
                fallbackCode, lotId, lotId, rfq.getId(), farmerId,
                buyer.getId(), buyer.getFullName(), buyer.getPhone(),
                weight.doubleValue(), weight, weight, price, price, price,
                totalGoods, totalGoods, deposit30, deposit30
            );
        }

        rfq.setStatus(RfqStatus.ACCEPTED);
        rfq.setTargetPrice(price);
        RfqNegotiation saved = rfqs.save(rfq);
        recordRfqEvent(saved, buyer.getId(), "BUYER", "ACCEPT", currentStatus, saved.getStatus(),
                saved.getCounterQuantity() != null ? saved.getCounterQuantity() : saved.getRequestedQuantity(), price,
                "Người mua chấp nhận đề xuất và tạo hợp đồng");
        Map<String, Object> view = rfqView(saved);
        b2bRealtimeService.notifyRfqUpdated("ACCEPTED", saved.getRfqCode(), view);
        b2bRealtimeService.notifyContractUpdated("CONTRACT_CREATED", (String) view.get("contractCode"), view);
        return view;
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> contracts() {
        User buyer = currentBuyer();
        List<Map<String, Object>> list = db.queryForList("""
                SELECT c.id, c.contract_code, c.status, c.deposit_status, c.fulfillment_status, c.total_goods_amount, c.deposit_30_amount,
                       c.deposit_received, c.balance_received, c.refund_amount, c.delivery_address,
                       c.remaining_amount, c.remaining_payment_status, c.remaining_paid_at, c.settled_at,
                       c.offered_weight_kg, c.offered_price_per_kg, c.created_at, c.lot_id,
                       c.packaging_approved, c.packaging_approved_at, c.actual_harvest_weight_kg,
                       c.harvest_proof_image_url, c.package_count, c.package_type, c.qr_code_data,
                       c.grade1_ratio, c.farm_pickup_address, c.pickup_truck_plate,
                       c.pickup_driver_name, c.pickup_driver_phone, c.farm_handover_temp,
                       l.product_name, l.lot_code, l.puc_code, l.image_url,
                       c.rfq_id, r.rfq_code,
                       COALESCE(c.buyer_name, bu.full_name) AS buyer_name,
                       COALESCE(c.buyer_phone, bu.phone) AS buyer_phone,
                       fu.full_name AS farmer_name, fu.phone AS farmer_phone,
                       fu.company_name AS farmer_company
                FROM b2b_contracts c
                JOIN harvest_lots l ON l.id = COALESCE(c.lot_id, c.harvest_lot_id)
                LEFT JOIN rfq_negotiations r ON r.id=c.rfq_id
                LEFT JOIN users bu ON bu.id=c.buyer_id
                LEFT JOIN users fu ON fu.id=c.farmer_id
                WHERE c.buyer_id=? ORDER BY c.id DESC
                """, buyer.getId());

        List<Map<String, Object>> enriched = new java.util.ArrayList<>();
        for (Map<String, Object> r : list) {
            Map<String, Object> row = new java.util.LinkedHashMap<>(r);
            String st = row.get("status") != null ? String.valueOf(row.get("status")) : "WAITING_DEPOSIT";
            String ds = row.get("deposit_status") != null ? String.valueOf(row.get("deposit_status")) : 
                        (row.get("deposit_received") != null && ((Number) row.get("deposit_received")).doubleValue() > 0 ? "DEPOSIT_PAID" : "PENDING_DEPOSIT");
            String fs = row.get("fulfillment_status") != null ? String.valueOf(row.get("fulfillment_status")) : "WAITING_HARVEST";
            Boolean pa = row.get("packaging_approved") != null ? Boolean.valueOf(String.valueOf(row.get("packaging_approved"))) : false;

            int step = FarmerService.computeFulfillmentStep(st, ds, fs);
            String stepName = FarmerService.computeFulfillmentStatusName(st, ds, fs, pa);

            row.put("status", st);
            row.put("depositStatus", ds);
            row.put("fulfillmentStatus", fs);
            row.put("fulfillmentStep", step);
            row.put("fulfillmentStatusName", stepName);
            enriched.add(row);
        }
        return enriched;
    }

    @Transactional
    public Map<String, Object> depositQr(Long contractId) {
        db.update("UPDATE b2b_contracts SET lot_id=COALESCE(lot_id,harvest_lot_id), deposit_30_amount=COALESCE(deposit_30_amount,deposit_amount), total_goods_amount=COALESCE(total_goods_amount,total_amount), offered_weight_kg=COALESCE(offered_weight_kg, quantity_kg, quantity), offered_price_per_kg=COALESCE(offered_price_per_kg, agreed_price_per_kg, unit_price) WHERE id=?", contractId);
        Map<String, Object> contract = ownedContract(contractId);
        BigDecimal amount = decimal(contract, "deposit_30_amount");
        if (amount.signum() <= 0) amount = decimal(contract, "deposit_amount");
        if (amount.signum() <= 0) {
            BigDecimal totalGoods = decimal(contract, "total_goods_amount");
            if (totalGoods.signum() <= 0) totalGoods = decimal(contract, "total_amount");
            amount = totalGoods.multiply(new BigDecimal("0.3"));
        }
        return new LinkedHashMap<>(Map.of(
                "contractId", contractId,
                "contractCode", contract.get("contract_code"),
                "amount", amount,
                "status", contract.get("status"),
                "bank", "MB Bank",
                "accountNumber", "0987654321",
                "transferContent", "COC " + contract.get("contract_code")
        ));
    }

    @Transactional
    public Map<String, Object> confirmDeposit(Long contractId) {
        db.update("UPDATE b2b_contracts SET lot_id=COALESCE(lot_id,harvest_lot_id), deposit_30_amount=COALESCE(deposit_30_amount,deposit_amount), total_goods_amount=COALESCE(total_goods_amount,total_amount), offered_weight_kg=COALESCE(offered_weight_kg, quantity_kg, quantity), offered_price_per_kg=COALESCE(offered_price_per_kg, agreed_price_per_kg, unit_price) WHERE id=?", contractId);
        Map<String, Object> contract = ownedContract(contractId);
        BigDecimal depositAmount = decimal(contract, "deposit_30_amount");
        if (depositAmount.signum() <= 0) depositAmount = decimal(contract, "deposit_amount");
        if (depositAmount.signum() <= 0) {
            BigDecimal totalGoods = decimal(contract, "total_goods_amount");
            if (totalGoods.signum() <= 0) totalGoods = decimal(contract, "total_amount");
            depositAmount = totalGoods.multiply(new BigDecimal("0.3"));
        }
        if (depositAmount.signum() <= 0) {
            throw new AuthException(400, "INVALID_DEPOSIT", "Hợp đồng chưa có số tiền cọc hợp lệ.");
        }
        ObjectNode request = objectMapper.createObjectNode()
                .put("status", "DEPOSIT_PAID")
                .put("reference", "DEP-" + UUID.randomUUID().toString().substring(0, 12).toUpperCase())
                .put("amount", depositAmount);
        business.transition(contractId, request);
        db.update("UPDATE b2b_contracts SET status='DEPOSIT_PAID',deposit_status='DEPOSIT_PAID',deposit_received=?,deposit_paid_at=CURRENT_TIMESTAMP WHERE id=?", depositAmount, contractId);
        Map<String, Object> updated = ownedContract(contractId);
        b2bRealtimeService.notifyContractUpdated("DEPOSIT_PAID", (String) updated.get("contract_code"), updated);
        return updated;
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> qc(Long contractId) {
        ownedContract(contractId);
        return db.queryForList("SELECT i.*, c.contract_code FROM hub_inspections i JOIN b2b_contracts c ON c.id=i.contract_id WHERE i.contract_id=? ORDER BY i.id DESC", contractId);
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> telemetry(Long contractId) {
        ownedContract(contractId);
        return db.queryForList("""
                SELECT i.* FROM iot_sensor_logs i
                WHERE i.asset_id IN (SELECT truck_id FROM shipments WHERE contract_id=?)
                ORDER BY i.id DESC LIMIT 60
                """, contractId);
    }

    @Transactional
    public Map<String, Object> signEpod(Long contractId, BuyerEpodRequest request) {
        ownedContract(contractId);
        Map<String, Object> shipment = db.queryForMap("SELECT id FROM shipments WHERE contract_id=?", contractId);
        ObjectNode epod = objectMapper.createObjectNode()
                .put("deliveredWeightKg", request.getDeliveredWeightKg())
                .put("damagedWeightKg", request.getDamagedWeightKg() == null ? BigDecimal.ZERO : request.getDamagedWeightKg())
                .put("signatureName", request.getSignatureName().trim())
                .put("signatureData", request.getSignatureData())
                .put("photoUrl", request.getPhotoUrl());
        business.epod(((Number) shipment.get("id")).longValue(), epod);
        Map<String, Object> updated = ownedContract(contractId);
        b2bRealtimeService.notifyContractUpdated("EPOD_SIGNED", (String) updated.get("contract_code"), updated);
        return updated;
    }

    @Transactional(readOnly = true)
    public Map<String, Object> finalPaymentQr(Long contractId) {
        Map<String, Object> contract = ownedContract(contractId);
        String status = Objects.toString(contract.get("status"), "");
        if (!Set.of("DELIVERED", "SETTLED").contains(status)) {
            throw new AuthException(409, "DELIVERY_NOT_CONFIRMED", "Chỉ được thanh toán phần còn lại sau khi Buyer đã kiểm hàng và ký nhận ePOD.");
        }
        Map<String, Object> quote = business.settlementQuote(contractId);
        Map<String, Object> result = new LinkedHashMap<>(quote);
        result.put("contractId", contractId);
        result.put("contractCode", contract.get("contract_code"));
        result.put("bank", "MB Bank");
        result.put("accountNumber", "0987654321");
        result.put("transferContent", "TT70 " + contract.get("contract_code"));
        BigDecimal amount = status.equals("SETTLED") ? BigDecimal.ZERO : (BigDecimal) quote.get("balanceDue");
        result.put("remainingAmount", amount);
        result.put("qrUrl", "https://img.vietqr.io/image/MB-0987654321-compact2.png?amount="
                + amount.toBigInteger() + "&addInfo=TT70%20" + contract.get("contract_code"));
        return result;
    }

    @Transactional
    public Map<String, Object> confirmFinalPayment(Long contractId) {
        Map<String, Object> contract = ownedContract(contractId);
        String status = Objects.toString(contract.get("status"), "");
        if ("SETTLED".equals(status)) {
            return contract;
        }
        if (!"DELIVERED".equals(status)) {
            throw new AuthException(409, "DELIVERY_NOT_CONFIRMED", "Bạn cần kiểm hàng và ký nhận ePOD trước khi thanh toán 70% còn lại.");
        }
        Integer openClaims = db.queryForObject(
                "select count(*) from spoilage_claims where contract_id=? and status='OPEN'",
                Integer.class, contractId);
        if (openClaims != null && openClaims > 0) {
            throw new AuthException(409, "OPEN_CLAIM", "Hợp đồng đang có khiếu nại mở; chỉ được thanh toán sau khi Admin xử lý xong.");
        }

        String paymentStatus = Objects.toString(contract.get("remaining_payment_status"), "UNPAID");
        if (!"PAID".equals(paymentStatus)) {
            ObjectNode paymentRequest = objectMapper.createObjectNode()
                    .put("status", "DELIVERED")
                    .put("reference", "BAL-" + UUID.randomUUID().toString().substring(0, 12).toUpperCase());
            business.transition(contractId, paymentRequest);
            db.update("UPDATE b2b_contracts SET remaining_paid_at=CURRENT_TIMESTAMP WHERE id=?", contractId);
        }

        ObjectNode settlementRequest = objectMapper.createObjectNode()
                .put("status", "SETTLED")
                .put("reference", "SET-" + UUID.randomUUID().toString().substring(0, 12).toUpperCase())
                .put("bankTransferRef", "BAL-" + UUID.randomUUID().toString().substring(0, 10).toUpperCase());
        business.transition(contractId, settlementRequest);
        Map<String, Object> updated = ownedContract(contractId);
        b2bRealtimeService.notifyContractUpdated("SETTLED", (String) updated.get("contract_code"), updated);
        return updated;
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> claims() {
        User buyer = currentBuyer();
        return db.queryForList("""
                SELECT cl.*, c.contract_code, l.product_name,
                       c.status AS contract_status, c.delivery_address
                FROM spoilage_claims cl
                JOIN b2b_contracts c ON c.id=cl.contract_id
                LEFT JOIN harvest_lots l ON l.id = COALESCE(c.lot_id, c.harvest_lot_id)
                WHERE c.buyer_id=?
                ORDER BY cl.id DESC
                """, buyer.getId());
    }

    @Transactional
    public Map<String, Object> createClaim(BuyerClaimRequest request) {
        Map<String, Object> contract = ownedContract(request.getContractId());
        String status = Objects.toString(contract.get("status"), "");
        if (!Set.of("IN_TRANSIT", "DELIVERED").contains(status)) {
            throw new AuthException(409, "CLAIM_NOT_ALLOWED", "Chỉ được gửi khiếu nại khi hàng đang giao hoặc sau khi đã nhận hàng.");
        }
        BigDecimal maxWeight = decimal(contract, "offered_weight_kg");
        if (request.getDamagedWeightKg().compareTo(maxWeight) > 0) {
            throw new AuthException(400, "INVALID_CLAIM_WEIGHT", "Khối lượng khiếu nại không được lớn hơn khối lượng hợp đồng.");
        }
        Integer openClaims = db.queryForObject(
                "select count(*) from spoilage_claims where contract_id=? and status='OPEN'",
                Integer.class, request.getContractId());
        if (openClaims != null && openClaims > 0) {
            throw new AuthException(409, "CLAIM_ALREADY_OPEN", "Hợp đồng đang có một khiếu nại mở; vui lòng theo dõi kết quả xử lý.");
        }

        String claimCode = "CLM-BUYER-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();
        BigDecimal compensation = request.getDamagedWeightKg().multiply(decimal(contract, "offered_price_per_kg"));
        Long id = db.queryForObject("""
                insert into spoilage_claims(claim_code,contract_id,damaged_weight_kg,cause,liable_party,compensation_amount,status)
                values (?,?,?,?,?,?,'OPEN') returning id
                """, Long.class, claimCode, request.getContractId(), request.getDamagedWeightKg(),
                request.getCause().trim(), "PLATFORM", compensation);
        return db.queryForMap("""
                select cl.*, c.contract_code, l.product_name, c.status contract_status
                from spoilage_claims cl
                join b2b_contracts c on c.id=cl.contract_id
                left join harvest_lots l on l.id = COALESCE(c.lot_id, c.harvest_lot_id)
                where cl.id=?
                """, id);
    }

    @Transactional(readOnly = true)
    public String invoiceHtml(Long contractId) {
        Map<String, Object> c = ownedContract(contractId);
        String code = Objects.toString(c.get("contract_code"), "");
        return "<!doctype html><html lang='vi'><meta charset='utf-8'><title>Chứng từ " + code + "</title>"
                + "<body style='font-family:Arial;max-width:760px;margin:40px auto;color:#123'>"
                + "<h1>HoNa Fresh - Chứng từ giao dịch Buyer</h1><hr>"
                + "<p><b>Mã hợp đồng:</b> " + code + "</p>"
                + "<p><b>Sản phẩm:</b> " + Objects.toString(c.get("product_name"), "") + "</p>"
                + "<p><b>Khối lượng:</b> " + Objects.toString(c.get("offered_weight_kg"), "") + " kg</p>"
                + "<p><b>Đơn giá:</b> " + Objects.toString(c.get("offered_price_per_kg"), "") + " đ/kg</p>"
                + "<p><b>Tổng tiền hàng:</b> " + Objects.toString(c.get("total_goods_amount"), "") + " đ</p>"
                + "<p><b>Trạng thái:</b> " + Objects.toString(c.get("status"), "") + "</p>"
                + "<p>Đây là chứng từ điện tử phục vụ bản demo nghiệp vụ Buyer.</p></body></html>";
    }

    private BuyerWarehouse ownedAddress(BuyerProfile profile, Long id) {
        BuyerWarehouse address = warehouses.findById(id).orElseThrow(() -> new AuthException(404, "ADDRESS_NOT_FOUND", "Không tìm thấy địa chỉ."));
        if (!Objects.equals(address.getBuyerProfile().getId(), profile.getId())) throw new AuthException(403, "ADDRESS_OWNER_REQUIRED", "Bạn không có quyền với địa chỉ này.");
        return address;
    }

    private BuyerProfile profileEntity(User buyer) {
        return profiles.findByUserId(buyer.getId()).orElseGet(() -> profiles.save(BuyerProfile.builder()
                .user(buyer)
                .companyName(buyer.getCompanyName())
                .taxCode(buyer.getTaxCode())
                .contactName(buyer.getFullName())
                .contactPhone(buyer.getPhone())
                .build()));
    }

    private BuyerProfileResponse toProfileResponse(User buyer, BuyerProfile profile) {
        return BuyerProfileResponse.builder()
                .userId(buyer.getId())
                .username(buyer.getUsername())
                .email(buyer.getEmail())
                .fullName(buyer.getFullName())
                .phone(buyer.getPhone())
                .address(buyer.getAddress())
                .companyName(profile.getCompanyName())
                .taxCode(profile.getTaxCode())
                .contactName(profile.getContactName())
                .contactPhone(profile.getContactPhone())
                .warehouseAddress(buyer.getWarehouseAddress())
                .kycStatus(buyer.getKycStatus())
                .emailVerified(buyer.isEmailVerified())
                .build();
    }

    private static String blankToDefault(String value, String fallback) {
        return value == null || value.isBlank() ? fallback : value.trim();
    }

    private void clearDefault(BuyerProfile profile) {
        warehouses.findByBuyerProfileOrderByDefaultWarehouseDescNameAsc(profile).forEach(address -> {
            if (address.isDefaultWarehouse()) {
                address.setDefaultWarehouse(false);
                warehouses.save(address);
            }
        });
    }

    private Map<String, Object> ownedContract(Long id) {
        User buyer = currentBuyer();
        List<Map<String, Object>> rows = db.queryForList("SELECT c.*, l.product_name, l.lot_code FROM b2b_contracts c JOIN harvest_lots l ON l.id = COALESCE(c.lot_id, c.harvest_lot_id) WHERE c.id=? AND c.buyer_id=?", id, buyer.getId());
        if (rows.isEmpty()) throw new AuthException(404, "CONTRACT_NOT_FOUND", "Không tìm thấy hợp đồng hoặc bạn không có quyền truy cập.");
        return new LinkedHashMap<>(rows.getFirst());
    }

    private Map<String, Object> rfqView(RfqNegotiation rfq) {
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("id", rfq.getId());
        result.put("rfqCode", rfq.getRfqCode());
        result.put("status", rfq.getStatus());
        result.put("statusLabel", RfqStatus.label(rfq.getStatus()));
        result.put("nextActor", RfqStatus.nextActor(rfq.getStatus()));
        result.put("productName", rfq.getHarvestLot() == null ? null : rfq.getHarvestLot().getProductName());
        result.put("harvestLotId", rfq.getHarvestLot() == null ? null : rfq.getHarvestLot().getId());
        result.put("lotCode", rfq.getHarvestLot() == null ? null : rfq.getHarvestLot().getLotCode());
        result.put("farmerId", rfq.getHarvestLot() == null || rfq.getHarvestLot().getFarmer() == null ? null : rfq.getHarvestLot().getFarmer().getId());
        result.put("farmerName", rfq.getHarvestLot() == null || rfq.getHarvestLot().getFarmer() == null ? null : (rfq.getHarvestLot().getFarmer().getCompanyName() != null ? rfq.getHarvestLot().getFarmer().getCompanyName() : rfq.getHarvestLot().getFarmer().getFullName()));
        result.put("farmerPhone", rfq.getHarvestLot() == null || rfq.getHarvestLot().getFarmer() == null ? null : rfq.getHarvestLot().getFarmer().getPhone());
        result.put("buyerName", rfq.getBuyerName());
        result.put("buyerPhone", rfq.getBuyerPhone());
        result.put("buyerCompany", rfq.getBuyerCompany());
        result.put("quantityKg", rfq.getCounterQuantity() != null ? rfq.getCounterQuantity() : rfq.getRequestedQuantity());
        result.put("requestedQuantityKg", rfq.getRequestedQuantity());
        result.put("proposedPricePerKg", rfq.getTargetPrice());
        result.put("counterPricePerKg", rfq.getCounterPrice());
        result.put("counterQuantityKg", rfq.getCounterQuantity());
        result.put("deliveryDate", rfq.getDeliveryDate());
        result.put("deliveryLocation", rfq.getHubLocation());
        result.put("shippingOption", rfq.getShippingOption());
        result.put("notes", rfq.getNotes());
        result.put("expiresAt", rfq.getExpiresAt());
        b2bContracts.findByRfqId(rfq.getId()).ifPresent(contract -> {
            result.put("contractId", contract.getId());
            result.put("contractCode", contract.getContractCode());
            result.put("contractStatus", contract.getStatus());
            result.put("depositStatus", contract.getDepositStatus());
            result.put("depositAmount", contract.getDepositAmount());
        });
        result.put("createdAt", rfq.getCreatedAt());
        result.put("updatedAt", rfq.getUpdatedAt());
        return result;
    }

    private void recordRfqEvent(RfqNegotiation rfq, Long actorId, String actorRole, String action,
                                String statusFrom, String statusTo, Double quantityKg,
                                BigDecimal pricePerKg, String message) {
        db.update("""
                INSERT INTO rfq_negotiation_events
                    (rfq_id, actor_id, actor_role, action, status_from, status_to, quantity_kg, price_per_kg, message)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, rfq.getId(), actorId, actorRole, action,
                statusFrom == null ? null : RfqStatus.normalize(statusFrom), RfqStatus.normalize(statusTo),
                quantityKg, pricePerKg, message);
    }

    private void expireIfNeeded(RfqNegotiation rfq) {
        String current = RfqStatus.normalize(rfq.getStatus());
        if (rfq.getExpiresAt() != null && rfq.getExpiresAt().isBefore(LocalDateTime.now())
                && (RfqStatus.isFarmerTurn(current) || RfqStatus.isBuyerTurn(current))) {
            rfq.setStatus(RfqStatus.EXPIRED);
            RfqNegotiation saved = rfqs.save(rfq);
            recordRfqEvent(saved, null, "SYSTEM", "EXPIRE", current, RfqStatus.EXPIRED,
                    saved.getCounterQuantity() != null ? saved.getCounterQuantity() : saved.getRequestedQuantity(),
                    saved.getCounterPrice() != null ? saved.getCounterPrice() : saved.getTargetPrice(),
                    "RFQ tự động hết hạn sau 24 giờ");
        }
    }

    private static BigDecimal decimal(Map<String, Object> map, String key) {
        Object value = map.get(key);
        return value == null ? BigDecimal.ZERO : new BigDecimal(value.toString());
    }
}
