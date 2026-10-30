package com.btl.webbanrau.service;

import com.btl.webbanrau.dto.request.DeliveryScheduleRequest;
import com.btl.webbanrau.dto.request.FarmerProfileRequest;
import com.btl.webbanrau.dto.request.HarvestLotRequest;
import com.btl.webbanrau.dto.request.PublicRfqDepositRequest;
import com.btl.webbanrau.dto.request.RfqRespondRequest;
import com.btl.webbanrau.dto.response.*;
import com.btl.webbanrau.model.*;
import com.btl.webbanrau.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class FarmerService {

    private final UserRepository userRepository;
    private final FarmerProfileRepository farmerProfileRepository;
    private final HarvestLotRepository harvestLotRepository;
    private final RfqNegotiationRepository rfqNegotiationRepository;
    private final B2bContractRepository b2bContractRepository;
    private final QcInspectionRepository qcInspectionRepository;
    private final SettlementRepository settlementRepository;

    public User getCurrentFarmer() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.isAuthenticated() && !"anonymousUser".equals(auth.getName())) {
            var userOpt = userRepository.findByUsername(auth.getName());
            if (userOpt.isPresent()) return userOpt.get();
        }
        // Fallback tài khoản nông dân mặc định
        return userRepository.findByUsername("farmer_dalat")
                .orElseGet(() -> userRepository.findAll().stream()
                        .filter(u -> u.getRoles().stream().anyMatch(r -> "ROLE_FARMER".equals(r.getName())))
                        .findFirst()
                        .orElseThrow(() -> new IllegalStateException("Không tìm thấy tài khoản Nông dân!")));
    }

    // 1. Dashboard Stats
    @Transactional(readOnly = true)
    public FarmerStatsResponse getDashboardStats() {
        User farmer = getCurrentFarmer();
        BigDecimal totalRevenue = settlementRepository.sumTotalPayoutByFarmer(farmer);
        BigDecimal escrowHolding = b2bContractRepository.sumEscrowDepositHolding(farmer);
        long openLotsCount = harvestLotRepository.countByFarmerAndStatus(farmer, "OPEN");
        long runningContracts = b2bContractRepository.countActiveContractsByFarmer(farmer);
        long pendingRfq = rfqNegotiationRepository.countByFarmerAndStatus(farmer, "PENDING");

        return FarmerStatsResponse.builder()
                .totalRevenue(totalRevenue != null ? totalRevenue : BigDecimal.ZERO)
                .escrowHolding(escrowHolding != null ? escrowHolding : BigDecimal.ZERO)
                .openLotsCount(openLotsCount)
                .runningContractsCount(runningContracts)
                .pendingRfqCount(pendingRfq)
                .build();
    }

    // 2. Profile
    @Transactional
    public FarmerProfileResponse getProfile() {
        User farmer = getCurrentFarmer();
        FarmerProfile profile = farmerProfileRepository.findByUser(farmer)
                .orElseGet(() -> farmerProfileRepository.save(FarmerProfile.builder()
                        .user(farmer)
                        .farmName(farmer.getFullName())
                        .farmerType("COOPERATIVE")
                        .pucCode("VN-LDO-PUC-0849")
                        .certifications("VietGAP, GlobalGAP, Organic")
                        .taxCode("5801456789")
                        .idCardNumber("068095001234")
                        .bankAccount("5400205219999")
                        .bankAccountName("HTX RAU SACH DA LAT GAP")
                        .bankName("Agribank")
                        .location(farmer.getAddress() != null ? farmer.getAddress() : "Đà Lạt, Lâm Đồng")
                        .cultivatedArea("45 Hecta")
                        .build()));

        return mapToProfileResponse(profile, farmer);
    }

    @Transactional
    public FarmerProfileResponse updateProfile(FarmerProfileRequest request) {
        User farmer = getCurrentFarmer();
        FarmerProfile profile = farmerProfileRepository.findByUser(farmer)
                .orElseGet(() -> FarmerProfile.builder().user(farmer).build());

        profile.setFarmName(request.getFarmName());
        if (request.getFarmerType() != null) profile.setFarmerType(request.getFarmerType());
        if (request.getPucCode() != null) profile.setPucCode(request.getPucCode());
        if (request.getCertifications() != null) profile.setCertifications(request.getCertifications());
        if (request.getCertExpiryDate() != null) profile.setCertExpiryDate(request.getCertExpiryDate());
        if (request.getCertImageUrl() != null) profile.setCertImageUrl(request.getCertImageUrl());
        if (request.getTaxCode() != null) profile.setTaxCode(request.getTaxCode());
        if (request.getIdCardNumber() != null) profile.setIdCardNumber(request.getIdCardNumber());
        if (request.getBankAccount() != null) profile.setBankAccount(request.getBankAccount());
        if (request.getBankAccountName() != null) profile.setBankAccountName(request.getBankAccountName());
        if (request.getBankName() != null) profile.setBankName(request.getBankName());
        if (request.getLocation() != null) profile.setLocation(request.getLocation());
        if (request.getCultivatedArea() != null) profile.setCultivatedArea(request.getCultivatedArea());

        FarmerProfile saved = farmerProfileRepository.save(profile);
        return mapToProfileResponse(saved, farmer);
    }

    // 3. Harvest Lots
    @Transactional(readOnly = true)
    public List<HarvestLotResponse> getHarvestLots() {
        User farmer = getCurrentFarmer();
        return harvestLotRepository.findByFarmerOrderByCreatedAtDesc(farmer).stream()
                .map(this::mapToLotResponse)
                .toList();
    }

    @Transactional
    public HarvestLotResponse createHarvestLot(HarvestLotRequest request) {
        User farmer = getCurrentFarmer();
        String lotCode = "LOT-" + java.time.Year.now().getValue() + "-" + UUID.randomUUID().toString().substring(0, 5).toUpperCase();

        HarvestLot lot = HarvestLot.builder()
                .lotCode(lotCode)
                .productName(request.getProductName())
                .categorySlug(request.getCategorySlug() != null ? request.getCategorySlug() : "rau-sach")
                .imageUrl(request.getImageUrl() != null && !request.getImageUrl().isBlank()
                        ? request.getImageUrl()
                        : "https://images.unsplash.com/photo-1540420773420-3366772f4999?w=600&auto=format&fit=crop&q=80")
                .pucCode(request.getPucCode())
                .harvestDate(request.getHarvestDate())
                .expiryDate(request.getExpiryDate())
                .totalQuantity(request.getTotalQuantity())
                .remainingQuantity(request.getTotalQuantity())
                .unit(request.getUnit() != null ? request.getUnit() : "kg")
                .minTemp(request.getMinTemp() != null ? request.getMinTemp() : 2.0)
                .maxTemp(request.getMaxTemp() != null ? request.getMaxTemp() : 6.0)
                .tierPricingJson(request.getTierPricingJson())
                .status("OPEN")
                .farmer(farmer)
                .hubLocation(request.getHubLocation() != null ? request.getHubLocation() : "Trạm Lạnh Cross-docking Đức Trọng, Lâm Đồng")
                .build();

        HarvestLot saved = harvestLotRepository.save(lot);
        return mapToLotResponse(saved);
    }

    @Transactional
    public HarvestLotResponse updateHarvestLot(Long id, HarvestLotRequest request) {
        HarvestLot lot = harvestLotRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy lô hàng ID: " + id));

        lot.setProductName(request.getProductName());
        if (request.getCategorySlug() != null) lot.setCategorySlug(request.getCategorySlug());
        if (request.getImageUrl() != null) lot.setImageUrl(request.getImageUrl());
        if (request.getPucCode() != null) lot.setPucCode(request.getPucCode());
        if (request.getHarvestDate() != null) lot.setHarvestDate(request.getHarvestDate());
        if (request.getExpiryDate() != null) lot.setExpiryDate(request.getExpiryDate());
        if (request.getTotalQuantity() != null) {
            lot.setTotalQuantity(request.getTotalQuantity());
            if (lot.getRemainingQuantity() > request.getTotalQuantity()) {
                lot.setRemainingQuantity(request.getTotalQuantity());
            }
        }
        if (request.getMinTemp() != null) lot.setMinTemp(request.getMinTemp());
        if (request.getMaxTemp() != null) lot.setMaxTemp(request.getMaxTemp());
        if (request.getTierPricingJson() != null) lot.setTierPricingJson(request.getTierPricingJson());
        if (request.getHubLocation() != null) lot.setHubLocation(request.getHubLocation());

        HarvestLot updated = harvestLotRepository.save(lot);
        return mapToLotResponse(updated);
    }

    // 4. RFQ Negotiations
    @Transactional(readOnly = true)
    public List<RfqResponse> getRfqs() {
        User farmer = getCurrentFarmer();
        return rfqNegotiationRepository.findByFarmerOrderByCreatedAtDesc(farmer).stream()
                .map(this::mapToRfqResponse)
                .toList();
    }

    @Transactional
    public RfqResponse respondToRfq(Long id, RfqRespondRequest request) {
        RfqNegotiation rfq = rfqNegotiationRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy RFQ ID: " + id));

        String action = request.getAction().toUpperCase();
        if ("ACCEPT".equals(action)) {
            rfq.setStatus("ACCEPTED");
            HarvestLot lot = rfq.getHarvestLot();
            lot.setStatus("NEGOTIATING");
            harvestLotRepository.save(lot);

            // Tự động sinh Hợp Đồng B2B điện tử kèm mã duy nhất
            String contractCode = "HD-" + java.time.Year.now().getValue() + "-" + UUID.randomUUID().toString().substring(0, 4).toUpperCase();
            BigDecimal unitPrice = rfq.getTargetPrice();
            Double quantity = rfq.getRequestedQuantity();
            BigDecimal totalAmount = unitPrice.multiply(BigDecimal.valueOf(quantity));
            BigDecimal depositAmount = totalAmount.multiply(BigDecimal.valueOf(0.3)); // Cọc 30%

            B2bContract contract = B2bContract.builder()
                    .contractCode(contractCode)
                    .rfq(rfq)
                    .harvestLot(lot)
                    .farmer(lot.getFarmer())
                    .buyerName(rfq.getBuyerName())
                    .buyerPhone(rfq.getBuyerPhone())
                    .quantity(quantity)
                    .unitPrice(unitPrice)
                    .totalAmount(totalAmount)
                    .depositAmount(depositAmount)
                    .depositStatus("PENDING_DEPOSIT")
                    .fulfillmentStatus("WAITING_HARVEST")
                    .hubDeliveryDate(rfq.getDeliveryDate())
                    .hubName(rfq.getHubLocation())
                    .build();

            b2bContractRepository.save(contract);
            log.info("Auto created B2B Contract: {} for RFQ: {}", contractCode, rfq.getRfqCode());

        } else if ("COUNTER".equals(action)) {
            rfq.setStatus("COUNTER_OFFER");
            if (request.getCounterPrice() != null) rfq.setCounterPrice(request.getCounterPrice());
            if (request.getCounterQuantity() != null) rfq.setCounterQuantity(request.getCounterQuantity());
        } else if ("REJECT".equals(action)) {
            rfq.setStatus("REJECTED");
            if (request.getRejectReason() != null) rfq.setRejectReason(request.getRejectReason());
        } else {
            throw new IllegalArgumentException("Hành động không hợp lệ: " + action);
        }

        RfqNegotiation saved = rfqNegotiationRepository.save(rfq);
        return mapToRfqResponse(saved);
    }

    // 5. B2B Contracts & QC
    @Transactional(readOnly = true)
    public List<B2bContractResponse> getContracts() {
        User farmer = getCurrentFarmer();
        return b2bContractRepository.findByFarmerOrderByCreatedAtDesc(farmer).stream()
                .map(this::mapToContractResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<B2bContractResponse> trackContractsForBuyer(String query) {
        if (query == null || query.trim().isBlank()) {
            return Collections.emptyList();
        }
        String cleanQuery = query.trim();
        List<B2bContract> list = b2bContractRepository.searchContractsForBuyer(cleanQuery);
        if (list.isEmpty()) {
            Optional<B2bContract> opt = b2bContractRepository.findFirstByContractCodeIgnoreCase(cleanQuery);
            if (opt.isPresent()) {
                list = List.of(opt.get());
            }
        }
        return list.stream().map(this::mapToContractResponse).toList();
    }

    @Transactional
    public B2bContractResponse updateDeliverySchedule(Long contractId, DeliveryScheduleRequest request) {
        B2bContract contract = b2bContractRepository.findById(contractId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy hợp đồng ID: " + contractId));

        contract.setHubDeliveryDate(request.getHubDeliveryDate());
        contract.setHubName(request.getHubName());
        if (request.getTimeSlot() != null) contract.setDeliveryTimeSlot(request.getTimeSlot());
        if (request.getTruckType() != null) contract.setTruckType(request.getTruckType());
        if (request.getNotes() != null) contract.setDeliveryNotes(request.getNotes());
        if ("WAITING_HARVEST".equals(contract.getFulfillmentStatus())) {
            contract.setFulfillmentStatus("HARVESTING");
        }

        B2bContract saved = b2bContractRepository.save(contract);
        return mapToContractResponse(saved);
    }

    @Transactional
    public QcInspectionResponse getContractQc(Long contractId) {
        B2bContract contract = b2bContractRepository.findById(contractId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy hợp đồng ID: " + contractId));

        QcInspection qc = qcInspectionRepository.findByContract(contract).orElseGet(() -> {
            double gross = contract.getQuantity();
            double net = Math.round(gross * 0.98 * 10.0) / 10.0; // 98% đạt chuẩn kho lạnh
            double rejected = Math.round((gross - net) * 10.0) / 10.0;
            String prodName = contract.getHarvestLot() != null ? contract.getHarvestLot().getProductName().toLowerCase() : "";
            double brix = prodName.contains("cà chua") ? 5.8 : (prodName.contains("xà lách") ? 4.5 : 12.8);
            double moisture = prodName.contains("cà chua") ? 93.0 : (prodName.contains("xà lách") ? 95.2 : 85.2);

            return qcInspectionRepository.save(QcInspection.builder()
                    .contract(contract)
                    .grossWeight(gross)
                    .netQualifiedWeight(net)
                    .rejectedWeight(rejected)
                    .qualifiedPercent(98.0)
                    .brixScore(brix)
                    .moisturePercent(moisture)
                    .inspectorName("KS. Trần Hữu Phúc (Trạm Kiểm Định Đức Trọng)")
                    .qcNotes("Nông sản đạt chuẩn VietGAP tươi xanh xuất trạm, nhiệt độ tâm đạt 4.2°C, phế phẩm cuống dập 2% đã loại bỏ tại bàn cân.")
                    .samplePhotoUrl(contract.getHarvestLot() != null ? contract.getHarvestLot().getImageUrl() : "https://images.unsplash.com/photo-1540420773420-3366772f4999?w=600&auto=format&fit=crop&q=80")
                    .inspectedAt(LocalDateTime.now())
                    .build());
        });

        return QcInspectionResponse.builder()
                .id(qc.getId())
                .contractId(contract.getId())
                .contractCode(contract.getContractCode())
                .productName(contract.getHarvestLot() != null ? contract.getHarvestLot().getProductName() : "Nông sản")
                .grossWeight(qc.getGrossWeight())
                .netQualifiedWeight(qc.getNetQualifiedWeight())
                .rejectedWeight(qc.getRejectedWeight())
                .qualifiedPercent(qc.getQualifiedPercent())
                .brixScore(qc.getBrixScore())
                .moisturePercent(qc.getMoisturePercent())
                .inspectorName(qc.getInspectorName())
                .qcNotes(qc.getQcNotes())
                .samplePhotoUrl(qc.getSamplePhotoUrl())
                .inspectedAt(qc.getInspectedAt())
                .build();
    }

    @Transactional(readOnly = true)
    public String generateContractPrintHtml(Long contractId) {
        B2bContract contract = b2bContractRepository.findById(contractId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy hợp đồng ID: " + contractId));

        User farmer = contract.getFarmer();
        FarmerProfile profile = farmer != null ? farmerProfileRepository.findByUser(farmer).orElse(null) : null;
        String farmName = profile != null && profile.getFarmName() != null ? profile.getFarmName() : (farmer != null ? farmer.getFullName() : "HTX Nông Nghiệp HoNa Fresh");
        String pucCode = contract.getHarvestLot() != null && contract.getHarvestLot().getPucCode() != null
                ? contract.getHarvestLot().getPucCode()
                : (profile != null && profile.getPucCode() != null ? profile.getPucCode() : "VN-LDO-PUC-0849");
        String farmerAddress = profile != null && profile.getLocation() != null ? profile.getLocation() : "Đà Lạt, Lâm Đồng";
        String farmerPhone = farmer != null && farmer.getPhone() != null ? farmer.getPhone() : "0912.849.688";
        String bankAcc = profile != null && profile.getBankAccount() != null ? profile.getBankAccount() : "0071001284920";
        String bankName = profile != null && profile.getBankName() != null ? profile.getBankName() : "Vietcombank";
        String bankHolder = profile != null && profile.getBankAccountName() != null ? profile.getBankAccountName() : "HTX NONG NGHIEP HONA FRESH";

        String buyerName = contract.getBuyerName();
        String buyerPhone = contract.getBuyerPhone() != null ? contract.getBuyerPhone() : "0908.776.889";
        String productName = contract.getHarvestLot() != null ? contract.getHarvestLot().getProductName() : "Nông sản tươi VietGAP";
        Double quantity = contract.getQuantity();
        BigDecimal unitPrice = contract.getUnitPrice();
        BigDecimal totalAmount = contract.getTotalAmount();
        BigDecimal depositAmount = contract.getDepositAmount();
        BigDecimal remainingAmount = totalAmount.subtract(depositAmount);

        String hub = contract.getHubName() != null ? contract.getHubName() : "Trạm Lạnh Cross-docking Đức Trọng, Lâm Đồng";
        String deliveryDate = contract.getHubDeliveryDate() != null ? contract.getHubDeliveryDate().toString() : LocalDate.now().plusDays(2).toString();

        return """
        <!DOCTYPE html>
        <html lang="vi">
        <head>
          <meta charset="UTF-8">
          <title>Hợp Đồng Mua Bán Nông Sản Sỉ B2B - %s</title>
          <style>
            body { font-family: 'Times New Roman', serif; margin: 40px; color: #111; line-height: 1.5; }
            .header { text-align: center; margin-bottom: 25px; }
            .header h3 { margin: 0; text-transform: uppercase; font-size: 16px; }
            .header h2 { margin: 8px 0; text-transform: uppercase; font-size: 18px; color: #10542C; }
            .header p { margin: 3px 0; font-size: 13px; font-style: italic; }
            .parties { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px; font-size: 13px; }
            .party-box { border: 1px solid #ccc; padding: 12px; border-radius: 6px; }
            .party-box h4 { margin: 0 0 8px; color: #10542C; font-size: 14px; text-transform: uppercase; border-bottom: 1px dashed #ddd; padding-bottom: 4px; }
            table { width: 100%%; border-collapse: collapse; margin-top: 15px; font-size: 13px; }
            th, td { border: 1px solid #333; padding: 8px 10px; text-align: left; }
            th { background-color: #f2f2f2; text-align: center; }
            .text-center { text-align: center; }
            .text-right { text-align: right; }
            .font-bold { font-weight: bold; }
            .escrow-banner { background-color: #E8F5E9; border-left: 4px solid #2E7D32; padding: 10px 14px; font-size: 13px; margin: 15px 0; border-radius: 4px; }
            .signatures { display: flex; justify-content: space-between; margin-top: 35px; text-align: center; font-size: 13px; }
            .sig-col { width: 30%%; }
            .seal { color: #10542C; border: 2px dashed #10542C; padding: 8px; border-radius: 6px; margin-top: 10px; display: inline-block; font-size: 11px; font-weight: bold; }
          </style>
        </head>
        <body>
          <div class="header">
            <h3>CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</h3>
            <p>Độc lập - Tự do - Hạnh phúc</p>
            <hr style="width: 30%%; margin: 5px auto 15px; border: 0.5px solid #333;">
            <h2>HỢP ĐỒNG KINH TẾ MUA BÁN NÔNG SẢN SỈ B2B</h2>
            <p>(Số: %s - Xác lập điện tử qua Nền tảng HoNa Fresh Ký Quỹ Escrow)</p>
          </div>

          <p style="font-size: 13px; font-style: italic;">
            - Căn cứ Bộ luật Dân sự số 91/2015/QH13 và Luật Thương mại số 36/2005/QH11 của Nước Cộng hòa Xã hội Chủ nghĩa Việt Nam.<br>
            - Căn cứ quy chuẩn kỹ thuật an toàn chuỗi cung ứng lạnh nông sản và quy chế sàn giao dịch B2B HoNa Fresh.
          </p>

          <div class="parties">
            <div class="party-box">
              <h4>BÊN A (BÊN BÁN / NHÀ VƯỜN):</h4>
              <p><strong>Đơn vị:</strong> %s</p>
              <p><strong>Mã số vùng trồng (PUC):</strong> %s</p>
              <p><strong>Địa chỉ:</strong> %s</p>
              <p><strong>Điện thoại:</strong> %s</p>
              <p><strong>Tài khoản thụ hưởng:</strong> %s (%s - %s)</p>
            </div>
            <div class="party-box">
              <h4>BÊN B (BÊN MUA / THƯƠNG LÁI):</h4>
              <p><strong>Đơn vị / Đại diện:</strong> %s</p>
              <p><strong>Số điện thoại:</strong> %s</p>
              <p><strong>Trạm nhận hàng:</strong> %s</p>
              <p><strong>Ngày hẹn giao trạm:</strong> %s</p>
              <p><strong>Phương thức nhận:</strong> Nghiệm thu QC xe lạnh</p>
            </div>
          </div>

          <div class="escrow-banner">
            🛡️ <strong>BẢO CHỨNG KÝ QUỸ ESCROW (BÊN C - SÀN HONA FRESH):</strong> Hợp đồng đã được kích hoạt thành công sau khi Bên B hoàn tất ký quỹ 30%% tiền cọc (<strong>%,.0f VNĐ</strong>). Sàn HoNa Fresh cam kết phong tỏa bảo chứng dòng tiền cho đến khi hoàn tất biên bản kiểm định QC tại Trạm trung chuyển.
          </div>

          <h4>ĐIỀU 1: HÀNG HÓA VÀ GIÁ TRỊ GIAO DỊCH</h4>
          <table>
            <thead>
              <tr>
                <th>Mặt Hàng Nông Sản</th>
                <th>Mã Lô</th>
                <th>Sản Lượng</th>
                <th>Đơn Giá (VNĐ/kg)</th>
                <th>Tổng Trị Giá (VNĐ)</th>
                <th>Cọc Ký Quỹ 30%% (VNĐ)</th>
                <th>Còn Phải Trả 70%% (VNĐ)</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>%s</strong> (Chuẩn VietGAP)</td>
                <td class="text-center">%s</td>
                <td class="text-right">%,.1f kg</td>
                <td class="text-right">%,.0f</td>
                <td class="text-right font-bold">%,.0f</td>
                <td class="text-right font-bold" style="color: #2E7D32;">%,.0f</td>
                <td class="text-right font-bold" style="color: #1565C0;">%,.0f</td>
              </tr>
            </tbody>
          </table>

          <h4>ĐIỀU 2: TIÊU CHUẨN KIỂM ĐỊNH QC VÀ QUYẾT TOÁN</h4>
          <p style="font-size: 13px;">
            1. <strong>Bàn giao tại Trạm Cross-docking:</strong> Bên A có trách nhiệm thu hoạch và vận chuyển hàng đến <em>%s</em> đúng ngày <em>%s</em>.<br>
            2. <strong>Quy chuẩn kiểm tra:</strong> Chuyên viên QC của Sàn tiến hành cân tải trọng thực nhận, đo độ ngọt Brix, độ ẩm và kiểm tra dư lượng thuốc BVTV. Khối lượng đạt chuẩn sẽ là căn cứ cuối cùng để quyết toán tài chính.<br>
            3. <strong>Giải phóng Quỹ Escrow:</strong> Ngay sau khi Bên B xác nhận ePOD hoặc nhận bàn giao hàng đạt chuẩn, Sàn sẽ tự động khấu trừ 3%% phí dịch vụ và chuyển 97%% giá trị thực nhận về STK ngân hàng của Bên A.
          </p>

          <div class="signatures">
            <div class="sig-col">
              <p><strong>ĐẠI DIỆN BÊN A (BÊN BÁN)</strong></p>
              <p style="font-size: 11px; font-style: italic;">(Ký điện tử xác nhận)</p>
              <br><br>
              <p><strong>%s</strong></p>
            </div>
            <div class="sig-col">
              <p><strong>ĐẠI DIỆN BÊN B (BÊN MUA)</strong></p>
              <p style="font-size: 11px; font-style: italic;">(Đã ký quỹ 30%% VietQR)</p>
              <br><br>
              <p><strong>%s</strong></p>
            </div>
            <div class="sig-col">
              <p><strong>TRỌNG TÀI ESCROW (HONA FRESH)</strong></p>
              <p style="font-size: 11px; font-style: italic;">(Ký số và đóng dấu bảo chứng)</p>
              <div class="seal">
                ✓ XÁC THỰC KÝ QUỸ ESCROW<br>
                Mã HĐ: %s<br>
                Trạng Thái: ĐÃ BẢO CHỨNG 30%%
              </div>
            </div>
          </div>
        </body>
        </html>
        """.formatted(
                contract.getContractCode(),
                contract.getContractCode(),
                farmName,
                pucCode,
                farmerAddress,
                farmerPhone,
                bankAcc,
                bankHolder,
                bankName,
                buyerName,
                buyerPhone,
                hub,
                deliveryDate,
                depositAmount,
                productName,
                contract.getHarvestLot() != null ? contract.getHarvestLot().getLotCode() : "LOT-2026-DL01",
                quantity,
                unitPrice,
                totalAmount,
                depositAmount,
                remainingAmount,
                hub,
                deliveryDate,
                farmName,
                buyerName,
                contract.getContractCode()
        );
    }

    // 6. Settlements & Form 01/TNDN
    @Transactional(readOnly = true)
    public List<SettlementResponse> getSettlements() {
        User farmer = getCurrentFarmer();
        return settlementRepository.findByFarmerOrderByCreatedAtDesc(farmer).stream()
                .map(this::mapToSettlementResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public String generatePdf01Tndn(Long settlementId) {
        Settlement s = settlementRepository.findById(settlementId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy quyết toán ID: " + settlementId));

        User farmer = s.getFarmer();
        FarmerProfile profile = farmerProfileRepository.findByUser(farmer).orElse(null);
        B2bContract contract = s.getContract();
        String farmName = profile != null ? profile.getFarmName() : farmer.getFullName();
        String cccd = profile != null && profile.getIdCardNumber() != null ? profile.getIdCardNumber() : "068095001234";
        String address = profile != null && profile.getLocation() != null ? profile.getLocation() : farmer.getAddress();
        String pucCode = profile != null && profile.getPucCode() != null ? profile.getPucCode() : "VN-LDO-PUC-0849";
        String productName = contract != null && contract.getHarvestLot() != null ? contract.getHarvestLot().getProductName() : "Nông sản tươi";

        return """
        <!DOCTYPE html>
        <html lang="vi">
        <head>
          <meta charset="UTF-8">
          <title>Bảng Kê Thu Mua Hàng Hóa Mẫu 01/TNDN - %s</title>
          <style>
            body { font-family: 'Times New Roman', serif; margin: 40px; color: #111; line-height: 1.5; }
            .header { text-align: center; margin-bottom: 25px; }
            .header h3 { margin: 0; text-transform: uppercase; font-size: 16px; }
            .header h2 { margin: 8px 0; text-transform: uppercase; font-size: 18px; color: #10542C; }
            .header p { margin: 3px 0; font-size: 13px; font-style: italic; }
            .info-box { border: 1px solid #ddd; padding: 15px; border-radius: 6px; margin-bottom: 20px; font-size: 14px; }
            .info-row { display: flex; justify-content: space-between; margin-bottom: 6px; }
            table { width: 100%%; border-collapse: collapse; margin-top: 15px; font-size: 14px; }
            th, td { border: 1px solid #333; padding: 8px 10px; text-align: left; }
            th { background-color: #f2f2f2; text-align: center; }
            .text-center { text-align: center; }
            .text-right { text-align: right; }
            .font-bold { font-weight: bold; }
            .signatures { display: flex; justify-content: space-between; margin-top: 40px; text-align: center; }
            .sig-col { width: 45%%; }
            .seal { color: #10542C; border: 2px dashed #10542C; padding: 10px; border-radius: 8px; margin-top: 15px; display: inline-block; font-size: 12px; font-weight: bold; }
          </style>
        </head>
        <body>
          <div class="header">
            <h3>CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</h3>
            <p>Độc lập - Tự do - Hạnh phúc</p>
            <hr style="width: 30%%; margin: 5px auto 15px; border: 0.5px solid #333;">
            <h2>BẢNG KÊ THU MUA HÀNG HÓA NÔNG SẢN KHÔNG CÓ HÓA ĐƠN</h2>
            <p>(Mẫu số 01/TNDN - Ban hành kèm theo Thông tư số 78/2021/TT-BTC của Bộ Tài chính)</p>
          </div>

          <div class="info-box">
            <div class="info-row"><span><strong>Đơn vị thu mua bảo chứng:</strong> CÔNG TY CỔ PHẦN NỀN TẢNG NÔNG SẢN HONA FRESH B2B</span><span><strong>Mã Quyết Toán:</strong> %s</span></div>
            <div class="info-row"><span><strong>Người trực tiếp sản xuất (Bán hàng):</strong> %s</span><span><strong>Số CCCD:</strong> %s</span></div>
            <div class="info-row"><span><strong>Địa chỉ vùng trồng:</strong> %s</span><span><strong>Mã số vùng trồng (PUC):</strong> %s</span></div>
            <div class="info-row"><span><strong>Hợp đồng B2B tham chiếu:</strong> %s</span><span><strong>Tài khoản thụ hưởng:</strong> %s (%s - %s)</span></div>
          </div>

          <table>
            <thead>
              <tr>
                <th style="width: 40px;">STT</th>
                <th>Tên Mặt Hàng Nông Sản</th>
                <th style="width: 70px;">ĐVT</th>
                <th style="width: 120px;">Sản Lượng Đạt QC</th>
                <th style="width: 130px;">Đơn Giá (VNĐ/kg)</th>
                <th style="width: 150px;">Thành Tiền (VNĐ)</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td class="text-center">1</td>
                <td><strong>%s</strong> (Đạt chuẩn VietGAP/GlobalGAP)</td>
                <td class="text-center">Kg</td>
                <td class="text-right">%,.1f</td>
                <td class="text-right">%,.0f</td>
                <td class="text-right">%,.0f</td>
              </tr>
              <tr>
                <td colspan="5" class="text-right font-bold">Tổng Giá Trị Hàng Hóa:</td>
                <td class="text-right font-bold">%,.0f đ</td>
              </tr>
              <tr>
                <td colspan="5" class="text-right">Phí Dịch Vụ Nền Tảng Sàn (3%%):</td>
                <td class="text-right"> - %,.0f đ</td>
              </tr>
              <tr style="background-color: #F9F9F5;">
                <td colspan="5" class="text-right font-bold" style="color: #10542C; font-size: 15px;">THỰC NHẬN GIẢI NGÂN VÀO TÀI KHOẢN:</td>
                <td class="text-right font-bold" style="color: #10542C; font-size: 15px;">%,.0f đ</td>
              </tr>
            </tbody>
          </table>

          <div style="margin-top: 15px; font-size: 13px; font-style: italic;">
            * Ghi chú: Căn cứ Điều 4 Thông tư số 96/2015/TT-BTC và Thông tư số 78/2021/TT-BTC, bảng kê này là chứng từ hợp pháp để tính chi phí hợp lý được trừ khi xác định thuế TNDN.
          </div>

          <div class="signatures">
            <div class="sig-col">
              <p><strong>NGƯỜI BÁN HÀNG (NÔNG DÂN)</strong></p>
              <p style="font-size: 12px; font-style: italic;">(Ký, ghi rõ họ tên)</p>
              <br><br><br>
              <p><strong>%s</strong></p>
            </div>
            <div class="sig-col">
              <p><strong>ĐẠI DIỆN SÀN HONA FRESH B2B (ESCROW)</strong></p>
              <p style="font-size: 12px; font-style: italic;">(Ký số và đóng dấu điện tử)</p>
              <div class="seal">
                ✓ CHỨNG TỪ XÁC THỰC BẢO CHỨNG SÀN<br>
                Mã Giao Dịch: %s<br>
                Trạng Thái: ĐÃ GIẢI NGÂN
              </div>
            </div>
          </div>
        </body>
        </html>
        """.formatted(
                s.getSettlementCode(),
                s.getSettlementCode(),
                farmName,
                cccd,
                address,
                pucCode,
                contract != null ? contract.getContractCode() : "N/A",
                s.getBankAccount(),
                s.getBankAccountName(),
                s.getBankName(),
                productName,
                s.getQualifiedWeight(),
                s.getUnitPrice(),
                s.getGrossAmount(),
                s.getGrossAmount(),
                s.getPlatformFee(),
                s.getPayoutAmount(),
                farmName,
                s.getBankReference() != null ? s.getBankReference() : "FT2610269871"
        );
    }

    @Transactional
    public RfqResponse createPublicRfqOrDeposit(PublicRfqDepositRequest request) {
        // Tìm harvest lot tương ứng hoặc fallback
        HarvestLot lot = null;
        if (request.getHarvestLotId() != null) {
            lot = harvestLotRepository.findById(request.getHarvestLotId()).orElse(null);
        }
        if (lot == null) {
            List<HarvestLot> lots = harvestLotRepository.findAll();
            if (!lots.isEmpty()) {
                lot = lots.get(0);
            } else {
                User farmer = getCurrentFarmer();
                lot = harvestLotRepository.save(HarvestLot.builder()
                        .lotCode("LOT-2026-DL01")
                        .productName(request.getProductName() != null ? request.getProductName() : "Lô Nông Sản Chuẩn VietGAP")
                        .categorySlug("rau-an-la")
                        .imageUrl("https://images.unsplash.com/photo-1540420773420-3366772f4999?w=600&auto=format&fit=crop&q=80")
                        .pucCode("VN-LDO-PUC-0849")
                        .harvestDate(LocalDate.now().plusDays(2))
                        .expiryDate(LocalDate.now().plusDays(15))
                        .totalQuantity(10000.0)
                        .remainingQuantity(10000.0)
                        .unit("kg")
                        .minTemp(2.0)
                        .maxTemp(6.0)
                        .status("OPEN")
                        .farmer(farmer)
                        .hubLocation(request.getHubLocation() != null ? request.getHubLocation() : "Trạm Lạnh Cross-docking Đức Trọng, Lâm Đồng")
                        .build());
            }
        }

        User farmer = lot.getFarmer() != null ? lot.getFarmer() : getCurrentFarmer();
        String rfqCode = "RFQ-" + (int)(100000 + Math.random() * 900000);

        RfqNegotiation rfq = RfqNegotiation.builder()
                .rfqCode(rfqCode)
                .harvestLot(lot)
                .buyerName(request.getBuyerName())
                .buyerPhone(request.getBuyerPhone())
                .buyerCompany(request.getBuyerCompany() != null && !request.getBuyerCompany().isBlank()
                        ? request.getBuyerCompany()
                        : "Vựa Nông Sản " + request.getBuyerName())
                .requestedQuantity(request.getRequestedQuantity())
                .targetPrice(request.getTargetPrice())
                .deliveryDate(request.getDeliveryDate() != null ? request.getDeliveryDate() : LocalDate.now().plusDays(3))
                .hubLocation(request.getHubLocation() != null ? request.getHubLocation() : "Chợ Đầu Mối Nông Sản Thủ Đức, TP.HCM")
                .status("PENDING")
                .build();

        boolean isDepositPaid = Boolean.TRUE.equals(request.getIsDepositPaid());
        if (isDepositPaid) {
            rfq.setStatus("ACCEPTED");
        }

        RfqNegotiation savedRfq = rfqNegotiationRepository.save(rfq);

        // Nếu đã cọc 30% thì sinh ngay B2bContract với trạng thái DEPOSIT_PAID
        if (isDepositPaid) {
            lot.setStatus("NEGOTIATING");
            double newRemaining = Math.max(0, lot.getRemainingQuantity() - request.getRequestedQuantity());
            lot.setRemainingQuantity(newRemaining);
            harvestLotRepository.save(lot);

            String contractCode = "HD-" + java.time.Year.now().getValue() + "-" + UUID.randomUUID().toString().substring(0, 4).toUpperCase();
            BigDecimal unitPrice = request.getTargetPrice();
            Double quantity = request.getRequestedQuantity();
            BigDecimal totalAmount = unitPrice.multiply(BigDecimal.valueOf(quantity));
            BigDecimal depositAmount = request.getDepositAmount() != null && request.getDepositAmount().compareTo(BigDecimal.ZERO) > 0
                    ? request.getDepositAmount()
                    : totalAmount.multiply(BigDecimal.valueOf(0.3));

            B2bContract contract = B2bContract.builder()
                    .contractCode(contractCode)
                    .rfq(savedRfq)
                    .harvestLot(lot)
                    .farmer(farmer)
                    .buyerName(request.getBuyerName())
                    .buyerPhone(request.getBuyerPhone())
                    .quantity(quantity)
                    .unitPrice(unitPrice)
                    .totalAmount(totalAmount)
                    .depositAmount(depositAmount)
                    .depositStatus("DEPOSIT_PAID")
                    .fulfillmentStatus("WAITING_HARVEST")
                    .depositPaidAt(LocalDateTime.now())
                    .hubDeliveryDate(savedRfq.getDeliveryDate())
                    .hubName(savedRfq.getHubLocation())
                    .build();

            b2bContractRepository.save(contract);
            log.info("Thương lái đặt cọc 30% thành công -> Tạo Hợp đồng B2B: {} cho RFQ: {}", contractCode, rfqCode);
        }

        return mapToRfqResponse(savedRfq);
    }

    @Transactional
    public SettlementResponse settleContract(Long contractId) {
        B2bContract contract = b2bContractRepository.findById(contractId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy hợp đồng ID: " + contractId));

        var existingSettlement = settlementRepository.findByContract(contract);
        if (existingSettlement.isPresent()) {
            return mapToSettlementResponse(existingSettlement.get());
        }

        // Lấy hoặc tạo kết quả QC nếu chưa có
        QcInspection qc = qcInspectionRepository.findByContract(contract).orElseGet(() -> {
            double gross = contract.getQuantity();
            double net = Math.round(gross * 0.98 * 10.0) / 10.0; // 98% đạt chuẩn
            double rejected = Math.round((gross - net) * 10.0) / 10.0;
            return qcInspectionRepository.save(QcInspection.builder()
                    .contract(contract)
                    .grossWeight(gross)
                    .netQualifiedWeight(net)
                    .rejectedWeight(rejected)
                    .qualifiedPercent(98.0)
                    .brixScore(12.5)
                    .moisturePercent(84.0)
                    .inspectorName("KS. Trần Hữu Phúc")
                    .qcNotes("Màu sắc đạt chuẩn VietGAP, cuống xanh tươi, không dư lượng thuốc BVTV")
                    .samplePhotoUrl(contract.getHarvestLot() != null ? contract.getHarvestLot().getImageUrl() : "https://images.unsplash.com/photo-1540420773420-3366772f4999?w=600&auto=format&fit=crop&q=80")
                    .inspectedAt(LocalDateTime.now())
                    .build());
        });

        User farmer = contract.getFarmer();
        FarmerProfile profile = farmerProfileRepository.findByUser(farmer).orElse(null);

        double qualifiedWeight = qc.getNetQualifiedWeight();
        BigDecimal unitPrice = contract.getUnitPrice();
        BigDecimal grossAmount = unitPrice.multiply(BigDecimal.valueOf(qualifiedWeight));
        BigDecimal platformFee = grossAmount.multiply(BigDecimal.valueOf(0.03));
        BigDecimal payoutAmount = grossAmount.subtract(platformFee);

        String bankAcc = profile != null && profile.getBankAccount() != null ? profile.getBankAccount() : "5400205219999";
        String bankName = profile != null && profile.getBankName() != null ? profile.getBankName() : "Agribank";
        String bankAccName = profile != null && profile.getBankAccountName() != null ? profile.getBankAccountName() : "HTX RAU SACH DA LAT GAP";

        String taxType = (profile != null && "COOPERATIVE".equalsIgnoreCase(profile.getFarmerType()))
                ? "HOA_DON_KCT" : "FORM_01_TNDN";

        Settlement settlement = Settlement.builder()
                .settlementCode("STL-" + java.time.Year.now().getValue() + "-" + UUID.randomUUID().toString().substring(0, 4).toUpperCase())
                .contract(contract)
                .farmer(farmer)
                .qualifiedWeight(qualifiedWeight)
                .unitPrice(unitPrice)
                .grossAmount(grossAmount)
                .platformFeePercent(3.0)
                .platformFee(platformFee)
                .payoutAmount(payoutAmount)
                .bankAccount(bankAcc)
                .bankName(bankName)
                .bankAccountName(bankAccName)
                .bankReference("FT" + System.currentTimeMillis() / 1000)
                .isPaid(true)
                .paidAt(LocalDateTime.now())
                .taxFormType(taxType)
                .build();

        Settlement saved = settlementRepository.save(settlement);

        // Cập nhật trạng thái hợp đồng thành COMPLETED
        contract.setFulfillmentStatus("COMPLETED");
        contract.setDepositStatus("DEPOSIT_PAID");
        b2bContractRepository.save(contract);

        return mapToSettlementResponse(saved);
    }

    @Transactional(readOnly = true)
    public String generateInvoiceKct(Long settlementId) {
        Settlement s = settlementRepository.findById(settlementId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy quyết toán ID: " + settlementId));

        User farmer = s.getFarmer();
        FarmerProfile profile = farmerProfileRepository.findByUser(farmer).orElse(null);
        B2bContract contract = s.getContract();
        String farmName = profile != null ? profile.getFarmName() : farmer.getFullName();
        String taxCode = profile != null && profile.getTaxCode() != null ? profile.getTaxCode() : "5801456789";
        String address = profile != null && profile.getLocation() != null ? profile.getLocation() : farmer.getAddress();
        String pucCode = profile != null && profile.getPucCode() != null ? profile.getPucCode() : "VN-LDO-PUC-0849";
        String productName = contract != null && contract.getHarvestLot() != null ? contract.getHarvestLot().getProductName() : "Nông sản tươi";

        return """
        <!DOCTYPE html>
        <html lang="vi">
        <head>
          <meta charset="UTF-8">
          <title>Hóa Đơn Điện Tử B2B (KCT) - %s</title>
          <style>
            body { font-family: 'Times New Roman', serif; margin: 40px; color: #111; line-height: 1.5; }
            .header { text-align: center; margin-bottom: 25px; }
            .header h3 { margin: 0; text-transform: uppercase; font-size: 16px; }
            .header h2 { margin: 8px 0; text-transform: uppercase; font-size: 20px; color: #10542C; }
            .header p { margin: 3px 0; font-size: 13px; font-style: italic; }
            .invoice-meta { display: flex; justify-content: space-between; border-bottom: 2px solid #10542C; padding-bottom: 10px; margin-bottom: 15px; font-size: 14px; }
            .info-box { border: 1px solid #ddd; padding: 15px; border-radius: 6px; margin-bottom: 20px; font-size: 14px; }
            .info-row { display: flex; justify-content: space-between; margin-bottom: 6px; }
            table { width: 100%%; border-collapse: collapse; margin-top: 15px; font-size: 14px; }
            th, td { border: 1px solid #333; padding: 8px 10px; text-align: left; }
            th { background-color: #f2f2f2; text-align: center; }
            .text-center { text-align: center; }
            .text-right { text-align: right; }
            .font-bold { font-weight: bold; }
            .signatures { display: flex; justify-content: space-between; margin-top: 40px; text-align: center; }
            .sig-col { width: 45%%; }
            .seal { color: #10542C; border: 2px dashed #10542C; padding: 10px; border-radius: 8px; margin-top: 15px; display: inline-block; font-size: 12px; font-weight: bold; }
          </style>
        </head>
        <body>
          <div class="header">
            <h3>HỢP TÁC XÃ NÔNG NGHIỆP CÔNG NGHỆ CAO ĐÀ LẠT</h3>
            <p>Địa chỉ: %s</p>
            <p>Mã số thuế: <strong>%s</strong> | Hotline: 0988.100.222</p>
            <hr style="width: 40%%; margin: 10px auto; border: 0.5px solid #10542C;">
            <h2>HÓA ĐƠN BÁN HÀNG NÔNG SẢN (ĐỐI TƯỢNG KCT)</h2>
            <p>(Theo Nghị định 123/2020/NĐ-CP & Thông tư 78/2021/TT-BTC - Đối tượng Không Chịu Thuế GTGT)</p>
          </div>

          <div class="invoice-meta">
            <div>
              <span>Ký hiệu mẫu số: <strong>1C26TND</strong></span><br>
              <span>Ký hiệu hóa đơn: <strong>C26MHD</strong></span>
            </div>
            <div style="text-align: right;">
              <span>Số hóa đơn: <strong style="color: #E53935; font-size: 16px;">%s</strong></span><br>
              <span>Ngày lập: <strong>%s</strong></span>
            </div>
          </div>

          <div class="info-box">
            <div class="info-row"><span><strong>Đơn vị bán hàng:</strong> %s</span><span><strong>Mã vùng trồng (PUC):</strong> %s</span></div>
            <div class="info-row"><span><strong>Đơn vị thu mua / Sàn bảo chứng:</strong> CÔNG TY CP NỀN TẢNG NÔNG SẢN HONA FRESH B2B</span><span><strong>Hợp đồng:</strong> %s</span></div>
            <div class="info-row"><span><strong>Thương lái nhận hàng:</strong> %s</span><span><strong>Tài khoản thụ hưởng:</strong> %s (%s)</span></div>
          </div>

          <table>
            <thead>
              <tr>
                <th style="width: 40px;">STT</th>
                <th>Tên Hàng Hóa, Dịch Vụ</th>
                <th style="width: 70px;">ĐVT</th>
                <th style="width: 120px;">Số Lượng (QC)</th>
                <th style="width: 130px;">Đơn Giá (VNĐ)</th>
                <th style="width: 150px;">Thành Tiền (VNĐ)</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td class="text-center">1</td>
                <td><strong>%s</strong><br><small style="color: #555;">(Nông sản trồng trọt sơ chế chưa chế biến thành sản phẩm khác - KCT)</small></td>
                <td class="text-center">Kg</td>
                <td class="text-right">%,.1f</td>
                <td class="text-right">%,.0f</td>
                <td class="text-right">%,.0f</td>
              </tr>
              <tr>
                <td colspan="5" class="text-right font-bold">Cộng Tiền Hàng (KCT):</td>
                <td class="text-right font-bold">%,.0f đ</td>
              </tr>
              <tr>
                <td colspan="5" class="text-right">Thuế Suất GTGT:</td>
                <td class="text-right font-bold">KCT (Không chịu thuế)</td>
              </tr>
              <tr>
                <td colspan="5" class="text-right">Phí Dịch Vụ Sàn (3%%):</td>
                <td class="text-right"> - %,.0f đ</td>
              </tr>
              <tr style="background-color: #F0F7F2;">
                <td colspan="5" class="text-right font-bold" style="color: #10542C; font-size: 15px;">TỔNG THANH TOÁN THỰC NHẬN:</td>
                <td class="text-right font-bold" style="color: #10542C; font-size: 15px;">%,.0f đ</td>
              </tr>
            </tbody>
          </table>

          <div style="margin-top: 15px; font-size: 13px; font-style: italic;">
            * Căn cứ Khoản 1 Điều 4 Thông tư số 219/2013/TT-BTC, sản phẩm cây trồng chưa chế biến thành các sản phẩm khác hoặc chỉ qua sơ chế thông thường của tổ chức, cá nhân tự sản xuất bán ra thuộc đối tượng KHÔNG CHỊU THUẾ GTGT.
          </div>

          <div class="signatures">
            <div class="sig-col">
              <p><strong>NGƯỜI MUA HÀNG</strong></p>
              <p style="font-size: 12px; font-style: italic;">(Ký điện tử xác nhận)</p>
              <br><br><br>
              <p><strong>%s</strong></p>
            </div>
            <div class="sig-col">
              <p><strong>NGƯỜI BÁN HÀNG (HỢP TÁC XÃ)</strong></p>
              <p style="font-size: 12px; font-style: italic;">(Chữ ký số hợp chuẩn CKS)</p>
              <div class="seal">
                ✓ ĐÃ KÝ ĐIỆN TỬ BỞI: %s<br>
                MST: %s<br>
                Ngày Ký: %s
              </div>
            </div>
          </div>
        </body>
        </html>
        """.formatted(
                s.getSettlementCode(),
                address,
                taxCode,
                s.getSettlementCode().replace("STL-", "HD-KCT-"),
                s.getPaidAt() != null ? s.getPaidAt().toLocalDate().toString() : LocalDate.now().toString(),
                farmName,
                pucCode,
                contract != null ? contract.getContractCode() : "N/A",
                contract != null ? contract.getBuyerName() : "Thương lái thu mua",
                s.getBankAccount(),
                s.getBankName(),
                productName,
                s.getQualifiedWeight(),
                s.getUnitPrice(),
                s.getGrossAmount(),
                s.getGrossAmount(),
                s.getPlatformFee(),
                s.getPayoutAmount(),
                contract != null ? contract.getBuyerName() : "Thương Lái Thu Mua",
                farmName,
                taxCode,
                s.getPaidAt() != null ? s.getPaidAt().toLocalDate().toString() : LocalDate.now().toString()
        );
    }

    // Helper mappers
    private FarmerProfileResponse mapToProfileResponse(FarmerProfile profile, User user) {
        return FarmerProfileResponse.builder()
                .id(profile.getId())
                .farmName(profile.getFarmName())
                .farmerType(profile.getFarmerType())
                .pucCode(profile.getPucCode())
                .certifications(profile.getCertifications())
                .certExpiryDate(profile.getCertExpiryDate())
                .certImageUrl(profile.getCertImageUrl())
                .taxCode(profile.getTaxCode())
                .idCardNumber(profile.getIdCardNumber())
                .bankAccount(profile.getBankAccount())
                .bankAccountName(profile.getBankAccountName())
                .bankName(profile.getBankName())
                .location(profile.getLocation())
                .cultivatedArea(profile.getCultivatedArea())
                .username(user.getUsername())
                .fullName(user.getFullName())
                .phone(user.getPhone())
                .email(user.getEmail())
                .build();
    }

    private HarvestLotResponse mapToLotResponse(HarvestLot lot) {
        return HarvestLotResponse.builder()
                .id(lot.getId())
                .lotCode(lot.getLotCode())
                .productName(lot.getProductName())
                .categorySlug(lot.getCategorySlug())
                .imageUrl(lot.getImageUrl())
                .pucCode(lot.getPucCode())
                .harvestDate(lot.getHarvestDate())
                .expiryDate(lot.getExpiryDate())
                .totalQuantity(lot.getTotalQuantity())
                .remainingQuantity(lot.getRemainingQuantity())
                .unit(lot.getUnit())
                .minTemp(lot.getMinTemp())
                .maxTemp(lot.getMaxTemp())
                .tierPricingJson(lot.getTierPricingJson())
                .status(lot.getStatus())
                .hubLocation(lot.getHubLocation())
                .farmerName(lot.getFarmer() != null ? lot.getFarmer().getFullName() : "")
                .createdAt(lot.getCreatedAt())
                .build();
    }

    private RfqResponse mapToRfqResponse(RfqNegotiation rfq) {
        return RfqResponse.builder()
                .id(rfq.getId())
                .rfqCode(rfq.getRfqCode())
                .harvestLotId(rfq.getHarvestLot() != null ? rfq.getHarvestLot().getId() : null)
                .harvestLotCode(rfq.getHarvestLot() != null ? rfq.getHarvestLot().getLotCode() : null)
                .productName(rfq.getHarvestLot() != null ? rfq.getHarvestLot().getProductName() : "")
                .buyerName(rfq.getBuyerName())
                .buyerPhone(rfq.getBuyerPhone())
                .buyerCompany(rfq.getBuyerCompany())
                .requestedQuantity(rfq.getRequestedQuantity())
                .targetPrice(rfq.getTargetPrice())
                .counterPrice(rfq.getCounterPrice())
                .counterQuantity(rfq.getCounterQuantity())
                .rejectReason(rfq.getRejectReason())
                .deliveryDate(rfq.getDeliveryDate())
                .hubLocation(rfq.getHubLocation())
                .status(rfq.getStatus())
                .createdAt(rfq.getCreatedAt())
                .build();
    }

    private SettlementResponse mapToSettlementResponse(Settlement s) {
        B2bContract contract = s.getContract();
        return SettlementResponse.builder()
                .id(s.getId())
                .settlementCode(s.getSettlementCode())
                .contractId(contract != null ? contract.getId() : null)
                .contractCode(contract != null ? contract.getContractCode() : null)
                .productName(contract != null && contract.getHarvestLot() != null ? contract.getHarvestLot().getProductName() : "Nông sản")
                .qualifiedWeight(s.getQualifiedWeight())
                .unitPrice(s.getUnitPrice())
                .grossAmount(s.getGrossAmount())
                .platformFeePercent(s.getPlatformFeePercent())
                .platformFee(s.getPlatformFee())
                .payoutAmount(s.getPayoutAmount())
                .bankAccount(s.getBankAccount())
                .bankName(s.getBankName())
                .bankAccountName(s.getBankAccountName())
                .bankReference(s.getBankReference())
                .isPaid(s.isPaid())
                .paidAt(s.getPaidAt())
                .taxFormType(s.getTaxFormType())
                .createdAt(s.getCreatedAt())
                .build();
    }

    private B2bContractResponse mapToContractResponse(B2bContract c) {
        boolean hasQc = qcInspectionRepository.findByContract(c).isPresent();
        User farmer = c.getFarmer();
        FarmerProfile profile = farmer != null ? farmerProfileRepository.findByUser(farmer).orElse(null) : null;
        Long stlId = settlementRepository.findByContract(c).map(Settlement::getId).orElse(null);

        BigDecimal total = c.getTotalAmount() != null ? c.getTotalAmount() : BigDecimal.ZERO;
        BigDecimal deposit = c.getDepositAmount() != null ? c.getDepositAmount() : BigDecimal.ZERO;
        BigDecimal remaining = total.subtract(deposit);
        if (remaining.compareTo(BigDecimal.ZERO) < 0) remaining = BigDecimal.ZERO;

        String pucCode = (c.getHarvestLot() != null && c.getHarvestLot().getPucCode() != null)
                ? c.getHarvestLot().getPucCode()
                : (profile != null && profile.getPucCode() != null ? profile.getPucCode() : "VN-LDO-PUC-0849");
        String farmName = profile != null && profile.getFarmName() != null ? profile.getFarmName() : (farmer != null ? farmer.getFullName() : "Nông trại VietGAP HoNa Fresh");
        String farmerPhone = farmer != null && farmer.getPhone() != null ? farmer.getPhone() : "0912.849.688";
        String farmerAddress = profile != null && profile.getLocation() != null ? profile.getLocation() : (farmer != null ? farmer.getAddress() : "Đà Lạt, Lâm Đồng");
        String img = c.getHarvestLot() != null ? c.getHarvestLot().getImageUrl() : "https://images.unsplash.com/photo-1540420773420-3366772f4999?w=600";

        return B2bContractResponse.builder()
                .id(c.getId())
                .contractCode(c.getContractCode())
                .rfqId(c.getRfq() != null ? c.getRfq().getId() : null)
                .rfqCode(c.getRfq() != null ? c.getRfq().getRfqCode() : null)
                .harvestLotId(c.getHarvestLot() != null ? c.getHarvestLot().getId() : null)
                .lotCode(c.getHarvestLot() != null ? c.getHarvestLot().getLotCode() : null)
                .productName(c.getHarvestLot() != null ? c.getHarvestLot().getProductName() : "Nông sản")
                .imageUrl(img)
                .buyerName(c.getBuyerName())
                .buyerPhone(c.getBuyerPhone())
                .quantity(c.getQuantity())
                .unitPrice(c.getUnitPrice())
                .totalAmount(total)
                .depositAmount(deposit)
                .remainingAmount(remaining)
                .depositStatus(c.getDepositStatus())
                .fulfillmentStatus(c.getFulfillmentStatus())
                .depositPaidAt(c.getDepositPaidAt())
                .hubDeliveryDate(c.getHubDeliveryDate())
                .hubName(c.getHubName())
                .deliveryTimeSlot(c.getDeliveryTimeSlot())
                .truckType(c.getTruckType())
                .deliveryNotes(c.getDeliveryNotes())
                .createdAt(c.getCreatedAt())
                .hasQc(hasQc)
                .pucCode(pucCode)
                .farmName(farmName)
                .farmerPhone(farmerPhone)
                .farmerAddress(farmerAddress)
                .settlementId(stlId)
                .build();
    }
}
