package com.btl.webbanrau.model;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "warehouse_iot_logs")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class WarehouseIotLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "warehouse_id", nullable = false)
    private Long warehouseId;

    @Column(name = "zone_id")
    private Long zoneId;

    @Column(name = "zone_code", nullable = false, length = 30)
    private String zoneCode;

    @Builder.Default
    @Column(name = "device_id", nullable = false, length = 64)
    private String deviceId = "WOKWI-ESP32";

    @Builder.Default
    @Column(name = "source", nullable = false, length = 20)
    private String source = "WOKWI";

    @Column(nullable = false, precision = 5, scale = 2)
    private BigDecimal temperature;

    @Column(nullable = false, precision = 5, scale = 2)
    private BigDecimal humidity;

    @Builder.Default
    @Column(name = "is_alert", nullable = false)
    private boolean alert = false;

    @Column(name = "alert_message", length = 255)
    private String alertMessage;

    @Builder.Default
    @Column(name = "recorded_at", nullable = false)
    private LocalDateTime recordedAt = LocalDateTime.now();
}
