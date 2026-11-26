# KẾ HOẠCH TRIỂN KHAI: HỢP ĐỒNG VẬN CHUYỂN (TRƯỚC KHI XUẤT BẾN) & KÝ TÊN CHỤP ẢNH BÀN GIAO (ePOD)

---

## A. Overview

- **Tên chức năng:** **Hợp đồng vận chuyển có ký tên 2 bên trước khi xuất bến** và **Ký tên + Chụp/Upload ảnh bàn giao giữa Tài xế & Người mua (Buyer) khi giao hàng**.
- **Mục tiêu:**
  1. **Trước khi Xuất Bến (`/admin/outbound-dispatch`):**
     - Khi bấm **Xuất Bến** trên một chuyến xe đang `ASSIGNED`, hệ thống mở **Modal Hợp Đồng Vận Chuyển & Biên Bản Giao Nhận Xuất Kho**:
       - Hiển thị đầy đủ nội dung **Hợp đồng vận chuyển** (Mã chuyến, Kho xuất phát, Xe & Tài xế phụ trách, Danh sách các đơn/thùng/kg, Nhiệt độ bảo quản quy định, Trách nhiệm pháp lý bên giao & bên vận chuyển).
       - Bắt buộc có **Tên + Chữ ký điện tử (vẽ tay `SignaturePad`) của Người giao hàng (Thủ kho / Điều phối viên)** và **Tên + Chữ ký điện tử của Người nhận vận chuyển (Tài xế)** + **Ảnh niêm phong thùng xe / hàng lên xe (`ImageUploadField`)** trước khi xác nhận xuất bến.
  2. **Khi Tài xế tới điểm giao hàng cho Người mua (Nộp ePOD & Buyer Ký Nhận):**
     - Trong Modal **Nộp ePOD** (phía Tài xế / Admin) và **Ký Nhận ePOD** (phía Buyer trong **Quản lý hợp đồng**):
       - Thay thế chữ ký/ảnh mẫu cứng bằng **`SignaturePad` (ký tên trực tiếp bằng chuột/cảm ứng)** cho cả **Người vận chuyển (Tài xế)** và **Người mua (Buyer)**.
       - Bổ sung **`ImageUploadField`** để **chụp / upload ảnh bàn giao thực tế giữa người vận chuyển và người mua** lên hệ thống.
       - Lưu đầy đủ chữ ký 2 bên & ảnh bàn giao vào DB để xem lại minh bạch ở cả Admin, Buyer và Farmer.

---

## B. Current Architecture

- **Backend hiện có:**
  - `OutboundDeliveryTrip`: Chưa có các trường lưu hợp đồng vận chuyển trước khi xuất bến (`dispatcherName`, `dispatcherSignatureData`, `driverPickupSignatureData`, `departurePhotoUrl`, `transportContractCode`, `transportContractSignedAt`).
  - `OutboundDeliveryStop`: Đã có sẵn `driverSignatureData`, `buyerSignatureData`, `handoverPhotoUrl`, `driverNotes`, `buyerNotes`, `buyerSignerName`, `buyerSignerPhone`.
  - `UploadController` (`/uploads`): Đã có sẵn API upload ảnh lên Cloudinary.
- **Frontend hiện có:**
  - `SignaturePad` (trong `frontend/src/components/admin/AdminConsole.tsx`): Đã có sẵn component vẽ chữ ký điện tử trên HTML5 Canvas.
  - `ImageUploadField` (trong `frontend/src/components/ImageUploadField.tsx`): Đã có sẵn component chọn/chụp và upload ảnh.
  - `outbound-dispatch/page.tsx`: Nút **Xuất Bến** hiện gọi thẳng `departOutboundTrip(tripId)` không qua bước ký Hợp đồng vận chuyển; Modal **Nộp ePOD** đang hardcode chữ ký base64 và URL ảnh mẫu.
  - `BuyerManagementConsole.tsx`: Modal **Ký Nhận ePOD** hiện mới nhập text/chữ ký mẫu, cần tích hợp `SignaturePad` thật (và hiển thị ảnh bàn giao từ tài xế).

---

## C. Implementation Scope

### Backend
1. **`backend/src/main/java/com/btl/webbanrau/model/OutboundDeliveryTrip.java`:**
   - Thêm các cột lưu Hợp đồng vận chuyển trước khi xuất bến:
     - `transportContractCode` (`String`, VD: `HDVC-OUT-...`)
     - `dispatcherName` (`String`)
     - `dispatcherSignatureData` (`TEXT`)
     - `driverPickupSignatureData` (`TEXT`)
     - `departurePhotoUrl` (`TEXT`)
     - `transportContractSignedAt` (`LocalDateTime`)
2. **`backend/src/main/java/com/btl/webbanrau/dto/request/DepartOutboundTripRequest.java` (tạo mới, các field optional để tương thích backward nếu gọi không body):**
   - `dispatcherName`, `dispatcherSignatureData`, `driverPickupSignatureData`, `departurePhotoUrl`, `notes`.
3. **`backend/src/main/java/com/btl/webbanrau/service/OutboundDeliveryExecutionService.java`:**
   - Cập nhật `driverDepartTrip(Long tripId, DepartOutboundTripRequest req, String driverPhone, boolean isAdmin)`:
     - Kiểm tra hợp đồng vận chuyển khi có `req` (lưu `dispatcherName`, `dispatcherSignatureData`, `driverPickupSignatureData`, `departurePhotoUrl`, sinh `transportContractCode`, `transportContractSignedAt = now`).
     - Các logic chuyển `ON_DELIVERY`, `IN_TRANSIT`, GPS, WebSocket giữ nguyên.
4. **`backend/src/main/java/com/btl/webbanrau/controller/AdminOutboundDispatchController.java` & `DriverOutboundController.java`:**
   - Cập nhật `@PostMapping("/trips/{tripId}/depart")` nhận `@RequestBody(required = false) DepartOutboundTripRequest req`.

### Frontend
1. **`frontend/src/services/fleetDispatchApi.ts`:**
   - Cập nhật `OutboundDeliveryTripDto` thêm các trường hợp đồng vận chuyển (`transportContractCode`, `dispatcherName`, `dispatcherSignatureData`, `driverPickupSignatureData`, `departurePhotoUrl`, `transportContractSignedAt`).
   - Cập nhật `departOutboundTrip(tripId, data?)` nhận payload hợp đồng vận chuyển.
2. **`frontend/src/app/admin/outbound-dispatch/page.tsx`:**
   - Khi bấm **Xuất Bến**, mở **Modal Hợp Đồng Vận Chuyển & Ký Tên Trước Khi Xuất Bến**:
     - Hiển thị điều khoản Hợp đồng vận chuyển (Bên A: Kho HoNa Fresh, Bên B: Tài xế & Xe lạnh, Bảng kê các lô hàng/số thùng/kg).
     - Ô nhập tên + **`SignaturePad` của Người giao (Thủ kho / Điều phối viên)**.
     - Ô hiển thị tên + **`SignaturePad` của Người nhận vận chuyển (Tài xế)**.
     - **`ImageUploadField`** chụp/upload ảnh bàn giao niêm phong lên xe trước khi xuất bến.
     - Nút **"Ký Hợp Đồng Vận Chuyển & Xác Nhận Xuất Bến"** (yêu cầu đủ 2 chữ ký).
   - Cập nhật Modal **Nộp ePOD** (`driverEpodStop`):
     - Bổ sung **`SignaturePad`** cho Tài xế ký trực tiếp (thay cho chuỗi base64 cứng).
     - Bổ sung **`ImageUploadField`** để chụp/tải ảnh bàn giao giữa người vận chuyển & người mua (thay cho URL mẫu cứng).
   - Bổ sung nút **"HĐ Vận Chuyển"** trên các chuyến đã xuất bến để xem/in lại Hợp đồng vận chuyển đã ký 2 bên bất cứ lúc nào.
3. **`frontend/src/components/buyer/BuyerManagementConsole.tsx`:**
   - Trong Modal **Kiểm Đếm & Ký Nhận ePOD** (`activeEpodModalStop`):
     - Hiển thị **Ảnh bàn giao** & **Chữ ký của Tài xế** đã nộp.
     - Bổ sung **`SignaturePad`** cho **Người mua (Buyer)** ký tên trực tiếp (thay cho text cứng).
     - Cho phép Buyer chụp/upload bổ sung ảnh nhận hàng nếu cần (hoặc xác nhận ảnh bàn giao chung giữa tài xế và người mua).

### Database
- Hibernate `ddl-auto=update` tự thêm các cột mới vào `outbound_delivery_trips` (không ảnh hưởng dữ liệu cũ).

---

## D. API Contract

1. **Xuất bến kèm Hợp đồng vận chuyển đã ký 2 bên**
   - `POST /admin/outbound-dispatch/trips/{tripId}/depart` (`ROLE_ADMIN`)
   - Body (`DepartOutboundTripRequest`):
     ```json
     {
       "dispatcherName": "Nguyễn Văn Thủ Kho",
       "dispatcherSignatureData": "data:image/png;base64,...",
       "driverPickupSignatureData": "data:image/png;base64,...",
       "departurePhotoUrl": "https://res.cloudinary.com/..."
     }
     ```
   - Response `200 OK`: `OutboundDeliveryTrip` kèm đầy đủ `transportContractCode`, chữ ký & ảnh xuất bến.
2. **Nộp ePOD (Tài xế) & Ký nhận ePOD (Buyer):**
   - Dùng nguyên API `POST /admin/outbound-dispatch/stops/{stopId}/submit-epod` và `POST /buyer/outbound-deliveries/stops/{stopId}/confirm-epod` với `driverSignatureData`, `buyerSignatureData`, `handoverPhotoUrl` thật từ `SignaturePad` & `ImageUploadField`.

---

## E. Business Flow

1. Điều phối viên ghép chuyến (`ASSIGNED`) $\rightarrow$ Bấm **Xuất Bến** $\rightarrow$ Mở **Hợp đồng vận chuyển** $\rightarrow$ Thủ kho (Người giao) & Tài xế (Người nhận) cùng ký tên + chụp ảnh niêm phong xe $\rightarrow$ Bấm **Ký Hợp Đồng & Xuất Bến** $\rightarrow$ Chuyến chuyển `ON_DELIVERY`, Buyer & Farmer thấy ngay `IN_TRANSIT` + GPS.
2. Xe tới kho Buyer (**Đã Tới Điểm**) $\rightarrow$ Tài xế bấm **Nộp ePOD**: nhập kg thực giao, **ký tên `SignaturePad`**, **chụp/upload ảnh bàn giao cùng người mua** $\rightarrow$ Chuyển `PENDING_BUYER_CONFIRMATION`.
3. Buyer mở **Quản lý hợp đồng** $\rightarrow$ Bấm **Kiểm Đếm & Ký Nhận ePOD**: xem ảnh bàn giao & chữ ký tài xế, **ký tên `SignaturePad` của người mua** $\rightarrow$ Chốt `BUYER_CONFIRMED` / `DELIVERED` $\rightarrow$ Giải phóng xe & quyết toán 70%.

---

## F. Implementation Steps

1. Cập nhật Backend: `OutboundDeliveryTrip.java`, tạo `DepartOutboundTripRequest.java`, cập nhật `OutboundDeliveryExecutionService.java`, `AdminOutboundDispatchController.java`, `DriverOutboundController.java`.
2. Cập nhật `fleetDispatchApi.ts`.
3. Cập nhật `outbound-dispatch/page.tsx`: Modal Hợp đồng vận chuyển ký 2 bên trước khi xuất bến + Modal xem lại HĐ vận chuyển + `SignaturePad` & `ImageUploadField` trong Modal Nộp ePOD.
4. Cập nhật `BuyerManagementConsole.tsx`: tích hợp `SignaturePad` thật và hiển thị ảnh bàn giao trong Modal Ký nhận ePOD của Buyer.
5. Kiểm tra biên dịch Backend & Frontend.

---

## G. Risks & Considerations

- **Component dùng chung:** Tái sử dụng `SignaturePad` từ `AdminConsole.tsx` và `ImageUploadField` từ `ImageUploadField.tsx` (kiểm tra `ImageUploadField` hoạt động với cả role `ADMIN` và `BUYER` qua `/uploads`).
- **Dung lượng chữ ký base64:** Ảnh chữ ký PNG trên canvas `600x180` có kích thước nhỏ (~5–15 KB), lưu tốt trong cột `TEXT` của PostgreSQL.

---

## H. Acceptance Criteria

1. Bấm **Xuất Bến** bắt buộc mở Hợp đồng vận chuyển, có đủ chữ ký **Người giao** và **Người nhận (Tài xế)** + ảnh bàn giao trước khi xuất bến; xem lại được Hợp đồng vận chuyển đã ký.
2. Khi **Nộp ePOD**, tài xế ký tên trực tiếp trên Canvas và upload ảnh chụp bàn giao giữa người vận chuyển & người mua.
3. Khi **Buyer ký nhận ePOD**, Buyer xem được ảnh/chữ ký tài xế và ký tên trực tiếp trên Canvas để chốt đơn `DELIVERED`.
