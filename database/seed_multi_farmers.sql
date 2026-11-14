DO $$
DECLARE
    r_farmer_id BIGINT;
    r_buyer_id BIGINT;
    u_id BIGINT;
BEGIN
    SELECT id INTO r_farmer_id FROM roles WHERE name = 'ROLE_FARMER';
    SELECT id INTO r_buyer_id FROM roles WHERE name = 'ROLE_BUYER';

    -- 1. farmer_donduong
    INSERT INTO users (username, password, full_name, email, phone, address, company_name, tax_code, puc_code, certification, household_farmer, email_verified, kyc_status, enabled, created_at, updated_at)
    VALUES ('farmer_donduong', '$2a$10$wE9iU7eOqXqF7O3XyY5Z.Oq5vUe1O.7Y5Z.Oq5vUe1O.7Y5Z.Oq5v', 'Ông Nguyễn Văn Thành', 'donduong@honafresh.vn', '0988100222', 'Xã Tu Tra, Huyện Đơn Dương, Tỉnh Lâm Đồng', 'HTX Nông Nghiệp Rau Sạch Đơn Dương', '5801459202', 'VN-LDO-PUC-0849', 'VietGAP, GlobalGAP', false, true, 'VERIFIED', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    ON CONFLICT (username) DO UPDATE SET full_name = EXCLUDED.full_name, company_name = EXCLUDED.company_name, updated_at = CURRENT_TIMESTAMP
    RETURNING id INTO u_id;
    INSERT INTO users_roles (user_id, role_id) VALUES (u_id, r_farmer_id) ON CONFLICT DO NOTHING;
    INSERT INTO farmer_profiles (user_id, farm_name, farmer_type, puc_code, tax_code, bank_account, bank_name, bank_account_name, location, cultivated_area, certifications, created_at, updated_at)
    VALUES (u_id, 'HTX Nông Nghiệp Rau Sạch Đơn Dương', 'COOPERATIVE', 'VN-LDO-PUC-0849', '5801459202', '0071001284920', 'Vietcombank - CN Lâm Đồng', 'HTX NONG NGHIEP DON DUONG', 'Xã Tu Tra, Huyện Đơn Dương, Tỉnh Lâm Đồng', '24.5 Hecta', 'VietGAP, GlobalGAP, OCOP 4 Sao', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    ON CONFLICT (user_id) DO UPDATE SET farm_name = EXCLUDED.farm_name, updated_at = CURRENT_TIMESTAMP;

    -- 2. farmer_buonho
    INSERT INTO users (username, password, full_name, email, phone, address, company_name, tax_code, puc_code, certification, household_farmer, email_verified, kyc_status, enabled, created_at, updated_at)
    VALUES ('farmer_buonho', '$2a$10$wE9iU7eOqXqF7O3XyY5Z.Oq5vUe1O.7Y5Z.Oq5vUe1O.7Y5Z.Oq5v', 'Bà Hoàng Thị Mai', 'buonho@honafresh.vn', '0977334455', 'Phường An Lạc, Thị xã Buôn Hồ, Đắk Lắk', 'Hợp Tác Xã Rau Củ Quả Buôn Hồ', '6001239988', 'VN-DLK-06-148', 'VietGAP, Hữu cơ Organic', false, true, 'VERIFIED', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    ON CONFLICT (username) DO UPDATE SET full_name = EXCLUDED.full_name, company_name = EXCLUDED.company_name, updated_at = CURRENT_TIMESTAMP
    RETURNING id INTO u_id;
    INSERT INTO users_roles (user_id, role_id) VALUES (u_id, r_farmer_id) ON CONFLICT DO NOTHING;
    INSERT INTO farmer_profiles (user_id, farm_name, farmer_type, puc_code, tax_code, bank_account, bank_name, bank_account_name, location, cultivated_area, certifications, created_at, updated_at)
    VALUES (u_id, 'Hợp Tác Xã Rau Củ Quả Buôn Hồ', 'COOPERATIVE', 'VN-DLK-06-148', '6001239988', '102849201938', 'Agribank - CN Buôn Hồ Đắk Lắk', 'HTX RAU CU QUA BUON HO', 'Phường An Lạc, Thị xã Buôn Hồ, Đắk Lắk', '35.0 Hecta', 'VietGAP, OCOP 4 Sao', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    ON CONFLICT (user_id) DO UPDATE SET farm_name = EXCLUDED.farm_name, updated_at = CURRENT_TIMESTAMP;

    -- 3. farmer_saigon
    INSERT INTO users (username, password, full_name, email, phone, address, company_name, tax_code, puc_code, certification, household_farmer, email_verified, kyc_status, enabled, created_at, updated_at)
    VALUES ('farmer_saigon', '$2a$10$wE9iU7eOqXqF7O3XyY5Z.Oq5vUe1O.7Y5Z.Oq5vUe1O.7Y5Z.Oq5v', 'Ông Phan Văn Giàu', 'cuchi@honafresh.vn', '0903556677', 'Xã Nhuận Đức, Huyện Củ Chi, TP.HCM', 'HTX Nông Nghiệp Công Nghệ Cao Củ Chi', '0314567890', 'VN-HCM-03-088', 'VietGAP Chuỗi Thực Phẩm An Toàn', false, true, 'VERIFIED', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    ON CONFLICT (username) DO UPDATE SET full_name = EXCLUDED.full_name, company_name = EXCLUDED.company_name, updated_at = CURRENT_TIMESTAMP
    RETURNING id INTO u_id;
    INSERT INTO users_roles (user_id, role_id) VALUES (u_id, r_farmer_id) ON CONFLICT DO NOTHING;
    INSERT INTO farmer_profiles (user_id, farm_name, farmer_type, puc_code, tax_code, bank_account, bank_name, bank_account_name, location, cultivated_area, certifications, created_at, updated_at)
    VALUES (u_id, 'HTX Nông Nghiệp Công Nghệ Cao Củ Chi', 'COOPERATIVE', 'VN-HCM-03-088', '0314567890', '018100349281', 'Vietcombank - CN Bắc Sài Gòn', 'HTX NN CONG NGHE CAO CU CHI', 'Xã Nhuận Đức, Huyện Củ Chi, TP.HCM', '18.0 Hecta', 'VietGAP, Chuỗi Nông Sản An Toàn TP.HCM', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    ON CONFLICT (user_id) DO UPDATE SET farm_name = EXCLUDED.farm_name, updated_at = CURRENT_TIMESTAMP;

    -- 4. farmer_mocchau
    INSERT INTO users (username, password, full_name, email, phone, address, company_name, tax_code, puc_code, certification, household_farmer, email_verified, kyc_status, enabled, created_at, updated_at)
    VALUES ('farmer_mocchau', '$2a$10$wE9iU7eOqXqF7O3XyY5Z.Oq5vUe1O.7Y5Z.Oq5vUe1O.7Y5Z.Oq5v', 'Kỹ sư Vũ Đình Trọng', 'mocchau@honafresh.vn', '0966889900', 'Thị trấn Nông Trường Mộc Châu, Sơn La', 'Hợp Tác Xã Nông Nghiệp Xanh Mộc Châu', '5500892341', 'VN-SLA-02-099', 'VietGAP, GlobalGAP', false, true, 'VERIFIED', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    ON CONFLICT (username) DO UPDATE SET full_name = EXCLUDED.full_name, company_name = EXCLUDED.company_name, updated_at = CURRENT_TIMESTAMP
    RETURNING id INTO u_id;
    INSERT INTO users_roles (user_id, role_id) VALUES (u_id, r_farmer_id) ON CONFLICT DO NOTHING;
    INSERT INTO farmer_profiles (user_id, farm_name, farmer_type, puc_code, tax_code, bank_account, bank_name, bank_account_name, location, cultivated_area, certifications, created_at, updated_at)
    VALUES (u_id, 'Hợp Tác Xã Nông Nghiệp Xanh Mộc Châu', 'COOPERATIVE', 'VN-SLA-02-099', '5500892341', '190349281928', 'Techcombank - CN Sơn La', 'HTX NONG NGHIEP XANH MOC CHAU', 'Thị trấn Nông Trường Mộc Châu, Sơn La', '50.0 Hecta', 'VietGAP, GlobalGAP, OCOP 4 Sao', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    ON CONFLICT (user_id) DO UPDATE SET farm_name = EXCLUDED.farm_name, updated_at = CURRENT_TIMESTAMP;

    -- Đảm bảo farmer_dalat có farmer_profiles chuẩn
    SELECT id INTO u_id FROM users WHERE username = 'farmer_dalat';
    IF u_id IS NOT NULL THEN
        INSERT INTO farmer_profiles (user_id, farm_name, farmer_type, puc_code, tax_code, bank_account, bank_name, bank_account_name, location, cultivated_area, certifications, created_at, updated_at)
        VALUES (u_id, 'HTX Nông Nghiệp Đà Lạt GAP', 'COOPERATIVE', 'VN-LDO-PUC-0849', '5801459201', '0071001284920', 'Vietcombank - CN Lâm Đồng', 'HTX NONG NGHIEP DA LAT GAP', 'Tiểu khu 158, Phường 8, TP. Đà Lạt, Tỉnh Lâm Đồng', '45 Hecta', 'VietGAP, GlobalGAP, OCOP 4 Sao', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        ON CONFLICT (user_id) DO UPDATE SET farm_name = EXCLUDED.farm_name, location = EXCLUDED.location, updated_at = CURRENT_TIMESTAMP;
    END IF;

    -- Phân bổ 50 lô hàng theo đúng nông dân sở hữu thật:
    -- Đơn Dương: Lô Đơn Dương và Củ Quả
    UPDATE harvest_lots SET farmer_id = (SELECT id FROM users WHERE username = 'farmer_donduong'), farmer_name = 'HTX Nông Nghiệp Rau Sạch Đơn Dương'
    WHERE lot_code IN ('LOT-LD-2026-004', 'LOT-LD-2026-008', 'LOT-LD-2026-016', 'LOT-LD-2026-020', 'LOT-LD-2026-024', 'LOT-LD-2026-026', 'LOT-2026-DL-644', 'LOT-2026-DL-635');

    -- Buôn Hồ: Lô Đắk Lắk, Gừng, Sả, Rau củ Tây Nguyên
    UPDATE harvest_lots SET farmer_id = (SELECT id FROM users WHERE username = 'farmer_buonho'), farmer_name = 'Hợp Tác Xã Rau Củ Quả Buôn Hồ'
    WHERE lot_code IN ('LOT-SLA-2026-003', 'LOT-HD-2026-012', 'LOT-LD-2026-048', 'LOT-HN-2026-049', 'LOT-TG-2026-007', 'LOT-BTR-2026-019');

    -- Sài Gòn Củ Chi: Lô nấm sạch, rau củ nhiệt đới
    UPDATE harvest_lots SET farmer_id = (SELECT id FROM users WHERE username = 'farmer_saigon'), farmer_name = 'HTX Nông Nghiệp Công Nghệ Cao Củ Chi'
    WHERE lot_code IN ('LOT-DN-2026-029', 'LOT-VP-2026-039', 'LOT-SLA-2026-043', 'LOT-LA-2026-011', 'LOT-LD-2026-036');

    -- Mộc Châu: Lô Mộc Châu và rau ôn đới vùng cao
    UPDATE harvest_lots SET farmer_id = (SELECT id FROM users WHERE username = 'farmer_mocchau'), farmer_name = 'Hợp Tác Xã Nông Nghiệp Xanh Mộc Châu'
    WHERE lot_code IN ('LOT-LCA-2026-031', 'LOT-LC-2026-038', 'LOT-LD-2026-030', 'LOT-LD-2026-033');

    -- Các lô còn lại giao cho farmer_dalat
    UPDATE harvest_lots SET farmer_id = (SELECT id FROM users WHERE username = 'farmer_dalat'), farmer_name = 'HTX Nông Nghiệp Đà Lạt GAP'
    WHERE farmer_id NOT IN (
        SELECT id FROM users WHERE username IN ('farmer_donduong', 'farmer_buonho', 'farmer_saigon', 'farmer_mocchau')
    );

    -- Đảm bảo toàn bộ lô nông sản đang có trên sàn đều ở trạng thái OPEN (sẵn sàng mua bán/đàm phán)
    -- ngoại trừ 2 lô mẫu LOT-2026-DL-644 và LOT-2026-DL-635 ở trạng thái PENDING_APPROVAL để duyệt thử nghiệm
    UPDATE harvest_lots SET status = 'OPEN' WHERE lot_code NOT IN ('LOT-2026-DL-644', 'LOT-2026-DL-635');
    UPDATE harvest_lots SET status = 'PENDING_APPROVAL' WHERE lot_code IN ('LOT-2026-DL-644', 'LOT-2026-DL-635');

    -- Đảm bảo cột lot_id trên bảng b2b_contracts tồn tại
    ALTER TABLE b2b_contracts ADD COLUMN IF NOT EXISTS lot_id BIGINT REFERENCES harvest_lots(id);
END $$;
