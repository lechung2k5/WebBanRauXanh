-- Migration V18: Set DEFAULT NOW() for b2b_contracts created_at and updated_at
ALTER TABLE b2b_contracts ALTER COLUMN created_at SET DEFAULT NOW();
ALTER TABLE b2b_contracts ALTER COLUMN updated_at SET DEFAULT NOW();
