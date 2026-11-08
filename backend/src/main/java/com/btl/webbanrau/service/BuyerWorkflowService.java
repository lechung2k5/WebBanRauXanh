package com.btl.webbanrau.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.btl.webbanrau.dto.request.BuyerEpodRequest;
import com.btl.webbanrau.dto.request.BuyerRfqActionRequest;
import com.btl.webbanrau.dto.request.BuyerRfqRequest;
import com.btl.webbanrau.dto.request.BuyerWarehouseRequest;
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
import com.btl.webbanrau.repository.HarvestLotRepository;
import com.btl.webbanrau.repository.RfqNegotiationRepository;
import com.btl.webbanrau.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class BuyerWorkflowService {
    private final UserRepository users;
    private final HarvestLotRepository lots;
    private final RfqNegotiationRepository rfqs;
    private final BuyerProfileRepository profiles;
    private final BuyerWarehouseRepository warehouses;
    private final JdbcTemplate db;
    private final AdminBusinessService business;
    private final OrderService orderService;
    private final ObjectMapper objectMapper;

    public User currentBuyer() {
        User user = AuthService.current();
        if (!AuthService.has(user, "BUYER")) {
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
        HarvestLot lot = lots.findById(request.getHarvestLotId())
                .orElseThrow(() -> new AuthException(404, "LOT_NOT_FOUND", "Không tìm thấy lô nông sản."));
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
                .build();
        RfqNegotiation saved = rfqs.save(rfq);
        recordRfqEvent(saved, buyer.getId(), "BUYER", "CREATED", null, RfqStatus.WAITING_FARMER,
                saved.getRequestedQuantity(), saved.getTargetPrice(), saved.getNotes());
        return rfqView(saved);
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> listRfqs() {
        User buyer = currentBuyer();
        return rfqs.findByBuyerOrderByCreatedAtDesc(buyer).stream().map(this::rfqView).toList();
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
        if (rfq.getBuyer() == null || !Objects.equals(rfq.getBuyer().getId(), buyer.getId())) {
            throw new AuthException(403, "RFQ_OWNER_REQUIRED", "Bạn không có quyền với RFQ này.");
        }
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
            return rfqView(saved);
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
            return rfqView(saved);
        }
        if (!"ACCEPT".equals(action)) throw new AuthException(400, "INVALID_RFQ_ACTION", "Chỉ hỗ trợ ACCEPT, COUNTER hoặc REJECT.");
        if (!RfqStatus.isBuyerTurn(currentStatus)) {
            throw new AuthException(400, "RFQ_NOT_BUYER_TURN", "RFQ hiện chưa đến lượt người mua chấp nhận.");
        }

        BigDecimal price = rfq.getCounterPrice() != null ? rfq.getCounterPrice() : rfq.getTargetPrice();
        ObjectNode contractRequest = objectMapper.createObjectNode()
                .put("lotId", rfq.getHarvestLot().getId())
                .put("weightKg", rfq.getCounterQuantity() != null ? rfq.getCounterQuantity() : rfq.getRequestedQuantity())
                .put("pricePerKg", price)
                .put("deliveryAddress", rfq.getHubLocation() == null ? "" : rfq.getHubLocation())
                .put("logisticsFee", 0);
        long contractId = business.createContract(contractRequest, buyer.getId());
        ObjectNode transition = objectMapper.createObjectNode().put("status", "AGREED");
        business.transition(contractId, transition);
        db.update("UPDATE b2b_contracts SET rfq_id=? WHERE id=?", rfq.getId(), contractId);
        rfq.setStatus(RfqStatus.ACCEPTED);
        rfq.setTargetPrice(price);
        RfqNegotiation saved = rfqs.save(rfq);
        recordRfqEvent(saved, buyer.getId(), "BUYER", "ACCEPT", currentStatus, saved.getStatus(),
                saved.getCounterQuantity() != null ? saved.getCounterQuantity() : saved.getRequestedQuantity(), price,
                "Người mua chấp nhận đề xuất và tạo hợp đồng");
        return rfqView(saved);
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> contracts() {
        User buyer = currentBuyer();
        return db.queryForList("""
                SELECT c.id, c.contract_code, c.status, c.total_goods_amount, c.deposit_30_amount,
                       c.deposit_received, c.balance_received, c.refund_amount, c.delivery_address,
                       c.offered_weight_kg, c.offered_price_per_kg, c.created_at, l.product_name,
                       l.lot_code, c.rfq_id
                FROM b2b_contracts c JOIN harvest_lots l ON l.id=c.lot_id
                WHERE c.buyer_id=? ORDER BY c.id DESC
                """, buyer.getId());
    }

    @Transactional(readOnly = true)
    public Map<String, Object> depositQr(Long contractId) {
        Map<String, Object> contract = ownedContract(contractId);
        BigDecimal amount = decimal(contract, "deposit_30_amount");
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
        Map<String, Object> contract = ownedContract(contractId);
        ObjectNode request = objectMapper.createObjectNode()
                .put("status", "DEPOSIT_PAID")
                .put("reference", "DEP-" + UUID.randomUUID().toString().substring(0, 12).toUpperCase())
                .put("amount", decimal(contract, "deposit_30_amount"));
        business.transition(contractId, request);
        return ownedContract(contractId);
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
        return ownedContract(contractId);
    }

    @Transactional(readOnly = true)
    public Map<String, Object> finalPaymentQr(Long contractId) {
        Map<String, Object> contract = ownedContract(contractId);
        Map<String, Object> quote = business.settlementQuote(contractId);
        Map<String, Object> result = new LinkedHashMap<>(quote);
        result.put("contractId", contractId);
        result.put("contractCode", contract.get("contract_code"));
        result.put("bank", "MB Bank");
        result.put("accountNumber", "0987654321");
        result.put("transferContent", "TT70 " + contract.get("contract_code"));
        return result;
    }

    @Transactional
    public Map<String, Object> confirmFinalPayment(Long contractId) {
        Map<String, Object> contract = ownedContract(contractId);
        ObjectNode request = objectMapper.createObjectNode()
                .put("status", "DELIVERED")
                .put("reference", "BAL-" + UUID.randomUUID().toString().substring(0, 12).toUpperCase());
        business.transition(contractId, request);
        return ownedContract(contractId);
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
        List<Map<String, Object>> rows = db.queryForList("SELECT c.*, l.product_name, l.lot_code FROM b2b_contracts c JOIN harvest_lots l ON l.id=c.lot_id WHERE c.id=? AND c.buyer_id=?", id, buyer.getId());
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

    private static BigDecimal decimal(Map<String, Object> map, String key) {
        Object value = map.get(key);
        return value == null ? BigDecimal.ZERO : new BigDecimal(value.toString());
    }
}
