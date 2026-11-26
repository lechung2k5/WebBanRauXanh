# KẾ HOẠCH TRIỂN KHAI: PHÂN HỆ QUẢN LÝ KHO HÀNG, SƠ ĐỒ KHO, KỆ & SỨC CHỨA

---

## A. Overview

- **Tên chức năng:** Quản lý Kho hàng, Sơ đồ Buồng lạnh, Dãy kệ & Sức chứa (`/admin/warehouses` + đồng bộ `/admin/qc`)
- **Mục tiêu:** Cho phép Admin quản lý động toàn bộ cấu trúc lưu trữ của từng Kho/Trạm trung chuyển (`WarehouseHub`):
  1. Quản lý thông tin & tổng sức chứa của **Kho / Trạm**.
  2. CRUD **Buồng lạnh / Khu vực (`Zone`)** (nhiệt độ chuẩn, độ ẩm, sức chứa, trạng thái hoạt động/bảo trì).
  3. CRUD **Dãy kệ & Ô chứa (`Rack` / `Bin`)** (tạo từng ô hoặc tạo hàng loạt theo dãy kệ, cấu hình sức chứa tối đa từng ô, bật/tắt bảo trì).
  4. **Sơ đồ kho 3D tương tác trực tiếp trên Web (CSS 3D Perspective / `preserve-3d`, không cần thêm thư viện ngoài):**
     - Hiển thị các buồng lạnh (Zone), dãy kệ 3D và từng ô chứa (`Bin`) với góc nhìn 3D có thể xoay/nghiêng/phóng to.
     - **Hiển thị đúng số hàng thực tế trên từng kệ:** Số lượng kiện/thùng hàng 3D xếp trên ô kệ tỷ lệ trực tiếp với khối lượng/số thùng đang lưu của hợp đồng tại ô đó.
     - **Nhập thì thêm, xuất thì mất:** Khi tiếp nhận dỡ hàng vào kho (`AT_HUB_QC` / `HUB_DELIVERED` / `QC_PASSED` / `READY_OUTBOUND`), thùng hàng 3D xuất hiện trên đúng ô kệ; khi điều phối xuất kho giao Buyer (`OUTBOUND_DISPATCHED` / `IN_TRANSIT` / `DELIVERED` / `SETTLED` / `COMPLETED`), hàng tự động biến mất khỏi kệ và giải phóng sức chứa.
- **Phạm vi nghiệp vụ:** Đồng bộ theo Kho mà Admin đã chọn (`hona_admin_selected_hub_id`), liên kết trực tiếp với quy trình tiếp nhận cổng kho (`GATE_RECEIVING`) và kiểm soát FEFO ở `/admin/qc`.
- **Kết quả mong muốn:** Không còn dữ liệu Zone/Bin/Sức chứa hardcode; Admin toàn quyền thiết lập, theo dõi và điều hành sơ đồ kho thực tế.

---

## B. Current Architecture

- **Backend hiện có:**
  - Entity `WarehouseHub` (`warehouse_hubs`): lưu `id`, `hub_code`, `hub_name`, `region`, `address`, `latitude`, `longitude`, `hotline`, `manager_name`, `is_active`.
  - `WarehouseHubRepository`: `findByHubCode`, `findByActiveTrueOrderByHubNameAsc`.
  - `FleetManagementService` / `AdminFleetController`: mới có `GET /admin/dispatch/hubs` và `GET /admin/dispatch/hubs/{id}`.
  - `InboundLogisticsExecutionService.warehouseCompleteReceiving`: đang gán cứng mặc định `"Zone A (Rau lá 2-4°C)"` và `"R-01 / Bin A-0..."` nếu không có override từ request.
- **Frontend hiện có:**
  - `frontend/src/app/admin/qc/page.tsx`: Tab `FEFO_STORAGE` đang render cứng 3 Zone (`Zone A`, `Zone B`, `Zone C`) và 12 ô (`BIN A-01..04`, `BIN B-01..04`, `BIN C-01..04`) với sức chứa hardcode (`20.000 kg`, `15.000 kg`, tổng `50 tấn`).
  - `frontend/src/app/admin/layout.tsx`: Có cơ chế chọn Kho quản lý đầu phiên (`hona_admin_selected_hub_id`).

---

## C. Implementation Scope

### Database
- **Cập nhật bảng `warehouse_hubs`:**
  - Bổ sung cột `total_capacity_kg` (`NUMERIC(12,2) DEFAULT 50000.00`) để lưu tổng sức chứa thiết kế của kho.
- **Tạo mới bảng `warehouse_zones`:**
  - `id` (`BIGSERIAL PRIMARY KEY`)
  - `warehouse_id` (`BIGINT NOT NULL REFERENCES warehouse_hubs(id) ON DELETE CASCADE`)
  - `zone_code` (`VARCHAR(30) NOT NULL`) — VD: `ZONE-A`
  - `zone_name` (`VARCHAR(120) NOT NULL`) — VD: `Zone A — Kho Lạnh Rau Ăn Lá`
  - `description` (`VARCHAR(255)`) — Chuyên biệt mặt hàng
  - `temp_min` (`NUMERIC(4,1) NOT NULL DEFAULT 2.0`), `temp_max` (`NUMERIC(4,1) NOT NULL DEFAULT 6.0`)
  - `humidity_target` (`INTEGER DEFAULT 90`)
  - `capacity_kg` (`NUMERIC(12,2) NOT NULL DEFAULT 20000.00`)
  - `status` (`VARCHAR(30) NOT NULL DEFAULT 'ACTIVE'`) — `ACTIVE`, `MAINTENANCE`
  - `created_at`, `updated_at`
  - Unique constraint: `(warehouse_id, zone_code)`
- **Tạo mới bảng `warehouse_bins`:**
  - `id` (`BIGSERIAL PRIMARY KEY`)
  - `warehouse_id` (`BIGINT NOT NULL REFERENCES warehouse_hubs(id) ON DELETE CASCADE`)
  - `zone_id` (`BIGINT NOT NULL REFERENCES warehouse_zones(id) ON DELETE CASCADE`)
  - `rack_code` (`VARCHAR(30) NOT NULL`) — VD: `R-01`
  - `bin_code` (`VARCHAR(40) NOT NULL`) — VD: `BIN A-01`
  - `max_weight_kg` (`NUMERIC(12,2) NOT NULL DEFAULT 5000.00`)
  - `status` (`VARCHAR(30) NOT NULL DEFAULT 'ACTIVE'`) — `ACTIVE`, `MAINTENANCE`
  - `notes` (`TEXT`)
  - `created_at`, `updated_at`
  - Unique constraint: `(warehouse_id, bin_code)`
- **Seed dữ liệu mặc định:** Khi khởi tạo/migration (hoặc tự động seed nếu kho chưa có Zone nào), tạo sẵn 3 Zone (`Zone A`, `Zone B`, `Zone C`) và 12 ô Bin (`BIN A-01..04`, `BIN B-01..04`, `BIN C-01..04`) cho mỗi kho để tương thích 100% với các hợp đồng đã nhập kho trước đó.
- **Rủi ro dữ liệu:** Không xóa/thay đổi cột `hub_warehouse_zone` và `hub_rack_bin` trên `b2b_contracts`, nên dữ liệu hợp đồng cũ vẫn hiển thị bình thường trên sơ đồ mới.

### Backend
- **Tạo mới:**
  - Entity: `WarehouseZone.java`, `WarehouseBin.java`
  - Repository: `WarehouseZoneRepository.java`, `WarehouseBinRepository.java`
  - Service: `WarehouseStorageService.java` (quản lý CRUD Hub/Zone/Bin, tạo nhanh dãy kệ, tính toán khối lượng đang lưu từ `b2b_contracts`, kiểm tra sức chứa khi nhập kho & điều chuyển ô kệ `moveContractBin`)
  - Controller: `AdminWarehouseController.java` (`/admin/warehouses/...`)
- **Chỉnh sửa:**
  - `WarehouseHub.java`: thêm `totalCapacityKg`.
  - `InboundLogisticsExecutionService.java`: khi `warehouseCompleteReceiving` chạy, nếu có `coldZone`/`rackBin`, kiểm tra sức chứa còn lại của ô Bin (nếu bin tồn tại trong `warehouse_bins` và không ở trạng thái `MAINTENANCE`).

### Frontend
- **Tạo mới:**
  - `frontend/src/app/admin/warehouses/page.tsx`: Trang **Quản Lý Kho & Sơ Đồ Kệ** theo Kho đang chọn:
    - Thẻ tổng quan kho: Tổng sức chứa, Đang lưu (`kg`), Còn trống (`kg`), Tỷ lệ lấp đầy (`%`), Số Zone & Số ô kệ.
    - Nút chỉnh sửa thông tin & sức chứa Kho.
    - Tab **Cấu Hình Zone & Kệ (CRUD)**: Thêm/Sửa/Xóa/Bảo trì Zone; Thêm ô Bin hoặc **Sinh nhanh dãy kệ** (nhập mã kệ `R-02`, tiền tố `BIN A-`, số lượng ô, sức chứa mỗi ô).
    - Tab **Sơ Đồ Kho 3D Trực Quan**: Render buồng lạnh, dãy kệ 3D (`transform-style: preserve-3d`) với thanh điều chỉnh góc xoay/độ nghiêng 3D, hiển thị trực quan các kiện hàng 3D xếp trên từng ô kệ theo đúng số thùng/khối lượng thực tế (nhập kho thêm thùng, xuất kho tự mất khỏi kệ), thanh % sức chứa, cảnh báo FEFO, và nút **Chuyển ô kệ (`Move Bin`)**.
- **Chỉnh sửa:**
  - `frontend/src/app/admin/layout.tsx`: Thêm mục menu **`Kho hàng & Sơ đồ kệ`** (`/admin/warehouses`) vào sidebar Admin.
  - `frontend/src/services/fleetDispatchApi.ts`: Bổ sung các hàm gọi API `/admin/warehouses/...`.
  - `frontend/src/app/admin/qc/page.tsx`:
    - Thay thế 3 Zone & 12 Bin hardcode ở Tab `FEFO_STORAGE` bằng dữ liệu động từ `/admin/warehouses/{hubId}/layout`.
    - Thay dropdown chọn Zone/Bin tĩnh trong Modal Tiếp nhận cổng kho (`GATE_RECEIVING`) bằng danh sách Zone/Bin `ACTIVE` thực tế từ DB (hiển thị kèm sức chứa còn trống của từng ô).

---

## D. API Contract

Tất cả endpoint dưới tiền tố `/admin/warehouses` yêu cầu `ROLE_ADMIN`:

1. **Lấy sơ đồ kho tổng hợp (Hub + Zones + Bins + Khối lượng đang lưu)**
   - `GET /admin/warehouses/{hubId}/layout`
   - Chỉ tính các hợp đồng đang còn lưu trong kho (`status IN ('AT_HUB_QC', 'HUB_DELIVERED', 'QC_PASSED', 'READY_OUTBOUND')` và `hub_inbound_at IS NOT NULL`); các đơn đã xuất kho (`OUTBOUND_DISPATCHED`, `IN_TRANSIT`, `DELIVERED`, `SETTLED`, `COMPLETED`) tự động không còn trên kệ.
   - Response `200 OK`: `{ hub, totalUsedKg, utilizationPct, zones: [{ ...zone, usedKg, bins: [{ ...bin, usedKg, packageCount, contracts: [...] }] }] }`
2. **Cập nhật thông tin & sức chứa Kho**
   - `PUT /admin/warehouses/{hubId}`
   - Body: `{ hubName, managerName, hotline, address, totalCapacityKg, active }`
3. **CRUD Buồng lạnh (Zone)**
   - `POST /admin/warehouses/{hubId}/zones`
   - `PUT /admin/warehouses/zones/{zoneId}`
   - `DELETE /admin/warehouses/zones/{zoneId}` (chặn nếu Zone đang có hàng lưu kho)
4. **CRUD Kệ & Ô chứa (Rack / Bin)**
   - `POST /admin/warehouses/zones/{zoneId}/bins` (tạo 1 ô hoặc tạo hàng loạt theo `rackCode`, `binPrefix`, `startIndex`, `count`, `maxWeightKg`)
   - `PUT /admin/warehouses/bins/{binId}` (cập nhật mã kệ, sức chứa, trạng thái `ACTIVE` / `MAINTENANCE`, ghi chú)
   - `DELETE /admin/warehouses/bins/{binId}` (chặn nếu ô Bin đang có hàng lưu kho)
5. **Điều chuyển lô hàng sang ô kệ khác**
   - `POST /admin/warehouses/contracts/{contractId}/move-bin`
   - Body: `{ targetBinId }` → kiểm tra ô đích `ACTIVE` và đủ sức chứa còn lại, cập nhật `hub_warehouse_zone` & `hub_rack_bin` trên `b2b_contracts`.

---

## E. Business Flow

1. Admin mở **Kho hàng & Sơ đồ kệ** (`/admin/warehouses`), hệ thống tự lọc theo Kho Admin đã chọn.
2. Admin thiết lập/chỉnh sửa tổng sức chứa kho, thêm các buồng lạnh (`Zone`) với dải nhiệt độ phù hợp, và tạo các dãy kệ (`Rack`) + ô chứa (`Bin`) với sức chứa tối đa (`kg`).
3. Khi xe gom hàng về cổng kho và thực hiện **Cân đối soát & Tiếp nhận dỡ hàng** (`/admin/qc`), nhân viên chọn Zone & ô Bin đang trống/đủ sức chứa từ danh sách động.
4. Sơ đồ 2D ở cả `/admin/warehouses` và `/admin/qc` tự động cập nhật khối lượng đang lưu, `%` lấp đầy của từng ô kệ, từng Zone và toàn kho.
5. Khi cần sắp xếp lại kho, Admin bấm **Chuyển ô kệ** trên một lô hàng để chuyển sang ô khác còn sức chứa.

---

## F. Implementation Steps

1. Tạo bảng `warehouse_zones`, `warehouse_bins`, thêm cột `total_capacity_kg` vào `warehouse_hubs` và seed dữ liệu Zone/Bin mặc định cho 5 kho.
2. Tạo Entity (`WarehouseZone`, `WarehouseBin`), Repository (`WarehouseZoneRepository`, `WarehouseBinRepository`) và cập nhật `WarehouseHub`.
3. Tạo `WarehouseStorageService` và `AdminWarehouseController` với đầy đủ API CRUD + Layout + Move Bin + kiểm soát sức chứa.
4. Cập nhật `fleetDispatchApi.ts`, tạo trang `frontend/src/app/admin/warehouses/page.tsx`, và gắn menu vào `admin/layout.tsx`.
5. Cập nhật `admin/qc/page.tsx` dùng sơ đồ & dropdown Zone/Bin động từ API mới.
6. Kiểm tra tĩnh bằng `./gradlew compileJava -x test` và `npx tsc --noEmit`.

---

## G. Risks & Considerations

- **Tương thích dữ liệu hợp đồng cũ:** Các hợp đồng cũ lưu `hub_warehouse_zone` dạng text dài (`"Zone A (Lạnh mát 2-6°C)"`) và `hub_rack_bin` dạng `"Kệ R-01 Ô A-01"` hoặc `"R-01 / Bin A-01"`. Service tính khối lượng đang lưu cần match linh hoạt theo `bin_code` (VD: chứa `A-01`) để không bị sót hàng cũ.
- **Xóa Zone/Bin đang chứa hàng:** Bắt buộc chặn xóa cứng nếu vẫn còn hợp đồng đang lưu trong Zone/Bin đó, tránh mất dấu vị trí hàng.
- **Kiểm soát sức chứa:** Nếu cập nhật giảm `max_weight_kg` nhỏ hơn khối lượng đang lưu hiện tại, phải cảnh báo/chặn để tránh âm sức chứa còn lại.

---

## H. Acceptance Criteria

1. Sidebar Admin có mục **Kho hàng & Sơ đồ kệ** (`/admin/warehouses`).
2. Admin xem, sửa thông tin & sức chứa Kho; CRUD đầy đủ Zone và Kệ/Ô chứa (bao gồm tạo hàng loạt dãy kệ và bật/tắt bảo trì).
3. Sơ đồ kho 2D hiển thị động theo Database, tính đúng `kg` đang lưu và `%` sức chứa từng ô/Zone/toàn kho.
4. Không cho xóa Zone/Bin đang có hàng; cảnh báo/chặn khi nhập hàng hoặc chuyển kệ vượt quá sức chứa ô Bin.
5. `/admin/qc` đồng bộ 100% Zone/Bin động ở cả tab `GATE_RECEIVING` và `FEFO_STORAGE`.
6. Backend (`compileJava`) và Frontend (`tsc --noEmit`) biên dịch thành công không lỗi.
