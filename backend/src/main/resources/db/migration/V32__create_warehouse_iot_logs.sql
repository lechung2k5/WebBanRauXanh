CREATE TABLE IF NOT EXISTS warehouse_iot_logs (
    id BIGSERIAL PRIMARY KEY,
    warehouse_id BIGINT NOT NULL REFERENCES warehouse_hubs(id) ON DELETE CASCADE,
    zone_id BIGINT REFERENCES warehouse_zones(id) ON DELETE SET NULL,
    zone_code VARCHAR(30) NOT NULL,
    device_id VARCHAR(64) NOT NULL DEFAULT 'WOKWI-ESP32',
    source VARCHAR(20) NOT NULL DEFAULT 'WOKWI',
    temperature NUMERIC(5, 2) NOT NULL,
    humidity NUMERIC(5, 2) NOT NULL,
    is_alert BOOLEAN NOT NULL DEFAULT FALSE,
    alert_message VARCHAR(255),
    recorded_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_warehouse_iot_logs_hub_zone_time
    ON warehouse_iot_logs (warehouse_id, zone_code, recorded_at DESC);
