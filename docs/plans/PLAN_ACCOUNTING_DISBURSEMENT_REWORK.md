# KẾ HOẠCH TRIỂN KHAI: TÁCH LUỒNG THANH TOÁN BUYER – GIẢI NGÂN NÔNG DÂN, CẢI TẠO TRANG KẾ TOÁN & VÍ TIỀN FARMER

> **Dự án:** HONA FRESH (Nền tảng B2B kết nối Thương lái và Nhà vườn)  
> **Phạm vi:** Full-stack (ReactJS/Next.js + Spring Boot + PostgreSQL)  
> **Trạng thái:** Chờ phê duyệt (PLANNING)

---

## A. Overview

### 1. Tên chức năng
Hoàn thiện luồng dòng tiền 2 chiều (**Buyer thanh toán 100% về Sàn → Sàn quyết toán & giải ngân cho Nông dân**), nâng cấp toàn diện trang **Kế Toán & Kiểm Soát Dòng Tiền** phía Admin (Việt hóa 100%, lọc theo Trạm đang chọn hoặc Kiểm toán toàn hệ thống) và khóa quyền tự quyết toán ở mục **Ví Tiền & Giải Ngân** phía Nông dân.

### 2. Mục tiêu
1. **Phân tách rạch ròi 2 chặng dòng tiền B2B:**
   - **Chặng 1 (Buyer → Sàn):** Buyer thanh toán cọc 30% Escrow và thanh toán 70% còn lại sau khi ký ePOD. Tiền về tài khoản Sàn (`BUYER_PAID_100` — Đã thu đủ 100% từ Thương lái, chờ giải ngân Nông dân).
   - **Chặng 2 (Sàn → Nông dân):** Admin/Kế toán thực hiện đối soát và bấm **Giải ngân cho Nông dân** (`SETTLED` / `SETTLED_COMPLETED` — Đã giải ngân hoàn tất cho Nhà vườn).
2. **Cải tạo UX/UI trang Kế Toán Admin (`/admin/accounting`):**
   - Việt hóa 100% toàn bộ trạng thái dòng tiền, cột bảng, nhãn KPI, tab, thông báo và nút thao tác (loại bỏ các cụm tiếng Anh khó hiểu như `SETTLED_COMPLETED`, `BUYER_PAID_100`, `ESCROW_HOLDING_30`, `Payout`, `Net Inflow`, `Journal Entries`).
   - Thiết kế lại giao diện trực quan, dễ dùng: có nút thao tác **Giải ngân cho Nông dân** ngay tại bảng đối soát khi đơn đang ở trạng thái *Đã thu đủ 100% – Chờ giải ngân*, hiển thị rõ số tiền vào/giữ hộ/thực chi.
   - Tích hợp **bộ lọc theo Trạm đang chọn** (`hona_admin_selected_hub_id` + lắng nghe `hona-admin-hub-changed`) **và nút chuyển nhanh "Kiểm toán toàn bộ tất cả các trạm"** (dành cho Admin).
3. **Chuẩn hóa Ví Tiền & Giải Ngân phía Nông dân (`/portal/farmer`):**
   - Loại bỏ quyền **Nông dân tự bấm "Quyết Toán Ngay"** ở tab *Ví Tiền & Giải Ngân* (`farmer/page.tsx`) và nút tự tiến Mốc 6 trong `FarmerPostSaleView.tsx`.
   - Hiển thị đúng 3 trạng thái rõ ràng cho từng đơn: *Đang giữ cọc 30%*, *Chờ Sàn giải ngân (Buyer đã trả đủ 100%)*, và *Đã giải ngân hoàn tất về STK* (kèm mã giao dịch ngân hàng & chứng từ 01/TNDN).

---

## B. Current Architecture

### 1. Backend hiện tại
- `BuyerWorkflowService.confirmFinalPayment(Long contractId)` (`backend/.../service/BuyerWorkflowService.java`):
  - Hiện tại sau khi Buyer thanh toán 70%, hàm này gọi `business.transition` sang `DELIVERED` rồi **tự động gọi tiếp `SETTLED` luôn** — làm gộp mất bước Sàn giữ tiền chờ Kế toán giải ngân cho Nông dân.
- `AdminBusinessController.java` & `AdminBusinessService.java`:
  - `GET /admin/accounting/cashflow-summary`: Trả KPI tổng toàn hệ thống (không hỗ trợ tham số `hubId`), trả `cashflowStatus` dạng mã tiếng Anh (`SETTLED_COMPLETED`, `BUYER_PAID_100`, `ESCROW_HOLDING_30`).
  - `GET /admin/accounting/vas-reports`: Trả toàn bộ `documents`, `entries`, `lines` không lọc theo trạm.
  - `POST /admin/contracts/{id}/settle`: Đã có xử lý quyết toán & ghi bút toán kép `gl_journal_entries` / `gl_journal_lines`.
- `Settlement.java` / `FarmerService.java`:
  - `POST /farmer/contracts/{id}/settle`: Cho phép Farmer tự kích hoạt quyết toán (`settleContractApi`).

### 2. Frontend hiện tại
- `frontend/src/app/admin/accounting/page.tsx`:
  - Hiển thị 5 KPI, 4 tab (`LEDGER`, `DAILY`, `ENTRIES`, `DOCUMENTS`), còn lẫn nhiều thuật ngữ tiếng Anh (`SETTLED_COMPLETED`, `BUYER_PAID_100`, `ESCROW_HOLDING_30`, `Payout`, `Journal Entries`, `Debit/Credit Lines`).
  - Chưa liên kết với Trạm đang chọn (`hona_admin_selected_hub_id`) và chưa có nút bật/tắt **Kiểm toán toàn bộ các trạm**.
  - Chưa có nút **Giải ngân cho Nông dân** trực tiếp trên dòng hợp đồng chờ giải ngân.
- `frontend/src/app/portal/farmer/page.tsx` & `FarmerPostSaleView.tsx`:
  - Có nút `⚡ Quyết Toán Ngay` (`handleSettleContract` ở dòng ~2735 của `farmer/page.tsx`) và `✓ Xác Nhận Quyết Toán Tiền Về Tài Khoản (Tiến Mốc 6)` (ở `FarmerPostSaleView.tsx` dòng ~1674) cho phép Farmer tự quyết toán.

---

## C. Implementation Scope

### 1. Frontend
- **`frontend/src/app/admin/accounting/page.tsx`**:
  - Đồng bộ với Trạm đang chọn qua `localStorage.getItem('hona_admin_selected_hub_id')` và event `'hona-admin-hub-changed'`.
  - Thêm cụm chuyển đổi phạm vi kiểm toán (chỉ hiển thị cho `ADMIN`):
    - **Theo trạm đang chọn** (ví dụ: *Trạm Đà Lạt / Trạm Thủ Đức*)
    - **Kiểm toán toàn bộ tất cả các trạm** (nút lọc tổng hợp `scope=ALL` hoặc `hubId` bỏ trống).
  - Việt hóa 100% nhãn trạng thái, tiêu đề cột, KPI, tab, nút lọc và modal chi tiết bút toán:
    - `ESCROW_HOLDING_30` → **Đang giữ cọc 30% bảo chứng**
    - `BUYER_PAID_100` → **Buyer đã trả đủ 100% · Chờ giải ngân Nông dân**
    - `SETTLED_COMPLETED` → **Đã giải ngân hoàn tất cho Nông dân**
  - Thêm nút **"Giải ngân Nông dân"** ngay trên bảng đối soát cho các hợp đồng ở trạng thái `BUYER_PAID_100` (mở `SettlementStatementModal` để Kế toán kiểm tra số tiền thực chi và xác nhận chuyển khoản).
  - Đăng ký `b2bWebSocket.subscribeContracts` để tự động cập nhật realtime khi Buyer thanh toán hoặc Admin giải ngân.
- **`frontend/src/app/portal/farmer/page.tsx`**:
  - Gỡ bỏ nút `⚡ Quyết Toán Ngay` tại tab **Ví Tiền & Giải Ngân** (`settlements`).
  - Hiển thị trạng thái dòng tiền rõ ràng theo 3 mức tiếng Việt:
    - *Chờ giao & thanh toán* (chưa thu đủ)
    - *Chờ Sàn giải ngân về STK* (Buyer đã thanh toán 100%, chờ Kế toán Sàn chuyển khoản)
    - *Đã giải ngân hoàn tất* (hiển thị badge xanh, số tiền thực nhận, ngày giải ngân, mã giao dịch ngân hàng và nút xem Bảng kê 01/TNDN / Hóa đơn KCT).
- **`frontend/src/app/portal/farmer/components/FarmerPostSaleView.tsx`**:
  - Gỡ bỏ nút Farmer tự bấm *Xác Nhận Quyết Toán Tiền Về Tài Khoản (Tiến Mốc 6)*; thay bằng thông báo trạng thái chờ Kế toán Sàn giải ngân hoặc đã giải ngân hoàn tất.
- **`frontend/src/components/buyer/BuyerManagementConsole.tsx`**:
  - Đồng bộ nhãn sau khi Buyer thanh toán 70% (`BALANCE_PAID` / `remainingPaymentStatus === 'PAID'`): phía Buyer coi như **Đã thanh toán đủ 100% · Chờ Sàn giải ngân cho Nhà vườn** (hoặc hoàn tất phần nghĩa vụ thanh toán của Buyer).

### 2. Backend
- **`backend/src/main/java/com/btl/webbanrau/service/BuyerWorkflowService.java`**:
  - Trong `confirmFinalPayment(Long contractId)`: Khi Buyer thanh toán 70% còn lại, chỉ ghi nhận thu đủ 100% vào két Sàn (`remaining_payment_status = 'PAID'`, `remaining_paid_at = CURRENT_TIMESTAMP`, `balance_received`, ghi bút toán thu tiền vào `gl_journal_entries`), giữ `status = 'DELIVERED'` (hoặc thêm/dùng trạng thái `BALANCE_PAID` / `DELIVERED` + `remaining_payment_status='PAID'`) và **KHÔNG tự động giải ngân `SETTLED` cho Nông dân**. Phát sự kiện realtime để Admin/Kế toán và Farmer biết Buyer đã trả đủ 100%.
- **`backend/src/main/java/com/btl/webbanrau/controller/AdminBusinessController.java` & `AdminBusinessService.java`**:
  - Mở rộng `GET /admin/accounting/cashflow-summary` và `GET /admin/accounting/vas-reports` nhận thêm `@RequestParam(required = false) Long hubId` (khi `hubId == null` hoặc `scope=ALL` thì trả toàn bộ các trạm để kiểm toán tổng thể; khi có `hubId` thì lọc các hợp đồng/chứng từ/bút toán thuộc Trạm đó thông qua `harvest_lots` / `inbound_pickup_stops` / `outbound_delivery_stops` / `hub_id`).
  - Bổ sung nhãn tiếng Việt `cashflowStatusLabel` và tên trạm `hubName` trong mỗi item của `contractLedger`.
  - Tinh chỉnh `cashflowStatus`:
    - `SETTLED` / đã giải ngân trong `settlements` (`is_paid = true`) → `SETTLED_COMPLETED`
    - `DELIVERED` và `remaining_payment_status = 'PAID'` → `BUYER_PAID_100`
    - Còn lại (đã cọc) → `ESCROW_HOLDING_30`
- **`backend/src/main/java/com/btl/webbanrau/controller/FarmerController.java` / `FarmerService.java`**:
  - Chặn/gỡ quyền Farmer tự gọi quyết toán giải ngân (`POST /farmer/contracts/{id}/settle` trả lỗi 403/400 thông báo chỉ Kế toán/Quản trị viên Sàn mới có quyền thực hiện giải ngân sau đối soát), đồng thời trả trạng thái giải ngân chi tiết trong API danh sách ví/hợp đồng của Farmer.

### 3. Database
- Không bắt buộc thay đổi cấu trúc bảng (tận dụng các cột đã có trong `b2b_contracts`: `status`, `remaining_payment_status`, `remaining_paid_at`, `settled_at`, `payout_amount`, `farmer_payout_amount`, `payout_ref` và bảng `settlements`, `gl_journal_entries`, `gl_journal_lines`).

---

## D. API Contract

1. **`GET /api/v1/admin/accounting/cashflow-summary?hubId={hubId}`**
   - **Query Param:** `hubId` (tùy chọn; bỏ trống = kiểm toán toàn bộ tất cả các trạm).
   - **Response:**
     - `kpi`: `{ totalBankBalance, totalHonaRevenue, totalEscrowHeld, totalVatPayable, totalFarmerPayouts, pendingDisbursementAmount, totalGmv }`
     - `contractLedger`: danh sách hợp đồng kèm `hubId`, `hubName`, `cashflowStatus`, `cashflowStatusLabel` (tiếng Việt), `remaining_payment_status`, `settled_at`, `payout_ref`.
     - `dailyCashflow`: biến động vào/ra theo ngày (lọc theo `hubId` nếu có).
2. **`GET /api/v1/admin/accounting/vas-reports?hubId={hubId}`**
   - **Query Param:** `hubId` (tùy chọn).
   - **Response:** `{ documents, entries, lines }` đã lọc theo `hubId` hoặc toàn hệ thống.
3. **`POST /api/v1/buyer/contracts/{id}/final-payment/confirm`**
   - Cập nhật `remaining_payment_status = 'PAID'`, `remaining_paid_at = now()`, `balance_received`, ghi nhận tiền vào két Sàn (chưa chuyển `SETTLED`).
4. **`POST /api/v1/admin/contracts/{id}/settle`**
   - Admin/Kế toán thực hiện giải ngân cho Nông dân: chuyển hợp đồng sang `SETTLED`, ghi nhận `settlements.is_paid = true`, `settled_at`, `payout_ref`, ghi bút toán chi giải ngân và phát WebSocket `/topic/contracts` + `/topic/dispatch`.

---

## E. Business Flow

1. **Buyer đặt cọc 30%:** Tiền vào két ký quỹ Sàn → Kế toán hiển thị *Đang giữ cọc 30% bảo chứng*.
2. **Giao hàng & 2 bên ký ePOD:** Hợp đồng sang `DELIVERED`, chờ Buyer thanh toán nốt 70%.
3. **Buyer thanh toán 70% còn lại:** Tiền về tài khoản Sàn → Kế toán hiển thị *Buyer đã trả đủ 100% · Chờ giải ngân Nông dân* (kèm nút **Giải ngân Nông dân**). Phía Farmer hiển thị *Chờ Sàn giải ngân về STK* (không cho Farmer tự bấm).
4. **Admin/Kế toán giải ngân cho Nông dân:** Chọn hợp đồng → Kiểm tra bảng kê khấu trừ phí sàn/VAT & STK Nông dân → Xác nhận giải ngân → Hợp đồng chuyển `SETTLED`.
   - Kế toán hiển thị *Đã giải ngân hoàn tất cho Nông dân* (hỗ trợ xem theo từng Trạm hoặc bật **Kiểm toán toàn bộ các trạm**).
   - Ví tiền & Giải ngân của Farmer tự động cập nhật trạng thái **Đã giải ngân hoàn tất**, hiển thị số tiền đã về STK và chứng từ thuế 01/TNDN.

---

## F. Implementation Steps

1. **Backend — Tách bước thanh toán Buyer & lọc theo Trạm:**
   - Cập nhật `BuyerWorkflowService.confirmFinalPayment` để chỉ ghi nhận Buyer trả đủ 100% vào Sàn (không tự động `SETTLED`).
   - Cập nhật `AdminBusinessController` & `AdminBusinessService` (`cashflowSummary`, `reports`) hỗ trợ `hubId` tùy chọn, bổ sung thống kê chờ giải ngân và nhãn tiếng Việt.
   - Chặn Farmer tự giải ngân ở `FarmerController` / `FarmerService`.
2. **Frontend — Nâng cấp trang Kế Toán Admin (`/admin/accounting`):**
   - Tích hợp chọn Trạm hiện tại + nút **Kiểm toán toàn bộ các trạm** (chỉ Admin).
   - Việt hóa toàn bộ UI, trạng thái dòng tiền, cột bảng, modal bút toán.
   - Tích hợp nút **Giải ngân Nông dân** (`SettlementStatementModal`) và lắng nghe WebSocket realtime.
3. **Frontend — Chuẩn hóa Ví tiền & Giải ngân Farmer (`/portal/farmer`):**
   - Gỡ bỏ nút Farmer tự bấm quyết toán ở `farmer/page.tsx` và `FarmerPostSaleView.tsx`.
   - Hiển thị rõ ràng trạng thái *Chờ Sàn giải ngân* vs *Đã giải ngân hoàn tất*.
4. **Frontend — Đồng bộ phía Buyer (`BuyerManagementConsole.tsx`):**
   - Nhận diện trạng thái Buyer đã trả đủ 100% (`remainingPaymentStatus === 'PAID'`) để Buyer thấy đã hoàn tất nghĩa vụ thanh toán, không còn hiện nút thanh toán 70%.

---

## G. Risks & Considerations

- **Tương thích dữ liệu hiện có:** Các đơn đã `SETTLED` trước đó vẫn giữ nguyên trạng thái *Đã giải ngân hoàn tất*; các đơn `DELIVERED` + `remaining_payment_status = 'PAID'` sẽ tự động xuất hiện ở nhóm *Chờ giải ngân Nông dân* để Kế toán xử lý.
- **Lọc theo Trạm ở Kế toán:** Một số hợp đồng cũ có thể chưa gắn `hub_id` trực tiếp trên `b2b_contracts` — cần fallback theo `harvest_lots` / `inbound_pickup_stops` / `outbound_delivery_stops` để không bị sót số liệu khi lọc theo trạm, và luôn đảm bảo chế độ **Kiểm toán toàn bộ các trạm** hiển thị đủ 100% dữ liệu.
- **Phân quyền:** Chỉ tài khoản `ADMIN` mới được phép giải ngân (`POST /admin/contracts/{id}/settle`) và bật chế độ kiểm toán toàn hệ thống; Farmer chỉ có quyền xem số dư, lịch sử giải ngân và tải chứng từ.

---

## H. Acceptance Criteria

1. Sau khi Buyer thanh toán 70% còn lại, trạng thái dòng tiền ghi nhận tiền đã về Sàn (*Buyer đã trả đủ 100% · Chờ giải ngân Nông dân*), chưa tự động chuyển sang đã giải ngân cho Farmer.
2. Trang `/admin/accounting` hiển thị 100% tiếng Việt sạch đẹp, dễ thao tác; mặc định lọc theo Trạm Admin đang chọn và có nút chuyển đổi **Kiểm toán toàn bộ tất cả các trạm**.
3. Admin/Kế toán bấm **Giải ngân Nông dân** ngay tại trang Kế toán (hoặc Hợp đồng/Outbound) để chuyển tiền cho Nhà vườn (`SETTLED`).
4. Ở cổng Nông dân (`/portal/farmer` → *Ví Tiền & Giải Ngân* và *Tiến trình*), Farmer **không còn nút tự chọn quyết toán**, và sau khi Sàn giải ngân thì hiển thị rõ trạng thái **Đã giải ngân hoàn tất**.
