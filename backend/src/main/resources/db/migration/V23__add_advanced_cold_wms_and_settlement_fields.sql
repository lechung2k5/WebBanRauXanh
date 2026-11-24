-- V23: Add advanced cold storage WMS, lab QC, and multi-stop manifest fields
ALTER TABLE b2b_contracts ADD COLUMN IF NOT EXISTS grade1_ratio NUMERIC(5,2) DEFAULT 95.0;
ALTER TABLE b2b_contracts ADD COLUMN IF NOT EXISTS inbound_gross_weight_kg NUMERIC(12,2);
ALTER TABLE b2b_contracts ADD COLUMN IF NOT EXISTS inbound_tare_weight_kg NUMERIC(12,2);
ALTER TABLE b2b_contracts ADD COLUMN IF NOT EXISTS inbound_net_weight_kg NUMERIC(12,2);
ALTER TABLE b2b_contracts ADD COLUMN IF NOT EXISTS qc_brix NUMERIC(5,2);
ALTER TABLE b2b_contracts ADD COLUMN IF NOT EXISTS qc_nitrate_ppm NUMERIC(7,2);
ALTER TABLE b2b_contracts ADD COLUMN IF NOT EXISTS qc_pesticide_safe BOOLEAN DEFAULT TRUE;
ALTER TABLE b2b_contracts ADD COLUMN IF NOT EXISTS outbound_manifest_code VARCHAR(100);
ALTER TABLE b2b_contracts ADD COLUMN IF NOT EXISTS bank_transfer_ref VARCHAR(100);
ALTER TABLE b2b_contracts ADD COLUMN IF NOT EXISTS farmer_bank_name VARCHAR(100);
ALTER TABLE b2b_contracts ADD COLUMN IF NOT EXISTS farmer_bank_account VARCHAR(50);
ALTER TABLE b2b_contracts ADD COLUMN IF NOT EXISTS farmer_bank_owner VARCHAR(100);
