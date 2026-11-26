# KẾ HOẠCH TRIỂN KHAI: PHÂN QUYỀN ĐA VAI TRÒ (RBAC) & TÁCH APP MOBILE CAPACITOR

> **Dự án:** HONA FRESH (Nền tảng B2B kết nối Thương lái và Nhà vườn)  
> **Phạm vi:** Full-stack (ReactJS/Next.js + Capacitor Android + Spring Boot Security + PostgreSQL)  
> **Trạng thái:** Chờ phê duyệt (PLANNING)

---

## A. Overview

### 1. Tên chức năng
Phân quyền đa vai trò (RBAC) cho hệ thống quản trị & vận hành HoNa Fresh, tách biệt tài khoản đăng nhập theo từng nghiệp vụ và đóng gói **App Mobile Capacitor (Android APK)** cho Nhân viên kho QC và Tài xế.

### 2. Mục tiêu & Ma trận phân quyền chi tiết

| Vai trò (Role) | Mã Role | Nền tảng sử dụng | Chức năng được phép truy cập | Phạm vi dữ liệu |
|---|---|---|---|---|
| **Quản trị viên tổng (Super Admin)** | `ROLE_ADMIN` | Web (`/admin/*`) | Toàn bộ 10 module (bao gồm Tài khoản & KYC, Nguồn cung & danh mục, Kiểm toán toàn bộ các trạm) | Toàn hệ thống (tất cả 5 Trạm) |
| **Quản lý kho** | `ROLE_WAREHOUSE_MANAGER` | Web (`/admin/*`) | **Đúng 8 module:** Tổng quan, Nhân viên & Tài xế, Kho hàng & Sơ đồ 3D, Hợp đồng & Ký quỹ, Lấy hàng, Trạm QC & FEFO, Giao hàng, Kế toán | **Khóa cứng theo Trạm được phân công (`assignedHubId`)**; mục Hợp đồng & Ký quỹ chỉ hiện các hợp đồng lưu kho/điều phối tại kho của quản lý đó |
| **Kế toán** | `ROLE_ACCOUNTANT` | Web (`/admin/accounting`) | **Duy nhất chức năng Kế toán** (ẩn toàn bộ sidebar khác, tự động điều hướng thẳng vào `/admin/accounting`) | Theo trạm được gán hoặc toàn hệ thống (nếu là kế toán tổng) |
| **Nhân viên kho (QC)** | `ROLE_WAREHOUSE_QC` | Mobile App APK (Capacitor → `/portal/warehouse-qc`) | Tiếp nhận xe thu gom về kho, kiểm định chất lượng QC (Brix, Nitrat, thuốc BVTV, tỷ lệ loại 1), in/quét tem QR PUC, xếp kệ kho lạnh FEFO | Theo Trạm được phân công (`assignedHubId`) |
| **Tài xế xe lạnh** | `ROLE_DRIVER` | Mobile App APK (Capacitor → `/portal/driver`) | Nhận chuyến lấy hàng tại rẫy (ký bàn giao, nhập nhiệt độ cuống rau, chụp ảnh), nhận chuyến giao hàng Outbound tới Buyer (chụp ảnh + chữ ký ePOD + gửi GPS realtime) | Chỉ các chuyến/điểm dừng được gán cho tài xế đó |

*(Giữ nguyên `ROLE_FARMER` tại `/portal/farmer` và `ROLE_BUYER` tại `/portal/buyer`.)*

---

## B. Current Architecture

### 1. Backend hiện tại
- `Role.java` & `User.java`:
  - `User` có tập `roles` (`users_roles`), chưa có cột `assigned_hub_id` để gắn Quản lý kho / Nhân viên kho / Kế toán với một Trạm (`warehouse_hubs`) cố định.
- `SecurityConfig.java`:
  - Đã định nghĩa sẵn tên role `WAREHOUSE_QC`, `DRIVER`, `ACCOUNTANT`, `ADMIN`, `FARMER`, `BUYER` nhưng các API `/admin/**` hiện đang khóa cứng `.hasRole("ADMIN")`.
  - Chưa có `ROLE_WAREHOUSE_MANAGER`.
- `AdminBusinessController.java` / `AdminBusinessService.java`:
  - `GET /admin/contracts`, `GET /admin/accounting/cashflow-summary`, `GET /admin/accounting/vas-reports`, `GET /admin/dashboard` chưa tự động ép `hubId` theo `assignedHubId` của tài khoản đang đăng nhập.
- `DataInitializer.java`: Chưa seed sẵn các tài khoản mẫu cho `ROLE_WAREHOUSE_MANAGER`, `ROLE_ACCOUNTANT`, `ROLE_WAREHOUSE_QC`, `ROLE_DRIVER` gắn với từng trạm để đăng nhập & kiểm thử ngay.

### 2. Frontend & Mobile hiện tại
- `frontend/src/app/admin/layout.tsx`:
  - Kiểm tra cứng `user.roles?.includes('ROLE_ADMIN')`, nếu không phải thì đẩy về `/`.
  - Cho phép Admin tự do chọn bất kỳ trạm nào trong `DEFAULT_OFFICIAL_HUBS` (và hiện modal chọn trạm).
  - Hiển thị đủ cả 10 module trong sidebar.
- `frontend/src/app/dang-nhap/page.tsx`: Chưa phân luồng điều hướng tự động theo role sau khi đăng nhập (ví dụ `ROLE_ACCOUNTANT` → `/admin/accounting`, `ROLE_WAREHOUSE_MANAGER` → `/admin/dashboard`, `ROLE_WAREHOUSE_QC` → `/portal/warehouse-qc`, `ROLE_DRIVER` → `/portal/driver`).
- `frontend/src/app/portal/[role]/page.tsx`: Đã có sẵn component `WarehouseReceivingConsole` (`/portal/warehouse-qc`) và `DriverInboundPickupConsole` (`/portal/driver`), nhưng `DriverInboundPickupConsole` hiện cần đảm bảo bao gồm đầy đủ cả **quy trình lấy hàng (Inbound)** và **quy trình giao hàng + ePOD (Outbound)**.
- `frontend/package.json`: Chưa cài Capacitor (`@capacitor/core`, `@capacitor/cli`, `@capacitor/android`).

---

## C. Implementation Scope

### 1. Database (`users` & `roles`)
- Thêm cột `assigned_hub_id BIGINT NULL REFERENCES warehouse_hubs(id)` trên bảng `users` (qua Hibernate entity `User.java` + script/Flyway hoặc `ALTER TABLE IF EXISTS` an toàn trong `DataInitializer`).
- Bổ sung role `ROLE_WAREHOUSE_MANAGER` vào bảng `roles`.
- Seed danh sách tài khoản đăng nhập mẫu rõ ràng (cùng mật khẩu chuẩn test) cho từng vai trò:
  - **Admin Tổng:** `admin@honafresh.vn` (`ROLE_ADMIN`)
  - **Quản lý kho Đức Trọng (Hub 2):** `qlkho.ductrong@honafresh.vn` (`ROLE_WAREHOUSE_MANAGER`, `assigned_hub_id = 2`)
  - **Quản lý kho Củ Chi (Hub 1):** `qlkho.cuchi@honafresh.vn` (`ROLE_WAREHOUSE_MANAGER`, `assigned_hub_id = 1`)
  - **Kế toán:** `ketoan@honafresh.vn` (`ROLE_ACCOUNTANT`)
  - **Nhân viên kho QC (Mobile App):** `qc.ductrong@honafresh.vn` (`ROLE_WAREHOUSE_QC`, `assigned_hub_id = 2`)
  - **Tài xế xe lạnh (Mobile App):** `taixe1@honafresh.vn` (`ROLE_DRIVER`, liên kết `fleet_drivers`)

### 2. Backend
- **`User.java` & `AuthService.java` / `UserDto`:**
  - Thêm `assignedHubId` (và `assignedHubName`) vào entity `User` và payload trả về của `/auth/login`, `/auth/me`.
- **`SecurityConfig.java`:**
  - Mở quyền `/admin/dashboard/**`, `/admin/staff/**`, `/admin/warehouses/**`, `/admin/cold-assets/**`, `/admin/contracts/**`, `/admin/inbound-dispatch/**`, `/admin/qc/**`, `/admin/hub-inspections/**`, `/admin/outbound-dispatch/**`, `/admin/fleet/**` cho `hasAnyRole("ADMIN", "WAREHOUSE_MANAGER")`.
  - Mở quyền `/admin/accounting/**`, `/admin/settings` (GET) cho `hasAnyRole("ADMIN", "WAREHOUSE_MANAGER", "ACCOUNTANT")`.
  - Giữ riêng `/admin/users/**`, `/admin/harvest-lots/**`, `/admin/categories/**`, `PUT /admin/settings` cho `hasRole("ADMIN")`.
  - Cho phép `CORS` từ origin của Capacitor (`capacitor://localhost`, `http://localhost`, `https://localhost`).
- **Khoá phạm vi Trạm trên Backend (Data Isolation cho `ROLE_WAREHOUSE_MANAGER`):**
  - Tạo helper `resolveScopedHubId(Long requestedHubId)` dùng chung:
    - Nếu user là `ROLE_ADMIN`: dùng `requestedHubId` (cho phép chọn trạm hoặc `null` để xem toàn bộ).
    - Nếu user là `ROLE_WAREHOUSE_MANAGER` (không có `ROLE_ADMIN`): **bắt buộc trả về `user.getAssignedHubId()`**, không cho phép xem/sửa dữ liệu của trạm khác qua tham số URL.
  - Áp dụng `resolveScopedHubId` vào:
    - `GET /admin/contracts`: Khi là Quản lý kho, **chỉ trả về các hợp đồng đang lưu kho hoặc được điều phối thuộc trạm của quản lý kho đó** (lọc qua `CONTRACT_HUB_ID_EXPR = assignedHubId`).
    - `GET /admin/accounting/cashflow-summary` & `GET /admin/accounting/vas-reports`: Quản lý kho chỉ xem được số liệu của trạm mình; `ROLE_ADMIN` và `ROLE_ACCOUNTANT` có nút bật **Kiểm toán toàn bộ các trạm**.
    - Các API `inbound-dispatch`, `outbound-dispatch`, `warehouses`, `qc`, `staff`: Tự động ép theo `assignedHubId` của Quản lý kho.
- **Admin Quản lý Tài khoản (`/admin/users`):**
  - Cho phép Super Admin tạo/gán `Role` và `assignedHubId` cho tài khoản mới.

### 3. Frontend Web (Phân luồng Portal & Admin Sidebar)
- **`frontend/src/app/dang-nhap/page.tsx` & `AppContext`:**
  - Sau khi đăng nhập thành công, tự động điều hướng theo role:
    - `ROLE_ADMIN` / `ROLE_WAREHOUSE_MANAGER` → `/admin/dashboard`
    - `ROLE_ACCOUNTANT` → `/admin/accounting`
    - `ROLE_WAREHOUSE_QC` → `/portal/warehouse-qc`
    - `ROLE_DRIVER` → `/portal/driver`
    - `ROLE_FARMER` → `/portal/farmer`
    - `ROLE_BUYER` → `/portal/buyer`
- **`frontend/src/app/admin/layout.tsx`:**
  - Cho phép truy cập nếu user có `ROLE_ADMIN`, `ROLE_WAREHOUSE_MANAGER`, hoặc `ROLE_ACCOUNTANT`.
  - Lọc danh sách `modules` sidebar động theo role:
    - `ROLE_ADMIN`: 10 modules (đầy đủ).
    - `ROLE_WAREHOUSE_MANAGER`: **chỉ đúng 8 modules** (*Tổng quan, Nhân viên & Tài xế, Kho hàng & Sơ đồ 3D, Hợp đồng & Ký quỹ, Lấy hàng, Trạm QC & FEFO, Giao hàng, Kế toán*), khóa cứng `selectedHubId = user.assignedHubId` (ẩn modal chuyển trạm tự do).
    - `ROLE_ACCOUNTANT`: **chỉ 1 module** (*Kế toán*), nếu gõ URL `/admin/contracts` hay `/admin/dashboard` sẽ tự redirect về `/admin/accounting`.
- **`frontend/src/app/admin/contracts/page.tsx` & `accounting/page.tsx`:**
  - Truyền/hiển thị rõ badge phạm vi trạm đối với Quản lý kho; ẩn nút "Kiểm toán toàn bộ các trạm" nếu không phải `ROLE_ADMIN` hoặc `ROLE_ACCOUNTANT`.
- **Route Mobile chuyên dụng & Hoàn thiện quy trình:**
  - **`WarehouseReceivingConsole.tsx` (`/portal/warehouse-qc`):** Tối ưu giao diện cảm ứng Mobile-first (chạm 1 tay, chụp ảnh chứng từ QC bằng camera điện thoại, chọn kệ Zone/Rack/Bin FEFO, duyệt QC Đạt/Không đạt).
  - **`DriverInboundPickupConsole.tsx` (`/portal/driver`):** Hoàn thiện 2 tab rõ ràng trên Mobile:
    1. **Lấy hàng tại rẫy (Inbound):** Nhận chuyến, xem bản đồ chỉ đường, nhập nhiệt độ cuống rau, ký bàn giao & chụp ảnh xác nhận lấy hàng.
    2. **Giao hàng cho Buyer (Outbound):** Nhận chuyến xuất kho, ký hợp đồng vận chuyển trước xuất bến, phát GPS định kỳ, và nộp **biên bản bàn giao ePOD (chữ ký + ảnh chụp 2 bên)**.

### 4. Mobile App Packaging (Capacitor Android APK)
- **Kiến trúc đề xuất:** Dùng chung 1 codebase Frontend Next.js xuất tĩnh (`output: 'export'` hoặc trỏ `server.url` về backend/BFF LAN khi dev, hoặc static bundle gọi trực tiếp `NEXT_PUBLIC_API_URL` qua HTTP/JWT Bearer Token).
- **Lưu ý kỹ thuật quan trọng cho Next.js + Capacitor APK:**
  - Next.js hiện đang dùng BFF API routes (`/api/...`) ở server-side. Khi build **APK chạy độc lập trên Android** (`capacitor build`), app không có Node.js server bên trong nên cần:
    - Cấu hình chế độ gọi API trực tiếp tới Spring Boot Backend URL (dùng JWT `Authorization: Bearer ...` lưu trong Capacitor Preferences / `localStorage` thay vì phụ thuộc cookie same-origin của Next.js BFF).
    - Tách cấu hình build script để build 2 file APK riêng biệt từ cùng source:
      1. **HoNa QC Staff APK** (`com.honafresh.qc`) → mở thẳng màn hình đăng nhập / `/portal/warehouse-qc`.
      2. **HoNa Driver APK** (`com.honafresh.driver`) → mở thẳng màn hình đăng nhập / `/portal/driver`.
- **Dependencies cần thêm (chỉ cài sau khi được duyệt):**
  - `@capacitor/core`, `@capacitor/cli`, `@capacitor/android`, `@capacitor/camera`, `@capacitor/geolocation`.

---

## D. API Contract

1. **`POST /api/v1/auth/login` & `GET /api/v1/auth/me`**
   - Response `user` bổ sung: `assignedHubId: Long | null`, `assignedHubName: String | null`, `roles: string[]`.
2. **`GET /api/v1/admin/contracts?hubId={id}`**
   - Nếu `ROLE_WAREHOUSE_MANAGER`: Backend tự ép lọc theo `user.assignedHubId`, chỉ trả hợp đồng thuộc kho đó.
3. **`GET /api/v1/admin/accounting/cashflow-summary?hubId={id}` & `vas-reports?hubId={id}`**
   - Nếu `ROLE_WAREHOUSE_MANAGER`: ép theo `user.assignedHubId`.
   - Nếu `ROLE_ADMIN` hoặc `ROLE_ACCOUNTANT`: hỗ trợ `hubId` hoặc toàn hệ thống (`hubId = null`).
4. **`GET /api/v1/driver/outbound-trips` & `POST /api/v1/driver/outbound-trips/stops/{stopId}/submit-epod`**
   - Bảo đảm App Tài xế (`/portal/driver`) có đủ API cho cả chặng lấy hàng (Inbound) và chặng giao hàng + ePOD (Outbound) dưới quyền `ROLE_DRIVER`.

---

## E. Business Flow

1. **Đăng nhập phân luồng tự động:** Người dùng nhập email/mật khẩu tại `/dang-nhap` (hoặc trên App Mobile) → Hệ thống xác thực JWT + trả về `roles` & `assignedHubId` → Tự động mở đúng workspace của role đó.
2. **Quản lý kho vận hành theo Trạm:** Đăng nhập tài khoản `qlkho.ductrong@honafresh.vn` → Chỉ thấy 8 chức năng được cấp và toàn bộ số liệu (Tổng quan, Hợp đồng & Ký quỹ, Lấy hàng, Kho 3D, QC, Giao hàng, Kế toán) đều tự động khóa theo **Trạm Đức Trọng**.
3. **Kế toán độc lập:** Đăng nhập tài khoản `ketoan@honafresh.vn` → Vào thẳng màn hình Kế toán, đối soát dòng tiền & thực hiện giải ngân cho Nông dân, không thể truy cập các trang vận hành kho hay quản trị user.
4. **Nhân viên kho trên App QC (APK):** Đăng nhập `qc.ductrong@honafresh.vn` trên điện thoại → Quét/chọn lô hàng vừa về kho → Chụp ảnh, nhập chỉ số Brix/Nitrat/thuốc BVTV → Xếp vào ô kệ Zone/Rack/Bin 3D.
5. **Tài xế trên App Tài xế (APK):** Đăng nhập `taixe1@honafresh.vn` → Nhận chuyến lấy hàng tại vườn → Bấm xuất bến & gửi GPS → Giao hàng tới kho Buyer và lập ePOD (chụp ảnh + ký tên).

---

## F. Implementation Steps

1. **Bước 1 — Backend RBAC & Data Isolation:**
   - Cập nhật `User.java`, `Role` (`ROLE_WAREHOUSE_MANAGER`), `DataInitializer.java` (seed các tài khoản mẫu cho từng role & trạm).
   - Cập nhật `SecurityConfig.java` (phân quyền endpoint theo từng role + CORS Capacitor).
   - Tạo cơ chế `resolveScopedHubId` áp dụng cho `AdminBusinessController`, `AdminBusinessService` (Hợp đồng, Kế toán, Kho, QC, Dashboard) và kiểm tra đủ API Outbound cho `DriverOutboundController`.
2. **Bước 2 — Frontend Web RBAC & Routing:**
   - Cập nhật `/dang-nhap/page.tsx` điều hướng tự động theo role.
   - Cập nhật `admin/layout.tsx` lọc 8 module cho Quản lý kho, 1 module cho Kế toán, 10 module cho Super Admin; khóa trạm cho Quản lý kho.
   - Cập nhật `admin/contracts/page.tsx` & `admin/accounting/page.tsx` ẩn nút kiểm toán toàn sàn nếu là Quản lý kho, hiển thị rõ trạm đang quản lý.
3. **Bước 3 — Hoàn thiện Mobile Views (`/portal/warehouse-qc` & `/portal/driver`):**
   - Nâng cấp `DriverInboundPickupConsole.tsx` tích hợp đủ cả **Inbound (Lấy hàng)** + **Outbound (Giao hàng, GPS, ePOD)**.
   - Tối ưu UI mobile-first cho `WarehouseReceivingConsole.tsx` (QC & xếp kệ FEFO).
4. **Bước 4 — Cấu hình Capacitor Android (Build APK):**
   - Cài đặt `@capacitor/core`, `@capacitor/cli`, `@capacitor/android`, cấu hình `capacitor.config.ts`, hỗ trợ 2 chế độ build APK (`QC Staff` & `Driver`) và hướng dẫn lệnh `npx cap sync android` + build `.apk` bằng Android Studio / Gradle.

---

## G. Risks & Considerations

- **CORS & Auth trên Capacitor APK:** WebView trên Android (`http://localhost` / `capacitor://localhost`) khi gọi API ra backend LAN/Public nếu dùng HttpOnly cookie có thể bị chặn cross-site cookie (`SameSite`). Vì vậy app Capacitor nên dùng Bearer JWT trong header `Authorization` (hệ thống hiện đã có `JwtAuthenticationFilter` hỗ trợ Bearer token).
- **Next.js Static Export (`output: 'export'`) cho Capacitor:** Capacitor cần static HTML/JS bundle (`out/`). Cần kiểm tra các dynamic route (`[role]`, `[id]`) có `generateStaticParams()` đầy đủ và tránh gọi Next.js server-side BFF routes khi đóng gói APK.
- **Bảo mật API Backend:** Tuyệt đối không chỉ ẩn menu ở Frontend; Backend phải kiểm tra role trong `SecurityConfig` và ép `assignedHubId` cho `ROLE_WAREHOUSE_MANAGER` ngay trong Service/Controller để tránh truy cập chéo dữ liệu giữa các kho.

---

## H. Acceptance Criteria

1. Đăng nhập bằng tài khoản **Quản lý kho** chỉ thấy đúng **8 module** được phép, và mục **Hợp đồng & Ký quỹ** chỉ hiển thị các hợp đồng thuộc kho của quản lý đó.
2. Đăng nhập bằng tài khoản **Kế toán** chỉ vào duy nhất trang **Kế toán**, không truy cập được các module khác.
3. Tài khoản **Nhân viên kho** đăng nhập vào `/portal/warehouse-qc` (và app Capacitor QC) thực hiện trọn vẹn quy trình kiểm định QC & xếp kệ FEFO.
4. Tài khoản **Tài xế** đăng nhập vào `/portal/driver` (và app Capacitor Driver) thực hiện trọn vẹn cả quy trình **Lấy hàng** tại rẫy và **Giao hàng + ePOD** tới Buyer.
5. Dự án Frontend có cấu hình Capacitor Android sẵn sàng để đóng gói 2 file APK (**HoNa QC** và **HoNa Driver**).
