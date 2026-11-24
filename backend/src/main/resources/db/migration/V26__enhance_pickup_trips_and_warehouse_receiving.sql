-- V26__enhance_pickup_trips_and_warehouse_receiving.sql
-- Mở rộng quy trình 7 giai đoạn thực thi vận chuyển và tiếp nhận kiểm đếm nhập kho

-- 1. Bổ sung các mốc thời gian và thông tin tiếp nhận trên bảng pickup_trips
ALTER TABLE pickup_trips 
ADD COLUMN IF NOT EXISTS acknowledged_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS returning_time TIMESTAMP,
ADD COLUMN IF NOT EXISTS arrived_warehouse_time TIMESTAMP,
ADD COLUMN IF NOT EXISTS actual_total_weight_kg NUMERIC(10, 2),
ADD COLUMN IF NOT EXISTS actual_total_packages INT,
ADD COLUMN IF NOT EXISTS receiving_staff_id BIGINT REFERENCES users(id),
ADD COLUMN IF NOT EXISTS receiving_notes TEXT;

-- 2. Bổ sung trường bàn giao thực tế tại rẫy trên pickup_trip_stops
ALTER TABLE pickup_trip_stops
ADD COLUMN IF NOT EXISTS actual_weight_kg NUMERIC(10, 2),
ADD COLUMN IF NOT EXISTS actual_package_count INT,
ADD COLUMN IF NOT EXISTS handover_photo_url TEXT,
ADD COLUMN IF NOT EXISTS handover_signature_data TEXT,
ADD COLUMN IF NOT EXISTS issue_reason VARCHAR(100),
ADD COLUMN IF NOT EXISTS issue_notes TEXT;
