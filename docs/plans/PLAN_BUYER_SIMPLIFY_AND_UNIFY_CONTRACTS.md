# KẾ HOẠCH TRIỂN KHAI: TỐI GIẢN GIAO DIỆN BUYER & GỘP GIAO NHẬN VÀO QUẢN LÝ HỢP ĐỒNG

---

## A. Overview

- **Tên chức năng:** Tối giản giao diện cổng Thương lái (Buyer) và hợp nhất toàn bộ quy trình **Đặt cọc – Theo dõi giao hàng – Ký nhận ePOD – Thanh toán 70%** vào một mục duy nhất mang tên **Quản lý hợp đồng**.
- **Mục tiêu:**
  1. Loại bỏ tab riêng **Điều Phối Giao & Nhận (`shipments`)** khỏi thanh điều hướng của Buyer để tránh phân mảnh, giúp người dùng không phải chuyển qua lại nhiều tab cho cùng một hợp đồng.
  2. Đổi tên tab **Hợp Đồng & Đặt Cọc** thành **Quản lý hợp đồng**.
  3. Tích hợp trực tiếp các thao tác giao nhận còn thiếu vào ngay thẻ từng hợp đồng trong **Quản lý hợp đồng**:
     - Hiển thị thông báo & nút **Kiểm Đếm & Ký Nhận Hàng (ePOD)** ngay trên hợp đồng khi chuyến xe có trạng thái `ARRIVED` hoặc `PENDING_BUYER_CONFIRMATION`.
     - Giữ nguyên nút **Xem Đường Đi GPS** khi hợp đồng đang giao (`IN_TRANSIT`), nút **Nạp Cọc 30%**, nút **Thanh Toán 70% Còn Lại** và **Xem Biên Bản ePOD**.
  4. Vá đồng bộ WebSocket ở Backend (`driverArriveStop` và `driverSubmitEpod`) để Buyer nhận nút ký nhận ePOD ngay lập tức theo thời gian thực.

---

## B. Current Architecture

- **Frontend (`frontend/src/components/buyer/BuyerManagementConsole.tsx`):**
  - Sidebar đang có 7 mục: `overview`, `catalog`, `negotiations`, `contracts` (*Hợp Đồng & Đặt Cọc*), `shipments` (*Điều Phối Giao & Nhận*), `claims`, `profile`.
  - Chức năng ký nhận ePOD (`openBuyerEpodModal`, `outboundStops` lọc `PENDING_BUYER_CONFIRMATION` / `ARRIVED`) hiện đang nằm riêng ở tab `shipments`, trong khi tab `contracts` chỉ hiển thị đặt cọc, kết quả QC và xem đường đi GPS.
- **Backend (`backend/src/main/java/com/btl/webbanrau/service/OutboundDeliveryExecutionService.java`):**
  - `driverArriveStop`: chưa bắn WebSocket `ARRIVED`.
  - `driverSubmitEpod`: đang truyền JPA Entity `B2bContract` vào `notifyContractUpdated`, có nguy cơ `LazyInitializationException` khi serialize ngoài session.

---

## C. Implementation Scope

### Frontend (`frontend/src/components/buyer/BuyerManagementConsole.tsx`)
1. **Menu Sidebar & Tiêu đề trang:**
   - Xóa mục `{ id: 'shipments', label: 'Điều Phối Giao & Nhận' }` khỏi menu Sidebar.
   - Đổi tên mục `contracts` thành **Quản lý hợp đồng** (cập nhật cả `activeTab === 'contracts'` trên thanh tiêu đề Header).
   - Cập nhật các nút điều hướng cũ trỏ vào `'shipments'` (nếu có) thành `'contracts'`.
2. **Hợp nhất Giao nhận & Ký nhận ePOD vào tab `contracts` (Quản lý hợp đồng):**
   - Ánh xạ `outboundStop` tương ứng theo `contractId` cho từng hợp đồng trong danh sách.
   - Trên thẻ từng hợp đồng:
     - Nếu `outboundStop` đang ở trạng thái `PENDING_BUYER_CONFIRMATION` (**Tài xế đã nộp biên bản ePOD**) hoặc `ARRIVED` (**Xe đã đến kho**): hiển thị banner nổi bật kèm nút **"Kiểm Đếm & Ký Nhận Hàng (ePOD)"** mở thẳng modal ký nhận `activeEpodModalStop` ngay tại chỗ.
     - Nếu `outboundStop` đã `BUYER_CONFIRMED`: hiển thị thông tin đã ký nhận ePOD + khối lượng thực nhận (`actualDeliveredWeightKg`) + nút xem chi tiết.
     - Giữ nguyên banner **Xe Lạnh Đang Giao Hàng (`IN_TRANSIT`)** + nút **Xem Đường Đi GPS**, banner **Kết quả QC**, nút **Nạp Cọc 30%** và **Thanh Toán 70%**.
   - Thêm bộ lọc nhanh gọn trên đầu tab **Quản lý hợp đồng**: `Tất cả`, `Chờ đặt cọc`, `Đang xử lý / QC`, `Đang giao / Chờ ký ePOD`, `Hoàn tất`.
   - Tối giản bớt các khối card/thống kê rườm rà không cần thiết ở tab `overview` và `contracts` để giao diện thoáng, dễ nhìn.

### Backend (`backend/src/main/java/com/btl/webbanrau/service/OutboundDeliveryExecutionService.java`)
- Cập nhật `driverArriveStop`: bắn WebSocket `ARRIVED` (dạng `Map` phẳng an toàn) lên `/topic/contracts` và `/topic/dispatch`.
- Cập nhật `driverSubmitEpod`: thay entity `B2bContract` bằng `Map` phẳng an toàn khi gọi `b2bRealtimeService.notifyContractUpdated("PENDING_BUYER_CONFIRMATION", ...)`.

### Database
- Không thay đổi cấu trúc bảng hay migration.

---

## D. API Contract

Tận dụng 100% các API hiện có:
- `GET /buyer/b2b/contracts`
- `GET /buyer/outbound-deliveries/my-deliveries`
- `POST /buyer/outbound-deliveries/stops/{stopId}/confirm-epod`

---

## E. Business Flow

1. Buyer vào mục duy nhất **Quản lý hợp đồng** để theo dõi xuyên suốt vòng đời đơn hàng:
   - **Mốc 1–2:** Nạp cọc 30% Escrow.
   - **Mốc 3–4:** Xem nghiệm thu tại vườn & kết quả kiểm định QC HoNa Fresh (Đạt / Không đạt / Hoàn cọc).
   - **Mốc 5:** Khi Admin/Tài xế bấm **Xuất Bến** $\rightarrow$ Hiện trạng thái **Đang Giao Hàng** + nút **Xem Đường Đi GPS**. Khi xe bấm **Đã Tới Điểm** / **Nộp ePOD** $\rightarrow$ Hiện ngay nút **Kiểm Đếm & Ký Nhận Hàng (ePOD)** trên thẻ hợp đồng đó.
   - **Mốc 6:** Thanh toán nốt 70% và hoàn tất hợp đồng.

---

## F. Implementation Steps

1. Cập nhật `OutboundDeliveryExecutionService.java` (gửi Map phẳng qua WebSocket cho `driverArriveStop` và `driverSubmitEpod`).
2. Cập nhật `BuyerManagementConsole.tsx`:
   - Xóa tab `shipments` khỏi Sidebar, đổi tên `contracts` thành **Quản lý hợp đồng**.
   - Ghép `outboundStop` theo `contractId` vào từng thẻ hợp đồng trong tab **Quản lý hợp đồng** kèm banner/nút **Ký Nhận Hàng (ePOD)** và bộ lọc trạng thái gọn gàng.
   - Giữ nguyên các modal ký nhận ePOD và xem bản đồ GPS.
3. Kiểm tra tĩnh TypeScript (`npx tsc --noEmit`).

---

## G. Risks & Considerations

- **Không làm mất Modal ePOD:** Các modal `activeEpodModalStop` nằm ngoài khối điều kiện `activeTab === 'shipments'`, cần đảm bảo sau khi bỏ tab `shipments`, modal ký nhận ePOD vẫn render bình thường ở cấp root của component.

---

## H. Acceptance Criteria

1. Sidebar cổng Buyer tinh gọn, không còn tab **Điều Phối Giao & Nhận** rời rạc; tab hợp đồng đổi tên thành **Quản lý hợp đồng**.
2. Trong **Quản lý hợp đồng**, Buyer thực hiện được trọn vẹn: Nạp cọc 30% $\rightarrow$ Xem kết quả QC $\rightarrow$ Xem đường đi GPS khi đang giao $\rightarrow$ Ký nhận ePOD khi xe tới/nộp biên bản $\rightarrow$ Thanh toán 70%.
3. Không phát sinh lỗi TypeScript hay mất chức năng cũ.
