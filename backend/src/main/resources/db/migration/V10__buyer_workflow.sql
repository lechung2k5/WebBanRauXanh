-- Buyer workflow: link authenticated Buyer accounts to the shared Farmer RFQ flow.
ALTER TABLE rfq_negotiations ADD COLUMN IF NOT EXISTS buyer_id BIGINT REFERENCES users(id);
ALTER TABLE rfq_negotiations ADD COLUMN IF NOT EXISTS shipping_option VARCHAR(40);
ALTER TABLE rfq_negotiations ADD COLUMN IF NOT EXISTS notes TEXT;
CREATE INDEX IF NOT EXISTS rfq_negotiations_buyer_id_idx ON rfq_negotiations(buyer_id, created_at DESC);
