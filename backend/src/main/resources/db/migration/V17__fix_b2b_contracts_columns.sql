-- V17: Fix b2b_contracts missing columns to support full trade lifecycle
ALTER TABLE b2b_contracts ADD COLUMN IF NOT EXISTS offered_weight_kg NUMERIC(12,2);
ALTER TABLE b2b_contracts ADD COLUMN IF NOT EXISTS offered_price_per_kg NUMERIC(15,2);
ALTER TABLE b2b_contracts ADD COLUMN IF NOT EXISTS total_goods_amount NUMERIC(18,2);
ALTER TABLE b2b_contracts ADD COLUMN IF NOT EXISTS deposit_30_amount NUMERIC(18,2);
ALTER TABLE b2b_contracts ADD COLUMN IF NOT EXISTS platform_fee_rate NUMERIC(5,2) DEFAULT 3.0;
ALTER TABLE b2b_contracts ADD COLUMN IF NOT EXISTS platform_fee_amount NUMERIC(18,2) DEFAULT 0;
ALTER TABLE b2b_contracts ADD COLUMN IF NOT EXISTS logistics_fee_amount NUMERIC(18,2) DEFAULT 0;
ALTER TABLE b2b_contracts ADD COLUMN IF NOT EXISTS service_vat_rate NUMERIC(5,2) DEFAULT 10;
ALTER TABLE b2b_contracts ADD COLUMN IF NOT EXISTS deposit_received NUMERIC(18,2) DEFAULT 0;
ALTER TABLE b2b_contracts ADD COLUMN IF NOT EXISTS balance_received NUMERIC(18,2) DEFAULT 0;
ALTER TABLE b2b_contracts ADD COLUMN IF NOT EXISTS payout_amount NUMERIC(18,2) DEFAULT 0;
ALTER TABLE b2b_contracts ADD COLUMN IF NOT EXISTS refund_amount NUMERIC(18,2) DEFAULT 0;
ALTER TABLE b2b_contracts ADD COLUMN IF NOT EXISTS deposit_ref VARCHAR(100);
ALTER TABLE b2b_contracts ADD COLUMN IF NOT EXISTS balance_ref VARCHAR(100);
ALTER TABLE b2b_contracts ADD COLUMN IF NOT EXISTS payout_ref VARCHAR(100);
ALTER TABLE b2b_contracts ADD COLUMN IF NOT EXISTS lot_id BIGINT;

DO $$
BEGIN
    BEGIN
        ALTER TABLE b2b_contracts ALTER COLUMN buyer_name DROP NOT NULL;
    EXCEPTION WHEN undefined_column THEN NULL;
    END;
    BEGIN
        ALTER TABLE b2b_contracts ALTER COLUMN quantity DROP NOT NULL;
    EXCEPTION WHEN undefined_column THEN NULL;
    END;
    BEGIN
        ALTER TABLE b2b_contracts ALTER COLUMN unit_price DROP NOT NULL;
    EXCEPTION WHEN undefined_column THEN NULL;
    END;
    BEGIN
        ALTER TABLE b2b_contracts ALTER COLUMN total_amount DROP NOT NULL;
    EXCEPTION WHEN undefined_column THEN NULL;
    END;
    BEGIN
        ALTER TABLE b2b_contracts ALTER COLUMN deposit_amount DROP NOT NULL;
    EXCEPTION WHEN undefined_column THEN NULL;
    END;
    BEGIN
        ALTER TABLE b2b_contracts ALTER COLUMN harvest_lot_id DROP NOT NULL;
    EXCEPTION WHEN undefined_column THEN NULL;
    END;
    BEGIN
        ALTER TABLE b2b_contracts ALTER COLUMN rfq_id DROP NOT NULL;
    EXCEPTION WHEN undefined_column THEN NULL;
    END;
END $$;
