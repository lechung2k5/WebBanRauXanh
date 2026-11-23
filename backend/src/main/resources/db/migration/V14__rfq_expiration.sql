-- Thời hạn mặc định 24 giờ cho mỗi phiên đàm phán RFQ.
ALTER TABLE rfq_negotiations ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;
UPDATE rfq_negotiations
SET expires_at = COALESCE(created_at, CURRENT_TIMESTAMP) + INTERVAL '24 hours'
WHERE expires_at IS NULL;
ALTER TABLE rfq_negotiations ALTER COLUMN expires_at SET DEFAULT (CURRENT_TIMESTAMP + INTERVAL '24 hours');
ALTER TABLE rfq_negotiations ALTER COLUMN expires_at SET NOT NULL;
CREATE INDEX IF NOT EXISTS rfq_negotiations_expiration_idx ON rfq_negotiations(status, expires_at);
