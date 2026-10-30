CREATE TABLE IF NOT EXISTS harvest_lots (
 id BIGSERIAL PRIMARY KEY, lot_code VARCHAR(60) UNIQUE NOT NULL, farmer_id BIGINT NOT NULL REFERENCES users(id),
 product_name VARCHAR(150) NOT NULL, category VARCHAR(100) NOT NULL, puc_code VARCHAR(100) NOT NULL, certification VARCHAR(100) NOT NULL,
 harvest_date DATE NOT NULL, expiry_date DATE NOT NULL, total_weight_kg NUMERIC(12,2) NOT NULL CHECK(total_weight_kg>=100),
 available_weight_kg NUMERIC(12,2) NOT NULL CHECK(available_weight_kg>=0), base_price_per_kg NUMERIC(15,2) NOT NULL CHECK(base_price_per_kg>0),
 tier_pricing_json JSONB NOT NULL DEFAULT '[]', req_temp_min NUMERIC(5,2) NOT NULL DEFAULT 2, req_temp_max NUMERIC(5,2) NOT NULL DEFAULT 6,
 image_url TEXT, status VARCHAR(30) NOT NULL DEFAULT 'PENDING', review_note TEXT, created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CHECK(expiry_date>harvest_date), CHECK(req_temp_max>req_temp_min), CHECK(available_weight_kg<=total_weight_kg));
ALTER TABLE harvest_lots ADD COLUMN IF NOT EXISTS farmer_name VARCHAR(150);
ALTER TABLE harvest_lots ADD COLUMN IF NOT EXISTS category_id BIGINT;
ALTER TABLE harvest_lots ADD COLUMN IF NOT EXISTS rejection_reason TEXT;
ALTER TABLE harvest_lots ADD COLUMN IF NOT EXISTS audit_note TEXT;
ALTER TABLE harvest_lots ADD COLUMN IF NOT EXISTS warehouse_location VARCHAR(100);
ALTER TABLE harvest_lots ADD COLUMN IF NOT EXISTS region VARCHAR(100);
ALTER TABLE harvest_lots ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;
ALTER TABLE harvest_lots ADD COLUMN IF NOT EXISTS review_note TEXT;
ALTER TABLE categories ADD COLUMN IF NOT EXISTS display_order INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS individual_buyer BOOLEAN DEFAULT FALSE;

CREATE TABLE IF NOT EXISTS b2b_contracts (
 id BIGSERIAL PRIMARY KEY, contract_code VARCHAR(60) UNIQUE NOT NULL, lot_id BIGINT NOT NULL REFERENCES harvest_lots(id), farmer_id BIGINT NOT NULL REFERENCES users(id), buyer_id BIGINT NOT NULL REFERENCES users(id),
 offered_weight_kg NUMERIC(12,2) NOT NULL CHECK(offered_weight_kg>=100), offered_price_per_kg NUMERIC(15,2) NOT NULL CHECK(offered_price_per_kg>0),
 total_goods_amount NUMERIC(18,2) NOT NULL, deposit_30_amount NUMERIC(18,2) NOT NULL, platform_fee_rate NUMERIC(5,2) NOT NULL, platform_fee_amount NUMERIC(18,2) NOT NULL,
 logistics_fee_amount NUMERIC(18,2) NOT NULL DEFAULT 0, service_vat_rate NUMERIC(5,2) NOT NULL DEFAULT 10, delivery_address TEXT NOT NULL, status VARCHAR(30) NOT NULL DEFAULT 'RFQ_SENT',
 deposit_ref VARCHAR(100) UNIQUE, balance_ref VARCHAR(100) UNIQUE, payout_ref VARCHAR(100) UNIQUE, deposit_received NUMERIC(18,2) NOT NULL DEFAULT 0,
 balance_received NUMERIC(18,2) NOT NULL DEFAULT 0, payout_amount NUMERIC(18,2) NOT NULL DEFAULT 0, refund_amount NUMERIC(18,2) NOT NULL DEFAULT 0,
 created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP);

CREATE TABLE IF NOT EXISTS cold_assets (
 id BIGSERIAL PRIMARY KEY, asset_code VARCHAR(60) UNIQUE NOT NULL, asset_type VARCHAR(40) NOT NULL CHECK(asset_type IN ('COLD_ROOM','REFRIGERATED_TRUCK')),
 asset_name VARCHAR(150) NOT NULL, capacity_kg NUMERIC(12,2) NOT NULL CHECK(capacity_kg>0), driver_id BIGINT REFERENCES users(id),
 current_temp NUMERIC(5,2) NOT NULL DEFAULT 4, current_humidity NUMERIC(5,2) NOT NULL DEFAULT 85, target_temp_min NUMERIC(5,2) NOT NULL DEFAULT 2,
 target_temp_max NUMERIC(5,2) NOT NULL DEFAULT 6, status VARCHAR(30) NOT NULL DEFAULT 'NORMAL');

CREATE TABLE IF NOT EXISTS hub_inspections (
 id BIGSERIAL PRIMARY KEY, inspection_code VARCHAR(60) UNIQUE NOT NULL, contract_id BIGINT UNIQUE NOT NULL REFERENCES b2b_contracts(id), cold_room_id BIGINT NOT NULL REFERENCES cold_assets(id),
 received_weight_kg NUMERIC(12,2) NOT NULL, qualified_weight_kg NUMERIC(12,2) NOT NULL, rejected_weight_kg NUMERIC(12,2) NOT NULL,
 brix_degree NUMERIC(5,2), moisture_pct NUMERIC(5,2), qc_staff_id BIGINT NOT NULL REFERENCES users(id), qc_note TEXT, inspected_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CHECK(received_weight_kg>0 AND qualified_weight_kg>0 AND rejected_weight_kg>=0 AND received_weight_kg=qualified_weight_kg+rejected_weight_kg));

CREATE TABLE IF NOT EXISTS shipments (
 id BIGSERIAL PRIMARY KEY, shipment_code VARCHAR(60) UNIQUE NOT NULL, contract_id BIGINT UNIQUE NOT NULL REFERENCES b2b_contracts(id), truck_id BIGINT NOT NULL REFERENCES cold_assets(id),
 driver_id BIGINT NOT NULL REFERENCES users(id), loaded_weight_kg NUMERIC(12,2) NOT NULL, delivered_weight_kg NUMERIC(12,2),
 damaged_weight_kg NUMERIC(12,2) NOT NULL DEFAULT 0, natural_shrinkage_kg NUMERIC(12,2) NOT NULL DEFAULT 0,
 epod_signature_name VARCHAR(100), epod_photo_url TEXT, epod_signature_data TEXT, departed_at TIMESTAMPTZ, delivered_at TIMESTAMPTZ,
 status VARCHAR(30) NOT NULL DEFAULT 'SCHEDULED');

CREATE TABLE IF NOT EXISTS iot_sensor_logs (
 id BIGSERIAL PRIMARY KEY, asset_id BIGINT NOT NULL REFERENCES cold_assets(id), temperature NUMERIC(5,2) NOT NULL, humidity NUMERIC(5,2) NOT NULL,
 is_alert BOOLEAN NOT NULL DEFAULT FALSE, alert_message TEXT, simulated BOOLEAN NOT NULL DEFAULT TRUE, recorded_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE INDEX IF NOT EXISTS iot_asset_recorded ON iot_sensor_logs(asset_id,recorded_at DESC);

CREATE TABLE IF NOT EXISTS spoilage_claims (
 id BIGSERIAL PRIMARY KEY, claim_code VARCHAR(60) UNIQUE NOT NULL, contract_id BIGINT NOT NULL REFERENCES b2b_contracts(id),
 damaged_weight_kg NUMERIC(12,2) NOT NULL CHECK(damaged_weight_kg>0), cause TEXT NOT NULL, liable_party VARCHAR(30) NOT NULL,
 compensation_amount NUMERIC(18,2) NOT NULL CHECK(compensation_amount>=0), status VARCHAR(30) NOT NULL DEFAULT 'OPEN', resolution_note TEXT, resolution_ref VARCHAR(100) UNIQUE,
 created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP);

CREATE TABLE IF NOT EXISTS gl_journal_entries (id BIGSERIAL PRIMARY KEY, contract_id BIGINT NOT NULL REFERENCES b2b_contracts(id), event VARCHAR(50) NOT NULL, reference VARCHAR(100) UNIQUE NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS gl_journal_lines (id BIGSERIAL PRIMARY KEY, entry_id BIGINT NOT NULL REFERENCES gl_journal_entries(id), account VARCHAR(10) NOT NULL, debit NUMERIC(18,2) NOT NULL DEFAULT 0 CHECK(debit>=0), credit NUMERIC(18,2) NOT NULL DEFAULT 0 CHECK(credit>=0), CHECK((debit=0)<>(credit=0)));
CREATE TABLE IF NOT EXISTS platform_settings (id INTEGER PRIMARY KEY CHECK(id=1), platform_fee_rate NUMERIC(5,2) NOT NULL DEFAULT 3 CHECK(platform_fee_rate BETWEEN 1 AND 5), deposit_rate NUMERIC(5,2) NOT NULL DEFAULT 30 CHECK(deposit_rate BETWEEN 1 AND 100), temp_min NUMERIC(5,2) NOT NULL DEFAULT 2, temp_max NUMERIC(5,2) NOT NULL DEFAULT 6, service_vat_rate NUMERIC(5,2) NOT NULL DEFAULT 10 CHECK(service_vat_rate IN(8,10)), CHECK(temp_max>temp_min));
INSERT INTO platform_settings(id) VALUES (1) ON CONFLICT (id) DO NOTHING;
CREATE TABLE IF NOT EXISTS business_audit (id BIGSERIAL PRIMARY KEY, actor_id BIGINT NOT NULL REFERENCES users(id), action VARCHAR(100) NOT NULL, entity_id BIGINT, created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP);
