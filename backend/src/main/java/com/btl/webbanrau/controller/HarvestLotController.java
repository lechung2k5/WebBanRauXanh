package com.btl.webbanrau.controller;

import com.btl.webbanrau.dto.response.ApiResponse;
import com.btl.webbanrau.dto.response.HarvestLotResponse;
import com.btl.webbanrau.dto.response.PageResponse;
import com.btl.webbanrau.service.HarvestLotService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/harvest-lots")
@RequiredArgsConstructor
@Tag(name = "Public - Harvest Lots", description = "Xem và tra cứu nguồn hàng lô nông sản vụ mùa")
public class HarvestLotController {

    private final HarvestLotService harvestLotService;

    @GetMapping
    @Operation(summary = "Lấy danh sách các lô nông sản đang mở bán (OPEN) hoặc lọc theo ngành hàng")
    public ResponseEntity<ApiResponse<PageResponse<HarvestLotResponse>>> getPublicLots(
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String category,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "12") int size,
            @RequestParam(defaultValue = "createdAt") String sortBy,
            @RequestParam(defaultValue = "DESC") String sortDir
    ) {
        PageResponse<HarvestLotResponse> result = harvestLotService.getLots(
                keyword, status, category, page, size, sortBy, sortDir);
        return ResponseEntity.ok(ApiResponse.success(result));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Xem chi tiết lô nông sản")
    public ResponseEntity<ApiResponse<HarvestLotResponse>> getLotById(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success(harvestLotService.getLotById(id)));
    }

    @GetMapping("/code/{code}")
    @Operation(summary = "Tra cứu nguồn gốc lô theo mã lô (QR Code / Mã số vùng trồng)")
    public ResponseEntity<ApiResponse<HarvestLotResponse>> getLotByCode(@PathVariable String code) {
        return ResponseEntity.ok(ApiResponse.success(harvestLotService.getLotByCode(code)));
    }
}
