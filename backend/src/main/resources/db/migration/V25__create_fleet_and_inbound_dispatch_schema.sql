-- V25__create_fleet_and_inbound_dispatch_schema.sql
-- HoNa Fresh Fleet Management and Inbound Multi-stop Dispatch System

-- 1. Danh mục các Hub trung chuyển trọng điểm vận hành thực tế của HoNa Fresh
CREATE TABLE IF NOT EXISTS warehouse_hubs (
    id BIGSERIAL PRIMARY KEY,
    hub_code VARCHAR(50) UNIQUE NOT NULL,
    hub_name VARCHAR(150) NOT NULL,
    region VARCHAR(50) NOT NULL,
    address VARCHAR(255) NOT NULL,
    latitude NUMERIC(10, 7),
    longitude NUMERIC(10, 7),
    hotline VARCHAR(20),
    manager_name VARCHAR(100),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Quản lý Phương tiện theo từng kho (Fleet Vehicles)
CREATE TABLE IF NOT EXISTS fleet_vehicles (
    id BIGSERIAL PRIMARY KEY,
    warehouse_id BIGINT NOT NULL REFERENCES warehouse_hubs(id) ON DELETE CASCADE,
    plate_number VARCHAR(20) UNIQUE NOT NULL,
    vehicle_model VARCHAR(100) NOT NULL,
    vehicle_type VARCHAR(50) NOT NULL DEFAULT 'REFRIGERATED_TRUCK',
    capacity_kg NUMERIC(10, 2) NOT NULL,
    volume_m3 NUMERIC(10, 2) NOT NULL,
    min_temp NUMERIC(4, 1) DEFAULT 2.0,
    max_temp NUMERIC(4, 1) DEFAULT 6.0,
    status VARCHAR(30) NOT NULL DEFAULT 'AVAILABLE',
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Quản lý Đội ngũ Tài xế theo từng kho (Fleet Drivers)
CREATE TABLE IF NOT EXISTS fleet_drivers (
    id BIGSERIAL PRIMARY KEY,
    warehouse_id BIGINT NOT NULL REFERENCES warehouse_hubs(id) ON DELETE CASCADE,
    driver_code VARCHAR(30) UNIQUE NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    license_number VARCHAR(30) UNIQUE NOT NULL,
    license_class VARCHAR(10) NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'AVAILABLE',
    experience_years INT DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. Bảng Chuyến xe điều phối lấy hàng (Pickup Trips)
CREATE TABLE IF NOT EXISTS pickup_trips (
    id BIGSERIAL PRIMARY KEY,
    trip_code VARCHAR(50) UNIQUE NOT NULL,
    warehouse_id BIGINT NOT NULL REFERENCES warehouse_hubs(id),
    vehicle_id BIGINT NOT NULL REFERENCES fleet_vehicles(id),
    driver_id BIGINT NOT NULL REFERENCES fleet_drivers(id),
    status VARCHAR(30) NOT NULL DEFAULT 'ASSIGNED',
    total_weight_kg NUMERIC(10, 2) NOT NULL DEFAULT 0.0,
    total_volume_m3 NUMERIC(10, 2) NOT NULL DEFAULT 0.0,
    total_packages INT NOT NULL DEFAULT 0,
    total_stops INT NOT NULL DEFAULT 0,
    departure_time TIMESTAMP,
    completion_time TIMESTAMP,
    cancellation_reason TEXT,
    created_by VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5. Bảng Điểm dừng rẫy/vườn lấy hàng trong chuyến (Pickup Trip Stops)
CREATE TABLE IF NOT EXISTS pickup_trip_stops (
    id BIGSERIAL PRIMARY KEY,
    trip_id BIGINT NOT NULL REFERENCES pickup_trips(id) ON DELETE CASCADE,
    contract_id BIGINT NOT NULL REFERENCES b2b_contracts(id),
    stop_order INT NOT NULL,
    farmer_name VARCHAR(100),
    pickup_address VARCHAR(255) NOT NULL,
    contact_phone VARCHAR(50),
    weight_kg NUMERIC(10, 2) NOT NULL,
    volume_m3 NUMERIC(10, 2) NOT NULL,
    package_count INT NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'PENDING',
    arrived_at TIMESTAMP,
    loaded_at TIMESTAMP,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 6. Unique Partial Index: Ngăn chặn 1 hợp đồng bị điều phối đồng thời vào 2 chuyến chưa hoàn tất
CREATE UNIQUE INDEX IF NOT EXISTS uq_active_contract_pickup
ON pickup_trip_stops (contract_id)
WHERE status IN ('PENDING', 'ARRIVED');

-- 7. Seed Data: 5 Hubs trung chuyển trọng điểm vận hành thực tế
INSERT INTO warehouse_hubs (hub_code, hub_name, region, address, latitude, longitude, hotline, manager_name)
VALUES
('HUB-CU-CHI', 'Tổng Kho Chuỗi Lạnh Củ Chi (Hub TP.HCM)', 'Đông Nam Bộ & TP.HCM', 'Tỉnh Lộ 8, Xã Tân An Hội, Huyện Củ Chi, TP. Hồ Chí Minh', 10.9732, 106.4955, '0901.888.111', 'Trần Anh Tuấn'),
('HUB-DUC-TRONG', 'Trạm Trung Chuyển Đức Trọng (Hub Trung Tâm Lâm Đồng)', 'Tây Nguyên & Lâm Đồng', 'QL20, TT. Liên Nghĩa, Huyện Đức Trọng, Lâm Đồng', 11.7345, 108.3752, '0901.888.222', 'Nguyễn Thanh Tùng'),
('HUB-CAI-BE', 'Trạm Trung Chuyển Cái Bè (Hub ĐBSCL)', 'Tây Nam Bộ / ĐBSCL', 'QL1A, Xã An Thái Trung, Huyện Cái Bè, Tiền Giang', 10.3621, 105.9523, '0901.888.333', 'Lê Hữu Nghĩa'),
('HUB-BUON-HO', 'Kho Nông Sản Buôn Hồ (Hub Đắk Lắk)', 'Tây Nguyên & Đắk Lắk', 'QL14, Phường Đoàn Kết, Thị xã Buôn Hồ, Đắk Lắk', 12.9125, 108.2612, '0901.888.444', 'Phạm Minh Đức'),
('HUB-HA-NOI', 'Kho Logistics Nông Sản Miền Bắc (Hub Hà Nội)', 'Miền Bắc & Hà Nội', 'Khu Công Nghiệp Đài Tư, Phường Sài Đồng, Quận Long Biên, Hà Nội', 21.0315, 105.9184, '0901.888.555', 'Hoàng Đình Nam')
ON CONFLICT (hub_code) DO NOTHING;

-- 8. Seed Đội Xe theo từng Hub
-- HUB-DUC-TRONG
INSERT INTO fleet_vehicles (warehouse_id, plate_number, vehicle_model, vehicle_type, capacity_kg, volume_m3, min_temp, max_temp, status, notes)
SELECT id, '51D-882.34', 'Isuzu NPR400 Lạnh 5.0 Tấn', 'REFRIGERATED_TRUCK', 5000.00, 24.00, 2.0, 6.0, 'AVAILABLE', 'Thùng đông lạnh âm sâu, vách composite'
FROM warehouse_hubs WHERE hub_code = 'HUB-DUC-TRONG'
ON CONFLICT (plate_number) DO NOTHING;

INSERT INTO fleet_vehicles (warehouse_id, plate_number, vehicle_model, vehicle_type, capacity_kg, volume_m3, min_temp, max_temp, status, notes)
SELECT id, '49C-678.90', 'Hino FC9J Lạnh 8.0 Tấn', 'REFRIGERATED_TRUCK', 8000.00, 38.00, 2.0, 6.0, 'AVAILABLE', 'Khoang kép 2 vùng nhiệt độ'
FROM warehouse_hubs WHERE hub_code = 'HUB-DUC-TRONG'
ON CONFLICT (plate_number) DO NOTHING;

INSERT INTO fleet_vehicles (warehouse_id, plate_number, vehicle_model, vehicle_type, capacity_kg, volume_m3, min_temp, max_temp, status, notes)
SELECT id, '49A-345.12', 'Hyundai Porter H150 Lạnh 2.5 Tấn', 'REFRIGERATED_TRUCK', 2500.00, 12.00, 2.0, 6.0, 'AVAILABLE', 'Xe nhỏ luồn lách đường đèo dốc rẫy nhỏ'
FROM warehouse_hubs WHERE hub_code = 'HUB-DUC-TRONG'
ON CONFLICT (plate_number) DO NOTHING;

-- HUB-CU-CHI
INSERT INTO fleet_vehicles (warehouse_id, plate_number, vehicle_model, vehicle_type, capacity_kg, volume_m3, min_temp, max_temp, status, notes)
SELECT id, '51D-991.22', 'Isuzu QKR270 Lạnh 2.8 Tấn', 'REFRIGERATED_TRUCK', 2800.00, 14.00, 2.0, 6.0, 'AVAILABLE', 'Chạy nội ô và liên vùng Đông Nam Bộ'
FROM warehouse_hubs WHERE hub_code = 'HUB-CU-CHI'
ON CONFLICT (plate_number) DO NOTHING;

INSERT INTO fleet_vehicles (warehouse_id, plate_number, vehicle_model, vehicle_type, capacity_kg, volume_m3, min_temp, max_temp, status, notes)
SELECT id, '50E-123.45', 'Hino 500 Series Lạnh 8.0 Tấn', 'REFRIGERATED_TRUCK', 8000.00, 40.00, 2.0, 6.0, 'AVAILABLE', 'Xe gom hàng tải lớn'
FROM warehouse_hubs WHERE hub_code = 'HUB-CU-CHI'
ON CONFLICT (plate_number) DO NOTHING;

-- HUB-CAI-BE
INSERT INTO fleet_vehicles (warehouse_id, plate_number, vehicle_model, vehicle_type, capacity_kg, volume_m3, min_temp, max_temp, status, notes)
SELECT id, '63C-234.56', 'Kia K250 Lạnh 2.4 Tấn', 'REFRIGERATED_TRUCK', 2400.00, 11.50, 2.0, 6.0, 'AVAILABLE', 'Phục vụ gom trái cây miệt vườn'
FROM warehouse_hubs WHERE hub_code = 'HUB-CAI-BE'
ON CONFLICT (plate_number) DO NOTHING;

INSERT INTO fleet_vehicles (warehouse_id, plate_number, vehicle_model, vehicle_type, capacity_kg, volume_m3, min_temp, max_temp, status, notes)
SELECT id, '63C-789.12', 'Isuzu FRR90 Lạnh 6.5 Tấn', 'REFRIGERATED_TRUCK', 6500.00, 32.00, 2.0, 6.0, 'AVAILABLE', 'Xe chuyên tuyến Cái Bè - Sài Gòn'
FROM warehouse_hubs WHERE hub_code = 'HUB-CAI-BE'
ON CONFLICT (plate_number) DO NOTHING;

-- HUB-BUON-HO
INSERT INTO fleet_vehicles (warehouse_id, plate_number, vehicle_model, vehicle_type, capacity_kg, volume_m3, min_temp, max_temp, status, notes)
SELECT id, '47C-345.67', 'Hino Dutro Lạnh 3.5 Tấn', 'REFRIGERATED_TRUCK', 3500.00, 16.50, 2.0, 6.0, 'AVAILABLE', 'Gom nông sản vùng cao Đắk Lắk'
FROM warehouse_hubs WHERE hub_code = 'HUB-BUON-HO'
ON CONFLICT (plate_number) DO NOTHING;

INSERT INTO fleet_vehicles (warehouse_id, plate_number, vehicle_model, vehicle_type, capacity_kg, volume_m3, min_temp, max_temp, status, notes)
SELECT id, '47C-890.12', 'Hyundai Mighty Lạnh 7.5 Tấn', 'REFRIGERATED_TRUCK', 7500.00, 36.00, 2.0, 6.0, 'AVAILABLE', 'Tải lớn gom sầu riêng và bơ'
FROM warehouse_hubs WHERE hub_code = 'HUB-BUON-HO'
ON CONFLICT (plate_number) DO NOTHING;

-- HUB-HA-NOI
INSERT INTO fleet_vehicles (warehouse_id, plate_number, vehicle_model, vehicle_type, capacity_kg, volume_m3, min_temp, max_temp, status, notes)
SELECT id, '29H-882.14', 'Isuzu NQR550 Lạnh 5.5 Tấn', 'REFRIGERATED_TRUCK', 5500.00, 26.00, 2.0, 6.0, 'AVAILABLE', 'Xe phân phối và gom hàng Bắc Bộ'
FROM warehouse_hubs WHERE hub_code = 'HUB-HA-NOI'
ON CONFLICT (plate_number) DO NOTHING;

INSERT INTO fleet_vehicles (warehouse_id, plate_number, vehicle_model, vehicle_type, capacity_kg, volume_m3, min_temp, max_temp, status, notes)
SELECT id, '29C-554.32', 'Thaco Auman Lạnh 9.0 Tấn', 'REFRIGERATED_TRUCK', 9000.00, 42.00, 2.0, 6.0, 'AVAILABLE', 'Xe tải nặng luân chuyển liên tỉnh'
FROM warehouse_hubs WHERE hub_code = 'HUB-HA-NOI'
ON CONFLICT (plate_number) DO NOTHING;

-- 9. Seed Đội ngũ Tài xế theo từng Hub
-- HUB-DUC-TRONG
INSERT INTO fleet_drivers (warehouse_id, driver_code, full_name, phone, license_number, license_class, status, experience_years)
SELECT id, 'DRV-DT-01', 'Nguyễn Văn Tài', '0944.556.677', 'GPLX-790123456789', 'C', 'AVAILABLE', 8
FROM warehouse_hubs WHERE hub_code = 'HUB-DUC-TRONG'
ON CONFLICT (driver_code) DO NOTHING;

INSERT INTO fleet_drivers (warehouse_id, driver_code, full_name, phone, license_number, license_class, status, experience_years)
SELECT id, 'DRV-DT-02', 'Trần Quốc Bảo', '0982.112.233', 'GPLX-790987654321', 'C', 'AVAILABLE', 6
FROM warehouse_hubs WHERE hub_code = 'HUB-DUC-TRONG'
ON CONFLICT (driver_code) DO NOTHING;

INSERT INTO fleet_drivers (warehouse_id, driver_code, full_name, phone, license_number, license_class, status, experience_years)
SELECT id, 'DRV-DT-03', 'Lê Văn Hùng', '0973.889.911', 'GPLX-790456123789', 'B2', 'AVAILABLE', 4
FROM warehouse_hubs WHERE hub_code = 'HUB-DUC-TRONG'
ON CONFLICT (driver_code) DO NOTHING;

-- HUB-CU-CHI
INSERT INTO fleet_drivers (warehouse_id, driver_code, full_name, phone, license_number, license_class, status, experience_years)
SELECT id, 'DRV-CC-01', 'Vũ Văn Tuấn', '0912.334.455', 'GPLX-790789123456', 'B2', 'AVAILABLE', 5
FROM warehouse_hubs WHERE hub_code = 'HUB-CU-CHI'
ON CONFLICT (driver_code) DO NOTHING;

INSERT INTO fleet_drivers (warehouse_id, driver_code, full_name, phone, license_number, license_class, status, experience_years)
SELECT id, 'DRV-CC-02', 'Đỗ Minh Trí', '0903.667.788', 'GPLX-790321654987', 'C', 'AVAILABLE', 7
FROM warehouse_hubs WHERE hub_code = 'HUB-CU-CHI'
ON CONFLICT (driver_code) DO NOTHING;

-- HUB-CAI-BE
INSERT INTO fleet_drivers (warehouse_id, driver_code, full_name, phone, license_number, license_class, status, experience_years)
SELECT id, 'DRV-CB-01', 'Phạm Quốc Thịnh', '0939.112.244', 'GPLX-820123456789', 'B', 'AVAILABLE', 3
FROM warehouse_hubs WHERE hub_code = 'HUB-CAI-BE'
ON CONFLICT (driver_code) DO NOTHING;

INSERT INTO fleet_drivers (warehouse_id, driver_code, full_name, phone, license_number, license_class, status, experience_years)
SELECT id, 'DRV-CB-02', 'Võ Hoài Nam', '0949.778.899', 'GPLX-820987654321', 'C1', 'AVAILABLE', 5
FROM warehouse_hubs WHERE hub_code = 'HUB-CAI-BE'
ON CONFLICT (driver_code) DO NOTHING;

-- HUB-BUON-HO
INSERT INTO fleet_drivers (warehouse_id, driver_code, full_name, phone, license_number, license_class, status, experience_years)
SELECT id, 'DRV-BH-01', 'Nguyễn Tiến Dũng', '0978.445.566', 'GPLX-470123456789', 'C1', 'AVAILABLE', 4
FROM warehouse_hubs WHERE hub_code = 'HUB-BUON-HO'
ON CONFLICT (driver_code) DO NOTHING;

INSERT INTO fleet_drivers (warehouse_id, driver_code, full_name, phone, license_number, license_class, status, experience_years)
SELECT id, 'DRV-BH-02', 'Bùi Xuân Hòa', '0919.223.344', 'GPLX-470987654321', 'C', 'AVAILABLE', 9
FROM warehouse_hubs WHERE hub_code = 'HUB-BUON-HO'
ON CONFLICT (driver_code) DO NOTHING;

-- HUB-HA-NOI
INSERT INTO fleet_drivers (warehouse_id, driver_code, full_name, phone, license_number, license_class, status, experience_years)
SELECT id, 'DRV-HN-01', 'Nguyễn Văn Tài (Bắc Bộ)', '0981.234.567', 'GPLX-290123456789', 'C', 'AVAILABLE', 10
FROM warehouse_hubs WHERE hub_code = 'HUB-HA-NOI'
ON CONFLICT (driver_code) DO NOTHING;

INSERT INTO fleet_drivers (warehouse_id, driver_code, full_name, phone, license_number, license_class, status, experience_years)
SELECT id, 'DRV-HN-02', 'Lê Hữu Đạt', '0976.554.433', 'GPLX-290987654321', 'CE', 'AVAILABLE', 12
FROM warehouse_hubs WHERE hub_code = 'HUB-HA-NOI'
ON CONFLICT (driver_code) DO NOTHING;
