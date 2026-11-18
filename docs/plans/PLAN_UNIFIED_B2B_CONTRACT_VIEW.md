# KẾ HOẠCH TRIỂN KHAI: HỢP NHẤT GIAO DIỆN & ĐỒNG BỘ DỮ LIỆU HỢP ĐỒNG B2B CHO 3 ROLE (ADMIN, BUYER, FARMER)

> **Mã kế hoạch:** `PLAN_UNIFIED_B2B_CONTRACT_VIEW`  
> **Dự án:** HONA FRESH — Nền tảng B2B Nông sản  
> **Mục tiêu:** Thống nhất 1 giao diện Hợp đồng B2B điện tử duy nhất và đồng bộ 100% giá tiền/cước phí giữa Admin, Buyer và Farmer.

---

## A. OVERVIEW — TỔNG QUAN

### 1. Mục tiêu
1. **Một giao diện hợp đồng duy nhất:** Hợp nhất việc hiển thị văn bản hợp đồng B2B điện tử tại cả 3 vai trò (Admin, Buyer, Farmer) về một modal dùng chung duy nhất (`B2bContractViewModal.tsx`).
2. **Khớp 100% dữ liệu tài chính:** Loại bỏ hoàn toàn sự chênh lệch giá tiền giữa các role:
   - Tiền hàng nông sản (`pureGoodsAmount = quantityKg * unitPrice`).
   - Cước xe lạnh HoNa Fresh (`shippingFee` tính chuẩn theo trọng lượng và tuyến đường).
   - Tổng giá trị hợp đồng thanh toán (`grandTotal = pureGoodsAmount + shippingFee`).
   - Tiền cọc 30% bảo chứng Escrow sàn HoNa Fresh (`depositAmount = 30% * grandTotal`).
   - Tiền quyết toán còn lại 70% sau khi ký nhận ePOD (`remainingAmount = 70% * grandTotal`).
3. **Tính pháp lý & chuyên nghiệp:** Giữ nguyên quy chuẩn hợp đồng 3 bên (Bên A Nông Dân, Bên B Thương Lái, Bên C Sàn HoNa Fresh), có dấu mộc Escrow, quốc hiệu tiêu ngữ, bảng chi tiết điều khoản lạnh IoT và mã QR tra cứu.

---

## B. CURRENT ARCHITECTURE & ROOT CAUSES — HIỆN TRẠNG & NGUYÊN NHÂN

### 1. Hiện trạng giao diện bị phân mảnh
- **Farmer** (`FarmerOrderManagementView.tsx`) & **Buyer** (`BuyerManagementConsole.tsx`): Đang dùng component `B2bContractViewModal.tsx`.
- **Admin** (`AdminContractsPage.tsx`): Đang tự render một modal quản trị nội bộ riêng mang tên *"Chi Tiết Hợp Đồng & Bảo Chứng An Toàn"* dài hơn 400 dòng JSX, giao diện chia cột kiểu dashboard chứ không phải văn bản hợp đồng B2B chuẩn.

### 2. Nguyên nhân sai lệch giá tiền giữa 3 vai trò
Với đơn hàng 150 kg Lá É Phú Yên (đơn giá 14.100 đ/kg = 2.115.000 đ tiền hàng):
- **Farmer Console**: Truyền `contract.totalAmount` hoặc fallback cước theo công thức cũ `quantityKg * 2.000 đ/kg` -> Cước = 300.000 đ, Tổng = 2.415.000 đ.
- **Buyer Console**: Tính `c.totalAmount - goodsAmount`, nếu hợp đồng chưa lưu cước thì cước bị tính thành 0 đ -> Cước = 0 đ, Tổng = 2.115.000 đ.
- **Admin Portal**: Tính theo công thức tuyến kho HoNa Fresh `150 kg * 850 + 250.000 đ` -> Cước = 377.500 đ, Tổng = 2.492.500 đ.
=> **Kết quả:** Cả 3 bên nhìn vào cùng một đơn hàng nhưng số tiền cước và tổng thanh toán hiển thị 3 con số hoàn toàn khác nhau!

---

## C. IMPLEMENTATION SCOPE — PHẠM VI TRIỂN KHAI

### 1. Danh sách file can thiệp
1. `frontend/src/utils/logisticsCalculator.ts` (hoặc `b2bSyncService.ts`):
   - Thêm hàm dùng chung `calculateB2bContractFinancials(contract)` để mọi role đều gọi chung một công thức tính tiền hàng, cước xe lạnh HoNa, cọc 30%, và còn lại 70%.
2. `frontend/src/components/common/B2bContractViewModal.tsx`:
   - Nâng cấp modal hợp đồng chung: Tự động chuẩn hóa số liệu bằng `calculateB2bContractFinancials`.
   - Bổ sung thông tin nghiệm thu thu hoạch (nếu nhà vườn đã gửi kết quả thu hoạch).
   - Bổ sung nút bấm điều hướng linh hoạt theo role (Admin có nút điều xe nhanh; Buyer có nút thanh toán/theo dõi; Farmer có nút xem biên bản).
3. `frontend/src/app/admin/contracts/page.tsx`:
   - Thay thế toàn bộ modal tự dựng riêng bằng `B2bContractViewModal.tsx`.
   - Khi Admin nhấn "Xem Hợp Đồng" hoặc "Xem Chi Tiết", mở trực tiếp văn bản hợp đồng chuẩn giống hệt Buyer và Farmer.
4. `frontend/src/app/portal/farmer/components/FarmerOrderManagementView.tsx`:
   - Đồng bộ dữ liệu truyền vào `B2bContractViewModal`.
5. `frontend/src/components/buyer/BuyerManagementConsole.tsx`:
   - Đồng bộ dữ liệu truyền vào `B2bContractViewModal`.

---

## D. CÔNG THỨC TÀI CHÍNH THỐNG NHẤT (FINANCIAL FORMULA)

```typescript
export function calculateB2bContractFinancials(contract: any) {
  const quantityKg = Number(contract.quantityKg || contract.offered_weight_kg || contract.quantity || 0);
  const unitPrice = Number(contract.unitPrice || contract.offered_price_per_kg || contract.agreedPricePerKg || contract.price_per_kg || 0);
  
  // 1. Tiền nông sản thuần
  const pureGoodsAmount = (quantityKg > 0 && unitPrice > 0)
    ? (quantityKg * unitPrice)
    : Number(contract.goodsAmount || contract.goods_amount || contract.total_goods_amount || 0);

  // 2. Xác định phương thức vận chuyển
  const rawOpt = String(contract.shippingOption || contract.shipping_option || '').trim().toUpperCase();
  const isSelfPickup = rawOpt === 'PA3' || rawOpt === 'BUYER_SELF_TRANSPORT' || rawOpt.includes('TỰ VẬN CHUYỂN') || rawOpt.includes('TỰ CHỞ') || rawOpt.includes('TỰ LẤY');

  // 3. Cước vận chuyển chuỗi lạnh
  let shippingFee = 0;
  if (isSelfPickup) {
    shippingFee = 0;
  } else if (Number(contract.shippingFee || contract.logistics_fee_amount) > 0) {
    shippingFee = Number(contract.shippingFee || contract.logistics_fee_amount);
  } else if (rawOpt.includes('DIRECT') || rawOpt === 'PA1') {
    shippingFee = Math.round(quantityKg * 1200 + 450000);
  } else {
    // Mặc định: Giao tiêu chuẩn qua trạm trung chuyển HoNa Fresh (PA2)
    shippingFee = Math.round(quantityKg * 850 + 250000);
  }

  // 4. Tổng thanh toán
  const grandTotal = pureGoodsAmount + shippingFee;

  // 5. Tiền cọc bảo chứng Escrow (Tự chở cọc 100%, Qua HoNa cọc 30%)
  const depositAmount = isSelfPickup ? grandTotal : Math.round(grandTotal * 0.3);

  // 6. Số tiền còn lại quyết toán sau khi ký nhận ePOD
  const remainingAmount = Math.max(0, grandTotal - depositAmount);

  return {
    quantityKg,
    unitPrice,
    pureGoodsAmount,
    shippingFee,
    isSelfPickup,
    grandTotal,
    depositAmount,
    remainingAmount,
  };
}
```

---

## E. IMPLEMENTATION STEPS — CÁC BƯỚC THỰC HIỆN

1. **Bước 1:** Định nghĩa hàm `calculateB2bContractFinancials` trong `frontend/src/utils/logisticsCalculator.ts` và export ra toàn hệ thống.
2. **Bước 2:** Cập nhật `B2bContractViewModal.tsx`:
   - Sử dụng `calculateB2bContractFinancials` cho toàn bộ các mục: Tiền hàng, Cước xe, Tổng giá trị hợp đồng, Tiền cọc 30%, Tiền còn lại 70%.
   - Bổ sung thông tin kết quả thu hoạch KCS (sản lượng thực thu, tỷ lệ loại 1, quy cách kiện, điểm đón xe tại rẫy) nếu hợp đồng đã ở giai đoạn thu hoạch/vận chuyển.
   - Thêm prop `role?: 'ADMIN' | 'BUYER' | 'FARMER'` và các nút thao tác nhanh phù hợp.
3. **Bước 3:** Cập nhật `AdminContractsPage.tsx`:
   - Import `B2bContractViewModal`.
   - Chuyển toàn bộ hành động xem chi tiết hợp đồng của Admin sang mở `B2bContractViewModal`.
   - Giữ lại các modal nghiệp vụ chuyên biệt (Duyệt thu hoạch, Điều xe lạnh, Nhập kho lạnh, Quyết toán giải ngân) dưới dạng các nút hành động rõ ràng.
4. **Bước 4:** Đồng bộ hóa ở `FarmerOrderManagementView.tsx` và `BuyerManagementConsole.tsx`:
   - Sử dụng cùng nguồn dữ liệu và cùng component `B2bContractViewModal`.
5. **Bước 5:** Kiểm tra tĩnh (Static Verification) toàn bộ types, props, không có lỗi runtime.

---

## F. ACCEPTANCE CRITERIA — TIÊU CHÍ NGHIỆM THU

1. Khi mở cùng 1 hợp đồng ở cả 3 vai trò (Admin, Buyer, Farmer):
   - **Giao diện hợp đồng hiển thị hoàn toàn giống nhau** (văn bản hợp đồng B2B điện tử chuẩn pháp lý 3 bên).
   - **Số tiền khớp 100%:**
     - Tiền nông sản giống nhau từng đồng.
     - Cước vận chuyển xe lạnh HoNa Fresh giống nhau từng đồng.
     - Tổng thanh toán hợp đồng giống nhau từng đồng.
     - Tiền cọc 30% bảo chứng Escrow giống nhau từng đồng.
     - Tiền quyết toán 70% còn lại giống nhau từng đồng.
2. Không còn hiện tượng mỗi role tính một kiểu hoặc một bên hiện cước 0 đ, một bên hiện cước 300k, một bên hiện cước 377k.
3. Giữ nguyên toàn bộ tính năng in hợp đồng / lưu PDF và luồng điều xe, ký nhận ePOD.

---
