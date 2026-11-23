-- V27__create_outbound_delivery_schema.sql
-- Triển khai phân hệ Outbound Logistics, ePOD và Chống trùng thanh toán SePay

-- 1. Bảng quản lý chuyến xe Outbound giao hàng từ Hub đến kho Buyer (MULTI stops)
CREATE TABLE IF NOT EXISTS outbound_delivery_trips (
    id BIGSERIAL PRIMARY KEY,
    trip_code VARCHAR(50) NOT NULL UNIQUE,
    hub_id BIGINT NOT NULL REFERENCES warehouse_hubs(id),
    vehicle_id BIGINT NOT NULL REFERENCES fleet_vehicles(id),
    driver_id BIGINT NOT NULL REFERENCES fleet_drivers(id),
    status VARCHAR(30) NOT NULL DEFAULT 'ASSIGNED', -- DRAFT, ASSIGNED, ON_DELIVERY, COMPLETED, CANCELLED
    planned_departure_at TIMESTAMP,
    departed_at TIMESTAMP,
    completed_at TIMESTAMP,
    total_loaded_weight_kg NUMERIC(10, 2) NOT NULL DEFAULT 0,
    total_volume_m3 NUMERIC(10, 2) NOT NULL DEFAULT 0,
    total_stops INT NOT NULL DEFAULT 0,
    notes TEXT,
    created_by VARCHAR(100),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_outbound_trips_hub_status ON outbound_delivery_trips(hub_id, status);
CREATE INDEX IF NOT EXISTS idx_outbound_trips_driver ON outbound_delivery_trips(driver_id);

-- 2. Bảng quản lý điểm dừng giao hàng theo Hợp đồng và Kho Buyer (ONCE per Contract)
CREATE TABLE IF NOT EXISTS outbound_delivery_stops (
    id BIGSERIAL PRIMARY KEY,
    trip_id BIGINT NOT NULL REFERENCES outbound_delivery_trips(id) ON DELETE CASCADE,
    contract_id BIGINT NOT NULL REFERENCES b2b_contracts(id),
    buyer_warehouse_id BIGINT REFERENCES buyer_warehouses(id),
    stop_sequence INT NOT NULL CHECK (stop_sequence > 0),
    delivery_address_snapshot VARCHAR(255) NOT NULL,
    contact_name_snapshot VARCHAR(100),
    contact_phone_snapshot VARCHAR(50),
    expected_weight_kg NUMERIC(10, 2) NOT NULL CHECK (expected_weight_kg > 0),
    status VARCHAR(30) NOT NULL DEFAULT 'ASSIGNED', -- PLANNED, ASSIGNED, ARRIVED, DRIVER_SUBMITTED, PENDING_BUYER_CONFIRMATION, BUYER_CONFIRMED, REJECTED, CANCELLED
    arrived_at TIMESTAMP,
    driver_submitted_at TIMESTAMP,
    buyer_confirmed_at TIMESTAMP,
    actual_delivered_weight_kg NUMERIC(10, 2),
    rejected_weight_kg NUMERIC(10, 2) DEFAULT 0,
    rejection_reason VARCHAR(255),
    driver_signature_data TEXT,
    driver_notes TEXT,
    buyer_signer_name VARCHAR(100),
    buyer_signer_phone VARCHAR(50),
    buyer_signature_data TEXT,
    buyer_notes TEXT,
    handover_photo_url TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_outbound_stop_contract UNIQUE (contract_id),
    CONSTRAINT uq_outbound_stop_seq UNIQUE (trip_id, stop_sequence)
);

CREATE INDEX IF NOT EXISTS idx_outbound_stops_trip ON outbound_delivery_stops(trip_id);
CREATE INDEX IF NOT EXISTS idx_outbound_stops_contract ON outbound_delivery_stops(contract_id);
CREATE INDEX IF NOT EXISTS idx_outbound_stops_warehouse ON outbound_delivery_stops(buyer_warehouse_id);

-- 3. Bảng ghi nhận giao dịch thanh toán chống trùng lặp Idempotency
CREATE TABLE IF NOT EXISTS payment_transactions (
    id BIGSERIAL PRIMARY KEY,
    provider VARCHAR(50) NOT NULL DEFAULT 'SEPAY',
    transaction_id VARCHAR(100) NOT NULL UNIQUE,
    contract_id BIGINT REFERENCES b2b_contracts(id),
    order_id BIGINT REFERENCES orders(id),
    amount NUMERIC(15, 2) NOT NULL,
    payment_type VARCHAR(50) NOT NULL, -- DEPOSIT, BALANCE, B2C_ORDER
    payload TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_payment_transactions_ref ON payment_transactions(transaction_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_contract ON payment_transactions(contract_id);
