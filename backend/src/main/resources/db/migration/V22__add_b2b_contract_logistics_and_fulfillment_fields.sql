-- V22: Add comprehensive logistics, cold warehouse, QC, and final settlement fields for B2B contracts
ALTER TABLE b2b_contracts ADD COLUMN IF NOT EXISTS actual_harvest_weight_kg NUMERIC(12,2);
ALTER TABLE b2b_contracts ADD COLUMN IF NOT EXISTS harvest_proof_image_url TEXT;
ALTER TABLE b2b_contracts ADD COLUMN IF NOT EXISTS package_count INTEGER;
ALTER TABLE b2b_contracts ADD COLUMN IF NOT EXISTS package_type VARCHAR(100);
ALTER TABLE b2b_contracts ADD COLUMN IF NOT EXISTS qr_code_data VARCHAR(255);
ALTER TABLE b2b_contracts ADD COLUMN IF NOT EXISTS harvested_at TIMESTAMPTZ;

ALTER TABLE b2b_contracts ADD COLUMN IF NOT EXISTS farm_pickup_address TEXT;
ALTER TABLE b2b_contracts ADD COLUMN IF NOT EXISTS pickup_truck_plate VARCHAR(50);
ALTER TABLE b2b_contracts ADD COLUMN IF NOT EXISTS pickup_driver_name VARCHAR(100);
ALTER TABLE b2b_contracts ADD COLUMN IF NOT EXISTS pickup_driver_phone VARCHAR(20);
ALTER TABLE b2b_contracts ADD COLUMN IF NOT EXISTS farm_handover_temp NUMERIC(5,2);
ALTER TABLE b2b_contracts ADD COLUMN IF NOT EXISTS farm_pickup_signed_at TIMESTAMPTZ;

ALTER TABLE b2b_contracts ADD COLUMN IF NOT EXISTS hub_warehouse_zone VARCHAR(50);
ALTER TABLE b2b_contracts ADD COLUMN IF NOT EXISTS hub_rack_bin VARCHAR(50);
ALTER TABLE b2b_contracts ADD COLUMN IF NOT EXISTS max_storage_days INTEGER;
ALTER TABLE b2b_contracts ADD COLUMN IF NOT EXISTS hub_inbound_at TIMESTAMPTZ;
ALTER TABLE b2b_contracts ADD COLUMN IF NOT EXISTS qc_status VARCHAR(30) DEFAULT 'PENDING_QC';
ALTER TABLE b2b_contracts ADD COLUMN IF NOT EXISTS qc_passed_at TIMESTAMPTZ;
ALTER TABLE b2b_contracts ADD COLUMN IF NOT EXISTS qc_cert_url TEXT;

ALTER TABLE b2b_contracts ADD COLUMN IF NOT EXISTS outbound_truck_plate VARCHAR(50);
ALTER TABLE b2b_contracts ADD COLUMN IF NOT EXISTS outbound_driver_name VARCHAR(100);
ALTER TABLE b2b_contracts ADD COLUMN IF NOT EXISTS outbound_dispatched_at TIMESTAMPTZ;
ALTER TABLE b2b_contracts ADD COLUMN IF NOT EXISTS remaining_amount NUMERIC(18,2);
ALTER TABLE b2b_contracts ADD COLUMN IF NOT EXISTS remaining_payment_status VARCHAR(30) DEFAULT 'UNPAID';
ALTER TABLE b2b_contracts ADD COLUMN IF NOT EXISTS remaining_paid_at TIMESTAMPTZ;

ALTER TABLE b2b_contracts ADD COLUMN IF NOT EXISTS epod_delivered_weight_kg NUMERIC(12,2);
ALTER TABLE b2b_contracts ADD COLUMN IF NOT EXISTS epod_damaged_weight_kg NUMERIC(12,2);
ALTER TABLE b2b_contracts ADD COLUMN IF NOT EXISTS epod_signature_url TEXT;
ALTER TABLE b2b_contracts ADD COLUMN IF NOT EXISTS epod_delivered_at TIMESTAMPTZ;
ALTER TABLE b2b_contracts ADD COLUMN IF NOT EXISTS farmer_payout_amount NUMERIC(18,2);
ALTER TABLE b2b_contracts ADD COLUMN IF NOT EXISTS settled_at TIMESTAMPTZ;
