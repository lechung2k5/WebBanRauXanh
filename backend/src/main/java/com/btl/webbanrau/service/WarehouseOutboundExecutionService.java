package com.btl.webbanrau.service;

import com.btl.webbanrau.model.User;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.*;

@Service
@RequiredArgsConstructor
public class WarehouseOutboundExecutionService {

    private final JdbcTemplate db;
    private final B2bRealtimeService b2bRealtimeService;

    @Transactional(readOnly = true)
    public Map<String, Object> getOutboundTasks(Long warehouseId) {
        String sql = """
            SELECT c.id, c.contract_code, c.status, c.fulfillment_status, c.qc_status,
                   c.hub_name, c.hub_warehouse_zone, c.hub_rack_bin, c.hub_inbound_at,
                   c.actual_harvest_weight_kg, c.inbound_net_weight_kg, c.offered_weight_kg,
                   c.package_count, c.package_type, c.qr_code_data,
                   c.outbound_truck_plate, c.outbound_driver_name, c.outbound_dispatched_at,
                   c.delivery_notes,
                   hl.product_name, hl.lot_code,
                   r.shipping_option, r.hub_location,
                   bu.full_name AS buyer_name, bu.company_name AS buyer_company,
                   bu.phone AS buyer_phone,
                   COALESCE(NULLIF(bu.warehouse_address, ''), NULLIF(c.delivery_address, ''), NULLIF(r.hub_location, ''), bu.address) AS buyer_address,
                   fu.full_name AS farmer_name,
                   ot.trip_id AS outbound_trip_id, ot.trip_code AS outbound_trip_code,
                   ot.trip_status AS outbound_trip_status,
                   ot.vehicle_plate AS assigned_truck_plate,
                   ot.driver_name AS assigned_driver_name,
                   ot.driver_phone AS assigned_driver_phone
            FROM b2b_contracts c
            LEFT JOIN harvest_lots hl ON hl.id = COALESCE(c.lot_id, c.harvest_lot_id)
            LEFT JOIN rfq_negotiations r ON r.id = c.rfq_id
            LEFT JOIN users bu ON bu.id = c.buyer_id
            LEFT JOIN users fu ON fu.id = c.farmer_id
            LEFT JOIN LATERAL (
                SELECT t.id AS trip_id, t.trip_code, t.status AS trip_status,
                       fv.plate_number AS vehicle_plate,
                       fd.full_name AS driver_name, fd.phone AS driver_phone
                FROM outbound_delivery_stops s
                JOIN outbound_delivery_trips t ON t.id = s.trip_id
                LEFT JOIN fleet_vehicles fv ON fv.id = t.vehicle_id
                LEFT JOIN fleet_drivers fd ON fd.id = t.driver_id
                WHERE s.contract_id = c.id AND s.status <> 'CANCELLED' AND t.status <> 'CANCELLED'
                ORDER BY t.id DESC
                LIMIT 1
            ) ot ON TRUE
            WHERE (c.qc_status IN ('QC_PASSED', 'PASSED') OR c.status IN ('QC_PASSED', 'READY_OUTBOUND'))
              AND c.status NOT IN ('DELIVERED', 'SETTLED', 'COMPLETED', 'CANCELLED', 'QC_FAILED', 'QC_RETURNED')
            ORDER BY c.id ASC
            """;

        List<Map<String, Object>> rows = db.queryForList(sql);

        // Tính dải số thùng & mã tem theo từng ô kệ (BIN) để nhân viên phân biệt đúng thùng của từng đơn
        Map<String, Integer> binCrateCursor = new HashMap<>();
        List<Map<String, Object>> pa2Tasks = new ArrayList<>();
        List<Map<String, Object>> pa3Tasks = new ArrayList<>();

        for (Map<String, Object> r : rows) {
            Map<String, Object> task = new LinkedHashMap<>(r);
            String binKey = Objects.toString(r.get("hub_rack_bin"), "BIN-A-01").trim().toUpperCase();
            int pkgs = r.get("package_count") != null && ((Number) r.get("package_count")).intValue() > 0
                    ? ((Number) r.get("package_count")).intValue()
                    : 7;
            int startCrate = binCrateCursor.getOrDefault(binKey, 1);
            int endCrate = startCrate + pkgs - 1;
            binCrateCursor.put(binKey, endCrate + 1);

            String contractCode = Objects.toString(r.get("contract_code"), "");
            String shortCode = contractCode.replaceFirst("^HD-\\d{4}-", "");
            if (shortCode.isBlank()) shortCode = String.valueOf(r.get("id"));

            String rawOpt = Objects.toString(r.get("shipping_option"), "").trim().toUpperCase();
            boolean isSelfPickup = rawOpt.equals("PA3") || rawOpt.equals("FARM_PICKUP")
                    || rawOpt.equals("BUYER_SELF_TRANSPORT") || rawOpt.contains("PICKUP") || rawOpt.contains("SELF");

            String fulfill = Objects.toString(r.get("fulfillment_status"), "").toUpperCase();
            String status = Objects.toString(r.get("status"), "").toUpperCase();
            String pickingStage;
            if ("OUTBOUND_DISPATCHED".equals(status) || "OUTBOUND_DISPATCHED".equals(fulfill)) {
                pickingStage = "HANDED_OVER";
            } else if ("PICKED_FROM_BIN".equals(fulfill)) {
                pickingStage = "PICKED_FROM_BIN";
            } else if ("PICKING_IN_PROGRESS".equals(fulfill)) {
                pickingStage = "PICKING_IN_PROGRESS";
            } else {
                pickingStage = "WAITING_PICKING";
            }

            boolean buyerTruckDispatched = isSelfPickup && (
                    "BUYER_TRUCK_EN_ROUTE".equals(fulfill)
                    || (r.get("outbound_truck_plate") != null && !String.valueOf(r.get("outbound_truck_plate")).isBlank())
            );
            task.put("buyerTruckDispatched", buyerTruckDispatched);

            BigDecimal weight = toBigDecimal(r.get("inbound_net_weight_kg"));
            if (weight.compareTo(BigDecimal.ZERO) <= 0) weight = toBigDecimal(r.get("actual_harvest_weight_kg"));
            if (weight.compareTo(BigDecimal.ZERO) <= 0) weight = toBigDecimal(r.get("offered_weight_kg"));

            task.put("crateStart", startCrate);
            task.put("crateEnd", endCrate);
            task.put("crateRange", "Thùng #" + startCrate + "–#" + endCrate);
            task.put("sealRange", shortCode + "-01.." + String.format("%02d", pkgs));
            task.put("packageCount", pkgs);
            task.put("weightKg", weight);
            task.put("isSelfPickup", isSelfPickup);
            task.put("pickingStage", pickingStage);

            if (isSelfPickup) {
                pa3Tasks.add(task);
            } else {
                pa2Tasks.add(task);
            }
        }

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("pa2Tasks", pa2Tasks);
        result.put("pa3Tasks", pa3Tasks);
        result.put("totalPending", pa2Tasks.size() + pa3Tasks.size());
        return result;
    }

    @Transactional
    public Map<String, Object> startPicking(Long contractId, User staff) {
        Map<String, Object> c = requireContract(contractId);
        db.update(
                "UPDATE b2b_contracts SET fulfillment_status = 'PICKING_IN_PROGRESS', updated_at = CURRENT_TIMESTAMP WHERE id = ?",
                contractId
        );
        Map<String, Object> updated = db.queryForMap("SELECT * FROM b2b_contracts WHERE id = ?", contractId);
        b2bRealtimeService.notifyContractUpdated("PICKING_IN_PROGRESS", Objects.toString(c.get("contract_code"), ""), updated);
        b2bRealtimeService.notifyDispatchTripUpdated("WAREHOUSE_PICKING_STARTED", contractId, Map.of("contractId", contractId));
        return updated;
    }

    @Transactional
    public Map<String, Object> confirmPicked(
            Long contractId,
            Integer pickedPackages,
            BigDecimal actualWeightKg,
            BigDecimal outboundTemp,
            String notes,
            User staff
    ) {
        if (pickedPackages == null || pickedPackages <= 0) {
            throw new IllegalArgumentException("Số thùng lấy ra phải lớn hơn 0");
        }
        if (actualWeightKg == null || actualWeightKg.compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("Khối lượng thực xuất phải lớn hơn 0 kg");
        }
        Map<String, Object> c = requireContract(contractId);
        String staffName = staff != null ? staff.getFullName() : "Nhân viên kho";
        String summaryNote = String.format(
                "[Xuất kho - %s] Đã lấy %d thùng (%.1f kg), nhiệt độ xuất %.1f°C. %s",
                staffName,
                pickedPackages,
                actualWeightKg.doubleValue(),
                outboundTemp != null ? outboundTemp.doubleValue() : 3.2,
                notes != null ? notes.trim() : ""
        ).trim();

        db.update(
                "UPDATE b2b_contracts SET fulfillment_status = 'PICKED_FROM_BIN', package_count = ?, inbound_net_weight_kg = ?, delivery_notes = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
                pickedPackages, actualWeightKg, summaryNote, contractId
        );
        Map<String, Object> updated = db.queryForMap("SELECT * FROM b2b_contracts WHERE id = ?", contractId);
        b2bRealtimeService.notifyContractUpdated("PICKED_FROM_BIN", Objects.toString(c.get("contract_code"), ""), updated);
        b2bRealtimeService.notifyDispatchTripUpdated("WAREHOUSE_PICKED_FROM_BIN", contractId, Map.of("contractId", contractId));
        return updated;
    }

    @Transactional
    public Map<String, Object> completeHandover(
            Long contractId,
            String handoverType,
            String receiverName,
            String receiverPhone,
            String truckPlate,
            String signatureData,
            String notes,
            User staff
    ) {
        Map<String, Object> c = requireContract(contractId);
        String safeReceiver = (receiverName != null && !receiverName.isBlank()) ? receiverName.trim() : "Đại diện nhận hàng";
        String safeNotes = (notes != null && !notes.isBlank()) ? notes.trim() : "Đã bàn giao xuất kho nguyên niêm phong";

        if ("PA3_BUYER_PICKUP".equalsIgnoreCase(handoverType)) {
            BigDecimal deliveredWeight = toBigDecimal(c.get("inbound_net_weight_kg"));
            if (deliveredWeight.compareTo(BigDecimal.ZERO) <= 0) deliveredWeight = toBigDecimal(c.get("actual_harvest_weight_kg"));
            if (deliveredWeight.compareTo(BigDecimal.ZERO) <= 0) deliveredWeight = toBigDecimal(c.get("offered_weight_kg"));

            BigDecimal totalAmount = toBigDecimal(c.get("total_amount"));
            BigDecimal depositReceived = toBigDecimal(c.get("deposit_received"));
            BigDecimal balanceReceived = toBigDecimal(c.get("balance_received"));
            BigDecimal remainingDue = totalAmount.subtract(depositReceived).subtract(balanceReceived).max(BigDecimal.ZERO);
            String existingPayStatus = c.get("remaining_payment_status") != null ? String.valueOf(c.get("remaining_payment_status")) : "UNPAID";
            String nextPayStatus = ("PAID".equalsIgnoreCase(existingPayStatus) || remainingDue.compareTo(BigDecimal.ZERO) <= 0)
                    ? "PAID"
                    : "UNPAID";

            String safePlate = (truckPlate != null && !truckPlate.isBlank())
                    ? truckPlate.trim().toUpperCase()
                    : Objects.toString(c.get("outbound_truck_plate"), "");
            String receiverLabel = safeReceiver + (receiverPhone != null && !receiverPhone.isBlank() ? " (" + receiverPhone.trim() + ")" : "");
            String safeSig = (signatureData != null && !signatureData.isBlank())
                    ? signatureData.trim()
                    : Objects.toString(c.get("epod_signature_url"), "SIGNED_AT_HUB_GATE");

            db.update(
                    """
                    UPDATE b2b_contracts
                    SET status = 'DELIVERED',
                        fulfillment_status = 'DELIVERED',
                        outbound_dispatched_at = COALESCE(outbound_dispatched_at, CURRENT_TIMESTAMP),
                        outbound_truck_plate = COALESCE(NULLIF(?, ''), outbound_truck_plate),
                        outbound_driver_name = ?,
                        epod_delivered_at = CURRENT_TIMESTAMP,
                        epod_delivered_weight_kg = ?,
                        epod_damaged_weight_kg = 0,
                        epod_signature_url = ?,
                        remaining_payment_status = ?,
                        delivery_notes = ?,
                        updated_at = CURRENT_TIMESTAMP
                    WHERE id = ?
                    """,
                    safePlate,
                    receiverLabel,
                    deliveredWeight,
                    safeSig,
                    nextPayStatus,
                    "[PA3 Ký nhận & Giao tại kho HoNa] " + safeNotes,
                    contractId
            );
            Map<String, Object> updated = db.queryForMap("SELECT * FROM b2b_contracts WHERE id = ?", contractId);
            b2bRealtimeService.notifyContractUpdated("DELIVERED", Objects.toString(c.get("contract_code"), ""), updated);
            return updated;
        }

        db.update(
                """
                UPDATE b2b_contracts
                SET status = 'OUTBOUND_DISPATCHED',
                    fulfillment_status = 'OUTBOUND_DISPATCHED',
                    outbound_dispatched_at = COALESCE(outbound_dispatched_at, CURRENT_TIMESTAMP),
                    outbound_driver_name = COALESCE(NULLIF(outbound_driver_name, ''), ?),
                    delivery_notes = ?,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
                """,
                safeReceiver,
                "[PA2 Bàn giao xe lạnh Outbound] " + safeNotes,
                contractId
        );
        Map<String, Object> updated = db.queryForMap("SELECT * FROM b2b_contracts WHERE id = ?", contractId);
        b2bRealtimeService.notifyContractUpdated("OUTBOUND_DISPATCHED", Objects.toString(c.get("contract_code"), ""), updated);
        b2bRealtimeService.notifyDispatchTripUpdated("WAREHOUSE_HANDOVER_COMPLETED", contractId, Map.of("contractId", contractId));
        return updated;
    }

    private Map<String, Object> requireContract(Long contractId) {
        List<Map<String, Object>> list = db.queryForList("SELECT * FROM b2b_contracts WHERE id = ?", contractId);
        if (list.isEmpty()) {
            throw new IllegalArgumentException("Không tìm thấy hợp đồng ID: " + contractId);
        }
        return list.getFirst();
    }

    private BigDecimal toBigDecimal(Object val) {
        if (val == null) return BigDecimal.ZERO;
        try {
            return new BigDecimal(String.valueOf(val));
        } catch (Exception e) {
            return BigDecimal.ZERO;
        }
    }
}
