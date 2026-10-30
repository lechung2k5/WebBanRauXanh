package com.btl.webbanrau.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class HarvestLotStatusUpdateRequest {

    @NotBlank(message = "Trạng thái mới không được để trống")
    private String status; // OPEN, PENDING_APPROVAL, REJECTED, SUSPENDED, SOLD_OUT

    private String rejectionReason; // Lý do từ chối hoặc biên bản tạm khóa dư lượng BVTV

    private String auditNote; // Ghi chú của quản trị viên khi thẩm định
    private String note;

    public String getAuditNote() {
        if (auditNote != null && !auditNote.isBlank()) return auditNote;
        return note;
    }
}
