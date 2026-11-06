# 📘 TÀI LIỆU GHI CHÚ THAY ĐỔI & HƯỚNG DẪN MERGE LOCAL
## Dự Án: HoNa Fresh - Sàn Nông Sản B2B & Chuỗi Cung Ứng Lạnh (AgriB2B Platform)

> **Thông tin cập nhật:**  
> - **Nhánh nguồn (Target Branch):** `main`  
> - **Commit hash:** `f5f157c`  
> - **Mô tả commit:** `fix(auth,admin): resolve infinite refresh loop, Next.js dropped segment, B2B registration options & test artifacts`  
> - **Trạng thái:** Đã kiểm thử Build Frontend Next.js 16 (31/31 pages) và Compile Backend Gradle thành công 100%.

---

## 📌 1. CHI TIẾT CÁC THAY ĐỔI VỪA PUSH (CHANGELOG)

### 1.1. Phía Frontend (`frontend/`)
1. **Khắc phục lỗi trang Admin bị refresh / reload liên tục:**
   - **File:** `frontend/src/context/AppContext.tsx`
     - Khởi tạo trực tiếp `currentUser` từ `getStoredUser()` để không làm rỗng state khi vừa tải lại trang.
     - Loại bỏ thao tác xóa session/local storage tùy tiện trong hàm `useEffect` khởi động.
     - Loại bỏ sự kiện `window.addEventListener('focus')` gây trigger fetch dồn dập mỗi khi người dùng click chuột qua lại giữa các cửa sổ.
   - **File:** `frontend/src/app/admin/layout.tsx`
     - Bổ sung cờ chặn `if (authLoading) return;` giúp layout chờ `AppContext` nạp xong phiên đăng nhập trước khi kiểm tra quyền `ROLE_ADMIN`.
     - Thay thế lệnh điều hướng thô `window.location.href = ...` bằng `router.replace(...)` để tránh re-mount toàn bộ ứng dụng.
     - Tách riêng logic lấy dữ liệu thống kê (`getAdminLotStatsApi`) sau khi tài khoản đã xác thực quyền Admin hợp lệ.

2. **Khắc phục lỗi cảnh báo Next.js Dropped Segment (`/admin/users`):**
   - **File:** `frontend/src/app/admin/layout.tsx`
     - Sử dụng thẻ bọc `<div className={!authChecked ? 'hidden' : undefined}>{children}</div>` để giữ `{children}` luôn nằm trong DOM ảo của React trong suốt quá trình prefetch instant-navigation của Next.js 16.

3. **Khắc phục cảnh báo Unstable Date (`new Date()`):**
   - **File:** `frontend/src/components/admin/Module2HarvestLots.tsx`
     - Xóa bỏ việc gọi trực tiếp `new Date().toISOString()` trong `useState` khởi tạo của form lô hàng, chuyển thành chuỗi rỗng `''` để triệt tiêu lỗi Hydration Mismatch trên Server Components.

4. **Nâng cấp UX Form Đăng ký B2B:**
   - **File:** `frontend/src/components/AuthForm.tsx`
     - **Thương Lái (`ROLE_BUYER`):** Bổ sung checkbox *"Thương lái cá nhân / Hộ kinh doanh nhỏ (Chưa có Mã số thuế doanh nghiệp)"*. Khi tích chọn, form tự động ẩn trạng thái bắt buộc nhập MST và hướng dẫn hoàn tất KYC sau.
     - **Nông Dân (`ROLE_FARMER`):** Bổ sung **Dropdown chọn Ngân Hàng Việt Nam** chuẩn VietQR / Napas247 (Vietcombank, BIDV, Agribank, VietinBank, MBBank, Techcombank, VPBank, Sacombank, ACB, v.v.) và checkbox *"Cập nhật số tài khoản sau"* hỗ trợ nông dân đăng ký tài khoản nhanh.

---

### 1.2. Phía Backend (`backend/`)
1. **Mở rộng Model & DTO User:**
   - **File:** `backend/src/main/java/com/btl/webbanrau/model/User.java`
     - Bổ sung trường `individualBuyer` (boolean, default = `false`).
   - **File:** `backend/src/main/java/com/btl/webbanrau/dto/request/RegisterRequest.java`
     - Thêm trường `isIndividualBuyer` (boolean) nhận từ request JSON.
   - **File:** `backend/src/main/java/com/btl/webbanrau/dto/response/AuthResponse.java`
     - Bổ sung trường `individualBuyer` vào response trả về cho frontend.
   - **File:** `backend/src/main/java/com/btl/webbanrau/service/AuthService.java`
     - Lưu trạng thái `individualBuyer` vào database khi đăng ký tài khoản mới.
   - **File:** `backend/src/main/java/com/btl/webbanrau/service/TokenService.java`
     - Cập nhật logic thẩm định `profileComplete`: Cho phép thương lái cá nhân (`individualBuyer = true`) hoàn tất hồ sơ mà không bắt buộc có Mã số thuế công ty.

2. **Cập nhật Database Migration (Flyway):**
   - **File:** `backend/src/main/resources/db/migration/V3__admin_business.sql`
     - Thêm lệnh: `ALTER TABLE users ADD COLUMN IF NOT EXISTS individual_buyer BOOLEAN DEFAULT FALSE;`.

---

### 1.3. Báo Cáo Kiểm Thử Đính Kèm
- **File Excel:** `Bao_Cao_Kiem_Thu_Auth_B2B_HoNa_Fresh.xlsx` (Báo cáo tổng hợp kiểm thử toàn bộ ma trận phân quyền 5 Portal B2B, quản lý phiên đăng nhập kép HttpOnly Cookie & LocalStorage, và 8 lỗi đã khắc phục DEF-01 đến DEF-08).
- **Thư mục hình ảnh bằng chứng:** `test_evidence/` (Gồm 25 ảnh và video clip ghi lại quá trình kiểm thử tự động).

---

## 🚀 2. HƯỚNG DẪN TỪNG BƯỚC CHO THÀNH VIÊN KHI MERGE VỀ (CHECKLIST)

Để tránh lỗi conflict hoặc lỗi crash khi khởi động, các thành viên hãy thực hiện tuần tự theo các bước sau:

### 🔹 Bước 1: Kéo code mới nhất từ nhánh `main`
Mở Terminal trong thư mục gốc của dự án:
```bash
git checkout main
git pull origin main
```
*Lưu ý: Nếu có thay đổi chưa commit trên máy cá nhân, hãy dùng `git stash` trước khi pull.*

---

### 🔹 Bước 2: Cập nhật & Kiểm tra Database (PostgreSQL)
Hệ thống sử dụng Flyway để tự động đồng bộ cấu trúc bảng khi Backend khởi động.

**Trường hợp 1: Chạy bình thường**
* Khi bạn khởi động backend, Flyway sẽ tự động chạy các script `V1`, `V2`, `V3`.

**Trường hợp 2: Nếu bị lỗi Flyway Checksum Mismatch hoặc Migration Failed**
Nếu trước đây bạn đã từng chạy database cũ và Flyway báo lỗi:
> `FlywayException: Validate failed: Migrations have failed validation` hoặc `Migration checksum mismatch for migration version 3`

👉 **Cách khắc phục nhanh nhất:**
Mở **pgAdmin** hoặc **DBeaver** kết nối vào database `webbanrau_db`, mở Query Tool và chạy đoạn lệnh sau:
```sql
-- 1. Xóa các bản ghi migration bị lỗi trong lịch sử Flyway
DELETE FROM flyway_schema_history WHERE success = false;

-- 2. Đảm bảo cột individual_buyer đã tồn tại trong bảng users
ALTER TABLE users ADD COLUMN IF NOT EXISTS individual_buyer BOOLEAN DEFAULT FALSE;
```
*(Nếu muốn làm sạch hoàn toàn để nạp lại dữ liệu chuẩn từ đầu, có thể `DROP SCHEMA public CASCADE; CREATE SCHEMA public;` rồi để backend tự nạp lại).*

---

### 🔹 Bước 3: Cấu hình thông số Backend (`application.properties`)
Mở file `backend/src/main/resources/application.properties` và kiểm tra:
1. **Thông tin kết nối PostgreSQL:**
   ```properties
   spring.datasource.url=jdbc:postgresql://localhost:5432/webbanrau_db
   spring.datasource.username=postgres
   spring.datasource.password=password123  # Điền mật khẩu PostgreSQL trên máy của bạn
   ```
2. **Cấu hình Flyway an toàn:**
   ```properties
   spring.flyway.baseline-on-migrate=true
   spring.flyway.baseline-version=1
   spring.flyway.validate-on-migrate=false
   spring.flyway.repair-on-migrate=true
   spring.flyway.enabled=true
   ```

---

### 🔹 Bước 4: Khởi động Backend (Spring Boot)
Trong thư mục `backend/`:
```powershell
# Trên Windows (PowerShell):
.\gradlew.bat bootRun

# Hoặc trên Linux/macOS:
./gradlew bootRun
```
*Khi thấy log:* `Started WebBanRauApplication in ... seconds` và `Tomcat started on port 8080 (http) with context path '/api/v1'` *là backend đã sẵn sàng.*

---

### 🔹 Bước 5: Cài đặt & Khởi động Frontend (Next.js)
Trong thư mục `frontend/`:
```bash
# 1. Cài đặt các thư viện mới nhất
npm install

# 2. Chạy môi trường phát triển (Dev Server)
npm run dev
```
*Truy cập ứng dụng tại:* `http://localhost:3000`

---

### 🔹 Bước 6: Xóa Cache & Cookie trình duyệt (Quan trọng)
Do hệ thống đã chuyển sang kiến trúc **Session kép (HttpOnly Cookie kết hợp LocalStorage)**:
* Nếu trình duyệt của bạn đang lưu cookie / localStorage của các phiên bản cũ trước khi merge:
  1. Nhấn `F12` trên trình duyệt.
  2. Chọn tab **Application** (Ứng dụng) -> **Storage** -> Nhấn **Clear site data** (Xóa dữ liệu trang web).
  3. Hoặc mở **Cửa sổ ẩn danh mới (Incognito Window)** để kiểm thử nhằm đảm bảo phiên làm việc hoàn toàn mới.

---

## 🔑 3. DANH SÁCH TÀI KHOẢN MẪU ĐỂ KIỂM THỬ (SEED DATA)

Hệ thống đã tự động tạo sẵn 6 tài khoản mẫu đại diện cho đầy đủ các vai trò trong chuỗi cung ứng B2B:

| Vai trò (Role) | Tên tài khoản (Username) | Mật khẩu | Portal tương ứng | Quyền hạn chính |
| :--- | :--- | :--- | :--- | :--- |
| **Quản Trị Viên** | `admin` | `admin123` | `http://localhost:3000/admin` | Toàn quyền kiểm duyệt lô hàng, duyệt KYC, quản trị danh mục, xem thống kê sàn |
| **Nông Dân (Farmer)** | `farmer_mocchau` | `Farmer@123456` | `http://localhost:3000/portal/farmer` | Đăng bán lô vụ mùa, quản lý kho nông hộ, ký hợp đồng bán sỉ |
| **Thương Lái (Buyer)** | `buyer_sg` | `Buyer@123456` | `http://localhost:3000/portal/buyer` | Tìm nguồn hàng sỉ, gửi yêu cầu báo giá (RFQ), đặt cọc ký quỹ Escrow 30% |
| **Kiểm Định Viên (QC)** | `qc_tram1` | `Qcstaff@123456` | `http://localhost:3000/portal/warehouse_qc` | Kiểm tra độ Brix, độ ẩm, dư lượng Nitrate tại Trạm Trung Chuyển |
| **Tài Xế Vận Tải Lạnh** | `driver_tms` | `Driver@123456` | `http://localhost:3000/portal/driver` | Nhận lịch điều phối xe lạnh TMS, cập nhật lộ trình, chụp ảnh ký nhận ePOD |
| **Kế Toán Sàn (VAS)** | `accountant_vas` | `Account@123456` | `http://localhost:3000/portal/accountant` | Quản lý ký quỹ Escrow, xuất hóa đơn GTGT dịch vụ sàn 3%, hạch toán GL |

---

## ❓ 4. GIẢI ĐÁP CÁC CÂU HỎI THƯỜNG GẶP (FAQ)

### Q1: Tại sao vào trang `/admin/harvest-lots` chỉ thấy 8 lô hàng mà không thấy 644 sản phẩm cũ?
* **Trả lời:** Trong database:
  - Bảng `products` (644 sản phẩm): Dữ liệu sản phẩm bán lẻ cũ.
  - Bảng `harvest_lots` (8 lô hàng): Danh mục **Lô Vụ Mùa B2B** mới với chuẩn mã vùng trồng PUC, VietGAP, dải nhiệt độ xe lạnh và giá sỉ theo Tạ/Tấn.
  - Trang `/admin/harvest-lots` là module quản lý sỉ B2B nên truy vấn trực tiếp từ bảng `harvest_lots`. Hiện tại hệ thống đang hiển thị chính xác 100% dữ liệu (8/8 lô) của bảng này.

### Q2: Đăng ký tài khoản mới nhưng không nhận được mã OTP gửi về Email?
* **Trả lời:**
  - Nếu chưa cấu hình mật khẩu ứng dụng Gmail (`GMAIL_APP_PASSWORD`) trong `application.properties`, hệ thống sẽ ghi mã OTP trực tiếp vào **Console Log của Backend** (tìm dòng `[DEV ONLY] OTP for your_email@...: 123456`).
  - Bạn chỉ cần xem Terminal backend để lấy mã 6 số nhập vào form xác thực.

### Q3: Bị lỗi CORS hoặc 403 khi gọi API từ Frontend sang Backend?
* **Trả lời:** Đảm bảo Next.js proxy route `/api/backend/[...path]` đang hoạt động đúng trên port `3000` và backend Spring Boot đang chạy ở port `8080`.
