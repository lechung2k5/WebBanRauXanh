# KẾ HOẠCH TRIỂN KHAI: MODULE QUẢN LÝ NHÂN VIÊN KHO & VẬN HÀNH (ADMIN)

---

## A. Overview

- **Tên chức năng:** Quản lý Nhân viên Kho & Vận hành (`/admin/staff`)
- **Mục tiêu:** Xây dựng trang quản lý tập trung cho Admin để **CRUD đầy đủ** (Xem, Thêm, Sửa, Đổi trạng thái, Xóa an toàn) toàn bộ nhân sự vận hành theo từng Trạm/Kho (`WarehouseHub`), bao gồm 3 nhóm vai trò:
  1. **Tài xế xe lạnh (`DRIVER`)** — hạng bằng `B2`, `C`, `C1`, `CE`, `FC`.
  2. **Nhân viên kiểm định QC (`QC_TECH`)** — kỹ thuật viên phòng Lab QC tại kho.
  3. **Nhân viên kho (`WAREHOUSE_STAFF`)** — nhân viên tiếp nhận cổng kho, cân đếm, sắp xếp kho lạnh & FEFO.
- **Phạm vi nghiệp vụ:**
  - Giao diện quản lý nhân sự chuyên biệt trong Admin Portal (sidebar `/admin/staff`), lọc theo Kho/Hub, lọc theo Vai trò, lọc theo Trạng thái (`AVAILABLE`, `ASSIGNED`, `ON_TRIP`, `OFF_DUTY`), tìm kiếm theo tên/mã/SĐT.
  - Đồng bộ dữ liệu nhân sự với các module đang dùng chung (`Điều phối lấy hàng rẫy`, `Trạm QC & FEFO`, `Điều phối giao Buyer`).
- **Kết quả mong muốn:** Admin có 1 trang duy nhất quản lý toàn bộ 3 nhóm nhân viên với đầy đủ thao tác CRUD, dữ liệu lưu bền vững trong PostgreSQL và được sử dụng đúng vai trò ở các màn hình điều phối và kiểm định QC.

---

## B. Current Architecture

- **Backend hiện có:**
  - Entity `FleetDriver` (`fleet_drivers`) đã có đầy đủ trường: `id`, `warehouse_id`, `driver_code`, `full_name`, `phone`, `license_number`, `license_class` (`varchar(10)`), `status`, `experience_years`.
  - `FleetDriverRepository` (`findByWarehouseIdOrderByFullNameAsc`, `findByWarehouseIdAndStatusOrderByExperienceYearsDesc`, `findByDriverCode`, `findByLicenseNumber`).
  - `FleetManagementService` & `AdminFleetController` (`/admin/dispatch/drivers`) hiện mới hỗ trợ `GET`, `POST`, `PATCH /status` (chưa có `PUT` cập nhật thông tin, chưa có `DELETE`, chưa hỗ trợ query tất cả kho hoặc lọc theo vai trò).
  - `PickupTrip` (và các chuyến giao hàng) có khóa ngoại `driver_id` trỏ tới `fleet_drivers(id)`.
- **Frontend hiện có:**
  - Sidebar Admin tại `frontend/src/app/admin/layout.tsx` có 8 module.
  - `frontend/src/app/admin/inbound-dispatch/page.tsx` đang có tab `Nhân Viên & Tài Xế` (hiển thị theo từng Hub, cho phép thêm mới và bật/tắt `AVAILABLE` / `OFF_DUTY`).
  - `frontend/src/app/admin/qc/page.tsx` đã đọc danh sách `QC_TECH` từ `fleetDispatchApi.getDrivers(hubId)` để hiển thị dropdown chọn Kỹ thuật viên kiểm định.
  - `frontend/src/services/fleetDispatchApi.ts` chưa có hàm `updateDriver` (`PUT`) và `deleteDriver` (`DELETE`).

---

## C. Implementation Scope

### Frontend
- **Tạo mới:**
  - `frontend/src/app/admin/staff/page.tsx`: Trang Quản lý Nhân viên Kho & Vận hành với KPI tổng quan theo vai trò, bộ lọc theo Kho (hoặc Tất cả kho), Vai trò (`ALL` / `DRIVER` / `QC_TECH` / `WAREHOUSE_STAFF`), Trạng thái, ô tìm kiếm, bảng/danh sách nhân viên, và Modal Thêm/Sửa nhân viên + Xác nhận Xóa.
- **Chỉnh sửa:**
  - `frontend/src/app/admin/layout.tsx`: Thêm mục menu **`Nhân viên & Tài xế`** (`/admin/staff`) vào sidebar Admin.
  - `frontend/src/services/fleetDispatchApi.ts`: Bổ sung `getAllStaff(warehouseId?, role?)`, `updateDriver(id, data)`, `deleteDriver(id)` và mở rộng `FleetDriverDto` với trường `staffRole` (suy ra từ `licenseClass`).
  - `frontend/src/app/admin/inbound-dispatch/page.tsx`: Đảm bảo bộ lọc loại trừ cả `QC_TECH` lẫn `WAREHOUSE_STAFF` khỏi danh sách chọn tài xế lái xe tải; đồng thời gắn nút liên kết nhanh sang `/admin/staff` nếu muốn quản lý chi tiết.
  - `frontend/src/app/admin/qc/page.tsx`: Hỗ trợ chọn `QC_TECH` (và tùy chọn hiển thị thêm nhân viên kho nếu cần trong tab tiếp nhận cổng kho).

### Backend
- **Chỉnh sửa:**
  - `backend/src/main/java/com/btl/webbanrau/service/FleetManagementService.java`:
    - Cập nhật `getAvailableDriversByHub` chỉ lấy tài xế lái xe (`!QC_TECH` và `!WAREHOUSE_STAFF`).
    - Bổ sung `getAllStaff(Long warehouseId, String role)` (hỗ trợ lấy toàn bộ nhân sự hoặc lọc theo kho/vai trò).
    - Bổ sung `updateDriver(Long id, FleetDriverRequest req)` (cập nhật họ tên, SĐT, kho công tác, mã nhân viên, số GPLX/chứng chỉ, vai trò/hạng bằng, số năm kinh nghiệm, trạng thái — có kiểm tra trùng `driverCode` / `licenseNumber` ngoại trừ chính bản ghi hiện tại).
    - Bổ sung `deleteDriver(Long id)` (kiểm tra nếu đang `ASSIGNED` / `ON_TRIP` hoặc đã phát sinh chuyến xe trong `pickup_trips` / `outbound_delivery_trips` thì chặn xóa cứng và báo rõ để Admin chuyển sang `OFF_DUTY`).
  - `backend/src/main/java/com/btl/webbanrau/controller/AdminFleetController.java`:
    - Mở rộng `GET /admin/dispatch/drivers` hỗ trợ `warehouseId` tùy chọn và `role` tùy chọn.
    - Thêm `PUT /admin/dispatch/drivers/{id}` và `DELETE /admin/dispatch/drivers/{id}`.
  - `backend/src/main/java/com/btl/webbanrau/repository/FleetDriverRepository.java`: Bổ sung query `findAllByOrderByWarehouseIdAscFullNameAsc()` khi xem toàn bộ kho.

### Database
- **Bảng liên quan:** `fleet_drivers` (`warehouse_id`, `driver_code`, `full_name`, `phone`, `license_number`, `license_class`, `status`, `experience_years`).
- **Quy ước giá trị `license_class` (`varchar(10)`):**
  - Tài xế (`DRIVER`): `B2`, `C`, `C1`, `CE`, `FC`.
  - Nhân viên kiểm định QC (`QC_TECH`): `QC_TECH` (7 ký tự).
  - Nhân viên kho (`WAREHOUSE_STAFF`): `WH_STAFF` (8 ký tự).
- **Migration:** Không cần thay đổi schema bảng (tái sử dụng `fleet_drivers` hiện có, tương thích 100% dữ liệu cũ).
- **Rủi ro dữ liệu:** Xóa nhân viên đã có lịch sử chuyến xe sẽ gây lỗi khóa ngoại `pickup_trips.driver_id`; xử lý bằng kiểm tra ràng buộc trước khi xóa ở Service.

---

## D. API Contract

Tất cả endpoint dưới tiền tố `/admin/dispatch` yêu cầu `ROLE_ADMIN`:

1. **Lấy danh sách nhân viên**
   - `GET /admin/dispatch/drivers?warehouseId={id}&status={status}&role={DRIVER|QC_TECH|WH_STAFF}` (`warehouseId`, `status`, `role` đều optional)
   - Response `200 OK`: `ApiResponse<List<FleetDriver>>`
2. **Thêm mới nhân viên**
   - `POST /admin/dispatch/drivers`
   - Body: `FleetDriverRequest` (`warehouseId`, `driverCode`, `fullName`, `phone`, `licenseNumber`, `licenseClass`, `status`, `experienceYears`)
   - Response `200 OK`: `ApiResponse<FleetDriver>` | `400 Bad Request` nếu trùng mã nhân viên hoặc số GPLX/chứng chỉ.
3. **Cập nhật thông tin nhân viên**
   - `PUT /admin/dispatch/drivers/{id}`
   - Body: `FleetDriverRequest`
   - Response `200 OK`: `ApiResponse<FleetDriver>` | `400 Bad Request` nếu trùng mã/số chứng chỉ với nhân viên khác hoặc không tìm thấy `id`.
4. **Đổi trạng thái nhanh**
   - `PATCH /admin/dispatch/drivers/{id}/status`
   - Body: `{ "status": "AVAILABLE" | "OFF_DUTY" }`
   - Response `200 OK`: `ApiResponse<FleetDriver>`
5. **Xóa nhân viên**
   - `DELETE /admin/dispatch/drivers/{id}`
   - Response `200 OK`: `ApiResponse<Void>` | `400 Bad Request` nếu nhân viên đang nhận chuyến hoặc đã có dữ liệu chuyến xe gắn với `driver_id`.

---

## E. Business Flow

1. Admin mở mục **Nhân viên & Tài xế** (`/admin/staff`) trên sidebar.
2. Hệ thống tải danh sách toàn bộ nhân sự (`Tài xế`, `KTV Kiểm định QC`, `Nhân viên kho`) từ `GET /admin/dispatch/drivers` và hiển thị thống kê theo vai trò & trạng thái.
3. Admin có thể:
   - **Thêm mới:** Chọn vai trò (`Tài xế` / `KTV QC` / `Nhân viên kho`), chọn Kho trực thuộc, nhập mã, họ tên, SĐT, số GPLX/chứng chỉ, kinh nghiệm → lưu qua `POST`.
   - **Chỉnh sửa:** Bấm **Sửa** trên thẻ/dòng nhân viên → cập nhật thông tin, điều chuyển kho, đổi hạng bằng/chức danh → lưu qua `PUT`.
   - **Đổi trạng thái:** Bật/tắt nhanh `AVAILABLE` ↔ `OFF_DUTY` qua `PATCH /status`.
   - **Xóa:** Bấm **Xóa** → xác nhận → Backend kiểm tra chưa từng tham gia chuyến xe (`pickup_trips` / trạng thái bận) mới xóa; nếu đã có lịch sử chuyến, báo lỗi rõ ràng để giữ toàn vẹn lịch sử vận hành.
4. Dữ liệu thay đổi phản ánh ngay vào:
   - Danh sách chọn tài xế ở `/admin/inbound-dispatch` (chỉ lấy `DRIVER` đang `AVAILABLE`).
   - Danh sách chọn kỹ thuật viên ở `/admin/qc` (chỉ lấy `QC_TECH` đang không `OFF_DUTY`).

---

## F. Implementation Steps

1. Cập nhật `FleetDriverRepository.java` và `FleetManagementService.java` (thêm `getAllStaff`, `updateDriver`, `deleteDriver`, lọc loại trừ `QC_TECH` và `WH_STAFF` khỏi `getAvailableDriversByHub`).
2. Cập nhật `AdminFleetController.java` (mở rộng `GET /drivers`, thêm `PUT /drivers/{id}` và `DELETE /drivers/{id}`).
3. Cập nhật `fleetDispatchApi.ts` (mở rộng `getDrivers` / thêm `updateDriver`, `deleteDriver`).
4. Tạo trang `frontend/src/app/admin/staff/page.tsx` với giao diện CRUD đầy đủ cho cả 3 nhóm nhân viên và gắn link vào `frontend/src/app/admin/layout.tsx`.
5. Cập nhật bộ lọc nhân sự lái xe ở `frontend/src/app/admin/inbound-dispatch/page.tsx` để loại trừ cả `WH_STAFF` và `QC_TECH`.
6. Kiểm tra tĩnh bằng `./gradlew compileJava -x test` và `npx tsc --noEmit`.

---

## G. Risks & Considerations

- **Khóa ngoại lịch sử chuyến xe:** Nếu nhân viên là tài xế đã từng chạy `pickup_trips` hoặc `outbound_delivery_trips`, việc `DELETE` cứng sẽ vi phạm ràng buộc FK. Giải pháp: kiểm tra trước ở Service và trả thông báo hướng dẫn chuyển sang `OFF_DUTY`.
- **Giới hạn độ dài cột `license_class`:** Cột `license_class` có `length = 10`, nên giá trị `QC_TECH` (7 ký tự) và `WH_STAFF` (8 ký tự) nằm gọn trong giới hạn, không cần sửa schema DB.
- **Tính đồng bộ khi sửa vai trò:** Nếu chuyển một tài xế đang `ASSIGNED` hoặc `ON_TRIP` sang vai trò khác hoặc `OFF_DUTY`, cần chặn hoặc cảnh báo khi đang bận chuyến.

---

## H. Acceptance Criteria

1. Sidebar Admin có mục **Nhân viên & Tài xế** dẫn tới `/admin/staff`.
2. Admin xem, tìm kiếm, lọc được theo Kho, Vai trò (`Tài xế`, `KTV Kiểm định QC`, `Nhân viên kho`) và Trạng thái.
3. Admin thực hiện được đầy đủ **Thêm, Sửa, Đổi trạng thái, Xóa** cho cả 3 nhóm nhân viên; dữ liệu lưu vào PostgreSQL.
4. Xóa nhân viên đã có lịch sử chuyến xe bị chặn an toàn với thông báo rõ ràng, không gây lỗi 500.
5. `QC_TECH` và `WH_STAFF` không xuất hiện trong dropdown phân công tài xế lái xe tải; `QC_TECH` xuất hiện đúng trong dropdown kiểm định QC ở `/admin/qc`.
6. Backend (`compileJava`) và Frontend (`tsc --noEmit`) biên dịch không lỗi.
