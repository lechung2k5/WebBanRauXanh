-- V6__seed_sample_b2b_contracts.sql
-- Tự động import dữ liệu mẫu hợp đồng sỉ B2B & ký quỹ escrow đã giao dịch thành công (SETTLED) và các hợp đồng đang thực hiện

-- 1. Bổ sung các tài khoản Doanh nghiệp thu mua / Siêu thị B2B uy tín (nếu chưa có)
INSERT INTO users (username, password, full_name, email, phone, address, company_name, tax_code, warehouse_address, enabled, email_verified, kyc_status, created_at)
VALUES 
  ('buyer_coop', '$2a$10$g20zYXhEyUGPQRsBFG61bOdi30JeaalkUncB9.l2OFsPeXYc6TttC', 'Nguyễn Thị Minh Hạnh', 'thu-mua@saigonco-op.com.vn', '02838360143', '199-205 Nguyễn Thái Học, Quận 1, TP.HCM', 'Liên hiệp HTX Thương Mại TP.HCM (Saigon Co.op)', '0300481559', 'Tổng Kho Phân Phối Co.op Mart, KCN Sóng Thần, Dĩ An, Bình Dương', TRUE, TRUE, 'VERIFIED', '2026-10-01 08:00:00+07'),
  ('buyer_winmart', '$2a$10$g20zYXhEyUGPQRsBFG61bOdi30JeaalkUncB9.l2OFsPeXYc6TttC', 'Phạm Hoàng Nam', 'purchasing@winmart.masangroup.com', '02471066866', 'Tòa nhà Mplaza Saigon, 39 Lê Duẩn, Bến Nghé, Quận 1, TP.HCM', 'Công Ty Cổ Phần Dịch Vụ Thương Mại Tổng Hợp WinCommerce', '0104918404', 'Trung Tâm Trung Chuyển Nông Sản WinMart, An Khánh, TP. Thủ Đức, TP.HCM', TRUE, TRUE, 'VERIFIED', '2026-10-02 08:30:00+07'),
  ('buyer_lotte', '$2a$10$g20zYXhEyUGPQRsBFG61bOdi30JeaalkUncB9.l2OFsPeXYc6TttC', 'Lê Trọng Đạt', 'freshfood@lotte.vn', '02837753232', '469 Nguyễn Hữu Thọ, Phường Tân Hưng, Quận 7, TP.HCM', 'Công Ty TNHH Trung Tâm Thương Mại Lotte Việt Nam', '0304741634', 'Kho Lạnh Phân Phối Nông Sản Lotte Mart Miền Nam, Quận 7, TP.HCM', TRUE, TRUE, 'VERIFIED', '2026-10-03 09:00:00+07')
ON CONFLICT (username) DO UPDATE 
SET full_name = EXCLUDED.full_name,
    address = EXCLUDED.address,
    company_name = EXCLUDED.company_name, 
    warehouse_address = EXCLUDED.warehouse_address, 
    kyc_status = 'VERIFIED', 
    email_verified = TRUE;

-- Gán quyền ROLE_BUYER cho các đối tác thu mua
INSERT INTO users_roles (user_id, role_id)
SELECT u.id, r.id 
FROM users u 
CROSS JOIN roles r 
WHERE u.username IN ('buyer_coop', 'buyer_winmart', 'buyer_lotte') 
  AND r.name = 'ROLE_BUYER'
ON CONFLICT DO NOTHING;

-- Đảm bảo buyer_sg có đầy đủ thông tin chuẩn hóa
UPDATE users 
SET company_name = 'Công Ty TNHH Thu Mua Sỉ Nông Sản Sài Gòn',
    tax_code = '0312345678',
    warehouse_address = 'Kho Tổng hợp Chuỗi Lạnh Thủ Đức, TP.HCM',
    kyc_status = 'VERIFIED',
    email_verified = TRUE
WHERE username = 'buyer_sg';

-- 2. Khởi tạo tài sản chuỗi lạnh (Cold Assets: Buồng lạnh Hub & Xe tải lạnh) nếu chưa có
INSERT INTO cold_assets (asset_code, asset_type, asset_name, capacity_kg, driver_id, current_temp, current_humidity, target_temp_min, target_temp_max, status)
VALUES 
  ('CR-DL-01', 'COLD_ROOM', 'Buồng Lạnh Lưu Trữ Trạm Đà Lạt A1', 25000.00, NULL, 4.0, 85.0, 2.0, 6.0, 'NORMAL'),
  ('CR-DG-02', 'COLD_ROOM', 'Buồng Lạnh Trung Chuyển Dầu Giây B2', 30000.00, NULL, 3.8, 88.0, 2.0, 6.0, 'NORMAL'),
  ('TRK-51D-88234', 'REFRIGERATED_TRUCK', 'Xe Tải Lạnh HoNa Express Isuzu 5 Tấn (51D-882.34)', 5000.00, (SELECT id FROM users WHERE username = 'driver_tms' LIMIT 1), 4.2, 85.0, 2.0, 6.0, 'NORMAL'),
  ('TRK-49C-67890', 'REFRIGERATED_TRUCK', 'Xe Tải Lạnh Lâm Đồng Fresh Hino 8 Tấn (49C-678.90)', 8000.00, (SELECT id FROM users WHERE username = 'driver_tms' LIMIT 1), 3.9, 86.0, 2.0, 6.0, 'NORMAL')
ON CONFLICT (asset_code) DO UPDATE 
SET status = 'NORMAL', current_temp = EXCLUDED.current_temp, current_humidity = EXCLUDED.current_humidity;

-- 3. Xóa dữ liệu cũ nếu trùng mã hợp đồng mẫu để đồng bộ mới hoàn chỉnh
DELETE FROM gl_journal_lines WHERE entry_id IN (SELECT id FROM gl_journal_entries WHERE contract_id IN (SELECT id FROM b2b_contracts WHERE contract_code LIKE 'HD-2026-B2B-%'));
DELETE FROM gl_journal_entries WHERE contract_id IN (SELECT id FROM b2b_contracts WHERE contract_code LIKE 'HD-2026-B2B-%');
DELETE FROM spoilage_claims WHERE contract_id IN (SELECT id FROM b2b_contracts WHERE contract_code LIKE 'HD-2026-B2B-%');
DELETE FROM shipments WHERE contract_id IN (SELECT id FROM b2b_contracts WHERE contract_code LIKE 'HD-2026-B2B-%');
DELETE FROM hub_inspections WHERE contract_id IN (SELECT id FROM b2b_contracts WHERE contract_code LIKE 'HD-2026-B2B-%');
DELETE FROM b2b_contracts WHERE contract_code LIKE 'HD-2026-B2B-%';

-- 4. Thêm 6 Hợp Đồng B2B Nguyên Tắc Mẫu (4 SETTLED thành công, 1 DELIVERED, 1 DEPOSIT_PAID)
-- Contract 1: Cải Bó Xôi Đà Lạt -> Saigon Buyer (SETTLED)
INSERT INTO b2b_contracts (
  contract_code, lot_id, farmer_id, buyer_id, 
  offered_weight_kg, offered_price_per_kg, total_goods_amount, deposit_30_amount, 
  platform_fee_rate, platform_fee_amount, logistics_fee_amount, service_vat_rate, 
  delivery_address, status, deposit_ref, balance_ref, payout_ref, 
  deposit_received, balance_received, payout_amount, refund_amount, created_at, updated_at
) VALUES (
  'HD-2026-B2B-001', 
  (SELECT id FROM harvest_lots WHERE lot_code = 'LOT-LD-2026-001' LIMIT 1), 
  (SELECT id FROM users WHERE username = 'farmer_dalat' LIMIT 1), 
  (SELECT id FROM users WHERE username = 'buyer_sg' LIMIT 1), 
  1500.00, 18000.00, 27000000.00, 8100000.00, 
  3.00, 810000.00, 1200000.00, 10.00, 
  'Kho Tổng hợp Chuỗi Lạnh Thủ Đức, TP.HCM', 'SETTLED', 
  'DEP-20261010-001', 'BAL-20261014-001', 'PAY-20261016-001', 
  8100000.00, 18900000.00, 24789000.00, 0.00, 
  '2026-10-10 09:15:00+07', '2026-10-16 16:30:00+07'
);

-- Contract 2: Bắp Cải Trái Tim Đơn Dương -> Saigon Co.op (SETTLED)
INSERT INTO b2b_contracts (
  contract_code, lot_id, farmer_id, buyer_id, 
  offered_weight_kg, offered_price_per_kg, total_goods_amount, deposit_30_amount, 
  platform_fee_rate, platform_fee_amount, logistics_fee_amount, service_vat_rate, 
  delivery_address, status, deposit_ref, balance_ref, payout_ref, 
  deposit_received, balance_received, payout_amount, refund_amount, created_at, updated_at
) VALUES (
  'HD-2026-B2B-002', 
  (SELECT id FROM harvest_lots WHERE lot_code = 'LOT-DD-2026-002' LIMIT 1), 
  (SELECT id FROM users WHERE username = 'farmer_dalat' LIMIT 1), 
  (SELECT id FROM users WHERE username = 'buyer_coop' LIMIT 1), 
  3000.00, 12000.00, 36000000.00, 10800000.00, 
  3.00, 1080000.00, 1800000.00, 10.00, 
  'Tổng Kho Phân Phối Co.op Mart, KCN Sóng Thần, Dĩ An, Bình Dương', 'SETTLED', 
  'DEP-20261012-002', 'BAL-20261017-002', 'PAY-20261019-002', 
  10800000.00, 25200000.00, 32832000.00, 0.00, 
  '2026-10-12 10:30:00+07', '2026-10-19 15:45:00+07'
);

-- Contract 3: Cà Rốt Hữu Cơ Đà Lạt -> WinCommerce (SETTLED)
INSERT INTO b2b_contracts (
  contract_code, lot_id, farmer_id, buyer_id, 
  offered_weight_kg, offered_price_per_kg, total_goods_amount, deposit_30_amount, 
  platform_fee_rate, platform_fee_amount, logistics_fee_amount, service_vat_rate, 
  delivery_address, status, deposit_ref, balance_ref, payout_ref, 
  deposit_received, balance_received, payout_amount, refund_amount, created_at, updated_at
) VALUES (
  'HD-2026-B2B-003', 
  (SELECT id FROM harvest_lots WHERE lot_code = 'LOT-DD-2026-014' LIMIT 1), 
  (SELECT id FROM users WHERE username = 'farmer_dalat' LIMIT 1), 
  (SELECT id FROM users WHERE username = 'buyer_winmart' LIMIT 1), 
  2500.00, 22000.00, 55000000.00, 16500000.00, 
  3.00, 1650000.00, 2000000.00, 10.00, 
  'Trung Tâm Trung Chuyển Nông Sản WinMart, An Khánh, TP. Thủ Đức, TP.HCM', 'SETTLED', 
  'DEP-20261015-003', 'BAL-20261021-003', 'PAY-20261023-003', 
  16500000.00, 38500000.00, 50985000.00, 0.00, 
  '2026-10-15 08:45:00+07', '2026-10-23 17:00:00+07'
);

-- Contract 4: Su Hào Mộc Châu / Nấm -> Lotte Mart (SETTLED)
INSERT INTO b2b_contracts (
  contract_code, lot_id, farmer_id, buyer_id, 
  offered_weight_kg, offered_price_per_kg, total_goods_amount, deposit_30_amount, 
  platform_fee_rate, platform_fee_amount, logistics_fee_amount, service_vat_rate, 
  delivery_address, status, deposit_ref, balance_ref, payout_ref, 
  deposit_received, balance_received, payout_amount, refund_amount, created_at, updated_at
) VALUES (
  'HD-2026-B2B-004', 
  (SELECT id FROM harvest_lots WHERE lot_code = 'LOT-SLA-2026-025' LIMIT 1), 
  (SELECT id FROM users WHERE username = 'farmer_dalat' LIMIT 1), 
  (SELECT id FROM users WHERE username = 'buyer_lotte' LIMIT 1), 
  3000.00, 16000.00, 48000000.00, 14400000.00, 
  3.00, 1440000.00, 1500000.00, 10.00, 
  'Kho Lạnh Phân Phối Nông Sản Lotte Mart Miền Nam, Quận 7, TP.HCM', 'SETTLED', 
  'DEP-20261018-004', 'BAL-20261023-004', 'PAY-20261025-004', 
  14400000.00, 33600000.00, 44766000.00, 0.00, 
  '2026-10-18 11:00:00+07', '2026-10-25 14:20:00+07'
);

-- Contract 5: Xà Lách Iceberg Búp Tròn -> Saigon Buyer (DELIVERED - Chuẩn bị quyết toán)
INSERT INTO b2b_contracts (
  contract_code, lot_id, farmer_id, buyer_id, 
  offered_weight_kg, offered_price_per_kg, total_goods_amount, deposit_30_amount, 
  platform_fee_rate, platform_fee_amount, logistics_fee_amount, service_vat_rate, 
  delivery_address, status, deposit_ref, balance_ref, payout_ref, 
  deposit_received, balance_received, payout_amount, refund_amount, created_at, updated_at
) VALUES (
  'HD-2026-B2B-005', 
  (SELECT id FROM harvest_lots WHERE lot_code = 'LOT-LD-2026-013' LIMIT 1), 
  (SELECT id FROM users WHERE username = 'farmer_dalat' LIMIT 1), 
  (SELECT id FROM users WHERE username = 'buyer_sg' LIMIT 1), 
  2000.00, 32000.00, 64000000.00, 19200000.00, 
  3.00, 1920000.00, 1600000.00, 10.00, 
  'Kho Tổng hợp Chuỗi Lạnh Thủ Đức, TP.HCM', 'DELIVERED', 
  'DEP-20261024-005', 'BAL-20261026-005', NULL, 
  19200000.00, 44800000.00, 0.00, 0.00, 
  '2026-10-24 08:30:00+07', '2026-10-26 18:00:00+07'
);

-- Contract 6: Rau Cần Tây Thủy Canh -> WinCommerce (DEPOSIT_PAID - Đã cọc 30%, đang lưu kho kiểm định)
INSERT INTO b2b_contracts (
  contract_code, lot_id, farmer_id, buyer_id, 
  offered_weight_kg, offered_price_per_kg, total_goods_amount, deposit_30_amount, 
  platform_fee_rate, platform_fee_amount, logistics_fee_amount, service_vat_rate, 
  delivery_address, status, deposit_ref, balance_ref, payout_ref, 
  deposit_received, balance_received, payout_amount, refund_amount, created_at, updated_at
) VALUES (
  'HD-2026-B2B-006', 
  (SELECT id FROM harvest_lots WHERE lot_code = 'LOT-LD-2026-008' LIMIT 1), 
  (SELECT id FROM users WHERE username = 'farmer_dalat' LIMIT 1), 
  (SELECT id FROM users WHERE username = 'buyer_winmart' LIMIT 1), 
  1500.00, 28000.00, 42000000.00, 12600000.00, 
  3.00, 1260000.00, 1200000.00, 10.00, 
  'Trung Tâm Trung Chuyển Nông Sản WinMart, An Khánh, TP. Thủ Đức, TP.HCM', 'DEPOSIT_PAID', 
  'DEP-20261027-006', NULL, NULL, 
  12600000.00, 0.00, 0.00, 0.00, 
  '2026-10-27 09:00:00+07', '2026-10-27 10:30:00+07'
);

-- 5. Seed Biên bản Kiểm định Trạm QC (Hub Inspections) cho các hợp đồng
INSERT INTO hub_inspections (
  inspection_code, contract_id, cold_room_id, received_weight_kg, qualified_weight_kg, rejected_weight_kg, 
  brix_degree, moisture_pct, qc_staff_id, qc_note, inspected_at
) VALUES 
  ('QC-20261011-001', (SELECT id FROM b2b_contracts WHERE contract_code = 'HD-2026-B2B-001'), (SELECT id FROM cold_assets WHERE asset_code = 'CR-DL-01'), 1500.00, 1500.00, 0.00, 7.5, 88.0, (SELECT id FROM users WHERE username = 'qc_tram1' LIMIT 1), 'Rau tươi xanh đồng đều, cuống không dập nát, đạt chuẩn kiểm định VietGAP xuất khẩu.', '2026-10-11 14:00:00+07'),
  ('QC-20261013-002', (SELECT id FROM b2b_contracts WHERE contract_code = 'HD-2026-B2B-002'), (SELECT id FROM cold_assets WHERE asset_code = 'CR-DL-01'), 3000.00, 3000.00, 0.00, 6.8, 85.0, (SELECT id FROM users WHERE username = 'qc_tram1' LIMIT 1), 'Bắp cải trái tim chặt búp, cuống khô sạch, không sâu bệnh, bảo quản buồng lạnh tốt.', '2026-10-13 15:30:00+07'),
  ('QC-20261016-003', (SELECT id FROM b2b_contracts WHERE contract_code = 'HD-2026-B2B-003'), (SELECT id FROM cold_assets WHERE asset_code = 'CR-DG-02'), 2500.00, 2500.00, 0.00, 9.2, 82.0, (SELECT id FROM users WHERE username = 'qc_tram1' LIMIT 1), 'Cà rốt loại 1 đều củ, màu cam đậm tự nhiên, hàm lượng đường đạt tiêu chuẩn tươi ngọt.', '2026-10-16 11:20:00+07'),
  ('QC-20261019-004', (SELECT id FROM b2b_contracts WHERE contract_code = 'HD-2026-B2B-004'), (SELECT id FROM cold_assets WHERE asset_code = 'CR-DG-02'), 3000.00, 3000.00, 0.00, 5.5, 89.0, (SELECT id FROM users WHERE username = 'qc_tram1' LIMIT 1), 'Su hào búp tròn non ngọt, không xơ, thu hoạch sáng sớm chuyển thẳng trạm lạnh.', '2026-10-19 16:15:00+07'),
  ('QC-20261025-005', (SELECT id FROM b2b_contracts WHERE contract_code = 'HD-2026-B2B-005'), (SELECT id FROM cold_assets WHERE asset_code = 'CR-DL-01'), 2000.00, 2000.00, 0.00, 8.0, 87.0, (SELECT id FROM users WHERE username = 'qc_tram1' LIMIT 1), 'Xà lách Iceberg cuộn chặt tròn đều, nhiệt độ lõi 4°C trước khi lên xe lạnh vận chuyển.', '2026-10-25 10:00:00+07')
ON CONFLICT (inspection_code) DO NOTHING;

-- 6. Seed Lịch trình & Biên bản giao hàng Vận tải lạnh (Shipments & ePOD)
INSERT INTO shipments (
  shipment_code, contract_id, truck_id, driver_id, loaded_weight_kg, delivered_weight_kg, 
  damaged_weight_kg, natural_shrinkage_kg, epod_signature_name, epod_photo_url, epod_signature_data, 
  departed_at, delivered_at, status
) VALUES 
  ('SHP-20261012-001', (SELECT id FROM b2b_contracts WHERE contract_code = 'HD-2026-B2B-001'), (SELECT id FROM cold_assets WHERE asset_code = 'TRK-51D-88234'), (SELECT id FROM users WHERE username = 'driver_tms' LIMIT 1), 1500.00, 1500.00, 0.00, 0.00, 'Trần Thị Thương (Giám Đốc Thu Mua)', 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=800&auto=format&fit=crop&q=80', 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', '2026-10-12 04:00:00+07', '2026-10-14 11:30:00+07', 'DELIVERED'),
  ('SHP-20261015-002', (SELECT id FROM b2b_contracts WHERE contract_code = 'HD-2026-B2B-002'), (SELECT id FROM cold_assets WHERE asset_code = 'TRK-49C-67890'), (SELECT id FROM users WHERE username = 'driver_tms' LIMIT 1), 3000.00, 3000.00, 0.00, 0.00, 'Nguyễn Hoàng Nam (Trưởng Kho Tiếp Nhận)', 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=800&auto=format&fit=crop&q=80', 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', '2026-10-15 05:00:00+07', '2026-10-17 14:00:00+07', 'DELIVERED'),
  ('SHP-20261018-003', (SELECT id FROM b2b_contracts WHERE contract_code = 'HD-2026-B2B-003'), (SELECT id FROM cold_assets WHERE asset_code = 'TRK-51D-88234'), (SELECT id FROM users WHERE username = 'driver_tms' LIMIT 1), 2500.00, 2500.00, 0.00, 0.00, 'Vũ Đình Phong (Điều Phối WinMart)', 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=800&auto=format&fit=crop&q=80', 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', '2026-10-18 04:30:00+07', '2026-10-21 10:15:00+07', 'DELIVERED'),
  ('SHP-20261021-004', (SELECT id FROM b2b_contracts WHERE contract_code = 'HD-2026-B2B-004'), (SELECT id FROM cold_assets WHERE asset_code = 'TRK-49C-67890'), (SELECT id FROM users WHERE username = 'driver_tms' LIMIT 1), 3000.00, 3000.00, 0.00, 0.00, 'Kim Jin Woo (Logistics Lotte Mart)', 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=800&auto=format&fit=crop&q=80', 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', '2026-10-21 03:45:00+07', '2026-10-23 16:40:00+07', 'DELIVERED'),
  ('SHP-20261025-005', (SELECT id FROM b2b_contracts WHERE contract_code = 'HD-2026-B2B-005'), (SELECT id FROM cold_assets WHERE asset_code = 'TRK-51D-88234'), (SELECT id FROM users WHERE username = 'driver_tms' LIMIT 1), 2000.00, 2000.00, 0.00, 0.00, 'Trần Thị Thương (Giám Đốc Thu Mua)', 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=800&auto=format&fit=crop&q=80', 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', '2026-10-25 04:00:00+07', '2026-10-26 15:30:00+07', 'DELIVERED')
ON CONFLICT (shipment_code) DO NOTHING;

-- 7. Seed Bút toán Sổ cái Kế toán kép VAS (GL Journal Entries & Lines)
-- 7.1 Contract 1 (HD-2026-B2B-001) - SETTLED
INSERT INTO gl_journal_entries (contract_id, event, reference, created_at) VALUES 
  ((SELECT id FROM b2b_contracts WHERE contract_code = 'HD-2026-B2B-001'), 'DEPOSIT', 'DEP-20261010-001', '2026-10-10 10:00:00+07'),
  ((SELECT id FROM b2b_contracts WHERE contract_code = 'HD-2026-B2B-001'), 'BALANCE', 'BAL-20261014-001', '2026-10-14 14:00:00+07'),
  ((SELECT id FROM b2b_contracts WHERE contract_code = 'HD-2026-B2B-001'), 'SETTLEMENT', 'PAY-20261016-001', '2026-10-16 16:30:00+07');

INSERT INTO gl_journal_lines (entry_id, account, debit, credit) VALUES 
  -- Deposit: Thu cọc 30% vào TK 112, treo nợ giữ hộ TK 3388
  ((SELECT id FROM gl_journal_entries WHERE reference = 'DEP-20261010-001'), '112', 8100000.00, 0.00),
  ((SELECT id FROM gl_journal_entries WHERE reference = 'DEP-20261010-001'), '3388', 0.00, 8100000.00),
  -- Balance: Thu phần 70% còn lại sau giao hàng vào TK 112, treo nợ TK 3388
  ((SELECT id FROM gl_journal_entries WHERE reference = 'BAL-20261014-001'), '112', 18900000.00, 0.00),
  ((SELECT id FROM gl_journal_entries WHERE reference = 'BAL-20261014-001'), '3388', 0.00, 18900000.00),
  -- Settlement: Hoàn tất giải ngân 3388 -> ghi nhận Doanh thu phí sàn 5113, VAT 3331, chi tiền thực nhận cho Nông dân 112
  ((SELECT id FROM gl_journal_entries WHERE reference = 'PAY-20261016-001'), '3388', 27000000.00, 0.00),
  ((SELECT id FROM gl_journal_entries WHERE reference = 'PAY-20261016-001'), '5113', 0.00, 2010000.00),
  ((SELECT id FROM gl_journal_entries WHERE reference = 'PAY-20261016-001'), '3331', 0.00, 201000.00),
  ((SELECT id FROM gl_journal_entries WHERE reference = 'PAY-20261016-001'), '112', 0.00, 24789000.00);

-- 7.2 Contract 2 (HD-2026-B2B-002) - SETTLED
INSERT INTO gl_journal_entries (contract_id, event, reference, created_at) VALUES 
  ((SELECT id FROM b2b_contracts WHERE contract_code = 'HD-2026-B2B-002'), 'DEPOSIT', 'DEP-20261012-002', '2026-10-12 11:00:00+07'),
  ((SELECT id FROM b2b_contracts WHERE contract_code = 'HD-2026-B2B-002'), 'BALANCE', 'BAL-20261017-002', '2026-10-17 15:00:00+07'),
  ((SELECT id FROM b2b_contracts WHERE contract_code = 'HD-2026-B2B-002'), 'SETTLEMENT', 'PAY-20261019-002', '2026-10-19 15:45:00+07');

INSERT INTO gl_journal_lines (entry_id, account, debit, credit) VALUES 
  ((SELECT id FROM gl_journal_entries WHERE reference = 'DEP-20261012-002'), '112', 10800000.00, 0.00),
  ((SELECT id FROM gl_journal_entries WHERE reference = 'DEP-20261012-002'), '3388', 0.00, 10800000.00),
  ((SELECT id FROM gl_journal_entries WHERE reference = 'BAL-20261017-002'), '112', 25200000.00, 0.00),
  ((SELECT id FROM gl_journal_entries WHERE reference = 'BAL-20261017-002'), '3388', 0.00, 25200000.00),
  ((SELECT id FROM gl_journal_entries WHERE reference = 'PAY-20261019-002'), '3388', 36000000.00, 0.00),
  ((SELECT id FROM gl_journal_entries WHERE reference = 'PAY-20261019-002'), '5113', 0.00, 2880000.00),
  ((SELECT id FROM gl_journal_entries WHERE reference = 'PAY-20261019-002'), '3331', 0.00, 288000.00),
  ((SELECT id FROM gl_journal_entries WHERE reference = 'PAY-20261019-002'), '112', 0.00, 32832000.00);

-- 7.3 Contract 3 (HD-2026-B2B-003) - SETTLED
INSERT INTO gl_journal_entries (contract_id, event, reference, created_at) VALUES 
  ((SELECT id FROM b2b_contracts WHERE contract_code = 'HD-2026-B2B-003'), 'DEPOSIT', 'DEP-20261015-003', '2026-10-15 09:30:00+07'),
  ((SELECT id FROM b2b_contracts WHERE contract_code = 'HD-2026-B2B-003'), 'BALANCE', 'BAL-20261021-003', '2026-10-21 14:30:00+07'),
  ((SELECT id FROM b2b_contracts WHERE contract_code = 'HD-2026-B2B-003'), 'SETTLEMENT', 'PAY-20261023-003', '2026-10-23 17:00:00+07');

INSERT INTO gl_journal_lines (entry_id, account, debit, credit) VALUES 
  ((SELECT id FROM gl_journal_entries WHERE reference = 'DEP-20261015-003'), '112', 16500000.00, 0.00),
  ((SELECT id FROM gl_journal_entries WHERE reference = 'DEP-20261015-003'), '3388', 0.00, 16500000.00),
  ((SELECT id FROM gl_journal_entries WHERE reference = 'BAL-20261021-003'), '112', 38500000.00, 0.00),
  ((SELECT id FROM gl_journal_entries WHERE reference = 'BAL-20261021-003'), '3388', 0.00, 38500000.00),
  ((SELECT id FROM gl_journal_entries WHERE reference = 'PAY-20261023-003'), '3388', 55000000.00, 0.00),
  ((SELECT id FROM gl_journal_entries WHERE reference = 'PAY-20261023-003'), '5113', 0.00, 3650000.00),
  ((SELECT id FROM gl_journal_entries WHERE reference = 'PAY-20261023-003'), '3331', 0.00, 365000.00),
  ((SELECT id FROM gl_journal_entries WHERE reference = 'PAY-20261023-003'), '112', 0.00, 50985000.00);

-- 7.4 Contract 4 (HD-2026-B2B-004) - SETTLED
INSERT INTO gl_journal_entries (contract_id, event, reference, created_at) VALUES 
  ((SELECT id FROM b2b_contracts WHERE contract_code = 'HD-2026-B2B-004'), 'DEPOSIT', 'DEP-20261018-004', '2026-10-18 12:00:00+07'),
  ((SELECT id FROM b2b_contracts WHERE contract_code = 'HD-2026-B2B-004'), 'BALANCE', 'BAL-20261023-004', '2026-10-23 17:15:00+07'),
  ((SELECT id FROM b2b_contracts WHERE contract_code = 'HD-2026-B2B-004'), 'SETTLEMENT', 'PAY-20261025-004', '2026-10-25 14:20:00+07');

INSERT INTO gl_journal_lines (entry_id, account, debit, credit) VALUES 
  ((SELECT id FROM gl_journal_entries WHERE reference = 'DEP-20261018-004'), '112', 14400000.00, 0.00),
  ((SELECT id FROM gl_journal_entries WHERE reference = 'DEP-20261018-004'), '3388', 0.00, 14400000.00),
  ((SELECT id FROM gl_journal_entries WHERE reference = 'BAL-20261023-004'), '112', 33600000.00, 0.00),
  ((SELECT id FROM gl_journal_entries WHERE reference = 'BAL-20261023-004'), '3388', 0.00, 33600000.00),
  ((SELECT id FROM gl_journal_entries WHERE reference = 'PAY-20261025-004'), '3388', 48000000.00, 0.00),
  ((SELECT id FROM gl_journal_entries WHERE reference = 'PAY-20261025-004'), '5113', 0.00, 2940000.00),
  ((SELECT id FROM gl_journal_entries WHERE reference = 'PAY-20261025-004'), '3331', 0.00, 294000.00),
  ((SELECT id FROM gl_journal_entries WHERE reference = 'PAY-20261025-004'), '112', 0.00, 44766000.00);

-- 7.5 Contract 5 (HD-2026-B2B-005) - DELIVERED (Đã nhận cọc và thanh toán nốt 70%, đang giữ hộ trên TK 3388 chờ duyệt quyết toán)
INSERT INTO gl_journal_entries (contract_id, event, reference, created_at) VALUES 
  ((SELECT id FROM b2b_contracts WHERE contract_code = 'HD-2026-B2B-005'), 'DEPOSIT', 'DEP-20261024-005', '2026-10-24 09:00:00+07'),
  ((SELECT id FROM b2b_contracts WHERE contract_code = 'HD-2026-B2B-005'), 'BALANCE', 'BAL-20261026-005', '2026-10-26 16:00:00+07');

INSERT INTO gl_journal_lines (entry_id, account, debit, credit) VALUES 
  ((SELECT id FROM gl_journal_entries WHERE reference = 'DEP-20261024-005'), '112', 19200000.00, 0.00),
  ((SELECT id FROM gl_journal_entries WHERE reference = 'DEP-20261024-005'), '3388', 0.00, 19200000.00),
  ((SELECT id FROM gl_journal_entries WHERE reference = 'BAL-20261026-005'), '112', 44800000.00, 0.00),
  ((SELECT id FROM gl_journal_entries WHERE reference = 'BAL-20261026-005'), '3388', 0.00, 44800000.00);

-- 7.6 Contract 6 (HD-2026-B2B-006) - DEPOSIT_PAID (Đã nhận cọc 30%, đang treo giữ hộ trên TK 3388)
INSERT INTO gl_journal_entries (contract_id, event, reference, created_at) VALUES 
  ((SELECT id FROM b2b_contracts WHERE contract_code = 'HD-2026-B2B-006'), 'DEPOSIT', 'DEP-20261027-006', '2026-10-27 09:30:00+07');

INSERT INTO gl_journal_lines (entry_id, account, debit, credit) VALUES 
  ((SELECT id FROM gl_journal_entries WHERE reference = 'DEP-20261027-006'), '112', 12600000.00, 0.00),
  ((SELECT id FROM gl_journal_entries WHERE reference = 'DEP-20261027-006'), '3388', 0.00, 12600000.00);

-- 8. Biên bản xử lý mẫu trong Spoilage Claims (DISMISSED - Đã giải quyết)
INSERT INTO spoilage_claims (
  claim_code, contract_id, damaged_weight_kg, cause, liable_party, 
  compensation_amount, status, resolution_note, resolution_ref, created_at
) VALUES (
  'CLM-20261016-001', 
  (SELECT id FROM b2b_contracts WHERE contract_code = 'HD-2026-B2B-002'), 
  20.00, 'Dập nhẹ góc lá ngoài do rung lắc trong vận chuyển trên cung đường đèo Bảo Lộc', 'PLATFORM', 
  240000.00, 'DISMISSED', 'Bên mua Saigon Co.op đã kiểm tra lại thực tế và đồng ý tỉ lệ hao hụt tự nhiên dưới 1%, xác nhận đóng biên bản không phát sinh bồi hoàn.', 'RES-DIS-20261017-001', 
  '2026-10-16 16:00:00+07'
) ON CONFLICT (claim_code) DO NOTHING;
