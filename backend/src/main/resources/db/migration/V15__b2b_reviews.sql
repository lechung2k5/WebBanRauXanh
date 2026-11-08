CREATE TABLE IF NOT EXISTS b2b_reviews (
    id BIGSERIAL PRIMARY KEY,
    contract_id BIGINT NOT NULL REFERENCES b2b_contracts(id) ON DELETE CASCADE,
    reviewer_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reviewer_role VARCHAR(20) NOT NULL,
    rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
    comment TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT b2b_reviews_reviewer_role_ck CHECK (reviewer_role IN ('BUYER', 'FARMER')),
    CONSTRAINT b2b_reviews_unique_reviewer UNIQUE (contract_id, reviewer_id, reviewer_role)
);

CREATE INDEX IF NOT EXISTS b2b_reviews_contract_idx ON b2b_reviews(contract_id, created_at DESC);
