-- V19__fix_vietnamese_font_encoding_farmers.sql
-- Khắc phục triệt để lỗi font chữ (Mojibake UTF-8/Windows-1252) cho các bảng nông dân và lô nông sản

-- 1. Cập nhật bảng farmer_profiles chuẩn tiếng Việt có dấu
UPDATE farmer_profiles SET 
    farm_name = 'HTX Nông Nghiệp Đà Lạt GAP',
    location = 'Tiểu khu 158, Phường 8, TP. Đà Lạt, Tỉnh Lâm Đồng',
    bank_account_name = 'HTX NONG NGHIEP DA LAT GAP'
WHERE user_id = (SELECT id FROM users WHERE username = 'farmer_dalat');

UPDATE farmer_profiles SET 
    farm_name = 'HTX Nông Nghiệp Rau Sạch Đơn Dương',
    location = 'Xã Tu Tra, Huyện Đơn Dương, Tỉnh Lâm Đồng',
    bank_account_name = 'HTX NONG NGHIEP DON DUONG'
WHERE user_id = (SELECT id FROM users WHERE username = 'farmer_donduong');

UPDATE farmer_profiles SET 
    farm_name = 'Hợp Tác Xã Rau Củ Quả Buôn Hồ',
    location = 'Phường An Lạc, Thị xã Buôn Hồ, Đắk Lắk',
    bank_account_name = 'HTX RAU CU QUA BUON HO'
WHERE user_id = (SELECT id FROM users WHERE username = 'farmer_buonho');

UPDATE farmer_profiles SET 
    farm_name = 'HTX Nông Nghiệp Công Nghệ Cao Củ Chi',
    location = 'Xã Nhuận Đức, Huyện Củ Chi, TP.HCM',
    bank_account_name = 'HTX NN CONG NGHE CAO CU CHI'
WHERE user_id = (SELECT id FROM users WHERE username = 'farmer_saigon');

UPDATE farmer_profiles SET 
    farm_name = 'Hợp Tác Xã Nông Nghiệp Xanh Mộc Châu',
    location = 'Thị trấn Nông Trường Mộc Châu, Sơn La',
    bank_account_name = 'HTX NONG NGHIEP XANH MOC CHAU'
WHERE user_id = (SELECT id FROM users WHERE username = 'farmer_mocchau');

-- 2. Cập nhật bảng users chuẩn tiếng Việt có dấu
UPDATE users SET 
    full_name = 'Nguyễn Văn Nông',
    company_name = 'HTX Nông Nghiệp Đà Lạt GAP',
    address = 'Tiểu khu 158, Phường 8, TP. Đà Lạt, Tỉnh Lâm Đồng'
WHERE username = 'farmer_dalat';

UPDATE users SET 
    full_name = 'Ông Nguyễn Văn Thành',
    company_name = 'HTX Nông Nghiệp Rau Sạch Đơn Dương',
    address = 'Xã Tu Tra, Huyện Đơn Dương, Tỉnh Lâm Đồng'
WHERE username = 'farmer_donduong';

UPDATE users SET 
    full_name = 'Bà Hoàng Thị Mai',
    company_name = 'Hợp Tác Xã Rau Củ Quả Buôn Hồ',
    address = 'Phường An Lạc, Thị xã Buôn Hồ, Đắk Lắk'
WHERE username = 'farmer_buonho';

UPDATE users SET 
    full_name = 'Ông Phan Văn Giàu',
    company_name = 'HTX Nông Nghiệp Công Nghệ Cao Củ Chi',
    address = 'Xã Nhuận Đức, Huyện Củ Chi, TP.HCM'
WHERE username = 'farmer_saigon';

UPDATE users SET 
    full_name = 'Kỹ sư Vũ Đình Trọng',
    company_name = 'Hợp Tác Xã Nông Nghiệp Xanh Mộc Châu',
    address = 'Thị trấn Nông Trường Mộc Châu, Sơn La'
WHERE username = 'farmer_mocchau';

-- 3. Cập nhật bảng harvest_lots chuẩn tên nhà vườn
UPDATE harvest_lots SET farmer_name = 'HTX Nông Nghiệp Đà Lạt GAP' 
WHERE farmer_id = (SELECT id FROM users WHERE username = 'farmer_dalat');

UPDATE harvest_lots SET farmer_name = 'HTX Nông Nghiệp Rau Sạch Đơn Dương' 
WHERE farmer_id = (SELECT id FROM users WHERE username = 'farmer_donduong');

UPDATE harvest_lots SET farmer_name = 'Hợp Tác Xã Rau Củ Quả Buôn Hồ' 
WHERE farmer_id = (SELECT id FROM users WHERE username = 'farmer_buonho');

UPDATE harvest_lots SET farmer_name = 'HTX Nông Nghiệp Công Nghệ Cao Củ Chi' 
WHERE farmer_id = (SELECT id FROM users WHERE username = 'farmer_saigon');

UPDATE harvest_lots SET farmer_name = 'Hợp Tác Xã Nông Nghiệp Xanh Mộc Châu' 
WHERE farmer_id = (SELECT id FROM users WHERE username = 'farmer_mocchau');
