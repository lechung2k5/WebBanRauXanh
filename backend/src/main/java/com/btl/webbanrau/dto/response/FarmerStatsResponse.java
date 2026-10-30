package com.btl.webbanrau.dto.response;

import lombok.*;

import java.math.BigDecimal;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class FarmerStatsResponse {
    private BigDecimal totalRevenue; // Tổng doanh thu vụ mùa đã giải ngân
    private BigDecimal escrowHolding; // Tiền cọc 30% đang được Sàn giữ hộ bảo chứng
    private Long openLotsCount; // Số lô đang mở chào bán
    private Long runningContractsCount; // Số hợp đồng đang trong quá trình thực hiện
    private Long pendingRfqCount; // Số yêu cầu RFQ đang chờ phản hồi
}
