-- V5: B2B Farmer Portal, RFQ Negotiations, Contracts, QC Inspections & Settlements Schema

-- 1. Farmer Profiles
CREATE TABLE IF NOT EXISTS farmer_profiles (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL UNIQUE REFERENCES users(id),
    farm_name VARCHAR(200) NOT NULL,
    farmer_type VARCHAR(50) NOT NULL DEFAULT 'COOPERATIVE',
    puc_code VARCHAR(100),
    certifications VARCHAR(255),
    cert_expiry_date DATE,
    cert_image_url VARCHAR(500),
    tax_code VARCHAR(50),
    id_card_number VARCHAR(50),
    bank_account VARCHAR(50),
    bank_account_name VARCHAR(100),
    bank_name VARCHAR(100),
    location VARCHAR(255),
    cultivated_area VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 2. RFQ Negotiations
CREATE TABLE IF NOT EXISTS rfq_negotiations (
    id BIGSERIAL PRIMARY KEY,
    rfq_code VARCHAR(50) NOT NULL UNIQUE,
    harvest_lot_id BIGINT NOT NULL REFERENCES harvest_lots(id),
    buyer_name VARCHAR(150) NOT NULL,
    buyer_phone VARCHAR(20),
    buyer_company VARCHAR(200),
    requested_quantity FLOAT8 NOT NULL,
    target_price NUMERIC(15,2) NOT NULL,
    counter_price NUMERIC(15,2),
    counter_quantity FLOAT8,
    reject_reason VARCHAR(500),
    delivery_date DATE NOT NULL,
    hub_location VARCHAR(200),
    status VARCHAR(30) NOT NULL DEFAULT 'PENDING',
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 3. B2B Contracts expansion (Safe check in case table schema varies)
DO $$
BEGIN
    BEGIN
        ALTER TABLE b2b_contracts ALTER COLUMN buyer_id DROP NOT NULL;
    EXCEPTION WHEN undefined_column THEN NULL;
    END;
    BEGIN
        ALTER TABLE b2b_contracts ALTER COLUMN offered_weight_kg DROP NOT NULL;
    EXCEPTION WHEN undefined_column THEN NULL;
    END;
    BEGIN
        ALTER TABLE b2b_contracts ALTER COLUMN offered_price_per_kg DROP NOT NULL;
    EXCEPTION WHEN undefined_column THEN NULL;
    END;
    BEGIN
        ALTER TABLE b2b_contracts ALTER COLUMN total_goods_amount DROP NOT NULL;
    EXCEPTION WHEN undefined_column THEN NULL;
    END;
    BEGIN
        ALTER TABLE b2b_contracts ALTER COLUMN deposit_30_amount DROP NOT NULL;
    EXCEPTION WHEN undefined_column THEN NULL;
    END;
    BEGIN
        ALTER TABLE b2b_contracts ALTER COLUMN platform_fee_rate DROP NOT NULL;
    EXCEPTION WHEN undefined_column THEN NULL;
    END;
    BEGIN
        ALTER TABLE b2b_contracts ALTER COLUMN platform_fee_amount DROP NOT NULL;
    EXCEPTION WHEN undefined_column THEN NULL;
    END;
    BEGIN
        ALTER TABLE b2b_contracts ALTER COLUMN delivery_address DROP NOT NULL;
    EXCEPTION WHEN undefined_column THEN NULL;
    END;
END $$;

ALTER TABLE b2b_contracts ADD COLUMN IF NOT EXISTS rfq_id BIGINT REFERENCES rfq_negotiations(id);
ALTER TABLE b2b_contracts ADD COLUMN IF NOT EXISTS harvest_lot_id BIGINT REFERENCES harvest_lots(id);
ALTER TABLE b2b_contracts ADD COLUMN IF NOT EXISTS buyer_name VARCHAR(150);
ALTER TABLE b2b_contracts ADD COLUMN IF NOT EXISTS buyer_phone VARCHAR(20);
ALTER TABLE b2b_contracts ADD COLUMN IF NOT EXISTS quantity FLOAT8;
ALTER TABLE b2b_contracts ADD COLUMN IF NOT EXISTS unit_price NUMERIC(15,2);
ALTER TABLE b2b_contracts ADD COLUMN IF NOT EXISTS total_amount NUMERIC(15,2);
ALTER TABLE b2b_contracts ADD COLUMN IF NOT EXISTS deposit_amount NUMERIC(15,2);
ALTER TABLE b2b_contracts ADD COLUMN IF NOT EXISTS deposit_status VARCHAR(30) DEFAULT 'PENDING_DEPOSIT';
ALTER TABLE b2b_contracts ADD COLUMN IF NOT EXISTS fulfillment_status VARCHAR(30) DEFAULT 'WAITING_HARVEST';
ALTER TABLE b2b_contracts ADD COLUMN IF NOT EXISTS deposit_paid_at TIMESTAMPTZ;
ALTER TABLE b2b_contracts ADD COLUMN IF NOT EXISTS hub_delivery_date DATE;
ALTER TABLE b2b_contracts ADD COLUMN IF NOT EXISTS hub_name VARCHAR(200);
ALTER TABLE b2b_contracts ADD COLUMN IF NOT EXISTS delivery_time_slot VARCHAR(50);
ALTER TABLE b2b_contracts ADD COLUMN IF NOT EXISTS truck_type VARCHAR(100);
ALTER TABLE b2b_contracts ADD COLUMN IF NOT EXISTS delivery_notes TEXT;

-- 4. QC Inspections
CREATE TABLE IF NOT EXISTS qc_inspections (
    id BIGSERIAL PRIMARY KEY,
    contract_id BIGINT NOT NULL UNIQUE REFERENCES b2b_contracts(id),
    gross_weight FLOAT8 NOT NULL,
    net_qualified_weight FLOAT8 NOT NULL,
    rejected_weight FLOAT8 NOT NULL,
    qualified_percent FLOAT8 NOT NULL,
    brix_score FLOAT8 NOT NULL,
    moisture_percent FLOAT8 NOT NULL,
    inspector_name VARCHAR(100),
    qc_notes VARCHAR(500),
    sample_photo_url VARCHAR(500),
    inspected_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 5. Settlements
CREATE TABLE IF NOT EXISTS settlements (
    id BIGSERIAL PRIMARY KEY,
    settlement_code VARCHAR(50) NOT NULL UNIQUE,
    contract_id BIGINT NOT NULL UNIQUE REFERENCES b2b_contracts(id),
    farmer_id BIGINT NOT NULL REFERENCES users(id),
    qualified_weight FLOAT8 NOT NULL,
    unit_price NUMERIC(15,2) NOT NULL,
    gross_amount NUMERIC(15,2) NOT NULL,
    platform_fee_percent FLOAT8 NOT NULL DEFAULT 3.0,
    platform_fee NUMERIC(15,2) NOT NULL,
    payout_amount NUMERIC(15,2) NOT NULL,
    bank_account VARCHAR(50),
    bank_name VARCHAR(100),
    bank_account_name VARCHAR(100),
    bank_reference VARCHAR(100),
    is_paid BOOLEAN NOT NULL DEFAULT FALSE,
    paid_at TIMESTAMPTZ,
    tax_form_type VARCHAR(50) NOT NULL DEFAULT 'FORM_01_TNDN',
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

