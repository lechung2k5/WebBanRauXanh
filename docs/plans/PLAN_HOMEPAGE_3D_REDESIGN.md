# KẾ HOẠCH NÂNG CẤP GIAO DIỆN TRANG CHỦ HONA FRESH (3D, TƯƠNG TÁC & HIỆU ỨNG ĐỘNG HIỆN ĐẠI)

---

## A. Overview

- **Tên chức năng:** Tái thiết kế giao diện Trang Chủ (`HomePage`) theo phong cách B2B Agri-Tech 3D & Interactive Modern UI (2026).
- **Mục tiêu:**
  - Nâng tầm trải nghiệm thị giác của trang chủ HONA FRESH lên chuẩn các nền tảng công nghệ nông nghiệp / thương mại B2B hàng đầu: không gian 3D có chiều sâu, tương tác theo con trỏ chuột (cursor-reactive), chuyển động mượt 60fps, kính mờ (glassmorphism), bento grid bất đối xứng và vi tương tác (micro-interactions).
  - Giữ nguyên 100% luồng nghiệp vụ B2B hiện có (tìm kiếm, lọc lô nông sản, Sàn chào mua, Vùng trồng HTX, đàm phán giá, đặt cọc giữ lô, trợ lý AI, đăng nhập/đăng ký, giỏ lô hàng).
- **Phạm vi nghiệp vụ:** Giao diện Frontend của Trang Chủ (`/`), các section trình bày, hệ thống hiệu ứng động trong `globals.css` và các component hiển thị trực quan trên trang chủ.
- **Kết quả mong muốn:**
  - Trang chủ có **Hero 3D Tương Tác** (mô hình hệ sinh thái nông sản – chuỗi lạnh – truy xuất PUC xoay/nghiêng theo chuột kết hợp hiệu ứng chiều sâu 3D).
  - **4 Trụ Cột Bento Grid 3D Tilt**: thẻ tương tác nghiêng 3D theo vị trí chuột, ánh sáng phản chiếu (spotlight border glow).
  - **Lô Thu Hái Rộ 3D Showcase Card**: thẻ nổi 3D với thanh tiến độ động, huy hiệu trạng thái sống động và hiệu ứng hover đa tầng.
  - **Scroll-Triggered Reveal & Counter Animation**: các section tự động xuất hiện mượt mà khi cuộn trang, số liệu KPI chạy tăng dần (count-up).
  - Đạt hiệu năng cao (GPU-accelerated `transform`/`opacity`), hỗ trợ `prefers-reduced-motion` và responsive hoàn hảo trên Desktop/Tablet/Mobile.

---

## B. Current Architecture

- **Framework & Styling:**
  - Next.js `16.4.6` (App Router, React `19.3.0`), Tailwind CSS v4 (`@tailwindcss/turbopack`), `lucide-react`.
  - File trang chủ chính: `frontend/src/app/page.tsx` (960 dòng), hiện đang sử dụng layout phẳng truyền thống (gradient xanh rừng, thẻ trắng bo góc chuẩn `rounded-2xl`/`rounded-3xl`, ít chiều sâu 3D và chưa có hiệu ứng tương tác theo con trỏ hay scroll-reveal).
  - Style toàn cục: `frontend/src/app/globals.css`.
- **Các thành phần hiện có trên trang chủ có thể tái sử dụng nguyên vẹn:**
  - `Navbar` (`frontend/src/components/Navbar.tsx`)
  - `ProcurementBoardSection` (`frontend/src/components/ProcurementBoardSection.tsx`)
  - `FarmCooperativesSection` (`frontend/src/components/FarmCooperativesSection.tsx`)
  - `ProductCard` (`frontend/src/components/ProductCard.tsx`)
  - `Pagination` (`frontend/src/components/Pagination.tsx`)
  - Toàn bộ Modals nghiệp vụ (`B2BNegotiationModal`, `B2BDepositModal`, `CreateProcurementModal`, `OrderTrackingModal`, `AuthModal`, `LocationModal`, `PromotionModal`, `ProductDetailModal`, `AiAssistantModal`).
  - Các state, `fetchData`, `subscribeB2bSyncEvents`, lọc/phân trang trong `page.tsx`.

---

## C. Implementation Scope

### 1. Lựa chọn công nghệ 3D & Animation (Cần xác nhận từ người dùng)
- **Phương án A (Khuyên dùng — Zero Dependency, tối ưu hiệu năng & tương thích React 19):**
  - Không cài thêm thư viện ngoài (`package.json` giữ nguyên).
  - Kết hợp **HTML5 Canvas 3D Particle/Globe Network** (mô phỏng mạng lưới kết nối Vùng Trồng → Kho Lạnh → Thương Lái xoay 3D tương tác chuột) + **CSS 3D Perspective (`perspective: 1200px`, `preserve-3d`)** + **Cursor Spotlight & Magnetic Hover** + **Custom `useInView` / `useCountUp` hooks**.
  - Ưu điểm: Dung lượng bundle gần như bằng 0, khởi động nhanh, không xung đột với React 19 / Next.js 16 Turbopack, không tốn tài nguyên máy.
- **Phương án B (Tùy chọn — WebGL thực thụ):**
  - Cài thêm `three` + `@types/three` (hoặc `framer-motion`). Chỉ thực hiện nếu người dùng đồng ý mở rộng dependency theo Quy tắc 9.1 `AGENTS.md`.

### 2. Frontend (Dự kiến tạo mới & chỉnh sửa)
- **Tạo mới (Component & Hook chuyên biệt để `page.tsx` gọn sạch):**
  - `frontend/src/components/home/Hero3DScene.tsx`: Khối Hero Banner 3D tương tác (Canvas 3D mạng lưới chuỗi cung ứng + các thẻ kính mờ nổi theo lớp chiều sâu Z-axis `translateZ` phản ứng theo chuyển động chuột + hiệu ứng ánh sáng Aurora Mesh).
  - `frontend/src/components/home/Tilt3DCard.tsx`: Component bọc thẻ 3D Tilt (tính góc xoay `rotateX`, `rotateY` theo tọa độ con trỏ + viền phát sáng spotlight khi hover).
  - `frontend/src/components/home/SupplyChain3DFlow.tsx`: Section mô phỏng trực quan quy trình B2B 4 bước (Vùng trồng PUC → Đặt cọc Escrow 30% → Kiểm định QC & Chuỗi lạnh 2–8°C → Giao nhận ePOD) dạng thẻ 3D tương tác.
  - `frontend/src/hooks/useScrollReveal.ts`: Hook dùng `IntersectionObserver` kích hoạt hiệu ứng xuất hiện mượt khi cuộn trang và `useAnimatedCounter` cho các chỉ số KPI (`12.500+`, `520+`, `2.800+`, `100%`).
- **Chỉnh sửa:**
  - `frontend/src/app/globals.css`: Bổ sung keyframe animations (`float-slow`, `aurora-shift`, `shimmer-sweep`, `pulse-ring`), utility class `perspective-1200`, `preserve-3d`, `glass-panel`, và `@media (prefers-reduced-motion: reduce)`.
  - `frontend/src/app/page.tsx`:
    - Thay khối Hero tĩnh bằng `Hero3DScene` kết hợp thẻ **Lô Thu Hái Rộ 3D** bên phải (giữ nguyên dữ liệu `featuredHarvestLot` và 2 nút Đàm phán giá / Đặt cọc giữ lô).
    - Nâng cấp 4 Trụ Cột B2B thành Bento Grid sử dụng `Tilt3DCard`.
    - Bổ sung `SupplyChain3DFlow` trực quan hóa luồng giao dịch B2B.
    - Nâng cấp section Quy Cách Nông Sản Xuất Vườn (4 thẻ danh mục với chiều sâu 3D & hiệu ứng hover).
    - Nâng cấp khu vực `catalog-section` (sticky sidebar lọc kính mờ nhẹ, lưới `ProductCard` có hiệu ứng xuất hiện tuần tự stagger animation).
    - Giữ nguyên toàn bộ logic API, filter, pagination và modal.

### 3. Backend & Database
- **Backend:** Không thay đổi. Toàn bộ dữ liệu sản phẩm, danh mục, chào mua, HTX vẫn lấy từ các API hiện có.
- **Database:** Không thay đổi.

---

## D. API Contract

- Không phát sinh API mới. Trang chủ tiếp tục sử dụng:
  - `getCategories()`
  - `getProducts({ categoryId, keyword, page, size })`
  - `subscribeB2bSyncEvents(...)`

---

## E. Business Flow

1. Người dùng truy cập `/`:
   - `Hero3DScene` khởi tạo ngay với hiệu ứng Aurora & Canvas 3D mạng lưới nông sản (tương tác xoay theo chuột hoặc tự xoay nhẹ trên mobile).
   - Các chỉ số KPI (`12.500+` tấn/tháng, `520+` HTX...) chạy hiệu ứng đếm số mượt mà.
2. Người dùng di chuột qua Hero, thẻ Lô Thu Hái Rộ, hoặc 4 Trụ Cột Bento:
   - Các lớp UI nghiêng 3D theo góc nhìn phối cảnh (`perspective`), hiển thị vệt sáng phản chiếu theo vị trí con trỏ.
3. Người dùng cuộn xuống các section (`Sàn Chào Mua`, `Vùng Trồng HTX`, `Quy Trình 3D`, `Sàn Chào Bán Nông Sản`):
   - Từng khối kích hoạt hiệu ứng trượt lên & rõ nét dần (`reveal-up`), không gây giật lag.
4. Người dùng thực hiện các thao tác nghiệp vụ (Tìm kiếm, Lọc, Xem chi tiết, Đàm phán giá, Đặt cọc giữ lô, Đăng tin tìm nguồn cung):
   - Toàn bộ modal và luồng API B2B hoạt động y hệt hiện tại.

---

## F. Implementation Steps

1. **Bước 1 — Thiết lập hệ thống Motion & 3D CSS Utilities (`globals.css`):** Thêm keyframes, glassmorphism, 3D perspective utilities và hỗ trợ `prefers-reduced-motion`.
2. **Bước 2 — Xây dựng Hook & Component nền (`useScrollReveal.ts`, `Tilt3DCard.tsx`):** Tạo cơ chế scroll-reveal, đếm số KPI và thẻ nghiêng 3D tái sử dụng.
3. **Bước 3 — Xây dựng Hero 3D & Supply Chain 3D (`Hero3DScene.tsx`, `SupplyChain3DFlow.tsx`):** Thiết kế Canvas 3D tương tác chuột, floating badges 3D và sơ đồ chuỗi cung ứng lạnh trực quan.
4. **Bước 4 — Tích hợp vào `page.tsx`:** Lắp ráp các section mới vào trang chủ, giữ nguyên 100% state, bộ lọc, phân trang, realtime sync và modals.
5. **Bước 5 — Kiểm tra tĩnh & tinh chỉnh Responsive:** Rà soát TypeScript, kiểm tra layout trên màn hình rộng (Desktop 1240px+) và màn hình nhỏ (Mobile), kiểm tra không rò rỉ `requestAnimationFrame` / `IntersectionObserver` khi unmount.

---

## G. Risks & Considerations

- **Hiệu năng trên máy cấu hình yếu / trình duyệt mobile:**
  - *Giải pháp:* Chỉ dùng GPU-accelerated CSS (`transform`, `opacity`), giới hạn mật độ hạt trên Canvas 3D (<= 45 nodes), tự động tạm dừng Canvas loop khi tab ẩn (`document.visibilityState === 'hidden'`) hoặc ngoài viewport (`IntersectionObserver`), và tắt nghiêng 3D trên thiết bị cảm ứng (`pointer: coarse`).
- **Tương thích React 19 / Next.js 16 SSR:**
  - *Giải pháp:* Các hiệu ứng đo kích thước chuột, Canvas và `IntersectionObserver` chỉ chạy phía client trong `useEffect`, đảm bảo không lỗi Hydration Mismatch.
- **Không làm rối trải nghiệm B2B:**
  - *Giải pháp:* Giữ bảng màu thương hiệu HONA FRESH (`#10542C`, `#4CAF50`, `#8BC34A`, `#F9F9F5`, `#FB8C00`), hiệu ứng sang trọng, tinh tế, ưu tiên khả năng đọc dữ liệu giá sỉ, mã PUC và nút CTA.

---

## H. Acceptance Criteria

1. Giao diện trang chủ mang phong cách 3D hiện đại, có chiều sâu rõ rệt ở Hero, thẻ Lô Thu Hái Rộ, 4 Trụ Cột Bento, Quy Trình Chuỗi Cung Ứng và Danh Mục Sản Phẩm.
2. Tương tác mượt theo con trỏ chuột (3D tilt + spotlight glow + Canvas 3D parallax) và có hiệu ứng xuất hiện khi cuộn trang.
3. Toàn bộ chức năng nghiệp vụ trang chủ (lọc, tìm kiếm, phân trang, đàm phán, đặt cọc, đăng tin chào mua, realtime sync) hoạt động chính xác như trước khi nâng cấp.
4. Không phát sinh lỗi TypeScript, không rò rỉ bộ nhớ animation khi chuyển trang, hiển thị chuẩn trên Desktop và Mobile.
