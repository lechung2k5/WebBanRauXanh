# KẾ HOẠCH TRIỂN KHAI: ĐƯA MENU CHỨC NĂNG BUYER REALTIME RA DROPDOWN TÀI KHOẢN NAVBAR

## A. Overview
- **Tên chức năng:** Mở rộng Menu Tài Khoản (`Navbar`) cho Thương lái (`ROLE_BUYER`) với đầy đủ 6 chức năng của Không gian làm việc Buyer và đồng bộ Badge Realtime.
- **Mục tiêu:**
  1. Giữ nguyên mục **Không gian làm việc** (`/portal/buyer`) trong dropdown tài khoản ở `Navbar`.
  2. Bổ sung đầy đủ **6 mục chức năng y hệt menu sidebar của Buyer** ngay trong dropdown tài khoản:
     - **Tổng Quan** (`overview`)
     - **Tìm Nguồn Nông Sản Sỉ** (`catalog`)
     - **Đơn Đàm Phán Giá** (`negotiations`) — kèm badge số RFQ chờ Buyer phản hồi (`WAITING_BUYER`)
     - **Quản Lý Hợp Đồng** (`contracts`) — kèm badge số hợp đồng chờ cọc 30% + đơn giao đang chờ Buyer ký nhận ePOD (`PENDING_BUYER_CONFIRMATION` / `ARRIVED`)
     - **Khiếu Nại & Bồi Thường** (`claims`) — kèm badge số khiếu nại đang mở (`OPEN`)
     - **Hồ Sơ & Kho Tiếp Nhận** (`profile`)
  3. Khi bấm vào từng mục từ bất kỳ trang nào (Trang chủ, Chi tiết sản phẩm,...), điều hướng tới `/portal/buyer?tab=<tab>` và mở đúng tab tương ứng.
  4. **Đảm bảo Realtime 100% như trong Không gian làm việc:** Badge số lượng trên từng mục menu (và chấm/số tổng trên nút tài khoản ở Navbar) tự động cập nhật tức thì qua WebSocket STOMP + BroadcastChannel ngay cả khi Buyer đang ở ngoài trang `/portal/buyer`.
- **Phạm vi nghiệp vụ:** Cổng Thương lái (`ROLE_BUYER`) và thanh điều hướng chung (`Navbar`).
- **Kết quả mong muốn:** Người dùng đăng nhập vai trò Buyer có thể truy cập nhanh mọi phân hệ của Buyer từ dropdown tài khoản trên Navbar với trải nghiệm, số liệu badge và độ trễ realtime đồng nhất 100% với `BuyerManagementConsole`.

---

## B. Current Architecture
- **`frontend/src/components/Navbar.tsx`:**
  - Hiển thị dropdown tài khoản khi `activeUser` đã đăng nhập (lines 536–619).
  - Hiện mới có: Thông tin tên/email, nút **Không gian làm việc** (chuyển tới `portalFor(activeUser.roles)` = `/portal/buyer`), **Lịch sử & Theo dõi đơn**, và **Đăng xuất**.
- **`frontend/src/components/buyer/BuyerManagementConsole.tsx`:**
  - Quản lý `activeTab` (`'overview' | 'catalog' | 'negotiations' | 'contracts' | 'shipments' | 'claims' | 'profile'`), mặc định `'overview'`.
  - Render 6 mục menu sidebar (lines 1081–1135) kèm logic tính badge và lắng nghe realtime qua:
    - STOMP WebSocket: `b2bWebSocket.subscribeContracts`, `b2bWebSocket.subscribeRfqs`, `b2bWebSocket.subscribeLots`
    - `subscribeB2bSyncEvents` (BroadcastChannel) và custom window events (`b2b_sync_event`, `b2b_contract_updated`, `b2b_rfq_updated`).
  - Chưa đọc query parameter `?tab=...` từ URL để đồng bộ `activeTab`.

---

## C. Implementation Scope

### Frontend
- **File dự kiến tạo:**
  - `frontend/src/hooks/useBuyerRealtimeBadges.ts`:
    - Hook dùng chung cho `Navbar` (khi `isBuyerUser === true`) để nạp và giữ đồng bộ realtime 3 bộ đếm badge của Buyer (`negotiationsCount`, `contractsCount`, `claimsCount`, `totalAlerts`):
      - Gọi song song các API hiện có: `getBuyerRfqsApi`, `getBuyerB2bContractsApi`, `fleetDispatchApi.getBuyerOutboundStops` (hoặc nguồn stops của Buyer), `getBuyerClaimsApi` (debounce 300ms khi có sự kiện để tránh gọi trùng lặp).
      - Lắng nghe đồng bộ đa kênh **y hệt** `BuyerManagementConsole`:
        - `b2bWebSocket.subscribeContracts`
        - `b2bWebSocket.subscribeRfqs`
        - `b2bWebSocket.subscribeDispatch` (để khi tài xế `ARRIVED` hoặc lập ePOD `PENDING_BUYER_CONFIRMATION` thì badge Quản lý hợp đồng nhảy ngay lập tức)
        - `subscribeB2bSyncEvents` + `window` events (`b2b_sync_event`, `b2b_contract_updated`, `b2b_rfq_updated`, `focus`, `visibilitychange`).
- **File dự kiến sửa:**
  - `frontend/src/components/Navbar.tsx`:
    - Nhận biết `isBuyerUser` (tài khoản có `ROLE_BUYER`, không phải `ROLE_ADMIN` / `ROLE_FARMER` / `ROLE_WAREHOUSE_MANAGER` / `ROLE_ACCOUNTANT`).
    - Gọi `useBuyerRealtimeBadges(isBuyerUser)` để lấy số lượng badge realtime.
    - Hiển thị badge tổng nhỏ gọn trên nút avatar tài khoản khi `totalAlerts > 0`.
    - Trong dropdown tài khoản (giữ nguyên **Không gian làm việc** ở trên cùng): thêm cụm **Menu Thương Lái (6 chức năng)** với icon, tên và badge đếm realtime tương ứng từng mục; bấm vào mục nào sẽ đóng dropdown và điều hướng `/portal/buyer?tab=<id>`.
    - Lưu ý mở rộng chiều rộng dropdown (`w-64` thay vì `w-48` khi là Buyer) và thêm click-outside handler để đóng dropdown mượt mà.
  - `frontend/src/components/buyer/BuyerManagementConsole.tsx`:
    - Đọc `useSearchParams()` (bọc `<Suspense>` tại `frontend/src/app/portal/buyer/page.tsx` theo chuẩn Next.js App Router) hoặc đọc `window.location.search` + `useSearchParams` để đồng bộ `activeTab` theo `?tab=...`.
    - Khi người dùng chọn tab bên trong `BuyerManagementConsole`, cập nhật URL nhẹ nhàng hoặc đồng bộ `activeTab` khi `?tab=...` thay đổi để chuyển qua lại giữa các mục mượt mà.
    - Bổ sung `b2bWebSocket.subscribeDispatch` vào `useEffect` realtime của `BuyerManagementConsole` (nếu chưa có) để đồng nhất 100% với hook badge ở Navbar khi tài xế giao hàng tới điểm dừng.
  - `frontend/src/app/portal/buyer/page.tsx`:
    - Bọc `<BuyerManagementConsole />` trong `<Suspense>` nếu dùng `useSearchParams()`.

### Backend & Database
- **Không thay đổi:** Tận dụng toàn bộ REST API và STOMP WebSocket topics (`/topic/contracts`, `/topic/rfqs`, `/topic/dispatch`) hiện có.

---

## D. API Contract
Không phát sinh API mới; tái sử dụng các API hiện tại:
- `GET /api/v1/buyer/rfqs`
- `GET /api/v1/buyer/contracts` (qua `getBuyerB2bContractsApi`)
- `GET /api/v1/buyer/outbound-stops` / `fleetDispatchApi` tương ứng
- `GET /api/v1/buyer/claims`
- WebSocket STOMP: `/topic/contracts`, `/topic/rfqs`, `/topic/dispatch`

---

## E. Business Flow
1. Buyer đăng nhập và đứng ở bất kỳ trang nào có `Navbar` (Trang chủ `/`, `/san-pham`, `/san-pham/[slug]`, ...).
2. Hook `useBuyerRealtimeBadges` tự động nạp số liệu hiện tại của Buyer và đăng ký STOMP WebSocket + BroadcastChannel.
3. Khi có sự kiện mới từ Nhà vườn (phản hồi giá RFQ), Tài xế (đến điểm giao / lập ePOD), hoặc Admin (cập nhật khiếu nại/hợp đồng), badge trên nút tài khoản và trong dropdown `Navbar` tự động cập nhật **tức thì**.
4. Buyer mở dropdown tài khoản: thấy nguyên **Không gian làm việc**, kèm bên dưới là **6 chức năng của Buyer** (`Tổng Quan`, `Tìm Nguồn Nông Sản Sỉ`, `Đơn Đàm Phán Giá`, `Quản Lý Hợp Đồng`, `Khiếu Nại & Bồi Thường`, `Hồ Sơ & Kho Tiếp Nhận`) kèm badge đếm realtime.
5. Bấm vào bất kỳ mục nào → chuyển thẳng đến `/portal/buyer?tab=<tab>` và hiển thị đúng phân hệ đó với đầy đủ dữ liệu realtime.

---

## F. Implementation Steps
1. Kiểm tra chính xác API lấy `outboundStops` và `pendingDepositContracts` trong `BuyerManagementConsole.tsx` để công thức tính badge ở `useBuyerRealtimeBadges` khớp 100%.
2. Tạo hook `frontend/src/hooks/useBuyerRealtimeBadges.ts` (kèm debounce + cleanup đầy đủ).
3. Cập nhật `BuyerManagementConsole.tsx` và `app/portal/buyer/page.tsx` để hỗ trợ `?tab=<tabId>` từ URL (bọc `Suspense`) và đồng bộ `subscribeDispatch`.
4. Cập nhật `Navbar.tsx` hiển thị 6 mục menu Buyer kèm badge realtime ngay trong dropdown tài khoản (giữ nguyên **Không gian làm việc**, **Lịch sử & Theo dõi đơn**, **Đăng xuất**).
5. Kiểm tra tĩnh toàn bộ imports, TypeScript types và logic đóng/mở dropdown.

---

## G. Risks & Considerations
- **Next.js App Router `useSearchParams()`:** Cần bọc `<Suspense>` ở `portal/buyer/page.tsx` để tránh lỗi prerender khi build production.
- **Tránh spam API khi nhận nhiều WebSocket event liên tiếp:** Dùng debounce (~300ms) trong `useBuyerRealtimeBadges` và chỉ kích hoạt hook khi `isBuyerUser === true`.
- **Phân biệt Role:** Chỉ hiển thị cụm 6 menu Buyer cho tài khoản có `ROLE_BUYER` (không hiển thị cho `ADMIN`, `FARMER`, `WAREHOUSE_MANAGER`, `ACCOUNTANT`, `DRIVER`).

---

## H. Acceptance Criteria
1. Dropdown tài khoản của Buyer trên `Navbar` vẫn giữ **Không gian làm việc**, **Lịch sử & Theo dõi đơn**, **Đăng xuất**, và có thêm đủ **6 chức năng của Buyer** y hệt sidebar trong `/portal/buyer`.
2. Bấm vào từng mục trong dropdown từ trang ngoài sẽ mở đúng tab tương ứng tại `/portal/buyer?tab=...`.
3. Số badge trên từng mục (Đơn đàm phán, Quản lý hợp đồng, Khiếu nại) trong dropdown `Navbar` cập nhật **realtime** qua WebSocket/BroadcastChannel khi có thay đổi từ Farmer, Driver hoặc Admin mà không cần F5.
