# 🌱 HoNa Fresh B2B (AgriB2B Platform)
### Nền Tảng Thương Mại Điện Tử B2B Nông Sản Trung Gian Ký Quỹ & Quản Trị Chuỗi Cung Ứng Lạnh

> **Mô hình vận hành:** Sàn giao dịch B2B Nông sản Trung gian Ký quỹ (**Escrow**) kết hợp Trạm Kiểm định Trung chuyển (**Cross-docking Hub**) & Điều phối Vận tải Lạnh (**Cold-Chain TMS**).  
> **Quy mô thực hiện:** Nhóm 5 thành viên | **Thời gian:** 4 Tuần.

---

## 📑 MỤC LỤC
1. [Kiến Trúc Kỹ Thuật Tinh Gọn (Tech Stack MVP)](#1-kiến-trúc-kỹ-thuật-tinh-gọn-tech-stack-mvp)
2. [Luồng Nghiệp Vụ Xuyên Suốt (End-to-End Golden Path)](#2-luồng-nghiệp-vụ-xuyên-suốt-end-to-end-golden-path)
3. [Thiết Kế Cơ Sở Dữ Liệu Chuẩn Hóa (10 Bảng Core)](#3-thiết-kế-cơ-sở-dữ-liệu-chuẩn-hóa-10-bảng-core)
4. [Ma Trận Tự Động Định Khoản Kế Toán (VAS Rule Engine)](#4-ma-trận-tự-động-định-khoản-kế-toán-vas-rule-engine)
5. [Phân Công Chi Tiết 5 Thành Viên](#5-phân-công-chi-tiết-5-thành-viên-chạy-song-song)
6. [Lịch Trình 4 Tuần Chi Tiết (Sprint Plan)](#6-lịch-trình-4-tuần-chi-tiết-sprint-plan)
7. [Hướng Dẫn Cài Đặt & Khởi Chạy Nhanh](#7-hướng-dẫn-cài-đặt--khởi-chạy-nhanh)

---

## 1. KIẾN TRÚC KỸ THUẬT TINH GỌN (TECH STACK MVP)

Để tối đa hóa tốc độ phát triển và tránh lỗi cấu hình hạ tầng phức tạp khi bảo vệ đồ án, toàn bộ hệ thống được xây dựng theo kiến trúc **Modular Monolith**:

* **Frontend (Web App All-in-One):**
  * Framework: **Next.js (App Router)** + **TypeScript** + **TailwindCSS**.
  * UI Library: **Shadcn/UI** + **Lucide Icons** + **Recharts** (trực quan hóa biểu đồ IoT và AI).
  * Tích hợp **4 Portals theo Role** trên cùng một nền tảng:
    1. *Portal Nông trại:* Đăng lô vụ mùa, quản lý RFQ đàm phán, theo dõi giải ngân.
    2. *Portal Thương lái:* Tìm nguồn hàng, đàm phán giá sỉ, quét VietQR ký quỹ & thanh toán, ký nhận ePOD.
    3. *Portal Vận hành Trạm & Xe Lạnh (Mobile Responsive):* Kiểm định chất lượng QC, phân loại FEFO, giám sát buồng lạnh và lộ trình xe tải.
    4. *Portal Kế toán & Admin:* Giám sát dòng tiền ký quỹ Escrow, xuất hóa đơn điện tử, bảng kê 01/TNDN, bảng điều khiển AI và hệ thống giả lập IoT.
* **Backend:**
  * **Spring Boot (Java 21)**  — Cung cấp RESTful API chuẩn OpenAPI/Swagger.
  * **WebSocket (Socket.io / STOMP):** Đẩy thông số cảm biến và cảnh báo vượt ngưỡng nhiệt độ chuỗi lạnh theo thời gian thực (Real-time Alert).
* **Database:**
  * **PostgreSQL** (hoặc MariaDB / MySQL) duy nhất: Lưu trữ tập trung thông tin giao dịch, kế toán kép VAS, lịch sử nhiệt độ IoT và dự báo AI.
* **IoT Simulator & Fault Injector:**
  * Mạch giả lập **ESP32 + DHT22** trên **Wokwi** kết nối qua HTTP/MQTT.
  * Tích hợp **Bảng điều khiển Giả lập Sự cố (IoT Fault Injector)** trực tiếp trên Web UI: Cho phép giảng viên/người thuyết trình bấm nút tăng vọt nhiệt độ (lên $15^\circ\text{C}$) để kích hoạt còi hú, cảnh báo đỏ và quy trình đền bù sự cố ngay lập tức.
* **Thanh Toán & Chứng Từ Chuẩn Việt Nam:**
  * Tích hợp **VietQR API**: Sinh mã QR động nạp tiền cọc $30\%$ và thanh toán $70\%$ còn lại.
  * Trình xuất PDF / In trực tiếp: **Bảng kê thu mua nông sản Mẫu 01/TNDN** (cho hộ nông dân), **Hóa đơn KCT** (cho HTX/DN), và **Hóa đơn GTGT Dịch vụ Sàn** (kèm thuế suất $8\%$/$10\%$).

---

## 2. LUỒNG NGHIỆP VỤ XUYÊN SUỐT (END-TO-END GOLDEN PATH)

Hệ thống vận hành theo chu trình **6 bước khép kín**. Sàn đóng vai trò trung gian bảo chứng: **không mua đứt bán đoạn**, chỉ thu hộ tiền, kiểm định chất lượng, giám sát chuỗi lạnh, điều phối xe và thu phí dịch vụ:

```
[1. Đăng Bán & RFQ] ──► [2. Ký Quỹ Cọc 30%] ──► [3. QC Trạm & FEFO]
         │                                               │
[6. Quyết Toán VAS] ◄── [5. Giao Hàng & ePOD] ◄── [4. IoT & Điều Phối Xe]
```

1. **Đăng bán & Đàm phán (B2B & RFQ):**
   * Nông trại chào bán theo Lô thu hoạch (kèm Mã số vùng trồng PUC, tiêu chuẩn VietGAP/GlobalGAP, sản lượng, bảng giá sỉ phân tầng).
   * Thương lái gửi yêu cầu đàm phán giá (RFQ) $\rightarrow$ Hai bên chốt sản lượng và giá sỉ $\rightarrow$ Hệ thống tự động sinh Hợp đồng điện tử.
2. **Ký quỹ Bảo chứng 30% (Escrow Deposit):**
   * Thương lái quét mã VietQR chuyển $30\%$ tiền cọc vào tài khoản Sàn.
   * Hệ thống tự động sinh bút toán giữ hộ: `Nợ TK 112 / Có TK 3388`.
3. **Tập kết & Kiểm định tại Trạm (Hub QC & FEFO):**
   * Nông trại vận chuyển nông sản đến Trạm trung chuyển của Sàn.
   * Chuyên viên QC kiểm tra độ tươi, độ Brix, tỷ lệ dập nát; dán nhãn Batch ID và xếp vào buồng bảo quản lạnh.
   * Thuật toán **FEFO (First Expired, First Out)** tự động xếp thứ tự ưu tiên: lô cận hạn xuất bến trước.
4. **Giám sát Chuỗi lạnh IoT & Điều phối Xe (IoT & TMS):**
   * Trong suốt thời gian lưu buồng lạnh và vận chuyển bằng xe lạnh, cảm biến IoT truyền dữ liệu nhiệt độ/độ ẩm liên tục.
   * Nếu nhiệt độ buồng/thùng xe vượt ngưỡng quy định ($> 6^\circ\text{C}$), hệ thống kích hoạt chuông báo động đỏ.
   * Trường hợp nông sản hư hỏng do lỗi hệ thống làm lạnh của Sàn: Tự động lập Biên bản sự cố & đền bù cho đối tác.
5. **Giao hàng & Ký nhận Điện tử (ePOD):**
   * Xe lạnh giao hàng tận kho/điểm nhận của Thương lái.
   * Thương lái kiểm đếm khối lượng thực nhận, ký xác nhận ePOD trên ứng dụng và quét VietQR thanh toán $70\%$ còn lại (đã cấn trừ hàng hỏng nếu có).
6. **Quyết toán Hợp đồng & Hạch toán VAS:**
   * Hệ thống tự động khấu trừ Phí hoa hồng sàn ($3\%$) + Cước vận chuyển lạnh.
   * Xuất **Hóa đơn GTGT Dịch vụ** của Sàn (`TK 5113, TK 3331`).
   * Xuất **Bảng kê 01/TNDN** (hoặc Hóa đơn KCT) cho lô hàng.
   * Giải ngân tự động số tiền còn lại về tài khoản ngân hàng của Nông trại.

---

## 3. THIẾT KẾ CƠ SỞ DỮ LIỆU CHUẨN HÓA (10 BẢNG CORE)

Tập lệnh SQL tạo cấu trúc 10 bảng cốt lõi (Khởi tạo sẵn trong cơ sở dữ liệu):

```sql
-- 1. NGƯỜI DÙNG & ĐỐI TÁC
CREATE TABLE users (
    id BIGSERIAL PRIMARY KEY,
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(30) NOT NULL, -- FARMER, BUYER, WAREHOUSE_QC, DRIVER, ACCOUNTANT, ADMIN
    company_name VARCHAR(150),
    tax_code VARCHAR(50),
    is_household_farmer BOOLEAN DEFAULT TRUE, -- True: Hộ nông dân (Bảng kê 01/TNDN), False: HTX/DN (Hóa đơn KCT)
    phone VARCHAR(20),
    address TEXT,
    bank_account_no VARCHAR(50),
    bank_name VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. LÔ NÔNG SẢN CHÀO BÁN (DO NÔNG TRẠI ĐĂNG)
CREATE TABLE harvest_lots (
    id BIGSERIAL PRIMARY KEY,
    lot_code VARCHAR(50) UNIQUE NOT NULL, -- VD: LOT-LD-2026-001
    farmer_id BIGINT REFERENCES users(id),
    product_name VARCHAR(100) NOT NULL,
    category VARCHAR(50) NOT NULL, -- RAU_AN_LA, CU_QUA, TRAI_CAY
    puc_code VARCHAR(50) NOT NULL, -- Mã số vùng trồng
    certification VARCHAR(50) DEFAULT 'VietGAP',
    harvest_date DATE NOT NULL,
    expiry_date DATE NOT NULL, -- Dùng tính FEFO
    total_weight_kg NUMERIC(12,2) NOT NULL,
    available_weight_kg NUMERIC(12,2) NOT NULL,
    base_price_per_kg NUMERIC(12,2) NOT NULL,
    tier_pricing_json JSONB, -- [{"min_kg": 500, "price": 15000}, {"min_kg": 2000, "price": 13500}]
    req_temp_min NUMERIC(4,1) DEFAULT 2.0,
    req_temp_max NUMERIC(4,1) DEFAULT 6.0,
    status VARCHAR(30) DEFAULT 'OPEN', -- OPEN, NEGOTIATING, SOLD_OUT
    image_url TEXT
);

-- 3. ĐÀM PHÁN RFQ & HỢP ĐỒNG B2B KÝ QUỸ
CREATE TABLE b2b_contracts (
    id BIGSERIAL PRIMARY KEY,
    contract_code VARCHAR(50) UNIQUE NOT NULL, -- HD-2026-0001
    lot_id BIGINT REFERENCES harvest_lots(id),
    farmer_id BIGINT REFERENCES users(id),
    buyer_id BIGINT REFERENCES users(id),
    offered_weight_kg NUMERIC(12,2) NOT NULL,
    offered_price_per_kg NUMERIC(12,2) NOT NULL,
    total_goods_amount NUMERIC(15,2) NOT NULL, -- Tổng giá trị lô nông sản
    deposit_30_amount NUMERIC(15,2) NOT NULL,  -- Cọc 30%
    platform_fee_rate NUMERIC(5,2) DEFAULT 3.0, -- Phí sàn 3%
    platform_fee_amount NUMERIC(15,2) NOT NULL,
    logistics_fee_amount NUMERIC(15,2) NOT NULL, -- Cước xe lạnh & Lưu trạm
    agri_tax_type VARCHAR(20) DEFAULT 'NON_TAX_01TNDN', -- NON_TAX_01TNDN, KCT, VAT_5
    delivery_address TEXT,
    status VARCHAR(30) DEFAULT 'RFQ_SENT', 
    -- RFQ_SENT -> AGREED -> DEPOSIT_PAID -> AT_HUB_QC -> IN_TRANSIT -> DELIVERED -> SETTLED
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. BUỒNG LẠNH TẠI TRẠM TRUNG CHUYỂN & XE TẢI LẠNH
CREATE TABLE cold_assets (
    id BIGSERIAL PRIMARY KEY,
    asset_code VARCHAR(50) UNIQUE NOT NULL, -- ROOM-A1, TRUCK-49C-12345
    asset_type VARCHAR(30) NOT NULL, -- COLD_ROOM, REFRIGERATED_TRUCK
    asset_name VARCHAR(100) NOT NULL,
    capacity_kg NUMERIC(12,2) NOT NULL,
    current_temp NUMERIC(4,2) DEFAULT 4.0,
    current_humidity NUMERIC(4,2) DEFAULT 85.0,
    target_temp_min NUMERIC(4,1) DEFAULT 2.0,
    target_temp_max NUMERIC(4,1) DEFAULT 6.0,
    driver_id BIGINT REFERENCES users(id), -- Null nếu là COLD_ROOM
    status VARCHAR(20) DEFAULT 'NORMAL' -- NORMAL, TEMP_WARNING, MAINTENANCE
);

-- 5. KIỂM ĐỊNH QC TẠI TRẠM & LƯU KHO TẠM (CROSS-DOCKING WMS)
CREATE TABLE hub_inspections (
    id BIGSERIAL PRIMARY KEY,
    inspection_code VARCHAR(50) UNIQUE NOT NULL,
    contract_id BIGINT REFERENCES b2b_contracts(id),
    cold_room_id BIGINT REFERENCES cold_assets(id),
    received_weight_kg NUMERIC(12,2) NOT NULL,
    qualified_weight_kg NUMERIC(12,2) NOT NULL, -- Khối lượng đạt chuẩn
    rejected_weight_kg NUMERIC(12,2) DEFAULT 0, -- Hàng loại trả lại nhà vườn
    brix_degree NUMERIC(4,1),
    moisture_pct NUMERIC(4,1),
    fefo_priority_score INT, -- Số ngày còn lại trước hạn sử dụng
    qc_staff_id BIGINT REFERENCES users(id),
    qc_note TEXT,
    inspected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 6. ĐIỀU PHỐI CHUYẾN XE LẠNH & GIAO NHẬN ePOD (TMS)
CREATE TABLE shipments (
    id BIGSERIAL PRIMARY KEY,
    shipment_code VARCHAR(50) UNIQUE NOT NULL, -- SHP-2026-001
    contract_id BIGINT REFERENCES b2b_contracts(id),
    truck_id BIGINT REFERENCES cold_assets(id),
    driver_id BIGINT REFERENCES users(id),
    loaded_weight_kg NUMERIC(12,2) NOT NULL,
    delivered_weight_kg NUMERIC(12,2), -- Khối lượng Thương lái thực nhận
    natural_shrinkage_kg NUMERIC(10,2) DEFAULT 0, -- Hao hụt bay hơi tự nhiên
    damaged_weight_kg NUMERIC(10,2) DEFAULT 0, -- Hư hỏng phát hiện lúc giao
    epod_signature_name VARCHAR(100),
    epod_photo_url TEXT,
    departed_at TIMESTAMP,
    delivered_at TIMESTAMP,
    status VARCHAR(30) DEFAULT 'SCHEDULED' -- SCHEDULED, LOADING, IN_TRANSIT, DELIVERED
);

-- 7. NHẬT KÝ CẢM BIẾN IOT (BUỒNG LẠNH & XE LẠNH)
CREATE TABLE iot_sensor_logs (
    id BIGSERIAL PRIMARY KEY,
    asset_id BIGINT REFERENCES cold_assets(id),
    contract_id BIGINT REFERENCES b2b_contracts(id),
    temperature NUMERIC(4,2) NOT NULL,
    humidity NUMERIC(4,2) NOT NULL,
    ethylene_ppm NUMERIC(6,2) DEFAULT 0.05,
    is_alert BOOLEAN DEFAULT FALSE,
    alert_message VARCHAR(255),
    recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 8. BIÊN BẢN HƯ HỎNG & ĐỀN BÙ CHUỖI LẠNH (SPOILAGE CLAIMS)
CREATE TABLE spoilage_claims (
    id BIGSERIAL PRIMARY KEY,
    claim_code VARCHAR(50) UNIQUE NOT NULL,
    contract_id BIGINT REFERENCES b2b_contracts(id),
    damaged_weight_kg NUMERIC(10,2) NOT NULL,
    cause VARCHAR(100) NOT NULL, -- COOLING_FAILURE (Lỗi Sàn), FARM_QUALITY (Lỗi Nông trại)
    liable_party VARCHAR(30) NOT NULL, -- PLATFORM, FARMER
    compensation_amount NUMERIC(15,2) NOT NULL, -- Số tiền đền bù/khấu trừ
    evidence_image_url TEXT,
    status VARCHAR(20) DEFAULT 'APPROVED',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 9. SỔ NHẬT KÝ CHUNG & ĐỊNH KHOẢN KÉP (VAS ACCOUNTING)
CREATE TABLE gl_journal_entries (
    id BIGSERIAL PRIMARY KEY,
    voucher_no VARCHAR(50) UNIQUE NOT NULL, -- PT-001, PKT-001, PC-001
    contract_id BIGINT REFERENCES b2b_contracts(id),
    voucher_date DATE DEFAULT CURRENT_DATE,
    transaction_type VARCHAR(50) NOT NULL, -- ESCROW_DEPOSIT_30, ESCROW_FINAL_70, SPOILAGE_CLAIM, SETTLEMENT
    description TEXT NOT NULL,
    total_amount NUMERIC(15,2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE gl_journal_lines (
    id BIGSERIAL PRIMARY KEY,
    journal_id BIGINT REFERENCES gl_journal_entries(id) ON DELETE CASCADE,
    account_number VARCHAR(20) NOT NULL, -- 112, 3388, 5113, 3331, 1381, 811
    account_name VARCHAR(100) NOT NULL,
    debit_amount NUMERIC(15,2) DEFAULT 0,
    credit_amount NUMERIC(15,2) DEFAULT 0,
    partner_id BIGINT REFERENCES users(id),
    line_note VARCHAR(255)
);

-- 10. DỰ BÁO AI & RỦI RO HƯ HỎNG (AI ANALYTICS)
CREATE TABLE ai_forecasts (
    id BIGSERIAL PRIMARY KEY,
    product_name VARCHAR(100) NOT NULL,
    forecast_date DATE NOT NULL,
    predicted_demand_kg NUMERIC(12,2) NOT NULL,
    suggested_price_kg NUMERIC(12,2) NOT NULL,
    confidence_lower NUMERIC(12,2),
    confidence_upper NUMERIC(12,2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## 4. MA TRẬN TỰ ĐỘNG ĐỊNH KHOẢN KẾ TOÁN (VAS RULE ENGINE)

Để hệ thống Kế toán VAS vận hành tự động $100\%$, Backend chỉ cần kích hoạt hàm `autoPostJournal(eventType, contract)` theo 4 sự kiện chuẩn:

| STT | Sự kiện trên Hệ thống | Chứng từ sinh tự động | Định khoản Nợ (Debit) | Định khoản Có (Credit) | Công thức tính số tiền |
|:---:|:---|:---|:---|:---|:---|
| **1** | Thương lái quét VietQR nộp cọc $30\%$ | Phiếu thu (`PT-xxx`) | **TK 112** (Tiền gửi Ngân hàng) | **TK 3388** (Phải trả hộ Escrow - Thương lái) | `deposit_30_amount` ($30\%$ giá trị hợp đồng) |
| **2** | Sự cố máy lạnh làm hỏng hàng (Lỗi Sàn) | Phiếu kế toán (`PKT-xxx`) | **TK 811** (Chi phí khác - Bồi thường sự cố) | **TK 3388** (Bù đắp vào quỹ trả Nông trại) | `compensation_amount` (Khối lượng hỏng $\times$ Giá sỉ) |
| **3** | Thương lái ký ePOD & thanh toán nốt $70\%$ | Phiếu thu (`PT-xxx`) | **TK 112** (Tiền gửi Ngân hàng) | **TK 3388** (Tiền thu hộ chờ giải ngân) | `Tiền hàng thực nhận - Tiền cọc 30%` |
| **4** | Quyết toán hợp đồng & Giải ngân Nông trại | Phiếu kế toán & Ủy nhiệm chi (`UNC-xxx`) | **TK 3388** (Toàn bộ tiền giữ hộ của hợp đồng) | • **TK 5113** (Doanh thu phí Sàn + Cước xe)<br>• **TK 3331** (Thuế GTGT dịch vụ $8\%$ hoặc $10\%$)<br>• **TK 112** (Tiền giải ngân về tài khoản HTX) | `Thực trả Nông trại = Tiền hàng thực nhận - Phí Sàn - Cước xe` |

---

## 5. PHÂN CÔNG CHI TIẾT 5 THÀNH VIÊN (CHẠY SONG SONG)

| Thành viên | Vai trò & Phân hệ phụ trách | Các màn hình (UI) & API cần hoàn thành |
|:---|:---|:---|
| **Thành viên 1** *(Team Lead)* | **Khung hệ thống & Phân hệ 1:** Sàn B2B, RFQ & Ký quỹ Escrow | • Setup Repository, Database PostgreSQL, cấu hình Auth JWT & Role Switcher.<br>• **UI Nông trại:** Form đăng Lô nông sản (Mã PUC, VietGAP, Giá sỉ phân tầng).<br>• **UI Thương lái:** Danh mục lô sỉ, Modal gửi RFQ đàm phán giá, Ký Hợp đồng số.<br>• **UI Thanh toán:** Tích hợp mã VietQR động nộp cọc $30\%$ & thanh toán $70\%$. |
| **Thành viên 2** | **Phân hệ 2:** Trạm Kiểm định QC & Xếp kho FEFO | • **UI Trạm Trung chuyển:** Danh sách lô cập trạm, Form nghiệm thu QC (độ ngọt Brix, độ ẩm, khối lượng đạt/loại).<br>• **UI Quản lý Buồng lạnh:** Sơ đồ buồng lạnh (`cold_assets`), thao tác xếp dỡ lô nông sản.<br>• **Thuật toán FEFO:** Tự động tính hạn sử dụng và đánh dấu các lô cần bốc lên xe trước. |
| **Thành viên 3** | **Phân hệ 3:** Giám sát IoT Chuỗi Lạnh, TMS & Sự cố | • **UI Điều phối Xe lạnh & ePOD:** Lập chuyến xe, cập nhật lộ trình GPS, màn hình Tài xế/Thương lái ký nhận ePOD.<br>• **Dashboard IoT Real-time:** Biểu đồ nhiệt độ/độ ẩm buồng lạnh & thùng xe tải lạnh.<br>• **IoT Simulator (Wokwi / Web):** Nút giả lập sự cố (tăng vọt lên $15^\circ\text{C}$), kích hoạt chuông cảnh báo.<br>• **UI Biên bản Hư hỏng:** Lập phiếu sự cố chuỗi lạnh & yêu cầu đền bù (`spoilage_claims`). |
| **Thành viên 4** | **Phân hệ 4:** Kế toán VAS Trung gian & Thuế Nông sản | • **Accounting Rule Engine:** Lập trình hàm sinh bút toán tự động (`gl_journal_entries`, `gl_journal_lines`) theo 4 sự kiện VAS.<br>• **UI Sổ Nhật ký chung & Quyết toán:** Bảng hạch toán minh bạch (Tổng thu - Phí sàn - Cước xe - Đền bù = Giải ngân).<br>• **UI Xuất Chứng từ Thuế (In / PDF):** Biểu mẫu Bảng kê 01/TNDN (hộ nông dân), Hóa đơn KCT (HTX), Hóa đơn GTGT dịch vụ sàn. |
| **Thành viên 5** | **Phân hệ 5:** AI Dự Báo, Rủi Ro Hư Hỏng & BI Dashboard | • **Thuật toán Spoilage Risk Score:** Tính tỷ lệ $\%$ rủi ro hỏng của lô dựa trên ngày lưu kho và số lần IoT vượt ngưỡng.<br>• **AI Demand & Price Forecast:** Bộ dữ liệu mẫu 6 tháng, chạy dự báo nhu cầu & giá sỉ 14 ngày tới (vẽ biểu đồ Recharts).<br>• **Executive Dashboard:** Thống kê tổng GMV sàn, Doanh thu phí dịch vụ, Tỷ lệ hao hụt chuỗi lạnh. |

---

## 6. LỊCH TRÌNH 4 TUẦN CHI TIẾT (SPRINT PLAN)

### Tuần 1: Khởi Tạo Nền Tảng, Database & Mock Data (Ngày 1 – 7)
* **Ngày 1 - 2:** Team Lead khởi tạo cấu trúc Next.js + Spring Boot, chạy script tạo 10 bảng PostgreSQL. Cấu hình thanh Navigation Bar có công cụ **"Quick Role Switcher"** (Chuyển đổi tức thì giữa 5 vai trò để phục vụ demo mượt mà).
* **Ngày 3 - 4:** Thành viên 5 chạy script sinh dữ liệu mẫu hoàn chỉnh: 10 Nông trại Đà Lạt, 10 Thương lái, 20 Lô nông sản, 4 Buồng lạnh, 5 Xe tải lạnh, 500 bản ghi cảm biến IoT, dữ liệu giá lịch sử 6 tháng.
* **Ngày 5 - 7:** Cả 5 thành viên hoàn thành dựng giao diện tĩnh (UI Mockup) cho tất cả các màn hình phụ trách.

### Tuần 2: Xây Dựng Luồng Nghiệp Vụ Lõi (Ngày 8 – 14)
* **Thành viên 1:** Hoàn thiện luồng Đăng lô $\rightarrow$ Đàm phán RFQ $\rightarrow$ Sinh Hợp đồng $\rightarrow$ Quét VietQR cọc $30\%$.
* **Thành viên 2:** Hoàn thiện luồng Nhập trạm kiểm định QC $\rightarrow$ Phân loại hàng $\rightarrow$ Lưu buồng lạnh & Danh sách FEFO.
* **Thành viên 3:** Hoàn thiện luồng Tạo chuyến xe lạnh $\rightarrow$ Bốc dỡ hàng $\rightarrow$ Ký nhận bàn giao ePOD.
* **Thành viên 4 & 5:** Xây dựng các API tính toán hạch toán kế toán và thuật toán dự báo AI độc lập.

### Tuần 3: Tích Hợp "Vũ Khí Ăn Điểm" – IoT, Auto-VAS & AI (Ngày 15 – 21)
* **Ghép nối IoT & AI:** Thành viên 3 kết nối IoT Simulator bắn dữ liệu nhiệt độ. Khi bấm nút **"Giả lập hỏng máy lạnh ($14^\circ\text{C}$)"** $\rightarrow$ Hệ thống kích hoạt chuông cảnh báo đỏ + Điểm rủi ro hư hỏng (Thành viên 5) nhảy vọt từ $8\%$ lên $65\%$ $\rightarrow$ Bấm nút sinh Biên bản đền bù sự cố.
* **Ghép nối Auto-Accounting VAS:** Thành viên 4 liên kết logic tự động định khoản vào các nút: Xác nhận cọc $30\%$, Duyệt biên bản sự cố và Quyết toán hợp đồng.
* **Hoàn thiện xuất chứng từ:** Hoàn tất mẫu in Bảng kê 01/TNDN và Hóa đơn GTGT điện tử chuẩn quy định Việt Nam.

### Tuần 4: Kiểm Thử Kịch Bản Demo, Đóng Gói & Báo Cáo (Ngày 22 – 28)
* **Ngày 22 - 24:** Chạy thử nghiệm toàn trình (End-to-End Test) từ Bước 1 đến Bước 6. Kiểm tra số liệu kế toán làm tròn chính xác từng đồng.
* **Ngày 25 - 26:** Hoàn tất báo cáo đồ án (Sơ đồ Use Case, Kiến trúc hệ thống, ERD 10 bảng, Sequence Diagram Ký quỹ & Chuỗi lạnh).
* **Ngày 27 - 28:** Tập dượt thuyết trình theo **Kịch bản Demo 10 phút**: Mỗi thành viên trình bày 2 phút trực tiếp trên luồng giao dịch thật của **1 hợp đồng mua 2 tấn Cà chua Beef Đà Lạt**.

---

## 7. HƯỚNG DẪN CÀI ĐẶT & KHỞI CHẠY NHANH

### Yêu cầu môi trường:
* Node.js $\ge 18.x$
* Java JDK $\ge 21$
* PostgreSQL $\ge 15.x$ (hoặc Docker)

### 1. Khởi chạy Database qua Docker
Tại thư mục gốc dự án:
```powershell
docker compose up -d postgres
```

### 2. Khởi chạy Backend (Spring Boot)
Tại thư mục `backend`:
```powershell
cd backend
.\gradlew.bat bootRun
```
* Backend API hoạt động tại: `http://localhost:8080`
* Tài liệu Swagger UI: `http://localhost:8080/swagger-ui.html`

### 3. Khởi chạy Frontend (Next.js)
Tại thư mục `frontend`:
```powershell
cd frontend
npm install
npm run dev
```
* Ứng dụng Web hoạt động tại: `http://localhost:3000`

---
*Dự án thuộc đề tài Đồ án môn học / Khóa luận tốt nghiệp chuyên ngành Hệ thống Thông tin & Công nghệ Phần mềm.*
