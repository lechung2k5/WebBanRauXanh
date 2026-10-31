package com.btl.webbanrau.controller;

import com.btl.webbanrau.dto.request.DeliveryScheduleRequest;
import com.btl.webbanrau.dto.request.FarmerProfileRequest;
import com.btl.webbanrau.dto.request.HarvestLotRequest;
import com.btl.webbanrau.dto.request.PublicRfqDepositRequest;
import com.btl.webbanrau.dto.request.RfqRespondRequest;
import com.btl.webbanrau.dto.response.*;
import com.btl.webbanrau.service.FarmerService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/farmer")
@RequiredArgsConstructor
@Tag(name = "Farmer Portal Controller", description = "Phân hệ quản lý vùng trồng, lô vụ mùa, đàm phán RFQ, hợp đồng B2B & quyết toán")
public class FarmerController {

    private final FarmerService farmerService;
    private final com.btl.webbanrau.service.GeminiService geminiService;

    // 1. Dashboard Stats
    @GetMapping("/dashboard/stats")
    @Operation(summary = "Lấy KPI tổng quan Dashboard Nông Dân")
    public ResponseEntity<ApiResponse<FarmerStatsResponse>> getDashboardStats() {
        return ResponseEntity.ok(ApiResponse.success(farmerService.getDashboardStats()));
    }

    // 2. Profile
    @GetMapping("/profile")
    @Operation(summary = "Lấy thông tin vùng trồng PUC và tài khoản ngân hàng của nông dân")
    public ResponseEntity<ApiResponse<FarmerProfileResponse>> getProfile() {
        return ResponseEntity.ok(ApiResponse.success(farmerService.getProfile()));
    }

    @PutMapping("/profile")
    @Operation(summary = "Cập nhật hồ sơ vùng trồng PUC, chứng nhận VietGAP, STK ngân hàng")
    public ResponseEntity<ApiResponse<FarmerProfileResponse>> updateProfile(@Valid @RequestBody FarmerProfileRequest request) {
        return ResponseEntity.ok(ApiResponse.success("Cập nhật hồ sơ nông trại thành công!", farmerService.updateProfile(request)));
    }

    // 3. Harvest Lots
    @GetMapping("/harvest-lots")
    @Operation(summary = "Lấy danh sách các lô vụ mùa nông dân đang chào bán sỉ")
    public ResponseEntity<ApiResponse<List<HarvestLotResponse>>> getHarvestLots() {
        return ResponseEntity.ok(ApiResponse.success(farmerService.getHarvestLots()));
    }

    @PostMapping("/harvest-lots")
    @Operation(summary = "Đăng bán lô vụ mùa mới (kèm bảng giá sỉ Tier Pricing & dải nhiệt độ 2-6°C)")
    public ResponseEntity<ApiResponse<HarvestLotResponse>> createHarvestLot(@Valid @RequestBody HarvestLotRequest request) {
        HarvestLotResponse response = farmerService.createHarvestLot(request);
        return ResponseEntity.ok(ApiResponse.success("Đăng lô vụ mùa thành công!", response));
    }

    @PutMapping("/harvest-lots/{id}")
    @Operation(summary = "Cập nhật thông tin, sản lượng còn lại hoặc đóng lô hàng")
    public ResponseEntity<ApiResponse<HarvestLotResponse>> updateHarvestLot(@PathVariable Long id, @Valid @RequestBody HarvestLotRequest request) {
        return ResponseEntity.ok(ApiResponse.success("Cập nhật lô hàng thành công!", farmerService.updateHarvestLot(id, request)));
    }

    // 4. RFQ Negotiations
    @GetMapping("/rfq")
    @Operation(summary = "Lấy danh sách các yêu cầu báo giá sỉ (RFQ) từ thương lái")
    public ResponseEntity<ApiResponse<List<RfqResponse>>> getRfqs() {
        return ResponseEntity.ok(ApiResponse.success(farmerService.getRfqs()));
    }

    @PostMapping("/rfq/public-submit")
    @Operation(summary = "Thương lái / Khách hàng gửi yêu cầu đàm phán báo giá sỉ hoặc đặt cọc 30% bảo chứng")
    public ResponseEntity<ApiResponse<RfqResponse>> createPublicRfqOrDeposit(@Valid @RequestBody PublicRfqDepositRequest request) {
        String msg = Boolean.TRUE.equals(request.getIsDepositPaid())
                ? "Thương lái đã ký quỹ đặt cọc 30% bảo chứng sàn thành công! Hợp đồng B2B đã được khởi tạo tự động."
                : "Gửi yêu cầu đàm phán báo giá sỉ thành công! Nhà vườn sẽ phản hồi sớm nhất.";
        return ResponseEntity.ok(ApiResponse.success(msg, farmerService.createPublicRfqOrDeposit(request)));
    }

    @PatchMapping("/rfq/{id}/respond")
    @Operation(summary = "Phản hồi RFQ: ACCEPT (Chấp thuận -> Tự động sinh Hợp đồng B2B), COUNTER (Thương lượng lại), REJECT (Từ chối)")
    public ResponseEntity<ApiResponse<RfqResponse>> respondToRfq(@PathVariable Long id, @Valid @RequestBody RfqRespondRequest request) {
        return ResponseEntity.ok(ApiResponse.success("Phản hồi yêu cầu báo giá thành công!", farmerService.respondToRfq(id, request)));
    }

    // 5. B2B Contracts & QC
    @GetMapping("/contracts")
    @Operation(summary = "Lấy danh sách hợp đồng B2B và tiến độ cọc 30% Escrow")
    public ResponseEntity<ApiResponse<List<B2bContractResponse>>> getContracts() {
        return ResponseEntity.ok(ApiResponse.success(farmerService.getContracts()));
    }

    @GetMapping("/contracts/track")
    @Operation(summary = "Tra cứu hợp đồng B2B & tiến độ ký quỹ cọc 30% cho Thương Lái (theo SĐT hoặc Mã Hợp Đồng)")
    public ResponseEntity<ApiResponse<List<B2bContractResponse>>> trackContracts(@RequestParam String query) {
        return ResponseEntity.ok(ApiResponse.success(farmerService.trackContractsForBuyer(query)));
    }

    @PutMapping("/contracts/{id}/delivery-schedule")
    @Operation(summary = "Nông dân cập nhật lịch hẹn và trạm bàn giao trung chuyển")
    public ResponseEntity<ApiResponse<B2bContractResponse>> updateDeliverySchedule(@PathVariable Long id, @Valid @RequestBody DeliveryScheduleRequest request) {
        return ResponseEntity.ok(ApiResponse.success("Cập nhật lịch hẹn giao trạm thành công!", farmerService.updateDeliverySchedule(id, request)));
    }

    @GetMapping(value = "/contracts/{id}/print", produces = MediaType.TEXT_HTML_VALUE)
    @Operation(summary = "Xem / In bản Hợp Đồng Mua Bán Nông Sản Sỉ B2B điện tử 3 bên có bảo chứng Escrow")
    public ResponseEntity<String> getContractPrint(@PathVariable Long id) {
        String html = farmerService.generateContractPrintHtml(id);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"HopDong_B2B_" + id + ".html\"")
                .body(html);
    }

    @PostMapping("/contracts/{id}/settle")
    @Operation(summary = "Quyết toán giải ngân doanh thu hợp đồng về tài khoản ngân hàng (khấu trừ phí sàn 3%)")
    public ResponseEntity<ApiResponse<SettlementResponse>> settleContract(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success("Quyết toán và giải ngân về tài khoản ngân hàng thành công!", farmerService.settleContract(id)));
    }

    @GetMapping("/contracts/{id}/qc")
    @Operation(summary = "Xem biên bản kiểm định chất lượng tại trạm QC (Độ ngọt Brix, độ ẩm, khối lượng đạt chuẩn)")
    public ResponseEntity<ApiResponse<QcInspectionResponse>> getContractQc(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success(farmerService.getContractQc(id)));
    }

    // 6. Settlements & Form 01/TNDN
    @GetMapping("/settlements")
    @Operation(summary = "Xem lịch sử quyết toán doanh thu đã giải ngân về tài khoản ngân hàng")
    public ResponseEntity<ApiResponse<List<SettlementResponse>>> getSettlements() {
        return ResponseEntity.ok(ApiResponse.success(farmerService.getSettlements()));
    }

    @GetMapping(value = "/settlements/{id}/invoice-kct", produces = MediaType.TEXT_HTML_VALUE)
    @Operation(summary = "Xuất chứng từ Hóa đơn điện tử KCT (Không chịu thuế) cho Hợp tác xã")
    public ResponseEntity<String> getInvoiceKct(@PathVariable Long id) {
        String html = farmerService.generateInvoiceKct(id);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"HoaDon_KCT_" + id + ".html\"")
                .body(html);
    }


    // 7. Agri-AI Assistant
    @PostMapping("/ai-chat")
    @Operation(summary = "Trợ lý HoNa Fresh AI chuyên biệt dành riêng cho Nông Dân & HTX")
    public ResponseEntity<ApiResponse<java.util.Map<String, String>>> farmerAiChat(@RequestBody java.util.Map<String, String> request) {
        String query = request.get("message");
        String answer = geminiService.generateFarmerChat(query);
        return ResponseEntity.ok(ApiResponse.success(java.util.Map.of("answer", answer)));
    }

    @GetMapping(value = "/settlements/{id}/pdf-01-tndn", produces = MediaType.TEXT_HTML_VALUE)
    @Operation(summary = "Xuất chứng từ Bảng kê thu mua nông sản Mẫu 01/TNDN chuẩn pháp lý")
    public ResponseEntity<String> getPdf01Tndn(@PathVariable Long id) {
        String html = farmerService.generatePdf01Tndn(id);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"BangKe_01_TNDN_" + id + ".html\"")
                .body(html);
    }

    // 8. Post-Sale Lot Tracking & Telemetry
    @GetMapping("/harvest-lots/{id}/allocation")
    @Operation(summary = "Xem cây phân bổ sản lượng lô vụ mùa (Hợp đồng con, khối lượng đã bán, lượng tồn khả dụng)")
    public ResponseEntity<ApiResponse<HarvestLotAllocationResponse>> getLotAllocation(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success(farmerService.getLotAllocation(id)));
    }

    @GetMapping("/contracts/{id}/telemetry")
    @Operation(summary = "Giám sát chuỗi lạnh xe lạnh IoT thời gian thực (Nhiệt độ, độ ẩm, cờ cảnh báo đứt gãy)")
    public ResponseEntity<ApiResponse<ColdChainTelemetryResponse>> getColdChainTelemetry(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success(farmerService.getColdChainTelemetry(id)));
    }

    @GetMapping("/contracts/{id}/delivery-proof")
    @Operation(summary = "Xem biên bản bàn giao điện tử (ePOD) có chữ ký số bên mua và khiếu nại sau bán")
    public ResponseEntity<ApiResponse<DeliveryProofResponse>> getDeliveryProof(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success(farmerService.getDeliveryProof(id)));
    }

    @GetMapping("/trace/lot/{lotCode}")
    @Operation(summary = "Tra cứu tem QR truy xuất nguồn gốc công khai cho người tiêu dùng")
    public ResponseEntity<ApiResponse<LotTraceResponse>> getLotTrace(@PathVariable String lotCode) {
        return ResponseEntity.ok(ApiResponse.success(farmerService.getLotTrace(lotCode)));
    }
}
