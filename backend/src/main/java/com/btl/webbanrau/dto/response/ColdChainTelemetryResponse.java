package com.btl.webbanrau.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ColdChainTelemetryResponse {
    private Long contractId;
    private String contractCode;
    private String shipmentCode;
    private String truckPlate;
    private String driverName;
    private String driverPhone;
    private BigDecimal currentTemp;
    private BigDecimal currentHumidity;
    private BigDecimal targetTempMin;
    private BigDecimal targetTempMax;
    private Boolean isBreachAlert;
    private String alertMessage;
    private String shipmentStatus;
    private List<TelemetryLogDto> logs;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class TelemetryLogDto {
        private String time;
        private Double temperature;
        private Double humidity;
        private Boolean isAlert;
        private String note;
    }
}
