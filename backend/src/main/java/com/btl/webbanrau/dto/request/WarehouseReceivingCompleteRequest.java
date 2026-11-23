package com.btl.webbanrau.dto.request;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.math.BigDecimal;
import java.util.List;

@Data
public class WarehouseReceivingCompleteRequest {
    private BigDecimal actualTotalWeightKg;
    private Integer actualTotalPackages;
    private String receivingNotes;
    private Long receivingStaffId;

    private List<LotReceivingItem> lotItems;

    @Data
    public static class LotReceivingItem {
        @NotNull
        private Long contractId;
        private BigDecimal receivedWeightKg;
        private BigDecimal qualifiedWeightKg;
        private BigDecimal rejectedWeightKg;
        private Integer packageCount;
        private String coldZone;
        private String rackBin;
        private String qcNotes;
    }
}
