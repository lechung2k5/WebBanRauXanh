CREATE TABLE IF NOT EXISTS cold_chain_alerts (
    id BIGSERIAL PRIMARY KEY,
    sensor_log_id BIGINT REFERENCES iot_sensor_logs(id),
    asset_id BIGINT NOT NULL REFERENCES cold_assets(id),
    contract_id BIGINT REFERENCES b2b_contracts(id),
    severity VARCHAR(20) NOT NULL DEFAULT 'HIGH',
    status VARCHAR(20) NOT NULL DEFAULT 'OPEN',
    alert_message TEXT NOT NULL,
    acknowledged_by BIGINT REFERENCES users(id),
    acknowledged_at TIMESTAMPTZ,
    acknowledge_note TEXT,
    resolved_by BIGINT REFERENCES users(id),
    resolved_at TIMESTAMPTZ,
    resolution_note TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT cold_chain_alert_status_chk CHECK (status IN ('OPEN', 'ACKNOWLEDGED', 'RESOLVED')),
    CONSTRAINT cold_chain_alert_severity_chk CHECK (severity IN ('WARNING', 'HIGH', 'CRITICAL'))
);

CREATE UNIQUE INDEX IF NOT EXISTS cold_chain_alert_sensor_log_uq
    ON cold_chain_alerts(sensor_log_id)
    WHERE sensor_log_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS cold_chain_alert_asset_status_idx
    ON cold_chain_alerts(asset_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS cold_chain_alert_contract_idx
    ON cold_chain_alerts(contract_id, created_at DESC);
