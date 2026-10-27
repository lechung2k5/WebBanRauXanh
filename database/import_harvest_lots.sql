-- V5: Chuẩn hóa 50 lô hàng nông sản B2B chia đều 4 ngành hàng chủ lực
-- Không xóa hay truncate bảng để bảo toàn toàn bộ dữ liệu lô hàng người dùng đã tạo
-- TRUNCATE TABLE hub_inspections, shipments, spoilage_claims, gl_journal_lines, gl_journal_entries, b2b_contracts CASCADE;
-- TRUNCATE TABLE harvest_lots RESTART IDENTITY CASCADE;
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
        'LOT-LD-2026-001', v_farmer_id, 'HTX Nông Nghiệp CNC Đơn Dương', 'Cải Bó Xôi Đà Lạt', 'RAU_AN_LA', 1,
        'VN-LDO-08-200', 'VietGAP, Hữu cơ Organic', CURRENT_DATE - INTERVAL '1 day', CURRENT_DATE + INTERVAL '10 days', 8000.00,
        6500.00, 18000.00, '[{"minKg": 500, "price": 18000}, {"minKg": 2000, "price": 16500}, {"minKg": 5000, "price": 15000}]'::jsonb, 2.0,
        5.0, 'OPEN', 'https://images.unsplash.com/photo-1576045057995-568f588f82fb?w=600&auto=format&fit=crop&q=80',
        'Trạm Trung Chuyển Đức Trọng - Buồng A1', 'Tây Nguyên & Lâm Đồng', 'Hồ sơ kiểm định đầy đủ, PUC hợp lệ trên Cục Trồng trọt.',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        'LOT-DD-2026-002', v_farmer_id, 'HTX Nông Nghiệp Rau Sạch Đơn Dương', 'Bắp Cải Trái Tim Đơn Dương', 'RAU_AN_LA', 1,
        'VN-LDO-04-100', 'VietGAP, OCOP 4 Sao', CURRENT_DATE - INTERVAL '1 day', CURRENT_DATE + INTERVAL '14 days', 15000.00,
        12000.00, 12000.00, '[{"minKg": 1000, "price": 12000}, {"minKg": 5000, "price": 10500}]'::jsonb, 2.0,
        6.0, 'OPEN', 'https://images.unsplash.com/photo-1556881286-fc6915169721?w=600&auto=format&fit=crop&q=80',
        'Trạm Trung Chuyển Đức Trọng - Buồng A2', 'Tây Nguyên & Lâm Đồng', 'Lô hàng chất lượng cao đạt chuẩn OCOP 4 sao, búp cuộn chặt.',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        'LOT-SLA-2026-003', v_farmer_id, 'HTX Nông Nghiệp Xanh Mộc Châu', 'Cải Mèo Hữu Cơ Mộc Châu', 'RAU_AN_LA', 1,
        'VN-SLA-09-300', 'VietGAP, OCOP 4 Sao', CURRENT_DATE - INTERVAL '2 days', CURRENT_DATE + INTERVAL '9 days', 6000.00,
        4800.00, 16000.00, '[{"minKg": 500, "price": 16000}, {"minKg": 2000, "price": 14500}]'::jsonb, 2.0,
        6.0, 'OPEN', 'https://images.unsplash.com/photo-1708798534031-3711ec8cc16e?w=600&auto=format&fit=crop&q=80',
        'Tổng Kho Mộc Châu - Buồng B1', 'Bắc Bộ', 'Rau đặc sản xứ lạnh Mộc Châu, đóng thùng xốp mát đạt chuẩn vận tải Bắc Nam.',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        'LOT-LD-2026-004', v_farmer_id, 'Trang Trại Xanh LangBiang', 'Xà Lách Romaine Thủy Canh', 'RAU_AN_LA', 1,
        'VN-LDO-01-090', 'GlobalGAP', CURRENT_DATE, CURRENT_DATE + INTERVAL '8 days', 5000.00,
        5000.00, 25000.00, '[{"minKg": 300, "price": 25000}, {"minKg": 1500, "price": 22000}]'::jsonb, 2.0,
        5.0, 'OPEN', 'https://images.unsplash.com/photo-1622206151226-18ca2c9ab4a1?w=600&auto=format&fit=crop&q=80',
        'Kho Lạnh Lạc Dương - Buồng C1', 'Tây Nguyên & Lâm Đồng', 'Xà lách thủy canh nhà kính công nghệ cao, giòn ngọt, chuyên chuỗi nhà hàng.',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        'LOT-LD-2026-005', v_farmer_id, 'HTX Rau An Toàn Đức Trọng', 'Cải Thìa Hoàng Gia', 'RAU_AN_LA', 1,
        'VN-LDO-03-120', 'VietGAP', CURRENT_DATE - INTERVAL '1 day', CURRENT_DATE + INTERVAL '11 days', 10000.00,
        8200.00, 14000.00, '[{"minKg": 500, "price": 14000}, {"minKg": 2500, "price": 12500}]'::jsonb, 2.0,
        6.0, 'OPEN', 'https://images.unsplash.com/photo-1515335889486-345839b9ba95?w=600&auto=format&fit=crop&q=80',
        'Trạm Trung Chuyển Đức Trọng - Buồng A3', 'Tây Nguyên & Lâm Đồng', 'Thân bẹ mập đều, xanh bóng, dư lượng phân bón dưới ngưỡng cho phép.',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        'LOT-LD-2026-006', v_farmer_id, 'Nông Trại GreenFarm Đà Lạt', 'Xà Lách Lô Lô Xanh Đà Lạt', 'RAU_AN_LA', 1,
        'VN-LDO-05-180', 'VietGAP, Hữu cơ Organic', CURRENT_DATE, CURRENT_DATE + INTERVAL '7 days', 4500.00,
        4500.00, 24000.00, '[{"minKg": 300, "price": 24000}, {"minKg": 1000, "price": 21500}]'::jsonb, 1.5,
        4.5, 'PENDING_APPROVAL', 'https://images.unsplash.com/photo-1515543237350-b3eea1ec8082?w=600&auto=format&fit=crop&q=80',
        'Kho Trung Chuyển Đức Trọng', 'Tây Nguyên & Lâm Đồng', 'Lô xà lách mới thu hoạch sáng nay, đang kiểm định độ tươi và chỉ tiêu Nitrat.',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        'LOT-TG-2026-007', v_farmer_id, 'HTX Rau Củ Quả Cái Bè', 'Cải Ngọt Bẹ Trắng Miền Tây', 'RAU_AN_LA', 1,
        'VN-TGI-02-110', 'VietGAP', CURRENT_DATE - INTERVAL '1 day', CURRENT_DATE + INTERVAL '9 days', 12000.00,
        9600.00, 11000.00, '[{"minKg": 1000, "price": 11000}, {"minKg": 4000, "price": 9500}]'::jsonb, 3.0,
        7.0, 'OPEN', 'https://images.unsplash.com/photo-1576045057995-568f588f82fb?w=600&auto=format&fit=crop&q=80',
        'Kho Trung Chuyển Sóng Thần - Dĩ An', 'Đồng Bằng Sông Cửu Long', 'Rau ăn lá vùng ĐBSCL năng suất cao, thân giòn bọng nước.',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        'LOT-LD-2026-008', v_farmer_id, 'HTX Nông Nghiệp CNC Đơn Dương', 'Rau Cần Tây Thủy Canh', 'RAU_AN_LA', 1,
        'VN-LDO-08-200', 'GlobalGAP', CURRENT_DATE, CURRENT_DATE + INTERVAL '12 days', 7000.00,
        5500.00, 28000.00, '[{"minKg": 500, "price": 28000}, {"minKg": 2000, "price": 25000}]'::jsonb, 2.0,
        5.0, 'OPEN', 'https://images.unsplash.com/photo-1608686207856-001b95cf60ca?w=600&auto=format&fit=crop&q=80',
        'Trạm Trung Chuyển Đức Trọng - Buồng A1', 'Tây Nguyên & Lâm Đồng', 'Cần tây chuẩn GlobalGAP chuyên ép nước thanh lọc, độ mọng nước cao.',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        'LOT-LD-2026-009', v_farmer_id, 'Trang Trại BioFarm Đà Lạt', 'Rau Cải Xoăn Kale Đà Lạt', 'RAU_AN_LA', 1,
        'VN-LDO-01-095', 'Organic USDA, VietGAP', CURRENT_DATE - INTERVAL '1 day', CURRENT_DATE + INTERVAL '10 days', 3500.00,
        3000.00, 45000.00, '[{"minKg": 200, "price": 45000}, {"minKg": 1000, "price": 40000}]'::jsonb, 2.0,
        5.0, 'OPEN', 'https://images.unsplash.com/photo-1524179091875-bf99a9a6af57?w=600&auto=format&fit=crop&q=80',
        'Kho Lạnh Lạc Dương - Buồng C2', 'Tây Nguyên & Lâm Đồng', 'Siêu thực phẩm Kale giàu dinh dưỡng, canh tác hữu cơ không phân hóa học.',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        'LOT-LD-2026-010', v_farmer_id, 'Liên Minh HTX Đà Lạt GAP', 'Búp Bắp Cải Tím Xuất Khẩu', 'RAU_AN_LA', 1,
        'VN-LDO-08-210', 'GlobalGAP', CURRENT_DATE - INTERVAL '2 days', CURRENT_DATE + INTERVAL '16 days', 8500.00,
        7000.00, 19000.00, '[{"minKg": 500, "price": 19000}, {"minKg": 2500, "price": 17000}]'::jsonb, 2.0,
        6.0, 'OPEN', 'https://images.unsplash.com/photo-1594282486552-05b4d80fbb9f?w=600&auto=format&fit=crop&q=80',
        'Trạm Trung Chuyển Đức Trọng - Buồng A2', 'Tây Nguyên & Lâm Đồng', 'Màu tím đậm tự nhiên, búp chắc, bảo quản lạnh xuất khẩu đường dài.',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        'LOT-LA-2026-011', v_farmer_id, 'HTX Rau An Toàn Cần Giuộc', 'Rau Mồng Tơi Hữu Cơ', 'RAU_AN_LA', 1,
        'VN-LAN-04-105', 'VietGAP', CURRENT_DATE, CURRENT_DATE + INTERVAL '6 days', 6000.00,
        6000.00, 13000.00, '[{"minKg": 500, "price": 13000}, {"minKg": 2000, "price": 11500}]'::jsonb, 4.0,
        8.0, 'PENDING_APPROVAL', 'https://images.unsplash.com/photo-1597362925123-77861d3fbac7?w=600&auto=format&fit=crop&q=80',
        'Kho Trung Chuyển Bình Điền', 'Đồng Bằng Sông Cửu Long', 'Thu hoạch buổi sớm, chuẩn bị lấy mẫu test nhanh dư lượng bảo vệ thực vật.',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        'LOT-HD-2026-012', v_farmer_id, 'HTX Nông Nghiệp Gia Lộc', 'Cải Bẹ Xanh Chuyên Dưa Muối', 'RAU_AN_LA', 1,
        'VN-HDU-06-250', 'VietGAP', CURRENT_DATE - INTERVAL '3 days', CURRENT_DATE + INTERVAL '11 days', 14000.00,
        11000.00, 10500.00, '[{"minKg": 1000, "price": 10500}, {"minKg": 5000, "price": 9000}]'::jsonb, 3.0,
        8.0, 'OPEN', 'https://images.unsplash.com/photo-1708798534031-3711ec8cc16e?w=600&auto=format&fit=crop&q=80',
        'Tổng Kho Mê Linh - Hà Nội', 'Bắc Bộ', 'Lô cải bẹ xanh thân dầy giòn, thích hợp cung cấp bếp ăn công nghiệp và xưởng muối chua.',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        'LOT-LD-2026-013', v_farmer_id, 'HTX Nông Nghiệp LangBiang', 'Xà Lách Iceberg Búp Tròn', 'RAU_AN_LA', 1,
        'VN-LDO-01-090', 'GlobalGAP', CURRENT_DATE - INTERVAL '4 days', CURRENT_DATE + INTERVAL '12 days', 9000.00,
        0.00, 22000.00, '[{"minKg": 500, "price": 22000}, {"minKg": 3000, "price": 19500}]'::jsonb, 1.5,
        4.5, 'SOLD_OUT', 'https://images.unsplash.com/photo-1556881286-fc6915169721?w=600&auto=format&fit=crop&q=80',
        'Trạm Trung Chuyển Đức Trọng', 'Tây Nguyên & Lâm Đồng', 'Đã hoàn tất hợp đồng phân phối cho chuỗi hệ thống thức ăn nhanh.',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    );

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
        'LOT-DD-2026-014', v_farmer_id, 'HTX Nông Nghiệp CNC Đơn Dương', 'Cà Chua Beef Xuất Khẩu', 'CU_QUA', 2,
        'VN-LDO-04-100', 'GlobalGAP', CURRENT_DATE, CURRENT_DATE + INTERVAL '14 days', 12000.00,
        10500.00, 22000.00, '[{"minKg": 500, "price": 22000}, {"minKg": 2000, "price": 20000}, {"minKg": 5000, "price": 18500}]'::jsonb, 4.0,
        8.0, 'OPEN', 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=600&auto=format&fit=crop&q=80',
        'Kho Vùng Trồng Thạnh Mỹ - Đơn Dương', 'Tây Nguyên & Lâm Đồng', 'Trái to dày thịt mọng nước, độ đường Brix đạt 4.8 tiêu chuẩn xuất khẩu.',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        'LOT-LD-2026-015', v_farmer_id, 'Nông Trại Rau Củ Đà Lạt', 'Cà Rốt Baby Đà Lạt', 'CU_QUA', 2,
        'VN-LDO-04-105', 'VietGAP', CURRENT_DATE - INTERVAL '1 day', CURRENT_DATE + INTERVAL '20 days', 15000.00,
        13200.00, 16000.00, '[{"minKg": 500, "price": 16000}, {"minKg": 3000, "price": 14500}]'::jsonb, 2.0,
        5.0, 'OPEN', 'https://images.unsplash.com/photo-1447175008436-054170c2e979?w=600&auto=format&fit=crop&q=80',
        'Khu Kiểm Định Trạm Đức Trọng', 'Tây Nguyên & Lâm Đồng', 'Củ thẳng nhẵn bóng, rửa sạch xử lý ozon, ruột đỏ cam vị ngọt đậm đà.',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        'LOT-LD-2026-016', v_farmer_id, 'HTX Nông Sản Đức Trọng', 'Khoai Tây Vàng Đà Lạt', 'CU_QUA', 2,
        'VN-LDO-03-115', 'VietGAP, OCOP 4 Sao', CURRENT_DATE - INTERVAL '3 days', CURRENT_DATE + INTERVAL '30 days', 20000.00,
        17500.00, 18500.00, '[{"minKg": 1000, "price": 18500}, {"minKg": 5000, "price": 16500}]'::jsonb, 6.0,
        10.0, 'OPEN', 'https://images.unsplash.com/photo-1518977676601-b53f82aba655?w=600&auto=format&fit=crop&q=80',
        'Tổng Kho Nông Sản Đức Trọng', 'Tây Nguyên & Lâm Đồng', 'Củ to đều không sâu thối, hàm lượng tinh bột cao, chuyên gia công khoai chiên.',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        'LOT-LD-2026-017', v_farmer_id, 'Trang Trại LangBiang Farm', 'Ớt Chuông Sweet Pepper Đỏ Vàng', 'CU_QUA', 2,
        'VN-LDO-01-090', 'GlobalGAP', CURRENT_DATE - INTERVAL '1 day', CURRENT_DATE + INTERVAL '12 days', 8000.00,
        6400.00, 32000.00, '[{"minKg": 300, "price": 32000}, {"minKg": 1500, "price": 29000}]'::jsonb, 4.0,
        7.0, 'OPEN', 'https://images.unsplash.com/photo-1563565375-f3fdfdbefa83?w=600&auto=format&fit=crop&q=80',
        'Trạm Trung Chuyển Đức Trọng - Buồng Lạnh B2', 'Tây Nguyên & Lâm Đồng', 'Ớt chuông nhà kính Israel, vỏ bóng dày cơm, độ giòn và ngọt cao.',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        'LOT-GL-2026-018', v_farmer_id, 'HTX Nông Nghiệp Chư Prông', 'Bí Đỏ Hồ Lô Hữu Cơ', 'CU_QUA', 2,
        'VN-GLA-05-150', 'VietGAP', CURRENT_DATE - INTERVAL '5 days', CURRENT_DATE + INTERVAL '35 days', 18000.00,
        15000.00, 9500.00, '[{"minKg": 1000, "price": 9500}, {"minKg": 5000, "price": 8200}]'::jsonb, 10.0,
        15.0, 'OPEN', 'https://images.unsplash.com/photo-1570586437263-ab629fccc818?w=600&auto=format&fit=crop&q=80',
        'Kho Trung Chuyển Pleiku - Gia Lai', 'Tây Nguyên & Lâm Đồng', 'Bí đỏ đất đỏ Bazan dẻo ngọt bùi, vỏ cứng chịu va đập vận chuyển xa.',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        'LOT-BTR-2026-019', v_farmer_id, 'HTX Nông Sản An Toàn Ba Tri', 'Khổ Qua Rừng Ba Tri', 'CU_QUA', 2,
        'VN-BTR-05-400', 'Chuẩn Nông Sản An Toàn', CURRENT_DATE - INTERVAL '1 day', CURRENT_DATE + INTERVAL '8 days', 5500.00,
        4200.00, 26000.00, '[{"minKg": 300, "price": 26000}, {"minKg": 1000, "price": 23000}]'::jsonb, 6.0,
        10.0, 'OPEN', 'https://images.unsplash.com/photo-1739903760973-4731a8e79a03?w=600&auto=format&fit=crop&q=80',
        'Kho Trung Chuyển Sóng Thần - Dĩ An', 'Đồng Bằng Sông Cửu Long', 'Khổ qua rừng dược tính cao, đắng thanh, cung cấp chuỗi siêu thị sạch.',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        'LOT-LD-2026-020', v_farmer_id, 'HTX Nông Nghiệp CNC Đơn Dương', 'Dưa Leo Baby Thủy Canh', 'CU_QUA', 2,
        'VN-LDO-04-100', 'VietGAP', CURRENT_DATE, CURRENT_DATE + INTERVAL '9 days', 9000.00,
        9000.00, 17000.00, '[{"minKg": 500, "price": 17000}, {"minKg": 2000, "price": 15000}]'::jsonb, 4.0,
        8.0, 'PENDING_APPROVAL', 'https://images.unsplash.com/photo-1449300079323-02e209d9d3a6?w=600&auto=format&fit=crop&q=80',
        'Kho Trung Chuyển Đức Trọng', 'Tây Nguyên & Lâm Đồng', 'Dưa leo baby da láng giòn ngọt không đắng, đang chờ test dư lượng.',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        'LOT-LD-2026-021', v_farmer_id, 'Liên Minh HTX Đà Lạt GAP', 'Củ Cải Trắng Đà Lạt', 'CU_QUA', 2,
        'VN-LDO-08-200', 'VietGAP', CURRENT_DATE - INTERVAL '2 days', CURRENT_DATE + INTERVAL '18 days', 16000.00,
        13500.00, 11500.00, '[{"minKg": 1000, "price": 11500}, {"minKg": 5000, "price": 10000}]'::jsonb, 2.0,
        6.0, 'OPEN', 'https://images.unsplash.com/photo-1689082697563-a90beab7104b?w=600&auto=format&fit=crop&q=80',
        'Trạm Trung Chuyển Đức Trọng - Buồng A3', 'Tây Nguyên & Lâm Đồng', 'Củ cải trắng vỏ mỏng mọng nước, phù hợp chế biến và hầm súp.',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        'LOT-LD-2026-022', v_farmer_id, 'Nông Trại Xanh Lạc Dương', 'Cà Chua Cherry Socola', 'CU_QUA', 2,
        'VN-LDO-01-098', 'GlobalGAP, OCOP 4 Sao', CURRENT_DATE - INTERVAL '1 day', CURRENT_DATE + INTERVAL '11 days', 4000.00,
        3200.00, 42000.00, '[{"minKg": 200, "price": 42000}, {"minKg": 1000, "price": 38000}]'::jsonb, 4.0,
        8.0, 'OPEN', 'https://images.unsplash.com/photo-1546470427-0d4db154ceb7?w=600&auto=format&fit=crop&q=80',
        'Kho Lạnh Lạc Dương - Buồng C1', 'Tây Nguyên & Lâm Đồng', 'Cà chua cherry cao cấp màu nâu sẫm, độ ngọt đậm brix > 7, ăn tươi trực tiếp.',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        'LOT-LD-2026-023', v_farmer_id, 'HTX Nông Sản Lạc Dương', 'Đậu Cô Ve Nhật Bản', 'CU_QUA', 2,
        'VN-LDO-01-105', 'VietGAP', CURRENT_DATE, CURRENT_DATE + INTERVAL '7 days', 6500.00,
        6500.00, 23000.00, '[{"minKg": 300, "price": 23000}, {"minKg": 1500, "price": 20500}]'::jsonb, 3.0,
        6.0, 'PENDING_APPROVAL', 'https://images.unsplash.com/photo-1591857177580-dc82b9ac4e1e?w=600&auto=format&fit=crop&q=80',
        'Trạm Đức Trọng', 'Tây Nguyên & Lâm Đồng', 'Trái đậu thẳng dài, xanh tươi, hạt non mềm, thích hợp xuất khẩu.',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        'LOT-LD-2026-024', v_farmer_id, 'Nông Hộ Tà Nung Đà Lạt', 'Khoai Lang Mật Tà Nung', 'CU_QUA', 2,
        'VN-LDO-02-080', 'VietGAP, OCOP 3 Sao', CURRENT_DATE - INTERVAL '4 days', CURRENT_DATE + INTERVAL '40 days', 25000.00,
        22000.00, 15000.00, '[{"minKg": 1000, "price": 15000}, {"minKg": 5000, "price": 13000}]'::jsonb, 12.0,
        18.0, 'OPEN', 'https://images.unsplash.com/photo-1590779033100-9f60a05a013d?w=600&auto=format&fit=crop&q=80',
        'Kho Vùng Trồng Tà Nung', 'Tây Nguyên & Lâm Đồng', 'Khoai lang mật ủ tươm mật dẻo thơm, đặc sản nức tiếng Đà Lạt.',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        'LOT-SLA-2026-025', v_farmer_id, 'HTX Nông Nghiệp Xanh Mộc Châu', 'Su Hào Búp Tròn Mộc Châu', 'CU_QUA', 2,
        'VN-SLA-09-300', 'VietGAP', CURRENT_DATE - INTERVAL '2 days', CURRENT_DATE + INTERVAL '16 days', 11000.00,
        9000.00, 12500.00, '[{"minKg": 500, "price": 12500}, {"minKg": 3000, "price": 11000}]'::jsonb, 2.0,
        6.0, 'OPEN', 'https://images.unsplash.com/photo-1546793665-c74683f339c1?w=600&auto=format&fit=crop&q=80',
        'Tổng Kho Mộc Châu - Buồng B2', 'Bắc Bộ', 'Su hào mùa lạnh vỏ mỏng củ ngọt, không bị xơ xơ gân cứng.',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        'LOT-LD-2026-026', v_farmer_id, 'HTX Rau An Toàn Đức Trọng', 'Bí Ngòi Xanh Canh Tác Nhà Kính', 'CU_QUA', 2,
        'VN-LDO-03-120', 'VietGAP', CURRENT_DATE - INTERVAL '1 day', CURRENT_DATE + INTERVAL '10 days', 7500.00,
        5800.00, 19000.00, '[{"minKg": 300, "price": 19000}, {"minKg": 2000, "price": 17000}]'::jsonb, 4.0,
        8.0, 'OPEN', 'https://images.unsplash.com/photo-1563865436874-9aef32095fad?w=600&auto=format&fit=crop&q=80',
        'Trạm Trung Chuyển Đức Trọng - Buồng A2', 'Tây Nguyên & Lâm Đồng', 'Trái bí ngòi xanh mướt đều đặn, không trầy xước, bao màng co bảo quản.',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    );

    -- =========================================================================
    -- NGÀNH HÀNG 3: NẤM TƯƠI & HỮU CƠ (12 LÔ) - category_id: 3, category: NAM_TUOI
    -- =========================================================================
    INSERT INTO harvest_lots (
        lot_code, farmer_id, farmer_name, product_name, category, category_id,
        puc_code, certification, harvest_date, expiry_date, total_weight_kg,
        available_weight_kg, base_price_per_kg, tier_pricing_json, req_temp_min,
        req_temp_max, status, image_url, warehouse_location, region, audit_note,
        created_at, updated_at
    ) VALUES
    (
        'LOT-LD-2026-027', v_farmer_id, 'Liên Minh HTX Nấm Sạch Đà Lạt', 'Nấm Đùi Gà Thượng Hạng', 'NAM_TUOI', 3,
        'VN-LDO-08-200', 'GlobalGAP, Organic', CURRENT_DATE, CURRENT_DATE + INTERVAL '7 days', 4000.00,
        3400.00, 48000.00, '[{"minKg": 200, "price": 48000}, {"minKg": 1000, "price": 43000}]'::jsonb, 2.0,
        4.0, 'OPEN', 'https://images.unsplash.com/photo-1573732064472-ea7fd2382d22?w=600&auto=format&fit=crop&q=80',
        'Kho Lạnh Chuyên Dụng Nấm A3', 'Tây Nguyên & Lâm Đồng', 'Nấm đùi gà size đại, thân nấm chắc trắng muốt, không nhớt, mùi thơm tự nhiên.',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        'LOT-LD-2026-028', v_farmer_id, 'HTX Nấm Công Nghệ Cao Đức Trọng', 'Nấm Kim Châm Tươi Sạch', 'NAM_TUOI', 3,
        'VN-LDO-03-130', 'VietGAP', CURRENT_DATE - INTERVAL '1 day', CURRENT_DATE + INTERVAL '8 days', 6000.00,
        4900.00, 38000.00, '[{"minKg": 300, "price": 38000}, {"minKg": 1500, "price": 34000}]'::jsonb, 1.0,
        3.5, 'OPEN', 'https://images.unsplash.com/photo-1542913235-1f46ce06443d?w=600&auto=format&fit=crop&q=80',
        'Kho Lạnh Chuyên Dụng Nấm A3', 'Tây Nguyên & Lâm Đồng', 'Đóng gói hút chân không chuyên nghiệp, bảo quản lạnh nghiêm ngặt dưới 3.5 độ C.',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        'LOT-DN-2026-029', v_farmer_id, 'Trang Trại Nấm Long Khánh', 'Nấm Bào Ngư Xám Hữu Cơ', 'NAM_TUOI', 3,
        'VN-DNA-04-180', 'VietGAP', CURRENT_DATE, CURRENT_DATE + INTERVAL '6 days', 5000.00,
        5000.00, 35000.00, '[{"minKg": 200, "price": 35000}, {"minKg": 1000, "price": 31000}]'::jsonb, 2.0,
        5.0, 'PENDING_APPROVAL', 'https://images.unsplash.com/photo-1622352348086-d622137af3b0?w=600&auto=format&fit=crop&q=80',
        'Kho Trung Chuyển Sóng Thần - Dĩ An', 'Đồng Nai & Đông Nam Bộ', 'Tai nấm dày xám đậm, thu hái đúng lứa, đang chờ chuyên viên QC đóng dấu.',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        'LOT-LD-2026-030', v_farmer_id, 'Nông Trại Nấm Sinh Học Lạc Dương', 'Nấm Mối Đen Cao Cấp', 'NAM_TUOI', 3,
        'VN-LDO-01-085', 'GlobalGAP, OCOP 4 Sao', CURRENT_DATE, CURRENT_DATE + INTERVAL '5 days', 2500.00,
        2100.00, 120000.00, '[{"minKg": 100, "price": 120000}, {"minKg": 500, "price": 108000}]'::jsonb, 1.5,
        4.0, 'OPEN', 'https://images.unsplash.com/photo-1504545102780-26774c1bb073?w=600&auto=format&fit=crop&q=80',
        'Kho Lạnh Lạc Dương - Buồng Đặc Biệt', 'Tây Nguyên & Lâm Đồng', 'Nấm mối đen sinh học quý hiếm, thịt ngọt giòn như nấm tự nhiên, giàu vi chất.',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        'LOT-LCA-2026-031', v_farmer_id, 'HTX Nông Lâm Sản Sa Pa', 'Nấm Hương Tươi Sa Pa', 'NAM_TUOI', 3,
        'VN-LCA-07-210', 'VietGAP, OCOP 4 Sao', CURRENT_DATE - INTERVAL '1 day', CURRENT_DATE + INTERVAL '7 days', 3200.00,
        2700.00, 75000.00, '[{"minKg": 100, "price": 75000}, {"minKg": 500, "price": 68000}]'::jsonb, 2.0,
        5.0, 'OPEN', 'https://images.unsplash.com/photo-1620582708067-9f6ba1e2fc1c?w=600&auto=format&fit=crop&q=80',
        'Tổng Kho Lào Cai - Buồng Lạnh A', 'Bắc Bộ', 'Nấm hương tươi vùng núi cao Sa Pa thơm ngát đặc trưng, mũ nấm dày dặn nở đều.',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        'LOT-GL-2026-032', v_farmer_id, 'HTX Dược Liệu Tây Nguyên', 'Nấm Linh Chi Đỏ Thái Lát', 'NAM_TUOI', 3,
        'VN-GLA-08-160', 'Hữu cơ Organic', CURRENT_DATE - INTERVAL '10 days', CURRENT_DATE + INTERVAL '180 days', 1500.00,
        1300.00, 280000.00, '[{"minKg": 50, "price": 280000}, {"minKg": 200, "price": 250000}]'::jsonb, 15.0,
        25.0, 'OPEN', 'https://images.unsplash.com/photo-1541781774459-bb2af2f05b55?w=600&auto=format&fit=crop&q=80',
        'Kho Dược Liệu Pleiku', 'Tây Nguyên & Lâm Đồng', 'Linh chi đỏ giống Hàn Quốc trồng mùn cưa cao su tự nhiên, hàm lượng Polysaccharide cao.',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        'LOT-LD-2026-033', v_farmer_id, 'Trang Trại Nấm Hoàng Gia', 'Nấm Hoàng Kim Đà Lạt', 'NAM_TUOI', 3,
        'VN-LDO-03-145', 'VietGAP', CURRENT_DATE, CURRENT_DATE + INTERVAL '6 days', 2800.00,
        2800.00, 52000.00, '[{"minKg": 100, "price": 52000}, {"minKg": 500, "price": 47000}]'::jsonb, 2.0,
        4.5, 'PENDING_APPROVAL', 'https://images.unsplash.com/photo-1597701655287-2ea251d9c447?w=600&auto=format&fit=crop&q=80',
        'Kho Lạnh Chuyên Dụng Nấm A3', 'Tây Nguyên & Lâm Đồng', 'Nấm hoàng kim màu vàng óng đẹp mắt, vị ngọt bùi thanh đạm, giàu khoáng chất.',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        'LOT-DT-2026-034', v_farmer_id, 'HTX Nông Nghiệp Lai Vung', 'Nấm Rơm Tươi Chọn Lọc', 'NAM_TUOI', 3,
        'VN-DTA-02-190', 'Chuẩn ATTP', CURRENT_DATE, CURRENT_DATE + INTERVAL '4 days', 4500.00,
        3800.00, 62000.00, '[{"minKg": 100, "price": 62000}, {"minKg": 500, "price": 56000}]'::jsonb, 8.0,
        12.0, 'OPEN', 'https://images.unsplash.com/photo-1657500916344-d33346904ed5?w=600&auto=format&fit=crop&q=80',
        'Kho Trung Chuyển Sóng Thần - Dĩ An', 'Đồng Bằng Sông Cửu Long', 'Nấm rơm tươi hái búp tròn, không bị nở xòe, vận chuyển nhanh trong ngày.',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        'LOT-DN-2026-035', v_farmer_id, 'HTX Nông Sản Định Quán', 'Nấm Mộc Nhĩ Khô Loại 1', 'NAM_TUOI', 3,
        'VN-DNA-05-120', 'VietGAP', CURRENT_DATE - INTERVAL '15 days', CURRENT_DATE + INTERVAL '180 days', 3000.00,
        2500.00, 85000.00, '[{"minKg": 100, "price": 85000}, {"minKg": 500, "price": 76000}]'::jsonb, 15.0,
        25.0, 'OPEN', 'https://images.unsplash.com/photo-1603709764670-eb3b697713af?w=600&auto=format&fit=crop&q=80',
        'Tổng Kho Nông Sản Đồng Nai', 'Đồng Nai & Đông Nam Bộ', 'Mộc nhĩ cánh to dày, nở nhiều, không vụn nát, phơi sấy nhà kính hợp vệ sinh.',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        'LOT-LD-2026-036', v_farmer_id, 'HTX Nấm Công Nghệ Cao Đức Trọng', 'Nấm Tuyết Trắng Tươi', 'NAM_TUOI', 3,
        'VN-LDO-03-130', 'GlobalGAP', CURRENT_DATE - INTERVAL '1 day', CURRENT_DATE + INTERVAL '6 days', 2000.00,
        1600.00, 92000.00, '[{"minKg": 50, "price": 92000}, {"minKg": 200, "price": 84000}]'::jsonb, 2.0,
        4.0, 'OPEN', 'https://images.unsplash.com/photo-1569108891320-de8f5b7723b6?w=600&auto=format&fit=crop&q=80',
        'Kho Lạnh Chuyên Dụng Nấm A3', 'Tây Nguyên & Lâm Đồng', 'Nấm tuyết trắng muốt như hoa tuyết, dùng nấu chè dưỡng nhan và súp cao cấp.',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        'LOT-LA-2026-037', v_farmer_id, 'Nông Trại Nấm Hữu Cơ Bến Lức', 'Nấm Bào Ngư Trắng Tươi', 'NAM_TUOI', 3,
        'VN-LAN-02-108', 'VietGAP', CURRENT_DATE, CURRENT_DATE + INTERVAL '6 days', 5500.00,
        4800.00, 32000.00, '[{"minKg": 200, "price": 32000}, {"minKg": 1000, "price": 28500}]'::jsonb, 2.0,
        5.0, 'OPEN', 'https://images.unsplash.com/photo-1504545102780-26774c1bb073?w=600&auto=format&fit=crop&q=80',
        'Kho Trung Chuyển Bình Điền', 'Đồng Bằng Sông Cửu Long', 'Nấm bào ngư trắng non giòn dai, nguồn đạm thực vật lý tưởng cho bữa ăn chay.',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        'LOT-LC-2026-038', v_farmer_id, 'HTX Đặc Sản Bắc Hà', 'Nấm Hương Khô Tây Bắc', 'NAM_TUOI', 3,
        'VN-LCA-09-180', 'OCOP 4 Sao', CURRENT_DATE - INTERVAL '20 days', CURRENT_DATE + INTERVAL '240 days', 1800.00,
        1800.00, 195000.00, '[{"minKg": 50, "price": 195000}, {"minKg": 200, "price": 178000}]'::jsonb, 15.0,
        25.0, 'OPEN', 'https://images.unsplash.com/photo-1629665001701-a232a0ba4eec?w=600&auto=format&fit=crop&q=80',
        'Tổng Kho Lào Cai', 'Bắc Bộ', 'Nấm hương rừng sấy củi thơm ngát danh tiếng Tây Bắc, cánh nấm tròn dày.',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    );

    -- =========================================================================
    -- NGÀNH HÀNG 4: RAU GIA VỊ & THẢO MỘC (12 LÔ) - category_id: 4, category: RAU_GIA_VI
    -- =========================================================================
    INSERT INTO harvest_lots (
        lot_code, farmer_id, farmer_name, product_name, category, category_id,
        puc_code, certification, harvest_date, expiry_date, total_weight_kg,
        available_weight_kg, base_price_per_kg, tier_pricing_json, req_temp_min,
        req_temp_max, status, image_url, warehouse_location, region, audit_note,
        created_at, updated_at
    ) VALUES
    (
        'LOT-VP-2026-039', v_farmer_id, 'HTX Rau Gia Vị Bình Xuyên', 'Hành Lá Cọng Dài Hương Canh', 'RAU_GIA_VI', 4,
        'VN-VPH-03-090', 'VietGAP', CURRENT_DATE, CURRENT_DATE + INTERVAL '7 days', 7000.00,
        6100.00, 18000.00, '[{"minKg": 300, "price": 18000}, {"minKg": 1500, "price": 16000}]'::jsonb, 2.0,
        6.0, 'OPEN', 'https://images.unsplash.com/photo-1608686207856-001b95cf60ca?w=600&auto=format&fit=crop&q=80',
        'Tổng Kho Mê Linh - Hà Nội', 'Bắc Bộ', 'Hành lá cọng dài xanh đậm, rễ cắt gọn, hương thơm cay the tự nhiên.',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        'LOT-BT-2026-040', v_farmer_id, 'HTX Nông Sản Chợ Lách', 'Ngò Rí Bến Tre Thơm Ngọt', 'RAU_GIA_VI', 4,
        'VN-BTR-02-140', 'VietGAP', CURRENT_DATE - INTERVAL '1 day', CURRENT_DATE + INTERVAL '6 days', 4000.00,
        3400.00, 22000.00, '[{"minKg": 200, "price": 22000}, {"minKg": 800, "price": 19500}]'::jsonb, 2.0,
        5.0, 'OPEN', 'https://images.unsplash.com/photo-1588879460618-9249e7d947d1?w=600&auto=format&fit=crop&q=80',
        'Kho Trung Chuyển Sóng Thần - Dĩ An', 'Đồng Bằng Sông Cửu Long', 'Ngò rí lá nhỏ hương tinh dầu thơm ngát, thân mềm tươi không dập nát.',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        'LOT-TG-2026-041', v_farmer_id, 'HTX Dược Liệu Tiền Giang', 'Húng Quế Canh Tác Hữu Cơ', 'RAU_GIA_VI', 4,
        'VN-TGI-05-180', 'VietGAP, Hữu cơ Organic', CURRENT_DATE, CURRENT_DATE + INTERVAL '5 days', 3500.00,
        3500.00, 24000.00, '[{"minKg": 150, "price": 24000}, {"minKg": 800, "price": 21000}]'::jsonb, 4.0,
        8.0, 'PENDING_APPROVAL', 'https://images.unsplash.com/photo-1618164435735-413d3b066c9a?w=600&auto=format&fit=crop&q=80',
        'Kho Trung Chuyển Bình Điền', 'Đồng Bằng Sông Cửu Long', 'Rau thơm sạch chuyên cung cấp chuỗi phở và bún bò, đang đối soát mã PUC.',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        'LOT-DL-2026-042', v_farmer_id, 'HTX Nông Sản Buôn Ma Thuột', 'Sả Cây Tươi Đắk Lắk', 'RAU_GIA_VI', 4,
        'VN-DLA-04-120', 'VietGAP', CURRENT_DATE - INTERVAL '2 days', CURRENT_DATE + INTERVAL '25 days', 15000.00,
        13500.00, 9000.00, '[{"minKg": 1000, "price": 9000}, {"minKg": 5000, "price": 7800}]'::jsonb, 10.0,
        18.0, 'OPEN', 'https://images.unsplash.com/photo-1596704017254-9b121068fb31?w=600&auto=format&fit=crop&q=80',
        'Kho Nông Sản Buôn Ma Thuột', 'Tây Nguyên & Lâm Đồng', 'Sả tép mập củ to, tinh dầu thơm nồng, cắt ngọn bó 10kg chuẩn xuất khẩu.',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        'LOT-SLA-2026-043', v_farmer_id, 'HTX Dược Liệu Vân Hồ', 'Gừng Già Đồi Gió Núi Mộc Châu', 'RAU_GIA_VI', 4,
        'VN-SLA-08-110', 'OCOP 3 Sao', CURRENT_DATE - INTERVAL '5 days', CURRENT_DATE + INTERVAL '60 days', 12000.00,
        10500.00, 25000.00, '[{"minKg": 500, "price": 25000}, {"minKg": 2500, "price": 22000}]'::jsonb, 12.0,
        20.0, 'OPEN', 'https://images.unsplash.com/photo-1615485290382-441e4d049cb5?w=600&auto=format&fit=crop&q=80',
        'Tổng Kho Mộc Châu', 'Bắc Bộ', 'Gừng dé giống bản địa ruột vàng thơm cay xé lưỡi, vỏ mỏng nhiều nhánh.',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        'LOT-QNG-2026-044', v_farmer_id, 'HTX Nông Nghiệp Đảo Lý Sơn', 'Tỏi Cô Đơn Lý Sơn Chính Gốc', 'RAU_GIA_VI', 4,
        'VN-QNG-01-001', 'Chỉ dẫn địa lý, OCOP 5 Sao', CURRENT_DATE - INTERVAL '10 days', CURRENT_DATE + INTERVAL '120 days', 2500.00,
        2100.00, 350000.00, '[{"minKg": 50, "price": 350000}, {"minKg": 200, "price": 320000}]'::jsonb, 15.0,
        25.0, 'OPEN', 'https://images.unsplash.com/photo-1618512496248-a07fe83aa8cb?w=600&auto=format&fit=crop&q=80',
        'Kho Đặc Sản Miền Trung', 'Duyên Hải Miền Trung', 'Tỏi một tép trứ danh đảo Lý Sơn, hàm lượng kháng sinh tự nhiên Allicin vượt trội.',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        'LOT-ST-2026-045', v_farmer_id, 'HTX Hành Tím Vĩnh Châu', 'Hành Tím Vĩnh Châu Củ Chắc', 'RAU_GIA_VI', 4,
        'VN-STG-03-210', 'Chỉ dẫn địa lý, OCOP 4 Sao', CURRENT_DATE - INTERVAL '8 days', CURRENT_DATE + INTERVAL '90 days', 20000.00,
        17500.00, 28000.00, '[{"minKg": 500, "price": 28000}, {"minKg": 3000, "price": 25000}]'::jsonb, 15.0,
        25.0, 'OPEN', 'https://images.unsplash.com/photo-1565685225009-fc85d9109c80?w=600&auto=format&fit=crop&q=80',
        'Tổng Kho Sóc Trăng', 'Đồng Bằng Sông Cửu Long', 'Hành tím củ tròn màu tím cánh sen, cay nồng bảo quản lâu không óp thối.',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        'LOT-BD-2026-046', v_farmer_id, 'HTX Rau Sạch Dầu Tiếng', 'Bạc Hà (Dọc Mùng) Tươi', 'RAU_GIA_VI', 4,
        'VN-BDG-04-105', 'VietGAP', CURRENT_DATE - INTERVAL '1 day', CURRENT_DATE + INTERVAL '8 days', 6000.00,
        5200.00, 14000.00, '[{"minKg": 300, "price": 14000}, {"minKg": 1500, "price": 12000}]'::jsonb, 3.0,
        7.0, 'OPEN', 'https://images.unsplash.com/photo-1597362925123-77861d3fbac7?w=600&auto=format&fit=crop&q=80',
        'Kho Trung Chuyển Sóng Thần - Dĩ An', 'Đồng Nai & Đông Nam Bộ', 'Cây bạc hà xanh mập mạp, ruột xốp trắng nõn chuyên nấu canh chua, lẩu.',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        'LOT-DT-2026-047', v_farmer_id, 'HTX Nông Sản Sa Đéc', 'Rau Răm Hữu Cơ Miền Tây', 'RAU_GIA_VI', 4,
        'VN-DTA-01-090', 'VietGAP', CURRENT_DATE, CURRENT_DATE + INTERVAL '5 days', 3000.00,
        2600.00, 20000.00, '[{"minKg": 100, "price": 20000}, {"minKg": 500, "price": 17500}]'::jsonb, 3.0,
        6.0, 'OPEN', 'https://images.unsplash.com/photo-1588879460618-9249e7d947d1?w=600&auto=format&fit=crop&q=80',
        'Kho Trung Chuyển Bình Điền', 'Đồng Bằng Sông Cửu Long', 'Lá nhỏ thơm the nồng ấm, hái trong ngày đóng sọt tre thông gió.',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        'LOT-LD-2026-048', v_farmer_id, 'HTX Thảo Mộc LangBiang', 'Tía Tô Thơm Giống Nhật Bản', 'RAU_GIA_VI', 4,
        'VN-LDO-01-095', 'GlobalGAP', CURRENT_DATE, CURRENT_DATE + INTERVAL '7 days', 2800.00,
        2800.00, 42000.00, '[{"minKg": 100, "price": 42000}, {"minKg": 500, "price": 38000}]'::jsonb, 2.0,
        5.0, 'PENDING_APPROVAL', 'https://images.unsplash.com/photo-1580910365203-91ea9115a319?w=600&auto=format&fit=crop&q=80',
        'Kho Lạnh Lạc Dương', 'Tây Nguyên & Lâm Đồng', 'Lá tía tô to đều, mặt tím đậm hương vị nồng, phục vụ chuỗi ẩm thực Nhật - Hàn.',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        'LOT-HN-2026-049', v_farmer_id, 'HTX Nông Nghiệp Ba Vì', 'Kinh Giới Lá To Chuyên Chuỗi Lẩu', 'RAU_GIA_VI', 4,
        'VN-HNI-05-180', 'VietGAP', CURRENT_DATE - INTERVAL '1 day', CURRENT_DATE + INTERVAL '6 days', 4200.00,
        3600.00, 21000.00, '[{"minKg": 150, "price": 21000}, {"minKg": 800, "price": 18500}]'::jsonb, 3.0,
        6.0, 'OPEN', 'https://images.unsplash.com/photo-1618164435735-413d3b066c9a?w=600&auto=format&fit=crop&q=80',
        'Tổng Kho Mê Linh - Hà Nội', 'Bắc Bộ', 'Kinh giới trồng đồi Ba Vì tinh dầu ngát hương, lá dày mướt không sâu bệnh.',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        'LOT-LD-2026-050', v_farmer_id, 'HTX Nông Nghiệp Đơn Dương', 'Hẹ Lá Thủy Canh Cao Cấp', 'RAU_GIA_VI', 4,
        'VN-LDO-04-100', 'GlobalGAP', CURRENT_DATE, CURRENT_DATE + INTERVAL '8 days', 5000.00,
        4200.00, 26000.00, '[{"minKg": 200, "price": 26000}, {"minKg": 1000, "price": 23000}]'::jsonb, 2.0,
        5.0, 'OPEN', 'https://images.unsplash.com/photo-1608686207856-001b95cf60ca?w=600&auto=format&fit=crop&q=80',
        'Trạm Trung Chuyển Đức Trọng - Buồng A1', 'Tây Nguyên & Lâm Đồng', 'Hẹ lá trồng thủy canh dinh dưỡng hữu cơ, cọng trắng nõn lá xanh mượt.',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ) ON CONFLICT (lot_code) DO NOTHING;

END $$;
