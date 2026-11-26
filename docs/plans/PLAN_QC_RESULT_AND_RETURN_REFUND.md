# KẾ HOẠCH TRIỂN KHAI: ĐỒNG BỘ KẾT QUẢ KIỂM ĐỊNH QC (ĐẠT / KHÔNG ĐẠT) & CƠ CHẾ HOÀN HÀNG – HOÀN CỌC

---

## A. Overview

- **Tên chức năng:** Hiển thị kết quả Kiểm định QC (Đạt / Không đạt) đồng bộ cho Buyer & Farmer + Quy trình Hoàn hàng & Hoàn cọc tại kho khi QC Không đạt.
- **Mục tiêu:**
  1. Khi KTV/Admin hoàn tất kiểm định tại Lab QC (`/admin/qc`):
     - **Nếu Đạt chuẩn (`QC_PASSED`):** Cập nhật ngay trạng thái `QC_PASSED`, thông số Brix, Nitrate, an toàn thuốc BVTV, mã chứng chỉ và vị trí lưu kho lên cả **Buyer** và **Farmer** theo thời gian thực (API + WebSocket).
     - **Nếu Không đạt (`QC_FAILED`):** Đóng băng lô hàng tại kho (chờ xử lý hoàn trả), cập nhật rõ trạng thái **"Không đạt kiểm định QC"** kèm lý do cụ thể (Brix thấp, vượt ngưỡng Nitrate, dương tính BVTV, dập nát...) lên cả **Buyer** và **Farmer**.
  2. **Cơ chế xử lý tại kho khi `QC_FAILED`:**
     - Kho có 2 phương án xử lý rõ ràng trực tiếp trên `/admin/qc`:
       - **Hoàn hàng về Nhà vườn & Hoàn cọc 30% cho Buyer (`RETURN_AND_REFUND`):** Ghi nhận biên bản trả hàng, hạch toán hoàn tiền ký quỹ Escrow (`Nợ 3388 / Có 112`), cập nhật `refund_amount`, chuyển hợp đồng sang `QC_REJECTED_REFUNDED` (hoặc `CANCELLED`), giải phóng ô kệ trên sơ đồ kho 3D (`hub_rack_bin` rời khỏi kệ đang lưu) và tạo thông báo cho cả Buyer lẫn Farmer.
       - **Đề nghị Nhà vườn giao bù / thay thế lô mới (`REPLACEMENT_REQUEST`):** Giữ cọc Escrow, yêu cầu Nhà vườn giao bổ sung lô đạt chuẩn (mở lại bước chuẩn bị hàng).
- **Kết quả mong muốn:** Quy trình QC khép kín, minh bạch 3 bên (Kho/Admin – Nhà vườn – Thương lái), không bị treo hàng hoặc treo tiền cọc khi nông sản không đạt chất lượng.

---

## B. Current Architecture

- **Backend hiện có:**
  - `AdminBusinessService.warehouseInbound` (và `AdminBusinessController`): hiện mới chỉ xử lý trường hợp Đạt (`qc_status = 'QC_PASSED'`, `status = 'AT_HUB_QC'`) và bắn WebSocket `AT_HUB_QC`. Chưa có endpoint đánh dấu `QC_FAILED` và chưa có luồng hoàn hàng / hoàn cọc trực tiếp từ bước QC.
  - `AdminBusinessService.resolve(..., "REFUND")`: đã có sẵn mẫu hạch toán hoàn cọc `journal(contractId, "REFUND", ..., 3388 -> 112)` và cập nhật `refund_amount`.
  - `FarmerService.mapToContractResponse` & `BuyerWorkflowService.contracts`: đã đọc `qc_status`, `qc_brix`, `qc_nitrate_ppm`, `qc_pesticide_safe`, `qc_passed_at`.
- **Frontend hiện có:**
  - `frontend/src/app/admin/qc/page.tsx`: Modal Lab QC mới chỉ có 1 nút **"Xác Nhận Đạt Chuẩn & Cấp Chứng Chỉ QC"**, chưa có nút **"Không Đạt QC"** và chưa có bảng xử lý hoàn hàng / hoàn cọc.
  - `BuyerManagementConsole.tsx` & `FarmerOrderManagementView.tsx`: chưa hiển thị thẻ kết quả QC chi tiết (Đạt / Không đạt, Brix, Nitrate, lý do không đạt, trạng thái hoàn hàng & hoàn cọc).

---

## C. Implementation Scope

### Backend
- **`backend/src/main/java/com/btl/webbanrau/service/AdminBusinessService.java`:**
  - Cập nhật `warehouseInbound`: set `status = 'QC_PASSED'`, `fulfillment_status = 'QC_PASSED'`, `qc_status = 'QC_PASSED'` để phản ánh đúng trạng thái Đạt QC ở cả Buyer & Farmer.
  - Bổ sung `rejectQcLab(long contractId, JsonNode n)`:
    - Cập nhật `b2b_contracts`: `qc_status = 'QC_FAILED'`, `status = 'QC_FAILED'`, `fulfillment_status = 'QC_FAILED'`, `delivery_notes = reason`.
    - Cập nhật/tạo bản ghi `hub_inspections` với `qc_passed = false`, `qc_notes = reason`.
    - Tạo bản ghi `spoilage_claims` (`liable_party = 'FARMER'`, `cause = reason`) để lưu vết sự cố chất lượng.
    - Gửi thông báo & bắn WebSocket `QC_FAILED` tới Buyer và Farmer.
  - Bổ sung `processQcReturnRefund(long contractId, JsonNode n)`:
    - Hỗ trợ `action = "RETURN_AND_REFUND"`:
      - Tính tiền cọc đã nhận (`deposit_received` hoặc `deposit_30_amount`), ghi bút toán `REFUND` (`Nợ 3388 / Có 112`), cập nhật `status = 'CANCELLED'`, `fulfillment_status = 'QC_RETURNED_REFUNDED'`, `qc_status = 'QC_RETURNED'`, `refund_amount = amount`, `delivery_notes = note`.
      - Cập nhật `spoilage_claims` sang `REFUNDED`, mở khóa lại sản lượng lô hàng hoặc ghi chú trả hàng về Nhà vườn (kèm biển số xe / người nhận hoàn trả).
      - Bắn WebSocket `QC_RETURNED_REFUNDED` để Buyer thấy đã hoàn cọc, Farmer thấy biên bản hoàn trả hàng, và **Sơ đồ Kho 3D tự động giải phóng ô kệ**.
- **`backend/src/main/java/com/btl/webbanrau/controller/AdminBusinessController.java`:**
  - Thêm `POST /admin/contracts/{id}/qc-reject`
  - Thêm `POST /admin/contracts/{id}/qc-return-refund`
- **`backend/src/main/java/com/btl/webbanrau/service/FarmerService.java` & `BuyerWorkflowService.java`:**
  - Cập nhật `computeFulfillmentStep` & `computeFulfillmentStatusName` cho các trạng thái mới: `QC_PASSED` (Mốc 4), `QC_FAILED` (Mốc 4 - Cảnh báo không đạt QC, chờ kho xử lý), `QC_RETURNED_REFUNDED` / `CANCELLED` (Đã hoàn hàng & hoàn cọc).
  - Trả đầy đủ `qcStatus`, `qcBrix`, `qcNitratePpm`, `qcPesticideSafe`, `qcCertUrl`, `refundAmount`, `deliveryNotes` cho cả Buyer và Farmer.

### Frontend
- **`frontend/src/services/fleetDispatchApi.ts`:**
  - Thêm `rejectWarehouseQc(contractId, data)` và `processQcReturnRefund(contractId, data)`.
- **`frontend/src/app/admin/qc/page.tsx`:**
  - Trong Modal Lab QC: bổ sung lựa chọn **Kết quả kiểm định**: `Đạt Chuẩn QC` vs `Không Đạt Chuẩn QC` (khi chọn Không đạt, nhập lý do chi tiết, tự động đánh dấu dựa theo Brix < 12 / Nitrate > 300 / BVTV dương tính nếu có).
  - Trong bảng Lab QC & tab mới/bộ lọc **Hàng Không Đạt & Hoàn Trả**: hiển thị các lô `QC_FAILED` kèm nút **"Xử Lý Hoàn Hàng & Hoàn Cọc"** (mở modal nhập thông tin trả hàng cho Nhà vườn, số tiền hoàn cọc 30% cho Buyer, mã tham chiếu giao dịch).
- **`frontend/src/components/buyer/BuyerManagementConsole.tsx`:**
  - Hiển thị banner/card **Kết quả Kiểm định QC** trên thẻ hợp đồng:
    - `QC_PASSED`: huy hiệu xanh **Đạt Chuẩn QC HoNa** (Brix, Nitrate, Âm tính BVTV, xem chứng chỉ).
    - `QC_FAILED`: huy hiệu đỏ **Không Đạt Kiểm Định QC** + lý do từ kho + thông báo đang xử lý hoàn cọc.
    - `CANCELLED` / `QC_RETURNED_REFUNDED` (có `refundAmount > 0`): hiển thị rõ **Đã Hoàn Hàng & Hoàn Cọc 30% (`refundAmount`)**.
- **`frontend/src/app/portal/farmer/components/FarmerOrderManagementView.tsx`:**
  - Hiển thị rõ **Kết quả Kiểm định QC tại Kho** trên thẻ đơn hàng Farmer:
    - `QC_PASSED`: xanh lá **Đạt Chuẩn QC · Lưu Kho Mát Chờ Giao**.
    - `QC_FAILED`: đỏ **Không Đạt Kiểm Định QC Tại Kho** + lý do chi tiết (Brix/Nitrate/BVTV) + thông báo chờ nhận hàng hoàn trả.
    - `QC_RETURNED_REFUNDED` / `CANCELLED` (sau QC): thông báo **Kho Đã Lập Biên Bản Hoàn Hàng & Hoàn Cọc Buyer**.

### Database
- Không cần tạo bảng mới hay chạy migration (tận dụng các cột đã có trên `b2b_contracts`: `qc_status`, `qc_brix`, `qc_nitrate_ppm`, `qc_pesticide_safe`, `qc_cert_url`, `refund_amount`, `delivery_notes`, cùng bảng `hub_inspections`, `spoilage_claims`, `gl_journal_entries`).

---

## D. API Contract

1. **Đánh dấu Không đạt kiểm định QC**
   - `POST /admin/contracts/{id}/qc-reject` (`ROLE_ADMIN`)
   - Body: `{ brix, nitratePpm, pesticideSafe, rejectedWeightKg, qcNotes, reason }`
   - Response `200 OK`: `{ contractCode, qcStatus: "QC_FAILED", reason }`
2. **Xử lý Hoàn hàng & Hoàn cọc sau khi QC Không đạt**
   - `POST /admin/contracts/{id}/qc-return-refund` (`ROLE_ADMIN`)
   - Body: `{ action: "RETURN_AND_REFUND", returnMethod, returnNotes, reference }`
   - Response `200 OK`: `{ contractCode, status: "CANCELLED", fulfillmentStatus: "QC_RETURNED_REFUNDED", refundAmount }`

---

## E. Business Flow

1. Hàng đã dỡ vào kho (`AT_HUB_QC` / `HUB_DELIVERED`) → KTV tiến hành kiểm nghiệm tại `/admin/qc`.
2. **Nhánh Đạt (`QC_PASSED`):**
   - Bấm **Cấp Chứng Chỉ & Đạt Chuẩn QC** → hợp đồng giữ trạng thái `QC_PASSED` trên kệ kho 3D → Buyer & Farmer hiển thị ngay huy hiệu **Đạt Chuẩn QC** kèm chỉ số Brix/Nitrate.
3. **Nhánh Không đạt (`QC_FAILED`):**
   - Chọn **Không Đạt Chuẩn QC** + ghi rõ lý do → hợp đồng chuyển `QC_FAILED` → Buyer & Farmer hiển thị ngay cảnh báo **Không Đạt QC** kèm lý do.
   - Admin/Kho bấm **Xử Lý Hoàn Hàng & Hoàn Cọc** → hệ thống hoàn cọc 30% Escrow về Buyer (bút toán `3388 / 112`), lập biên bản hoàn trả hàng cho Nhà vườn, giải phóng ô kệ khỏi sơ đồ 3D và đồng bộ trạng thái cuối cùng lên cả Buyer & Farmer.

---

## F. Implementation Steps

1. Cập nhật Backend `AdminBusinessService.java`, `AdminBusinessController.java`, `FarmerService.java`, `BuyerWorkflowService.java`.
2. Cập nhật `fleetDispatchApi.ts` và `/admin/qc/page.tsx` (thêm lựa chọn Không đạt QC + modal Hoàn hàng & Hoàn cọc).
3. Cập nhật `BuyerManagementConsole.tsx` và `FarmerOrderManagementView.tsx` để hiển thị trực quan trạng thái `QC_PASSED`, `QC_FAILED`, và `QC_RETURNED_REFUNDED`.
4. Kiểm tra biên dịch Backend (`./gradlew compileJava -x test`) và Frontend (`npx tsc --noEmit`).

---

## G. Risks & Considerations

- **Tính nhất quán Sơ đồ Kho 3D:** Khi hợp đồng chuyển sang `CANCELLED` / `QC_RETURNED_REFUNDED` sau hoàn hàng, `WarehouseStorageService.getActiveStoredContracts()` chỉ lấy `status IN ('AT_HUB_QC', 'HUB_DELIVERED', 'QC_PASSED', 'READY_OUTBOUND')`, nên hàng hoàn trả tự động rời khỏi kệ 3D. Riêng khi ở trạng thái `QC_FAILED` (chưa hoàn trả), hàng vẫn đang nằm tạm trên kệ để chờ trả (cảnh báo màu đỏ).
- **Hoàn cọc Escrow:** Chỉ cho phép hoàn cọc khi hợp đồng chưa quyết toán (`SETTLED`) và có `deposit_received > 0` (hoặc `deposit_30_amount > 0`).

---

## H. Acceptance Criteria

1. Tại `/admin/qc`, KTV có thể chọn **Đạt Chuẩn QC** hoặc **Không Đạt Chuẩn QC** kèm lý do.
2. Buyer và Farmer hiển thị ngay kết quả QC (`Đạt` / `Không đạt` + lý do + thông số Brix/Nitrate) theo thời gian thực.
3. Với đơn `QC_FAILED`, kho thực hiện được thao tác **Hoàn Hàng & Hoàn Cọc 30%**, sinh bút toán kế toán hoàn cọc, giải phóng ô kệ kho 3D và hiển thị trạng thái đã hoàn hàng/hoàn cọc ở cả Buyer và Farmer.
4. Backend (`compileJava`) và Frontend (`tsc --noEmit`) biên dịch không lỗi.
