# KẾ HOẠCH TRIỂN KHAI: BỔ SUNG USERNAME, EMAIL VÀ MẬT KHẨU (HASH) CHO NHÂN VIÊN & TÀI XẾ KHO

---

## A. Overview
- **Tên chức năng:** Quản lý thông tin đăng nhập (`username`, `email`, `password_hash`) cho nhân viên & tài xế kho (`fleet_drivers`) và đồng bộ tài khoản đăng nhập hệ thống (`users`).
- **Mục tiêu:**
  - Mọi nhân viên kho và tài xế trong bảng `fleet_drivers` đều có `username`, `email` và `password_hash` (mã hóa BCrypt, không lưu plaintext, không trả về API response).
  - Khi Quản lý kho hoặc Admin thêm/cập nhật nhân viên tại `/manager/staff` hoặc `/admin/staff`, hệ thống hash mật khẩu và đồng bộ tạo/cập nhật tài khoản đăng nhập trong bảng `users` gắn đúng `assigned_hub_id` và role (`ROLE_DRIVER`, `ROLE_WAREHOUSE_QC`, `ROLE_ACCOUNTANT`).
- **Phạm vi nghiệp vụ:** Backend (Migration, Model, Request DTO, Service), Frontend (`FleetDriverDto`, modal & card trong `staff/page.tsx`).
- **Kết quả mong muốn:** Nhân viên/tài xế được tạo ở kho nào có thể đăng nhập ngay vào App Tài xế (`/portal/driver`) hoặc App Nhân viên kho QC (`/portal/warehouse-qc`) bằng chính `username`/`email` và mật khẩu đã cấp.

---

## B. Current Architecture
- **Database (`fleet_drivers`):** Hiện có các cột `id`, `warehouse_id`, `driver_code`, `full_name`, `phone`, `license_number`, `license_class`, `status`, `experience_years`, `created_at`, `updated_at`. Chưa có `username`, `email`, `password_hash`, `user_id`.
- **Backend:**
  - [FleetDriver.java](file:///e:/HOCTAP/WWW/BTL_WebBanRau/backend/src/main/java/com/btl/webbanrau/model/FleetDriver.java)
  - [FleetDriverRequest.java](file:///e:/HOCTAP/WWW/BTL_WebBanRau/backend/src/main/java/com/btl/webbanrau/dto/request/FleetDriverRequest.java)
  - [FleetManagementService.java](file:///e:/HOCTAP/WWW/BTL_WebBanRau/backend/src/main/java/com/btl/webbanrau/service/FleetManagementService.java) (`getStaff`, `createDriver`, `updateDriver`)
  - [AdminFleetController.java](file:///e:/HOCTAP/WWW/BTL_WebBanRau/backend/src/main/java/com/btl/webbanrau/controller/AdminFleetController.java) (`/admin/dispatch/drivers`)
- **Frontend:**
  - [fleetDispatchApi.ts](file:///e:/HOCTAP/WWW/BTL_WebBanRau/frontend/src/services/fleetDispatchApi.ts) (`FleetDriverDto`)
  - [staff/page.tsx](file:///e:/HOCTAP/WWW/BTL_WebBanRau/frontend/src/app/admin/staff/page.tsx) (dùng chung cho `/admin/staff` và `/manager/staff`)

---

## C. Implementation Scope

### Frontend
- **File chỉnh sửa:**
  - `frontend/src/services/fleetDispatchApi.ts`: Bổ sung `username?: string`, `email?: string`, `userId?: number` vào `FleetDriverDto`.
  - `frontend/src/app/admin/staff/page.tsx`:
    - Thêm state `formUsername`, `formEmail`, `formPassword` trong modal Thêm / Sửa nhân viên.
    - Validation phía client: khi tạo mới bắt buộc nhập `username`, `email`, `password` (tối thiểu 6 ký tự); khi cập nhật `password` là tùy chọn (để trống nếu giữ nguyên).
    - Hiển thị `username` và `email` trên card nhân viên.
    - Xử lý trạng thái loading, error (hiển thị message trùng username/email từ Backend) và success.

### Backend
- **File chỉnh sửa:**
  - `backend/src/main/java/com/btl/webbanrau/model/FleetDriver.java`: Thêm `username`, `email`, `passwordHash` (`@JsonIgnore`), `userId`.
  - `backend/src/main/java/com/btl/webbanrau/repository/FleetDriverRepository.java`: Thêm `findByUsername`, `findByEmail`.
  - `backend/src/main/java/com/btl/webbanrau/dto/request/FleetDriverRequest.java`: Thêm `username`, `email`, `password` (với `@Email` khi có giá trị).
  - `backend/src/main/java/com/btl/webbanrau/service/FleetManagementService.java`:
    - Inject `PasswordEncoder`, `UserRepository`, `RoleRepository`.
    - Kiểm tra trùng `username` / `email` trên cả `fleet_drivers` và `users`.
    - Hash mật khẩu bằng `passwordEncoder.encode(...)` trước khi lưu vào `fleet_drivers.password_hash` và `users.password`.
    - Ánh xạ `licenseClass` sang `Role` hệ thống:
      - `QC_TECH`, `WH_STAFF`, `DISPATCH` -> `ROLE_WAREHOUSE_QC`
      - `ACCOUNTANT` -> `ROLE_ACCOUNTANT`
      - `B`, `B2`, `C`, `C1`, `CE`, `FC` -> `ROLE_DRIVER`
    - Gán `assignedHubId = warehouseId` cho `User`.
  - `backend/src/main/java/com/btl/webbanrau/util/DataInitializer.java`: Đồng bộ cập nhật `username`, `email`, `password_hash`, `user_id` cho dữ liệu seed nếu thiếu.

### Database
- **Migration mới:** `backend/src/main/resources/db/migration/V10__fleet_driver_credentials.sql`
  - `ALTER TABLE fleet_drivers ADD COLUMN IF NOT EXISTS username VARCHAR(80), ADD COLUMN IF NOT EXISTS email VARCHAR(150), ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255), ADD COLUMN IF NOT EXISTS user_id BIGINT REFERENCES users(id) ON DELETE SET NULL;`
  - Thêm `UNIQUE` constraint/index cho `username` và `email`.
  - Backfill an toàn cho các bản ghi `fleet_drivers` hiện có (sinh `username` từ `LOWER(REPLACE(driver_code, '-', '_'))`, `email` từ `<username>@honafresh.vn`, `password_hash` chuẩn BCrypt và liên kết `user_id` nếu khớp với `driver_tms` / `qc_tram1`).
- **Rủi ro dữ liệu hiện có:** Thấp, sử dụng `ADD COLUMN IF NOT EXISTS` và `WHERE username IS NULL` để không ghi đè dữ liệu đã có.

---

## D. API Contract

1. **`GET /api/v1/admin/dispatch/drivers?warehouseId={hubId}&role={role}`**
   - **Quyền:** `ROLE_ADMIN`, `ROLE_WAREHOUSE_MANAGER`.
   - **Response (`FleetDriver`):** Bao gồm thêm `username`, `email`, `userId` (KHÔNG trả `passwordHash`).

2. **`POST /api/v1/admin/dispatch/drivers`**
   - **Quyền:** `ROLE_ADMIN`, `ROLE_WAREHOUSE_MANAGER`.
   - **Request Body (`FleetDriverRequest`):**
     ```json
     {
       "warehouseId": 2,
       "driverCode": "DRV-DT-04",
       "fullName": "Nguyễn Văn An",
       "phone": "0912345678",
       "licenseNumber": "GPLX-790111222333",
       "licenseClass": "C",
       "status": "AVAILABLE",
       "experienceYears": 3,
       "username": "drv_dt_04",
       "email": "drv.dt04@honafresh.vn",
       "password": "Driver@123456"
     }
     ```
   - **Status Codes:** `200` (thành công), `400` (thiếu username/email/password hoặc trùng dữ liệu), `403` (không đủ quyền).

3. **`PUT /api/v1/admin/dispatch/drivers/{id}`**
   - **Quyền:** `ROLE_ADMIN`, `ROLE_WAREHOUSE_MANAGER`.
   - **Request Body:** Giống `POST`, nhưng `password` có thể để trống/null nếu không đổi mật khẩu.

---

## E. Business Flow
1. Quản lý kho (hoặc Admin) mở `/manager/staff` -> nhấn **Thêm Nhân Viên**.
2. Chọn vai trò (Tài xế / KTV QC / NV Kho / Điều phối / Kế toán), nhập mã, họ tên, SĐT, GPLX/mã thẻ và **Username, Email, Mật khẩu**.
3. Frontend gửi `POST /api/v1/admin/dispatch/drivers`.
4. Backend kiểm tra trùng lặp `driverCode`, `licenseNumber`, `username`, `email`; hash mật khẩu bằng BCrypt; lưu vào `fleet_drivers` và đồng bộ tạo tài khoản đăng nhập tương ứng trong `users` (với `assignedHubId = warehouseId`).
5. Nhân viên/tài xế mới có thể đăng nhập ngay bằng `username`/`email` và mật khẩu vừa tạo.

---

## F. Implementation Steps
1. Tạo Flyway migration `V10__fleet_driver_credentials.sql`.
2. Cập nhật `FleetDriver.java`, `FleetDriverRepository.java`, `FleetDriverRequest.java`.
3. Cập nhật `FleetManagementService.java` (hash mật khẩu BCrypt, kiểm tra trùng lặp, đồng bộ `users`).
4. Cập nhật `DataInitializer.java` để đảm bảo dữ liệu seed đồng nhất `username`, `email`, `password_hash`, `user_id`.
5. Cập nhật `fleetDispatchApi.ts` và `staff/page.tsx` (hiển thị & form nhập `username`, `email`, `password`).
6. Kiểm tra tĩnh & xác minh bằng API / DB sau khi người dùng khởi động lại Backend.

---

## G. Risks & Considerations
- **Bảo mật:** `passwordHash` bắt buộc gắn `@JsonIgnore` trên Entity để không bao giờ lộ hash qua API; mật khẩu luôn hash qua `PasswordEncoder` (BCrypt), không lưu plaintext.
- **Tương thích dữ liệu cũ:** Các nhân viên đã seed sẵn trong `fleet_drivers` (33 bản ghi) cần được backfill `username`, `email`, `password_hash` an toàn qua migration.
- **Phân quyền:** Cần giữ nguyên rule `ROLE_WAREHOUSE_MANAGER` chỉ thao tác được trên nhân sự của kho mình nếu cần kiểm soát chặt hơn.

---

## H. Acceptance Criteria
- Bảng `fleet_drivers` có đủ cột `username`, `email`, `password_hash`, `user_id` và dữ liệu cũ được backfill đầy đủ.
- API `GET /admin/dispatch/drivers` trả về `username`, `email`, KHÔNG trả về `passwordHash`.
- Tạo nhân viên/tài xế mới trên `/manager/staff` lưu được `password_hash` dạng BCrypt và đăng nhập được qua `/api/v1/auth/login`.
