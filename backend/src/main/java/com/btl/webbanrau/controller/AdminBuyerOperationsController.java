package com.btl.webbanrau.controller;

import com.btl.webbanrau.dto.request.QcInspectionRequest;
import com.btl.webbanrau.dto.request.TelemetryRequest;
import com.btl.webbanrau.dto.response.ApiResponse;
import com.btl.webbanrau.model.B2BContract;
import com.btl.webbanrau.model.HubInspection;
import com.btl.webbanrau.model.IotSensorLog;
import com.btl.webbanrau.repository.B2BContractRepository;
import com.btl.webbanrau.repository.HubInspectionRepository;
import com.btl.webbanrau.repository.IotSensorLogRepository;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.Map;

@RestController
@RequestMapping("/admin/buyer")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class AdminBuyerOperationsController {
    private final B2BContractRepository contractRepository;
    private final HubInspectionRepository inspectionRepository;
    private final IotSensorLogRepository sensorLogRepository;

    @PostMapping("/contracts/{contractId}/qc-report")
    public ApiResponse<Map<String, Object>> createQcReport(@PathVariable Long contractId, @Valid @RequestBody QcInspectionRequest request) {
        B2BContract contract = getContract(contractId);
        BigDecimal rejected = request.getRejectedWeightKg() == null ? BigDecimal.ZERO : request.getRejectedWeightKg();
        if (request.getQualifiedWeightKg().add(rejected).compareTo(request.getReceivedWeightKg()) > 0) {
            throw new IllegalArgumentException("Khối lượng đạt và loại không được lớn hơn khối lượng nhận");
        }
        HubInspection inspection = inspectionRepository.save(HubInspection.builder().contract(contract).receivedWeightKg(request.getReceivedWeightKg()).qualifiedWeightKg(request.getQualifiedWeightKg()).rejectedWeightKg(rejected).brixDegree(request.getBrixDegree()).moisturePercent(request.getMoisturePercent()).qcNote(request.getQcNote()).build());
        return ApiResponse.success("Đã ghi nhận kết quả QC", inspectionView(inspection));
    }

    @PostMapping("/contracts/{contractId}/telemetry")
    public ApiResponse<Map<String, Object>> createTelemetry(@PathVariable Long contractId, @Valid @RequestBody TelemetryRequest request) {
        B2BContract contract = getContract(contractId);
        boolean alert = request.getTemperature().compareTo(new BigDecimal("2.0")) < 0 || request.getTemperature().compareTo(new BigDecimal("6.0")) > 0;
        IotSensorLog log = sensorLogRepository.save(IotSensorLog.builder().contract(contract).temperature(request.getTemperature()).humidity(request.getHumidity()).alert(alert).recordedAt(LocalDateTime.now()).build());
        return ApiResponse.success("Đã ghi nhận dữ liệu IoT", sensorView(log));
    }

    private B2BContract getContract(Long id) {
        return contractRepository.findById(id).orElseThrow(() -> new IllegalArgumentException("Không tìm thấy hợp đồng"));
    }

    private Map<String, Object> inspectionView(HubInspection item) {
        Map<String, Object> view = new LinkedHashMap<>();
        view.put("id", item.getId()); view.put("contractId", item.getContract().getId()); view.put("receivedWeightKg", item.getReceivedWeightKg());
        view.put("qualifiedWeightKg", item.getQualifiedWeightKg()); view.put("rejectedWeightKg", item.getRejectedWeightKg()); view.put("brixDegree", item.getBrixDegree());
        view.put("moisturePercent", item.getMoisturePercent()); view.put("qcNote", item.getQcNote()); view.put("createdAt", item.getCreatedAt());
        return view;
    }

    private Map<String, Object> sensorView(IotSensorLog item) {
        Map<String, Object> view = new LinkedHashMap<>();
        view.put("id", item.getId()); view.put("contractId", item.getContract().getId()); view.put("temperature", item.getTemperature());
        view.put("humidity", item.getHumidity()); view.put("alert", item.isAlert()); view.put("recordedAt", item.getRecordedAt());
        return view;
    }
}
