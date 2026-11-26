package com.btl.webbanrau.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.btl.webbanrau.model.User;
import com.btl.webbanrau.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.math.*;
import java.time.LocalDate;
import java.util.*;

/** All financial transitions lock the contract row and create balanced journal lines. */
@Service @RequiredArgsConstructor @Slf4j
public class AdminBusinessService {
    private final JdbcTemplate db;
    private final UserRepository users;
    private final MailService mail;
    private final B2bRealtimeService b2bRealtimeService;
    public List<Map<String,Object>> lots(boolean publicOnly) {
        var rows=db.queryForList("select l.*,u.company_name farmer_name from harvest_lots l join users u on u.id=l.farmer_id "+(publicOnly?"where l.status='OPEN' and l.expiry_date>=CURRENT_DATE ":"")+"order by l.id desc limit 500");
        rows.forEach(row->row.put("tier_pricing_json",Objects.toString(row.get("tier_pricing_json"),"[]")));
        return rows;
    }
    private Long resolveScopedHubId(Long requestedHubId) {
        try {
            User actor = AuthService.current();
            if (actor != null
                    && !AuthService.has(actor, "ADMIN")
                    && !AuthService.has(actor, "ACCOUNTANT")
                    && AuthService.has(actor, "WAREHOUSE_MANAGER")
                    && actor.getAssignedHubId() != null) {
                return actor.getAssignedHubId();
            }
        } catch (Exception ignored) {}
        return requestedHubId;
    }

    public List<Map<String,Object>> contracts() { return contracts(null); }

    public List<Map<String,Object>> contracts(Long hubId) {
        Long scopedHubId = resolveScopedHubId(hubId);
        String whereHub = scopedHubId != null ? " where (" + CONTRACT_HUB_ID_EXPR + ") = " + scopedHubId : "";
        return db.queryForList(
                "select c.*, (" + CONTRACT_HUB_ID_EXPR + ") as resolved_hub_id, " +
                "l.product_name, l.lot_code, " +
                "r.rfq_code, r.shipping_option, r.hub_location, " +
                "u.company_name buyer_name, u.company_name buyer_company, u.phone buyer_phone, u.warehouse_address buyer_warehouse, " +
                "coalesce(nullif(u.warehouse_address, ''), nullif(c.delivery_address, ''), nullif(r.hub_location, ''), u.address) as resolved_buyer_address, " +
                "case when u.username='buyer_coop' then 'Nguyễn Thị Minh Hạnh' when u.username='buyer_winmart' then 'Phạm Hoàng Nam' when u.username='buyer_lotte' then 'Lê Trọng Đạt' else u.full_name end buyer_contact, " +
                "coalesce(nullif(fp.farm_name, ''), f.company_name) farmer_name, " +
                "coalesce(nullif(fp.farm_name, ''), f.company_name) farmer_company, " +
                "f.phone farmer_phone, f.full_name farmer_contact, " +
                "coalesce(nullif(fp.location, ''), f.address) farmer_address, " +
                "coalesce(nullif(fp.puc_code, ''), nullif(l.puc_code, ''), f.puc_code) puc_code " +
                "from b2b_contracts c " +
                "join harvest_lots l on l.id=coalesce(c.lot_id, c.harvest_lot_id) " +
                "left join rfq_negotiations r on r.id=c.rfq_id " +
                "join users u on u.id=c.buyer_id " +
                "left join users f on f.id=c.farmer_id " +
                "left join farmer_profiles fp on fp.user_id=f.id" +
                whereHub + " order by c.id desc limit 500");
    }
    public List<Map<String,Object>> assets() { return db.queryForList("select a.*,coalesce((select sum(i.qualified_weight_kg) from hub_inspections i join b2b_contracts c on c.id=i.contract_id where i.cold_room_id=a.id and c.status='AT_HUB_QC'),0) occupied_kg from cold_assets a order by a.id"); }
    public List<Map<String,Object>> inspections() { return db.queryForList("select i.*,c.status contract_status,l.product_name,l.expiry_date,(l.expiry_date-CURRENT_DATE) fefo_priority_score,c.contract_code from hub_inspections i join b2b_contracts c on c.id=i.contract_id join harvest_lots l on l.id=coalesce(c.lot_id, c.harvest_lot_id) order by l.expiry_date,i.id"); }
    public List<Map<String,Object>> shipments() { return db.queryForList("select s.*,c.contract_code,c.delivery_address,l.product_name,a.asset_code,a.current_temp,a.current_humidity from shipments s join b2b_contracts c on c.id=s.contract_id join harvest_lots l on l.id=coalesce(c.lot_id, c.harvest_lot_id) join cold_assets a on a.id=s.truck_id order by s.id desc limit 500"); }
    public List<Map<String,Object>> claims() { return db.queryForList("select cl.*, c.contract_code, l.product_name, u.company_name buyer_name, f.company_name farmer_name from spoilage_claims cl left join b2b_contracts c on c.id=cl.contract_id left join harvest_lots l on l.id=coalesce(c.lot_id, c.harvest_lot_id) left join users u on u.id=c.buyer_id left join users f on f.id=c.farmer_id order by cl.id desc limit 500"); }
    public Map<String,Object> settings() { return db.queryForMap("select * from platform_settings where id=1"); }
    public Map<String,Object> stats() {
        Map<String,Object> result=new LinkedHashMap<>();
        result.put("users",db.queryForObject("select count(*) from users",Long.class));
        result.put("pendingKyc",db.queryForObject("select count(*) from users where kyc_status='PENDING'",Long.class));
        result.put("lots",db.queryForObject("select count(*) from harvest_lots",Long.class));
        result.put("contracts",db.queryForObject("select count(*) from b2b_contracts",Long.class));
        result.put("activeShipments",db.queryForObject("select count(*) from shipments where status='IN_TRANSIT'",Long.class));
        result.put("gmv",db.queryForObject("select coalesce(sum(total_goods_amount),0) from b2b_contracts where status not in ('RFQ_SENT','CANCELLED')",BigDecimal.class));
        result.put("escrow",db.queryForObject("select coalesce(sum(debit-credit),0) from gl_journal_lines where account='112'",BigDecimal.class));
        result.put("heldFunds",db.queryForObject("select coalesce(sum(credit-debit),0) from gl_journal_lines where account='3388'",BigDecimal.class));
        result.put("serviceRevenue",db.queryForObject("select coalesce(sum(credit-debit),0) from gl_journal_lines where account='5113'",BigDecimal.class));
        result.put("cashflow",db.queryForList("select date(e.created_at) as day,sum(l.debit) as incoming,sum(l.credit) as outgoing from gl_journal_entries e join gl_journal_lines l on l.entry_id=e.id where l.account='112' group by date(e.created_at) order by day desc limit 30"));
        return result;
    }
    @Transactional public long createLot(JsonNode n,Long farmerId) {
        User farmer=users.findById(farmerId).orElseThrow();
        if(!AuthService.has(farmer,"FARMER")) bad("Chọn tài khoản FARMER");
        AuthService.approvedPartner(farmer);
        BigDecimal weight=number(n,"totalWeightKg",new BigDecimal("100"),new BigDecimal("10000000")), price=number(n,"basePricePerKg",BigDecimal.ONE,new BigDecimal("1000000000"));
        LocalDate harvest=LocalDate.parse(text(n,"harvestDate")), expiry=LocalDate.parse(text(n,"expiryDate"));
        if(!expiry.isAfter(harvest)||expiry.isBefore(LocalDate.now())) bad("Ngày hết hạn phải sau ngày thu hoạch và chưa hết hạn");
        BigDecimal min=number(n,"tempMin",new BigDecimal("-40"),new BigDecimal("50")), max=number(n,"tempMax",new BigDecimal("-40"),new BigDecimal("50"));
        if(max.compareTo(min)<=0) bad("Khoảng nhiệt độ không hợp lệ");
        JsonNode tiers=n.path("tierPricing");
        if(!tiers.isArray()) bad("tierPricing phải là mảng");
        BigDecimal previous=BigDecimal.ZERO;
        for(JsonNode tier:tiers) { BigDecimal qty=number(tier,"minKg",new BigDecimal("100"),weight);number(tier,"price",BigDecimal.ONE,price);if(qty.compareTo(previous)<=0) bad("Bậc giá phải tăng dần theo khối lượng");previous=qty; }
        long id=db.queryForObject("insert into harvest_lots(lot_code,farmer_id,product_name,category,puc_code,certification,harvest_date,expiry_date,total_weight_kg,available_weight_kg,base_price_per_kg,tier_pricing_json,req_temp_min,req_temp_max,image_url) values (?,?,?,?,?,?,?,?,?,?,?,cast(? as jsonb),?,?,?) returning id",Long.class,
            code("LOT"),farmerId,text(n,"productName"),text(n,"category"),text(n,"pucCode"),text(n,"certification"),harvest,expiry,weight,weight,price,tiers.toString(),min,max,n.path("imageUrl").asText(""));
        audit("CREATE_LOT",id);return id;
    }
    @Transactional public void lotStatus(long id,JsonNode n) {
        String status=text(n,"status"); if(!Set.of("OPEN","REJECTED","LOCKED").contains(status)) bad("Trạng thái lô không hợp lệ");
        var lot=lock("harvest_lots",id);
        if(status.equals("OPEN")) { var owner=users.findById(asLong(lot,"farmer_id")).orElseThrow();AuthService.approvedPartner(owner);if(LocalDate.parse(lot.get("expiry_date").toString()).isBefore(LocalDate.now())) bad("Lô đã hết hạn"); }
        db.update("update harvest_lots set status=?,review_note=? where id=?",status,n.path("note").asText(""),id);audit("LOT_"+status,id);
    }
    @Transactional public long createContract(JsonNode n,Long buyerId) {
        User buyer=users.findById(buyerId).orElseThrow();if(!AuthService.has(buyer,"BUYER")&&!AuthService.has(buyer,"ADMIN")) bad("Chọn tài khoản BUYER");AuthService.approvedPartner(buyer);
        var lot=lock("harvest_lots",n.path("lotId").asLong());
        if(!"OPEN".equals(lot.get("status"))||LocalDate.parse(lot.get("expiry_date").toString()).isBefore(LocalDate.now())) bad("Lô chưa mở bán hoặc đã hết hạn");
        if(asLong(lot,"farmer_id").equals(buyerId)&&!AuthService.has(buyer,"ADMIN")) bad("Không tự giao dịch với chính mình");
        BigDecimal weight=number(n,"weightKg",new BigDecimal("100"),decimal(lot,"available_weight_kg")), price=number(n,"pricePerKg",BigDecimal.ONE,new BigDecimal("1000000000"));
        var cfg=settings();BigDecimal total=money(weight.multiply(price)), deposit=money(total.multiply(decimal(cfg,"deposit_rate")).divide(new BigDecimal("100"))), fee=money(total.multiply(decimal(cfg,"platform_fee_rate")).divide(new BigDecimal("100")));
        String contractCode = code("HD");
        long id=db.queryForObject("""
            insert into b2b_contracts(
                contract_code, lot_id, harvest_lot_id, farmer_id, buyer_id, buyer_name, buyer_phone,
                quantity, quantity_kg, offered_weight_kg,
                unit_price, agreed_price_per_kg, offered_price_per_kg,
                total_amount, total_goods_amount, deposit_amount, deposit_30_amount,
                platform_fee_rate, platform_fee_amount, logistics_fee_amount, service_vat_rate,
                delivery_address, hub_name, status, deposit_status, fulfillment_status,
                created_at, updated_at
            ) values (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,'RFQ_SENT','PENDING_DEPOSIT','WAITING_HARVEST',NOW(),NOW()) returning id
            """, Long.class,
            contractCode, lot.get("id"), lot.get("id"), lot.get("farmer_id"), buyerId, buyer.getFullName(), buyer.getPhone(),
            weight.doubleValue(), weight, weight,
            price, price, price,
            total, total, deposit, deposit,
            cfg.get("platform_fee_rate"), fee, number(n,"logisticsFee",BigDecimal.ZERO,total), cfg.get("service_vat_rate"),
            text(n,"deliveryAddress"), lot.get("warehouse_location"));
        audit("CREATE_RFQ",id);
        b2bRealtimeService.notifyContractUpdated("CONTRACT_CREATED", contractCode, Map.of("id", id, "contractCode", contractCode, "status", "RFQ_SENT"));
        return id;
    }
    @Transactional public void transition(long id,JsonNode n) {
        var c=lock("b2b_contracts",id);String current=c.get("status").toString(), next=text(n,"status");
        Map<String, Set<String>> allowed = Map.ofEntries(
            Map.entry("RFQ_SENT", Set.of("AGREED", "CANCELLED")),
            Map.entry("AGREED", Set.of("DEPOSIT_PAID", "CANCELLED")),
            Map.entry("DEPOSIT_PAID", Set.of("HARVESTING", "HARVESTED", "PICKUP_DISPATCHED", "IN_TRANSIT_HUB", "AT_HUB_QC", "CANCELLED")),
            Map.entry("HARVESTING", Set.of("HARVESTED", "PICKUP_DISPATCHED", "IN_TRANSIT_HUB", "AT_HUB_QC", "CANCELLED")),
            Map.entry("HARVESTED", Set.of("PACKAGING_APPROVED", "PICKUP_DISPATCHED", "IN_TRANSIT_HUB", "AT_HUB_QC", "CANCELLED")),
            Map.entry("PACKAGING_APPROVED", Set.of("PICKUP_DISPATCHED", "IN_TRANSIT_HUB", "AT_HUB_QC", "CANCELLED")),
            Map.entry("PICKUP_DISPATCHED", Set.of("IN_TRANSIT_HUB", "AT_HUB_QC", "CANCELLED")),
            Map.entry("IN_TRANSIT_HUB", Set.of("AT_HUB_QC", "CANCELLED")),
            Map.entry("AT_HUB_QC", Set.of("OUTBOUND_DISPATCHED", "IN_TRANSIT", "DELIVERED", "CANCELLED")),
            Map.entry("OUTBOUND_DISPATCHED", Set.of("IN_TRANSIT", "DELIVERED", "CANCELLED")),
            Map.entry("IN_TRANSIT", Set.of("DELIVERED", "CANCELLED")),
            Map.entry("DELIVERED", Set.of("SETTLED", "CANCELLED")),
            Map.entry("SETTLED", Set.of())
        );
        Set<String> nextAllowed = allowed.getOrDefault(current, Set.of("SETTLED", "CANCELLED"));
        if (!nextAllowed.contains(next) && !next.equals(current)) {
            bad("Chuyển trạng thái không hợp lệ: " + current + " → " + next);
        }

        if(next.equals("AGREED")) {
            var lot=lock("harvest_lots",asLong(c,"lot_id"));BigDecimal weight=decimal(c,"offered_weight_kg");
            if(!"OPEN".equals(lot.get("status"))||decimal(lot,"available_weight_kg").compareTo(weight)<0||LocalDate.parse(lot.get("expiry_date").toString()).isBefore(LocalDate.now())) bad("Lô không đủ sản lượng hoặc không còn mở bán");
            db.update("update harvest_lots set available_weight_kg=GREATEST(0, available_weight_kg-?), status=CASE WHEN available_weight_kg-? <= 0 THEN 'SOLD_OUT' ELSE 'OPEN' END where id=?",weight,weight,lot.get("id"));
        } else if(next.equals("DEPOSIT_PAID")) {
            String ref=n.has("reference") ? text(n,"reference") : "DEP-" + UUID.randomUUID().toString().substring(0,8).toUpperCase();
            BigDecimal amount=decimal(c,"deposit_30_amount");
            if (amount.signum() <= 0) amount = decimal(c, "deposit_amount");
            if (amount.signum() <= 0) {
                BigDecimal total = decimal(c, "total_goods_amount");
                if (total.signum() <= 0) total = decimal(c, "total_amount");
                amount = total.multiply(new BigDecimal("0.3"));
            }
            if (n.has("amount")) {
                amount = number(n,"amount",amount,amount);
            }
            journal(id,"DEPOSIT",ref,List.of(line("112",amount,true),line("3388",amount,false)));
            db.update("update b2b_contracts set lot_id=coalesce(lot_id,harvest_lot_id),deposit_30_amount=coalesce(deposit_30_amount,?),deposit_ref=?,deposit_received=?,deposit_status='DEPOSIT_PAID',deposit_paid_at=CURRENT_TIMESTAMP,fulfillment_status='WAITING_HARVEST' where id=?",amount,ref,amount,id);
        } else if(next.equals("HARVESTING")) {
            db.update("update b2b_contracts set fulfillment_status='HARVESTING' where id=?", id);
        } else if(next.equals("HARVESTED")) {
            db.update("update b2b_contracts set fulfillment_status='HARVESTED',harvested_at=COALESCE(harvested_at,CURRENT_TIMESTAMP) where id=?", id);
        } else if(next.equals("PACKAGING_APPROVED")) {
            db.update("update b2b_contracts set packaging_approved=true,packaging_approved_at=COALESCE(packaging_approved_at,CURRENT_TIMESTAMP),fulfillment_status='PACKAGING_APPROVED' where id=?", id);
        } else if(next.equals("PICKUP_DISPATCHED")) {
            db.update("update b2b_contracts set fulfillment_status='PICKUP_DISPATCHED' where id=?", id);
        } else if(next.equals("IN_TRANSIT_HUB")) {
            db.update("update b2b_contracts set fulfillment_status='IN_TRANSIT_HUB',farm_pickup_signed_at=COALESCE(farm_pickup_signed_at,CURRENT_TIMESTAMP) where id=?", id);
        } else if(next.equals("AT_HUB_QC")) {
            Long coldRoomId = db.queryForList("select id from cold_assets where asset_type='COLD_ROOM' limit 1").stream()
                    .findFirst().map(m -> ((Number)m.get("id")).longValue()).orElse(null);
            if (coldRoomId == null) {
                coldRoomId = db.queryForObject("insert into cold_assets(asset_code,asset_type,asset_name,capacity_kg) values (?,'COLD_ROOM','Kho lạnh trung tâm HoNa',100000) returning id", Long.class, code("CR"));
            }
            BigDecimal weight = resolveSafeWeight(c);
            Long qcStaffId = null;
            try { if (AuthService.current() != null) qcStaffId = AuthService.current().getId(); } catch (Exception ignored) {}
            if (qcStaffId == null) {
                qcStaffId = db.queryForList("select u.id from users u join users_roles ur on ur.user_id=u.id join roles r on r.id=ur.role_id where r.name in ('ROLE_WAREHOUSE_QC','WAREHOUSE_QC','ROLE_ADMIN') limit 1").stream().findFirst().map(m -> ((Number)m.get("id")).longValue()).orElse(1L);
            }
            List<Long> existingInspections = db.queryForList("select id from hub_inspections where contract_id=?", Long.class, id);
            if (!existingInspections.isEmpty()) {
                db.update("""
                    update hub_inspections
                    set cold_room_id=?,
                        received_weight_kg=?,
                        qualified_weight_kg=?,
                        rejected_weight_kg=?,
                        qc_note=?,
                        updated_at=CURRENT_TIMESTAMP
                    where contract_id=?
                    """,
                    coldRoomId, weight, weight, BigDecimal.ZERO, "Đạt tiêu chuẩn bảo quản HoNa Fresh", id);
            } else {
                db.update("""
                    insert into hub_inspections(
                        inspection_code, contract_id, cold_room_id,
                        received_weight_kg, qualified_weight_kg, rejected_weight_kg,
                        brix_degree, moisture_pct, qc_staff_id, qc_note,
                        created_at, updated_at
                    ) values (?,?,?,?,?,?,?,?,?,?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                    """,
                    code("QC"), id, coldRoomId, weight, weight, BigDecimal.ZERO, new BigDecimal("12.5"), new BigDecimal("85.0"), qcStaffId, "Đạt tiêu chuẩn bảo quản HoNa Fresh");
            }
            db.update("update b2b_contracts set qc_status='QC_PASSED',qc_passed_at=CURRENT_TIMESTAMP,fulfillment_status='AT_HUB_QC' where id=?", id);
        } else if(next.equals("OUTBOUND_DISPATCHED") || next.equals("IN_TRANSIT")) {
            var shipment=db.queryForList("select * from shipments where contract_id=?",id);
            if(shipment.isEmpty()) {
                Long truckId = db.queryForList("select id from cold_assets where asset_type='REFRIGERATED_TRUCK' limit 1").stream()
                        .findFirst().map(m -> ((Number)m.get("id")).longValue()).orElse(null);
                Long driverId = db.queryForList("select u.id from users u join users_roles ur on ur.user_id=u.id join roles r on r.id=ur.role_id where r.name in ('ROLE_DRIVER','DRIVER') and u.enabled=true limit 1").stream()
                        .findFirst().map(m -> ((Number)m.get("id")).longValue()).orElse(null);
                if (driverId == null) {
                    try { if (AuthService.current() != null) driverId = AuthService.current().getId(); } catch (Exception ignored) {}
                }
                if (driverId == null) driverId = 1L;
                if (truckId == null) {
                    truckId = db.queryForObject("insert into cold_assets(asset_code,asset_type,asset_name,capacity_kg,driver_id) values (?,'REFRIGERATED_TRUCK','Xe tải lạnh 5 tấn HoNa Fresh',5000,?) returning id", Long.class, code("TRK"), driverId);
                }
                BigDecimal loaded = resolveSafeWeight(c);
                db.update("insert into shipments(shipment_code,contract_id,truck_id,driver_id,loaded_weight_kg,status,departed_at) values (?,?,?,?,?,'IN_TRANSIT',CURRENT_TIMESTAMP)",
                        code("SHP"), id, truckId, driverId, loaded);
            } else {
                db.update("update shipments set status='IN_TRANSIT',departed_at=CURRENT_TIMESTAMP where contract_id=?",id);
            }
            db.update("update b2b_contracts set fulfillment_status=? where id=?", next, id);
        } else if(next.equals("DELIVERED")) {
            db.update("update shipments set status='DELIVERED',delivered_at=CURRENT_TIMESTAMP,delivered_weight_kg=COALESCE(delivered_weight_kg,loaded_weight_kg) where contract_id=? and status<>'DELIVERED'", id);
            BigDecimal logisticsFee = decimal(c, "logistics_fee_amount");
            BigDecimal totalInvoice = deliveredGoods(c).add(logisticsFee);
            BigDecimal due = money(totalInvoice.subtract(decimal(c,"deposit_received")));
            if(due.signum()>0) {
                String ref=n.has("reference") ? text(n,"reference") : "BAL-" + UUID.randomUUID().toString().substring(0,8).toUpperCase();
                journal(id,"BALANCE",ref,List.of(line("112",due,true),line("3388",due,false)));
                db.update("update b2b_contracts set balance_ref=?,balance_received=? where id=?",ref,due,id);
            }
            db.update("update b2b_contracts set fulfillment_status='DELIVERED',remaining_payment_status='PAID' where id=?", id);
        } else if(next.equals("SETTLED")) {
            if(db.queryForObject("select count(*) from spoilage_claims where contract_id=? and status='OPEN'",Integer.class,id)>0) bad("Còn tranh chấp chưa xử lý");
            BigDecimal held=held(c);
            BigDecimal goods = deliveredGoods(c);
            BigDecimal logisticsFee = decimal(c, "logistics_fee_amount");
            BigDecimal feeRate = c.get("platform_fee_rate") != null ? decimal(c, "platform_fee_rate") : new BigDecimal("2.5");
            BigDecimal commissionFee = money(goods.multiply(feeRate).divide(new BigDecimal("100"), 2, RoundingMode.HALF_UP));
            BigDecimal honaRevenue = commissionFee.add(logisticsFee);
            BigDecimal vatRate = c.get("service_vat_rate") != null && decimal(c, "service_vat_rate").signum() > 0
                    ? decimal(c, "service_vat_rate")
                    : new BigDecimal("8.0");
            BigDecimal vat = money(honaRevenue.multiply(vatRate).divide(new BigDecimal("100"), 2, RoundingMode.HALF_UP));
            BigDecimal payout = money(held.subtract(honaRevenue).subtract(vat));
            if(payout.signum()<0) bad("Phí vượt số tiền có thể giải ngân");
            String ref=n.has("reference") ? text(n,"reference") : "PAY-" + UUID.randomUUID().toString().substring(0,8).toUpperCase();
            var lines=new ArrayList<Map<String,Object>>();
            lines.add(line("3388",held,true));
            if(honaRevenue.signum()>0) lines.add(line("5113",honaRevenue,false));
            if(vat.signum()>0) lines.add(line("3331",vat,false));
            if(payout.signum()>0) lines.add(line("112",payout,false));
            journal(id,"SETTLEMENT",ref,lines);
            String bankRef = n.path("bankTransferRef").asText(ref);
            String bankName = n.path("farmerBankName").asText("");
            String bankAcc = n.path("farmerBankAccount").asText("");
            String bankOwner = n.path("farmerBankOwner").asText("");
            db.update("update b2b_contracts set platform_fee_amount=?,payout_ref=?,payout_amount=?,farmer_payout_amount=?,settled_at=CURRENT_TIMESTAMP,fulfillment_status='SETTLED',bank_transfer_ref=?,farmer_bank_name=COALESCE(NULLIF(?,''),farmer_bank_name),farmer_bank_account=COALESCE(NULLIF(?,''),farmer_bank_account),farmer_bank_owner=COALESCE(NULLIF(?,''),farmer_bank_owner) where id=?",
                    commissionFee, ref, payout, payout, bankRef, bankName, bankAcc, bankOwner, id);

            // Đồng bộ tạo bản ghi bảng settlements để Farmer thấy ngay trong "Bảng Kê Chi Tiết Các Khoản Giải Ngân"
            Integer existingSettlements = db.queryForObject(
                    "select count(*) from settlements where contract_id=?",
                    Integer.class, id);
            Long farmerId = asLong(c, "farmer_id");
            if ((existingSettlements == null || existingSettlements == 0) && farmerId != null) {
                BigDecimal unitPriceVal = decimal(c, "agreed_price_per_kg").signum() > 0
                        ? decimal(c, "agreed_price_per_kg")
                        : (decimal(c, "offered_price_per_kg").signum() > 0
                            ? decimal(c, "offered_price_per_kg")
                            : decimal(c, "unit_price"));
                BigDecimal weightVal = decimal(c, "actual_delivered_weight_kg").signum() > 0
                        ? decimal(c, "actual_delivered_weight_kg")
                        : (decimal(c, "quantity_kg").signum() > 0
                            ? decimal(c, "quantity_kg")
                            : decimal(c, "offered_weight_kg"));
                if (weightVal.signum() <= 0 && unitPriceVal.signum() > 0 && goods.signum() > 0) {
                    weightVal = goods.divide(unitPriceVal, 2, RoundingMode.HALF_UP);
                }
                String resolvedBankName = !bankName.isBlank() ? bankName : Objects.toString(c.get("farmer_bank_name"), "Agribank");
                String resolvedBankAcc = !bankAcc.isBlank() ? bankAcc : Objects.toString(c.get("farmer_bank_account"), "");
                String resolvedBankOwner = !bankOwner.isBlank() ? bankOwner : Objects.toString(c.get("farmer_bank_owner"), "");
                String taxFormType = "FORM_01_TNDN";
                try {
                    var profileRows = db.queryForList(
                            "select farmer_type, bank_name, bank_account, bank_account_name from farmer_profiles where user_id=? limit 1",
                            farmerId);
                    if (!profileRows.isEmpty()) {
                        var prof = profileRows.getFirst();
                        if ("COOPERATIVE".equalsIgnoreCase(Objects.toString(prof.get("farmer_type"), ""))) {
                            taxFormType = "HOA_DON_KCT";
                        }
                        if (resolvedBankAcc.isBlank()) resolvedBankAcc = Objects.toString(prof.get("bank_account"), "");
                        if (resolvedBankName.isBlank()) resolvedBankName = Objects.toString(prof.get("bank_name"), "Agribank");
                        if (resolvedBankOwner.isBlank()) resolvedBankOwner = Objects.toString(prof.get("bank_account_name"), "");
                    }
                } catch (Exception ignored) {}

                String settlementCode = "STL-" + java.time.Year.now().getValue() + "-"
                        + UUID.randomUUID().toString().substring(0, 4).toUpperCase();
                BigDecimal deductedFee = goods.subtract(payout).max(BigDecimal.ZERO);
                db.update("""
                        INSERT INTO settlements(
                            settlement_code, contract_id, farmer_id, qualified_weight, unit_price,
                            gross_amount, platform_fee_percent, platform_fee, payout_amount,
                            bank_account, bank_name, bank_account_name, bank_reference,
                            is_paid, paid_at, tax_form_type, created_at, updated_at
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, true, CURRENT_TIMESTAMP, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                        """,
                        settlementCode, id, farmerId, weightVal.doubleValue(), unitPriceVal,
                        goods, feeRate.doubleValue(), deductedFee, payout,
                        resolvedBankAcc, resolvedBankName, resolvedBankOwner, bankRef,
                        taxFormType);
            }
        }
        db.update("update b2b_contracts set status=?,updated_at=CURRENT_TIMESTAMP where id=?",next,id);audit("CONTRACT_"+next,id);
        var updatedContract = db.queryForMap("select * from b2b_contracts where id=?", id);
        notifyContractParties(updatedContract, next);
        String contractCode = Objects.toString(updatedContract.get("contract_code"), "");
        b2bRealtimeService.notifyContractUpdated(next, contractCode, updatedContract);
    }

    private void notifyContractParties(Map<String,Object> contract, String nextStatus) {
        String contractCode = Objects.toString(contract.get("contract_code"), "");
        String subject = "Cập nhật trạng thái hợp đồng " + contractCode;
        String body = "Hợp đồng " + contractCode + " vừa chuyển sang trạng thái: " + nextStatus + ".\n"
                + "Vui lòng đăng nhập HoNa Fresh để xem chi tiết tiến trình và thao tác tiếp theo.";
        List<String> recipients = new java.util.ArrayList<>();
        for (String column : List.of("buyer_id", "farmer_id")) {
            try {
                Long partyId = asLong(contract, column);
                if (partyId == null) continue;
                String email = db.queryForObject("select email from users where id=?", String.class, partyId);
                if (email != null && !email.isBlank()) recipients.add(email);
            } catch (Exception ex) {
                log.warn("Không lấy được email trạng thái hợp đồng {}: {}", contractCode, ex.getMessage());
            }
        }
        if (recipients.isEmpty()) return;
        java.util.concurrent.CompletableFuture.runAsync(() -> {
            for (String email : recipients) {
                try {
                    mail.send(email, subject, body);
                } catch (Exception ex) {
                    // SMTP là kênh thông báo phụ; không rollback giao dịch nếu mail server lỗi/chưa cấu hình.
                    log.warn("Không gửi được email trạng thái hợp đồng {}: {}", contractCode, ex.getMessage());
                }
            }
        });
    }
    public BigDecimal deliveredGoods(Map<String,Object> c) { var rows=db.queryForList("select delivered_weight_kg from shipments where contract_id=?",c.get("id"));return rows.isEmpty()||rows.getFirst().get("delivered_weight_kg")==null?decimal(c,"total_goods_amount"):money(decimal(rows.getFirst(),"delivered_weight_kg").multiply(decimal(c,"offered_price_per_kg"))); }
    @Transactional public long createAsset(JsonNode n) {
        String type=text(n,"assetType");if(!Set.of("COLD_ROOM","REFRIGERATED_TRUCK").contains(type)) bad("Loại tài sản không hợp lệ");
        Long driver=n.path("driverId").asLong()>0?n.path("driverId").asLong():null;if(driver!=null)requireRole(driver,"DRIVER");
        if(type.equals("REFRIGERATED_TRUCK")&&driver==null) bad("Xe lạnh cần tài xế phụ trách");
        long id=db.queryForObject("insert into cold_assets(asset_code,asset_type,asset_name,capacity_kg,driver_id) values (?,?,?,?,?) returning id",Long.class,text(n,"assetCode"),type,text(n,"assetName"),number(n,"capacityKg",BigDecimal.ONE,new BigDecimal("1000000")),driver);audit("CREATE_ASSET",id);return id;
    }
    @Transactional public void assetStatus(long id,JsonNode n) {
        String status=text(n,"status");if(!Set.of("NORMAL","MAINTENANCE").contains(status)) bad("Trạng thái không hợp lệ");lock("cold_assets",id);
        if(db.queryForObject("select count(*) from shipments where truck_id=? and status in ('SCHEDULED','IN_TRANSIT')",Integer.class,id)>0) bad("Xe đang có chuyến chưa hoàn tất");
        db.update("update cold_assets set status=? where id=?",status,id);audit("ASSET_"+status,id);
    }
    @Transactional public long inspect(JsonNode n) {
        long contractId=n.path("contractId").asLong(), roomId=n.path("coldRoomId").asLong();var c=lock("b2b_contracts",contractId);
        if(!"DEPOSIT_PAID".equals(c.get("status"))) bad("Hợp đồng cần nhận cọc trước khi QC");
        var room=lock("cold_assets",roomId);if(!"COLD_ROOM".equals(room.get("asset_type"))||!"NORMAL".equals(room.get("status"))) bad("Buồng lạnh không khả dụng");
        BigDecimal received=number(n,"receivedWeightKg",BigDecimal.ONE,decimal(c,"offered_weight_kg")), qualified=number(n,"qualifiedWeightKg",BigDecimal.ONE,received), rejected=received.subtract(qualified);
        BigDecimal occupied=db.queryForObject("select coalesce(sum(i.qualified_weight_kg),0) from hub_inspections i join b2b_contracts c on c.id=i.contract_id where i.cold_room_id=? and c.status in ('DEPOSIT_PAID','AT_HUB_QC')",BigDecimal.class,roomId);
        if(occupied.add(qualified).compareTo(decimal(room,"capacity_kg"))>0) bad("Buồng lạnh không đủ sức chứa");
        long id=db.queryForObject("""
            insert into hub_inspections(
                inspection_code, contract_id, cold_room_id,
                received_weight_kg, qualified_weight_kg, rejected_weight_kg,
                brix_degree, moisture_pct, qc_staff_id, qc_note,
                created_at, updated_at
            ) values (?,?,?,?,?,?,?,?,?,?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP) returning id
            """,
            Long.class, code("QC"), contractId, roomId, received, qualified, rejected,
            number(n, "brix", BigDecimal.ZERO, new BigDecimal("100")),
            number(n, "moisture", BigDecimal.ZERO, new BigDecimal("100")),
            AuthService.current().getId(), n.path("note").asText(""));
        db.update("update b2b_contracts set status='AT_HUB_QC',updated_at=CURRENT_TIMESTAMP where id=?",contractId);
        if(rejected.multiply(new BigDecimal("100")).compareTo(received.multiply(new BigDecimal("5")))>0) createClaim(c,rejected,"QC_REJECTION_OVER_5_PERCENT","FARMER");
        audit("INSPECT",id);return id;
    }
    @Transactional public long schedule(JsonNode n) {
        long contractId=n.path("contractId").asLong(), truckId=n.path("truckId").asLong(), driverId=n.path("driverId").asLong();var c=lock("b2b_contracts",contractId);var truck=lock("cold_assets",truckId);requireRole(driverId,"DRIVER");
        if(!"AT_HUB_QC".equals(c.get("status"))||!"REFRIGERATED_TRUCK".equals(truck.get("asset_type"))||!"NORMAL".equals(truck.get("status"))) bad("Hợp đồng hoặc xe không sẵn sàng");
        if(!Objects.equals(asLong(truck,"driver_id"),driverId)) bad("Tài xế không được phân công xe này");
        BigDecimal loaded=db.queryForObject("select qualified_weight_kg from hub_inspections where contract_id=?",BigDecimal.class,contractId);
        BigDecimal occupied=db.queryForObject("select coalesce(sum(loaded_weight_kg),0) from shipments where truck_id=? and status in ('SCHEDULED','IN_TRANSIT')",BigDecimal.class,truckId);
        if(occupied.add(loaded).compareTo(decimal(truck,"capacity_kg"))>0) bad("Xe vượt tải trọng");
        long id=db.queryForObject("insert into shipments(shipment_code,contract_id,truck_id,driver_id,loaded_weight_kg) values (?,?,?,?,?) returning id",Long.class,code("SHP"),contractId,truckId,driverId,loaded);audit("SCHEDULE",id);return id;
    }
    @Transactional public void epod(long id,JsonNode n) {
        var s=lock("shipments",id);var c=lock("b2b_contracts",asLong(s,"contract_id"));User actor=AuthService.current();
        if(!AuthService.has(actor,"ADMIN")&&!Objects.equals(actor.getId(),asLong(c,"buyer_id"))) throw new AuthException(403,"OWNER_REQUIRED","Chỉ bên mua của hợp đồng được ký nhận ePOD");
        if(!"IN_TRANSIT".equals(s.get("status"))) bad("Chuyến chưa giao hoặc đã ký nhận");
        BigDecimal delivered=number(n,"deliveredWeightKg",BigDecimal.ONE,decimal(s,"loaded_weight_kg")), damaged=number(n,"damagedWeightKg",BigDecimal.ZERO,decimal(s,"loaded_weight_kg").subtract(delivered)), shrinkage=decimal(s,"loaded_weight_kg").subtract(delivered).subtract(damaged);
        String photo=n.path("photoUrl").asText(""), signature=n.path("signatureData").asText("");
        if(!(photo.startsWith("https://")||photo.startsWith("data:image/"))||!signature.startsWith("data:image/png;base64,")||photo.length()>2_000_000||signature.length()>200_000) bad("Ảnh/chữ ký không hợp lệ hoặc quá lớn");
        db.update("update shipments set delivered_weight_kg=?,damaged_weight_kg=?,natural_shrinkage_kg=?,epod_signature_name=?,epod_photo_url=?,epod_signature_data=?,status='DELIVERED',delivered_at=CURRENT_TIMESTAMP where id=?",delivered,damaged,shrinkage,text(n,"signatureName"),photo,signature,id);
        if(damaged.signum()>0) createClaim(c,damaged,"DELIVERY_DAMAGE","PLATFORM");audit("EPOD",id);
        String contractCode = Objects.toString(c.get("contract_code"), "");
        b2bRealtimeService.notifyContractUpdated("DELIVERED", contractCode, c);
    }
    public List<Map<String,Object>> telemetry(long assetId) { return db.queryForList("select * from iot_sensor_logs where asset_id=? order by id desc limit 60",assetId); }

    public List<Map<String,Object>> coldChainAlerts() {
        return db.queryForList("""
            select a.*, ca.asset_code, ca.asset_name, c.contract_code,
                   ack.full_name acknowledged_by_name, res.full_name resolved_by_name
            from cold_chain_alerts a
            join cold_assets ca on ca.id=a.asset_id
            left join b2b_contracts c on c.id=a.contract_id
            left join users ack on ack.id=a.acknowledged_by
            left join users res on res.id=a.resolved_by
            order by case a.status when 'OPEN' then 0 when 'ACKNOWLEDGED' then 1 else 2 end,
                     a.created_at desc
            limit 500
            """);
    }

    @Transactional
    public void acknowledgeColdChainAlert(long alertId, JsonNode n) {
        var alert = lock("cold_chain_alerts", alertId);
        String status = Objects.toString(alert.get("status"), "");
        if ("RESOLVED".equals(status)) bad("Cảnh báo đã được xử lý hoàn tất");
        String note = n == null ? "Đã tiếp nhận và đang kiểm tra thiết bị" : n.path("note").asText("Đã tiếp nhận và đang kiểm tra thiết bị");
        db.update("update cold_chain_alerts set status='ACKNOWLEDGED',acknowledged_by=?,acknowledged_at=CURRENT_TIMESTAMP,acknowledge_note=?,updated_at=CURRENT_TIMESTAMP where id=?",
                AuthService.current().getId(), note, alertId);
        audit("COLD_ALERT_ACKNOWLEDGED", alertId);
    }

    @Transactional
    public void resolveColdChainAlert(long alertId, JsonNode n) {
        var alert = lock("cold_chain_alerts", alertId);
        if ("RESOLVED".equals(Objects.toString(alert.get("status"), ""))) return;
        String note = n == null ? "Thiết bị đã trở lại ngưỡng an toàn" : n.path("note").asText("").trim();
        if (note.isBlank()) bad("Vui lòng nhập nội dung khắc phục cảnh báo");
        long assetId = asLong(alert, "asset_id");
        var asset = lock("cold_assets", assetId);
        BigDecimal temp = decimal(asset, "current_temp");
        var cfg = settings();
        if (temp.compareTo(decimal(cfg, "temp_min")) < 0 || temp.compareTo(decimal(cfg, "temp_max")) > 0) {
            bad("Thiết bị vẫn đang ngoài ngưỡng an toàn; hãy phục hồi cảm biến trước khi đóng cảnh báo");
        }
        db.update("update cold_chain_alerts set status='RESOLVED',resolved_by=?,resolved_at=CURRENT_TIMESTAMP,resolution_note=?,updated_at=CURRENT_TIMESTAMP where id=?",
                AuthService.current().getId(), note, alertId);
        audit("COLD_ALERT_RESOLVED", alertId);
    }

    @Transactional public void approvePackaging(long id, JsonNode n) {
        var c = lock("b2b_contracts", id);
        db.update("update b2b_contracts set packaging_approved=true,packaging_approved_at=CURRENT_TIMESTAMP,delivery_notes=NULL,fulfillment_status='PACKAGING_APPROVED',status='PACKAGING_APPROVED',updated_at=CURRENT_TIMESTAMP where id=?", id);
        audit("APPROVE_PACKAGING", id);
        var updated = db.queryForMap("select * from b2b_contracts where id=?", id);
        notifyContractParties(updated, "PACKAGING_APPROVED");
        b2bRealtimeService.notifyContractUpdated("PACKAGING_APPROVED", Objects.toString(updated.get("contract_code"), ""), updated);
    }

    @Transactional public void rejectPackaging(long id, JsonNode n) {
        var c = lock("b2b_contracts", id);
        String reason = n != null && n.has("reason") && !n.path("reason").asText("").isBlank()
                ? n.path("reason").asText().trim()
                : "Ban Quản Trị yêu cầu kiểm tra và làm lại biên bản thu hoạch / đóng gói.";
        db.update("update b2b_contracts set packaging_approved=false,packaging_approved_at=NULL,delivery_notes=?,fulfillment_status='HARVESTING',status='HARVEST_REJECTED',updated_at=CURRENT_TIMESTAMP where id=?", reason, id);
        audit("REJECT_PACKAGING", id);
        var updated = db.queryForMap("select * from b2b_contracts where id=?", id);
        notifyContractParties(updated, "PACKAGING_REJECTED");
        b2bRealtimeService.notifyContractUpdated("PACKAGING_REJECTED", Objects.toString(updated.get("contract_code"), ""), updated);
    }

    @Transactional public void dispatchPickup(long id, JsonNode n) {
        var c = lock("b2b_contracts", id);
        String plate = n.path("truckPlate").asText("29H-882.14");
        String driver = n.path("driverName").asText("Nguyễn Văn Tài (HoNa Cold Express)");
        String phone = n.path("driverPhone").asText("0981.234.567");
        db.update("update b2b_contracts set pickup_truck_plate=?,pickup_driver_name=?,pickup_driver_phone=?,fulfillment_status='PICKUP_DISPATCHED',status='PICKUP_DISPATCHED',updated_at=CURRENT_TIMESTAMP where id=?",
                plate, driver, phone, id);
        audit("DISPATCH_PICKUP", id);
        var updated = db.queryForMap("select * from b2b_contracts where id=?", id);
        notifyContractParties(updated, "PICKUP_DISPATCHED");
        b2bRealtimeService.notifyContractUpdated("PICKUP_DISPATCHED", Objects.toString(updated.get("contract_code"), ""), updated);
    }

    @Transactional public void farmHandover(long id, JsonNode n) {
        var c = lock("b2b_contracts", id);
        BigDecimal temp = number(n, "handoverTemp", new BigDecimal("-10"), new BigDecimal("35"));
        db.update("update b2b_contracts set farm_handover_temp=?,farm_pickup_signed_at=CURRENT_TIMESTAMP,fulfillment_status='IN_TRANSIT_HUB',status='IN_TRANSIT_HUB',updated_at=CURRENT_TIMESTAMP where id=?",
                temp, id);
        audit("FARM_HANDOVER", id);

        // Đồng bộ điểm dừng pickup_trip_stops và chuyến xe pickup_trips tương ứng
        db.update("update pickup_trip_stops set status='LOADED', loaded_at=CURRENT_TIMESTAMP, actual_weight_kg=COALESCE(actual_weight_kg, weight_kg) where contract_id=?", id);
        List<Long> tripIds = db.queryForList("select DISTINCT trip_id from pickup_trip_stops where contract_id=?", Long.class, id);
        for (Long tId : tripIds) {
            db.update("""
                update pickup_trips
                set status = CASE WHEN status in ('ASSIGNED', 'ACKNOWLEDGED') THEN 'ON_TRIP' ELSE status END,
                    departure_time = COALESCE(departure_time, CURRENT_TIMESTAMP),
                    actual_total_weight_kg = (
                        select COALESCE(SUM(COALESCE(actual_weight_kg, weight_kg)), 0)
                        from pickup_trip_stops
                        where trip_id = ? and status = 'LOADED'
                    )
                where id = ?
                """, tId, tId);
            b2bRealtimeService.notifyDispatchTripUpdated("STOP_LOADED", tId, null);
        }

        var updated = db.queryForMap("select * from b2b_contracts where id=?", id);
        notifyContractParties(updated, "IN_TRANSIT_HUB");
        b2bRealtimeService.notifyContractUpdated("IN_TRANSIT_HUB", Objects.toString(updated.get("contract_code"), ""), updated);
    }

    @Transactional public void warehouseInbound(long id, JsonNode n) {
        var c = lock("b2b_contracts", id);
        String zone = n.path("zone").asText("Zone A (Lạnh mát 2-6°C)");
        if (zone.length() > 50) zone = zone.substring(0, 50);

        String rackBin = n.path("rackBin").asText("Kệ R-03 Ô B-12");
        if (rackBin.length() > 50) rackBin = rackBin.substring(0, 50);

        int maxDays = n.path("maxStorageDays").asInt(5);
        String certUrl = n.path("qcCertUrl").asText("");
        BigDecimal gross = null;
        if (n.has("grossWeightKg")) {
            try { gross = new BigDecimal(n.path("grossWeightKg").asText("0")); } catch (Exception ignored) {}
        }
        BigDecimal tare = null;
        if (n.has("tareWeightKg")) {
            try { tare = new BigDecimal(n.path("tareWeightKg").asText("0")); } catch (Exception ignored) {}
        }
        BigDecimal net = null;
        if (n.has("netWeightKg")) {
            try { net = new BigDecimal(n.path("netWeightKg").asText("0")); } catch (Exception ignored) {}
        }
        if (net == null || net.compareTo(BigDecimal.ZERO) <= 0) {
            if (gross != null && tare != null && gross.compareTo(tare) > 0) {
                net = gross.subtract(tare);
            } else {
                net = resolveSafeWeight(c);
            }
        }
        BigDecimal brix = n.has("brix") ? new BigDecimal(n.path("brix").asText("12.5")) : new BigDecimal("12.5");
        BigDecimal nitrate = n.has("nitratePpm") ? new BigDecimal(n.path("nitratePpm").asText("280.0")) : new BigDecimal("280.0");
        boolean pesticideSafe = !n.has("pesticideSafe") || n.path("pesticideSafe").asBoolean(true);

        db.update("""
            update b2b_contracts
            set hub_warehouse_zone=?, hub_rack_bin=?, max_storage_days=?,
                hub_inbound_at=COALESCE(hub_inbound_at, CURRENT_TIMESTAMP), qc_status='QC_PASSED', qc_passed_at=CURRENT_TIMESTAMP,
                qc_cert_url=?, inbound_gross_weight_kg=?, inbound_tare_weight_kg=?, inbound_net_weight_kg=?,
                qc_brix=?, qc_nitrate_ppm=?, qc_pesticide_safe=?,
                fulfillment_status='QC_PASSED', status='QC_PASSED', updated_at=CURRENT_TIMESTAMP
            where id=?
            """,
            zone, rackBin, maxDays, certUrl, gross, tare, net, brix, nitrate, pesticideSafe, id);

        Long coldRoomId = db.queryForList("select id from cold_assets where asset_type='COLD_ROOM' limit 1").stream()
                .findFirst().map(m -> ((Number)m.get("id")).longValue()).orElse(null);
        if (coldRoomId == null) {
            coldRoomId = db.queryForObject("insert into cold_assets(asset_code,asset_type,asset_name,capacity_kg) values (?,'COLD_ROOM','Kho lạnh trung tâm HoNa',100000) returning id", Long.class, code("CR"));
        }

        Long qcStaffId = null;
        try {
            if (AuthService.current() != null) {
                qcStaffId = AuthService.current().getId();
            }
        } catch (Exception ignored) {}
        if (qcStaffId == null) {
            qcStaffId = db.queryForList("""
                select u.id from users u 
                join users_roles ur on ur.user_id=u.id 
                join roles r on r.id=ur.role_id 
                where r.name in ('ROLE_WAREHOUSE_QC','WAREHOUSE_QC','ROLE_ADMIN') 
                limit 1
            """).stream().findFirst().map(m -> ((Number)m.get("id")).longValue()).orElse(1L);
        }
        BigDecimal moisture = new BigDecimal("85.0");
        String qcNote = "Đạt tiêu chuẩn bảo quản HoNa Fresh (Brix: " + brix + ", Nitrate: " + nitrate + " ppm)";

        List<Long> existingInspections = db.queryForList("select id from hub_inspections where contract_id=?", Long.class, id);
        if (!existingInspections.isEmpty()) {
            db.update("""
                update hub_inspections
                set cold_room_id=?,
                    received_weight_kg=?,
                    qualified_weight_kg=?,
                    rejected_weight_kg=?,
                    brix_degree=?,
                    moisture_pct=?,
                    qc_staff_id=?,
                    qc_note=?,
                    updated_at=CURRENT_TIMESTAMP
                where contract_id=?
                """,
                coldRoomId, net, net, BigDecimal.ZERO, brix, moisture, qcStaffId, qcNote, id);
        } else {
            db.update("""
                insert into hub_inspections(
                    inspection_code, contract_id, cold_room_id,
                    received_weight_kg, qualified_weight_kg, rejected_weight_kg,
                    brix_degree, moisture_pct, qc_staff_id, qc_note,
                    created_at, updated_at
                ) values (?,?,?,?,?,?,?,?,?,?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                """,
                code("QC"), id, coldRoomId, net, net, BigDecimal.ZERO, brix, moisture, qcStaffId, qcNote);
        }

        audit("WAREHOUSE_INBOUND_QC", id);
        var updated = db.queryForMap("select * from b2b_contracts where id=?", id);
        notifyContractParties(updated, "QC_PASSED");
        b2bRealtimeService.notifyContractUpdated("QC_PASSED", Objects.toString(updated.get("contract_code"), ""), updated);
    }

    @Transactional
    public Map<String, Object> rejectQcLab(long id, JsonNode n) {
        var c = lock("b2b_contracts", id);
        BigDecimal brix = n.has("brix") ? new BigDecimal(n.path("brix").asText("0")) : BigDecimal.ZERO;
        BigDecimal nitrate = n.has("nitratePpm") ? new BigDecimal(n.path("nitratePpm").asText("0")) : BigDecimal.ZERO;
        boolean pesticideSafe = !n.has("pesticideSafe") || n.path("pesticideSafe").asBoolean(false);
        BigDecimal received = resolveSafeWeight(c);
        BigDecimal rejected = n.has("rejectedWeightKg")
                ? new BigDecimal(n.path("rejectedWeightKg").asText(received.toString()))
                : received;
        if (rejected.compareTo(BigDecimal.ZERO) <= 0) rejected = received;
        String reason = n.has("reason") && !n.path("reason").asText("").isBlank()
                ? n.path("reason").asText().trim()
                : n.path("qcNotes").asText("Không đạt tiêu chuẩn kiểm định QC HoNa Fresh.");

        db.update("""
            update b2b_contracts
            set qc_status='QC_FAILED', qc_passed_at=CURRENT_TIMESTAMP,
                qc_brix=?, qc_nitrate_ppm=?, qc_pesticide_safe=?,
                delivery_notes=?, fulfillment_status='QC_FAILED', status='QC_FAILED', updated_at=CURRENT_TIMESTAMP
            where id=?
            """, brix, nitrate, pesticideSafe, reason, id);

        Long coldRoomId = db.queryForList("select id from cold_assets where asset_type='COLD_ROOM' limit 1").stream()
                .findFirst().map(m -> ((Number) m.get("id")).longValue()).orElse(null);
        if (coldRoomId == null) {
            coldRoomId = db.queryForObject("insert into cold_assets(asset_code,asset_type,asset_name,capacity_kg) values (?,'COLD_ROOM','Kho lạnh trung tâm HoNa',100000) returning id", Long.class, code("CR"));
        }
        Long qcStaffId = 1L;
        try { if (AuthService.current() != null) qcStaffId = AuthService.current().getId(); } catch (Exception ignored) {}

        List<Long> existingIns = db.queryForList("select id from hub_inspections where contract_id=?", Long.class, id);
        if (!existingIns.isEmpty()) {
            db.update("update hub_inspections set received_weight_kg=?, qualified_weight_kg=0, rejected_weight_kg=?, brix_degree=?, nitrate_ppm=?, pesticide_residue_pass=false, qc_passed=false, qc_notes=? where contract_id=?",
                    received, rejected, brix, nitrate, reason, id);
        } else {
            db.update("insert into hub_inspections(inspection_code,contract_id,cold_room_id,qc_staff_id,received_weight_kg,qualified_weight_kg,rejected_weight_kg,brix_degree,nitrate_ppm,moisture_pct,pesticide_residue_pass,qc_passed,qc_notes) values (?,?,?,?,?,0,?,?,?,85.0,false,false,?)",
                    code("QC"), id, coldRoomId, qcStaffId, received, rejected, brix, nitrate, reason);
        }

        List<Long> openClaims = db.queryForList("select id from spoilage_claims where contract_id=? and status='OPEN'", Long.class, id);
        if (openClaims.isEmpty()) {
            createClaim(c, rejected.min(received), "QC Lab Không Đạt: " + reason, "FARMER");
        }

        audit("WAREHOUSE_QC_FAILED", id);
        var updated = db.queryForMap("select * from b2b_contracts where id=?", id);
        notifyContractParties(updated, "QC_FAILED");
        b2bRealtimeService.notifyContractUpdated("QC_FAILED", Objects.toString(updated.get("contract_code"), ""), updated);
        return Map.of(
                "contractCode", Objects.toString(updated.get("contract_code"), ""),
                "qcStatus", "QC_FAILED",
                "reason", reason
        );
    }

    @Transactional
    public Map<String, Object> processQcReturnRefund(long id, JsonNode n) {
        var c = lock("b2b_contracts", id);
        String currentStatus = Objects.toString(c.get("status"), "");
        if ("SETTLED".equals(currentStatus) || "COMPLETED".equals(currentStatus)) {
            bad("Hợp đồng đã quyết toán, không thể hoàn cọc tại bước QC.");
        }
        String returnMethod = n.path("returnMethod").asText("Trả hàng trực tiếp cho Nhà vườn tại Kho HoNa");
        String returnNotes = n.path("returnNotes").asText("Hàng không đạt QC, đã lập biên bản hoàn trả & hoàn cọc.");
        String reference = n.has("reference") && !n.path("reference").asText("").isBlank()
                ? n.path("reference").asText().trim()
                : "REF-QC-" + UUID.randomUUID().toString().substring(0, 6).toUpperCase();

        BigDecimal refundAmount = decimal(c, "deposit_received");
        if (refundAmount.signum() <= 0) refundAmount = decimal(c, "deposit_30_amount");
        if (refundAmount.signum() <= 0) refundAmount = decimal(c, "deposit_amount");

        if (refundAmount.signum() > 0) {
            journal(id, "REFUND", reference, List.of(line("3388", refundAmount, true), line("112", refundAmount, false)));
        }

        String fullNote = returnMethod + " · " + returnNotes + " (Mã GD hoàn cọc: " + reference + ")";
        db.update("""
            update b2b_contracts
            set status='CANCELLED', fulfillment_status='QC_RETURNED_REFUNDED', qc_status='QC_RETURNED',
                refund_amount=?, delivery_notes=?, updated_at=CURRENT_TIMESTAMP
            where id=?
            """, refundAmount, fullNote, id);

        db.update("update spoilage_claims set status='REFUNDED', resolution_note=?, resolution_ref=? where contract_id=? and status='OPEN'",
                fullNote, reference, id);
        db.update("update shipments set status='CANCELLED' where contract_id=?", id);

        audit("QC_RETURN_AND_REFUND", id);
        var updated = db.queryForMap("select * from b2b_contracts where id=?", id);
        notifyContractParties(updated, "QC_RETURNED_REFUNDED");
        b2bRealtimeService.notifyContractUpdated("QC_RETURNED_REFUNDED", Objects.toString(updated.get("contract_code"), ""), updated);
        return Map.of(
                "contractCode", Objects.toString(updated.get("contract_code"), ""),
                "status", "CANCELLED",
                "fulfillmentStatus", "QC_RETURNED_REFUNDED",
                "refundAmount", refundAmount,
                "reference", reference
        );
    }

    @Transactional public void outboundDispatch(long id, JsonNode n) {
        var c = lock("b2b_contracts", id);
        String plate = n.path("truckPlate").asText("51D-921.88");
        String driver = n.path("driverName").asText("Trần Quốc Bảo (Tài xế HoNa Chặng Cuối)");
        String manifestCode = n.path("manifestCode").asText("MNF-" + UUID.randomUUID().toString().substring(0,8).toUpperCase());
        db.update("update b2b_contracts set outbound_truck_plate=?,outbound_driver_name=?,outbound_manifest_code=?,outbound_dispatched_at=CURRENT_TIMESTAMP,fulfillment_status='OUTBOUND_DISPATCHED',status='IN_TRANSIT',updated_at=CURRENT_TIMESTAMP where id=?",
                plate, driver, manifestCode, id);
        var shipment=db.queryForList("select * from shipments where contract_id=?",id);
        if(shipment.isEmpty()) {
            Long truckId = db.queryForList("select id from cold_assets where asset_type='REFRIGERATED_TRUCK' limit 1").stream()
                    .findFirst().map(m -> ((Number)m.get("id")).longValue()).orElse(null);
            Long driverId = db.queryForList("select u.id from users u join users_roles ur on ur.user_id=u.id join roles r on r.id=ur.role_id where r.name in ('ROLE_DRIVER','DRIVER') and u.enabled=true limit 1").stream()
                    .findFirst().map(m -> ((Number)m.get("id")).longValue()).orElse(null);
            if (driverId == null) {
                try { if (AuthService.current() != null) driverId = AuthService.current().getId(); } catch (Exception ignored) {}
            }
            if (driverId == null) driverId = 1L;
            if (truckId == null) {
                truckId = db.queryForObject("insert into cold_assets(asset_code,asset_type,asset_name,capacity_kg,driver_id) values (?,'REFRIGERATED_TRUCK','Xe lạnh chặng cuối HoNa',5000,?) returning id", Long.class, code("TRK"), driverId);
            }
            BigDecimal loaded = resolveSafeWeight(c);
            db.update("insert into shipments(shipment_code,contract_id,truck_id,driver_id,loaded_weight_kg,status,departed_at) values (?,?,?,?,?,'IN_TRANSIT',CURRENT_TIMESTAMP)",
                    code("SHP"), id, truckId, driverId, loaded);
        } else {
            db.update("update shipments set status='IN_TRANSIT',departed_at=CURRENT_TIMESTAMP where contract_id=?",id);
        }
        audit("OUTBOUND_DISPATCH", id);
        var updated = db.queryForMap("select * from b2b_contracts where id=?", id);
        notifyContractParties(updated, "OUTBOUND_DISPATCHED");
        b2bRealtimeService.notifyContractUpdated("OUTBOUND_DISPATCHED", Objects.toString(updated.get("contract_code"), ""), updated);
    }
    @Transactional public Map<String,Object> inject(JsonNode n,boolean reset) {
        long id=n.path("assetId").asLong();var asset=lock("cold_assets",id);String mode=n.path("mode").asText("TEMP_SPIKE");
        if(!Set.of("TEMP_SPIKE","DOOR_OPEN").contains(mode)) bad("Chế độ mô phỏng không hợp lệ");
        BigDecimal temp=reset?new BigDecimal("4"):mode.equals("DOOR_OPEN")?decimal(asset,"current_temp").add(BigDecimal.ONE).min(new BigDecimal("20")):new BigDecimal("15");
        BigDecimal humidity=reset?new BigDecimal("85"):mode.equals("DOOR_OPEN")?decimal(asset,"current_humidity").subtract(new BigDecimal("5")).max(BigDecimal.ZERO):decimal(asset,"current_humidity");
        var cfg=settings();boolean alert=temp.compareTo(decimal(cfg,"temp_min"))<0||temp.compareTo(decimal(cfg,"temp_max"))>0;
        db.update("update cold_assets set current_temp=?,current_humidity=?,status=? where id=?",temp,humidity,alert?"TEMP_WARNING":"NORMAL",id);
        String alertMessage = reset ? "Mô phỏng: phục hồi" : "Mô phỏng: " + mode;
        Long sensorLogId = db.queryForObject("insert into iot_sensor_logs(asset_id,temperature,humidity,is_alert,alert_message) values (?,?,?,?,?) returning id", Long.class, id, temp, humidity, alert, alertMessage);
        if (alert && sensorLogId != null) {
            Long contractId = db.queryForList("select contract_id from shipments where truck_id=? and status in ('SCHEDULED','IN_TRANSIT') order by id desc limit 1", id)
                    .stream().findFirst().map(row -> asLong(row, "contract_id")).orElse(null);
            String severity = temp.compareTo(new BigDecimal("12")) >= 0 ? "CRITICAL" : "HIGH";
            db.update("insert into cold_chain_alerts(sensor_log_id,asset_id,contract_id,severity,alert_message) values (?,?,?,?,?)",
                    sensorLogId, id, contractId, severity, alertMessage + " · " + temp + "°C");
        }
        audit(reset?"IOT_RESET":"IOT_FAULT",id);
        return Map.of("assetId",id,"temperature",temp,"humidity",humidity,"isAlert",alert,"simulated",true);
    }
    @Transactional public long claim(JsonNode n) {
        var c=lock("b2b_contracts",n.path("contractId").asLong());if(Set.of("CANCELLED","SETTLED","RFQ_SENT").contains(c.get("status"))) bad("Không lập sự cố cho hợp đồng này");
        String liable=text(n,"liableParty");if(!Set.of("PLATFORM","FARMER").contains(liable))bad("Bên chịu trách nhiệm không hợp lệ");
        return createClaim(c,number(n,"damagedWeightKg",new BigDecimal("0.01"),decimal(c,"offered_weight_kg")),text(n,"cause"),liable);
    }
    private long createClaim(Map<String,Object> c,BigDecimal damaged,String cause,String liable) {
        long id=db.queryForObject("insert into spoilage_claims(claim_code,contract_id,damaged_weight_kg,cause,liable_party,compensation_amount) values (?,?,?,?,?,?) returning id",Long.class,code("CLM"),c.get("id"),damaged,cause,liable,money(damaged.multiply(decimal(c,"offered_price_per_kg"))));audit("CREATE_CLAIM",id);return id;
    }
    @Transactional public void resolve(long contractId,JsonNode n) {
        var c=lock("b2b_contracts",contractId);var claim=lock("spoilage_claims",n.path("claimId").asLong());
        if(!Objects.equals(asLong(claim,"contract_id"),contractId)||!"OPEN".equals(claim.get("status"))) bad("Biên bản không thuộc hợp đồng hoặc đã xử lý");
        String action=text(n,"action"), reference=text(n,"reference"), note=text(n,"note");
        if(action.equals("DISMISS")) db.update("update spoilage_claims set status='DISMISSED',resolution_note=?,resolution_ref=? where id=?",note,reference,claim.get("id"));
        else if(action.equals("COMPENSATE")) {
            if(!"PLATFORM".equals(claim.get("liable_party"))||"SETTLED".equals(c.get("status"))||"CANCELLED".equals(c.get("status"))) bad("Chỉ bồi thường lỗi sàn trước quyết toán");
            BigDecimal amount=decimal(claim,"compensation_amount");journal(contractId,"COMPENSATION",reference,List.of(line("811",amount,true),line("3388",amount,false)));
            // Compensation is held in account 3388; buyer receipts remain separate.
            db.update("update spoilage_claims set status='COMPENSATED',resolution_note=?,resolution_ref=? where id=?",note,reference,claim.get("id"));
        } else if(action.equals("REFUND")) {
            if(!Set.of("DEPOSIT_PAID","AT_HUB_QC").contains(c.get("status"))) bad("Chỉ hoàn cọc trước khi hàng lên đường");
            BigDecimal amount=decimal(c,"deposit_received");journal(contractId,"REFUND",reference,List.of(line("3388",amount,true),line("112",amount,false)));
            db.update("update b2b_contracts set status='CANCELLED',refund_amount=? where id=?",amount,contractId);
            db.update("update harvest_lots set available_weight_kg=available_weight_kg+?,status='LOCKED' where id=?",c.get("offered_weight_kg"),c.get("lot_id"));
            db.update("update shipments set status='CANCELLED' where contract_id=?",contractId);
            db.update("update spoilage_claims set status='REFUNDED',resolution_note=?,resolution_ref=? where id=?",note,reference,claim.get("id"));
        } else bad("Chọn DISMISS, COMPENSATE hoặc REFUND");
        audit("RESOLVE_"+action,contractId);
    }
    @Transactional public void updateSettings(JsonNode n) {
        var cur = settings();
        BigDecimal min = n.hasNonNull("tempMin") ? number(n,"tempMin",new BigDecimal("-40"),new BigDecimal("50")) : decimal(cur, "temp_min");
        BigDecimal max = n.hasNonNull("tempMax") ? number(n,"tempMax",new BigDecimal("-40"),new BigDecimal("50")) : decimal(cur, "temp_max");
        if(max.compareTo(min)<=0)bad("Khoảng nhiệt độ không hợp lệ");
        BigDecimal vat=number(n,"serviceVatRate",new BigDecimal("8"),new BigDecimal("10"));if(!Set.of(8,10).contains(vat.intValue())||vat.stripTrailingZeros().scale()>0)bad("Thuế dịch vụ là 8 hoặc 10");
        db.update("update platform_settings set platform_fee_rate=?,deposit_rate=?,temp_min=?,temp_max=?,service_vat_rate=? where id=1",number(n,"platformFeeRate",BigDecimal.ONE,new BigDecimal("5")),number(n,"depositRate",BigDecimal.ONE,new BigDecimal("100")),min,max,vat);audit("SETTINGS",1L);
    }
    private static final String CONTRACT_HUB_ID_EXPR = """
            COALESCE(
              (SELECT ot.hub_id FROM outbound_delivery_stops os JOIN outbound_delivery_trips ot ON ot.id = os.trip_id WHERE os.contract_id = c.id AND os.status <> 'CANCELLED' ORDER BY os.id DESC LIMIT 1),
              (SELECT pt.warehouse_id FROM pickup_trip_stops ps JOIN pickup_trips pt ON pt.id = ps.trip_id WHERE ps.contract_id = c.id ORDER BY ps.id DESC LIMIT 1),
              (SELECT wh.id FROM warehouse_hubs wh WHERE c.hub_name IS NOT NULL AND (wh.hub_name = c.hub_name OR c.hub_name ILIKE '%' || wh.hub_name || '%') LIMIT 1),
              (SELECT wh2.id FROM harvest_lots hl JOIN warehouse_hubs wh2 ON (
                hl.warehouse_location ILIKE '%' || wh2.hub_code || '%'
                OR hl.warehouse_location ILIKE '%' || wh2.hub_name || '%'
                OR (wh2.id = 1 AND hl.warehouse_location ILIKE '%Củ Chi%')
                OR (wh2.id = 2 AND hl.warehouse_location ILIKE '%Đức Trọng%')
                OR (wh2.id = 3 AND hl.warehouse_location ILIKE '%Cái Bè%')
                OR (wh2.id = 4 AND hl.warehouse_location ILIKE '%Buôn Hồ%')
                OR (wh2.id = 5 AND hl.warehouse_location ILIKE '%Hà Nội%')
              ) WHERE hl.id = COALESCE(c.lot_id, c.harvest_lot_id) LIMIT 1)
            )
            """;

    public Map<String,Object> reports() { return reports(null); }

    public Map<String,Object> reports(Long hubId) {
        hubId = resolveScopedHubId(hubId);
        String hubFilterClause = hubId != null ? " WHERE (" + CONTRACT_HUB_ID_EXPR + ") = " + hubId : "";
        String docHubFilterClause = hubId != null ? " AND (" + CONTRACT_HUB_ID_EXPR + ") = " + hubId : "";
        String entrySql = "select e.*, c.contract_code from gl_journal_entries e join b2b_contracts c on c.id=e.contract_id"
                + hubFilterClause + " order by e.id desc limit 500";
        String lineSql = hubId != null
                ? "select l.* from gl_journal_lines l join gl_journal_entries e on e.id=l.entry_id join b2b_contracts c on c.id=e.contract_id where ("
                  + CONTRACT_HUB_ID_EXPR + ") = " + hubId + " order by l.id desc limit 2000"
                : "select * from gl_journal_lines order by id desc limit 2000";
        String docSql = "select c.contract_code,c.status,c.total_goods_amount,c.payout_amount,c.platform_fee_amount,c.logistics_fee_amount,u.full_name,u.company_name,u.tax_code,u.household_farmer,case when u.household_farmer then '01/TNDN - Bảng kê thu mua nông sản' else 'Hóa đơn điện tử KCT' end document_type from b2b_contracts c join users u on u.id=c.farmer_id where c.status='SETTLED'"
                + docHubFilterClause + " order by c.id desc";
        return Map.of("entries", db.queryForList(entrySql), "lines", db.queryForList(lineSql), "documents", db.queryForList(docSql));
    }

    public Map<String, Object> cashflowSummary() { return cashflowSummary(null); }

    public Map<String, Object> cashflowSummary(Long hubId) {
        hubId = resolveScopedHubId(hubId);
        Map<String, Object> result = new LinkedHashMap<>();

        // 0. Danh sách các trạm kiểm toán
        List<Map<String, Object>> hubs = db.queryForList("select id, hub_code, hub_name from warehouse_hubs order by id asc");
        result.put("hubs", hubs);
        result.put("selectedHubId", hubId);

        String lineJoinHub = hubId != null
                ? " join gl_journal_entries e2 on e2.id = gl_journal_lines.entry_id join b2b_contracts c on c.id = e2.contract_id where (" + CONTRACT_HUB_ID_EXPR + ") = " + hubId + " and "
                : " where ";

        // 1. KPI Tài chính Dòng tiền
        Map<String, Object> kpi = new LinkedHashMap<>();
        BigDecimal bankBalance = db.queryForObject("select coalesce(sum(gl_journal_lines.debit-gl_journal_lines.credit),0) from gl_journal_lines" + lineJoinHub + "gl_journal_lines.account='112'", BigDecimal.class);
        BigDecimal escrowHeld = db.queryForObject("select coalesce(sum(gl_journal_lines.credit-gl_journal_lines.debit),0) from gl_journal_lines" + lineJoinHub + "gl_journal_lines.account='3388'", BigDecimal.class);
        BigDecimal honaRevenue = db.queryForObject("select coalesce(sum(gl_journal_lines.credit-gl_journal_lines.debit),0) from gl_journal_lines" + lineJoinHub + "gl_journal_lines.account='5113'", BigDecimal.class);
        BigDecimal vatPayable = db.queryForObject("select coalesce(sum(gl_journal_lines.credit-gl_journal_lines.debit),0) from gl_journal_lines" + lineJoinHub + "gl_journal_lines.account='3331'", BigDecimal.class);
        String payoutSql = hubId != null
                ? "select coalesce(sum(l.credit),0) from gl_journal_lines l join gl_journal_entries e on e.id = l.entry_id join b2b_contracts c on c.id = e.contract_id where l.account = '112' and e.event = 'SETTLEMENT' and (" + CONTRACT_HUB_ID_EXPR + ") = " + hubId
                : "select coalesce(sum(l.credit),0) from gl_journal_lines l join gl_journal_entries e on e.id = l.entry_id where l.account = '112' and e.event = 'SETTLEMENT'";
        BigDecimal farmerPayouts = db.queryForObject(payoutSql, BigDecimal.class);
        String gmvSql = hubId != null
                ? "select coalesce(sum(c.total_goods_amount),0) from b2b_contracts c where c.status not in ('RFQ_SENT','CANCELLED') and (" + CONTRACT_HUB_ID_EXPR + ") = " + hubId
                : "select coalesce(sum(c.total_goods_amount),0) from b2b_contracts c where c.status not in ('RFQ_SENT','CANCELLED')";
        BigDecimal gmv = db.queryForObject(gmvSql, BigDecimal.class);

        // 2. Bảng đối soát dòng tiền chi tiết theo hợp đồng
        String sql = """
            select c.id as contract_id, c.contract_code, c.status, c.fulfillment_status,
                   (%s) as hub_id,
                   (select wh2.hub_name from warehouse_hubs wh2 where wh2.id = (%s) limit 1) as hub_name,
                   coalesce(c.total_goods_amount, c.total_amount, 0) as total_goods_amount,
                   c.offered_weight_kg, c.unit_price, c.offered_price_per_kg,
                   c.deposit_30_amount, c.deposit_received, c.deposit_ref, c.deposit_paid_at,
                   c.balance_received, c.balance_ref, c.remaining_amount, c.remaining_payment_status, c.remaining_paid_at,
                   c.platform_fee_rate, c.platform_fee_amount, c.logistics_fee_amount, c.service_vat_rate,
                   c.payout_amount, c.farmer_payout_amount, c.payout_ref, c.settled_at, c.bank_transfer_ref,
                   COALESCE(NULLIF(c.farmer_bank_name, ''), NULLIF(fp.bank_name, ''), NULLIF(u_f.bank_name, ''), '') as farmer_bank_name,
                   COALESCE(NULLIF(c.farmer_bank_account, ''), NULLIF(fp.bank_account, ''), NULLIF(u_f.bank_account_no, ''), '') as farmer_bank_account,
                   COALESCE(NULLIF(c.farmer_bank_owner, ''), NULLIF(fp.bank_account_name, ''), NULLIF(u_f.full_name, ''), '') as farmer_bank_owner,
                   c.buyer_name, coalesce(u_b.company_name, c.buyer_name) as buyer_company, u_b.phone as buyer_phone,
                   coalesce(u_f.full_name, 'Nhà vườn') as farmer_name, coalesce(u_f.company_name, 'Hợp tác xã') as farmer_company, u_f.phone as farmer_phone,
                   coalesce(l.product_name, 'Nông sản VietGAP') as product_name
            from b2b_contracts c
            left join users u_b on u_b.id = c.buyer_id
            left join users u_f on u_f.id = c.farmer_id
            left join farmer_profiles fp on fp.user_id = c.farmer_id
            left join harvest_lots l on l.id = c.harvest_lot_id or l.id = c.lot_id
            where c.status not in ('RFQ_SENT', 'CANCELLED')
            %s
            order by c.id desc limit 200
            """.formatted(
                CONTRACT_HUB_ID_EXPR,
                CONTRACT_HUB_ID_EXPR,
                hubId != null ? "and (" + CONTRACT_HUB_ID_EXPR + ") = " + hubId : ""
            );
        List<Map<String, Object>> rows = db.queryForList(sql);
        List<Map<String, Object>> ledger = new ArrayList<>();
        BigDecimal pendingDisbursementAmount = BigDecimal.ZERO;

        for (Map<String, Object> r : rows) {
            Map<String, Object> item = new LinkedHashMap<>(r);
            BigDecimal goods = decimal(r, "total_goods_amount");
            BigDecimal logisticsFee = r.get("logistics_fee_amount") != null ? decimal(r, "logistics_fee_amount") : BigDecimal.ZERO;
            BigDecimal totalInvoice = goods.add(logisticsFee);
            BigDecimal deposit = r.get("deposit_received") != null && decimal(r, "deposit_received").signum() > 0
                    ? decimal(r, "deposit_received")
                    : (r.get("deposit_30_amount") != null ? decimal(r, "deposit_30_amount") : money(totalInvoice.multiply(new BigDecimal("0.3"))));
            BigDecimal balance = r.get("balance_received") != null ? decimal(r, "balance_received") : BigDecimal.ZERO;
            String status = Objects.toString(r.get("status"), "");
            String remainingStatus = Objects.toString(r.get("remaining_payment_status"), "UNPAID");

            BigDecimal feeRate = r.get("platform_fee_rate") != null ? decimal(r, "platform_fee_rate") : new BigDecimal("2.5");
            BigDecimal platformFee = r.get("platform_fee_amount") != null && decimal(r, "platform_fee_amount").signum() > 0
                    ? decimal(r, "platform_fee_amount")
                    : money(goods.multiply(feeRate).divide(new BigDecimal("100"), 2, RoundingMode.HALF_UP));
            BigDecimal vatRate = r.get("service_vat_rate") != null && decimal(r, "service_vat_rate").signum() > 0
                    ? decimal(r, "service_vat_rate")
                    : new BigDecimal("8.0");
            BigDecimal honaRealPocket = platformFee.add(logisticsFee);
            BigDecimal vatFee = money(honaRealPocket.multiply(vatRate).divide(new BigDecimal("100"), 2, RoundingMode.HALF_UP));
            BigDecimal payout = "SETTLED".equals(status) && r.get("farmer_payout_amount") != null && decimal(r, "farmer_payout_amount").signum() > 0
                    ? decimal(r, "farmer_payout_amount")
                    : goods.subtract(platformFee).subtract(vatFee);

            String cashflowStatus;
            String cashflowStatusLabel;
            BigDecimal buyerPaid;
            if ("SETTLED".equals(status)) {
                cashflowStatus = "SETTLED_COMPLETED";
                cashflowStatusLabel = "Đã giải ngân hoàn tất cho Nông dân";
                buyerPaid = deposit.add(balance.signum() > 0 ? balance : totalInvoice.subtract(deposit));
            } else if ("DELIVERED".equals(status) && "PAID".equalsIgnoreCase(remainingStatus)) {
                cashflowStatus = "BUYER_PAID_100";
                cashflowStatusLabel = "Buyer đã trả đủ 100% · Chờ giải ngân Nông dân";
                buyerPaid = deposit.add(balance.signum() > 0 ? balance : totalInvoice.subtract(deposit));
                pendingDisbursementAmount = pendingDisbursementAmount.add(payout.max(BigDecimal.ZERO));
            } else if ("DELIVERED".equals(status)) {
                cashflowStatus = "WAITING_BUYER_70";
                cashflowStatusLabel = "Đã giao hàng · Chờ Buyer trả nốt 70%";
                buyerPaid = deposit;
            } else {
                cashflowStatus = "ESCROW_HOLDING_30";
                cashflowStatusLabel = "Đang giữ cọc 30% bảo chứng";
                buyerPaid = deposit;
            }

            item.put("totalGoodsAmount", goods);
            item.put("totalInvoiceAmount", totalInvoice);
            item.put("depositAmount", deposit);
            item.put("balanceAmount", balance);
            item.put("totalBuyerPaid", buyerPaid);
            item.put("platformFeeAmount", platformFee);
            item.put("logisticsFeeAmount", logisticsFee);
            item.put("serviceVatAmount", vatFee);
            item.put("honaRealPocket", honaRealPocket);
            item.put("farmerPayoutAmount", payout);
            item.put("cashflowStatus", cashflowStatus);
            item.put("cashflowStatusLabel", cashflowStatusLabel);

            ledger.add(item);
        }

        kpi.put("totalBankBalance", bankBalance != null ? bankBalance : BigDecimal.ZERO);
        kpi.put("totalHonaRevenue", honaRevenue != null ? honaRevenue : BigDecimal.ZERO);
        kpi.put("totalEscrowHeld", escrowHeld != null ? escrowHeld : BigDecimal.ZERO);
        kpi.put("totalVatPayable", vatPayable != null ? vatPayable : BigDecimal.ZERO);
        kpi.put("totalFarmerPayouts", farmerPayouts != null ? farmerPayouts : BigDecimal.ZERO);
        kpi.put("pendingDisbursementAmount", pendingDisbursementAmount);
        kpi.put("totalGmv", gmv != null ? gmv : BigDecimal.ZERO);
        result.put("kpi", kpi);
        result.put("contractLedger", ledger);

        // 3. Biến động dòng tiền theo ngày
        String dailySql = hubId != null
                ? """
                    select date(e.created_at) as day,
                           coalesce(sum(case when l.account = '112' and l.debit > 0 then l.debit else 0 end), 0) as incoming,
                           coalesce(sum(case when l.account = '112' and l.credit > 0 then l.credit else 0 end), 0) as outgoing
                    from gl_journal_entries e
                    join gl_journal_lines l on l.entry_id = e.id
                    join b2b_contracts c on c.id = e.contract_id
                    where l.account = '112' and (%s) = %d
                    group by date(e.created_at)
                    order by day desc
                    limit 30
                    """.formatted(CONTRACT_HUB_ID_EXPR, hubId)
                : """
                    select date(e.created_at) as day,
                           coalesce(sum(case when l.account = '112' and l.debit > 0 then l.debit else 0 end), 0) as incoming,
                           coalesce(sum(case when l.account = '112' and l.credit > 0 then l.credit else 0 end), 0) as outgoing
                    from gl_journal_entries e
                    join gl_journal_lines l on l.entry_id = e.id
                    where l.account = '112'
                    group by date(e.created_at)
                    order by day desc
                    limit 30
                    """;
        result.put("dailyCashflow", db.queryForList(dailySql));

        return result;
    }
    public Map<String,Object> settlementQuote(long id) {
        var c = db.queryForMap("select * from b2b_contracts where id=?", id);
        BigDecimal goods = deliveredGoods(c);
        BigDecimal feeRate = c.get("platform_fee_rate") != null ? decimal(c, "platform_fee_rate") : new BigDecimal("2.5");
        BigDecimal logisticsFee = c.get("logistics_fee_amount") != null ? decimal(c, "logistics_fee_amount") : BigDecimal.ZERO;
        BigDecimal totalInvoice = goods.add(logisticsFee);
        BigDecimal commissionFee = money(goods.multiply(feeRate).divide(new BigDecimal("100"), 2, RoundingMode.HALF_UP));
        BigDecimal honaRevenue = commissionFee.add(logisticsFee);
        BigDecimal vatRate = c.get("service_vat_rate") != null && decimal(c, "service_vat_rate").signum() > 0
                ? decimal(c, "service_vat_rate")
                : new BigDecimal("8.0");
        BigDecimal vat = money(honaRevenue.multiply(vatRate).divide(new BigDecimal("100"), 2, RoundingMode.HALF_UP));

        BigDecimal deposit = c.get("deposit_received") != null && decimal(c, "deposit_received").signum() > 0
                ? decimal(c, "deposit_received")
                : (c.get("deposit_30_amount") != null && decimal(c, "deposit_30_amount").signum() > 0
                ? decimal(c, "deposit_30_amount")
                : (c.get("deposit_amount") != null && decimal(c, "deposit_amount").signum() > 0
                ? decimal(c, "deposit_amount")
                : money(totalInvoice.multiply(new BigDecimal("0.3")))));
        BigDecimal balanceDue = totalInvoice.subtract(deposit);
        if (balanceDue.signum() < 0) balanceDue = BigDecimal.ZERO;

        BigDecimal payout = goods.subtract(commissionFee).subtract(vat);
        if (payout.signum() < 0) payout = BigDecimal.ZERO;

        var bankRows = db.queryForList("""
                SELECT COALESCE(NULLIF(c.farmer_bank_name, ''), NULLIF(fp.bank_name, ''), NULLIF(u.bank_name, ''), '') AS bank_name,
                       COALESCE(NULLIF(c.farmer_bank_account, ''), NULLIF(fp.bank_account, ''), NULLIF(u.bank_account_no, ''), '') AS bank_account,
                       COALESCE(NULLIF(c.farmer_bank_owner, ''), NULLIF(fp.bank_account_name, ''), NULLIF(u.full_name, ''), '') AS bank_owner
                FROM b2b_contracts c
                LEFT JOIN users u ON u.id = c.farmer_id
                LEFT JOIN farmer_profiles fp ON fp.user_id = c.farmer_id
                WHERE c.id = ?
                """, id);
        String farmerBankName = bankRows.isEmpty() ? "" : Objects.toString(bankRows.getFirst().get("bank_name"), "");
        String farmerBankAccount = bankRows.isEmpty() ? "" : Objects.toString(bankRows.getFirst().get("bank_account"), "");
        String farmerBankOwner = bankRows.isEmpty() ? "" : Objects.toString(bankRows.getFirst().get("bank_owner"), "");

        Map<String, Object> map = new LinkedHashMap<>();
        map.put("goods", goods);
        map.put("logisticsFee", logisticsFee);
        map.put("totalInvoice", totalInvoice);
        map.put("balanceDue", balanceDue);
        map.put("feeRate", feeRate);
        map.put("serviceFee", commissionFee);
        map.put("honaRevenue", honaRevenue);
        map.put("vatRate", vatRate);
        map.put("vat", vat);
        map.put("payout", payout);
        map.put("farmerBankName", farmerBankName);
        map.put("farmerBankAccount", farmerBankAccount);
        map.put("farmerBankOwner", farmerBankOwner);
        return map;
    }
    private BigDecimal held(Map<String,Object> contract) { return db.queryForObject("select coalesce(sum(l.credit-l.debit),0) from gl_journal_lines l join gl_journal_entries e on e.id=l.entry_id where e.contract_id=? and l.account='3388'",BigDecimal.class,contract.get("id")); }
    private void journal(long contract,String event,String reference,List<Map<String,Object>> lines) {
        BigDecimal debit=BigDecimal.ZERO,credit=BigDecimal.ZERO;for(var l:lines){debit=debit.add(decimal(l,"debit"));credit=credit.add(decimal(l,"credit"));}if(debit.compareTo(credit)!=0||debit.signum()<=0)bad("Bút toán không cân bằng");
        long entry=db.queryForObject("insert into gl_journal_entries(contract_id,event,reference) values (?,?,?) returning id",Long.class,contract,event,reference);
        for(var l:lines) db.update("insert into gl_journal_lines(entry_id,account,debit,credit) values (?,?,?,?)",entry,l.get("account"),l.get("debit"),l.get("credit"));
    }
    private static Map<String,Object> line(String account,BigDecimal amount,boolean debit) { return Map.of("account",account,"debit",debit?amount:BigDecimal.ZERO,"credit",debit?BigDecimal.ZERO:amount); }
    private Map<String,Object> lock(String table,long id) { var rows=db.queryForList("select * from "+table+" where id=? for update",id);if(rows.isEmpty())throw new AuthException(404,"NOT_FOUND","Không tìm thấy dữ liệu");return rows.getFirst(); }
    private void requireRole(Long id,String role){var u=users.findById(id).orElseThrow(()->new AuthException(400,"USER_REQUIRED","Không tìm thấy nhân sự"));if(!AuthService.has(u,role)||!u.isEnabled()||!u.isEmailVerified())bad("Nhân sự chưa kích hoạt hoặc sai vai trò");}
    private void audit(String action, Long id) {
        Long actorId = 1L;
        try {
            if (AuthService.current() != null) {
                actorId = AuthService.current().getId();
            }
        } catch (Exception ignored) {}
        db.update("insert into business_audit(actor_id,action,entity_id) values (?,?,?)", actorId, action, id);
    }
    public static BigDecimal resolveSafeWeight(Map<String, Object> c) {
        if (c.get("offered_weight_kg") != null && decimal(c, "offered_weight_kg").compareTo(BigDecimal.ZERO) > 0) {
            return decimal(c, "offered_weight_kg");
        }
        if (c.get("actual_harvest_weight_kg") != null && decimal(c, "actual_harvest_weight_kg").compareTo(BigDecimal.ZERO) > 0) {
            return decimal(c, "actual_harvest_weight_kg");
        }
        if (c.get("inbound_net_weight_kg") != null && decimal(c, "inbound_net_weight_kg").compareTo(BigDecimal.ZERO) > 0) {
            return decimal(c, "inbound_net_weight_kg");
        }
        if (c.get("quantity_kg") != null && decimal(c, "quantity_kg").compareTo(BigDecimal.ZERO) > 0) {
            return decimal(c, "quantity_kg");
        }
        if (c.get("quantity") != null && decimal(c, "quantity").compareTo(BigDecimal.ZERO) > 0) {
            return decimal(c, "quantity");
        }
        return new BigDecimal("100.00");
    }
    private static String code(String prefix){return prefix+"-"+UUID.randomUUID().toString().substring(0,12).toUpperCase(Locale.ROOT);}
    public static BigDecimal decimal(Map<String,Object> m,String key){return new BigDecimal(Objects.toString(m.get(key),"0"));}
    public static Long asLong(Map<String,Object> m,String key){return m.get(key)==null?null:((Number)m.get(key)).longValue();}
    private static BigDecimal money(BigDecimal n){return n.setScale(2,RoundingMode.HALF_UP);}
    public static String text(JsonNode n,String key){String s=n.path(key).asText("").trim();if(s.isBlank()||s.length()>2000)bad("Thiếu hoặc quá dài: "+key);return s;}
    public static BigDecimal number(JsonNode n,String key,BigDecimal min,BigDecimal max){BigDecimal v;try{v=new BigDecimal(n.path(key).asText());}catch(NumberFormatException e){throw new AuthException(400,"INVALID_NUMBER","Số không hợp lệ: "+key);}if(v.scale()>2||v.compareTo(min)<0||v.compareTo(max)>0)bad(key+" phải từ "+min+" đến "+max+", tối đa 2 số lẻ");return v;}
    private static void bad(String message){throw new AuthException(400,"INVALID_OPERATION",message);}
}
