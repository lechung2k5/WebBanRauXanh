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
    public List<Map<String,Object>> contracts() { return db.queryForList("select c.*, l.product_name, l.lot_code, u.company_name buyer_name, u.company_name buyer_company, u.phone buyer_phone, u.warehouse_address buyer_warehouse, case when u.username='buyer_coop' then 'Nguyễn Thị Minh Hạnh' when u.username='buyer_winmart' then 'Phạm Hoàng Nam' when u.username='buyer_lotte' then 'Lê Trọng Đạt' else u.full_name end buyer_contact, f.company_name farmer_name, f.company_name farmer_company, f.phone farmer_phone, f.full_name farmer_contact from b2b_contracts c join harvest_lots l on l.id=coalesce(c.lot_id, c.harvest_lot_id) join users u on u.id=c.buyer_id left join users f on f.id=c.farmer_id order by c.id desc limit 500"); }
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
        long id=db.queryForObject("""
            insert into b2b_contracts(
                contract_code, lot_id, harvest_lot_id, farmer_id, buyer_id, buyer_name, buyer_phone,
                quantity, quantity_kg, offered_weight_kg,
                unit_price, agreed_price_per_kg, offered_price_per_kg,
                total_amount, total_goods_amount, deposit_amount, deposit_30_amount,
                platform_fee_rate, platform_fee_amount, logistics_fee_amount, service_vat_rate,
                delivery_address, status, deposit_status, fulfillment_status,
                created_at, updated_at
            ) values (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,'RFQ_SENT','PENDING_DEPOSIT','WAITING_HARVEST',NOW(),NOW()) returning id
            """, Long.class,
            code("HD"), lot.get("id"), lot.get("id"), lot.get("farmer_id"), buyerId, buyer.getFullName(), buyer.getPhone(),
            weight.doubleValue(), weight, weight,
            price, price, price,
            total, total, deposit, deposit,
            cfg.get("platform_fee_rate"), fee, number(n,"logisticsFee",BigDecimal.ZERO,total), cfg.get("service_vat_rate"),
            text(n,"deliveryAddress"));
        audit("CREATE_RFQ",id);return id;
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
            db.update("update harvest_lots set available_weight_kg=available_weight_kg-? where id=?",weight,lot.get("id"));
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
            BigDecimal due=money(deliveredGoods(c).subtract(decimal(c,"deposit_received")));
            if(due.signum()>0) {
                String ref=n.has("reference") ? text(n,"reference") : "BAL-" + UUID.randomUUID().toString().substring(0,8).toUpperCase();
                journal(id,"BALANCE",ref,List.of(line("112",due,true),line("3388",due,false)));
                db.update("update b2b_contracts set balance_ref=?,balance_received=? where id=?",ref,due,id);
            }
            db.update("update b2b_contracts set fulfillment_status='DELIVERED',remaining_payment_status='PAID' where id=?", id);
        } else if(next.equals("SETTLED")) {
            if(db.queryForObject("select count(*) from spoilage_claims where contract_id=? and status='OPEN'",Integer.class,id)>0) bad("Còn tranh chấp chưa xử lý");
            BigDecimal held=held(c);
            BigDecimal fee=money(deliveredGoods(c).multiply(decimal(c,"platform_fee_rate")).divide(new BigDecimal("100"))).add(decimal(c,"logistics_fee_amount"));
            BigDecimal vat=money(fee.multiply(decimal(c,"service_vat_rate")).divide(new BigDecimal("100"))), payout=money(held.subtract(fee).subtract(vat));
            if(payout.signum()<0) bad("Phí vượt số tiền có thể giải ngân");
            String ref=n.has("reference") ? text(n,"reference") : "PAY-" + UUID.randomUUID().toString().substring(0,8).toUpperCase();
            var lines=new ArrayList<Map<String,Object>>();lines.add(line("3388",held,true));if(fee.signum()>0)lines.add(line("5113",fee,false));if(vat.signum()>0)lines.add(line("3331",vat,false));if(payout.signum()>0)lines.add(line("112",payout,false));
            journal(id,"SETTLEMENT",ref,lines);
            String bankRef = n.path("bankTransferRef").asText(ref);
            String bankName = n.path("farmerBankName").asText("");
            String bankAcc = n.path("farmerBankAccount").asText("");
            String bankOwner = n.path("farmerBankOwner").asText("");
            db.update("update b2b_contracts set payout_ref=?,payout_amount=?,farmer_payout_amount=?,settled_at=CURRENT_TIMESTAMP,fulfillment_status='SETTLED',bank_transfer_ref=?,farmer_bank_name=COALESCE(NULLIF(?,''),farmer_bank_name),farmer_bank_account=COALESCE(NULLIF(?,''),farmer_bank_account),farmer_bank_owner=COALESCE(NULLIF(?,''),farmer_bank_owner) where id=?",
                    ref, payout, payout, bankRef, bankName, bankAcc, bankOwner, id);
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
        for (String column : List.of("buyer_id", "farmer_id")) {
            try {
                Long partyId = asLong(contract, column);
                if (partyId == null) continue;
                String email = db.queryForObject("select email from users where id=?", String.class, partyId);
                if (email != null && !email.isBlank()) mail.send(email, subject, body);
            } catch (Exception ex) {
                // SMTP là kênh thông báo phụ; không rollback giao dịch nếu mail server lỗi/chưa cấu hình.
                log.warn("Không gửi được email trạng thái hợp đồng {}: {}", contractCode, ex.getMessage());
            }
        }
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
        db.update("update b2b_contracts set packaging_approved=true,packaging_approved_at=CURRENT_TIMESTAMP,fulfillment_status='PACKAGING_APPROVED',status='PACKAGING_APPROVED',updated_at=CURRENT_TIMESTAMP where id=?", id);
        audit("APPROVE_PACKAGING", id);
        var updated = db.queryForMap("select * from b2b_contracts where id=?", id);
        notifyContractParties(updated, "PACKAGING_APPROVED");
        b2bRealtimeService.notifyContractUpdated("PACKAGING_APPROVED", Objects.toString(updated.get("contract_code"), ""), updated);
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
                hub_inbound_at=CURRENT_TIMESTAMP, qc_status='QC_PASSED', qc_passed_at=CURRENT_TIMESTAMP,
                qc_cert_url=?, inbound_gross_weight_kg=?, inbound_tare_weight_kg=?, inbound_net_weight_kg=?,
                qc_brix=?, qc_nitrate_ppm=?, qc_pesticide_safe=?,
                fulfillment_status='AT_HUB_QC', status='AT_HUB_QC', updated_at=CURRENT_TIMESTAMP
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
        notifyContractParties(updated, "AT_HUB_QC");
        b2bRealtimeService.notifyContractUpdated("AT_HUB_QC", Objects.toString(updated.get("contract_code"), ""), updated);
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
        BigDecimal min=number(n,"tempMin",new BigDecimal("-40"),new BigDecimal("50")),max=number(n,"tempMax",new BigDecimal("-40"),new BigDecimal("50"));if(max.compareTo(min)<=0)bad("Khoảng nhiệt độ không hợp lệ");
        BigDecimal vat=number(n,"serviceVatRate",new BigDecimal("8"),new BigDecimal("10"));if(!Set.of(8,10).contains(vat.intValue())||vat.stripTrailingZeros().scale()>0)bad("Thuế dịch vụ là 8 hoặc 10");
        db.update("update platform_settings set platform_fee_rate=?,deposit_rate=?,temp_min=?,temp_max=?,service_vat_rate=? where id=1",number(n,"platformFeeRate",BigDecimal.ONE,new BigDecimal("5")),number(n,"depositRate",BigDecimal.ONE,new BigDecimal("100")),min,max,vat);audit("SETTINGS",1L);
    }
    public Map<String,Object> reports() { return Map.of("entries",db.queryForList("select e.*,c.contract_code from gl_journal_entries e join b2b_contracts c on c.id=e.contract_id order by e.id desc limit 500"),"lines",db.queryForList("select * from gl_journal_lines order by id desc limit 2000"),"documents",db.queryForList("select c.contract_code,c.status,c.total_goods_amount,c.payout_amount,c.platform_fee_amount,c.logistics_fee_amount,u.full_name,u.company_name,u.tax_code,u.household_farmer,case when u.household_farmer then '01/TNDN - bản kê nội bộ' else 'KCT - bản kê nội bộ' end document_type from b2b_contracts c join users u on u.id=c.farmer_id where c.status='SETTLED' order by c.id desc")); }

    public Map<String, Object> cashflowSummary() {
        Map<String, Object> result = new LinkedHashMap<>();

        // 1. KPI Tài chính Dòng tiền
        Map<String, Object> kpi = new LinkedHashMap<>();
        BigDecimal bankBalance = db.queryForObject("select coalesce(sum(debit-credit),0) from gl_journal_lines where account='112'", BigDecimal.class);
        BigDecimal escrowHeld = db.queryForObject("select coalesce(sum(credit-debit),0) from gl_journal_lines where account='3388'", BigDecimal.class);
        BigDecimal honaRevenue = db.queryForObject("select coalesce(sum(credit-debit),0) from gl_journal_lines where account='5113'", BigDecimal.class);
        BigDecimal vatPayable = db.queryForObject("select coalesce(sum(credit-debit),0) from gl_journal_lines where account='3331'", BigDecimal.class);
        BigDecimal farmerPayouts = db.queryForObject("""
            select coalesce(sum(l.credit),0) 
            from gl_journal_lines l 
            join gl_journal_entries e on e.id = l.entry_id 
            where l.account = '112' and e.event = 'SETTLEMENT'
            """, BigDecimal.class);
        BigDecimal gmv = db.queryForObject("select coalesce(sum(total_goods_amount),0) from b2b_contracts where status not in ('RFQ_SENT','CANCELLED')", BigDecimal.class);

        kpi.put("totalBankBalance", bankBalance != null ? bankBalance : BigDecimal.ZERO);
        kpi.put("totalHonaRevenue", honaRevenue != null ? honaRevenue : BigDecimal.ZERO);
        kpi.put("totalEscrowHeld", escrowHeld != null ? escrowHeld : BigDecimal.ZERO);
        kpi.put("totalVatPayable", vatPayable != null ? vatPayable : BigDecimal.ZERO);
        kpi.put("totalFarmerPayouts", farmerPayouts != null ? farmerPayouts : BigDecimal.ZERO);
        kpi.put("totalGmv", gmv != null ? gmv : BigDecimal.ZERO);
        result.put("kpi", kpi);

        // 2. Bảng đối soát dòng tiền chi tiết theo hợp đồng
        String sql = """
            select c.id as contract_id, c.contract_code, c.status, c.fulfillment_status,
                   coalesce(c.total_goods_amount, c.total_amount, 0) as total_goods_amount,
                   c.offered_weight_kg, c.unit_price, c.offered_price_per_kg,
                   c.deposit_30_amount, c.deposit_received, c.deposit_ref, c.deposit_paid_at,
                   c.balance_received, c.balance_ref, c.remaining_amount, c.remaining_payment_status, c.remaining_paid_at,
                   c.platform_fee_rate, c.platform_fee_amount, c.logistics_fee_amount, c.service_vat_rate,
                   c.payout_amount, c.farmer_payout_amount, c.payout_ref, c.settled_at, c.bank_transfer_ref,
                   c.farmer_bank_name, c.farmer_bank_account, c.farmer_bank_owner,
                   c.buyer_name, coalesce(u_b.company_name, c.buyer_name) as buyer_company, u_b.phone as buyer_phone,
                   coalesce(u_f.full_name, 'Nhà vườn') as farmer_name, coalesce(u_f.company_name, 'Hợp tác xã') as farmer_company, u_f.phone as farmer_phone,
                   coalesce(l.product_name, 'Nông sản VietGAP') as product_name
            from b2b_contracts c
            left join users u_b on u_b.id = c.buyer_id
            left join users u_f on u_f.id = c.farmer_id
            left join harvest_lots l on l.id = c.harvest_lot_id or l.id = c.lot_id
            where c.status not in ('RFQ_SENT', 'CANCELLED')
            order by c.id desc limit 200
            """;
        List<Map<String, Object>> rows = db.queryForList(sql);
        List<Map<String, Object>> ledger = new ArrayList<>();

        for (Map<String, Object> r : rows) {
            Map<String, Object> item = new LinkedHashMap<>(r);
            BigDecimal goods = decimal(r, "total_goods_amount");
            BigDecimal deposit = r.get("deposit_received") != null ? decimal(r, "deposit_received")
                    : (r.get("deposit_30_amount") != null ? decimal(r, "deposit_30_amount") : goods.multiply(new BigDecimal("0.3")));
            BigDecimal balance = r.get("balance_received") != null ? decimal(r, "balance_received") : BigDecimal.ZERO;
            String status = Objects.toString(r.get("status"), "");

            BigDecimal buyerPaid;
            if ("SETTLED".equals(status) || "DELIVERED".equals(status)) {
                buyerPaid = deposit.add(balance.signum() > 0 ? balance : goods.subtract(deposit));
            } else {
                buyerPaid = deposit;
            }

            BigDecimal feeRate = r.get("platform_fee_rate") != null ? decimal(r, "platform_fee_rate") : new BigDecimal("2.5");
            BigDecimal platformFee = r.get("platform_fee_amount") != null && decimal(r, "platform_fee_amount").signum() > 0
                    ? decimal(r, "platform_fee_amount")
                    : money(goods.multiply(feeRate).divide(new BigDecimal("100"), 2, RoundingMode.HALF_UP));
            BigDecimal logisticsFee = r.get("logistics_fee_amount") != null ? decimal(r, "logistics_fee_amount") : BigDecimal.ZERO;
            BigDecimal vatRate = r.get("service_vat_rate") != null ? decimal(r, "service_vat_rate") : new BigDecimal("8.0");
            BigDecimal vatFee = money(platformFee.add(logisticsFee).multiply(vatRate).divide(new BigDecimal("100"), 2, RoundingMode.HALF_UP));

            BigDecimal honaRealPocket = platformFee.add(logisticsFee);
            BigDecimal payout = r.get("farmer_payout_amount") != null && decimal(r, "farmer_payout_amount").signum() > 0
                    ? decimal(r, "farmer_payout_amount")
                    : goods.subtract(platformFee).subtract(logisticsFee).subtract(vatFee);

            String cashflowStatus;
            if ("SETTLED".equals(status)) {
                cashflowStatus = "SETTLED_COMPLETED";
            } else if ("DELIVERED".equals(status)) {
                cashflowStatus = "BUYER_PAID_100";
            } else {
                cashflowStatus = "ESCROW_HOLDING_30";
            }

            item.put("totalGoodsAmount", goods);
            item.put("depositAmount", deposit);
            item.put("balanceAmount", balance);
            item.put("totalBuyerPaid", buyerPaid);
            item.put("platformFeeAmount", platformFee);
            item.put("logisticsFeeAmount", logisticsFee);
            item.put("serviceVatAmount", vatFee);
            item.put("honaRealPocket", honaRealPocket);
            item.put("farmerPayoutAmount", payout);
            item.put("cashflowStatus", cashflowStatus);

            ledger.add(item);
        }
        result.put("contractLedger", ledger);

        // 3. Biến động dòng tiền theo ngày
        List<Map<String, Object>> daily = db.queryForList("""
            select date(e.created_at) as day,
                   coalesce(sum(case when l.account = '112' and l.debit > 0 then l.debit else 0 end), 0) as incoming,
                   coalesce(sum(case when l.account = '112' and l.credit > 0 then l.credit else 0 end), 0) as outgoing
            from gl_journal_entries e
            join gl_journal_lines l on l.entry_id = e.id
            where l.account = '112'
            group by date(e.created_at)
            order by day desc
            limit 30
            """);
        result.put("dailyCashflow", daily);

        return result;
    }
    public Map<String,Object> settlementQuote(long id) {
        var c = db.queryForMap("select * from b2b_contracts where id=?", id);
        BigDecimal goods = deliveredGoods(c);
        BigDecimal feeRate = c.get("platform_fee_rate") != null ? decimal(c, "platform_fee_rate") : new BigDecimal("2.5");
        BigDecimal logisticsFee = c.get("logistics_fee_amount") != null ? decimal(c, "logistics_fee_amount") : BigDecimal.ZERO;
        BigDecimal fee = money(goods.multiply(feeRate).divide(new BigDecimal("100"), 2, RoundingMode.HALF_UP)).add(logisticsFee);
        BigDecimal vatRate = c.get("service_vat_rate") != null ? decimal(c, "service_vat_rate") : new BigDecimal("8.0");
        BigDecimal vat = money(fee.multiply(vatRate).divide(new BigDecimal("100"), 2, RoundingMode.HALF_UP));

        BigDecimal deposit = c.get("deposit_received") != null ? decimal(c, "deposit_received")
                : (c.get("deposit_30_amount") != null ? decimal(c, "deposit_30_amount")
                : (c.get("deposit_amount") != null ? decimal(c, "deposit_amount")
                : goods.multiply(new BigDecimal("0.3"))));
        BigDecimal balanceDue = goods.subtract(deposit);
        if (balanceDue.signum() < 0) balanceDue = BigDecimal.ZERO;

        BigDecimal heldFunds = held(c);
        if (heldFunds == null) heldFunds = BigDecimal.ZERO;
        BigDecimal payout = goods.subtract(fee).subtract(vat);
        if (payout.signum() < 0) payout = BigDecimal.ZERO;

        Map<String, Object> map = new LinkedHashMap<>();
        map.put("goods", goods);
        map.put("balanceDue", balanceDue);
        map.put("serviceFee", fee);
        map.put("vat", vat);
        map.put("payout", payout);
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
