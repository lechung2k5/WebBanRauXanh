package com.btl.webbanrau.dto.request;

import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import lombok.Data;
import java.util.List;

@Data
public class ConfirmTripRequest {
    @NotNull(message = "Mã xe không được để trống")
    private Long vehicleId;

    @NotNull(message = "Mã tài xế không được để trống")
    private Long driverId;

    @NotEmpty(message = "Danh sách điểm dừng hợp đồng không được để trống")
    private List<StopOrderRequest> stops;

    @Data
    public static class StopOrderRequest {
        @NotNull(message = "Mã hợp đồng không được để trống")
        private Long contractId;
        private Integer stopOrder;
    }
}
