package com.btl.webbanrau.model;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "iot_sensor_logs")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class IotSensorLog {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @ManyToOne(fetch = FetchType.LAZY, optional = false) @JoinColumn(name = "contract_id", nullable = false) private B2bContract contract;
    @Column(nullable = false, precision = 4, scale = 2) private BigDecimal temperature;
    @Column(nullable = false, precision = 5, scale = 2) private BigDecimal humidity;
    @Column(nullable = false) @Builder.Default private boolean alert = false;
    @Column(nullable = false) @Builder.Default private LocalDateTime recordedAt = LocalDateTime.now();
}
