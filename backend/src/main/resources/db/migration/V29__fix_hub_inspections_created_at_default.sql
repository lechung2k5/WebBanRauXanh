-- V29: Set default timestamp for hub_inspections created_at and updated_at
ALTER TABLE hub_inspections ALTER COLUMN created_at SET DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE hub_inspections ALTER COLUMN updated_at SET DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE hub_inspections ALTER COLUMN created_at DROP NOT NULL;
