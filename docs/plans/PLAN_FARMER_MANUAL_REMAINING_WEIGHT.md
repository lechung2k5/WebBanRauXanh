# KẾ HOẠCH TRIỂN KHAI: FARMER CHỈNH TAY SẢN LƯỢNG CÒN LẠI CỦA LÔ NÔNG SẢN

---

## A. Overview
- **Tên chức năng:** Cho phép Nhà vườn / HTX (`ROLE_FARMER`) chỉnh sửa thủ công **sản lượng còn lại (`availableWeightKg`)** của lô nông sản thuộc sở hữu của mình (ví dụ khi đã bán một phần ra ngoài sàn HoNa).
- **Mục tiêu:**
  - Nhà vườn cập nhật nhanh sản lượng còn lại thực tế trên `/portal/farmer` mà không làm sai lệch `totalWeightKg` (sản lượng dự kiến ban đầu) và không cần quyền `ROLE_ADMIN`.
  - Đồng bộ thời gian thực lên sàn B2B (`b2bRealtimeService.notifyLotUpdated("LOT_UPDATED", response)`), tự động cập nhật trạng thái lô khi `availableWeightKg = 0` (`SOLD_OUT`) hoặc mở lại (`OPEN`) nếu đang `SOLD_OUT` và cập nhật `> 0`.
- **Phạm vi nghiệp vụ:** Backend (`PartnerPortalController`, `HarvestLotService`, `SecurityConfig` nếu cần) và Frontend (`api.ts`, `portal/farmer/page.tsx`).
- **Kết quả mong muốn:** Farmer chỉnh tay được `Sản lượng còn lại (kg)` trong phạm vi `0 <= availableWeightKg <= totalWeightKg`, lưu xuống PostgreSQL và hiển thị đồng bộ trên cả Cổng Nông Trại lẫn Sàn Thương Lái.

---

## B. Current Architecture
- **Backend:**
  - [PartnerPortalController.java](file:///e:/HOCTAP/WWW/BTL_WebBanRau/backend/src/main/java/com/btl/webbanrau/controller/PartnerPortalController.java): Đã có `GET /harvest-lots/my-lots` và `POST /farmer/lots` cho `ROLE_FARMER`. Chưa có endpoint cập nhật sản lượng còn lại cho Farmer.
  - [AdminHarvestLotController.java](file:///e:/HOCTAP/WWW/BTL_WebBanRau/backend/src/main/java/com/btl/webbanrau/controller/AdminHarvestLotController.java): `PUT /admin/harvest-lots/{id}` đang khóa `@PreAuthorize("hasRole('ADMIN')")`.
  - [HarvestLotService.java](file:///e:/HOCTAP/WWW/BTL_WebBanRau/backend/src/main/java/com/btl/webbanrau/service/HarvestLotService.java): Đã có `harvestLotRepository`, `mapToResponse`, `b2bRealtimeService.notifyLotUpdated`.
- **Frontend:**
  - [api.ts](file:///e:/HOCTAP/WWW/BTL_WebBanRau/frontend/src/services/api.ts): `updateHarvestLotApi` gọi `PUT /admin/harvest-lots/{id}` (chỉ Admin dùng được).
  - [portal/farmer/page.tsx](file:///e:/HOCTAP/WWW/BTL_WebBanRau/frontend/src/app/portal/farmer/page.tsx): Có nút `Chỉnh Sửa Thông Tin Lô` và thẻ lô hiển thị `Sản lượng dự kiến thu hoạch` + `Sản lượng còn lại`.

---

## C. Implementation Scope

### Frontend
- **File chỉnh sửa:**
  - `frontend/src/services/api.ts`: Thêm hàm `updateFarmerLotAvailableWeightApi(id: number, availableWeightKg: number): Promise<HarvestLot>` gọi `PATCH /farmer/lots/${id}/available-weight`.
  - `frontend/src/app/portal/farmer/page.tsx`:
    - Thêm state `editingRemainingLot: HarvestLot | null`, `remainingWeightInput: string`, `savingRemaining: boolean`.
    - Trên thẻ lô (cạnh dòng `Sản lượng còn lại` hoặc cụm nút thao tác), thêm nút **"Điều chỉnh còn lại"** (hoặc icon sửa nhanh) và trong modal Chỉnh Sửa Lô (`editingLotId`) hiển thị thêm ô nhập `Sản lượng còn lại (kg)` khi đang chỉnh sửa lô.
    - Validation phía client: số `>= 0` và `<= totalQuantity/totalWeightKg`, hiển thị trạng thái loading/error/success rõ ràng.
    - Phát sự kiện đồng bộ (`b2b_sync_event`, `b2b_lot_updated`) để sàn B2B cập nhật ngay.

### Backend
- **File chỉnh sửa:**
  - `backend/src/main/java/com/btl/webbanrau/service/HarvestLotService.java`:
    - Thêm method `@Transactional public HarvestLotResponse updateFarmerAvailableWeight(Long lotId, Long farmerId, BigDecimal availableWeightKg)`:
      - Kiểm tra lô tồn tại (`404`/`400` nếu không thấy).
      - Kiểm tra quyền sở hữu: `Objects.equals(lot.getFarmerId(), farmerId)` (nếu không phải chủ lô -> ném `AuthException(403, "OWNER_REQUIRED", ...)`).
      - Kiểm tra hợp lệ: `availableWeightKg != null`, `availableWeightKg >= 0`, và nếu `lot.getTotalWeightKg() != null` thì `availableWeightKg <= lot.getTotalWeightKg()`.
      - Không cho phép chỉnh nếu lô đã `REJECTED` hoặc `SUSPENDED`.
      - Cập nhật `lot.setAvailableWeightKg(availableWeightKg)`.
      - Tự động cập nhật trạng thái: nếu `availableWeightKg.compareTo(BigDecimal.ZERO) == 0` và đang `OPEN` -> chuyển `SOLD_OUT`; nếu `availableWeightKg.compareTo(BigDecimal.ZERO) > 0` và đang `SOLD_OUT` -> mở lại `OPEN`.
      - Lưu DB và gọi `b2bRealtimeService.notifyLotUpdated("LOT_UPDATED", response)`.
  - `backend/src/main/java/com/btl/webbanrau/controller/PartnerPortalController.java`:
    - Inject `HarvestLotService`.
    - Thêm endpoint `@PatchMapping("/farmer/lots/{id}/available-weight") @PreAuthorize("hasRole('FARMER')")`.

### Database
- Không cần thay đổi Schema hay chạy Migration (`harvest_lots` đã có sẵn `total_weight_kg` và `available_weight_kg`).

---

## D. API Contract

- **Method & Endpoint:** `PATCH /api/v1/farmer/lots/{id}/available-weight`
- **Authentication / Authorization:** Bắt buộc đăng nhập với `ROLE_FARMER`, kiểm tra `lot.farmer_id == currentUser.id` tại Backend.
- **Request Body:**
  ```json
  {
    "availableWeightKg": 150
  }
  ```
- **Response (`200 OK`):** `ApiResponse<HarvestLotResponse>` chứa đầy đủ thông tin lô sau khi cập nhật (`availableWeightKg`, `totalWeightKg`, `status`, ...).
- **Error Responses:**
  - `400 Bad Request`: `availableWeightKg` âm, null, vượt quá `totalWeightKg`, hoặc lô đang ở trạng thái `REJECTED`/`SUSPENDED`.
  - `403 Forbidden`: Lô không thuộc về Farmer đang đăng nhập.

---

## E. Business Flow
1. Farmer đăng nhập `/portal/farmer` -> vào tab Quản lý lô nông sản.
2. Tại thẻ lô (hoặc modal chỉnh sửa lô), Farmer bấm **"Chỉnh sản lượng còn lại"** -> nhập số kg thực tế còn có thể bán trên sàn (ví dụ từ `200 kg` giảm xuống `120 kg` do đã bán `80 kg` bên ngoài).
3. Frontend gửi `PATCH /api/backend/farmer/lots/{id}/available-weight`.
4. Backend kiểm tra quyền sở hữu `farmer_id`, kiểm tra `0 <= availableWeightKg <= totalWeightKg`, cập nhật DB và phát WebSocket `LOT_UPDATED`.
5. Frontend cập nhật danh sách lô của Farmer và thông báo thành công.

---

## F. Implementation Steps
1. Thêm `updateFarmerAvailableWeight` vào `HarvestLotService.java`.
2. Thêm `@PatchMapping("/farmer/lots/{id}/available-weight")` vào `PartnerPortalController.java`.
3. Thêm `updateFarmerLotAvailableWeightApi` vào `frontend/src/services/api.ts`.
4. Cập nhật UI chỉnh tay sản lượng còn lại trong `frontend/src/app/portal/farmer/page.tsx`.
5. Kiểm tra tĩnh & kiểm tra endpoint/route.

---

## G. Risks & Considerations
- **Bảo mật:** Bắt buộc kiểm tra `lot.farmerId == AuthService.current().getId()` ở Backend để Farmer này không sửa được lô của Farmer khác.
- **Tính toàn vẹn số lượng:** Không tự ý trừ âm hoặc vượt quá `totalWeightKg`; không sửa các hợp đồng B2B đã ký trước đó.

---

## H. Acceptance Criteria
- Farmer chỉnh được `Sản lượng còn lại (kg)` cho lô của mình trong khoảng `[0, totalWeightKg]`.
- Chỉnh về `0` tự động chuyển trạng thái `OPEN` -> `SOLD_OUT`; tăng từ `0` lên `> 0` tự động mở lại `OPEN`.
- Farmer không thể chỉnh lô của Farmer khác (`403`) và không thể nhập số âm hoặc lớn hơn sản lượng dự kiến (`400`).
