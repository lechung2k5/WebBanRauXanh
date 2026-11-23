-- V24: Add packaging approval tracking fields for B2B contracts
ALTER TABLE b2b_contracts ADD COLUMN IF NOT EXISTS packaging_approved BOOLEAN DEFAULT FALSE;
ALTER TABLE b2b_contracts ADD COLUMN IF NOT EXISTS packaging_approved_at TIMESTAMPTZ;
