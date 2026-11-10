-- Lưu lại từng phiên bản đề xuất và hành động trong quá trình đàm phán RFQ.
CREATE TABLE IF NOT EXISTS rfq_negotiation_events (
    id BIGSERIAL PRIMARY KEY,
    rfq_id BIGINT NOT NULL REFERENCES rfq_negotiations(id) ON DELETE CASCADE,
    actor_id BIGINT REFERENCES users(id),
    actor_role VARCHAR(30) NOT NULL,
    action VARCHAR(30) NOT NULL,
    status_from VARCHAR(30),
    status_to VARCHAR(30) NOT NULL,
    quantity_kg NUMERIC(12,2),
    price_per_kg NUMERIC(15,2),
    message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS rfq_events_rfq_created_idx
    ON rfq_negotiation_events(rfq_id, created_at, id);
