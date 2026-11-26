# Hướng Dẫn Kết Nối Wokwi ESP32 Giám Sát Kho Lạnh (Local & Render)

## 1. Các file cấu hình Wokwi
- **Code ESP32:** [esp32_dht22_hona_warehouse.ino](./esp32_dht22_hona_warehouse.ino)
- **Sơ đồ mạch:** [diagram.json](./diagram.json)
- **Thư viện (`libraries.txt`):**
  ```text
  DHT sensor library
  Adafruit Unified Sensor
  LiquidCrystal I2C
  ```

## 2. Endpoint & Xác thực Backend
- **Method & Path:** `POST /api/v1/iot/warehouse-telemetry`
- **Header:**
  - `Content-Type: application/json`
  - `X-IOT-KEY: <IOT_INGEST_KEY>` (mặc định dev: `hona-iot-dev-key-2026`, cấu hình trong `application.properties` qua `app.iot.ingest-key=${IOT_INGEST_KEY:...}`)
- **Payload mẫu:**
  ```json
  {
    "hubId": 2,
    "zoneCode": "ZONE-A",
    "deviceId": "WOKWI-ESP32-DHT22-01",
    "source": "WOKWI",
    "temperature": 3.8,
    "humidity": 90.0
  }
  ```

## 3. Chạy ở môi trường Local (Windows)
Do trình giả lập `wokwi.com` chạy trên cloud nên không gọi trực tiếp vào `http://localhost:8080` được. Cần mở một tunnel trỏ vào cổng `8080`:

### Cách A: Pinggy HTTP Tunnel (Khuyên dùng, không cần cài thêm phần mềm)
```powershell
ssh -p 443 -R0:localhost:8080 a.pinggy.io
```
- Lần đầu hỏi fingerprint: gõ `yes` rồi Enter (nếu hỏi password: nhấn Enter bỏ qua).
- Lấy URL `http://xxxx.a.free.pinggy.link` (dùng `http://` để không vướng SSL handshake trên ESP32) dán vào `SERVER_BASE_URL` trong `esp32_dht22_hona_warehouse.ino`.

### Cách B: Cloudflare Tunnel
```powershell
Invoke-WebRequest -Uri "https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe" -OutFile "$env:TEMP\cloudflared.exe"
& "$env:TEMP\cloudflared.exe" tunnel --url http://localhost:8080
```
- Dán URL `https://xxxx.trycloudflare.com` vào `SERVER_BASE_URL`.

## 4. Khi Deploy lên Render
1. Cấu hình biến môi trường `IOT_INGEST_KEY` trên Render Backend (nếu muốn đổi key riêng).
2. Trong `esp32_dht22_hona_warehouse.ino`, đổi đúng 1 dòng:
   ```cpp
   const char* SERVER_BASE_URL = "https://<ten-backend-cua-ban>.onrender.com";
   ```
3. (Nếu đổi key) cập nhật `IOT_INGEST_KEY` trong sketch khớp với Render.

## 5. Tham chiếu `HUB_ID` và `ZONE_CODE`
- `HUB_ID = 1`: Tổng Kho Chuỗi Lạnh Củ Chi (Hub TP.HCM)
- `HUB_ID = 2`: Trạm Trung Chuyển Đức Trọng (Hub Lâm Đồng)
- `HUB_ID = 3`: Trạm Trung Chuyển Cái Bè (Hub ĐBSCL)
- `ZONE_CODE`: `ZONE-A`, `ZONE-B`, `ZONE-C` (theo cấu hình Zone của từng kho).
