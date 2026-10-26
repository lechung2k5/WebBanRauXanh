package com.btl.webbanrau.controller;

import com.btl.webbanrau.dto.request.HarvestLotRequest;
import com.btl.webbanrau.dto.request.HarvestLotStatusUpdateRequest;
import com.btl.webbanrau.dto.response.ApiResponse;
import com.btl.webbanrau.dto.response.HarvestLotResponse;
import com.btl.webbanrau.dto.response.PageResponse;
import com.btl.webbanrau.service.HarvestLotService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/admin/harvest-lots")
@RequiredArgsConstructor
@Tag(name = "Admin - Harvest Lots Control", description = "Module 2: Quản trị danh mục & kiểm duyệt lô nông sản vụ mùa")
public class AdminHarvestLotController {

    private final HarvestLotService harvestLotService;

    @GetMapping
    @Operation(summary = "Lấy danh sách toàn bộ các lô vụ mùa nông dân chào bán (Có phân trang & lọc)")
    public ResponseEntity<ApiResponse<PageResponse<HarvestLotResponse>>> getHarvestLots(
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String category,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(defaultValue = "createdAt") String sortBy,
            @RequestParam(defaultValue = "DESC") String sortDir
    ) {
        PageResponse<HarvestLotResponse> result = harvestLotService.getLots(
                keyword, status, category, page, size, sortBy, sortDir);
        return ResponseEntity.ok(ApiResponse.success(result));
    }

    @GetMapping("/stats")
    @Operation(summary = "Thống kê số lượng lô nông sản theo trạng thái")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getLotStats() {
        return ResponseEntity.ok(ApiResponse.success(harvestLotService.getLotStats()));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Lấy chi tiết lô nông sản theo ID")
    public ResponseEntity<ApiResponse<HarvestLotResponse>> getLotById(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success(harvestLotService.getLotById(id)));
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Tạo lô nông sản vụ mùa mới")
    public ResponseEntity<ApiResponse<HarvestLotResponse>> createLot(@Valid @RequestBody HarvestLotRequest request) {
        HarvestLotResponse created = harvestLotService.createLot(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Tạo lô nông sản thành công", created));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Cập nhật thông tin lô nông sản")
    public ResponseEntity<ApiResponse<HarvestLotResponse>> updateLot(
            @PathVariable Long id,
            @Valid @RequestBody HarvestLotRequest request
    ) {
        HarvestLotResponse updated = harvestLotService.updateLot(id, request);
        return ResponseEntity.ok(ApiResponse.success("Cập nhật lô nông sản thành công", updated));
    }

    @PatchMapping("/{id}/status")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Duyệt mở bán (OPEN), từ chối (REJECTED) hoặc tạm khóa lô nông sản")
    public ResponseEntity<ApiResponse<HarvestLotResponse>> updateLotStatus(
            @PathVariable Long id,
            @Valid @RequestBody HarvestLotStatusUpdateRequest request
    ) {
        HarvestLotResponse updated = harvestLotService.updateLotStatus(id, request);
        return ResponseEntity.ok(ApiResponse.success("Cập nhật trạng thái lô nông sản thành công", updated));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Xóa lô nông sản theo ID")
    public ResponseEntity<ApiResponse<Void>> deleteLot(@PathVariable Long id) {
        harvestLotService.deleteLot(id);
        return ResponseEntity.ok(ApiResponse.success("Xóa lô nông sản thành công", null));
    }
}
