# KẾ HOẠCH TRIỂN KHAI — TÍNH NĂNG XUẤT KHO & LẤY HÀNG CHO STAFF APP (WAREHOUSE PORTAL)

> **Dự án:** HONA FRESH  
> **Phân hệ:** Staff App (`/portal/warehouse-qc` — `WarehouseReceivingConsole`) & Backend Outbound Warehouse Execution  
> **Loại công việc:** Complex Task (Chức năng nghiệp vụ mới)

---

## A. Overview

- **Tên chức năng:** Quy trình Xuất Kho & Lấy Hàng Tại Kệ cho Nhân Viên Kho (Staff App Outbound Picking & Handover).
- **Mục tiêu:** Bổ sung đầy đủ quy trình tác nghiệp thực tế tại kho cho nhân viên kho (`WAREHOUSE_QC` / nhân viên kho tại `/portal/warehouse-qc`) khi xuất hàng ra khỏi buồng lạnh: đi tới đúng Zone/Rack/Bin lấy đúng các thùng hàng thuộc từng hợp đồng, kiểm tra tem/QR, đối soát cân nặng/nhiệt độ và bàn giao cho **Xe lạnh HoNa (PA2)** hoặc **Buyer tự đến kho lấy hàng (PA3 — `farm_pickup`)**.
- **Phạm vi nghiệp vụ:**
  - Phân biệt rõ 2 luồng xuất kho sau khi đạt QC (`QC_PASSED`):
    1. **Luồng PA2 (Xe HoNa giao):** Admin đã điều phối chuyến xe Outbound (`OutboundDeliveryTrip`, trạng thái `ASSIGNED`) -> Nhân viên kho nhận phiếu soạn hàng (Picking List), đi đến ô kệ `BIN` lấy đúng dải thùng của hợp đồng, xác nhận bốc lên xe lạnh Outbound.
    2. **Luồng PA3 (`farm_pickup` — Buyer tự lấy tại kho HoNa):** Không cần điều xe chặng 2 -> Nhân viên kho kiểm tra trạng thái đã cọc 100%, soạn hàng từ ô kệ `BIN`, đối chiếu người nhận/mã đơn tại cổng kho, bàn giao và ký nhận xuất kho trực tiếp.
- **Kết quả mong muốn:** Nhân viên kho thao tác trọn vẹn quy trình xuất kho ngay trên Staff App (`/portal/warehouse-qc`) với dữ liệu đồng bộ thời gian thực sang Admin (`/admin/outbound-dispatch`, `/admin/qc`, `/admin/contracts`), Tài xế (`/portal/driver`) và Buyer (`/portal/buyer`).

---

## B. Current Architecture

### Cấu trúc hiện tại
- **Frontend Staff App:**
  - Route: `frontend/src/app/portal/[role]/page.tsx` (`role === 'warehouse-qc'`) render `WarehouseReceivingConsole` (`frontend/src/components/warehouse/WarehouseReceivingConsole.tsx`).
  - Hiện mới có 2 tab: **`RECEIVING`** (Tiếp nhận xe Inbound) và **`QC`** (Kiểm định QC). Chưa có tab Xuất Kho / Lấy Hàng.
- **Backend Warehouse & Outbound:**
  - `WarehouseReceivingController.java` (`/api/v1/warehouse/receiving`): mới có API `trips`, `inventory`, `trips/{id}/arrive`, `trips/{id}/complete`.
  - `OutboundDispatchService.java` & `AdminOutboundDispatchController.java`: đã có điều phối chuyến xe Outbound (`OutboundDeliveryTrip`, `OutboundDeliveryStop`) cho Admin, nhưng chưa có bước nhân viên kho xác nhận lấy hàng tại kệ (`Picking`) và bàn giao xuất kho (`Handover / Gate Release`).
  - `WarehouseReceivingController.getHubInventory` đã trả về các hợp đồng tại kho (`QC_PASSED`, `READY_OUTBOUND`, `OUTBOUND_DISPATCHED`, ...).

### Thành phần có thể tái sử dụng
- `WarehouseReceivingConsole.tsx` (bố cục mobile-first cho nhân viên kho, WebSocket `b2bWebSocket.subscribeDispatch` & `subscribeContracts`).
- `OutboundDeliveryTrip`, `OutboundDeliveryStop`, `OutboundDeliveryTripRepository`, `OutboundDeliveryStopRepository`.
- `WarehouseBin` & logic phân bổ dải thùng (`Thùng #start–#end`, mã tem niêm phong) để nhân viên lấy đúng thùng khi nhiều đơn nằm chung 1 ô kệ.
- `B2bRealtimeService` để đẩy sự kiện cập nhật trạng thái real-time.

---

## C. Implementation Scope

### Frontend
- **File dự kiến sửa:**
  - `frontend/src/components/warehouse/WarehouseReceivingConsole.tsx`:
    - Thêm tab thứ 3: **`Xuất Kho & Lấy Hàng (OUTBOUND)`** kèm badge số lượng lệnh xuất kho đang chờ.
    - Hiển thị danh sách 2 nhóm rõ ràng:
      1. **Phiếu xuất cho Chuyến Xe Lạnh HoNa (PA2):** Hiển thị biển số xe, tài xế, danh sách hợp đồng/điểm dừng cần soạn hàng.
      2. **Phiếu xuất Giao Tại Kho cho Buyer Tự Lấy (PA3):** Hiển thị thông tin Buyer, trạng thái thanh toán 100%, địa chỉ kho nhận.
    - **Modal Quy Trình Lấy Hàng & Xuất Kho (Step-by-step Wizard 3 bước cho nhân viên kho):**
      - **Bước 1 — Đi tới kệ & Lấy đúng thùng (Picking):** Hiển thị Zone, dãy kệ `Rack`, ô `BIN`, mã hợp đồng, số kg, số thùng và dải số thùng/mã tem niêm phong (`Thùng #1–#7`, `Tem: E279-01..07`); nhân viên tick xác nhận đã kiểm đếm đủ số thùng & quét/nhập xác nhận mã tem.
      - **Bước 2 — Kiểm tra xuất kho (Pre-dispatch Check):** Nhập/xác nhận nhiệt độ cuống rau khi xuất buồng lạnh (`°C`), cân nặng thực xuất (`kg`), tình trạng niêm phong bao bì, ghi chú xuất kho.
      - **Bước 3 — Bàn giao & Hoàn tất xuất kho (Handover):**
        - Với PA2: Bàn giao cho tài xế xe lạnh Outbound (hiển thị tên tài xế, biển số xe), chuyển trạng thái đơn sang sẵn sàng/đang giao (`OUTBOUND_DISPATCHED` / `PICKED_FOR_OUTBOUND`).
        - Với PA3: Nhập tên/SĐT người đại diện Buyer đến nhận tại kho, xác nhận bàn giao tại cổng kho -> chuyển trạng thái hoàn tất giao nhận tại kho (`DELIVERED` / `COMPLETED`).
    - Xử lý đầy đủ các trạng thái `loading`, `empty`, `error` và `success`.
  - `frontend/src/services/fleetDispatchApi.ts`: Bổ sung các hàm gọi API xuất kho cho Staff App.

### Backend
- **File dự kiến sửa / tạo:**
  - `backend/src/main/java/com/btl/webbanrau/controller/WarehouseReceivingController.java` (hoặc controller riêng `WarehouseOutboundController.java` dưới `/warehouse/outbound` được `SecurityConfig` cho phép `WAREHOUSE_QC`, `ADMIN`):
    - Endpoint lấy danh sách lệnh xuất kho cần nhân viên đi lấy hàng tại Hub (`PA2` đã có chuyến xe Outbound hoặc đang chờ soạn, và `PA3` đã `QC_PASSED` chờ Buyer tới lấy).
    - Endpoint thực hiện các bước quy trình xuất kho (bắt đầu lấy hàng tại kệ, xác nhận lấy đủ thùng & kiểm tra nhiệt độ, hoàn tất bàn giao xuất kho).
  - `backend/src/main/java/com/btl/webbanrau/service/WarehouseOutboundExecutionService.java` (tạo mới hoặc mở rộng service liên quan):
    - Xử lý transaction khóa dòng `b2b_contracts`, cập nhật trạng thái từng bước (`PICKING_IN_PROGRESS` -> `PICKED_FROM_BIN` -> `OUTBOUND_DISPATCHED` hoặc `DELIVERED`), ghi nhận thông tin nhân viên kho thực hiện, nhiệt độ xuất kho, số thùng/khối lượng thực xuất, thời điểm xuất kho (`outbound_dispatched_at`), giải phóng tải trọng ô `BIN` trong kho, và bắn WebSocket `b2bRealtimeService`.
  - `backend/src/main/java/com/btl/webbanrau/config/SecurityConfig.java`:
    - Đảm bảo `/warehouse/outbound/**` cho phép role `WAREHOUSE_QC`, `ADMIN` (giữ nguyên cấu hình bảo mật hiện tại, chỉ bổ sung pattern nếu tách controller).

### Database
- **Bảng liên quan:** `b2b_contracts`, `outbound_delivery_trips`, `outbound_delivery_stops`, `rfq_negotiations`, `warehouse_bins`.
- **Chiến lược dữ liệu:** Tận dụng tối đa các cột hiện có trên `b2b_contracts` (`status`, `fulfillment_status`, `outbound_dispatched_at`, `outbound_truck_plate`, `outbound_driver_name`, `delivery_notes`, `epod_delivered_at`, `hub_warehouse_zone`, `hub_rack_bin`) và `outbound_delivery_stops` / `outbound_delivery_trips` để **không cần thay đổi schema bắt buộc** và không ảnh hưởng dữ liệu cũ. Nếu cần lưu thêm trạng thái soạn hàng chi tiết (ví dụ `picking_status`, `picked_at`, `picked_by_staff_id`, `outbound_temp`), có thể kiểm tra và cân nhắc trước khi bổ sung.

---

## D. API Contract

1. **`GET /api/v1/warehouse/outbound/tasks?warehouseId={hubId}`**
   - **Quyền:** `WAREHOUSE_QC`, `ADMIN`
   - **Response (`200 OK`):** Danh sách lệnh xuất kho tại Hub gồm:
     - `pa2Tasks`: các hợp đồng thuộc chuyến `OutboundDeliveryTrip` ở trạng thái `ASSIGNED` / `PICKING` (kèm `tripCode`, `vehiclePlate`, `driverName`, `zone`, `rackBin`, `crateRange`, `packageCount`, `weightKg`).
     - `pa3Tasks`: các hợp đồng `farm_pickup` (`PA3`) đã `QC_PASSED` sẵn sàng để Buyer tới lấy tại kho (kèm `buyerName`, `buyerPhone`, `zone`, `rackBin`, `packageCount`, `weightKg`).

2. **`POST /api/v1/warehouse/outbound/contracts/{contractId}/start-picking`**
   - **Quyền:** `WAREHOUSE_QC`, `ADMIN`
   - **Mục đích:** Nhân viên kho nhận lệnh và bắt đầu đi tới ô kệ `BIN` lấy hàng.
   - **Response (`200 OK`):** Trả về trạng thái cập nhật của lệnh xuất kho.

3. **`POST /api/v1/warehouse/outbound/contracts/{contractId}/confirm-picked`**
   - **Quyền:** `WAREHOUSE_QC`, `ADMIN`
   - **Request Body:**
     ```json
     {
       "pickedPackages": 7,
       "actualWeightKg": 100.0,
       "outboundTemp": 3.2,
       "sealVerified": true,
       "notes": "Đã lấy đủ 7 thùng tem E279-01..07 tại BIN A-01"
     }
     ```
   - **Validation:** `pickedPackages > 0`, `actualWeightKg > 0`, `sealVerified == true`.
   - **Response (`200 OK`):** Cập nhật đã soạn hàng xong khỏi ô kệ.

4. **`POST /api/v1/warehouse/outbound/contracts/{contractId}/complete-handover`**
   - **Quyền:** `WAREHOUSE_QC`, `ADMIN`
   - **Request Body:**
     ```json
     {
       "handoverType": "PA2_TRUCK | PA3_BUYER_PICKUP",
       "receiverName": "Tên tài xế hoặc người đại diện Buyer",
       "receiverPhone": "09xxxxxxxx",
       "notes": "Bàn giao đủ hàng nguyên niêm phong tại cổng xuất kho"
     }
     ```
   - **Response (`200 OK`):**
     - Với `PA2_TRUCK`: Ghi nhận đã bốc hàng lên xe lạnh Outbound (`outbound_dispatched_at = NOW()`, giải phóng `hub_rack_bin` trên sơ đồ tồn kho nếu cần hoặc chuyển trạng thái `OUTBOUND_DISPATCHED`).
     - Với `PA3_BUYER_PICKUP`: Ghi nhận Buyer đã nhận hàng tại kho (`status = DELIVERED`, `fulfillment_status = DELIVERED`, `epod_delivered_at = NOW()`, `epod_delivered_weight_kg = actualWeightKg`), đồng bộ ngay để Admin có thể quyết toán cho Nhà vườn.

---

## E. Business Flow

1. **Chuẩn bị lệnh xuất kho:**
   - Sau khi lô hàng đạt kiểm định QC (`QC_PASSED`) và được lưu tại `Zone / Rack / Bin`:
     - Nếu là đơn **PA2**: Admin/Quản lý kho lập chuyến xe Outbound tại `/admin/outbound-dispatch`. Lệnh xuất kho tự động xuất hiện trên Staff App.
     - Nếu là đơn **PA3 (`farm_pickup`)**: Lệnh xuất kho tự động xuất hiện ngay trong mục **Đơn Buyer tự lấy tại kho (PA3)** trên Staff App.
2. **Nhân viên kho đi lấy hàng (Bước 1 — Picking):**
   - Nhân viên mở tab **Xuất Kho & Lấy Hàng** trên Staff App, chọn đơn cần xuất -> hệ thống chỉ rõ vị trí `Zone A -> Rack R-01 -> BIN A-01`, mã hợp đồng và đúng dải thùng/tem niêm phong cần lấy.
   - Nhân viên bấm **Bắt đầu đi lấy hàng** -> đi tới kệ, lấy đủ thùng, tích xác nhận đủ số thùng & đúng tem niêm phong.
3. **Kiểm tra trước khi xuất buồng lạnh (Bước 2 — Outbound Check):**
   - Nhân viên cân đối soát lại khối lượng thực xuất, đo nhiệt độ sản phẩm khi ra khỏi kho mát (`°C`) và xác nhận nguyên vẹn bao bì.
4. **Bàn giao xuất kho (Bước 3 — Handover):**
   - **PA2:** Bàn giao cho tài xế xe lạnh tại cửa xuất kho -> Tài xế xác nhận/bắt đầu giao hàng trên Driver App.
   - **PA3:** Đối chiếu thông tin Buyer đến nhận tại kho, bấm **Hoàn tất bàn giao cho Buyer** -> Hợp đồng chuyển `DELIVERED`, cập nhật tồn kho ô kệ `BIN` và kích hoạt bước Quyết toán cho Nhà vườn.

---

## F. Implementation Steps

1. **Backend — Service & Controller:**
   - Tạo `WarehouseOutboundExecutionService` xử lý danh sách task xuất kho (`PA2` & `PA3`) và 3 bước chuyển trạng thái (`start-picking`, `confirm-picked`, `complete-handover`) kèm đồng bộ `WarehouseBin` và WebSocket.
   - Tạo `WarehouseOutboundController` (`/warehouse/outbound/...`) và kiểm tra phân quyền trong `SecurityConfig.java`.
2. **Frontend — API Service:**
   - Thêm kiểu dữ liệu DTO và các hàm gọi API xuất kho trong `frontend/src/services/fleetDispatchApi.ts`.
3. **Frontend — Staff App UI (`WarehouseReceivingConsole.tsx`):**
   - Thêm tab **Xuất Kho & Lấy Hàng** (`OUTBOUND`), danh sách phiếu xuất PA2/PA3, và Modal quy trình 3 bước (Lấy hàng tại kệ -> Kiểm tra cân & nhiệt độ -> Bàn giao xuất kho).
   - Lắng nghe WebSocket để cập nhật danh sách real-time khi Admin điều xe hoặc khi xuất kho xong.
4. **Kiểm tra tĩnh & biên dịch:**
   - Kiểm tra đồng bộ API Contract giữa Frontend & Backend và kiểm tra compile các trang `/portal/warehouse-qc`, `/admin/qc`, `/admin/outbound-dispatch`.

---

## G. Risks & Considerations

- **Trùng lặp hoặc bỏ sót khi chuyển trạng thái với Admin Outbound:** Nếu Admin bấm cho xe xuất phát (`departTrip`) trực tiếp bên `/admin/outbound-dispatch` hoặc tài xế bấm xuất phát trước, cần đảm bảo không xung đột trạng thái với bước bàn giao của nhân viên kho.
- **Nhầm lẫn thùng hàng khi nhiều đơn chung 1 ô kệ (`BIN`):** Cần hiển thị rõ mã hợp đồng, tên Buyer, dải số thùng và mã tem niêm phong ngay trong bước 1 (Picking) để nhân viên lấy đúng thùng.
- **Quyền sở hữu & Hub:** Nhân viên kho thuộc Hub nào chỉ thấy và thao tác các lệnh xuất kho thuộc Hub đó (`selectedHubId`).
- **Tồn kho ô kệ (`BIN`):** Khi hoàn tất bàn giao xuất kho, phải cập nhật trạng thái hợp đồng để không còn tính vào tồn kho đang lưu trên sơ đồ 3D và kệ `BIN`.

---

## H. Acceptance Criteria

1. Nhân viên kho đăng nhập `/portal/warehouse-qc` thấy tab **Xuất Kho & Lấy Hàng** với đầy đủ các đơn `QC_PASSED` thuộc PA2 (đã gán xe Outbound) và PA3 (Buyer tự lấy tại kho).
2. Khi mở 1 lệnh xuất kho, nhân viên thấy rõ vị trí `Zone / Rack / Bin`, số thùng, mã tem niêm phong, và thực hiện tuần tự đủ 3 bước: **Đi lấy hàng tại kệ -> Kiểm tra cân & nhiệt độ xuất kho -> Bàn giao xuất kho**.
3. Sau khi hoàn tất bàn giao:
   - Đơn PA3 chuyển sang `DELIVERED`, giải phóng tải trọng khỏi ô kệ `BIN` trên sơ đồ kho và sẵn sàng quyết toán.
   - Đơn PA2 chuyển sang trạng thái đã bốc lên xe lạnh / sẵn sàng giao hàng (`OUTBOUND_DISPATCHED`), đồng bộ real-time sang trang Tài xế và Admin.
4. Không làm lỗi luồng Tiếp nhận (`RECEIVING`) và Kiểm định (`QC`) hiện có trên Staff App.
