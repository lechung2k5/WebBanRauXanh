# KẾ HOẠCH TRIỂN KHAI SÀN CHÀO MUA B2B THỰC TẾ (ĐĂNG TIN THU MUA & CHÀO GIÁ TỪ LÔ ĐÃ DUYỆT)

---

## A. Overview

- **Tên chức năng:** Hoàn thiện luồng nghiệp vụ **Sàn Chào Mua B2B Trực Tuyến** (Thương lái đăng tin cần thu mua & Nhà vườn gửi chào giá cung cấp từ lô nông sản đã được duyệt).
- **Mục tiêu:**
  - Chuyển đổi khu vực **Sàn Chào Mua B2B** từ dữ liệu mẫu (`MOCK_B2B_PROCUREMENT_REQUESTS`) sang dữ liệu thật lưu trữ trên Database, đồng bộ thời gian thực (WebSocket).
  - Áp dụng chặt chẽ quy tắc nghiệp vụ: **Nhà vườn / HTX chỉ được phép gửi chào giá cung cấp khi đã có ít nhất 1 lô nông sản (`HarvestLot`) được đăng và duyệt trước đó (`status = 'OPEN'`, còn sản lượng khả dụng)**, và phải chọn chính xác lô đã duyệt đó để gắn vào báo giá.
- **Đối tượng sử dụng:**
  - **Thương lái (`ROLE_BUYER`):** Đăng tin cần thu mua nông sản sỉ, xem danh sách báo giá từ các Nhà vườn gửi về và chuyển thành đơn đàm phán/hợp đồng.
  - **Nhà vườn / HTX (`ROLE_FARMER`, `ROLE_COOPERATIVE`):** Xem tin tìm nguồn cung trên Sàn Chào Mua, chọn lô nông sản đã duyệt của mình để gửi chào giá cung cấp.
  - **Khách / Vai trò khác:** Chỉ xem thông tin công khai; khi bấm Đăng tin hoặc Chào giá sẽ được nhắc đăng nhập đúng vai trò.
- **Kết quả mong muốn:**
  - Tin cần thu mua do Thương lái đăng được lưu vào Database, hiển thị ngay trên trang chủ (`ProcurementBoardSection`) và cập nhật số lượng nhà vườn chào giá realtime.
  - Nhà vườn chưa có lô `OPEN` bị chặn cả ở Frontend lẫn Backend với thông báo hướng dẫn sang `/portal/farmer` để đăng & chờ duyệt lô.

---

## B. Current Architecture

- **Frontend hiện có:**
  - `frontend/src/components/ProcurementBoardSection.tsx`: Đang hiển thị danh sách từ `MOCK_PROCUREMENT_REQUESTS` + `localStorage('b2b_procurement_posts')`; nút `Chào giá cung cấp` chỉ tăng đếm giả ở state local.
  - `frontend/src/components/CreateProcurementModal.tsx`: Hiện chỉ là hộp thoại thông báo tĩnh 7 dòng, chưa có form nhập liệu.
  - `frontend/src/services/websocketService.ts`: Đã kết nối STOMP WebSocket với Spring Boot (`/topic/contracts`, `/topic/rfqs`, `/topic/lots`, `/topic/dispatch`).
- **Backend hiện có:**
  - `HarvestLot` (`harvest_lots`) + `HarvestLotRepository`: Đã có `findByFarmerIdOrderByCreatedAtDesc(Long farmerId)`, trường `status` (`OPEN`, `PENDING_APPROVAL`, `REJECTED`, ...), `availableWeightKg`, `lotCode`, `pucCode`, `certification`.
  - `B2bRealtimeService`: Đã có `SimpMessagingTemplate` để phát sự kiện realtime.

---

## C. Implementation Scope

### 1. Database (Entity & Bảng mới)
- **Bảng `procurement_requests` (`ProcurementRequest`):**
  - `id` (PK, auto increment)
  - `request_code` (String, unique, VD: `PR-2026-0001`)
  - `buyer_id` (Long, FK tới `users.id`)
  - `buyer_name`, `buyer_company` (String)
  - `category` (String: `RAU_AN_LA`, `CU_QUA`, `NAM_TUOI`, `NONG_SAN_LANH`, ...)
  - `title` (String, not null)
  - `volume_needed` (String, VD: `"20 Tấn"`)
  - `target_price_range` (String, VD: `"8.500 - 10.000 đ/kg"`)
  - `destination` (String: địa điểm giao hàng)
  - `status` (String: `OPEN`, `CLOSED`, `FULFILLED`)
  - `created_at`, `updated_at` (kế thừa `BaseEntity`)
- **Bảng `procurement_quotes` (`ProcurementQuote`):**
  - `id` (PK, auto increment)
  - `procurement_request_id` (Long, FK tới `procurement_requests.id`)
  - `farmer_id` (Long, FK tới `users.id`)
  - `farmer_name` (String)
  - `harvest_lot_id` (Long, FK tới `harvest_lots.id` — **bắt buộc là lô của `farmer_id` có `status = 'OPEN'`**)
  - `lot_code`, `puc_code`, `certification` (Snapshot từ `HarvestLot` để hiển thị nhanh)
  - `offered_price_per_kg` (BigDecimal)
  - `offered_quantity_kg` (BigDecimal)
  - `delivery_date` (LocalDate, nullable)
  - `notes` (Text)
  - `status` (String: `PENDING`, `ACCEPTED`, `REJECTED`)
  - `created_at`, `updated_at`
  - **Ràng buộc:** Unique `(procurement_request_id, farmer_id, harvest_lot_id)` hoặc mỗi nhà vườn chỉ gửi 1 báo giá cho 1 tin với 1 lô cụ thể.
- **Rủi ro dữ liệu:** Tạo bảng mới hoàn toàn, không sửa đổi hay làm ảnh hưởng đến dữ liệu bảng `harvest_lots`, `b2b_contracts`, `users` hiện có.

### 2. Backend (Spring Boot)
- **Tạo mới:**
  - `model/ProcurementRequest.java`, `model/ProcurementQuote.java`
  - `repository/ProcurementRequestRepository.java`, `repository/ProcurementQuoteRepository.java`
  - `dto/request/CreateProcurementRequestDto.java`, `dto/request/CreateProcurementQuoteDto.java`
  - `dto/response/ProcurementRequestResponse.java`, `dto/response/ProcurementQuoteResponse.java`
  - `service/ProcurementService.java` (Interface + Impl hoặc Service class theo convention hiện tại)
  - `controller/ProcurementController.java` (`/api/v1/procurements`)
- **Cập nhật:**
  - `service/B2bRealtimeService.java`: Thêm `notifyProcurementUpdated(String action, Object data)` gửi lên `/topic/procurements`.
  - Kiểm tra `SecurityConfig` để cho phép `GET /api/v1/procurements` công khai (xem trên trang chủ), còn `POST` / xem báo giá yêu cầu đã đăng nhập đúng role (`ROLE_BUYER` hoặc `ROLE_FARMER`/`ROLE_COOPERATIVE`).
- **Validation & Business Rule ở Backend (`ProcurementService`):**
  - Khi tạo tin thu mua (`createRequest`): kiểm tra user hiện tại có `ROLE_BUYER` (hoặc `ROLE_ADMIN`).
  - Khi nhà vườn gửi chào giá (`submitQuote`):
    1. Kiểm tra user có `ROLE_FARMER` hoặc `ROLE_COOPERATIVE`.
    2. Truy vấn `HarvestLot` theo `harvestLotId`.
    3. Kiểm tra `lot.getFarmerId().equals(currentUser.getId())` (chống dùng lô của người khác).
    4. Kiểm tra `"OPEN".equalsIgnoreCase(lot.getStatus())` và `lot.getAvailableWeightKg() > 0` (**bắt buộc lô đã được duyệt trước đó và còn hàng**). Nếu chưa có lô hoặc lô đang `PENDING_APPROVAL`/`REJECTED` → Ném `BadRequestException("Bạn cần có lô nông sản đã được duyệt (OPEN) trước khi gửi chào giá cung cấp.")`.
    5. Kiểm tra `offeredQuantityKg <= lot.getAvailableWeightKg()`.

### 3. Frontend (ReactJS / Next.js)
- **Tạo mới:**
  - `frontend/src/components/QuoteProcurementModal.tsx`: Modal dành cho Nhà vườn khi bấm **Chào giá cung cấp**:
    - Tự động gọi API lấy danh sách `HarvestLot` của nhà vườn có `status === 'OPEN'` và `availableWeightKg > 0`.
    - **Trường hợp chưa có lô đã duyệt:** Hiển thị cảnh báo rõ ràng *"Bạn chưa có lô nông sản nào được duyệt để chào giá. Vui lòng đăng lô và chờ BQT phê duyệt trước."* + nút chuyển thẳng tới `/portal/farmer`.
    - **Trường hợp đã có lô đã duyệt:** Cho phép chọn lô từ danh sách (hiển thị tên sản phẩm, mã lô, mã PUC, sản lượng còn lại), nhập giá chào bán (đ/kg), số lượng cam kết (kg), ngày giao & ghi chú → Gọi API gửi báo giá.
  - (Tùy chọn trong tab `Đơn Đàm Phán` hoặc Modal): Modal/Danh sách xem các báo giá nhận được dành cho Thương lái chủ tin thu mua.
- **Chỉnh sửa:**
  - `frontend/src/components/CreateProcurementModal.tsx`: Thay hộp thoại tĩnh bằng form đăng tin thu mua đầy đủ (Tiêu đề, Ngành hàng, Sản lượng cần, Giá sỉ kỳ vọng, Điểm giao hàng) kèm kiểm tra đăng nhập `ROLE_BUYER`.
  - `frontend/src/components/ProcurementBoardSection.tsx`:
    - Tải danh sách tin thật từ API `GET /api/v1/procurements` (kết hợp fallback gọn nếu chưa có tin hoặc giữ danh sách thật).
    - Lắng nghe WebSocket `/topic/procurements` để cập nhật ngay khi có tin mới hoặc có nhà vườn vừa chào giá (`quoteCount` tăng realtime).
    - Nút **Chào giá cung cấp**: Mở `QuoteProcurementModal` (kiểm tra đăng nhập `ROLE_FARMER` / `ROLE_COOPERATIVE`).
  - `frontend/src/services/api.ts` & `frontend/src/services/websocketService.ts`: Thêm các hàm API và `subscribeProcurements`.

---

## D. API Contract

| Method | Endpoint | Quyền | Request / Response |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/procurements` | Public | Trả về danh sách `ProcurementRequestResponse[]` kèm `quoteCount`, `buyerName`, `buyerCompany`, `status`. |
| `POST` | `/api/v1/procurements` | `ROLE_BUYER` | Body: `{ title, category, volumeNeeded, targetPriceRange, destination }` → `201 Created` trả về `ProcurementRequestResponse`. |
| `POST` | `/api/v1/procurements/{id}/quotes` | `ROLE_FARMER`, `ROLE_COOPERATIVE` | Body: `{ harvestLotId, offeredPricePerKg, offeredQuantityKg, deliveryDate, notes }` → Validate lô `OPEN` của chính farmer → `201 Created` trả về `ProcurementQuoteResponse`. |
| `GET` | `/api/v1/procurements/{id}/quotes` | `ROLE_BUYER` (chủ tin) / `ROLE_ADMIN` | Trả về danh sách báo giá `ProcurementQuoteResponse[]` kèm thông tin lô đã duyệt (`lotCode`, `pucCode`, `certification`). |

---

## E. Business Flow

1. **Luồng Đăng Tin Thu Mua (Buyer):**
   - Thương lái bấm **Đăng tin cần thu mua** → Điền form trong `CreateProcurementModal` → `POST /api/v1/procurements` → Backend lưu DB & phát sự kiện `/topic/procurements` → Toàn bộ client cập nhật tin mới trên Sàn Chào Mua.
2. **Luồng Chào Giá Cung Cấp (Farmer):**
   - Nhà vườn bấm **Chào giá cung cấp** trên 1 tin → Mở `QuoteProcurementModal` → Frontend kiểm tra danh sách lô `OPEN` của nhà vườn đó.
   - Nếu **chưa có lô `OPEN`**: Chặn gửi, hướng dẫn vào `/portal/farmer` đăng lô & chờ duyệt.
   - Nếu **có lô `OPEN`**: Nhà vườn chọn lô, nhập giá & sản lượng → `POST /api/v1/procurements/{id}/quotes` → Backend xác thực lại chủ sở hữu lô + trạng thái `OPEN` → Lưu `ProcurementQuote` & phát `/topic/procurements` → `quoteCount` trên Sàn Chào Mua tăng realtime.

---

## F. Implementation Steps

1. **Bước 1 — Backend Entities & Repositories:** Tạo `ProcurementRequest`, `ProcurementQuote` và 2 Repository tương ứng.
2. **Bước 2 — Backend DTO, Service & Realtime:** Tạo DTOs, `ProcurementService` (kèm logic kiểm tra bắt buộc lô `OPEN` của Farmer), cập nhật `B2bRealtimeService`.
3. **Bước 3 — Backend Controller & Security:** Tạo `ProcurementController` và cấu hình quyền truy cập trong `SecurityConfig`.
4. **Bước 4 — Frontend API & WebSocket:** Thêm hàm gọi `/api/v1/procurements` vào `api.ts` và `subscribeProcurements` vào `websocketService.ts`.
5. **Bước 5 — Frontend UI (`CreateProcurementModal`, `QuoteProcurementModal`, `ProcurementBoardSection`):** Hoàn thiện form đăng tin cho Buyer, modal chào giá bắt buộc chọn lô đã duyệt cho Farmer, và cập nhật realtime.
6. **Bước 6 — Kiểm tra tĩnh:** Rà soát toàn bộ type, API contract, phân quyền và xử lý lỗi.

---

## G. Risks & Considerations

- **Bảo mật & Chống giả mạo lô:** Không tin tưởng dữ liệu từ Frontend; Backend phải tự truy vấn `HarvestLot` theo `harvestLotId` và xác minh `lot.farmerId == currentUser.id` và `lot.status == 'OPEN'`.
- **Tương thích dữ liệu cũ:** Sử dụng `spring.jpa.hibernate.ddl-auto` theo cấu hình hiện tại của dự án để tự tạo 2 bảng mới mà không ảnh hưởng bảng cũ.
- **Trạng thái chưa đăng nhập / sai vai trò:** Hiển thị thông báo thân thiện nếu Buyer bấm "Chào giá cung cấp" hoặc Farmer bấm "Đăng tin cần thu mua".

---

## H. Acceptance Criteria

1. Thương lái (`ROLE_BUYER`) đăng được tin cần thu mua mới, lưu DB thành công và hiển thị realtime trên trang chủ.
2. Nhà vườn (`ROLE_FARMER` / `ROLE_COOPERATIVE`) **chưa có lô nào `OPEN`** khi bấm **Chào giá cung cấp** sẽ nhận được thông báo yêu cầu đăng & duyệt lô trước, không gửi được báo giá (cả Frontend lẫn API Backend).
3. Nhà vườn **đã có lô `OPEN`** chọn được lô của mình trong modal, gửi chào giá thành công, lưu xuống DB và số lượng nhà vườn chào giá (`quoteCount`) cập nhật realtime trên Sàn Chào Mua.
