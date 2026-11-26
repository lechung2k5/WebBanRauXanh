# KẾ HOẠCH TRIỂN KHAI: TỰ ĐỘNG GHÉP CHUYẾN & TỐI ƯU GIAO HÀNG (AUTO-DISPATCH OPTIMIZATION)

---

## A. Overview

- **Tên chức năng:** **Tự động ghép chuyến (Tối ưu giao hàng Outbound)** trên phân hệ Giao hàng (`/admin/outbound-dispatch`).
- **Mục tiêu:**
  1. Cung cấp nút **"⚡ Tự Động Ghép Chuyến (Tối Ưu)"** giúp điều phối viên tự động gom nhiều đơn hàng `QC_PASSED` đang chờ vào các xe lạnh phù hợp với **sức chứa (`capacityKg` và `volumeM3`)** của từng xe.
  2. **Xử lý thông minh khi xe đang bận giao hàng:**
     - Nếu xe ưu tiên đang chạy chuyến khác (`ON_TRIP` / `ASSIGNED`), hệ thống tự động chuyển sang ghép vào **xe sẵn sàng (`AVAILABLE`) khác** thuộc cùng Hub.
     - Nếu toàn bộ xe phù hợp đều đang bận giao hàng (hoặc đã đầy tải ở lượt 1), hệ thống tự động phân bổ các đơn còn lại vào **Kế hoạch Chuyến Sau (Chờ xe về)** — chỉ rõ xe nào sẽ nhận khi hoàn tất chuyến hiện tại, tuyệt đối không ghép đè lên xe đang bận.
  3. Hiển thị **Bảng Xem Trước Kế Hoạch Tối Ưu** để điều phối viên kiểm tra tải trọng, danh sách mã đơn, tài xế trước khi bấm **Xác Nhận Tạo Chuyến**.

---

## B. Current Architecture

- **Backend hiện có:**
  - `OutboundDispatchService.confirmOutboundTrip(hubId, request)`: Đã hỗ trợ tạo 1 chuyến Outbound đa điểm (`MULTI stops`), kiểm tra chặt chẽ `capacityKg`, `volumeM3`, quy tắc `ONCE per Contract`, và khóa xe/tài xế sang `ASSIGNED`.
  - `FleetVehicle`: Có `capacityKg`, `volumeM3`, `status` (`AVAILABLE`, `ASSIGNED`, `ON_TRIP`, `MAINTENANCE`).
  - `FleetDriver`: Có `status` (`AVAILABLE`, `ASSIGNED`, `ON_TRIP`, `OFF_DUTY`).
  - `OutboundDeliveryTrip`: Có `status` (`DRAFT`, `ASSIGNED`, `ON_DELIVERY`, `COMPLETED`, `CANCELLED`).
- **Frontend hiện có:**
  - `frontend/src/app/admin/outbound-dispatch/page.tsx`: Mới chỉ có nút ghép chuyến thủ công (`Ghép Chuyến Mới`), chưa có tính năng tự động tính toán và phân bổ nhiều đơn vào nhiều xe theo sức chứa & trạng thái rảnh/bận của xe.

---

## C. Implementation Scope

### Backend
- **`backend/src/main/java/com/btl/webbanrau/service/OutboundDispatchService.java`:**
  - Bổ sung method `generateAutoDispatchPlan(Long hubId)`:
    1. Lấy danh sách đơn `QC_PASSED` đủ điều kiện (`getEligibleContracts(hubId)`), sắp xếp theo độ ưu tiên:
       - Hạn giao Buyer (`hubDeliveryDate`) sớm nhất lên trước (FEFO / chống trễ hạn).
       - Khối lượng giảm dần (Best-Fit Decreasing) để tối ưu không gian thùng xe.
    2. Lấy toàn bộ xe của Hub (`status != 'MAINTENANCE'`) và chia thành 2 nhóm:
       - **Nhóm 1 — Xe & Tài xế `AVAILABLE`:** Có thể xuất phát ngay.
       - **Nhóm 2 — Xe đang `ASSIGNED` / `ON_TRIP`:** Dự kiến cho **Chuyến sau (Chờ xe về)**.
    3. Chạy thuật toán **Best-Fit Decreasing (2D: Weight + Volume)**:
       - Ghép lần lượt các đơn ưu tiên vào các xe `AVAILABLE` (mỗi xe gán 1 tài xế `AVAILABLE`), đảm bảo `usedWeight <= capacityKg` và `usedVolume <= volumeM3`. Tạo danh sách `readyTrips`.
       - Các đơn còn lại (nếu hết xe `AVAILABLE` hoặc hết tài xế `AVAILABLE`) được ghép giả lập vào **Nhóm xe đang bận** theo sức chứa để tạo danh sách `queuedTrips` (Chuyến sau — chờ xe về), kèm lý do & biển số xe dự kiến nhận.
       - Nếu có đơn vượt quá tải trọng tối đa của mọi xe trong Hub, đưa vào `unassignedContracts` kèm cảnh báo rõ.
  - Bổ sung method `executeAutoDispatch(Long hubId, List<ConfirmOutboundTripRequest> trips)`:
    - Thực thi tạo hàng loạt các chuyến trong `readyTrips` trong cùng 1 `@Transactional` bằng cách tái sử dụng `confirmOutboundTrip(hubId, req)` để đảm bảo toàn bộ ràng buộc nghiệp vụ (ONCE, khóa xe/tài xế, đồng bộ WebSocket).
- **`backend/src/main/java/com/btl/webbanrau/controller/AdminOutboundDispatchController.java`:**
  - Thêm `GET /admin/outbound-dispatch/auto-plan?hubId={hubId}` — Trả về kế hoạch tối ưu (`readyTrips`, `queuedTrips`, `unassignedContracts`, thống kê tỷ lệ lấp đầy).
  - Thêm `POST /admin/outbound-dispatch/auto-confirm?hubId={hubId}` — Xác nhận tạo tất cả các chuyến sẵn sàng từ kế hoạch tối ưu.

### Frontend
- **`frontend/src/services/fleetDispatchApi.ts`:**
  - Thêm kiểu `AutoDispatchPlanDto` và 2 hàm API: `getAutoDispatchPlan(hubId)` và `confirmAutoDispatch(hubId, trips)`.
- **`frontend/src/app/admin/outbound-dispatch/page.tsx`:**
  - Thêm nút **"⚡ Tự Động Ghép Chuyến (Tối Ưu)"** cạnh nút **Ghép Chuyến Mới**.
  - Thêm **Modal Kế Hoạch Tối Ưu Giao Hàng**:
    - **Phần 1 — Các Chuyến Sẵn Sàng Xuất Phát Ngay (`readyTrips`):** Hiển thị từng xe + tài xế được ghép cặp, danh sách mã đơn, thanh tiến độ tải trọng (`kg`) và thể tích (`m³`). Cho phép tích chọn/bỏ bớt chuyến trước khi xác nhận.
    - **Phần 2 — Hàng Đợi Chuyến Sau / Chờ Xe Về (`queuedTrips`):** Hiển thị rõ các đơn chưa thể xuất phát ngay vì các xe phù hợp đang bận giao chuyến khác, kèm thông tin *"Dự kiến ghép vào xe `51D-...` sau khi xe hoàn tất chuyến hiện tại về kho"*.
    - **Phần 3 — Đơn vượt tải / chưa thể ghép (nếu có):** Cảnh báo rõ lý do (VD: thiếu tài xế rảnh hoặc vượt tải trọng tối đa của xe).
    - Nút **"Xác Nhận Tạo X Chuyến Sẵn Sàng"** -> gọi API tạo chuyến, làm mới bản đồ & danh sách.

### Database
- Không cần tạo bảng mới hay chạy migration.

---

## D. API Contract

1. **Tính toán kế hoạch tự động ghép chuyến**
   - `GET /admin/outbound-dispatch/auto-plan?hubId={hubId}` (`ROLE_ADMIN`)
   - Response `200 OK`:
     ```json
     {
       "hubId": 2,
       "totalEligible": 5,
       "readyTrips": [
         {
           "vehicleId": 10,
           "plateNumber": "51D-892.45",
           "vehicleModel": "Hyundai Porter H150 Lạnh",
           "capacityKg": 1500,
           "volumeM3": 8.5,
           "driverId": 4,
           "driverName": "Nguyễn Văn A",
           "totalWeightKg": 1200,
           "totalVolumeM3": 4.2,
           "utilizationPct": 80,
           "stops": [ ... ]
         }
       ],
       "queuedTrips": [
         {
           "vehicleId": 11,
           "plateNumber": "49C-123.45",
           "currentVehicleStatus": "ON_TRIP",
           "estimatedReason": "Xe đang giao chuyến khác — dự kiến ghép chuyến sau khi xe về kho",
           "totalWeightKg": 600,
           "stops": [ ... ]
         }
       ],
       "unassignedContracts": []
     }
     ```
2. **Xác nhận tạo các chuyến từ kế hoạch tối ưu**
   - `POST /admin/outbound-dispatch/auto-confirm?hubId={hubId}` (`ROLE_ADMIN`)
   - Body: `{ "trips": [ ConfirmOutboundTripRequest, ... ] }`
   - Response `200 OK`: `{ "createdCount": 2, "tripCodes": ["OUT-...", "OUT-..."] }`

---

## E. Business Flow

1. Điều phối viên bấm **"⚡ Tự Động Ghép Chuyến (Tối Ưu)"** tại `/admin/outbound-dispatch`.
2. Hệ thống gọi `GET /admin/outbound-dispatch/auto-plan` để chạy thuật toán tối ưu theo hạn giao Buyer + sức chứa (kg & m³) + trạng thái xe/tài xế.
3. Modal hiển thị rõ:
   - Xe nào rảnh -> ghép thành chuyến xuất phát ngay.
   - Nếu xe đang bận giao hàng -> tự động chuyển sang xe rảnh khác; nếu hết xe rảnh -> xếp vào danh sách **Chuyến Sau (Chờ xe về)** kèm biển số xe dự kiến.
4. Điều phối viên bấm **"Xác Nhận Tạo Chuyến"** -> Backend tạo đồng loạt các chuyến sẵn sàng, khóa xe/tài xế và cập nhật bản đồ + danh sách ngay lập tức.

---

## F. Implementation Steps

1. Cập nhật `OutboundDispatchService.java` và `AdminOutboundDispatchController.java` (thêm `auto-plan` và `auto-confirm`).
2. Cập nhật `fleetDispatchApi.ts` (thêm DTO & 2 API functions).
3. Cập nhật `outbound-dispatch/page.tsx` (thêm nút Tự động ghép chuyến + Modal xem trước & xác nhận kế hoạch tối ưu).
4. Kiểm tra biên dịch Backend (`./gradlew compileJava -x test`) và TypeScript Frontend (`npx tsc --noEmit`).

---

## G. Risks & Considerations

- **Tính nguyên tử (Atomicity):** Nếu trong quá trình xác nhận hàng loạt (`auto-confirm`) có 1 đơn vừa bị thao tác thủ công trước đó vài giây, `@Transactional` sẽ rollback toàn bộ và báo lỗi rõ ràng để điều phối viên bấm tính lại kế hoạch.
- **Tối ưu đa điểm (Multi-stop):** Nếu 1 xe ghép nhiều điểm giao, thứ tự điểm dừng (`stopSequence`) được sắp xếp theo hạn giao sớm nhất lên trước.

---

## H. Acceptance Criteria

1. Có nút **"⚡ Tự Động Ghép Chuyến (Tối Ưu)"** trên trang Giao hàng.
2. Tự động gom các đơn `QC_PASSED` vào các xe `AVAILABLE` đúng giới hạn `capacityKg` và `volumeM3`, không ghép quá tải và không ghép vào xe đang `ON_TRIP` / `ASSIGNED`.
3. Khi có xe đang giao hàng hoặc hết xe rảnh, hệ thống tự động chuyển đơn sang xe rảnh khác hoặc hiển thị rõ ở nhóm **Chuyến Sau (Chờ xe về)**.
4. Xác nhận kế hoạch tạo được chuyến Outbound thực tế và cập nhật đồng bộ lên bản đồ & danh sách.
