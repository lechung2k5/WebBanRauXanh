# KẾ HOẠCH TRIỂN KHAI: GIÁM SÁT NHIỆT ĐỘ & ĐỘ ẨM KHO LẠNH KẾT NỐI WOKWI (3D DIGITAL TWIN, TRẠM QC & FEFO)

## A. Overview
- **Tên chức năng:** Hệ thống Giám sát Nhiệt độ & Độ ẩm Kho lạnh Thời gian thực (Wokwi IoT + Giả lập Kho + Sơ đồ 3D + Trạm QC & FEFO).
- **Mục tiêu:**
  1. Nhận dữ liệu nhiệt độ (°C) và độ ẩm (%) thời gian thực từ mạch **ESP32 + cảm biến DHT22 trên Wokwi** và từ **bộ giả lập tích hợp trực tiếp trên giao diện Web**.
  2. Đảm bảo kết nối thông suốt giữa Wokwi và Backend ở **cả môi trường Local** (máy cá nhân) lẫn **khi deploy lên Render** (Production) chỉ bằng cấu hình biến môi trường / URL.
  3. Hiển thị trực quan nhiệt độ, độ ẩm, trạng thái bình thường/cảnh báo theo từng khu vực lạnh (`WarehouseZone`) lên **Sơ đồ Kho 3D (`Warehouse3DDigitalTwin`)**, **Trang Quản lý Kho (`/admin/warehouses`)**, và **Trạm QC & Lưu trữ FEFO (`/admin/qc`)**.
  4. Tự động đối chiếu ngưỡng `tempMin`, `tempMax`, `humidityTarget` của từng Zone; cảnh báo tức thì qua WebSocket khi vượt ngưỡng (ảnh hưởng tới lô hàng đang lưu theo FEFO hoặc hàng chờ QC).
- **Phạm vi nghiệp vụ:** Quản lý kho lạnh, Trạm QC, Điều phối FEFO, Admin/Quản lý kho/Nhân viên QC.
- **Kết quả mong muốn:** Dữ liệu từ Wokwi hoặc từ bảng Giả lập trên Web đi vào cùng một luồng Backend, lưu lịch sử, kiểm tra ngưỡng cảnh báo theo Zone và đẩy realtime qua WebSocket lên Sơ đồ 3D, Trạm QC và Bảng FEFO.

---

## B. Current Architecture
- **Frontend hiện có:**
  - `frontend/src/app/admin/warehouses/page.tsx`: Quản lý Hub, Zone (`tempMin`, `tempMax`, `humidityTarget`), Bin và render `<Warehouse3DDigitalTwin />`.
  - `frontend/src/app/admin/qc/page.tsx`: Giao diện 4 bước Trạm tiếp nhận – QC Lab – Lưu trữ FEFO (`FEFO_STORAGE`) – Sẵn sàng xuất kho, cũng sử dụng `<Warehouse3DDigitalTwin />` và `getContractStorageUrgency`.
  - `frontend/src/components/admin/Warehouse3DDigitalTwin.tsx`: Render sơ đồ 3D các Zone, dãy kệ, ô Bin và thông tin FEFO/QR, nhưng chưa có dữ liệu nhiệt độ/độ ẩm live theo Zone.
  - `frontend/src/services/websocketService.ts`: Đã có STOMP WebSocket client (`b2bWebSocket`) kết nối `/ws-b2b`.
- **Backend hiện có:**
  - `WarehouseZone.java`: Đã có sẵn `tempMin`, `tempMax`, `humidityTarget`, `zoneCode`, `zoneName`, `warehouse`.
  - `IotSensorLog.java`: Hiện mới gắn với `B2bContract` / `asset_id` (chỉ phục vụ xe lạnh/đơn hàng), chưa hỗ trợ log cảm biến gắn theo **Kho (`warehouse_id`)** và **Khu vực (`zone_id`)**.
  - `B2bRealtimeService.java`: Đã có `SimpMessagingTemplate` để phát sự kiện realtime `/topic/...`.
  - `SecurityConfig.java`: Chặn JWT trên `/admin/**`, nên cần 1 endpoint ingest riêng cho thiết bị Wokwi xác thực bằng `X-IOT-KEY` (không dùng JWT user).

---

## C. Implementation Scope

### 1. Kiến trúc Kết nối Wokwi (Local & Deploy Render)
Để Wokwi (chạy giả lập ESP32 trên `wokwi.com`) gửi dữ liệu được cho **cả Local và Render** mà không phải sửa code nhiều:

- **Kênh chính (HTTP/HTTPS REST Ingest — Không cần thêm dependency Maven):**
  - ESP32 trên Wokwi đọc cảm biến DHT22 định kỳ (mỗi 3–5 giây) và gọi `POST {SERVER_BASE_URL}/api/v1/iot/warehouse-telemetry` với header `X-IOT-KEY: <key>`.
  - **Khi chạy Local:**
    - Cách 1 (Đơn giản nhất, không cần cài gateway): Mở tunnel tạm cho cổng `8080` bằng `cloudflared tunnel --url http://localhost:8080` (hoặc `ngrok http 8080`), copy URL `https://xxxx.trycloudflare.com` dán vào biến `SERVER_URL` trong code Wokwi.
    - Cách 2 (Không cần tunnel public): Dùng Wokwi IoT Gateway (`wokwigw`) khi chạy Wokwi bản local/VS Code.
  - **Khi deploy lên Render:**
    - Đổi đúng 1 dòng `SERVER_URL = "https://<ten-backend>.onrender.com"` trong sketch Wokwi (Wokwi gọi thẳng HTTPS của Render).
    - Cấu hình biến môi trường `IOT_INGEST_KEY` trên Render giống với key trong sketch Wokwi.
- **Kênh dự phòng / mở rộng (Tùy chọn trong tương lai):** Nếu sau này muốn không cần tunnel ở Local, có thể bổ sung MQTT Broker (HiveMQ Cloud / Mosquitto), tuy nhiên sẽ cần thêm thư viện MQTT vào `build.gradle` (chưa thêm ở phase này theo nguyên tắc không tự ý thêm dependency khi chưa cần thiết).

### 2. Frontend
- **File dự kiến tạo:**
  - `frontend/src/components/admin/WarehouseIotMonitorPanel.tsx`:
    - Hiển thị thông số Nhiệt độ (°C) & Độ ẩm (%) realtime theo từng Zone của kho đang chọn, biểu đồ/lịch sử gần nhất, badge nguồn dữ liệu (`WOKWI` / `SIMULATOR`), trạng thái (`BÌNH THƯỜNG` / `CẢNH BÁO QUÁ NHIỆT` / `CẢNH BÁO ĐỘ ẨM`).
    - Tích hợp **Bộ Giả lập Cảm biến tại Kho hàng**: chọn Zone, kéo thanh trượt Nhiệt độ / Độ ẩm, hoặc bấm nhanh kịch bản (*Chuẩn 3.5°C / 90%*, *Sự cố nóng 11°C*, *Ẩm thấp 72%*), nút bật/tắt tự động phát giả lập định kỳ trên UI để test mà không cần mở Wokwi.
    - Hiển thị hướng dẫn nhanh URL + `X-IOT-KEY` + mẫu JSON để copy vào Wokwi (tự nhận diện `NEXT_PUBLIC_API_URL` đang là Local hay Render).
- **File dự kiến sửa:**
  - `frontend/src/services/fleetDispatchApi.ts`: Thêm DTO `WarehouseZoneTelemetryDto` và các hàm gọi API lấy telemetry theo kho, lịch sử zone, và gửi dữ liệu giả lập.
  - `frontend/src/services/websocketService.ts`: Thêm helper `subscribeWarehouseIot(hubId, callback)` lắng nghe `/topic/warehouse-iot/${hubId}` (và `/topic/warehouse-iot`).
  - `frontend/src/components/admin/Warehouse3DDigitalTwin.tsx`:
    - Nhận thêm prop `zoneTelemetryMap?: Record<string, WarehouseZoneTelemetryDto>`.
    - Hiển thị thẻ cảm biến nổi trực tiếp trên từng Zone trong không gian 3D (nhiệt độ °C, độ ẩm %, chấm nhấp nháy xanh/đỏ khi vượt ngưỡng `tempMin..tempMax` hoặc chênh lệch `humidityTarget`), đổi viền/hiệu ứng cảnh báo khu vực 3D nếu Zone đang bị quá nhiệt!
  - `frontend/src/app/admin/warehouses/page.tsx`:
    - Nhúng `WarehouseIotMonitorPanel`, lắng nghe `subscribeWarehouseIot`, truyền `zoneTelemetryMap` vào `<Warehouse3DDigitalTwin />`.
  - `frontend/src/app/admin/qc/page.tsx`:
    - Hiển thị dải trạng thái nhiệt độ/độ ẩm kho & trạm QC ở đầu trang (`GATE_RECEIVING`, `QC_LAB`, `FEFO_STORAGE`), truyền `zoneTelemetryMap` vào `<Warehouse3DDigitalTwin />` ở tab `FEFO_STORAGE`.
    - Trên bảng **FEFO (`FEFO_STORAGE`)**: hiển thị thêm nhiệt độ/độ ẩm hiện tại của Zone đang chứa lô hàng đó và cảnh báo đỏ nếu Zone đang quá nhiệt có nguy cơ ảnh hưởng hạn sử dụng/chất lượng lô hàng.

### 3. Backend
- **File dự kiến tạo:**
  - `backend/src/main/java/com/btl/webbanrau/model/WarehouseIotLog.java`: Entity lưu log nhiệt độ/độ ẩm theo Kho & Zone.
  - `backend/src/main/java/com/btl/webbanrau/repository/WarehouseIotLogRepository.java`: Truy vấn bản ghi mới nhất theo Zone / lịch sử 50 bản ghi gần nhất theo Hub/Zone.
  - `backend/src/main/java/com/btl/webbanrau/dto/request/WarehouseIotTelemetryRequest.java`: Validate `hubId`, `zoneCode` (hoặc `zoneId`), `deviceId`, `temperature` (-30..70), `humidity` (0..100), `source` (`WOKWI` | `SIMULATOR`).
  - `backend/src/main/java/com/btl/webbanrau/service/WarehouseIotService.java`:
    - Xử lý ingest dữ liệu, tìm `WarehouseHub` và `WarehouseZone` tương ứng.
    - Đối chiếu ngưỡng `zone.tempMin`, `zone.tempMax`, `zone.humidityTarget` (±8% độ ẩm hoặc vượt `tempMin`/`tempMax`) để tính `isAlert` và `alertMessage`.
    - Lưu `WarehouseIotLog` và gọi `B2bRealtimeService.notifyWarehouseIotUpdated(hubId, payload)` bắn WebSocket tới `/topic/warehouse-iot` và `/topic/warehouse-iot/{hubId}`.
  - `backend/src/main/java/com/btl/webbanrau/controller/WarehouseIotController.java`:
    - `POST /iot/warehouse-telemetry` (public endpoint bảo vệ bằng header `X-IOT-KEY` dành cho Wokwi ESP32).
    - `POST /admin/warehouses/{hubId}/iot/simulate` (JWT role `ADMIN`, `WAREHOUSE_MANAGER`, `WAREHOUSE_QC` dành cho nút Giả lập trên Web).
    - `GET /admin/warehouses/{hubId}/iot/latest` & `GET /admin/warehouses/{hubId}/iot/history` (lấy trạng thái mới nhất của tất cả Zone trong kho & lịch sử biểu đồ).
- **File dự kiến sửa:**
  - `backend/src/main/java/com/btl/webbanrau/config/SecurityConfig.java`: Permit `/iot/warehouse-telemetry` (do xác thực riêng bằng `X-IOT-KEY` trong controller/service) và mở quyền `/admin/warehouses/*/iot/**` cho `ADMIN`, `WAREHOUSE_MANAGER`, `WAREHOUSE_QC`.
  - `backend/src/main/java/com/btl/webbanrau/service/B2bRealtimeService.java`: Thêm `notifyWarehouseIotUpdated(Long hubId, Object data)`.
  - `backend/src/main/resources/application.properties`: Thêm cấu hình `app.iot.ingest-key=${IOT_INGEST_KEY:hona-iot-dev-key-2026}`.
- **Tài liệu / Mã mẫu Wokwi:**
  - `docs/wokwi/esp32_dht22_hona_warehouse.ino` + `docs/wokwi/diagram.json`: Code mẫu ESP32 + DHT22 + LED cảnh báo trên Wokwi, chỉ cần đổi `SERVER_URL` giữa Local (tunnel) và Render.

### 4. Database
- **Bảng mới:** `warehouse_iot_logs`
  - `id` (BIGSERIAL PK)
  - `warehouse_id` (BIGINT NOT NULL, FK -> `warehouse_hubs.id`)
  - `zone_id` (BIGINT NULL, FK -> `warehouse_zones.id`)
  - `zone_code` (VARCHAR(30))
  - `device_id` (VARCHAR(64)) — ví dụ `WOKWI-ESP32-Z1` hoặc `WEB-SIMULATOR`
  - `source` (VARCHAR(20)) — `WOKWI` | `SIMULATOR`
  - `temperature` (NUMERIC(5,2) NOT NULL)
  - `humidity` (NUMERIC(5,2) NOT NULL)
  - `is_alert` (BOOLEAN NOT NULL DEFAULT FALSE)
  - `alert_message` (VARCHAR(255))
  - `recorded_at` (TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP)
- **Migration:** Tạo file Flyway mới `V...__create_warehouse_iot_logs.sql` (an toàn, không ảnh hưởng dữ liệu bảng hiện có; `spring.jpa.hibernate.ddl-auto=update` cũng tương thích).

---

## D. API Contract

### 1. Ingest dữ liệu từ Wokwi ESP32
- **Method & Endpoint:** `POST /api/v1/iot/warehouse-telemetry`
- **Auth:** Header `X-IOT-KEY: <IOT_INGEST_KEY>` (trả `401` nếu sai hoặc thiếu).
- **Request Body:**
```json
{
  "hubId": 2,
  "zoneCode": "ZONE-A",
  "deviceId": "WOKWI-ESP32-01",
  "temperature": 3.8,
  "humidity": 89.5,
  "source": "WOKWI"
}
```
- **Response `200 OK`:**
```json
{
  "code": 200,
  "message": "Đã ghi nhận dữ liệu cảm biến kho",
  "result": {
    "id": 101,
    "hubId": 2,
    "zoneId": 5,
    "zoneCode": "ZONE-A",
    "zoneName": "Buồng Lạnh Rau Lá",
    "deviceId": "WOKWI-ESP32-01",
    "source": "WOKWI",
    "temperature": 3.8,
    "humidity": 89.5,
    "tempMin": 2.0,
    "tempMax": 6.0,
    "humidityTarget": 90,
    "alert": false,
    "alertMessage": null,
    "recordedAt": "2026-11-26T14:55:00"
  }
}
```
- **Error Responses:** `400` (sai định dạng/vượt biên nhiệt độ -30..70 hoặc độ ẩm 0..100), `401` (sai `X-IOT-KEY`), `404` (không tìm thấy `hubId`).

### 2. Giả lập cảm biến từ Giao diện Kho hàng
- **Method & Endpoint:** `POST /api/v1/admin/warehouses/{hubId}/iot/simulate`
- **Auth:** Bearer JWT (`ADMIN`, `WAREHOUSE_MANAGER`, `WAREHOUSE_QC`).
- **Request Body:** `{ "zoneCode": "ZONE-A", "temperature": 9.5, "humidity": 78.0 }`
- **Response `200 OK`:** Cấu trúc giống endpoint ingest, với `source = "SIMULATOR"` và `alert = true` nếu vượt ngưỡng Zone.

### 3. Lấy dữ liệu mới nhất & Lịch sử theo Kho
- `GET /api/v1/admin/warehouses/{hubId}/iot/latest`: Trả về danh sách trạng thái mới nhất cho từng `WarehouseZone` thuộc `hubId`.
- `GET /api/v1/admin/warehouses/{hubId}/iot/history?zoneCode=ZONE-A&limit=30`: Trả về lịch sử 30 mẫu gần nhất để vẽ trend nhiệt độ/độ ẩm.

### 4. WebSocket Realtime Topic
- **Topic:** `/topic/warehouse-iot/{hubId}` (và `/topic/warehouse-iot`).
- **Payload:** `{ "action": "TELEMETRY_UPDATED", "hubId": 2, "reading": { ... } }`.

---

## E. Business Flow
1. **Nguồn dữ liệu 1 (Wokwi ESP32):** Cảm biến DHT22 trên Wokwi đọc `temperature`, `humidity` → ESP32 gửi HTTP/HTTPS `POST /api/v1/iot/warehouse-telemetry` kèm `X-IOT-KEY`.
2. **Nguồn dữ liệu 2 (Giả lập tại Kho hàng trên Web):** Nhân viên kho / QC kéo thanh nhiệt độ, độ ẩm hoặc chọn kịch bản lỗi → Frontend gọi `POST /api/v1/admin/warehouses/{hubId}/iot/simulate`.
3. **Xử lý Backend (`WarehouseIotService`):**
   - Kiểm tra `WarehouseZone` tương ứng trong `hubId`.
   - So sánh `temperature` với `[zone.tempMin, zone.tempMax]` và `humidity` với `zone.humidityTarget ± 8%`.
   - Nếu vượt ngưỡng: đánh dấu `isAlert = true`, sinh `alertMessage` cụ thể (ví dụ: *"Nhiệt độ 9.5°C vượt ngưỡng tối đa 6.0°C tại ZONE-A"*).
   - Lưu vào `warehouse_iot_logs` và phát STOMP WebSocket `/topic/warehouse-iot/{hubId}`.
4. **Hiển thị Realtime trên Frontend:**
   - **Sơ đồ 3D (`Warehouse3DDigitalTwin`):** Zone cập nhật ngay nhiệt độ/độ ẩm trên nhãn 3D; nếu `alert = true`, Zone nhấp nháy cảnh báo đỏ.
   - **Trạm QC (`/admin/qc` - `GATE_RECEIVING` & `QC_LAB`):** Hiển thị nhiệt độ hiện tại của buồng lạnh đích để QC đối chiếu trước khi đưa hàng vào kệ.
   - **Bảng FEFO (`/admin/qc` - `FEFO_STORAGE`):** Mỗi lô hàng hiển thị thêm trạng thái nhiệt độ/độ ẩm của Zone đang lưu trữ; nếu Zone quá nhiệt, cảnh báo ưu tiên kiểm tra/xuất sớm.

---

## F. Implementation Steps
1. **Database & Backend Core:** Tạo migration `warehouse_iot_logs`, entity `WarehouseIotLog`, repository `WarehouseIotLogRepository`, DTO `WarehouseIotTelemetryRequest`.
2. **Backend Service & Realtime:** Implement `WarehouseIotService`, bổ sung `notifyWarehouseIotUpdated` trong `B2bRealtimeService`.
3. **Backend Controller & Security:** Tạo `WarehouseIotController`, cập nhật `SecurityConfig` và `application.properties` (`IOT_INGEST_KEY`).
4. **Frontend API & WebSocket:** Cập nhật `fleetDispatchApi.ts` và `websocketService.ts` (`subscribeWarehouseIot`).
5. **Frontend UI & 3D Digital Twin:** Tạo `WarehouseIotMonitorPanel.tsx` (kèm bộ giả lập & hướng dẫn nối Wokwi), nâng cấp `Warehouse3DDigitalTwin.tsx`, tích hợp vào `/admin/warehouses` và `/admin/qc` (Trạm QC + FEFO).
6. **Wokwi Sketch & Guide:** Tạo file sketch mẫu `docs/wokwi/esp32_dht22_hona_warehouse.ino` + `diagram.json` sẵn sàng nạp lên wokwi.com cho cả Local (tunnel) và Render.

---

## G. Risks & Considerations
- **Local ↔ Wokwi connectivity:** `wokwi.com` chạy trên cloud nên không gọi thẳng `http://localhost:8080` được nếu không có tunnel (`cloudflared`/`ngrok`) hoặc `wokwigw`. Cần ghi rõ hướng dẫn 1 lệnh mở tunnel trong panel để chạy Local mượt ngay.
- **Render Cold Start & Timeout:** Render gói miễn phí có thể sleep sau 15 phút không có request; ESP32 trên Wokwi nên đặt HTTP timeout >= 10s và retry nhẹ khi kết nối lần đầu.
- **Bảo mật endpoint IoT:** Endpoint `/iot/warehouse-telemetry` không dùng JWT nên bắt buộc kiểm tra `X-IOT-KEY` (và không để lộ secret thật của Production trong repo; dùng env `IOT_INGEST_KEY`).
- **Tài nguyên & Lưu lượng DB:** Nếu Wokwi gửi liên tục mỗi 3–5 giây, chỉ query tối đa 30–50 log gần nhất cho biểu đồ và có thể giới hạn khoảng thời gian gửi (ví dụ 5 giây/lần hoặc khi thay đổi >= 0.2°C) để tiết kiệm DB trên Render.

---

## H. Acceptance Criteria
1. Có thể gửi dữ liệu nhiệt độ/độ ẩm từ **Wokwi ESP32** (qua tunnel ở Local hoặc URL HTTPS khi deploy Render) và nhận phản hồi `200 OK` khi đúng `X-IOT-KEY` (`401` nếu sai key).
2. Có thể thao tác **Giả lập cảm biến ngay trên giao diện Kho hàng** (chọn Zone, chỉnh nhiệt độ/độ ẩm, kích hoạt cảnh báo).
3. **Sơ đồ 3D (`Warehouse3DDigitalTwin`)**, **Trang Kho (`/admin/warehouses`)**, **Trạm QC & Bảng FEFO (`/admin/qc`)** cập nhật nhiệt độ, độ ẩm và cảnh báo vượt ngưỡng **realtime qua WebSocket** mà không cần F5 trang.
4. Khi vượt ngưỡng `tempMin`/`tempMax` hoặc độ ẩm của Zone, hệ thống hiển thị cảnh báo rõ ràng trên Zone 3D và các lô hàng liên quan trong bảng FEFO.
