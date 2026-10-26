package com.btl.webbanrau.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.btl.webbanrau.model.User;
import com.btl.webbanrau.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.math.*;
import java.time.LocalDate;
import java.util.*;

/** All financial transitions lock the contract row and create balanced journal lines. */
@Service @RequiredArgsConstructor
public class AdminBusinessService {
    private final JdbcTemplate db;
    private final UserRepository users;
    public List<Map<String,Object>> lots(boolean publicOnly) {
        var rows=db.queryForList("select l.*,u.company_name farmer_name from harvest_lots l join users u on u.id=l.farmer_id "+(publicOnly?"where l.status='OPEN' and l.expiry_date>=CURRENT_DATE ":"")+"order by l.id desc limit 500");
        rows.forEach(row->row.put("tier_pricing_json",Objects.toString(row.get("tier_pricing_json"),"[]")));
        return rows;
    }
    public List<Map<String,Object>> contracts() { return db.queryForList("select c.*,l.product_name,u.company_name buyer_name from b2b_contracts c join harvest_lots l on l.id=c.lot_id join users u on u.id=c.buyer_id order by c.id desc limit 500"); }
    public List<Map<String,Object>> assets() { return db.queryForList("select a.*,coalesce((select sum(i.qualified_weight_kg) from hub_inspections i join b2b_contracts c on c.id=i.contract_id where i.cold_room_id=a.id and c.status='AT_HUB_QC'),0) occupied_kg from cold_assets a order by a.id"); }
    public List<Map<String,Object>> inspections() { return db.queryForList("select i.*,c.status contract_status,l.product_name,l.expiry_date,(l.expiry_date-CURRENT_DATE) fefo_priority_score,c.contract_code from hub_inspections i join b2b_contracts c on c.id=i.contract_id join harvest_lots l on l.id=c.lot_id order by l.expiry_date,i.id"); }
    public List<Map<String,Object>> shipments() { return db.queryForList("select s.*,c.contract_code,c.delivery_address,l.product_name,a.asset_code,a.current_temp,a.current_humidity from shipments s join b2b_contracts c on c.id=s.contract_id join harvest_lots l on l.id=c.lot_id join cold_assets a on a.id=s.truck_id order by s.id desc limit 500"); }
    public List<Map<String,Object>> claims() { return db.queryForList("select * from spoilage_claims order by id desc limit 500"); }
    public Map<String,Object> settings() { return db.queryForMap("select * from platform_settings where id=1"); }
    public Map<String,Object> stats() {
        Map<String,Object> result=new LinkedHashMap<>();
        result.put("users",db.queryForObject("select count(*) from users",Long.class));
        result.put("pendingKyc",db.queryForObject("select count(*) from users where kyc_status='PENDING'",Long.class));
        result.put("lots",db.queryForObject("select count(*) from harvest_lots",Long.class));
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
        User buyer=users.findById(buyerId).orElseThrow();if(!AuthService.has(buyer,"BUYER")) bad("Chọn tài khoản BUYER");AuthService.approvedPartner(buyer);
        var lot=lock("harvest_lots",n.path("lotId").asLong());
        if(!"OPEN".equals(lot.get("status"))||LocalDate.parse(lot.get("expiry_date").toString()).isBefore(LocalDate.now())) bad("Lô chưa mở bán hoặc đã hết hạn");
        if(asLong(lot,"farmer_id").equals(buyerId)) bad("Không tự giao dịch với chính mình");
        BigDecimal weight=number(n,"weightKg",new BigDecimal("100"),decimal(lot,"available_weight_kg")), price=number(n,"pricePerKg",BigDecimal.ONE,new BigDecimal("1000000000"));
        var cfg=settings();BigDecimal total=money(weight.multiply(price)), deposit=money(total.multiply(decimal(cfg,"deposit_rate")).divide(new BigDecimal("100"))), fee=money(total.multiply(decimal(cfg,"platform_fee_rate")).divide(new BigDecimal("100")));
        long id=db.queryForObject("insert into b2b_contracts(contract_code,lot_id,farmer_id,buyer_id,offered_weight_kg,offered_price_per_kg,total_goods_amount,deposit_30_amount,platform_fee_rate,platform_fee_amount,logistics_fee_amount,service_vat_rate,delivery_address) values (?,?,?,?,?,?,?,?,?,?,?,?,?) returning id",Long.class,
            code("HD"),lot.get("id"),lot.get("farmer_id"),buyerId,weight,price,total,deposit,cfg.get("platform_fee_rate"),fee,number(n,"logisticsFee",BigDecimal.ZERO,total),cfg.get("service_vat_rate"),text(n,"deliveryAddress"));
        audit("CREATE_RFQ",id);return id;
    }
    @Transactional public void transition(long id,JsonNode n) {
        var c=lock("b2b_contracts",id);String current=c.get("status").toString(), next=text(n,"status");
        Map<String,String> allowed=Map.of("RFQ_SENT","AGREED","AGREED","DEPOSIT_PAID","DEPOSIT_PAID","AT_HUB_QC","AT_HUB_QC","IN_TRANSIT","IN_TRANSIT","DELIVERED","DELIVERED","SETTLED");
        if(!next.equals(allowed.get(current))) bad("Chuyển trạng thái không hợp lệ: "+current+" → "+next);
        if(next.equals("AGREED")) {
            var lot=lock("harvest_lots",asLong(c,"lot_id"));BigDecimal weight=decimal(c,"offered_weight_kg");
            if(!"OPEN".equals(lot.get("status"))||decimal(lot,"available_weight_kg").compareTo(weight)<0||LocalDate.parse(lot.get("expiry_date").toString()).isBefore(LocalDate.now())) bad("Lô không đủ sản lượng hoặc không còn mở bán");
            db.update("update harvest_lots set available_weight_kg=available_weight_kg-? where id=?",weight,lot.get("id"));
        } else if(next.equals("DEPOSIT_PAID")) {
            String ref=text(n,"reference");BigDecimal amount=number(n,"amount",decimal(c,"deposit_30_amount"),decimal(c,"deposit_30_amount"));
            journal(id,"DEPOSIT",ref,List.of(line("112",amount,true),line("3388",amount,false)));
            db.update("update b2b_contracts set deposit_ref=?,deposit_received=? where id=?",ref,amount,id);
        } else if(next.equals("AT_HUB_QC")) { if(db.queryForObject("select count(*) from hub_inspections where contract_id=?",Integer.class,id)==0) bad("Cần lập kiểm định QC trước"); }
        else if(next.equals("IN_TRANSIT")) {
            var shipment=db.queryForList("select * from shipments where contract_id=?",id);if(shipment.isEmpty()) bad("Cần phân chuyến xe trước");
            db.update("update shipments set status='IN_TRANSIT',departed_at=CURRENT_TIMESTAMP where contract_id=?",id);
        } else if(next.equals("DELIVERED")) {
            if(db.queryForObject("select count(*) from shipments where contract_id=? and status='DELIVERED'",Integer.class,id)==0) bad("Cần ký nhận ePOD trước");
            BigDecimal due=money(deliveredGoods(c).subtract(decimal(c,"deposit_received")));
            if(due.signum()<0) bad("Tiền cọc vượt tiền thực nhận. Chuyển xử lý tranh chấp/hoàn tiền.");
            String ref=text(n,"reference");BigDecimal amount=number(n,"amount",due,due);
            if(amount.signum()>0) journal(id,"BALANCE",ref,List.of(line("112",amount,true),line("3388",amount,false)));
            db.update("update b2b_contracts set balance_ref=?,balance_received=? where id=?",ref,amount,id);
        } else if(next.equals("SETTLED")) {
            if(db.queryForObject("select count(*) from spoilage_claims where contract_id=? and status='OPEN'",Integer.class,id)>0) bad("Còn tranh chấp chưa xử lý");
            BigDecimal held=held(c);
            BigDecimal fee=money(deliveredGoods(c).multiply(decimal(c,"platform_fee_rate")).divide(new BigDecimal("100"))).add(decimal(c,"logistics_fee_amount"));
            BigDecimal vat=money(fee.multiply(decimal(c,"service_vat_rate")).divide(new BigDecimal("100"))), payout=money(held.subtract(fee).subtract(vat));
            if(payout.signum()<0) bad("Phí vượt số tiền có thể giải ngân");
            String ref=text(n,"reference");number(n,"amount",payout,payout);
            var lines=new ArrayList<Map<String,Object>>();lines.add(line("3388",held,true));if(fee.signum()>0)lines.add(line("5113",fee,false));if(vat.signum()>0)lines.add(line("3331",vat,false));if(payout.signum()>0)lines.add(line("112",payout,false));
            journal(id,"SETTLEMENT",ref,lines);db.update("update b2b_contracts set payout_ref=?,payout_amount=? where id=?",ref,payout,id);
        }
        db.update("update b2b_contracts set status=?,updated_at=CURRENT_TIMESTAMP where id=?",next,id);audit("CONTRACT_"+next,id);
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
        long id=db.queryForObject("insert into hub_inspections(inspection_code,contract_id,cold_room_id,received_weight_kg,qualified_weight_kg,rejected_weight_kg,brix_degree,moisture_pct,qc_staff_id,qc_note) values (?,?,?,?,?,?,?,?,?,?) returning id",Long.class,code("QC"),contractId,roomId,received,qualified,rejected,number(n,"brix",BigDecimal.ZERO,new BigDecimal("100")),number(n,"moisture",BigDecimal.ZERO,new BigDecimal("100")),AuthService.current().getId(),n.path("note").asText(""));
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
    }
    public List<Map<String,Object>> telemetry(long assetId) { return db.queryForList("select * from iot_sensor_logs where asset_id=? order by id desc limit 60",assetId); }
    @Transactional public Map<String,Object> inject(JsonNode n,boolean reset) {
        long id=n.path("assetId").asLong();var asset=lock("cold_assets",id);String mode=n.path("mode").asText("TEMP_SPIKE");
        if(!Set.of("TEMP_SPIKE","DOOR_OPEN").contains(mode)) bad("Chế độ mô phỏng không hợp lệ");
        BigDecimal temp=reset?new BigDecimal("4"):mode.equals("DOOR_OPEN")?decimal(asset,"current_temp").add(BigDecimal.ONE).min(new BigDecimal("20")):new BigDecimal("15");
        BigDecimal humidity=reset?new BigDecimal("85"):mode.equals("DOOR_OPEN")?decimal(asset,"current_humidity").subtract(new BigDecimal("5")).max(BigDecimal.ZERO):decimal(asset,"current_humidity");
        var cfg=settings();boolean alert=temp.compareTo(decimal(cfg,"temp_min"))<0||temp.compareTo(decimal(cfg,"temp_max"))>0;
        db.update("update cold_assets set current_temp=?,current_humidity=?,status=? where id=?",temp,humidity,alert?"TEMP_WARNING":"NORMAL",id);
        db.update("insert into iot_sensor_logs(asset_id,temperature,humidity,is_alert,alert_message) values (?,?,?,?,?)",id,temp,humidity,alert,reset?"Mô phỏng: phục hồi":"Mô phỏng: "+mode);audit(reset?"IOT_RESET":"IOT_FAULT",id);
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
    public Map<String,Object> settlementQuote(long id) {
        var c=db.queryForMap("select * from b2b_contracts where id=?",id);BigDecimal goods=deliveredGoods(c),fee=money(goods.multiply(decimal(c,"platform_fee_rate")).divide(new BigDecimal("100"))).add(decimal(c,"logistics_fee_amount")),vat=money(fee.multiply(decimal(c,"service_vat_rate")).divide(new BigDecimal("100")));
        return Map.of("goods",goods,"balanceDue",goods.subtract(decimal(c,"deposit_received")),"serviceFee",fee,"vat",vat,"payout",held(c).subtract(fee).subtract(vat));
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
    private void audit(String action,Long id){db.update("insert into business_audit(actor_id,action,entity_id) values (?,?,?)",AuthService.current().getId(),action,id);}
    private static String code(String prefix){return prefix+"-"+UUID.randomUUID().toString().substring(0,12).toUpperCase(Locale.ROOT);}
    public static BigDecimal decimal(Map<String,Object> m,String key){return new BigDecimal(Objects.toString(m.get(key),"0"));}
    public static Long asLong(Map<String,Object> m,String key){return m.get(key)==null?null:((Number)m.get(key)).longValue();}
    private static BigDecimal money(BigDecimal n){return n.setScale(2,RoundingMode.HALF_UP);}
    public static String text(JsonNode n,String key){String s=n.path(key).asText("").trim();if(s.isBlank()||s.length()>2000)bad("Thiếu hoặc quá dài: "+key);return s;}
    public static BigDecimal number(JsonNode n,String key,BigDecimal min,BigDecimal max){BigDecimal v;try{v=new BigDecimal(n.path(key).asText());}catch(NumberFormatException e){throw new AuthException(400,"INVALID_NUMBER","Số không hợp lệ: "+key);}if(v.scale()>2||v.compareTo(min)<0||v.compareTo(max)>0)bad(key+" phải từ "+min+" đến "+max+", tối đa 2 số lẻ");return v;}
    private static void bad(String message){throw new AuthException(400,"INVALID_OPERATION",message);}
}
