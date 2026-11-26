# KẾ HOẠCH ĐÓNG GÓI 2 ỨNG DỤNG MOBILE ANDROID (STAFF & DRIVER) BẰNG CAPACITOR

---

## A. Overview

- **Tên chức năng:** Đóng gói 2 ứng dụng Android APK bằng **Capacitor** cho phân hệ **Driver (Tài xế)** và **Staff / Kho QC (Warehouse QC)**, sau đó cài đặt trực tiếp lên thiết bị Android đang kết nối USB (`51581ee1`).
- **Mục tiêu:**
  - Tạo 2 ứng dụng Android độc lập (`appId`, `appName`, icon/launcher riêng) trên điện thoại thật:
    1. **HoNa Driver** (`com.honafresh.driver`) → mở thẳng `/portal/driver` (`DriverInboundPickupConsole`).
    2. **HoNa Staff QC** (`com.honafresh.staff`) → mở thẳng `/portal/warehouse-qc` (`WarehouseReceivingConsole`).
  - Hỗ trợ giao tiếp HTTP/WebSocket ổn định với Backend/Frontend, cho phép chụp ảnh, truy cập mạng nội bộ (`cleartext: true`) và cài đặt trực tiếp qua `adb install`.
- **Đối tượng sử dụng:** Tài xế xe lạnh (`ROLE_DRIVER`) và Nhân viên Kho/QC (`ROLE_WAREHOUSE_QC`, `ROLE_WAREHOUSE_MANAGER`).
- **Kết quả mong muốn:** 2 file APK (`app-debug.apk` hoặc `app-release.apk`) được build thành công bằng Gradle Android và cài đặt sẵn trên máy `51581ee1`.

---

## B. Current Architecture

- **Frontend hiện có (`frontend/`):**
  - Next.js `16.4.6` (App Router), React `19.3.0`, sử dụng API proxy nội bộ `/api/backend/[...path]/route.ts` để chuyển tiếp request & cookie/JWT tới Backend Spring Boot (`:8080`).
  - Đã có sẵn 2 giao diện mobile-ready tại:
    - `/portal/driver` (`DriverInboundPickupConsole`)
    - `/portal/warehouse-qc` (`WarehouseReceivingConsole`)
- **Môi trường build Android trên máy:**
  - Đã có `ANDROID_HOME=C:\Users\chung\AppData\Local\Android\Sdk`
  - Đã có `Java 21.0.5`
  - Đã nhận thiết bị USB qua `adb devices`: `51581ee1`

---

## C. Implementation Scope

### 1. Dependencies cần cài đặt (Yêu cầu xác nhận theo Mục 9.1 `AGENTS.md`)
Trong thư mục `mobile/` (tách riêng khỏi `frontend/package.json` để **không làm nặng hay ảnh hưởng project Next.js hiện có**):
- `@capacitor/core`
- `@capacitor/cli`
- `@capacitor/android`
- *Tác động:* Không đụng vào `frontend/package.json` hay `backend/build.gradle`; mọi thứ gói gọn trong `mobile/`.

### 2. Cấu trúc thư mục dự kiến (`mobile/`)
- `mobile/package.json`: Chứa scripts build cho 2 app (`cap:driver`, `cap:staff`).
- `mobile/www/index.html`: Trang fallback/loading nhẹ (bắt buộc bởi Capacitor `webDir`).
- `mobile/apps/driver/capacitor.config.ts` + `mobile/apps/driver/android/`:
  - `appId`: `com.honafresh.driver`
  - `appName`: `HoNa Driver`
  - `server.url`: `http://<SERVER_HOST>:3000/portal/driver` (`cleartext: true`)
- `mobile/apps/staff/capacitor.config.ts` + `mobile/apps/staff/android/`:
  - `appId`: `com.honafresh.staff`
  - `appName`: `HoNa Staff QC`
  - `server.url`: `http://<SERVER_HOST>:3000/portal/warehouse-qc` (`cleartext: true`)

### 3. Quyền Android (`AndroidManifest.xml`)
- `INTERNET`, `ACCESS_NETWORK_STATE`, `CAMERA`, `READ_MEDIA_IMAGES` (hỗ trợ chụp ảnh ePOD / kiểm định QC), `usesCleartextTraffic="true"` (để kết nối được server HTTP local/LAN khi test).

### 4. Backend & Database
- **Backend:** Không thay đổi (`application.properties` đã có sẵn `capacitor://localhost` trong `app.cors.allowed-origins`).
- **Database:** Không thay đổi.

---

## D. API Contract

- 2 ứng dụng Capacitor tái sử dụng 100% API proxy `/api/backend/*` và WebSocket hiện tại của Next.js/Spring Boot.
- **Lưu ý kết nối mạng trên điện thoại thật (`51581ee1`):**
  - Nếu dùng qua cáp USB: chạy `adb reverse tcp:3000 tcp:3000` (app trỏ `http://localhost:3000/...`).
  - Nếu dùng qua WiFi LAN (rút cáp vẫn chạy): app trỏ `http://<IP_LAN_MAY_TINH>:3000/...` (hoặc URL deploy nếu có).

---

## E. Business Flow

1. Người dùng mở app **HoNa Driver** trên điện thoại → WebView Capacitor tải thẳng màn hình `/portal/driver` → Đăng nhập tài khoản Tài xế → Thực hiện nhận chuyến, cập nhật vị trí, chụp ảnh giao hàng & ký nhận ePOD.
2. Người dùng mở app **HoNa Staff QC** trên điện thoại → WebView Capacitor tải thẳng màn hình `/portal/warehouse-qc` → Đăng nhập tài khoản Kho/QC → Thực hiện nhập kho, kiểm tra QC (Brix/Nitrat), xuất kho outbound.

---

## F. Implementation Steps

1. **Bước 1 — Khởi tạo workspace `mobile/`:** Tạo `mobile/package.json` và cài `@capacitor/core`, `@capacitor/cli`, `@capacitor/android`.
2. **Bước 2 — Khởi tạo 2 project Android riêng (`driver` & `staff`):** Cấu hình `capacitor.config.json`, tạo nền tảng `android/` cho từng app, bật `usesCleartextTraffic="true"` và quyền Camera/Internet.
3. **Bước 3 — Build APK bằng Gradle Android (`gradlew assembleDebug`):** Build lần lượt `HoNa Driver` và `HoNa Staff QC`.
4. **Bước 4 — Cài đặt lên điện thoại `51581ee1`:** Chạy `adb -s 51581ee1 install -r <apk>` cho cả 2 app và thiết lập `adb reverse tcp:3000 tcp:3000` (nếu dùng `localhost`).

---

## G. Risks & Considerations

- **Kết nối từ điện thoại tới máy tính:** Trên điện thoại thật, `localhost` mặc định là chính điện thoại chứ không phải máy tính. Dùng `http://<IP_LAN>:3000` (cùng WiFi) hoặc `http://localhost:3000` kết hợp `adb reverse tcp:3000 tcp:3000` (khi cắm USB) sẽ giải quyết triệt để.
- **Thời gian build Gradle Android lần đầu:** Gradle có thể mất 2–5 phút để tải dependencies Android SDK lần đầu tiên.

---

## H. Acceptance Criteria

1. Tạo thành công 2 project Capacitor Android độc lập cho **HoNa Driver** và **HoNa Staff QC**.
2. Build thành công 2 file APK không lỗi.
3. Cài đặt thành công cả 2 app lên thiết bị `51581ee1` đang cắm USB và mở lên hiển thị đúng giao diện từng phân hệ.
