# KẾ HOẠCH TRIỂN KHAI: ĐỒNG BỘ XUẤT BẾN REAL-TIME & BẢN ĐỒ THEO DÕI GPS TÀI XẾ CHO BUYER VÀ FARMER

---

## A. Overview

- **Tên chức năng:** Đồng bộ trạng thái **Đang Giao Hàng (`IN_TRANSIT`)** ngay lập tức lên cổng **Buyer** và **Farmer** khi Admin/Tài xế bấm **Xuất Bến**, kèm **Bản đồ lộ trình đường đi dựa trên GPS của tài xế**.
- **Mục tiêu:**
  1. Sửa lỗi phân quyền khi Admin bấm **Xuất Bến** trên `/admin/outbound-dispatch` (hiện đang gọi API chỉ cho `ROLE_DRIVER`).
  2. Bổ sung lưu trữ tọa độ **GPS hiện tại của chuyến xe/tài xế** (`currentLat`, `currentLng`, `gpsUpdatedAt`) trên `OutboundDeliveryTrip` (sẵn sàng cho App Tài xế gửi GPS định kỳ sau này) và khởi tạo tọa độ xuất phát tại Hub ngay khi bấm **Xuất Bến**.
  3. Khi bấm **Xuất Bến**, đồng bộ trạng thái `IN_TRANSIT` + thông tin xe/tài xế/GPS ngay lập tức sang cả **Buyer** và **Farmer** qua API & WebSocket.
  4. Hiển thị trực quan **Bản đồ lộ trình đường bộ ngắn nhất** (Hub → Vị trí GPS hiện tại của tài xế → Kho Buyer) ngay trên thẻ đơn hàng của **Buyer** và **Farmer**.

---

## B. Current Architecture

- **Backend hiện có:**
  - `OutboundDeliveryExecutionService.driverDepartTrip`: Đã cập nhật `trip.status = "ON_DELIVERY"`, `contract.status = "IN_TRANSIT"`, `contract.fulfillmentStatus = "IN_TRANSIT"` và bắn `b2bRealtimeService.notifyContractUpdated("IN_TRANSIT", ...)`.
  - `DriverOutboundController`: Đang khóa `@PreAuthorize("hasRole('DRIVER')")`, khiến Admin bấm **Xuất Bến** từ `/admin/outbound-dispatch` bị từ chối quyền.
  - `OutboundDeliveryTrip`: Chưa có cột lưu tọa độ GPS hiện tại của tài xế (`current_lat`, `current_lng`, `gps_updated_at`).
  - `BuyerWorkflowService.contracts()` & `FarmerService.mapToContractResponse()`: Chưa trả về tọa độ GPS tài xế hiện tại từ chuyến Outbound đang chạy.
- **Frontend hiện có:**
  - `GoongMapViewer.tsx`: Đã hỗ trợ MapLibre GL JS + Goong Maps + `getRouteDirections`, nhưng chưa có marker `currentPosition` (vị trí GPS hiện tại của tài xế trên tuyến đường) và chưa sửa lỗi `decodePolyline` `[lng, lat]`.
  - `BuyerManagementConsole.tsx` & `FarmerOrderManagementView.tsx`: Chưa nhúng bản đồ theo dõi GPS tài xế trực tiếp cho đơn hàng `IN_TRANSIT` sau khi xuất bến.

---

## C. Implementation Scope

### Backend
1. **`backend/src/main/java/com/btl/webbanrau/model/OutboundDeliveryTrip.java`:**
   - Thêm 3 cột: `currentLat` (`Double`), `currentLng` (`Double`), `gpsUpdatedAt` (`LocalDateTime`).
2. **`backend/src/main/java/com/btl/webbanrau/service/OutboundDeliveryExecutionService.java`:**
   - Trong `driverDepartTrip`: Khởi tạo `currentLat` / `currentLng` theo tọa độ Hub xuất phát (nếu chưa có), cập nhật `gpsUpdatedAt = now`, đồng thời lưu `outboundTruckPlate`, `outboundDriverName`, `outboundDispatchedAt` lên `B2bContract` để Buyer/Farmer hiển thị đủ thông tin xe & tài xế.
   - Bổ sung `updateTripGps(Long tripId, Double lat, Double lng)`: Cập nhật tọa độ GPS mới của tài xế và bắn WebSocket `TRIP_GPS_UPDATED` + `IN_TRANSIT` tới Admin, Buyer và Farmer (sẵn sàng cho App Tài xế gọi sau này).
3. **`backend/src/main/java/com/btl/webbanrau/controller/AdminOutboundDispatchController.java` & `DriverOutboundController.java`:**
   - Thêm vào `AdminOutboundDispatchController`:
     - `POST /admin/outbound-dispatch/trips/{tripId}/depart` (cho phép Admin bấm Xuất Bến trực tiếp)
     - `POST /admin/outbound-dispatch/trips/{tripId}/gps` (cập nhật/giả lập GPS tài xế)
   - Thêm vào `DriverOutboundController`:
     - `POST /driver/outbound-trips/{tripId}/gps` (để App Tài xế gửi tọa độ GPS thực tế sau này).
4. **`backend/src/main/java/com/btl/webbanrau/service/BuyerWorkflowService.java` & `FarmerService.java`:**
   - Bổ sung trả về `driverGpsLat`, `driverGpsLng`, `driverGpsUpdatedAt`, `outboundTripCode`, `outboundDriverName`, `outboundTruckPlate`, `hubName`, `deliveryAddress` trong dữ liệu hợp đồng trả về cho Buyer và Farmer (lấy từ `outbound_delivery_stops` JOIN `outbound_delivery_trips` đang active).

### Frontend
1. **`frontend/src/services/fleetDispatchApi.ts`:**
   - Cập nhật `departOutboundTrip(tripId)` gọi `admin/outbound-dispatch/trips/${tripId}/depart` (fallback `driver/outbound-trips/${tripId}/depart`).
   - Thêm `updateTripGps(tripId, lat, lng)`.
2. **`frontend/src/components/common/GoongMapViewer.tsx`:**
   - Sửa `decodePolyline` dùng đúng `[lng, lat]` và fallback OSRM khi cần để luôn vẽ đường bộ ngắn nhất (không vẽ đường chim bay).
   - Bổ sung prop `currentPosition?: { lat: number; lng: number; updatedAt?: string }` để vẽ marker **Xe tài xế đang di chuyển (🚚 GPS Live)** tại đúng tọa độ GPS tài xế.
3. **`frontend/src/components/buyer/BuyerManagementConsole.tsx` & `frontend/src/app/portal/farmer/components/FarmerOrderManagementView.tsx`:**
   - Lắng nghe WebSocket sự kiện `IN_TRANSIT` / `DISPATCH` / `TRIP_GPS_UPDATED` để tự động cập nhật trạng thái đơn hàng ngay khi Admin bấm **Xuất Bến** (không cần reload trang).
   - Khi đơn hàng ở trạng thái `IN_TRANSIT` / `OUTBOUND_DISPATCHED`, hiển thị khung **"Đang Giao Hàng · Theo Dõi Lộ Trình GPS Tài Xế"** kèm `<GoongMapViewer>` vẽ đường đi từ Hub → Vị trí GPS tài xế → Kho Buyer (geocode địa chỉ Buyer và vị trí Hub tương ứng).

### Database
- Hibernate `ddl-auto=update` sẽ tự thêm 3 cột `current_lat`, `current_lng`, `gps_updated_at` vào bảng `outbound_delivery_trips` (không làm mất dữ liệu cũ).

---

## D. API Contract

1. **Admin xuất bến chuyến Outbound**
   - `POST /admin/outbound-dispatch/trips/{tripId}/depart` (`ROLE_ADMIN`)
   - Response `200 OK`: `OutboundDeliveryTrip` (`status: "ON_DELIVERY"`, `currentLat`, `currentLng`, `gpsUpdatedAt`).
2. **Cập nhật tọa độ GPS tài xế (dùng cho App Tài xế sau này & Admin test GPS)**
   - `POST /driver/outbound-trips/{tripId}/gps` (`ROLE_DRIVER`) & `POST /admin/outbound-dispatch/trips/{tripId}/gps` (`ROLE_ADMIN`)
   - Body: `{ "lat": 11.5234, "lng": 107.8123 }`
   - Response `200 OK`: `{ "tripId": 1, "lat": 11.5234, "lng": 107.8123, "gpsUpdatedAt": "..." }`.

---

## E. Business Flow

1. Admin bấm **Xuất Bến** tại `/admin/outbound-dispatch` → Backend chuyển chuyến sang `ON_DELIVERY`, gán GPS ban đầu tại Hub, chuyển toàn bộ hợp đồng thuộc chuyến sang `IN_TRANSIT`, bắn WebSocket real-time.
2. Cổng **Buyer** và **Farmer** nhận sự kiện WebSocket ngay lập tức → Tự động cập nhật hợp đồng sang mốc **5 — Đang giao hàng** (`Xe Lạnh Đang Vận Chuyển Tới Kho Buyer`) và hiển thị **Bản đồ lộ trình đường đi** dựa trên GPS tài xế + điểm nhận hàng Buyer.
3. Khi App Tài xế (làm sau) gửi tọa độ GPS mới lên `/driver/outbound-trips/{tripId}/gps`, vị trí xe 🚚 trên bản đồ của Admin, Buyer và Farmer tự động di chuyển theo thời gian thực.

---

## F. Implementation Steps

1. Cập nhật `OutboundDeliveryTrip.java`, `OutboundDeliveryExecutionService.java`, `AdminOutboundDispatchController.java`, `DriverOutboundController.java`.
2. Cập nhật `BuyerWorkflowService.java` và `FarmerService.java` để trả kèm tọa độ GPS tài xế (`driverGpsLat`, `driverGpsLng`, `driverGpsUpdatedAt`) và thông tin xe/tài xế Outbound.
3. Cập nhật `fleetDispatchApi.ts`, `GoongMapViewer.tsx`, `BuyerManagementConsole.tsx`, `FarmerOrderManagementView.tsx`.
4. Kiểm tra biên dịch Backend & Frontend.

---

## G. Risks & Considerations

- **Phân quyền:** Tách rõ endpoint `/admin/outbound-dispatch/trips/{tripId}/depart` cho Admin để không bị 403 khi gọi nhầm endpoint của Driver.
- **Tọa độ GPS khi chưa có App Tài xế:** Khi mới xuất bến, GPS khởi tạo ngay tại tọa độ Hub; nếu địa chỉ Buyer là chuỗi văn bản, Frontend geocode qua Goong API (có cache) để vẽ đúng tuyến đường bộ ngắn nhất.

---

## H. Acceptance Criteria

1. Admin bấm **Xuất Bến** thành công (không bị 403), hợp đồng chuyển ngay sang `IN_TRANSIT`.
2. Không cần tải lại trang, cả **Buyer** và **Farmer** hiển thị ngay trạng thái **Đang giao hàng** kèm thông tin xe/tài xế.
3. Trên cả Buyer và Farmer đều xem được **Bản đồ lộ trình đường bộ** từ vị trí GPS tài xế đến điểm giao hàng Buyer.
