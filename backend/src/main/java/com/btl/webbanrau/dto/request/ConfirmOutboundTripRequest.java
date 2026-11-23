package com.btl.webbanrau.dto.request;

import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.util.List;

@Data
public class ConfirmOutboundTripRequest {
    @NotNull(message = "Phương tiện không được để trống")
    private Long vehicleId;

    @NotNull(message = "Tài xế không được để trống")
    private Long driverId;

    private String notes;

    @NotEmpty(message = "Danh sách điểm dừng giao hàng không được để trống")
    private List<OutboundStopItem> stops;

    @Data
    public static class OutboundStopItem {
        @NotNull(message = "ID hợp đồng không được để trống")
        private Long contractId;
        private Long buyerWarehouseId;
        private Integer stopSequence;
        private String deliveryAddress;
        private String contactName;
        private String contactPhone;
    }
}
