# Ghi chú triển khai phần Buyer

## 1. Phạm vi đã hoàn thiện

Phần Buyer đã được nối với luồng nghiệp vụ dùng chung của hệ thống thay vì chỉ hiển thị dữ liệu mẫu:

- Đăng nhập và gửi JWT trong các request gọi API.
- Quản lý hồ sơ Buyer.
- Quản lý nhiều địa chỉ giao hàng và địa chỉ mặc định.
- Tạo, xem và phản hồi RFQ/đàm phán với Admin/Farmer.
- Chấp nhận báo giá và tạo hợp đồng.
- Theo dõi hợp đồng.
- Thanh toán đặt cọc giả lập.
- Xem kết quả QC và dữ liệu telemetry.
- Ký ePOD.
- Thanh toán phần còn lại giả lập.
- Xem hóa đơn HTML.

## 2. Backend đã sửa hoặc bổ sung

### Model và repository

- `backend/src/main/java/com/btl/webbanrau/model/RfqNegotiation.java`
  - Bổ sung Buyer liên kết với RFQ.
  - Bổ sung phương thức giao hàng và ghi chú.
- `backend/src/main/java/com/btl/webbanrau/repository/RfqNegotiationRepository.java`
  - Bổ sung truy vấn RFQ theo Buyer.
- `backend/src/main/java/com/btl/webbanrau/repository/BuyerWarehouseRepository.java`
  - Repository cho địa chỉ/kho giao hàng của Buyer.

### DTO

- `backend/src/main/java/com/btl/webbanrau/dto/request/BuyerWarehouseRequest.java`
- `backend/src/main/java/com/btl/webbanrau/dto/request/BuyerRfqActionRequest.java`
- `backend/src/main/java/com/btl/webbanrau/dto/request/BuyerEpodRequest.java`

Các DTO này nhận dữ liệu cập nhật địa chỉ, thao tác đàm phán và ký ePOD.

### Service và controller

- `backend/src/main/java/com/btl/webbanrau/service/BuyerWorkflowService.java`
  - Tập trung nghiệp vụ Buyer và kiểm tra Buyer hiện tại từ JWT.
  - Xử lý hồ sơ, địa chỉ, RFQ, hợp đồng, đặt cọc, QC, telemetry, ePOD, thanh toán cuối và hóa đơn.
  - Tái sử dụng luồng hợp đồng/thanh toán hiện có của `AdminBusinessService`.
- `backend/src/main/java/com/btl/webbanrau/controller/BuyerController.java`
  - Cung cấp các API Buyer:
    - `/buyer/profile`
    - `/buyer/addresses`
    - `/buyer/rfq`
    - `/buyer/rfq/{id}/respond`
    - `/buyer/rfq/{id}/accept-counter`
    - `/buyer/contracts`
    - API QR/xác nhận đặt cọc
    - API QC/telemetry
    - `/buyer/contracts/{id}/sign-epod`
    - API QR/xác nhận thanh toán cuối
    - `/buyer/contracts/{id}/invoice`

### Database

- `backend/src/main/resources/db/migration/V6__buyer_workflow.sql`
  - Thêm `buyer_id`, `shipping_option`, `notes` cho bảng `rfq_negotiations`.
  - Thêm index phục vụ truy vấn RFQ theo Buyer.

### Tài khoản demo

- `backend/src/main/java/com/btl/webbanrau/util/DataInitializer.java`
  - Tài khoản demo Buyer được bổ sung thông tin công ty, địa chỉ kho và trạng thái KYC đã xác minh để có thể kiểm thử đầy đủ luồng hợp đồng.
  - Tài khoản kiểm thử:
    - Username: `buyer`
    - Password: `buyer123`

## 3. Frontend đã sửa hoặc bổ sung

### Xác thực và gọi API

- `frontend/src/services/auth.ts`
  - Bổ sung lấy access token và tự động gắn header `Authorization: Bearer ...`.
- `frontend/src/types/index.ts`
  - Bổ sung các trường token và thời hạn token trong `AuthResponse`.
- `frontend/src/services/api.ts`
  - Bổ sung API Buyer cho RFQ, địa chỉ, đặt cọc, ePOD, thanh toán cuối và hóa đơn.
  - Chuẩn hóa dữ liệu hợp đồng từ backend sang dạng dùng trong giao diện.
  - Chuyển ảnh ePOD dạng `blob:` sang data URL trước khi gửi API.

### Giao diện Buyer

- `frontend/src/app/portal/buyer/page.tsx`
  - Hiển thị RFQ thực tế từ backend.
  - Thực hiện chấp nhận hoặc phản hồi báo giá.
  - Kết nối luồng ký ePOD, thanh toán cuối và mở hóa đơn.
  - Bổ sung khu vực địa chỉ và đặt cọc thật qua API.
  - Dữ liệu mẫu chỉ còn được dùng làm fallback khi backend chưa có dữ liệu RFQ.
- `frontend/src/components/BuyerAddressesPanel.tsx`
  - Hiển thị, thêm, sửa, xóa địa chỉ.
  - Cho phép đặt địa chỉ mặc định.
- `frontend/src/components/BuyerEscrowPanel.tsx`
  - Hiển thị hợp đồng Buyer.
  - Lấy QR đặt cọc giả lập và xác nhận thanh toán.
- `frontend/src/components/B2BNegotiationModal.tsx`
  - Gửi RFQ qua API Buyer dùng chung.
  - Loại bỏ việc gửi trùng RFQ và lưu fallback vào localStorage.

## 4. Luồng kiểm thử chính

### Khởi động

```powershell
# Terminal 1
cd backend
.\\gradlew.bat bootRun

# Terminal 2
cd frontend
npm run dev
```

Mở `http://localhost:3000`, đăng nhập bằng `buyer / buyer123`, sau đó vào `/portal/buyer`.

### Kịch bản nên kiểm tra

1. Đăng nhập Buyer và tải lại trang để xác nhận token vẫn được gửi đúng.
2. Thêm một địa chỉ, đặt làm mặc định, sửa và xóa địa chỉ.
3. Tạo RFQ từ màn hình đàm phán.
4. Đăng nhập tài khoản xử lý đơn/đàm phán để phản hồi RFQ.
5. Quay lại Buyer, chấp nhận báo giá và kiểm tra hợp đồng.
6. Mở phần đặt cọc, lấy QR giả lập và xác nhận thanh toán.
7. Ký ePOD với chữ ký, khối lượng và ảnh minh chứng.
8. Thực hiện thanh toán cuối và mở hóa đơn.

## 5. Kết quả kiểm tra mã nguồn

- Backend: `./gradlew.bat compileJava` đã chạy thành công.
- Frontend: `npx tsc --noEmit` đã chạy thành công.
- Đã rà soát và loại bỏ conflict marker trong các file nguồn liên quan.
- Chưa chạy kiểm thử end-to-end với PostgreSQL/Docker trong môi trường hiện tại vì Docker chưa khả dụng.

## 6. Phần vẫn là giả lập hoặc cần phát triển tiếp

- QR và trạng thái thanh toán hiện là giả lập, chưa kết nối ngân hàng hoặc webhook thanh toán thật.
- Đàm phán hiện hỗ trợ trạng thái và phản hồi RFQ; chưa có chat realtime theo từng tin nhắn.
- Hóa đơn hiện trả về HTML, chưa phát sinh PDF hóa đơn điện tử có giá trị pháp lý.
- Cần chạy migration và kiểm thử API trên môi trường có PostgreSQL trước khi triển khai production.

