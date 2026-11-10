-- V5: Chuẩn hóa 50 lô hàng nông sản B2B theo danh mục nông sản chuẩn (seed_50_products.sql)
-- Cập nhật đồng bộ vào bảng harvest_lots bảo đảm toàn vẹn dữ liệu hợp đồng B2B
ALTER TABLE harvest_lots ALTER COLUMN created_at SET DEFAULT CURRENT_TIMESTAMP;

DO $$
DECLARE
    v_farmer_id BIGINT;
    v_role_id BIGINT;
BEGIN
    SELECT id INTO v_farmer_id FROM users WHERE username = 'farmer_dalat';
    IF v_farmer_id IS NULL THEN
        SELECT id INTO v_farmer_id FROM users ORDER BY id LIMIT 1;
    END IF;
    IF v_farmer_id IS NULL THEN
        INSERT INTO users (username, password, full_name, email, company_name, kyc_status, email_verified, enabled)
        VALUES ('farmer_dalat', '$2a$10$wE9iU7eOqXqF7O3XyY5Z.Oq5vUe1O.7Y5Z.Oq5vUe1O.7Y5Z.Oq5v', 'Nguyễn Văn Nông', 'farmer@honafresh.vn', 'HTX Nông Nghiệp Công Nghệ Cao Đà Lạt Fresh', 'VERIFIED', true, true)
        ON CONFLICT (username) DO UPDATE SET company_name = EXCLUDED.company_name
        RETURNING id INTO v_farmer_id;

        SELECT id INTO v_role_id FROM roles WHERE name = 'ROLE_FARMER';
        IF v_role_id IS NOT NULL THEN
            INSERT INTO users_roles (user_id, role_id) VALUES (v_farmer_id, v_role_id) ON CONFLICT DO NOTHING;
        END IF;
    END IF;

    -- =========================================================================
    -- NGÀNH HÀNG 1: RAU ĂN LÁ (13 LÔ) - category_id: 1, category: RAU_AN_LA
    -- =========================================================================
    INSERT INTO harvest_lots (
        lot_code, farmer_id, farmer_name, product_name, category, category_id,
        puc_code, certification, harvest_date, expiry_date, total_weight_kg,
        available_weight_kg, base_price_per_kg, tier_pricing_json, req_temp_min,
        req_temp_max, status, image_url, warehouse_location, region, audit_note,
        created_at, updated_at
    ) VALUES
    (
        'LOT-LD-2026-001', v_farmer_id, 'HTX Nông Sản Rau Sạch Đà Lạt', 'Rau Xà Lách Mỡ Đà Lạt', 'RAU_AN_LA', 1,
        'VN-LDO-08-101', 'VietGAP, Hữu cơ Organic', CURRENT_DATE - INTERVAL '1 day', CURRENT_DATE + INTERVAL '10 days', 8000.00,
        6500.00, 25000.00, '[{"minKg": 200, "price": 25000}, {"minKg": 1000, "price": 23000}, {"minKg": 3000, "price": 21250}]'::jsonb, 2.0,
        5.0, 'OPEN', 'https://images.unsplash.com/photo-1622206151226-18ca2c9ab4a1?w=600&auto=format&fit=crop&q=80',
        'Trạm Trung Chuyển Đức Trọng - Buồng Lạnh A1', 'Tây Nguyên & Lâm Đồng', 'Rau xà lách mỡ canh tác thủy canh chuẩn VietGAP, lá mềm ngọt giòn tan thích hợp làm salad tươi ngon.',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        'LOT-DD-2026-002', v_farmer_id, 'HTX Nông Sản Rau Sạch Đà Lạt', 'Cải Bó Xôi Hữu Cơ (Spinach)', 'RAU_AN_LA', 1,
        'VN-LDO-08-102', 'VietGAP, Hữu cơ Organic', CURRENT_DATE - INTERVAL '1 day', CURRENT_DATE + INTERVAL '10 days', 10000.00,
        8200.00, 35000.00, '[{"minKg": 200, "price": 35000}, {"minKg": 1000, "price": 32200}, {"minKg": 3000, "price": 29750}]'::jsonb, 2.0,
        5.0, 'OPEN', 'https://images.unsplash.com/photo-1576045057995-568f588f82fb?w=600&auto=format&fit=crop&q=80',
        'Trạm Trung Chuyển Đức Trọng - Buồng Lạnh A2', 'Tây Nguyên & Lâm Đồng', 'Cải bó xôi giàu sắt và vitamin, trồng hữu cơ không dùng phân bón hóa học hay thuốc trừ sâu.',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        'LOT-SLA-2026-003', v_farmer_id, 'Hợp Tác Xã Rau Củ Quả Buôn Hồ', 'Cải bó xôi 300g', 'RAU_AN_LA', 1,
        'VN-DLK-06-109', 'VietGAP, Hữu cơ (Organic)', CURRENT_DATE - INTERVAL '2 days', CURRENT_DATE + INTERVAL '11 days', 15000.00,
        11600.00, 13000.00, '[{"minKg": 200, "price": 13000}, {"minKg": 1000, "price": 11960}, {"minKg": 3000, "price": 11050}]'::jsonb, 2.0,
        5.0, 'OPEN', 'https://lh3.googleusercontent.com/x8fCUOUab2GdXp565Qa4CTiqu-3t2cXTcn_2if7wss7wyEa3D7WNnXiYg-JODy2KTWhwoqhPf1e6FEvbYRqtyMoeJ9-i45MK=w600',
        'Kho Nông Sản Buôn Hồ - Đắk Lắk', 'Tây Nguyên & Lâm Đồng', 'Lô Cải bó xôi 300g chào bán trực tiếp từ Hợp Tác Xã Rau Củ Quả Buôn Hồ (Thị xã Buôn Hồ, Đắk Lắk). Sản lượng lô chào bán: 15 Tấn, sản lượng còn lại: 11.6 Tấn. Nông sản đạt chuẩn VietGAP, Hữu cơ (Organic), mã số vùng trồng PUC: VN-DLK-06-109. Hỗ trợ thương lái kiểm tra chất lượng tận vườn, đàm phán giá sỉ, ký hợp đồng nguyên tắc và điều xe lạnh vận chuyển.',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        'LOT-LD-2026-004', v_farmer_id, 'HTX Nông Nghiệp Công Nghệ Cao Đơn Dương', 'Cải ngọt Đà Lạt 300g', 'RAU_AN_LA', 1,
        'VN-LDO-04-110', 'VietGAP, OCOP 4 Sao', CURRENT_DATE, CURRENT_DATE + INTERVAL '12 days', 20000.00,
        14000.00, 8500.00, '[{"minKg": 200, "price": 8500}, {"minKg": 1000, "price": 7820}, {"minKg": 3000, "price": 7225}]'::jsonb, 2.0,
        5.0, 'OPEN', 'https://lh3.googleusercontent.com/AvO0S99zRjKCPVDKn9nEiCokN7RLUH603QJ63dFtDZ1uUgFYU_pUNsr3kY7UT4RoFo89eh3KnamEiZmvu_gY0fjV0NmjW9M=w600',
        'Trạm Trung Chuyển Đức Trọng - Buồng Lạnh A1', 'Tây Nguyên & Lâm Đồng', 'Lô Cải ngọt Đà Lạt 300g chào bán trực tiếp từ HTX Nông Nghiệp Công Nghệ Cao Đơn Dương (Đơn Dương, Lâm Đồng). Sản lượng lô chào bán: 20 Tấn, sản lượng còn lại: 14.0 Tấn. Nông sản đạt chuẩn VietGAP, OCOP 4 Sao, mã số vùng trồng PUC: VN-LDO-04-110. Hỗ trợ thương lái kiểm tra chất lượng tận vườn, đàm phán giá sỉ, ký hợp đồng nguyên tắc và điều xe lạnh vận chuyển.',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        'LOT-LD-2026-005', v_farmer_id, 'Liên Minh Hợp Tác Xã Rau Sạch Đà Lạt GAP', 'Cải thìa đà lạt 300g', 'RAU_AN_LA', 1,
        'VN-LDO-08-111', 'VietGAP', CURRENT_DATE - INTERVAL '1 day', CURRENT_DATE + INTERVAL '10 days', 25000.00,
        15800.00, 8500.00, '[{"minKg": 200, "price": 8500}, {"minKg": 1000, "price": 7820}, {"minKg": 3000, "price": 7225}]'::jsonb, 2.0,
        5.0, 'OPEN', 'https://lh3.googleusercontent.com/dqUqnW9PPse6dmxn3uxRaAq2btCPVwxnt2NgKKLmtLuz75VBLLtQPiIQY5_TIz6aAi8SrWDYWEaDP3kvhibAPzFHedZYuLWYvw=w600',
        'Trạm Trung Chuyển Đức Trọng - Buồng Lạnh A2', 'Tây Nguyên & Lâm Đồng', 'Lô Cải thìa đà lạt 300g chào bán trực tiếp từ Liên Minh Hợp Tác Xã Rau Sạch Đà Lạt GAP (TP. Đà Lạt, Lâm Đồng). Sản lượng lô chào bán: 25 Tấn, sản lượng còn lại: 15.8 Tấn. Nông sản đạt chuẩn VietGAP, mã số vùng trồng PUC: VN-LDO-08-111. Hỗ trợ thương lái kiểm tra chất lượng tận vườn, đàm phán giá sỉ, ký hợp đồng nguyên tắc và điều xe lạnh vận chuyển.',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        'LOT-LD-2026-006', v_farmer_id, 'Trang Trại Nông Sản Hữu Cơ Đức Trọng', 'Bông cải xanh (kg)', 'RAU_AN_LA', 1,
        'VN-LDO-12-112', 'VietGAP, Hữu cơ (Organic), GlobalGAP', CURRENT_DATE, CURRENT_DATE + INTERVAL '9 days', 30000.00,
        16800.00, 30000.00, '[{"minKg": 200, "price": 30000}, {"minKg": 1000, "price": 27600}, {"minKg": 3000, "price": 25500}]'::jsonb, 2.0,
        5.0, 'OPEN', 'https://lh3.googleusercontent.com/UfK5xyXvVvQI5cAe_a3DUQf4oaVSv-7z-Z48RH9p0ALUpRz1LU6nFGZT66bSKK7brurPd1aU_TweVUSZGuuE8L7Z0pxBcolK=w600',
        'Trạm Trung Chuyển Đức Trọng - Buồng Lạnh A3', 'Tây Nguyên & Lâm Đồng', 'Lô Bông cải xanh (kg) chào bán trực tiếp từ Trang Trại Nông Sản Hữu Cơ Đức Trọng (Đức Trọng, Lâm Đồng). Sản lượng lô chào bán: 30 Tấn, sản lượng còn lại: 16.8 Tấn. Nông sản đạt chuẩn VietGAP, Hữu cơ (Organic), GlobalGAP, mã số vùng trồng PUC: VN-LDO-12-112. Hỗ trợ thương lái kiểm tra chất lượng tận vườn, đàm phán giá sỉ, ký hợp đồng nguyên tắc và điều xe lạnh vận chuyển.',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        'LOT-TG-2026-007', v_farmer_id, 'Vựa Nông Sản Tây Nguyên Xanh Gia Lai', 'Xà lách lô lô (kg)', 'RAU_AN_LA', 1,
        'VN-GLA-03-113', 'VietGAP', CURRENT_DATE - INTERVAL '1 day', CURRENT_DATE + INTERVAL '8 days', 35000.00,
        17200.00, 24000.00, '[{"minKg": 200, "price": 24000}, {"minKg": 1000, "price": 22080}, {"minKg": 3000, "price": 20400}]'::jsonb, 2.0,
        5.0, 'OPEN', 'https://lh3.googleusercontent.com/ZNySzB8eVf8fiEdd75reXGW-cCC3lVZBEh8XHU-gEqiqaS4os8GPVSTqQb_2BPyfSmiPs5PC9lRXc6v9faTxq4oGgZiRFGU=w600',
        'Trạm Thu Mua Chư Prông - Gia Lai', 'Tây Nguyên & Lâm Đồng', 'Lô Xà lách lô lô (kg) chào bán trực tiếp từ Vựa Nông Sản Tây Nguyên Xanh Gia Lai (Chư Prông, Gia Lai). Sản lượng lô chào bán: 35 Tấn, sản lượng còn lại: 17.2 Tấn. Nông sản đạt chuẩn VietGAP, mã số vùng trồng PUC: VN-GLA-03-113. Hỗ trợ thương lái kiểm tra chất lượng tận vườn, đàm phán giá sỉ, ký hợp đồng nguyên tắc và điều xe lạnh vận chuyển.',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        'LOT-LD-2026-008', v_farmer_id, 'HTX Nông Nghiệp Công Nghệ Cao Đơn Dương', 'Bún tươi sợi nhỏ 500g', 'RAU_AN_LA', 1,
        'VN-LDO-04-115', 'VietGAP, Hữu cơ (Organic), OCOP 4 Sao', CURRENT_DATE, CURRENT_DATE + INTERVAL '8 days', 10000.00,
        3500.00, 7500.00, '[{"minKg": 200, "price": 7500}, {"minKg": 1000, "price": 6900}, {"minKg": 3000, "price": 6375}]'::jsonb, 2.0,
        5.0, 'OPEN', 'https://lh3.googleusercontent.com/60jdQl1WeXMAB-LiFJFd0kI91-EdTouHK73BuOw4AKfJrM7eID7rMewqsNBFD36h2RiTXtE-UXeAcVfA_nJtja78Vo68pRrp=w600',
        'Trạm Trung Chuyển Đức Trọng - Buồng Lạnh A1', 'Tây Nguyên & Lâm Đồng', 'Lô Bún tươi sợi nhỏ 500g chào bán trực tiếp từ HTX Nông Nghiệp Công Nghệ Cao Đơn Dương (Đơn Dương, Lâm Đồng). Sản lượng lô chào bán: 10 Tấn, sản lượng còn lại: 3.5 Tấn. Nông sản đạt chuẩn VietGAP, Hữu cơ (Organic), OCOP 4 Sao, mã số vùng trồng PUC: VN-LDO-04-115. Hỗ trợ thương lái kiểm tra chất lượng tận vườn, đàm phán giá sỉ, ký hợp đồng nguyên tắc và điều xe lạnh vận chuyển.',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        'LOT-LD-2026-009', v_farmer_id, 'Liên Minh Hợp Tác Xã Rau Sạch Đà Lạt GAP', 'Chanh không hạt 250g', 'RAU_AN_LA', 1,
        'VN-LDO-08-116', 'VietGAP, GlobalGAP', CURRENT_DATE - INTERVAL '1 day', CURRENT_DATE + INTERVAL '14 days', 15000.00,
        12500.00, 7500.00, '[{"minKg": 200, "price": 7500}, {"minKg": 1000, "price": 6900}, {"minKg": 3000, "price": 6375}]'::jsonb, 3.0,
        7.0, 'OPEN', 'https://lh3.googleusercontent.com/Xs-W73qt_EPYCSoXydTpzLvVadSn-7Ntl3mAtMQj2Rd1oXqpqEX5hLhJhl0XBI-IMuF-zAVVQB79H3dFrw-4iDDrc-tMPUX0=w600',
        'Trạm Trung Chuyển Đức Trọng - Buồng Lạnh A2', 'Tây Nguyên & Lâm Đồng', 'Lô Chanh không hạt 250g chào bán trực tiếp từ Liên Minh Hợp Tác Xã Rau Sạch Đà Lạt GAP (TP. Đà Lạt, Lâm Đồng). Sản lượng lô chào bán: 15 Tấn, sản lượng còn lại: 12.5 Tấn. Nông sản đạt chuẩn VietGAP, GlobalGAP, mã số vùng trồng PUC: VN-LDO-08-116. Hỗ trợ thương lái kiểm tra chất lượng tận vườn, đàm phán giá sỉ, ký hợp đồng nguyên tắc và điều xe lạnh vận chuyển.',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        'LOT-LD-2026-010', v_farmer_id, 'Trang Trại Nông Sản Hữu Cơ Đức Trọng', 'Rau mồng tơi baby gói 280g', 'RAU_AN_LA', 1,
        'VN-LDO-12-117', 'VietGAP', CURRENT_DATE - INTERVAL '1 day', CURRENT_DATE + INTERVAL '9 days', 20000.00,
        15200.00, 7500.00, '[{"minKg": 200, "price": 7500}, {"minKg": 1000, "price": 6900}, {"minKg": 3000, "price": 6375}]'::jsonb, 2.0,
        5.0, 'OPEN', 'https://lh3.googleusercontent.com/NRItjw0AKT30OSrDqZ9yy2D5ySuu8eZ6XndlJWHEgxyQIsIjp1qjZ5FRFyqxfe3-XsL0b9y_f9S5p1uYCb0C7PDbm1bWuJhR=w600',
        'Trạm Trung Chuyển Đức Trọng - Buồng Lạnh A3', 'Tây Nguyên & Lâm Đồng', 'Lô Rau mồng tơi baby gói 280g chào bán trực tiếp từ Trang Trại Nông Sản Hữu Cơ Đức Trọng (Đức Trọng, Lâm Đồng). Sản lượng lô chào bán: 20 Tấn, sản lượng còn lại: 15.2 Tấn. Nông sản đạt chuẩn VietGAP, mã số vùng trồng PUC: VN-LDO-12-117. Hỗ trợ thương lái kiểm tra chất lượng tận vườn, đàm phán giá sỉ, ký hợp đồng nguyên tắc và điều xe lạnh vận chuyển.',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        'LOT-LA-2026-011', v_farmer_id, 'HTX Trồng Rau An Toàn Thốt Nốt', 'Rau muống baby gói 280g', 'RAU_AN_LA', 1,
        'VN-CTH-07-118', 'VietGAP, Hữu cơ (Organic)', CURRENT_DATE, CURRENT_DATE + INTERVAL '8 days', 25000.00,
        17300.00, 7500.00, '[{"minKg": 200, "price": 7500}, {"minKg": 1000, "price": 6900}, {"minKg": 3000, "price": 6375}]'::jsonb, 2.0,
        5.0, 'OPEN', 'https://lh3.googleusercontent.com/BWCCLVgO8JbXGG5IQ9az4PCMRNOlcnPu8EVbrKeUS3rY38MoObgoawtFmHmdmrIvzQI3_yD0O-hJ-DJMJVnvwjiY3hkKJXpcVA=w600',
        'Trạm Trung Chuyển ĐBSCL - Kho Lạnh Cái Bè', 'Đồng Bằng Sông Cửu Long', 'Lô Rau muống baby gói 280g chào bán trực tiếp từ HTX Trồng Rau An Toàn Thốt Nốt (Thốt Nốt, Cần Thơ). Sản lượng lô chào bán: 25 Tấn, sản lượng còn lại: 17.3 Tấn. Nông sản đạt chuẩn VietGAP, Hữu cơ (Organic), mã số vùng trồng PUC: VN-CTH-07-118. Hỗ trợ thương lái kiểm tra chất lượng tận vườn, đàm phán giá sỉ, ký hợp đồng nguyên tắc và điều xe lạnh vận chuyển.',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        'LOT-HD-2026-012', v_farmer_id, 'Hợp Tác Xã Rau Củ Quả Buôn Hồ', 'Rau dền baby 250g', 'RAU_AN_LA', 1,
        'VN-DLK-06-119', 'VietGAP', CURRENT_DATE - INTERVAL '1 day', CURRENT_DATE + INTERVAL '9 days', 30000.00,
        18600.00, 7500.00, '[{"minKg": 200, "price": 7500}, {"minKg": 1000, "price": 6900}, {"minKg": 3000, "price": 6375}]'::jsonb, 2.0,
        5.0, 'OPEN', 'https://lh3.googleusercontent.com/S7TaXJoTyFMCNbwuM3xLGvVXVHUAIMFlwjLk806BMGNuMZk1UUPEchfqgS3R0Srml1B3O7_wvae30R0Q8QIW1zxQlgygb0s2=w600',
        'Kho Nông Sản Buôn Hồ - Đắk Lắk', 'Tây Nguyên & Lâm Đồng', 'Lô Rau dền baby 250g chào bán trực tiếp từ Hợp Tác Xã Rau Củ Quả Buôn Hồ (Thị xã Buôn Hồ, Đắk Lắk). Sản lượng lô chào bán: 30 Tấn, sản lượng còn lại: 18.6 Tấn. Nông sản đạt chuẩn VietGAP, mã số vùng trồng PUC: VN-DLK-06-119. Hỗ trợ thương lái kiểm tra chất lượng tận vườn, đàm phán giá sỉ, ký hợp đồng nguyên tắc và điều xe lạnh vận chuyển.',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        'LOT-LD-2026-013', v_farmer_id, 'Liên Minh Hợp Tác Xã Rau Sạch Đà Lạt GAP', 'Cải thảo (kg)', 'RAU_AN_LA', 1,
        'VN-LDO-08-121', 'VietGAP, Hữu cơ (Organic)', CURRENT_DATE, CURRENT_DATE + INTERVAL '12 days', 5000.00,
        2400.00, 11500.00, '[{"minKg": 200, "price": 11500}, {"minKg": 1000, "price": 10580}, {"minKg": 3000, "price": 9775}]'::jsonb, 2.0,
        5.0, 'OPEN', 'https://lh3.googleusercontent.com/-ZDhBgfjjqGfkGNo-CF5Jk8U82DAOWMOr5IktxPg79-YAvVD1FN7GEwHN0oEy_nu0r5BvCOWQ4ovdrDcEvra08xxBfmr1lNH=w600',
        'Trạm Trung Chuyển Đức Trọng - Buồng Lạnh A1', 'Tây Nguyên & Lâm Đồng', 'Lô Cải thảo (kg) chào bán trực tiếp từ Liên Minh Hợp Tác Xã Rau Sạch Đà Lạt GAP (TP. Đà Lạt, Lâm Đồng). Sản lượng lô chào bán: 5 Tấn, sản lượng còn lại: 2.4 Tấn. Nông sản đạt chuẩn VietGAP, Hữu cơ (Organic), mã số vùng trồng PUC: VN-LDO-08-121. Hỗ trợ thương lái kiểm tra chất lượng tận vườn, đàm phán giá sỉ, ký hợp đồng nguyên tắc và điều xe lạnh vận chuyển.',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ) ON CONFLICT (lot_code) DO UPDATE SET
        product_name = EXCLUDED.product_name,
        farmer_name = EXCLUDED.farmer_name,
        category = EXCLUDED.category,
        category_id = EXCLUDED.category_id,
        puc_code = EXCLUDED.puc_code,
        certification = EXCLUDED.certification,
        harvest_date = EXCLUDED.harvest_date,
        expiry_date = EXCLUDED.expiry_date,
        total_weight_kg = EXCLUDED.total_weight_kg,
        available_weight_kg = EXCLUDED.available_weight_kg,
        base_price_per_kg = EXCLUDED.base_price_per_kg,
        tier_pricing_json = EXCLUDED.tier_pricing_json,
        req_temp_min = EXCLUDED.req_temp_min,
        req_temp_max = EXCLUDED.req_temp_max,
        status = EXCLUDED.status,
        image_url = EXCLUDED.image_url,
        warehouse_location = EXCLUDED.warehouse_location,
        region = EXCLUDED.region,
        audit_note = EXCLUDED.audit_note,
        updated_at = CURRENT_TIMESTAMP;

    -- =========================================================================
    -- NGÀNH HÀNG 2: CỦ & QUẢ TƯƠI (13 LÔ) - category_id: 2, category: CU_QUA
    -- =========================================================================
    INSERT INTO harvest_lots (
        lot_code, farmer_id, farmer_name, product_name, category, category_id,
        puc_code, certification, harvest_date, expiry_date, total_weight_kg,
        available_weight_kg, base_price_per_kg, tier_pricing_json, req_temp_min,
        req_temp_max, status, image_url, warehouse_location, region, audit_note,
        created_at, updated_at
    ) VALUES
    (
        'LOT-DD-2026-014', v_farmer_id, 'HTX Nông Sản Rau Sạch Đà Lạt', 'Cà Chua Cherry Đỏ Đà Lạt', 'CU_QUA', 2,
        'VN-LDO-08-122', 'VietGAP, Hữu cơ Organic', CURRENT_DATE - INTERVAL '1 day', CURRENT_DATE + INTERVAL '15 days', 10000.00,
        8000.00, 45000.00, '[{"minKg": 200, "price": 45000}, {"minKg": 1000, "price": 41400}, {"minKg": 3000, "price": 38250}]'::jsonb, 4.0,
        8.0, 'OPEN', 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=600&auto=format&fit=crop&q=80',
        'Trạm Trung Chuyển Đức Trọng - Buồng Lạnh A2', 'Tây Nguyên & Lâm Đồng', 'Cà chua bi ngọt thanh, mọng nước, nhiều chất chống oxy hóa tự nhiên.',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        'LOT-LD-2026-015', v_farmer_id, 'HTX Nông Sản Rau Sạch Đà Lạt', 'Cà Rốt Hữu Cơ Tươi', 'CU_QUA', 2,
        'VN-LDO-08-123', 'VietGAP, Hữu cơ Organic', CURRENT_DATE - INTERVAL '2 days', CURRENT_DATE + INTERVAL '20 days', 12000.00,
        9600.00, 28000.00, '[{"minKg": 200, "price": 28000}, {"minKg": 1000, "price": 25760}, {"minKg": 3000, "price": 23800}]'::jsonb, 4.0,
        8.0, 'OPEN', 'https://images.unsplash.com/photo-1598170845058-32b9d6a5da37?w=600&auto=format&fit=crop&q=80',
        'Trạm Trung Chuyển Đức Trọng - Buồng Lạnh A1', 'Tây Nguyên & Lâm Đồng', 'Cà rốt trồng tại Đà Lạt theo tiêu chuẩn Organic, màu sắc tự nhiên, giòn ngọt đậm vị.',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        'LOT-LD-2026-016', v_farmer_id, 'HTX Nông Nghiệp Công Nghệ Cao Đơn Dương', 'Bí giống Mỹ (kg)', 'CU_QUA', 2,
        'VN-LDO-04-100', 'VietGAP, Hữu cơ (Organic), GlobalGAP, OCOP 4 Sao', CURRENT_DATE, CURRENT_DATE + INTERVAL '25 days', 5000.00,
        4300.00, 11000.00, '[{"minKg": 200, "price": 11000}, {"minKg": 1000, "price": 10120}, {"minKg": 3000, "price": 9350}]'::jsonb, 4.0,
        8.0, 'OPEN', 'https://lh3.googleusercontent.com/VsOtTvAtYcDNeLdgkecaRZM5OmGKzA02mQ-7juuyn39__umVWmbesENBrbTWIBdllFAWUPzXQ3AtIiXtgqNl5D4W8Jotki5kjA=w600',
        'Trạm Trung Chuyển Đức Trọng - Buồng Lạnh A1', 'Tây Nguyên & Lâm Đồng', 'Lô Bí giống Mỹ (kg) chào bán trực tiếp từ HTX Nông Nghiệp Công Nghệ Cao Đơn Dương (Đơn Dương, Lâm Đồng). Sản lượng lô chào bán: 5 Tấn, sản lượng còn lại: 4.3 Tấn. Nông sản đạt chuẩn VietGAP, Hữu cơ (Organic), GlobalGAP, OCOP 4 Sao, mã số vùng trồng PUC: VN-LDO-04-100. Hỗ trợ thương lái kiểm tra chất lượng tận vườn, đàm phán giá sỉ, ký hợp đồng nguyên tắc và điều xe lạnh vận chuyển.',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        'LOT-LD-2026-017', v_farmer_id, 'Liên Minh Hợp Tác Xã Rau Sạch Đà Lạt GAP', 'Bí đỏ tròn (kg)', 'CU_QUA', 2,
        'VN-LDO-08-101', 'VietGAP', CURRENT_DATE - INTERVAL '1 day', CURRENT_DATE + INTERVAL '25 days', 10000.00,
        7800.00, 10000.00, '[{"minKg": 200, "price": 10000}, {"minKg": 1000, "price": 9200}, {"minKg": 3000, "price": 8500}]'::jsonb, 4.0,
        8.0, 'OPEN', 'https://lh3.googleusercontent.com/x4Is7-UXHRrqoFI6l0oqN2ggxQkhsKzyD_ROPG_X37dUkNW8q1sMZKuqieqoQp5XOGcmmg7cZFH9RIhZgVZrRJUpTE6GYXTD=w600',
        'Trạm Trung Chuyển Đức Trọng - Buồng Lạnh A2', 'Tây Nguyên & Lâm Đồng', 'Lô Bí đỏ tròn (kg) chào bán trực tiếp từ Liên Minh Hợp Tác Xã Rau Sạch Đà Lạt GAP (TP. Đà Lạt, Lâm Đồng). Sản lượng lô chào bán: 10 Tấn, sản lượng còn lại: 7.8 Tấn. Nông sản đạt chuẩn VietGAP, mã số vùng trồng PUC: VN-LDO-08-101. Hỗ trợ thương lái kiểm tra chất lượng tận vườn, đàm phán giá sỉ, ký hợp đồng nguyên tắc và điều xe lạnh vận chuyển.',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        'LOT-GL-2026-018', v_farmer_id, 'Trang Trại Nông Sản Hữu Cơ Đức Trọng', 'Khoai lang mật túi 1kg', 'CU_QUA', 2,
        'VN-LDO-12-102', 'VietGAP', CURRENT_DATE - INTERVAL '2 days', CURRENT_DATE + INTERVAL '30 days', 15000.00,
        10700.00, 13500.00, '[{"minKg": 200, "price": 13500}, {"minKg": 1000, "price": 12420}, {"minKg": 3000, "price": 11475}]'::jsonb, 4.0,
        8.0, 'OPEN', 'https://lh3.googleusercontent.com/mOPdvNZSDUKnIEF3d5MYoP5rnIORLjizglPAhCFPg0tAA1iuJm4JblFg-S299SJtgnlQiolvhRsLZUYbbICzPWmipjHOVmHO=w600',
        'Trạm Trung Chuyển Đức Trọng - Buồng Lạnh A3', 'Tây Nguyên & Lâm Đồng', 'Lô Khoai lang mật túi 1kg chào bán trực tiếp từ Trang Trại Nông Sản Hữu Cơ Đức Trọng (Đức Trọng, Lâm Đồng). Sản lượng lô chào bán: 15 Tấn, sản lượng còn lại: 10.7 Tấn. Nông sản đạt chuẩn VietGAP, mã số vùng trồng PUC: VN-LDO-12-102. Hỗ trợ thương lái kiểm tra chất lượng tận vườn, đàm phán giá sỉ, ký hợp đồng nguyên tắc và điều xe lạnh vận chuyển.',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        'LOT-BTR-2026-019', v_farmer_id, 'Vựa Nông Sản Tây Nguyên Xanh Gia Lai', 'Ớt trái cây baby 150g', 'CU_QUA', 2,
        'VN-GLA-03-103', 'VietGAP, Hữu cơ (Organic)', CURRENT_DATE, CURRENT_DATE + INTERVAL '12 days', 20000.00,
        12800.00, 13000.00, '[{"minKg": 200, "price": 13000}, {"minKg": 1000, "price": 11960}, {"minKg": 3000, "price": 11050}]'::jsonb, 4.0,
        8.0, 'OPEN', 'https://lh3.googleusercontent.com/nyaRqF16aSpVtbzI7ifp44PboX2YkJEGNMsPZpX8N62kd3LgXm8g17i0vOO7BAro15mHWCyBmVmXg_jxOArM7ei5C8NCtsU=w600',
        'Trạm Thu Mua Chư Prông - Gia Lai', 'Tây Nguyên & Lâm Đồng', 'Lô Ớt trái cây baby 150g chào bán trực tiếp từ Vựa Nông Sản Tây Nguyên Xanh Gia Lai (Chư Prông, Gia Lai). Sản lượng lô chào bán: 20 Tấn, sản lượng còn lại: 12.8 Tấn. Nông sản đạt chuẩn VietGAP, Hữu cơ (Organic), mã số vùng trồng PUC: VN-GLA-03-103. Hỗ trợ thương lái kiểm tra chất lượng tận vườn, đàm phán giá sỉ, ký hợp đồng nguyên tắc và điều xe lạnh vận chuyển.',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        'LOT-LD-2026-020', v_farmer_id, 'HTX Nông Sản An Toàn Ba Tri', 'Bầu (kg)', 'CU_QUA', 2,
        'VN-BTR-05-104', 'VietGAP, GlobalGAP', CURRENT_DATE - INTERVAL '1 day', CURRENT_DATE + INTERVAL '14 days', 25000.00,
        14200.00, 12500.00, '[{"minKg": 200, "price": 12500}, {"minKg": 1000, "price": 11500}, {"minKg": 3000, "price": 10625}]'::jsonb, 4.0,
        8.0, 'OPEN', 'https://lh3.googleusercontent.com/m-_XEuw-VzxU4HKmKg7WexHIVpYlmh3V5zwbNHuloHotsxMfCfx5QhcRRJ7DsgV5xRRSl9OBJ-405HDQnelcHTwXEc2m3kQ=w600',
        'Trạm Trung Chuyển ĐBSCL - Kho Lạnh Cái Bè', 'Đồng Bằng Sông Cửu Long', 'Lô Bầu (kg) chào bán trực tiếp từ HTX Nông Sản An Toàn Ba Tri (Huyện Ba Tri, Bến Tre). Sản lượng lô chào bán: 25 Tấn, sản lượng còn lại: 14.2 Tấn. Nông sản đạt chuẩn VietGAP, GlobalGAP, mã số vùng trồng PUC: VN-BTR-05-104. Hỗ trợ thương lái kiểm tra chất lượng tận vườn, đàm phán giá sỉ, ký hợp đồng nguyên tắc và điều xe lạnh vận chuyển.',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        'LOT-LD-2026-021', v_farmer_id, 'HTX Nông Nghiệp Công Nghệ Cao Đơn Dương', 'Bí đao (kg)', 'CU_QUA', 2,
        'VN-LDO-04-105', 'VietGAP, OCOP 4 Sao', CURRENT_DATE, CURRENT_DATE + INTERVAL '20 days', 30000.00,
        15000.00, 13500.00, '[{"minKg": 200, "price": 13500}, {"minKg": 1000, "price": 12420}, {"minKg": 3000, "price": 11475}]'::jsonb, 4.0,
        8.0, 'OPEN', 'https://lh3.googleusercontent.com/zeAkNFR0eu9Lk2oMWrXH3QTlZaKcNTRUYXA6kOjDcPSwRKmREbr3v-WPxIRpCN6xNU4p591bAni9_Jpp82EX79DBG3SmAsUFbw=w600',
        'Trạm Trung Chuyển Đức Trọng - Buồng Lạnh A1', 'Tây Nguyên & Lâm Đồng', 'Lô Bí đao (kg) chào bán trực tiếp từ HTX Nông Nghiệp Công Nghệ Cao Đơn Dương (Đơn Dương, Lâm Đồng). Sản lượng lô chào bán: 30 Tấn, sản lượng còn lại: 15.0 Tấn. Nông sản đạt chuẩn VietGAP, OCOP 4 Sao, mã số vùng trồng PUC: VN-LDO-04-105. Hỗ trợ thương lái kiểm tra chất lượng tận vườn, đàm phán giá sỉ, ký hợp đồng nguyên tắc và điều xe lạnh vận chuyển.',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        'LOT-LD-2026-022', v_farmer_id, 'HTX Trồng Rau An Toàn Thốt Nốt', 'Mướp hương (kg)', 'CU_QUA', 2,
        'VN-CTH-07-106', 'VietGAP, Hữu cơ (Organic)', CURRENT_DATE - INTERVAL '1 day', CURRENT_DATE + INTERVAL '12 days', 35000.00,
        15100.00, 15000.00, '[{"minKg": 200, "price": 15000}, {"minKg": 1000, "price": 13800}, {"minKg": 3000, "price": 12750}]'::jsonb, 4.0,
        8.0, 'OPEN', 'https://lh3.googleusercontent.com/p2DQlYByzrw4DFqP1w4D59be9gdDhVdjg5IYe56LyIp9hceLhKEU3sKKONagRyqjbWxbc0m6HhUYYKznDe0b2nbjg6UctVQf=w600',
        'Trạm Trung Chuyển ĐBSCL - Kho Lạnh Cái Bè', 'Đồng Bằng Sông Cửu Long', 'Lô Mướp hương (kg) chào bán trực tiếp từ HTX Trồng Rau An Toàn Thốt Nốt (Thốt Nốt, Cần Thơ). Sản lượng lô chào bán: 35 Tấn, sản lượng còn lại: 15.1 Tấn. Nông sản đạt chuẩn VietGAP, Hữu cơ (Organic), mã số vùng trồng PUC: VN-CTH-07-106. Hỗ trợ thương lái kiểm tra chất lượng tận vườn, đàm phán giá sỉ, ký hợp đồng nguyên tắc và điều xe lạnh vận chuyển.',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        'LOT-LD-2026-023', v_farmer_id, 'Vùng Trồng Chuyên Canh Rau Màu Tiền Giang', 'Khổ qua (kg)', 'CU_QUA', 2,
        'VN-TGG-04-107', 'VietGAP', CURRENT_DATE, CURRENT_DATE + INTERVAL '10 days', 5000.00,
        1800.00, 14000.00, '[{"minKg": 200, "price": 14000}, {"minKg": 1000, "price": 12880}, {"minKg": 3000, "price": 11900}]'::jsonb, 4.0,
        8.0, 'OPEN', 'https://lh3.googleusercontent.com/FJ3O9mfFuKo4UoTeKvzKGFxUXz27mGRIu5gtumDB5AE5WnUe3MKuRTuPiVgV5B8JZcZ1q_6PX-LlrKCtxd890XPkWlpwWOfhmg=w600',
        'Trạm Trung Chuyển ĐBSCL - Kho Lạnh Cái Bè', 'Đồng Bằng Sông Cửu Long', 'Lô Khổ qua (kg) chào bán trực tiếp từ Vùng Trồng Chuyên Canh Rau Màu Tiền Giang (Châu Thành, Tiền Giang). Sản lượng lô chào bán: 5 Tấn, sản lượng còn lại: 1.8 Tấn. Nông sản đạt chuẩn VietGAP, mã số vùng trồng PUC: VN-TGG-04-107. Hỗ trợ thương lái kiểm tra chất lượng tận vườn, đàm phán giá sỉ, ký hợp đồng nguyên tắc và điều xe lạnh vận chuyển.',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        'LOT-LD-2026-024', v_farmer_id, 'Vựa Nông Sản Tây Nguyên Xanh Gia Lai', 'Dưa leo (kg)', 'CU_QUA', 2,
        'VN-GLA-03-108', 'VietGAP, GlobalGAP', CURRENT_DATE - INTERVAL '1 day', CURRENT_DATE + INTERVAL '12 days', 10000.00,
        8400.00, 12500.00, '[{"minKg": 200, "price": 12500}, {"minKg": 1000, "price": 11500}, {"minKg": 3000, "price": 10625}]'::jsonb, 4.0,
        8.0, 'OPEN', 'https://lh3.googleusercontent.com/cS2xhvCU9-FpZzoIHxZ4ZAkzzw2oKMq7iR6QhFHOjqP4EP8HPj050ACO2WySWfCbuTPkaP2dqqoa7r-1sfRQkRc46fXjf7mFjA=w600',
        'Trạm Thu Mua Chư Prông - Gia Lai', 'Tây Nguyên & Lâm Đồng', 'Lô Dưa leo (kg) chào bán trực tiếp từ Vựa Nông Sản Tây Nguyên Xanh Gia Lai (Chư Prông, Gia Lai). Sản lượng lô chào bán: 10 Tấn, sản lượng còn lại: 8.4 Tấn. Nông sản đạt chuẩn VietGAP, GlobalGAP, mã số vùng trồng PUC: VN-GLA-03-108. Hỗ trợ thương lái kiểm tra chất lượng tận vườn, đàm phán giá sỉ, ký hợp đồng nguyên tắc và điều xe lạnh vận chuyển.',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        'LOT-SLA-2026-025', v_farmer_id, 'Hợp Tác Xã Rau Củ Quả Buôn Hồ', 'Cà rốt (kg)', 'CU_QUA', 2,
        'VN-DLK-06-114', 'VietGAP', CURRENT_DATE - INTERVAL '1 day', CURRENT_DATE + INTERVAL '20 days', 5000.00,
        2100.00, 19500.00, '[{"minKg": 200, "price": 19500}, {"minKg": 1000, "price": 17940}, {"minKg": 3000, "price": 16575}]'::jsonb, 4.0,
        8.0, 'OPEN', 'https://lh3.googleusercontent.com/kavBGdn9Nm8plRwMzBIX13k1ac4lCZ8wqTFKaWemS0ryInXZQEuwQJgbXniHw1Af_1lmuSMPfQhK0T-Ulbkvl9SLj_7sYXY=w600',
        'Kho Nông Sản Buôn Hồ - Đắk Lắk', 'Tây Nguyên & Lâm Đồng', 'Lô Cà rốt (kg) chào bán trực tiếp từ Hợp Tác Xã Rau Củ Quả Buôn Hồ (Thị xã Buôn Hồ, Đắk Lắk). Sản lượng lô chào bán: 5 Tấn, sản lượng còn lại: 2.1 Tấn. Nông sản đạt chuẩn VietGAP, mã số vùng trồng PUC: VN-DLK-06-114. Hỗ trợ thương lái kiểm tra chất lượng tận vườn, đàm phán giá sỉ, ký hợp đồng nguyên tắc và điều xe lạnh vận chuyển.',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        'LOT-LD-2026-026', v_farmer_id, 'Hợp Tác Xã Nông Nghiệp Xanh Mộc Châu', 'Su su', 'CU_QUA', 2,
        'VN-SLA-09-120', 'VietGAP, GlobalGAP, OCOP 4 Sao', CURRENT_DATE, CURRENT_DATE + INTERVAL '18 days', 35000.00,
        19300.00, 15000.00, '[{"minKg": 200, "price": 15000}, {"minKg": 1000, "price": 13800}, {"minKg": 3000, "price": 12750}]'::jsonb, 4.0,
        8.0, 'OPEN', 'https://lh3.googleusercontent.com/21hs44YRMP98vYY-onLqDmtbeakCB9ldknPry4MfwnHDrdJfNlmI0cvB4e2ZPofkd9k0fVajcgQuiUtZIBXClka67ogOIorh=w600',
        'Tổng Kho Mộc Châu - Buồng B1', 'Tây Bắc Bộ', 'Lô Su su chào bán trực tiếp từ Hợp Tác Xã Nông Nghiệp Xanh Mộc Châu (Mộc Châu, Sơn La). Sản lượng lô chào bán: 35 Tấn, sản lượng còn lại: 19.3 Tấn. Nông sản đạt chuẩn VietGAP, GlobalGAP, OCOP 4 Sao, mã số vùng trồng PUC: VN-SLA-09-120. Hỗ trợ thương lái kiểm tra chất lượng tận vườn, đàm phán giá sỉ, ký hợp đồng nguyên tắc và điều xe lạnh vận chuyển.',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ) ON CONFLICT (lot_code) DO UPDATE SET
        product_name = EXCLUDED.product_name,
        farmer_name = EXCLUDED.farmer_name,
        category = EXCLUDED.category,
        category_id = EXCLUDED.category_id,
        puc_code = EXCLUDED.puc_code,
        certification = EXCLUDED.certification,
        harvest_date = EXCLUDED.harvest_date,
        expiry_date = EXCLUDED.expiry_date,
        total_weight_kg = EXCLUDED.total_weight_kg,
        available_weight_kg = EXCLUDED.available_weight_kg,
        base_price_per_kg = EXCLUDED.base_price_per_kg,
        tier_pricing_json = EXCLUDED.tier_pricing_json,
        req_temp_min = EXCLUDED.req_temp_min,
        req_temp_max = EXCLUDED.req_temp_max,
        status = EXCLUDED.status,
        image_url = EXCLUDED.image_url,
        warehouse_location = EXCLUDED.warehouse_location,
        region = EXCLUDED.region,
        audit_note = EXCLUDED.audit_note,
        updated_at = CURRENT_TIMESTAMP;

    -- =========================================================================
    -- NGÀNH HÀNG 3: NẤM TƯƠI & HỮU CƠ (13 LÔ) - category_id: 3, category: NAM_TUOI
    -- =========================================================================
    INSERT INTO harvest_lots (
        lot_code, farmer_id, farmer_name, product_name, category, category_id,
        puc_code, certification, harvest_date, expiry_date, total_weight_kg,
        available_weight_kg, base_price_per_kg, tier_pricing_json, req_temp_min,
        req_temp_max, status, image_url, warehouse_location, region, audit_note,
        created_at, updated_at
    ) VALUES
    (
        'LOT-LD-2026-027', v_farmer_id, 'HTX Nông Sản Rau Sạch Đà Lạt', 'Nấm Đùi Gà Tươi Thượng Hạng', 'NAM_TUOI', 3,
        'VN-LDO-08-127', 'VietGAP, Hữu cơ Organic', CURRENT_DATE - INTERVAL '1 day', CURRENT_DATE + INTERVAL '8 days', 8000.00,
        6000.00, 48000.00, '[{"minKg": 100, "price": 48000}, {"minKg": 500, "price": 44160}, {"minKg": 1500, "price": 40800}]'::jsonb, 2.0,
        5.0, 'OPEN', 'https://images.unsplash.com/photo-1573732064472-ea7fd2382d22?w=600&auto=format&fit=crop&q=80',
        'Trạm Trung Chuyển Đức Trọng - Buồng Lạnh A1', 'Tây Nguyên & Lâm Đồng', 'Nấm đùi gà thân mập, giòn ngọt, giàu đạm thực vật và khoáng chất quý.',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        'LOT-LD-2026-028', v_farmer_id, 'Trang Trại Nấm Sạch Công Nghệ Cao Đông Triều', 'Nấm kim châm Việt Nam 150g', 'NAM_TUOI', 3,
        'VN-QNH-08-123', 'VietGAP', CURRENT_DATE, CURRENT_DATE + INTERVAL '7 days', 15000.00,
        5100.00, 9500.00, '[{"minKg": 200, "price": 9500}, {"minKg": 1000, "price": 8740}, {"minKg": 3000, "price": 8075}]'::jsonb, 2.0,
        5.0, 'OPEN', 'https://lh3.googleusercontent.com/D0TaVVySA5nPEYupj43C2ukhd48lTDKol32A0xXEl1-IVIQYyLqa-BWrFkrwSdBh7iqcJ6mX2mkypteWy0lci70PkzTk7bZ4=w600',
        'Kho Lạnh Nấm Sạch Đông Triều - Quảng Ninh', 'Bắc Bộ', 'Lô Nấm kim châm Việt Nam 150g chào bán trực tiếp từ Trang Trại Nấm Sạch Công Nghệ Cao Đông Triều (Đông Triều, Quảng Ninh). Sản lượng lô chào bán: 15 Tấn, sản lượng còn lại: 5.1 Tấn. Nông sản đạt chuẩn VietGAP, mã số vùng trồng PUC: VN-QNH-08-123. Hỗ trợ thương lái kiểm tra chất lượng tận vườn, đàm phán giá sỉ, ký hợp đồng nguyên tắc và điều xe lạnh vận chuyển.',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        'LOT-DN-2026-029', v_farmer_id, 'Vùng Nông Nghiệp Công Nghệ Cao Củ Chi', 'Nấm đùi gà Việt Nam gói 200g', 'NAM_TUOI', 3,
        'VN-HCM-06-124', 'VietGAP, Hữu cơ (Organic), GlobalGAP', CURRENT_DATE - INTERVAL '1 day', CURRENT_DATE + INTERVAL '8 days', 20000.00,
        16400.00, 20000.00, '[{"minKg": 200, "price": 20000}, {"minKg": 1000, "price": 18400}, {"minKg": 3000, "price": 17000}]'::jsonb, 2.0,
        5.0, 'OPEN', 'https://lh3.googleusercontent.com/DealgLPFoigJGq3FQwlCOgaKcZ0hzvyiyRYEbQav8JaC-XaNVVvBMa7Ew9fr_Z8WFHp3yH3kj5-lh3kdqlJYb6lVV2DvNm5Gyg=w600',
        'Kho Trung Chuyển Củ Chi - TP.HCM', 'Đông Nam Bộ', 'Lô Nấm đùi gà Việt Nam gói 200g chào bán trực tiếp từ Vùng Nông Nghiệp Công Nghệ Cao Củ Chi (Củ Chi, TP. Hồ Chí Minh). Sản lượng lô chào bán: 20 Tấn, sản lượng còn lại: 16.4 Tấn. Nông sản đạt chuẩn VietGAP, Hữu cơ (Organic), GlobalGAP, mã số vùng trồng PUC: VN-HCM-06-124. Hỗ trợ thương lái kiểm tra chất lượng tận vườn, đàm phán giá sỉ, ký hợp đồng nguyên tắc và điều xe lạnh vận chuyển.',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        'LOT-LD-2026-030', v_farmer_id, 'Vùng Canh Tác Củ Quả Sạch Nam Sách', 'Nấm ngọc châm trắng Việt Nam 150g', 'NAM_TUOI', 3,
        'VN-HDU-01-125', 'VietGAP, OCOP 4 Sao', CURRENT_DATE, CURRENT_DATE + INTERVAL '7 days', 25000.00,
        18800.00, 18500.00, '[{"minKg": 200, "price": 18500}, {"minKg": 1000, "price": 17020}, {"minKg": 3000, "price": 15725}]'::jsonb, 2.0,
        5.0, 'OPEN', 'https://lh3.googleusercontent.com/C3FCktVbqVQuJrjiPY_ORJCPvyX2lRKHAR_3QVg363DCpww_tXG02uBEuN_BtH3n61r8-H31g3zILJh9I3Y8k0Bp-TCbNvQ=w600',
        'Kho Logistics Miền Bắc - Buồng C1', 'Bắc Bộ', 'Lô Nấm ngọc châm trắng Việt Nam 150g chào bán trực tiếp từ Vùng Canh Tác Củ Quả Sạch Nam Sách (Nam Sách, Hải Dương). Sản lượng lô chào bán: 25 Tấn, sản lượng còn lại: 18.8 Tấn. Nông sản đạt chuẩn VietGAP, OCOP 4 Sao, mã số vùng trồng PUC: VN-HDU-01-125. Hỗ trợ thương lái kiểm tra chất lượng tận vườn, đàm phán giá sỉ, ký hợp đồng nguyên tắc và điều xe lạnh vận chuyển.',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        'LOT-LCA-2026-031', v_farmer_id, 'Trang Trại Nông Nghiệp Xanh Châu Đức', 'Lẩu nấm 300g', 'NAM_TUOI', 3,
        'VN-BRV-02-126', 'VietGAP', CURRENT_DATE - INTERVAL '1 day', CURRENT_DATE + INTERVAL '6 days', 30000.00,
        20400.00, 16500.00, '[{"minKg": 200, "price": 16500}, {"minKg": 1000, "price": 15180}, {"minKg": 3000, "price": 14025}]'::jsonb, 2.0,
        5.0, 'OPEN', 'https://lh3.googleusercontent.com/JZogRM-CkEQLpWBsM2TCG2u19SO7rToGg1QB6-m5CKp83-n0mj7PS5VVhWECqz-f6L8maBmO0bJNfE9T1-PYGldl26xu--E=w600',
        'Kho Lạnh Châu Đức - Bà Rịa Vũng Tàu', 'Đông Nam Bộ', 'Lô Lẩu nấm 300g chào bán trực tiếp từ Trang Trại Nông Nghiệp Xanh Châu Đức (Châu Đức, Bà Rịa - Vũng Tàu). Sản lượng lô chào bán: 30 Tấn, sản lượng còn lại: 20.4 Tấn. Nông sản đạt chuẩn VietGAP, mã số vùng trồng PUC: VN-BRV-02-126. Hỗ trợ thương lái kiểm tra chất lượng tận vườn, đàm phán giá sỉ, ký hợp đồng nguyên tắc và điều xe lạnh vận chuyển.',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        'LOT-GL-2026-032', v_farmer_id, 'Trang Trại Nông Nghiệp Xanh Châu Đức', 'Nấm rơm (kg)', 'NAM_TUOI', 3,
        'VN-BRV-02-132', 'VietGAP, GlobalGAP', CURRENT_DATE, CURRENT_DATE + INTERVAL '6 days', 25000.00,
        20300.00, 65000.00, '[{"minKg": 100, "price": 65000}, {"minKg": 500, "price": 59800}, {"minKg": 1500, "price": 55250}]'::jsonb, 2.0,
        5.0, 'OPEN', 'https://lh3.googleusercontent.com/hiqghGR_zqB1qMqCiEJL_h2XFcy-P-j3p4kwhbghDPYd96g2jxEET-WPXaKlFYYJ7FHFs31D4l-17zMgPgEkQxZx7QfpeEMF=w600',
        'Kho Lạnh Châu Đức - Bà Rịa Vũng Tàu', 'Đông Nam Bộ', 'Lô Nấm rơm (kg) chào bán trực tiếp từ Trang Trại Nông Nghiệp Xanh Châu Đức (Châu Đức, Bà Rịa - Vũng Tàu). Sản lượng lô chào bán: 25 Tấn, sản lượng còn lại: 20.3 Tấn. Nông sản đạt chuẩn VietGAP, GlobalGAP, mã số vùng trồng PUC: VN-BRV-02-132. Hỗ trợ thương lái kiểm tra chất lượng tận vườn, đàm phán giá sỉ, ký hợp đồng nguyên tắc và điều xe lạnh vận chuyển.',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        'LOT-LD-2026-033', v_farmer_id, 'Vùng Canh Tác Củ Quả Sạch Nam Sách', 'Nấm hương Việt Nam 150g', 'NAM_TUOI', 3,
        'VN-HDU-01-145', 'VietGAP, Hữu cơ (Organic), OCOP 4 Sao', CURRENT_DATE - INTERVAL '1 day', CURRENT_DATE + INTERVAL '8 days', 20000.00,
        9000.00, 19500.00, '[{"minKg": 200, "price": 19500}, {"minKg": 1000, "price": 17940}, {"minKg": 3000, "price": 16575}]'::jsonb, 2.0,
        5.0, 'OPEN', 'https://lh3.googleusercontent.com/jrWqEPyoQQd77OTklNxZGSldwgmRjnm8jg4MUpucvaHSZ41EujOc-RHVhL6PB-JmDIXqLNlUT_ZrsrGY1w3V0syMxzjYhH4=w600',
        'Kho Logistics Miền Bắc - Buồng C1', 'Bắc Bộ', 'Lô Nấm hương Việt Nam 150g chào bán trực tiếp từ Vùng Canh Tác Củ Quả Sạch Nam Sách (Nam Sách, Hải Dương). Sản lượng lô chào bán: 20 Tấn, sản lượng còn lại: 9.0 Tấn. Nông sản đạt chuẩn VietGAP, Hữu cơ (Organic), OCOP 4 Sao, mã số vùng trồng PUC: VN-HDU-01-145. Hỗ trợ thương lái kiểm tra chất lượng tận vườn, đàm phán giá sỉ, ký hợp đồng nguyên tắc và điều xe lạnh vận chuyển.',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        'LOT-DT-2026-034', v_farmer_id, 'Vùng Canh Tác Củ Quả Sạch Nam Sách', 'Lẩu nấm đặc biệt 300g', 'NAM_TUOI', 3,
        'VN-HDU-01-161', 'VietGAP', CURRENT_DATE, CURRENT_DATE + INTERVAL '6 days', 30000.00,
        12900.00, 19500.00, '[{"minKg": 200, "price": 19500}, {"minKg": 1000, "price": 17940}, {"minKg": 3000, "price": 16575}]'::jsonb, 2.0,
        5.0, 'OPEN', 'https://lh3.googleusercontent.com/8-QjnbXqcAZmB0AsZnLzwxA4JH68mRypYz-rv1HnuAnbWZZpWJC8D0cNlJpHRP0WTXai2jrA3RzBXo1TTiUkdbZa3Bgb-oax=w600',
        'Kho Logistics Miền Bắc - Buồng C1', 'Bắc Bộ', 'Lô Lẩu nấm đặc biệt 300g chào bán trực tiếp từ Vùng Canh Tác Củ Quả Sạch Nam Sách (Nam Sách, Hải Dương). Sản lượng lô chào bán: 30 Tấn, sản lượng còn lại: 12.9 Tấn. Nông sản đạt chuẩn VietGAP, mã số vùng trồng PUC: VN-HDU-01-161. Hỗ trợ thương lái kiểm tra chất lượng tận vườn, đàm phán giá sỉ, ký hợp đồng nguyên tắc và điều xe lạnh vận chuyển.',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        'LOT-DN-2026-035', v_farmer_id, 'Vùng Canh Tác Củ Quả Sạch Nam Sách', 'Nấm mèo thái sợi 100g', 'NAM_TUOI', 3,
        'VN-HDU-01-169', 'VietGAP, Hữu cơ (Organic)', CURRENT_DATE - INTERVAL '2 days', CURRENT_DATE + INTERVAL '30 days', 35000.00,
        14700.00, 16500.00, '[{"minKg": 200, "price": 16500}, {"minKg": 1000, "price": 15180}, {"minKg": 3000, "price": 14025}]'::jsonb, 2.0,
        5.0, 'OPEN', 'https://lh3.googleusercontent.com/-oESAHWhC6HMXtHlM-lVZh22AwKekvSbujLjNU_nSI8RU27Skw3y69BWC7rnr3HQ4a9k38nxcOPIhcm-URXlN-pbmZpKxbAc5w=w600',
        'Kho Logistics Miền Bắc - Buồng C1', 'Bắc Bộ', 'Lô Nấm mèo thái sợi 100g chào bán trực tiếp từ Vùng Canh Tác Củ Quả Sạch Nam Sách (Nam Sách, Hải Dương). Sản lượng lô chào bán: 35 Tấn, sản lượng còn lại: 14.7 Tấn. Nông sản đạt chuẩn VietGAP, Hữu cơ (Organic), mã số vùng trồng PUC: VN-HDU-01-169. Hỗ trợ thương lái kiểm tra chất lượng tận vườn, đàm phán giá sỉ, ký hợp đồng nguyên tắc và điều xe lạnh vận chuyển.',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        'LOT-LD-2026-036', v_farmer_id, 'HTX Nấm Sạch & Rau Màu Long Khánh', 'Lẩu nấm 300 Việt Hàn TNP', 'NAM_TUOI', 3,
        'VN-DNA-04-170', 'VietGAP, OCOP 4 Sao', CURRENT_DATE, CURRENT_DATE + INTERVAL '6 days', 5000.00,
        1800.00, 16500.00, '[{"minKg": 200, "price": 16500}, {"minKg": 1000, "price": 15180}, {"minKg": 3000, "price": 14025}]'::jsonb, 2.0,
        5.0, 'OPEN', 'https://lh3.googleusercontent.com/daan4oaIkk64cUNrpyTpQSs-HVyPyNUVte3_yBhgKcHArBN4EqEHRhrF8DAFQma2WxEBYozQZP_gl7r6zf9l4i7Q0uK20b25aQ=w600',
        'Kho Nông Sản Sạch Long Khánh - Đồng Nai', 'Đông Nam Bộ', 'Lô Lẩu nấm 300 Việt Hàn TNP chào bán trực tiếp từ HTX Nấm Sạch & Rau Màu Long Khánh (Long Khánh, Đồng Nai). Sản lượng lô chào bán: 5 Tấn, sản lượng còn lại: 1.8 Tấn. Nông sản đạt chuẩn VietGAP, OCOP 4 Sao, mã số vùng trồng PUC: VN-DNA-04-170. Hỗ trợ thương lái kiểm tra chất lượng tận vườn, đàm phán giá sỉ, ký hợp đồng nguyên tắc và điều xe lạnh vận chuyển.',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        'LOT-LA-2026-037', v_farmer_id, 'Trang Trại Nấm Sạch Công Nghệ Cao Đông Triều', 'Nấm đông cô Lý Tưởng Việt 60g', 'NAM_TUOI', 3,
        'VN-QNH-08-179', 'VietGAP', CURRENT_DATE - INTERVAL '1 day', CURRENT_DATE + INTERVAL '25 days', 15000.00,
        12300.00, 27500.00, '[{"minKg": 200, "price": 27500}, {"minKg": 1000, "price": 25300}, {"minKg": 3000, "price": 23375}]'::jsonb, 2.0,
        5.0, 'OPEN', 'https://lh3.googleusercontent.com/e_MVfEWiyrqMZHYpAL42i--qxIxnAlM8Mwkj-EQxhjgbi72txdT--Fcshf-FC5Ht5KA95gqK8aQeWXVgCkN2_Rts-4cfZrzy=w600',
        'Kho Lạnh Nấm Sạch Đông Triều - Quảng Ninh', 'Bắc Bộ', 'Lô Nấm đông cô Lý Tưởng Việt 60g chào bán trực tiếp từ Trang Trại Nấm Sạch Công Nghệ Cao Đông Triều (Đông Triều, Quảng Ninh). Sản lượng lô chào bán: 15 Tấn, sản lượng còn lại: 12.3 Tấn. Nông sản đạt chuẩn VietGAP, mã số vùng trồng PUC: VN-QNH-08-179. Hỗ trợ thương lái kiểm tra chất lượng tận vườn, đàm phán giá sỉ, ký hợp đồng nguyên tắc và điều xe lạnh vận chuyển.',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        'LOT-LC-2026-038', v_farmer_id, 'Trang Trại Nông Nghiệp Xanh Châu Đức', 'Nấm hương khô gói 50g', 'NAM_TUOI', 3,
        'VN-BRV-02-180', 'VietGAP, GlobalGAP, OCOP 4 Sao', CURRENT_DATE - INTERVAL '2 days', CURRENT_DATE + INTERVAL '45 days', 20000.00,
        15000.00, 17500.00, '[{"minKg": 200, "price": 17500}, {"minKg": 1000, "price": 16100}, {"minKg": 3000, "price": 14875}]'::jsonb, 2.0,
        5.0, 'OPEN', 'https://lh3.googleusercontent.com/tBLBj5j-eqboRV7b89JIFBCQJwpQtmFUmo_a0A2uhZD0GlUMJrTLeARf77CJXfFLxG0BG-JThXeYXcUs78aQ7d-uht8ViJA=w600',
        'Kho Lạnh Châu Đức - Bà Rịa Vũng Tàu', 'Đông Nam Bộ', 'Lô Nấm hương khô gói 50g chào bán trực tiếp từ Trang Trại Nông Nghiệp Xanh Châu Đức (Châu Đức, Bà Rịa - Vũng Tàu). Sản lượng lô chào bán: 20 Tấn, sản lượng còn lại: 15.0 Tấn. Nông sản đạt chuẩn VietGAP, GlobalGAP, OCOP 4 Sao, mã số vùng trồng PUC: VN-BRV-02-180. Hỗ trợ thương lái kiểm tra chất lượng tận vườn, đàm phán giá sỉ, ký hợp đồng nguyên tắc và điều xe lạnh vận chuyển.',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        'LOT-VP-2026-039', v_farmer_id, 'Vùng Nông Nghiệp Công Nghệ Cao Củ Chi', 'Nấm hương tươi 150g', 'NAM_TUOI', 3,
        'VN-HCM-06-184', 'VietGAP, Hữu cơ (Organic), GlobalGAP', CURRENT_DATE, CURRENT_DATE + INTERVAL '8 days', 5000.00,
        2400.00, 15500.00, '[{"minKg": 200, "price": 15500}, {"minKg": 1000, "price": 14260}, {"minKg": 3000, "price": 13175}]'::jsonb, 2.0,
        5.0, 'OPEN', 'https://lh3.googleusercontent.com/TPwZCfC8ZPrF-gShnUJfPUvXr_5UXJwRsPOinY36CIgL5_lYh4AxX_ATEFpmx85JDweHtt3A2uP7KfQTRKibIT1XK4PU6k0a=w600',
        'Kho Trung Chuyển Củ Chi - TP.HCM', 'Đông Nam Bộ', 'Lô Nấm hương tươi 150g chào bán trực tiếp từ Vùng Nông Nghiệp Công Nghệ Cao Củ Chi (Củ Chi, TP. Hồ Chí Minh). Sản lượng lô chào bán: 5 Tấn, sản lượng còn lại: 2.4 Tấn. Nông sản đạt chuẩn VietGAP, Hữu cơ (Organic), GlobalGAP, mã số vùng trồng PUC: VN-HCM-06-184. Hỗ trợ thương lái kiểm tra chất lượng tận vườn, đàm phán giá sỉ, ký hợp đồng nguyên tắc và điều xe lạnh vận chuyển.',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ) ON CONFLICT (lot_code) DO UPDATE SET
        product_name = EXCLUDED.product_name,
        farmer_name = EXCLUDED.farmer_name,
        category = EXCLUDED.category,
        category_id = EXCLUDED.category_id,
        puc_code = EXCLUDED.puc_code,
        certification = EXCLUDED.certification,
        harvest_date = EXCLUDED.harvest_date,
        expiry_date = EXCLUDED.expiry_date,
        total_weight_kg = EXCLUDED.total_weight_kg,
        available_weight_kg = EXCLUDED.available_weight_kg,
        base_price_per_kg = EXCLUDED.base_price_per_kg,
        tier_pricing_json = EXCLUDED.tier_pricing_json,
        req_temp_min = EXCLUDED.req_temp_min,
        req_temp_max = EXCLUDED.req_temp_max,
        status = EXCLUDED.status,
        image_url = EXCLUDED.image_url,
        warehouse_location = EXCLUDED.warehouse_location,
        region = EXCLUDED.region,
        audit_note = EXCLUDED.audit_note,
        updated_at = CURRENT_TIMESTAMP;

    -- =========================================================================
    -- NGÀNH HÀNG 4: RAU GIA VỊ & THẢO MỘC (11 LÔ) - category_id: 4, category: RAU_GIA_VI
    -- =========================================================================
    INSERT INTO harvest_lots (
        lot_code, farmer_id, farmer_name, product_name, category, category_id,
        puc_code, certification, harvest_date, expiry_date, total_weight_kg,
        available_weight_kg, base_price_per_kg, tier_pricing_json, req_temp_min,
        req_temp_max, status, image_url, warehouse_location, region, audit_note,
        created_at, updated_at
    ) VALUES
    (
        'LOT-BT-2026-040', v_farmer_id, 'HTX Nông Sản Rau Sạch Đà Lạt', 'Húng Quế & Ngò Rí Tươi Sạch', 'RAU_GIA_VI', 4,
        'VN-LDO-08-140', 'VietGAP, Hữu cơ Organic', CURRENT_DATE - INTERVAL '1 day', CURRENT_DATE + INTERVAL '8 days', 6000.00,
        4800.00, 15000.00, '[{"minKg": 100, "price": 15000}, {"minKg": 500, "price": 13800}, {"minKg": 1500, "price": 12750}]'::jsonb, 3.0,
        7.0, 'OPEN', 'https://images.unsplash.com/photo-1615485290382-441e4d049cb5?w=600&auto=format&fit=crop&q=80',
        'Trạm Trung Chuyển Đức Trọng - Buồng Lạnh A1', 'Tây Nguyên & Lâm Đồng', 'Bộ gia vị tươi gồm rau thơm, húng quế và ngò gai hái mới mỗi ngày.',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        'LOT-TG-2026-041', v_farmer_id, 'Nông Sản Xanh Hải Dương', 'Hành Lá Gốc Trắng Hữu Cơ', 'RAU_GIA_VI', 4,
        'VN-HDU-01-141', 'VietGAP, Hữu cơ Organic', CURRENT_DATE, CURRENT_DATE + INTERVAL '10 days', 10000.00,
        8000.00, 15000.00, '[{"minKg": 100, "price": 15000}, {"minKg": 500, "price": 13800}, {"minKg": 1500, "price": 12750}]'::jsonb, 3.0,
        7.0, 'OPEN', 'https://images.unsplash.com/photo-1615485290382-441e4d049cb5?w=600&auto=format&fit=crop&q=80',
        'Kho Logistics Miền Bắc - Buồng C1', 'Bắc Bộ', 'Hành lá cọng mập giòn, bẹ gốc trắng tinh nuột nà, tinh dầu the nồng ấm dịu, xắt nhỏ rắc lên bát phở bốc khói hay làm mỡ hành thơm nức béo ngậy.',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        'LOT-DL-2026-042', v_farmer_id, 'Vườn Thơm Bách Thảo', 'Ngò Rí (Rau Mùi) Thơm Nức Gốc Rễ', 'RAU_GIA_VI', 4,
        'VN-HAN-02-142', 'VietGAP, Hữu cơ Organic', CURRENT_DATE - INTERVAL '1 day', CURRENT_DATE + INTERVAL '8 days', 8000.00,
        6500.00, 14000.00, '[{"minKg": 100, "price": 14000}, {"minKg": 500, "price": 12880}, {"minKg": 1500, "price": 11900}]'::jsonb, 3.0,
        7.0, 'OPEN', 'https://images.unsplash.com/photo-1615485290382-441e4d049cb5?w=600&auto=format&fit=crop&q=80',
        'Kho Logistics Miền Bắc - Buồng C1', 'Bắc Bộ', 'Rau mùi ta lá nhỏ răng cưa, thân rễ thơm ngát tinh dầu thanh tao, rửa sạch cả rễ hầm nước lèo phở gà thanh trong hoặc trang trí dậy mùi mọi món ngon.',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        'LOT-SLA-2026-043', v_farmer_id, 'HTX Rau Sạch Củ Chi', 'Ngò Gai (Mùi Tàu) Răng Cưa Tươi Xanh', 'RAU_GIA_VI', 4,
        'VN-HCM-06-143', 'VietGAP, Hữu cơ Organic', CURRENT_DATE, CURRENT_DATE + INTERVAL '10 days', 7000.00,
        5600.00, 12000.00, '[{"minKg": 100, "price": 12000}, {"minKg": 500, "price": 11040}, {"minKg": 1500, "price": 10200}]'::jsonb, 3.0,
        7.0, 'OPEN', 'https://images.unsplash.com/photo-1615485290382-441e4d049cb5?w=600&auto=format&fit=crop&q=80',
        'Kho Trung Chuyển Củ Chi - TP.HCM', 'Đông Nam Bộ', 'Mùi tàu phiến lá dày viền răng cưa, hương thơm the ấm đậm đà khó lẫn, gia vị không thể vắng mặt trong bát canh chua cá lóc, phở bò tái lăn hay hủ tiếu Nam Vang.',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        'LOT-QNG-2026-044', v_farmer_id, 'Vườn Gia Vị Đồng Bằng', 'Húng Quế Thơm Dẻo Hữu Cơ', 'RAU_GIA_VI', 4,
        'VN-TGG-04-144', 'VietGAP, Hữu cơ Organic', CURRENT_DATE - INTERVAL '1 day', CURRENT_DATE + INTERVAL '9 days', 8000.00,
        6400.00, 15000.00, '[{"minKg": 100, "price": 15000}, {"minKg": 500, "price": 13800}, {"minKg": 1500, "price": 12750}]'::jsonb, 3.0,
        7.0, 'OPEN', 'https://images.unsplash.com/photo-1615485290382-441e4d049cb5?w=600&auto=format&fit=crop&q=80',
        'Trạm Trung Chuyển ĐBSCL - Kho Lạnh Cái Bè', 'Đồng Bằng Sông Cửu Long', 'Húng quế thân tím đọt mập non, lá dày mượt thơm ngát tinh dầu cay ấm, bạn đồng hành số một của tô phở bò nghi ngút khói, bún bò Huế hay lòng nướng chấm mắm ruốc.',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        'LOT-ST-2026-045', v_farmer_id, 'Dược Liệu Xanh', 'Tía Tô Đỏ Răng Cưa Vườn Quê', 'RAU_GIA_VI', 4,
        'VN-NDH-03-145', 'VietGAP, Hữu cơ Organic', CURRENT_DATE, CURRENT_DATE + INTERVAL '10 days', 6500.00,
        5200.00, 14000.00, '[{"minKg": 100, "price": 14000}, {"minKg": 500, "price": 12880}, {"minKg": 1500, "price": 11900}]'::jsonb, 3.0,
        7.0, 'OPEN', 'https://images.unsplash.com/photo-1615485290382-441e4d049cb5?w=600&auto=format&fit=crop&q=80',
        'Kho Logistics Miền Bắc - Buồng C1', 'Bắc Bộ', 'Lá tía tô mặt biếc xanh mặt tím đỏ tía, tinh dầu ấm áp trừ phong tán hàn, nấu cùng cháo hành tía tô giải cảm hạ sốt tự nhiên hoặc ăn kèm gỏi cá sống thơm ngon.',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        'LOT-BD-2026-046', v_farmer_id, 'Vườn Thơm Bách Thảo', 'Kinh Giới Tươi Sạch Vườn Nhà', 'RAU_GIA_VI', 4,
        'VN-BNH-01-146', 'VietGAP, Hữu cơ Organic', CURRENT_DATE - INTERVAL '1 day', CURRENT_DATE + INTERVAL '9 days', 6000.00,
        4800.00, 13000.00, '[{"minKg": 100, "price": 13000}, {"minKg": 500, "price": 11960}, {"minKg": 1500, "price": 11050}]'::jsonb, 3.0,
        7.0, 'OPEN', 'https://images.unsplash.com/photo-1615485290382-441e4d049cb5?w=600&auto=format&fit=crop&q=80',
        'Kho Logistics Miền Bắc - Buồng C1', 'Bắc Bộ', 'Kinh giới lá mềm mại phủ tơ mịn màng, vị cay dịu thơm mát sảng khoái, gia vị biểu tượng không thể thiếu của món bún đậu mắm tôm Hà thành và bún ốc thanh tao.',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        'LOT-DT-2026-047', v_farmer_id, 'Green Life Organic', 'Lá Lốt Bánh Tẻ Thơm Nồng Vườn Nhà', 'RAU_GIA_VI', 4,
        'VN-HCM-06-147', 'VietGAP, Hữu cơ Organic', CURRENT_DATE, CURRENT_DATE + INTERVAL '12 days', 7500.00,
        6000.00, 16000.00, '[{"minKg": 100, "price": 16000}, {"minKg": 500, "price": 14720}, {"minKg": 1500, "price": 13600}]'::jsonb, 3.0,
        7.0, 'OPEN', 'https://images.unsplash.com/photo-1615485290382-441e4d049cb5?w=600&auto=format&fit=crop&q=80',
        'Kho Trung Chuyển Củ Chi - TP.HCM', 'Đông Nam Bộ', 'Lá lốt hái đúng độ bánh tẻ xanh óng ả, lá to tròn dẻo dai cuốn bò nướng mỡ chài thơm lừng cả xóm, hoặc xào ốc móng tay thơm ngậy giữ ấm gân cốt.',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        'LOT-LD-2026-048', v_farmer_id, 'HTX Rau Củ Quả Buôn Hồ', 'Sả Cây Tươi Hữu Cơ Đắk Lắk', 'RAU_GIA_VI', 4,
        'VN-DLK-06-148', 'VietGAP, Hữu cơ Organic', CURRENT_DATE - INTERVAL '1 day', CURRENT_DATE + INTERVAL '15 days', 12000.00,
        9600.00, 18000.00, '[{"minKg": 100, "price": 18000}, {"minKg": 500, "price": 16560}, {"minKg": 1500, "price": 15300}]'::jsonb, 3.0,
        7.0, 'OPEN', 'https://images.unsplash.com/photo-1615485290382-441e4d049cb5?w=600&auto=format&fit=crop&q=80',
        'Kho Nông Sản Buôn Hồ - Đắk Lắk', 'Tây Nguyên & Lâm Đồng', 'Từng cây sả củ trắng mập nuột nà, hàm lượng tinh dầu citral đậm đặc thơm the ấm, đập dập kho cá nục, hấp nghêu ốc hay nấu nồi nước cốt sả chanh gừng giải cảm.',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        'LOT-HN-2026-049', v_farmer_id, 'HTX Rau Củ Quả Buôn Hồ', 'Gừng Sẻ Đồi Buôn Hồ Cay Nồng', 'RAU_GIA_VI', 4,
        'VN-DLK-06-149', 'VietGAP, Hữu cơ Organic', CURRENT_DATE - INTERVAL '2 days', CURRENT_DATE + INTERVAL '30 days', 10000.00,
        8000.00, 38000.00, '[{"minKg": 100, "price": 38000}, {"minKg": 500, "price": 34960}, {"minKg": 1500, "price": 32300}]'::jsonb, 3.0,
        7.0, 'OPEN', 'https://images.unsplash.com/photo-1615485290382-441e4d049cb5?w=600&auto=format&fit=crop&q=80',
        'Kho Nông Sản Buôn Hồ - Đắk Lắk', 'Tây Nguyên & Lâm Đồng', 'Củ gừng sẻ nhánh nhỏ vỏ mỏng nhiều xơ, cay nồng và thơm gấp nhiều lần gừng nước, nước cốt gừng vàng óng thơm phức pha trà mật ong ấm tỳ vị xua tan khí lạnh.',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        'LOT-LD-2026-050', v_farmer_id, 'Tỏi Sạch Kinh Môn', 'Tỏi Cô Đơn Kinh Môn Hải Dương', 'RAU_GIA_VI', 4,
        'VN-HDU-01-150', 'VietGAP, Hữu cơ Organic', CURRENT_DATE - INTERVAL '3 days', CURRENT_DATE + INTERVAL '45 days', 8000.00,
        6500.00, 95000.00, '[{"minKg": 50, "price": 95000}, {"minKg": 200, "price": 87400}, {"minKg": 1000, "price": 80750}]'::jsonb, 3.0,
        7.0, 'OPEN', 'https://images.unsplash.com/photo-1615485290382-441e4d049cb5?w=600&auto=format&fit=crop&q=80',
        'Kho Logistics Miền Bắc - Buồng C1', 'Bắc Bộ', 'Tỏi một tép duy nhất tròn xoe đanh chắc, tích tụ trọn vẹn tinh chất allicin cay nồng kháng viêm diệu kỳ, ngâm rượu tỏi hay mật ong bảo vệ đường hô hấp và tim mạch.',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ) ON CONFLICT (lot_code) DO UPDATE SET
        product_name = EXCLUDED.product_name,
        farmer_name = EXCLUDED.farmer_name,
        category = EXCLUDED.category,
        category_id = EXCLUDED.category_id,
        puc_code = EXCLUDED.puc_code,
        certification = EXCLUDED.certification,
        harvest_date = EXCLUDED.harvest_date,
        expiry_date = EXCLUDED.expiry_date,
        total_weight_kg = EXCLUDED.total_weight_kg,
        available_weight_kg = EXCLUDED.available_weight_kg,
        base_price_per_kg = EXCLUDED.base_price_per_kg,
        tier_pricing_json = EXCLUDED.tier_pricing_json,
        req_temp_min = EXCLUDED.req_temp_min,
        req_temp_max = EXCLUDED.req_temp_max,
        status = EXCLUDED.status,
        image_url = EXCLUDED.image_url,
        warehouse_location = EXCLUDED.warehouse_location,
        region = EXCLUDED.region,
        audit_note = EXCLUDED.audit_note,
        updated_at = CURRENT_TIMESTAMP;

END $$;
