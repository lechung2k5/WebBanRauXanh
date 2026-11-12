-- V11__fix_vietnamese_font_encoding.sql
-- Sửa triệt để các ký tự tiếng Việt bị lỗi font dấu hỏi (?) do lỗi encoding trong database

UPDATE cold_assets SET asset_name = 'Buồng Lạnh Lưu Trữ Trạm Đà Lạt A1' WHERE asset_code = 'CR-DL-01';
UPDATE cold_assets SET asset_name = 'Buồng Lạnh Trung Chuyển Dầu Giây B2' WHERE asset_code = 'CR-DG-02';
UPDATE cold_assets SET asset_name = 'Xe Tải Lạnh HoNa Express Isuzu 5 Tấn (51D-882.34)' WHERE asset_code = 'TRK-51D-88234';
UPDATE cold_assets SET asset_name = 'Xe Tải Lạnh Lâm Đồng Fresh Hino 8 Tấn (49C-678.90)' WHERE asset_code = 'TRK-49C-67890';

UPDATE users SET full_name = 'Nguyễn Thị Minh Hạnh', address = '199-205 Nguyễn Thái Học, Quận 1, TP.HCM', company_name = 'Liên hiệp HTX Thương Mại TP.HCM (Saigon Co.op)', warehouse_address = 'Tổng Kho Phân Phối Co.op Mart, KCN Sóng Thần, Dĩ An, Bình Dương' WHERE username = 'buyer_coop';
UPDATE users SET full_name = 'Phạm Hoàng Nam', address = 'Tòa nhà Mplaza Saigon, 39 Lê Duẩn, Bến Nghé, Quận 1, TP.HCM', company_name = 'Công Ty Cổ Phần Dịch Vụ Thương Mại Tổng Hợp WinCommerce', warehouse_address = 'Trung Tâm Trung Chuyển Nông Sản WinMart, An Khánh, TP. Thủ Đức, TP.HCM' WHERE username = 'buyer_winmart';
UPDATE users SET full_name = 'Lê Trọng Đạt', address = '469 Nguyễn Hữu Thọ, Phường Tân Hưng, Quận 7, TP.HCM', company_name = 'Công Ty TNHH Trung Tâm Thương Mại Lotte Việt Nam', warehouse_address = 'Kho Lạnh Phân Phối Nông Sản Lotte Mart Miền Nam, Quận 7, TP.HCM' WHERE username = 'buyer_lotte';
UPDATE users SET full_name = 'Trần Thị Thương', address = 'Quận Bình Tân, TP.HCM', company_name = 'Công Ty TNHH Thu Mua Sỉ Nông Sản Sài Gòn', warehouse_address = 'Kho Tổng hợp Chuỗi Lạnh Thủ Đức, TP.HCM' WHERE username = 'buyer_sg';
UPDATE users SET full_name = 'Kỹ Thuật Viên Kiểm Định 01', address = 'Trạm Trung Chuyển Dầu Giây, Đồng Nai' WHERE username = 'qc_tram1';
UPDATE users SET full_name = 'Tài Xế Nguyễn Văn Tài', address = 'Đội xe Lạnh HoNa Express, TP.HCM' WHERE username = 'driver_tms';
UPDATE users SET full_name = 'Kế Toán Viên Lê Thị Thu', address = 'Phòng Tài Chính - Kế Toán HoNa Fresh, TP.HCM' WHERE username = 'accountant_vas';

UPDATE b2b_contracts SET delivery_address = 'Kho Tổng Hợp Co.op Mart, Dĩ An, Bình Dương' WHERE contract_code = 'HD-2026-B2B-001';
UPDATE b2b_contracts SET delivery_address = 'Kho Nông Sản WinMart Thủ Đức, TP.HCM' WHERE contract_code = 'HD-2026-B2B-002';
UPDATE b2b_contracts SET delivery_address = 'Kho Lạnh Lotte Mart Miền Nam, Quận 7, TP.HCM' WHERE contract_code = 'HD-2026-B2B-003';
UPDATE b2b_contracts SET delivery_address = 'Kho Tổng Hợp Big C An Phú, TP. Thủ Đức, TP.HCM' WHERE contract_code = 'HD-2026-B2B-004';
UPDATE b2b_contracts SET delivery_address = 'Tổng Kho Central Retail Bình Dương' WHERE contract_code = 'HD-2026-B2B-005';

UPDATE hub_inspections SET qc_note = 'Rau tươi xanh đồng đều, cuống không dập nát, đạt chuẩn kiểm định VietGAP xuất khẩu.' WHERE inspection_code = 'QC-20261011-001';
UPDATE hub_inspections SET qc_note = 'Bắp cải trái tim chặt búp, cuống khô sạch, không sâu bệnh, bảo quản buồng lạnh tốt.' WHERE inspection_code = 'QC-20261013-002';
UPDATE hub_inspections SET qc_note = 'Cà rốt loại 1 đều củ, màu cam đậm tự nhiên, hàm lượng đường đạt tiêu chuẩn tươi ngọt.' WHERE inspection_code = 'QC-20261016-003';
UPDATE hub_inspections SET qc_note = 'Su hào búp tròn non ngọt, không xơ, thu hoạch sáng sớm chuyển thẳng trạm lạnh.' WHERE inspection_code = 'QC-20261019-004';
UPDATE hub_inspections SET qc_note = 'Xà lách Iceberg cuộn chặt tròn đều, nhiệt độ lõi 4°C trước khi lên xe lạnh vận chuyển.' WHERE inspection_code = 'QC-20261025-005';

UPDATE shipments SET epod_signature_name = 'Trần Thị Thương (Giám Đốc Thu Mua)' WHERE shipment_code = 'SHP-20261012-001';
UPDATE shipments SET epod_signature_name = 'Nguyễn Hoàng Nam (Trưởng Kho Tiếp Nhận)' WHERE shipment_code = 'SHP-20261015-002';
UPDATE shipments SET epod_signature_name = 'Nguyễn Hoàng Nam (Trưởng Kho Tiếp Nhận)' WHERE shipment_code = 'SHP-20261018-003';
UPDATE shipments SET epod_signature_name = 'Kim Jin Woo (Logistics Lotte Mart)' WHERE shipment_code = 'SHP-20261021-004';
UPDATE shipments SET epod_signature_name = 'Trần Thị Thương (Giám Đốc Thu Mua)' WHERE shipment_code = 'SHP-20261025-005';

