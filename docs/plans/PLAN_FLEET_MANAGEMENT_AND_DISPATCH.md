# KẾ HOẠCH TRIỂN KHAI: HỆ THỐNG QUẢN LÝ ĐỘI XE VÀ TỰ ĐỘNG ĐIỀU PHỐI LẤY HÀNG THEO KHO – HONA FRESH

> **TÀI LIỆU DỰ ÁN:** HONA FRESH – NỀN TẢNG B2B NÔNG SẢN SỈ  
> **TÊN TÀI LIỆU:** Fleet Management & Automated Inbound Dispatch Optimization  
> **PHIÊN BẢN:** 1.2 (Hoàn thiện xác minh Database, An toàn dữ liệu, Quản lý vòng đời chuyến và Phân quyền Backend)  
> **NGÀY LẬP:** 18/11/2026  
> **TRẠNG THÁI:** CHỜ PHÊ DUYỆT (PENDING REVIEW)

---

## A. OVERVIEW (TỔNG QUAN)

### 1. Mục tiêu nghiệp vụ
Xây dựng hệ thống quản lý phương tiện và tài xế theo mô hình **mỗi kho hàng một đội vận tải riêng**, đồng thời phát triển **thuật toán tự động tối ưu hóa điều phối lấy hàng** (Inbound Dispatch) dựa trên:
- Vị trí địa lý rẫy/vườn (phân nhóm theo vùng/tuyến đường liền kề).
- **Backend tự tính toán kiểm soát kép**: Tải trọng tối đa (kg) và Thể tích thùng xe ($m^3$) dựa trên dữ liệu hợp đồng lưu trong Database, không tin cậy thông số tính từ Client.
- Phương tiện chuyên dụng duy trì dải nhiệt độ $2^\circ\text{C} - 6^\circ\text{C}$.
- Ma trận phân hạng giấy phép lái xe linh hoạt, hỗ trợ cả hệ thống GPLX hiện hành (Luật 2024 có hiệu lực 2025: Hạng B, C1, C, CE) và giấy phép cấp trước 2025 (Hạng B2, C, FC).
- Kiểm soát đầu vào chặt chẽ: **Chỉ những lô hàng đã xác nhận hoàn tất đóng gói (`packaging_approved = true` và chưa được điều phối `pickup_truck_plate IS NULL`) mới được đưa vào hàng chờ điều phối.**
- Phân tách rõ ràng giữa **Tạo phương án đề xuất tạm thời (In-memory, không ghi DB)** và **Xác nhận phân công chính thức (Database Transaction có Pessimistic Lock)**.
- Quản lý trọn vẹn vòng đời chuyến, bao gồm **Quy trình hủy chuyến (Cancel Trip)** giải phóng phương tiện, tài xế và trả lô hàng về hàng chờ an toàn.

### 2. Đối tượng sử dụng
1. **Điều phối viên kho (Dispatch Coordinator / Admin / Warehouse Manager)**:
   - Quản lý đội xe và danh sách tài xế trực thuộc kho của mình.
   - Theo dõi danh sách lô hàng chờ lấy hàng tại các rẫy trong vùng phụ trách của kho.
   - Kích hoạt tính năng **"Tự Động Điều Phối"** để thuật toán đề xuất phương án ghép chuyến tối ưu.
   - Tinh chỉnh phương án (đổi xe, đổi tài xế, xem danh sách lô chưa thể điều phối kèm lý do cụ thể) và bấm **"Xác Nhận Điều Phối"**.
   - Hủy chuyến khi có sự cố phát sinh (xe hỏng, thời tiết, nhà vườn dời ngày).
2. **Tài xế xe lạnh (Driver)**:
   - Tiếp nhận thông tin chuyến lấy hàng đa điểm (Multi-stop Inbound Route).
   - Xem thứ tự các điểm lấy hàng, SĐT người đón xe, thông số kỹ thuật rẫy.
   - Cập nhật tiến độ hành trình (Xuất phát $\rightarrow$ Đã đến rẫy $\rightarrow$ Đã lấy hàng $\rightarrow$ Hoàn tất về kho).
3. **Nhà vườn / Nông dân (Farmer)**:
   - Theo dõi xe tải lạnh đang trên đường tới rẫy lấy hàng, biết trước biển số xe, tên tài xế, SĐT liên hệ và nhiệt độ thùng lạnh.

---

## B. CƠ SỞ DỮ LIỆU & XÁC MINH KIẾN TRÚC HIỆN TẠI (DATABASE VERIFICATION)

### 1. Kết quả đối chiếu cấu trúc hiện tại
Qua rà soát chi tiết mã nguồn Backend và các bản Flyway Migration:
- **Bảng `b2b_contracts`**:
  - Khi Admin duyệt đóng gói: Backend chạy câu lệnh cập nhật thực tế:  
    `SET packaging_approved=true, packaging_approved_at=NOW(), fulfillment_status='PACKAGING_APPROVED', status='PACKAGING_APPROVED'`.
  - Các cột lưu phương tiện đón xe: `pickup_truck_plate`, `pickup_driver_name`, `pickup_driver_phone`.
  - Cột địa chỉ vườn và trạm: `farm_pickup_address`, `hub_name` (VARCHAR).
- **Bảng `cold_assets`**: Đã lưu tài sản buồng lạnh và xe lạnh rời rạc, nhưng chưa có quan hệ ràng buộc theo từng kho tiếp nhận.
- **Bảng `buyer_warehouses`**: Đây là kho nhận hàng của riêng Thương Lái (Buyer), không phải kho tiếp nhận/gom hàng của sàn HoNa Fresh.

### 2. Thống nhất mô hình Kho Hàng (Warehouse Hubs)
Hệ thống tạo bảng danh mục chính thức **`warehouse_hubs`** đại diện cho các Trạm trung chuyển tiếp nhận nông sản của sàn HoNa Fresh.
Khởi tạo seed dữ liệu cho **5 Hub trọng điểm thực tế** tương ứng với các vùng nguyên liệu và trạm trung chuyển đã có trong hệ thống:
1. `HUB-DUC-TRONG`: **Trạm Trung Chuyển Đức Trọng** (Lâm Đồng - Vùng nguyên liệu rau quả Tây Nguyên).
2. `HUB-CU-CHI`: **Tổng Kho Chuỗi Lạnh Củ Chi** (TP. Hồ Chí Minh - Trạm gom Đông Nam Bộ).
3. `HUB-CAI-BE`: **Trạm Trung Chuyển Cái Bè** (Tiền Giang - Trạm gom ĐBSCL).
4. `HUB-HA-NOI`: **Kho Logistics Nông Sản Miền Bắc** (Hà Nội - Trạm gom Bắc Bộ).
5. `HUB-BUON-HO`: **Kho Nông Sản Buôn Hồ** (Đắk Lắk - Trạm gom Tây Nguyên).

**Tương thích dữ liệu hiện có**:
- Cột `hub_code` và `short_name` được map tương thích với chuỗi `hub_name` hiện có trong `b2b_contracts` và `harvest_lots`.
- Sử dụng mệnh đề `ON CONFLICT (hub_code) DO NOTHING` để không bao giờ tạo dữ liệu trùng lặp khi chạy lại migration hoặc seed.

---

## C. SCHEMA DATABASE & QUẢN LÝ VÒNG ĐỜI CHUYẾN (V25 MIGRATION)

### 1. Cấu trúc bảng (Migration SQL)

```sql
-- 1. Bảng Danh mục Kho hàng / Trạm trung chuyển chính thức của HoNa Fresh
CREATE TABLE IF NOT EXISTS warehouse_hubs (
    id BIGSERIAL PRIMARY KEY,
    hub_code VARCHAR(50) UNIQUE NOT NULL,
    hub_name VARCHAR(150) NOT NULL,
    short_name VARCHAR(100) NOT NULL,
    address TEXT NOT NULL,
    province VARCHAR(100) NOT NULL,
    region VARCHAR(50) NOT NULL, -- TAY_NGUYEN, DONG_NAM_BO, DONG_BANG_SONG_CUU_LONG, MIEN_BAC
    latitude NUMERIC(10, 6),
    longitude NUMERIC(10, 6),
    coverage_keywords TEXT, -- Chuỗi từ khóa để tự động khớp rẫy
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 2. Bảng Phương tiện vận tải trực thuộc Kho (Fleet Vehicles)
CREATE TABLE IF NOT EXISTS fleet_vehicles (
    id BIGSERIAL PRIMARY KEY,
    vehicle_code VARCHAR(50) UNIQUE NOT NULL,
    plate_number VARCHAR(30) UNIQUE NOT NULL,
    vehicle_type VARCHAR(50) NOT NULL, -- REFRIGERATED_VAN_2_5T, TRUCK_5T, TRUCK_8T, TRUCK_15T
    capacity_kg NUMERIC(12, 2) NOT NULL CHECK(capacity_kg > 0),
    volume_m3 NUMERIC(8, 2) NOT NULL CHECK(volume_m3 > 0),
    min_temp NUMERIC(5, 2) DEFAULT 2.0,
    max_temp NUMERIC(5, 2) DEFAULT 6.0,
    current_temp NUMERIC(5, 2) DEFAULT 3.8,
    warehouse_id BIGINT NOT NULL REFERENCES warehouse_hubs(id),
    status VARCHAR(30) NOT NULL DEFAULT 'AVAILABLE', -- AVAILABLE, ASSIGNED, ON_TRIP, MAINTENANCE
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 3. Bảng Tài xế chuyên trách trực thuộc Kho (Fleet Drivers)
CREATE TABLE IF NOT EXISTS fleet_drivers (
    id BIGSERIAL PRIMARY KEY,
    driver_code VARCHAR(50) UNIQUE NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    phone VARCHAR(20) UNIQUE NOT NULL,
    license_number VARCHAR(50) NOT NULL,
    license_class VARCHAR(10) NOT NULL, -- B2, C1, C, FC, CE...
    warehouse_id BIGINT NOT NULL REFERENCES warehouse_hubs(id),
    user_id BIGINT REFERENCES users(id),
    status VARCHAR(30) NOT NULL DEFAULT 'AVAILABLE', -- AVAILABLE, ASSIGNED, ON_TRIP, OFF_DUTY
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 4. Bảng Chuyến xe lấy hàng đa điểm (Pickup Trips)
CREATE TABLE IF NOT EXISTS pickup_trips (
    id BIGSERIAL PRIMARY KEY,
    trip_code VARCHAR(60) UNIQUE NOT NULL,
    warehouse_id BIGINT NOT NULL REFERENCES warehouse_hubs(id),
    vehicle_id BIGINT NOT NULL REFERENCES fleet_vehicles(id),
    driver_id BIGINT NOT NULL REFERENCES fleet_drivers(id),
    total_weight_kg NUMERIC(12, 2) NOT NULL DEFAULT 0,
    total_volume_m3 NUMERIC(8, 2) NOT NULL DEFAULT 0,
    total_packages INTEGER NOT NULL DEFAULT 0,
    departure_time TIMESTAMPTZ,
    completed_time TIMESTAMPTZ,
    cancelled_at TIMESTAMPTZ,
    cancel_reason TEXT,
    status VARCHAR(30) NOT NULL DEFAULT 'ASSIGNED', -- ASSIGNED (Đã phân công), ON_TRIP (Đang chạy), COMPLETED (Hoàn tất), CANCELLED (Đã hủy)
    notes TEXT,
    created_by BIGINT REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 5. Bảng Điểm dừng lấy hàng từng Hợp đồng trong chuyến (Pickup Trip Stops)
CREATE TABLE IF NOT EXISTS pickup_trip_stops (
    id BIGSERIAL PRIMARY KEY,
    trip_id BIGINT NOT NULL REFERENCES pickup_trips(id) ON DELETE CASCADE,
    contract_id BIGINT NOT NULL REFERENCES b2b_contracts(id),
    stop_order INTEGER NOT NULL,
    farm_pickup_address TEXT NOT NULL,
    contact_phone VARCHAR(30),
    weight_kg NUMERIC(12, 2) NOT NULL,
    volume_m3 NUMERIC(8, 2) NOT NULL,
    package_count INTEGER NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'PENDING', -- PENDING, ARRIVED, LOADED, CANCELLED, ISSUE_REPORTED
    issue_note TEXT,
    arrived_at TIMESTAMPTZ,
    loaded_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- RÀNG BUỘC CHỐNG ĐIỀU PHỐI TRÙNG:
-- Một hợp đồng chỉ được nằm trong duy nhất 1 điểm dừng đang hoạt động (PENDING hoặc ARRIVED).
-- Khi điểm dừng bị CANCELLED hoặc LOADED, index này tự động giải phóng, cho phép điều phối lại nếu cần!
CREATE UNIQUE INDEX IF NOT EXISTS uq_active_contract_pickup 
ON pickup_trip_stops (contract_id) 
WHERE status IN ('PENDING', 'ARRIVED');
```

### 2. Quản lý vòng đời chuyến và Xử lý Hủy chuyến (Trip Cancellation Flow)

```
[Khởi tạo đề xuất (In-memory)]
           │ (Điều phối viên duyệt)
           ▼
[ASSIGNED: Xe/Tài xế ASSIGNED, Hợp đồng PICKUP_DISPATCHED]
     │                                │ (Sự cố / Hủy chuyến)
     │ (Tài xế bấm Xuất bến)          ▼
     │                         [CANCELLED]
     │                         - Xe & Tài xế -> AVAILABLE
     │                         - Điểm dừng -> CANCELLED (Giải phóng Index)
     │                         - Hợp đồng -> Xóa plate/driver, trả về hàng chờ
     ▼
[ON_TRIP: Xe/Tài xế ON_TRIP, lấy hàng qua từng rẫy]
     │
     ▼ (Hoàn tất về kho)
[COMPLETED: Xe/Tài xế -> AVAILABLE, Điểm dừng -> LOADED]
```

**Quy trình hủy chuyến an toàn (`POST /api/admin/dispatch/trips/{id}/cancel`)**:
1. Kiểm tra trạng thái chuyến phải là `ASSIGNED` hoặc `ON_TRIP` (chưa hoàn tất).
2. Cập nhật `pickup_trips.status = 'CANCELLED'`.
3. Cập nhật toàn bộ các điểm dừng chưa lấy hàng sang `pickup_trip_stops.status = 'CANCELLED'`.
4. Trả trạng thái xe (`fleet_vehicles`) và tài xế (`fleet_drivers`) về `AVAILABLE`.
5. Cập nhật các hợp đồng trong chuyến:  
   `SET pickup_truck_plate = NULL, pickup_driver_name = NULL, pickup_driver_phone = NULL, status = 'PACKAGING_APPROVED', fulfillment_status = 'PACKAGING_APPROVED'`.  
   $\rightarrow$ Lô hàng tự động xuất hiện trở lại trên danh sách chờ điều phối của kho.

---

## D. ĐIỀU KIỆN LỌC ĐẦU VÀO VÀ BACKEND TỰ TÍNH TẢI TRỌNG (ZERO-TRUST CLIENT)

### 1. Điều kiện chính xác để lô hàng vào hàng chờ điều phối
Dựa trên đối chiếu schema thực tế tại Backend, câu truy vấn lấy danh sách hợp đồng chờ điều phối của một kho:
```sql
SELECT c.*, l.product_name, l.lot_code, u.company_name AS buyer_name, f.company_name AS farmer_name
FROM b2b_contracts c
JOIN harvest_lots l ON l.id = c.lot_id
JOIN users u ON u.id = c.buyer_id
LEFT JOIN users f ON f.id = c.farmer_id
WHERE c.packaging_approved = TRUE
  AND c.pickup_truck_plate IS NULL
  AND (c.status = 'PACKAGING_APPROVED' OR c.fulfillment_status = 'PACKAGING_APPROVED')
  -- Lọc theo kho phụ trách (khớp theo hub_code hoặc từ khóa rẫy của kho)
```
- **Nguyên tắc**: Tuyệt đối không đưa lô hàng sang điều phối nếu `packaging_approved != true`. Không kiểm tra điều kiện đóng gói độc lập tại màn hình điều phối.

### 2. Backend tự tính lại Tải trọng & Thể tích (Zero-Trust)
Khi Client gửi yêu cầu `POST /api/admin/dispatch/confirm-trip`, request **chỉ chứa danh sách ID**:
```json
{
  "warehouseId": 1,
  "vehicleId": 12,
  "driverId": 5,
  "contractIds": [101, 102],
  "stopOrders": { "101": 1, "102": 2 },
  "departureTime": "2026-11-18T06:00:00+07:00",
  "notes": "Lấy sớm ráo sương"
}
```
**Xử lý tại Backend Service**:
1. Truy vấn database lấy thông tin chính thức đã kiểm định của các hợp đồng trong `contractIds`:
   - Khối lượng $w_i = \text{COALESCE}(actual\_harvest\_weight\_kg, offered\_weight\_kg)$.
   - Thể tích kiện $v_{unit}$ theo `package_type`:
     - Thùng xốp 15kg: $0.06\,m^3$
     - Thùng xốp 20kg: $0.08\,m^3$
     - Sọt nhựa 25kg: $0.09\,m^3$
     - Mặc định: $0.07\,m^3$
   - Thể tích lô hàng $v_i = package\_count \times v_{unit}$.
2. Tính tổng:
   $$W_{total} = \sum w_i, \quad V_{total} = \sum v_i$$
3. Khóa dòng phương tiện (`SELECT ... FOR UPDATE`):
   - So sánh: Nếu $W_{total} > vehicle.capacity\_kg$ hoặc $V_{total} > vehicle.volume\_m3$: Ném `BadRequestException("Tổng tải trọng (" + W_total + "kg) hoặc thể tích (" + V_total + "m3) vượt quá sức chứa phương tiện!")`.
   - Ngăn chặn hoàn toàn việc can thiệp sửa đổi số liệu từ phía Client.

---

## E. MA TRẬN PHÂN HẠNG GIẤY PHÉP LÁI XE LINH HOẠT (CONFIGURABLE LICENSE MATRIX)

Để phù hợp với **Luật Trật tự, an toàn giao thông đường bộ 2024 (áp dụng từ 01/01/2025)** đồng thời hỗ trợ đầy đủ các giấy phép lái xe cũ cấp trước thời điểm chuyển đổi:

### Bảng Ma trận điều kiện tải trọng xe và GPLX:

| Nhóm xe | Tải trọng phương tiện ($T$) | Hạng GPLX mới (áp dụng từ 2025) | Hạng GPLX cũ (cấp trước 2025) | Hạng GPLX cao hơn được chấp thuận |
| :--- | :--- | :--- | :--- | :--- |
| **Xe tải nhỏ / Van lạnh** | $\le 3.5\text{ Tấn}$ (2.5T) | **Hạng B** | **Hạng B2** | C1, C, D, E, FC, CE |
| **Xe tải trung** | $3.5\text{ Tấn} < T \le 7.5\text{ Tấn}$ (5.0T) | **Hạng C1** | **Hạng C** | C, E, FC, CE |
| **Xe tải lớn** | $7.5\text{ Tấn} < T \le 15\text{ Tấn}$ (8.0T, 15T) | **Hạng C** | **Hạng C** | E, FC, CE |
| **Xe đầu kéo / Container** | $> 15\text{ Tấn}$ | **Hạng CE** | **Hạng FC** | - |

**Thiết kế kỹ thuật tại Backend (`DriverLicenseValidator`)**:
Triển khai dưới dạng hàm kiểm tra Rule-based có cấu hình mở:
```java
public boolean isDriverEligible(String driverLicenseClass, BigDecimal vehicleCapacityKg) {
    if (driverLicenseClass == null) return false;
    double capacityTons = vehicleCapacityKg.doubleValue() / 1000.0;
    String license = driverLicenseClass.trim().toUpperCase();

    if (capacityTons <= 3.5) {
        return Set.of("B", "B2", "C1", "C", "D", "E", "FC", "CE").contains(license);
    } else if (capacityTons <= 7.5) {
        return Set.of("C1", "C", "E", "FC", "CE").contains(license);
    } else if (capacityTons <= 15.0) {
        return Set.of("C", "E", "FC", "CE").contains(license);
    } else {
        return Set.of("FC", "CE").contains(license);
    }
}
```

---

## F. KIỂM TRA PHẠM VI QUẢN LÝ VÀ PHÂN QUYỀN BẢO MẬT (AUTHORIZATION & SCOPE)

Backend áp dụng nguyên tắc kiểm tra bảo mật nhiều lớp trước khi thực thi:

1. **Phân quyền người dùng (Role Authorization)**:
   - Thao tác điều phối yêu cầu người dùng có quyền `ROLE_ADMIN` hoặc `ROLE_DISPATCHER`.
   - Nếu là Dispatcher riêng của kho: Kiểm tra `user.assigned_warehouse_id == request.warehouseId`.
2. **Kiểm tra tính toàn vẹn phạm vi kho (Warehouse Scope Validation)**:
   - Xe được chọn (`vehicleId`) bắt buộc phải có `vehicle.warehouse_id == request.warehouseId`.
   - Tài xế được chọn (`driverId`) bắt buộc phải có `driver.warehouse_id == request.warehouseId`.
   - Toàn bộ hợp đồng trong danh sách phải thuộc phạm vi phụ trách của kho đó.
3. **Chống phân công trùng lặp (Anti-Double-Assignment)**:
   - Áp dụng `Pessimistic Write Lock` (`FOR UPDATE`) lên phương tiện và tài xế trong suốt Transaction.
   - Kiểm tra `vehicle.status == 'AVAILABLE'` và `driver.status == 'AVAILABLE'`. Nếu một trong hai đã chuyển sang `ASSIGNED` hoặc `ON_TRIP`, lập tức trả về `409 Conflict`.
   - Kiểm tra các hợp đồng phải có `pickup_truck_plate IS NULL`. Nếu hợp đồng đã được chuyến khác gán, từ chối và Rollback.

---

## G. API CONTRACT (GIAO THỨC DỮ LIỆU)

### 1. Thuật toán tự động đề xuất phương án (IN-MEMORY ONLY)
- **Endpoint**: `POST /api/admin/dispatch/auto-optimize`
- **Request**:
```json
{
  "warehouseId": 1,
  "selectedContractIds": [] // Rỗng = tự động quét toàn bộ lô chờ của kho
}
```
- **Response**:
```json
{
  "status": 200,
  "message": "Đã tính toán phương án điều phối tối ưu",
  "result": {
    "proposedTrips": [
      {
        "tempTripId": "PROPOSAL-01",
        "warehouseId": 1,
        "warehouseName": "Trạm Trung Chuyển Đức Trọng",
        "suggestedVehicle": {
          "id": 12,
          "plateNumber": "49C-678.90",
          "vehicleType": "Hino Lạnh 8.0 Tấn",
          "capacityKg": 8000,
          "volumeM3": 35.0,
          "currentTemp": 3.8
        },
        "suggestedDriver": {
          "id": 5,
          "driverCode": "TX-DT-02",
          "fullName": "Trần Quốc Bảo",
          "phone": "0982.112.233",
          "licenseClass": "C"
        },
        "totalWeightKg": 5200,
        "totalVolumeM3": 21.5,
        "weightCapacityUsagePct": 65.0,
        "volumeCapacityUsagePct": 61.4,
        "stops": [
          {
            "stopOrder": 1,
            "contractId": 101,
            "contractCode": "HD-2026-A14F",
            "productName": "Lá É Phú Yên",
            "farmerName": "HTX Nông Nghiệp Đà Lạt GAP",
            "farmPickupAddress": "Thôn Đa Quý, Xã Xuân Thọ, TP. Đà Lạt",
            "contactPhone": "0912.345.678",
            "weightKg": 150,
            "volumeM3": 0.6,
            "packageCount": 10,
            "packageType": "Thùng xốp 15kg"
          }
        ],
        "estimatedRoute": "Kho Đức Trọng → Xuân Thọ (Đà Lạt) → Về Kho Đức Trọng"
      }
    ],
    "unassignedContracts": [
      {
        "contractId": 105,
        "contractCode": "HD-2026-X99",
        "productName": "Sầu riêng Ri6",
        "weightKg": 12000,
        "volumeM3": 40.0,
        "reason": "OVER_CAPACITY_AND_VOLUME",
        "detail": "Khối lượng 12.000 kg và thể tích 40 m³ vượt quá mọi xe tải lạnh khả dụng hiện tại của kho."
      }
    ]
  }
}
```

### 2. Xác nhận phân công chuyến (DATABASE TRANSACTION AN TOÀN)
- **Endpoint**: `POST /api/admin/dispatch/confirm-trip`
- **Request**:
```json
{
  "warehouseId": 1,
  "vehicleId": 12,
  "driverId": 5,
  "contractIds": [101, 102],
  "stopOrders": { "101": 1, "102": 2 },
  "departureTime": "2026-11-18T06:00:00+07:00",
  "notes": "Lấy sớm trước 8h sáng"
}
```
- **Response**:
```json
{
  "status": 200,
  "message": "Đã phân công chuyến vận chuyển mã TRIP-20261118-001",
  "result": {
    "tripCode": "TRIP-20261118-001",
    "status": "ASSIGNED",
    "totalWeightKg": 5200,
    "totalVolumeM3": 21.5,
    "assignedStopsCount": 2
  }
}
```

### 3. Hủy chuyến vận chuyển (CANCEL TRIP)
- **Endpoint**: `POST /api/admin/dispatch/trips/{id}/cancel`
- **Request**:
```json
{
  "cancelReason": "Xe tải gặp sự cố kỹ thuật trước giờ xuất bến"
}
```
- **Response**:
```json
{
  "status": 200,
  "message": "Đã hủy chuyến TRIP-20261118-001 và giải phóng tài nguyên",
  "result": {
    "tripId": 1,
    "status": "CANCELLED",
    "releasedContractsCount": 2,
    "vehicleStatus": "AVAILABLE",
    "driverStatus": "AVAILABLE"
  }
}
```

---

## H. TIÊU CHÍ NGHIỆM THU (ACCEPTANCE CRITERIA)

- [ ] Bảng danh mục `warehouse_hubs` được tạo và seed an toàn cho đúng 5 Hub trung chuyển trọng điểm thực tế.
- [ ] Xe (`fleet_vehicles`) và tài xế (`fleet_drivers`) liên kết trực tiếp với đúng kho, có ràng buộc `capacity_kg` và `volume_m3`.
- [ ] Lô hàng **chỉ xuất hiện** trên màn hình điều phối khi đã hoàn tất xác nhận đóng gói (`packaging_approved = true` và `pickup_truck_plate IS NULL`).
- [ ] Nút **"Tự Động Điều Phối"** chỉ tính toán đề xuất trên bộ nhớ (không ghi DB), kiểm tra đồng thời cả tải trọng và thể tích.
- [ ] Hiển thị danh sách các lô hàng chưa thể ghép (`unassignedContracts`) kèm lý do cụ thể (`OVER_CAPACITY`, `OVER_VOLUME`, `NO_AVAILABLE_DRIVER`...).
- [ ] Backend tự truy vấn Database và tính toán lại toàn bộ tải trọng & thể tích khi nhận lệnh xác nhận chuyến (Zero-trust Client).
- [ ] Áp dụng Ma trận GPLX linh hoạt, hỗ trợ cả bằng cũ (B2, C, FC) và bằng mới theo Luật 2024/2025 (B, C1, C, CE).
- [ ] Khi bấm **"Xác nhận điều phối"**: Xe và tài xế chuyển sang `ASSIGNED`. Khi tài xế xuất bến chuyển sang `ON_TRIP`. Khi về kho chuyển sang `AVAILABLE`.
- [ ] Quy trình **Hủy chuyến (Cancel Trip)** giải phóng xe, tài xế về `AVAILABLE` và trả các hợp đồng về lại hàng chờ điều phối.
- [ ] Ràng buộc duy nhất `uq_active_contract_pickup` và Transaction Lock chống hoàn toàn phân công trùng 1 xe/tài xế hoặc 1 lô hàng vào 2 chuyến.
- [ ] Bắn WebSocket STOMP cập nhật tức thời cho Admin, Farmer, Buyer khi có biến động chuyến.

---
*Kế hoạch Phiên bản 1.2 đã giải quyết trọn vẹn 6 điểm cốt lõi theo đánh giá của người dùng.*
