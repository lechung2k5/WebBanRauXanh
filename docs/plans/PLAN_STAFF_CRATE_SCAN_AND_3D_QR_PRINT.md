# KẾ HOẠCH TRIỂN KHAI — QUÉT TỪNG THÙNG HÀNG TRÊN STAFF APP & IN TEM QR/BARCODE TRÊN SƠ ĐỒ KỆ 3D

> **Dự án:** HONA FRESH  
> **Phân hệ:** Staff App (`WarehouseReceivingConsole.tsx`) & Sơ đồ kho 3D Digital Twin (`Warehouse3DDigitalTwin.tsx`)  
> **Loại công việc:** Complex Task (Nâng cấp quy trình nghiệp vụ kho & in tem mã vạch)

---

## A. Overview

- **Tên chức năng:** Quét xác nhận từng thùng hàng (Crate-by-Crate Scan) trong quy trình xuất kho của Staff App và In Tem QR / Barcode cho từng thùng & từng hợp đồng ngay trên Sơ đồ Kệ 3D.
- **Mục tiêu:**
  1. **Trên Sơ đồ Kệ 3D (`Warehouse3DDigitalTwin.tsx`):** Cho phép Admin / Quản lý kho / Nhân viên kho in **Tem nhãn QR + Barcode** (cho 1 thùng cụ thể hoặc toàn bộ dải thùng của 1 hợp đồng đang tô xanh trong ô kệ `BIN`) để dán trực tiếp lên từng thùng xốp.
  2. **Trên Staff App (`WarehouseReceivingConsole.tsx`):** Thay vì chỉ tick 1 checkbox chung cho cả lô ở Bước 1, nhân viên kho **quét mã QR / Barcode (hoặc bấm xác nhận) từng thùng một** (`E279-01` -> `E279-07`), có thanh tiến độ `Đã quét 3/7 thùng`, cảnh báo ngay nếu quét nhầm mã thùng của đơn khác nằm chung ô kệ `BIN A-01`, và chỉ mở khóa Bước 2 khi đã quét đủ 100% số thùng.
- **Nguyên tắc kỹ thuật:** Không cài đặt thêm thư viện npm ngoài (`AGENTS.md` Mục 9.1); tạo Barcode chuẩn thị giác bằng SVG nội sinh + QR Code bằng URL/SVG nội bộ và cửa sổ in tem nhãn nhiệt A6/A4 chuẩn.

---

## B. Current Architecture

- **`Warehouse3DDigitalTwin.tsx`:**
  - Đã tô xanh các thùng 3D theo hợp đồng được chọn (`highlightedContractCode`) và hiển thị popup chi tiết thùng đang click (`selectedCrate` gồm `contract_code`, `crateIndex`, `totalCrates`, `binCode`).
  - Hiện chưa có hiển thị mã Barcode/QR của thùng và chưa có nút **`In Tem QR/Barcode Thùng`** hoặc **`In Trọn Bộ Tem Đơn Hàng`**.
- **`WarehouseReceivingConsole.tsx`:**
  - Tab `Xuất Kho` đã có Modal quy trình 3 bước, nhưng Bước 1 (`outboundStep === 1`) mới chỉ có 1 ô checkbox xác nhận chung, chưa hỗ trợ danh sách từng thùng + ô nhập/quét máy quét mã vạch (USB/Bluetooth Barcode Scanner hoặc nhập tay/bấm nhanh trên mobile).

---

## C. Implementation Scope

### Frontend
1. **Tạo helper/component dùng chung nhẹ (`frontend/src/components/warehouse/CrateLabelPrintHelper.ts` hoặc `CrateBarcodeSvg.tsx`):**
   - Sinh mã định danh chuẩn cho từng thùng: `{shortContractCode}-{pad2(idx)}` (ví dụ `E279-01`, `E279-02`, ...), kèm chuỗi QR payload (`HONAF|HD-2026-E279|BIN-A-01|01`).
   - Render thanh Barcode SVG rõ nét + mã QR để hiển thị ngay trên giao diện và in ấn.
   - Hàm `printCrateLabels(...)`: mở cửa sổ in tem nhãn (hỗ trợ in **1 tem thùng lẻ** hoặc **trọn bộ tem N thùng** của đơn hàng, mỗi tem có: Tên nông sản, Mã HĐ, Vị trí `Zone/BIN`, `Thùng #1/7`, tên Buyer, Barcode + QR Code).
2. **`frontend/src/components/admin/Warehouse3DDigitalTwin.tsx`:**
   - Trong popup `selectedCrate`: hiển thị mã định danh thùng (`{shortCode}-{idx}`), Barcode SVG mini, và nút **`In Tem QR/Barcode Thùng #{crateIndex}`**.
   - Trong danh sách hợp đồng của ô kệ (Side Inspector): thêm nút **`In Tem ({pkgs} thùng)`** ngay trên thẻ hợp đồng để in một lần toàn bộ tem dán cho đơn hàng đó.
3. **`frontend/src/components/warehouse/WarehouseReceivingConsole.tsx`:**
   - Nâng cấp **Bước 1 (`outboundStep === 1`)** của Modal Xuất Kho:
     - Ô nhập/quét **`Quét mã QR / Barcode thùng`** (hỗ trợ đầu đọc mã vạch tự động bấm Enter, hoặc nhân viên gõ/dán mã `E279-01` hoặc `HONAF|...` -> tự động khớp đúng thùng).
     - **Báo lỗi tức thì** nếu quét nhầm mã thùng của đơn hàng khác (ví dụ đang xuất `HD-2026-E279` mà quét nhầm thùng `B4D8-01` nằm chung ô `BIN A-01`!).
     - Lưới danh sách từng thùng (`#1 E279-01` ... `#7 E279-07`): thùng đã quét chuyển màu xanh lá (`✓ Đã quét`), thùng chưa quét màu xám; hỗ trợ bấm trực tiếp vào thẻ thùng trên màn hình cảm ứng (mobile) để xác nhận nhanh khi không có máy quét phần cứng.
     - Thanh tiến độ **`Đã quét: X / N thùng`**, chỉ mở khóa nút sang Bước 2 khi `scannedCount === totalPackages`.
     - Tự động cập nhật `pickedPackages = scannedCount` ở Bước 2.

### Backend
- Không cần thay đổi API hoặc DB (tái sử dụng `confirmWarehouseOutboundPicked` đã nhận `pickedPackages`, `actualWeightKg`, `outboundTemp`, `notes` — có thể đính kèm danh sách mã tem đã quét vào `notes` để lưu lịch sử kiểm soát).

---

## D. API Contract

- Giữ nguyên các API đã có của `WarehouseOutboundController`:
  - `GET /api/v1/warehouse/outbound/tasks`
  - `POST /api/v1/warehouse/outbound/contracts/{contractId}/start-picking`
  - `POST /api/v1/warehouse/outbound/contracts/{contractId}/confirm-picked` (gửi thêm danh sách mã tem thùng đã quét trong `notes`).

---

## E. Business Flow

1. **In tem dán thùng từ Sơ đồ 3D (`/admin/qc` hoặc `/manager/qc`):**
   - Nhân viên/Quản lý kho bấm vào 1 hợp đồng hoặc 1 thùng trên kệ 3D -> Bấm **`In Tem QR/Barcode`** -> In tem dán lên từng thùng hàng trong ô kệ `BIN`.
2. **Quét từng thùng khi xuất kho trên Staff App (`/portal/warehouse-qc`):**
   - Nhân viên mở tab **Xuất Kho**, bấm **Bắt Đầu Đi Lấy Hàng Tại Kệ**.
   - Tại Bước 1, nhân viên dùng máy quét (hoặc bấm từng thùng trên điện thoại) quét lần lượt từ `Thùng #1` đến `Thùng #N`.
   - Nếu quét nhầm thùng của đơn khác chung kệ -> hệ thống cảnh báo đỏ ngay lập tức, không cho cộng dồn.
   - Khi quét đủ `N/N` thùng -> chuyển sang Bước 2 (Cân & Nhiệt độ xuất) -> Bước 3 (Bàn giao xuất kho).

---

## F. Implementation Steps

1. Tạo tiện ích sinh Barcode SVG + hàm in tem QR/Barcode chuẩn (`frontend/src/utils/crateLabelPrinter.ts`).
2. Tích hợp nút **In Tem QR/Barcode** (1 thùng & trọn bộ đơn) vào `Warehouse3DDigitalTwin.tsx`.
3. Nâng cấp Bước 1 của Modal Xuất Kho trong `WarehouseReceivingConsole.tsx` với ô quét mã vạch/QR từng thùng, cảnh báo quét nhầm đơn, và lưới trạng thái từng thùng.
4. Kiểm tra compile Frontend các trang `/admin/qc`, `/manager/qc`, `/portal/warehouse-qc`.

---

## G. Risks & Considerations

- **Không thêm dependency mới:** Tuân thủ `AGENTS.md`, dùng SVG Barcode + QR API/SVG nội bộ và `window.open` + `print()` để không cần `npm install`.
- **Tránh nhầm thùng khi dùng chung ô kệ (`BIN`):** Phải kiểm tra chặt `contract_code` / `shortCode` khi quét mã ở Bước 1 để chặn tuyệt đối việc lấy nhầm thùng của hợp đồng khác.

---

## H. Acceptance Criteria

1. Trên sơ đồ 3D (`Warehouse3DDigitalTwin`), click vào 1 thùng hoặc 1 hợp đồng có thể xem mã Barcode/QR và bấm **In Tem QR/Barcode** ra trang in sạch đẹp.
2. Trên Staff App (`/portal/warehouse-qc` -> tab `Xuất Kho`), Bước 1 hiển thị đủ từng thùng (`#1`..`#N`), hỗ trợ quét/nhập mã từng thùng, báo lỗi nếu quét sai mã, và chỉ cho qua Bước 2 khi quét đủ `N/N` thùng.
