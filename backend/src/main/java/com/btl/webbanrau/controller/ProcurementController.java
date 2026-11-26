package com.btl.webbanrau.controller;

import com.btl.webbanrau.dto.request.CreateProcurementQuoteDto;
import com.btl.webbanrau.dto.request.CreateProcurementRequestDto;
import com.btl.webbanrau.dto.response.ApiResponse;
import com.btl.webbanrau.dto.response.ProcurementQuoteResponse;
import com.btl.webbanrau.dto.response.ProcurementRequestResponse;
import com.btl.webbanrau.service.ProcurementService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/procurements")
@RequiredArgsConstructor
@Tag(name = "B2B Procurement Board", description = "Sàn chào mua B2B: Thương lái đăng tin cần thu mua & Nhà vườn gửi báo giá từ lô đã duyệt")
public class ProcurementController {

    private final ProcurementService procurementService;

    @GetMapping
    @Operation(summary = "Lấy danh sách tin tìm nguồn cung B2B trên Sàn Chào Mua")
    public ResponseEntity<ApiResponse<List<ProcurementRequestResponse>>> getAllRequests() {
        return ResponseEntity.ok(ApiResponse.success(procurementService.getAllRequests()));
    }

    @PostMapping
    @Operation(summary = "Thương lái đăng tin cần thu mua nông sản sỉ")
    public ResponseEntity<ApiResponse<ProcurementRequestResponse>> createRequest(
            @Valid @RequestBody CreateProcurementRequestDto dto
    ) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success(procurementService.createRequest(dto)));
    }

    @PostMapping("/{id}/quotes")
    @Operation(summary = "Nhà vườn gửi chào giá cung cấp (bắt buộc chọn lô đã duyệt OPEN)")
    public ResponseEntity<ApiResponse<ProcurementQuoteResponse>> submitQuote(
            @PathVariable Long id,
            @Valid @RequestBody CreateProcurementQuoteDto dto
    ) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success(procurementService.submitQuote(id, dto)));
    }

    @GetMapping("/{id}/quotes")
    @Operation(summary = "Thương lái xem danh sách báo giá từ nhà vườn cho tin thu mua của mình")
    public ResponseEntity<ApiResponse<List<ProcurementQuoteResponse>>> getQuotes(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success(procurementService.getQuotesForRequest(id)));
    }
}
