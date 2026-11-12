CREATE TABLE IF NOT EXISTS uploaded_assets (
    id BIGSERIAL PRIMARY KEY,
    asset_id VARCHAR(64) UNIQUE NOT NULL,
    public_id VARCHAR(255) NOT NULL,
    secure_url VARCHAR(1000) NOT NULL,
    resource_type VARCHAR(50) NOT NULL DEFAULT 'image',
    delivery_type VARCHAR(50) NOT NULL DEFAULT 'upload',
    format VARCHAR(20),
    file_size BIGINT,
    width INTEGER,
    height INTEGER,
    purpose VARCHAR(50) NOT NULL,
    user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
    ip_address VARCHAR(45),
    is_linked BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_uploaded_assets_user ON uploaded_assets(user_id);
CREATE INDEX IF NOT EXISTS idx_uploaded_assets_public_id ON uploaded_assets(public_id);
CREATE INDEX IF NOT EXISTS idx_uploaded_assets_purpose ON uploaded_assets(purpose);

ALTER TABLE users ADD COLUMN IF NOT EXISTS certification_public_id VARCHAR(255);
ALTER TABLE harvest_lots ADD COLUMN IF NOT EXISTS image_public_id VARCHAR(255);
ALTER TABLE categories ADD COLUMN IF NOT EXISTS image_public_id VARCHAR(255);
ALTER TABLE products ADD COLUMN IF NOT EXISTS image_public_id VARCHAR(255);
