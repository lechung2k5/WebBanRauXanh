# KẾ HOẠCH TRIỂN KHAI — QUY TRÌNH ĐIỀU XE & BÀN GIAO ĐƠN PA3 (BUYER TỰ ĐẾN KHO HONA LẤY HÀNG)

> **Dự án:** HONA FRESH  
> **Phân hệ:** Buyer Portal (`/portal/buyer`), Quản lý Kho / Outbound (`/admin/outbound-dispatch`, `/manager/outbound-dispatch`), Staff App (`/portal/warehouse-qc`) & Backend (`BuyerWorkflowService`, `WarehouseOutboundExecutionService`)  
> **Loại công việc:** Complex Task (Quy trình giao dịch B2B mới)

---

## A. Overview

- **Tên chức năng:** Quy trình Buyer tự điều xe lấy hàng tại Kho HoNa (PA3 — `farm_pickup`) & Bàn giao – Ký hợp đồng vận chuyển/ePOD hoàn tất đơn.
- **Mục tiêu:** Hoàn thiện luồng nghiệp vụ khép kín cho hợp đồng **Phương án 3 (PA3)**:
  1. **Phía Buyer (`/portal/buyer`):** Chỉ sau khi lô hàng đã **Kiểm định QC đạt (`QC_PASSED`)**, giao diện mới hiển thị nút **`Điều xe đến kho HoNa lấy hàng`**. Khi bấm vào, Buyer nhập thông tin tài xế, SĐT tài xế, biển số xe và ghi chú giờ dự kiến đến kho.
  2. **Phía Quản lý Kho & Staff App (`/admin/outbound-dispatch`, `/manager/outbound-dispatch`, `/portal/warehouse-qc`):** Hệ thống hiển thị trạng thái nổi bật **`Xe của thương lái đang đến kho HoNa`** kèm biển số xe & thông tin tài xế; cho phép xuất **Hợp đồng / Biên bản bàn giao vận chuyển PA3** và các chứng từ cần thiết để **khách hàng / tài xế đại diện ký xác nhận** (`ePOD`).
  3. **Điều kiện Hoàn tất đơn (Thanh toán phần còn lại 70%):** Sau khi ký nhận bàn giao tại kho (`DELIVERED`), hệ thống kiểm tra công nợ còn lại:
     - Nếu Buyer **chưa thanh toán đủ 100%** (còn 70% / `remaining_amount > 0` và `remaining_payment_status != 'PAID'`), đơn ở trạng thái **`DELIVERED` (Chờ Buyer thanh toán 70% còn lại)** — **chưa được coi là hoàn tất đơn**.
     - Chỉ sau khi Buyer thanh toán xong phần còn lại (`POST /buyer/contracts/{id}/final-payment/confirm` -> `remaining_payment_status = 'PAID'`), đơn mới đủ điều kiện **Hoàn tất 100%** (`COMPLETED` / `SETTLED`).
- **Phạm vi nghiệp vụ:** Áp dụng riêng cho các hợp đồng PA3 (`shipping_option` = `farm_pickup` / `PA3` / `BUYER_SELF_TRANSPORT`). Không ảnh hưởng luồng PA2 (Xe lạnh HoNa giao tận kho Buyer).

---

## B. Current Architecture

- **Frontend Buyer (`BuyerManagementConsole.tsx`):**
  - Đã nhận diện `isSelfPickup` (PA3), hiển thị badge PA3 và cọc 100%, nhưng chưa có nút **`Điều xe đến kho HoNa lấy hàng`** sau khi `QC_PASSED`, chưa có Modal nhập biển số xe & tài xế của Buyer, và chưa có bước Buyer ký nhận bàn giao tại kho cho PA3.
- **Frontend Quản lý Kho / Staff App (`admin/outbound-dispatch/page.tsx`, `WarehouseReceivingConsole.tsx`):**
  - Đã tách riêng khu vực PA3 (`pa3SelfPickupContracts`), nhưng chưa hiển thị thông tin xe & tài xế do Buyer tự điều (`Xe thương lái đang đến`), và chưa có luồng lập **Biên bản / Hợp đồng vận chuyển bàn giao PA3** + **Chữ ký khách hàng** để hoàn tất đơn.
- **Backend (`BuyerController`, `BuyerWorkflowService`, `WarehouseOutboundController`, `WarehouseOutboundExecutionService`):**
  - Bảng `b2b_contracts` đã sẵn có các cột `outbound_truck_plate`, `outbound_driver_name`, `outbound_dispatched_at`, `epod_signature_url`, `epod_delivered_at`, `epod_delivered_weight_kg`, `delivery_notes`.
  - Hiện chưa có API để Buyer gửi thông tin xe tự điều (`POST /buyer/contracts/{id}/dispatch-self-pickup`) và chưa có API sinh/xác nhận biên bản vận chuyển & chữ ký bàn giao PA3.

---

## C. Implementation Scope

### Frontend
1. **`frontend/src/components/buyer/BuyerManagementConsole.tsx`:**
   - Với đơn PA3 có trạng thái `QC_PASSED` (và chưa có `outboundTruckPlate`): hiển thị nút **`Điều xe đến kho HoNa`**.
   - **Modal Điều Xe Tự Lấy (PA3):** Nhập `Biển số xe`, `Tên tài xế`, `SĐT tài xế`, `Thời gian dự kiến đến kho`, `Ghi chú`.
   - Sau khi Buyer điều xe xong: hiển thị thẻ trạng thái **`Đã điều xe đến kho HoNa lấy hàng`** (biển số, tài xế) + cho phép Buyer/đại diện xem **Hợp đồng vận chuyển / Biên bản bàn giao PA3** và **Ký xác nhận nhận hàng tại kho (ePOD)** khi kho đã chuẩn bị xong hàng (`READY_FOR_GATE_PICKUP` / `PICKED_FROM_BIN`).
2. **`frontend/src/services/api.ts` & `frontend/src/services/fleetDispatchApi.ts`:**
   - Thêm hàm `dispatchBuyerSelfPickupApi(contractId, payload)` và `signPa3GateHandoverApi(...)`.
   - Cập nhật `getBuyerContractsApi` map thêm `outboundTruckPlate`, `outboundDriverName`, `outboundDispatchedAt`.
3. **`frontend/src/app/admin/outbound-dispatch/page.tsx` & `frontend/src/components/warehouse/WarehouseReceivingConsole.tsx`:**
   - Hiển thị trạng thái **`Xe thương lái đang đến kho`** (kèm biển số xe, tên & SĐT tài xế Buyer) trên từng đơn PA3.
   - Bổ sung nút **`Lập HĐ Vận Chuyển & Cho Khách Ký Nhận (PA3)`**: mở Modal hiển thị đầy đủ thông tin **Hợp đồng mua bán / Phiếu xuất kho kiêm Hợp đồng vận chuyển & Biên bản bàn giao PA3** (thông tin 2 bên, biển số xe Buyer, tài xế, sản lượng QC, số thùng, mã tem), khung **Chữ ký điện tử khách hàng / tài xế nhận hàng** (canvas hoặc xác nhận ký số) -> xác nhận xong chuyển đơn thành `DELIVERED` (Hoàn tất đơn).

### Backend
1. **`BuyerController.java` & `BuyerWorkflowService.java`:**
   - Thêm endpoint `POST /api/v1/buyer/contracts/{id}/self-pickup-dispatch`:
     - Kiểm tra quyền sở hữu hợp đồng (`contract.buyer_id == currentUser.id`).
     - Kiểm tra điều kiện: đơn thuộc PA3 (`farm_pickup`) và đã đạt QC (`qc_status = 'QC_PASSED'` hoặc `status IN ('QC_PASSED', 'READY_OUTBOUND')`).
     - Lưu `outbound_truck_plate`, `outbound_driver_name`, cập nhật `fulfillment_status = 'BUYER_TRUCK_EN_ROUTE'`, `delivery_notes` (kèm SĐT tài xế & giờ dự kiến), bắn WebSocket real-time sang Quản lý kho & Staff App.
   - Cập nhật SQL `BuyerWorkflowService.contracts()` đảm bảo trả đủ `outbound_truck_plate`, `outbound_driver_name`, `outbound_dispatched_at`, `epod_signature_url`.
2. **`WarehouseOutboundController.java` & `WarehouseOutboundExecutionService.java`:**
   - Cập nhật `getOutboundTasks`: trả thêm trạng thái `buyerTruckDispatched` (`BUYER_TRUCK_EN_ROUTE`), `outbound_truck_plate`, `outbound_driver_name`, và trích xuất SĐT tài xế Buyer.
   - Cập nhật `completeHandover`: nhận thêm `signatureData` (chữ ký khách hàng/tài xế nhận hàng) và lưu vào `epod_signature_url`, `epod_delivered_at`, `status = 'DELIVERED'`, `fulfillment_status = 'DELIVERED'`.

### Database
- Tận dụng các cột có sẵn trong `b2b_contracts` (`outbound_truck_plate`, `outbound_driver_name`, `outbound_dispatched_at`, `epod_signature_url`, `epod_delivered_at`, `epod_delivered_weight_kg`, `fulfillment_status`, `delivery_notes`). **Không cần thay đổi schema hoặc chạy migration.**

---

## D. API Contract

1. **`POST /api/v1/buyer/contracts/{id}/self-pickup-dispatch`**
   - **Quyền:** `BUYER`, `ADMIN` (kiểm tra `contract.buyer_id == user.id`).
   - **Request Body:**
     ```json
     {
       "truckPlate": "51C-889.99",
       "driverName": "Nguyễn Văn A",
       "driverPhone": "0909123456",
       "etaText": "14:30 hôm nay",
       "notes": "Xe tải lạnh 2.5 tấn vào cổng số 2"
     }
     ```
   - **Validation:** `truckPlate` không rỗng, `driverName` không rỗng, `driverPhone` không rỗng; đơn phải là PA3 và đã `QC_PASSED`.
   - **Response (`200 OK`):** Trả về dữ liệu hợp đồng đã cập nhật (`fulfillment_status = 'BUYER_TRUCK_EN_ROUTE'`).

2. **`POST /api/v1/warehouse/outbound/contracts/{contractId}/complete-handover`** (Mở rộng)
   - **Quyền:** `WAREHOUSE_QC`, `WAREHOUSE_MANAGER`, `ADMIN`.
   - **Request Body:**
     ```json
     {
       "handoverType": "PA3_BUYER_PICKUP",
       "receiverName": "Nguyễn Văn A",
       "receiverPhone": "0909123456",
       "truckPlate": "51C-889.99",
       "signatureData": "data:image/png;base64,...",
       "notes": "Đã kiểm đủ 7 thùng tem E279-01..07 và ký biên bản bàn giao vận chuyển PA3"
     }
     ```
   - **Response (`200 OK`):** Cập nhật `status = 'DELIVERED'`, `fulfillment_status = 'DELIVERED'`, lưu `epod_signature_url`, giải phóng ô kệ `BIN` và bắn WebSocket.

---

## E. Business Flow

1. **Buyer (PA3):** Chờ đơn đạt **`QC_PASSED`** -> Tại `/portal/buyer`, nút **`Điều xe đến kho HoNa`** xuất hiện -> Buyer bấm mở Modal nhập **Biển số xe, Tên tài xế, SĐT tài xế, Giờ dự kiến đến** -> Gửi lên hệ thống.
2. **Quản lý kho & Staff App:** Tự động cập nhật real-time (WebSocket) trạng thái **`Xe thương lái đang đến`** kèm biển số xe & thông tin tài xế -> Nhân viên kho đi tới ô `BIN` lấy đúng dải thùng (quy trình 3 bước ở Staff App).
3. **Lập HĐ vận chuyển & Khách ký nhận bàn giao tại kho:** Khi xe thương lái tới kho nhận hàng, Quản lý kho / Nhân viên kho mở **Phiếu xuất kho kiêm Hợp đồng vận chuyển & Bàn giao PA3**, đưa khách hàng / tài xế ký xác nhận điện tử (`signatureData`) -> Bấm **Xác nhận bàn giao tại kho** -> Đơn chuyển `DELIVERED`, giải phóng ô kệ `BIN`.
4. **Thanh toán phần còn lại (70%) để Hoàn tất đơn:**
   - Nếu Buyer còn khoản thanh toán 70% còn lại (`remaining_payment_status != 'PAID'`), đơn **chưa hoàn tất** và hiển thị yêu cầu **`Thanh toán 70% còn lại (VietQR)`** trên `/portal/buyer`.
   - Sau khi Buyer thanh toán xong 70% còn lại (`remaining_payment_status = 'PAID'`), đơn mới chính thức được coi là **Hoàn tất thanh toán & giao nhận**, sẵn sàng cho Admin quyết toán giải ngân cho Nhà vườn.

---

## F. Implementation Steps

1. **Backend (`BuyerController`, `BuyerWorkflowService`):** Thêm API `POST /buyer/contracts/{id}/self-pickup-dispatch` với đầy đủ validation nghiệp vụ (PA3 + `QC_PASSED` + quyền sở hữu Buyer) và cập nhật query `contracts()`.
2. **Backend (`WarehouseOutboundExecutionService`, `WarehouseOutboundController`):** Trả thông tin xe Buyer đang đến (`BUYER_TRUCK_EN_ROUTE`, `outbound_truck_plate`, `outbound_driver_name`) và lưu chữ ký `signatureData` khi hoàn tất bàn giao PA3.
3. **Frontend (`api.ts`, `fleetDispatchApi.ts`):** Thêm hàm gọi API điều xe PA3 cho Buyer và truyền `signatureData` khi bàn giao PA3.
4. **Frontend (`BuyerManagementConsole.tsx`):** Thêm nút **`Điều xe đến kho HoNa`** (chỉ hiện khi PA3 + `QC_PASSED`), Modal nhập biển số & tài xế, và hiển thị trạng thái xe đã điều.
5. **Frontend (`admin/outbound-dispatch/page.tsx` & `WarehouseReceivingConsole.tsx`):** Hiển thị trạng thái **`Xe thương lái đang đến`** và Modal **Hợp đồng vận chuyển & Ký nhận bàn giao PA3** (có khung ký tên cho khách hàng) để hoàn tất đơn.
6. **Kiểm tra tĩnh & compile:** Kiểm tra đồng bộ API Contract và biên dịch các trang `/portal/buyer`, `/portal/warehouse-qc`, `/admin/outbound-dispatch`.

---

## G. Risks & Considerations

- **Bảo mật & Quyền sở hữu:** Phải xác thực đúng `buyer_id` của người đang đăng nhập khi gọi API điều xe PA3 (`self-pickup-dispatch`), tránh Buyer khác điều xe vào hợp đồng không phải của mình.
- **Ràng buộc trạng thái:** Tuyệt đối chặn Buyer điều xe khi đơn chưa `QC_PASSED` (cả ở Frontend lẫn Backend).
- **Không xung đột với PA2:** Chỉ áp dụng cho đơn có `shipping_option` thuộc PA3 (`farm_pickup` / `BUYER_SELF_TRANSPORT`).

---

## H. Acceptance Criteria

1. Ở `/portal/buyer`, đơn PA3 chưa đạt `QC_PASSED` thì **không** hiện nút điều xe; ngay khi đạt `QC_PASSED`, hiện nút **`Điều xe đến kho HoNa`**, bấm vào nhập được tài xế & biển số xe và lưu thành công.
2. Ở `/admin/outbound-dispatch`, `/manager/outbound-dispatch` và `/portal/warehouse-qc`, đơn PA3 hiển thị rõ trạng thái **`Xe thương lái đang đến`** cùng biển số xe & thông tin tài xế Buyer.
3. Quản lý kho / Nhân viên kho mở được **Hợp đồng vận chuyển & Biên bản bàn giao PA3**, khách hàng ký xác nhận trực tiếp trên giao diện, và khi bàn giao xong thì đơn chuyển sang `DELIVERED` (giải phóng ô kệ `BIN`).
4. **Ràng buộc hoàn tất đơn:** Nếu Buyer còn công nợ 70% (`remaining_payment_status != 'PAID'`), đơn **chưa** được tính là hoàn tất và Buyer phải bấm **Thanh toán 70% còn lại (VietQR)** thành công thì đơn mới chính thức hoàn tất (`remaining_payment_status = 'PAID'`, sẵn sàng quyết toán).
