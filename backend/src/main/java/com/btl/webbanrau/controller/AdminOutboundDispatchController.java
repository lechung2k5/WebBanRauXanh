package com.btl.webbanrau.controller;

import com.btl.webbanrau.dto.request.ConfirmOutboundTripRequest;
import com.btl.webbanrau.dto.response.ApiResponse;
import com.btl.webbanrau.model.B2bContract;
import com.btl.webbanrau.model.OutboundDeliveryTrip;
import com.btl.webbanrau.repository.B2bContractRepository;
import com.btl.webbanrau.service.AdminBusinessService;
import com.btl.webbanrau.service.OutboundDispatchService;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.LinkedHashMap;
import java.util.Map;

@RestController
@RequestMapping("/admin/outbound-dispatch")
@RequiredArgsConstructor
@Slf4j
@PreAuthorize("hasRole('ADMIN')")
public class AdminOutboundDispatchController {

    private final OutboundDispatchService outboundDispatchService;
    private final AdminBusinessService adminBusinessService;
    private final B2bContractRepository b2bContractRepository;
    private final ObjectMapper objectMapper;
    private final JdbcTemplate jdbcTemplate;

    @GetMapping("/eligible-contracts")
    public Object getEligibleContracts(@RequestParam(required = false, defaultValue = "2") Long hubId) {
        return ApiResponse.success(outboundDispatchService.getEligibleContracts(hubId));
    }

    @PostMapping("/confirm-trip")
    public Object confirmTrip(@RequestParam Long hubId, @Valid @RequestBody ConfirmOutboundTripRequest request) {
        OutboundDeliveryTrip trip = outboundDispatchService.confirmOutboundTrip(hubId, request);
        return ApiResponse.success("Đã xác nhận phân công chuyến xe Outbound " + trip.getTripCode(), trip);
    }

    @GetMapping("/trips")
    public Object listTrips(@RequestParam(required = false) Long hubId) {
        return ApiResponse.success(outboundDispatchService.getTripsByHub(hubId));
    }

    @GetMapping("/completed-deliveries")
    public Object listCompletedDeliveries(@RequestParam(required = false) Long hubId) {
        return ApiResponse.success(outboundDispatchService.getCompletedDeliveries(hubId));
    }

    @GetMapping("/trips/{tripId}")
    public Object getTripDetail(@PathVariable Long tripId) {
        return ApiResponse.success(outboundDispatchService.getTripDetail(tripId));
    }

    @PostMapping("/trips/{tripId}/cancel")
    public Object cancelTrip(@PathVariable Long tripId, @RequestBody(required = false) Map<String, String> payload) {
        String reason = payload != null && payload.get("reason") != null ? payload.get("reason") : "Điều phối viên hủy chuyến";
        outboundDispatchService.cancelOutboundTrip(tripId, reason);
        return ApiResponse.success("Đã hủy chuyến Outbound và giải phóng tài nguyên thành công", null);
    }

    /**
     * Giai đoạn 9.1: Lấy chi tiết quyết toán & mã QR thanh toán 70% còn lại
     */
    @GetMapping("/contracts/{contractId}/settlement-quote")
    public Object getSettlementQuote(@PathVariable Long contractId) {
        B2bContract contract = b2bContractRepository.findById(contractId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy hợp đồng " + contractId));

        Map<String, Object> quote = adminBusinessService.settlementQuote(contractId);
        Map<String, Object> res = new LinkedHashMap<>(quote);
        res.put("contractId", contractId);
        res.put("contractCode", contract.getContractCode());
        res.put("contractStatus", contract.getStatus());
        res.put("bank", "MB Bank");
        res.put("accountNumber", "0987654321");
        res.put("transferContent", "TT70 " + contract.getContractCode());

        BigDecimal rem = (BigDecimal) quote.get("balanceDue");
        if ("SETTLED".equals(contract.getStatus())) {
            rem = BigDecimal.ZERO;
        } else if (rem == null || rem.compareTo(BigDecimal.ZERO) < 0) {
            rem = BigDecimal.ZERO;
        }
        res.put("remainingAmount", rem);
        res.put("qrUrl", "https://img.vietqr.io/image/MB-0987654321-compact2.png?amount=" + rem.toBigInteger() + "&addInfo=TT70%20" + contract.getContractCode());
        return ApiResponse.success(res);
    }

    /**
     * Giai đoạn 9.2: Xác nhận thanh toán nốt 70% & Hoàn tất hợp đồng (SETTLED)
     */
    @PostMapping("/contracts/{contractId}/confirm-settlement")
    public Object confirmSettlement(@PathVariable Long contractId, @RequestBody(required = false) Map<String, String> payload) {
        B2bContract contract = b2bContractRepository.findById(contractId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy hợp đồng " + contractId));

        // Nếu hợp đồng đã ở trạng thái SETTLED thì trả về thành công ngay lập tức, không thao tác lại
        if ("SETTLED".equals(contract.getStatus())) {
            return ApiResponse.success("Hợp đồng " + contract.getContractCode() + " đã quyết toán hoàn tất 100% (SETTLED)", contract);
        }

        String ref = payload != null && payload.get("reference") != null ? payload.get("reference") : "BAL-" + (System.currentTimeMillis() % 100000);

        // Đảm bảo trạng thái DELIVERED trước khi sang SETTLED (chỉ chuyển tiếp nếu chưa phải DELIVERED)
        if (!"DELIVERED".equals(contract.getStatus())) {
            ObjectNode devReq = objectMapper.createObjectNode()
                    .put("status", "DELIVERED")
                    .put("reference", ref);
            adminBusinessService.transition(contractId, devReq);
            contract = b2bContractRepository.findById(contractId).orElse(contract);
        }

        // Đảm bảo hạch toán 70% còn lại vào tài khoản ký quỹ 3388 nếu chưa có bút toán BALANCE
        BigDecimal goods = contract.getTotalGoodsAmount() != null ? contract.getTotalGoodsAmount() : contract.getTotalAmount();
        BigDecimal dep = contract.getDeposit30Amount() != null ? contract.getDeposit30Amount() : (contract.getDepositAmount() != null ? contract.getDepositAmount() : BigDecimal.ZERO);
        BigDecimal due = goods != null ? goods.subtract(dep != null ? dep : BigDecimal.ZERO) : BigDecimal.ZERO;
        if (due.compareTo(BigDecimal.ZERO) > 0) {
            Integer balanceEntries = jdbcTemplate.queryForObject(
                    "select count(*) from gl_journal_entries where contract_id=? and event='BALANCE'",
                    Integer.class, contractId
            );
            if (balanceEntries == null || balanceEntries == 0) {
                Long entry = jdbcTemplate.queryForObject(
                        "insert into gl_journal_entries(contract_id,event,reference) values (?,?,?) returning id",
                        Long.class, contractId, "BALANCE", ref
                );
                jdbcTemplate.update("insert into gl_journal_lines(entry_id,account,debit,credit) values (?,?,?,'0')", entry, "112", due);
                jdbcTemplate.update("insert into gl_journal_lines(entry_id,account,debit,credit) values (?,?,'0',?)", entry, "3388", due);
                jdbcTemplate.update("update b2b_contracts set balance_ref=?,balance_received=?,remaining_payment_status='PAID',remaining_paid_at=CURRENT_TIMESTAMP where id=?", ref, due, contractId);
            }
        }

        // Chuyển sang SETTLED để hạch toán số sách kế toán kép B2B
        ObjectNode setReq = objectMapper.createObjectNode()
                .put("status", "SETTLED")
                .put("reference", "SET-" + (System.currentTimeMillis() % 100000))
                .put("bankTransferRef", ref)
                .put("farmerBankName", payload != null && payload.get("farmerBankName") != null ? payload.get("farmerBankName") : "Vietcombank")
                .put("farmerBankAccount", payload != null && payload.get("farmerBankAccount") != null ? payload.get("farmerBankAccount") : "0123456789")
                .put("farmerBankOwner", payload != null && payload.get("farmerBankOwner") != null ? payload.get("farmerBankOwner") : "NGUYEN VAN NONG");
        adminBusinessService.transition(contractId, setReq);

        B2bContract updated = b2bContractRepository.findById(contractId).orElse(contract);
        return ApiResponse.success("Đã hoàn tất thanh toán 70% còn lại và quyết toán hợp đồng " + contract.getContractCode(), updated);
    }
}

