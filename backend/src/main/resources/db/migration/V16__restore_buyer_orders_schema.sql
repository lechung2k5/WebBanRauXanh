-- V16: Dam bao bang orders va order_items ton tai phuc vu dong bo don hang Buyer voi Admin
CREATE TABLE IF NOT EXISTS orders (
    id BIGSERIAL PRIMARY KEY,
    order_code VARCHAR(50) UNIQUE NOT NULL,
    user_id BIGINT REFERENCES users(id),
    recipient_name VARCHAR(100) NOT NULL,
    recipient_phone VARCHAR(20) NOT NULL,
    shipping_address VARCHAR(255) NOT NULL,
    note VARCHAR(500),
    total_amount NUMERIC(15,2) NOT NULL,
    payment_method VARCHAR(50) NOT NULL DEFAULT 'COD',
    is_paid BOOLEAN NOT NULL DEFAULT FALSE,
    status VARCHAR(30) NOT NULL DEFAULT 'PENDING',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS order_items (
    id BIGSERIAL PRIMARY KEY,
    order_id BIGINT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id BIGINT NOT NULL REFERENCES products(id),
    quantity INTEGER NOT NULL,
    unit_price NUMERIC(15,2) NOT NULL,
    total_price NUMERIC(15,2) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP
);

ALTER TABLE b2b_contracts ADD COLUMN IF NOT EXISTS quantity_kg NUMERIC(12,2);
ALTER TABLE b2b_contracts ADD COLUMN IF NOT EXISTS agreed_price_per_kg NUMERIC(12,2);
ALTER TABLE hub_inspections ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE hub_inspections ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE hub_inspections ADD COLUMN IF NOT EXISTS moisture_percent NUMERIC(5,2);
ALTER TABLE iot_sensor_logs ADD COLUMN IF NOT EXISTS contract_id BIGINT REFERENCES b2b_contracts(id);
ALTER TABLE iot_sensor_logs ADD COLUMN IF NOT EXISTS alert BOOLEAN NOT NULL DEFAULT FALSE;

-- Buyer Profiles & Warehouses
CREATE TABLE IF NOT EXISTS buyer_profiles (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    company_name VARCHAR(200),
    tax_code VARCHAR(50),
    contact_name VARCHAR(100),
    contact_phone VARCHAR(20),
    credit_limit NUMERIC(15,2) NOT NULL DEFAULT 0,
    reputation_score NUMERIC(3,2) NOT NULL DEFAULT 5.00,
    buyer_tier VARCHAR(30) NOT NULL DEFAULT 'STANDARD',
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS buyer_warehouses (
    id BIGSERIAL PRIMARY KEY,
    buyer_profile_id BIGINT NOT NULL REFERENCES buyer_profiles(id) ON DELETE CASCADE,
    name VARCHAR(150) NOT NULL,
    address VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    default_warehouse BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Buyer RFQs
CREATE TABLE IF NOT EXISTS buyer_rfqs (
    id BIGSERIAL PRIMARY KEY,
    rfq_code VARCHAR(40) UNIQUE NOT NULL,
    buyer_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    harvest_lot_id BIGINT NOT NULL REFERENCES harvest_lots(id),
    quantity_kg NUMERIC(12,2) NOT NULL,
    proposed_price_per_kg NUMERIC(12,2) NOT NULL,
    desired_delivery_date DATE NOT NULL,
    delivery_location VARCHAR(255) NOT NULL,
    shipping_option VARCHAR(40),
    notes TEXT,
    counter_price_per_kg NUMERIC(12,2),
    status VARCHAR(30) NOT NULL DEFAULT 'PENDING',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ
);

