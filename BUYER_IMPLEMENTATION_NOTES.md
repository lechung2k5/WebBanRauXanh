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
- Gửi/cập nhật đánh giá sau giao dịch B2B; đánh giá được lưu theo từng Buyer/Farmer và hợp đồng.
- Nhận thông báo email khi trạng thái hợp đồng B2B thay đổi (SMTP lỗi không làm rollback giao dịch).

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
- `backend/src/main/java/com/btl/webbanrau/dto/request/B2bReviewRequest.java`

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
    - `/buyer/contracts/{id}/reviews`
- `backend/src/main/java/com/btl/webbanrau/controller/FarmerController.java`
  - Bổ sung `GET/POST /farmer/contracts/{id}/reviews` để đánh giá hai chiều.
- `backend/src/main/java/com/btl/webbanrau/service/B2bReviewService.java`
  - Kiểm tra quyền sở hữu hợp đồng, trạng thái đã giao/quyết toán và upsert đánh giá.
- `backend/src/main/java/com/btl/webbanrau/service/AdminBusinessService.java`
  - Gửi email thông báo sau mỗi lần chuyển trạng thái hợp đồng; lỗi SMTP chỉ ghi log.

### Database

- `backend/src/main/resources/db/migration/V6__buyer_workflow.sql`
  - Thêm `buyer_id`, `shipping_option`, `notes` cho bảng `rfq_negotiations`.
  - Thêm index phục vụ truy vấn RFQ theo Buyer.
- `backend/src/main/resources/db/migration/V10__b2b_reviews.sql`
  - Tạo bảng đánh giá B2B, giới hạn 1 đánh giá cho mỗi bên trên mỗi hợp đồng và kiểm tra điểm 1–5.

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
9. Với hợp đồng đã giao/quyết toán, vào `Đơn đã mua` để gửi đánh giá; đăng nhập Farmer để đánh giá lại Buyer.

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
- Email trạng thái hợp đồng cần cấu hình SMTP hợp lệ để gửi thật; nếu chưa có SMTP, trạng thái giao dịch vẫn được lưu bình thường.

## 7. Bổ sung Buyer: mua hàng, theo dõi đơn và hồ sơ cá nhân

Đã bổ sung theo yêu cầu:

- Trang `Sản phẩm đã mua`: lấy danh sách đơn bán lẻ của Buyer đang đăng nhập và hiển thị từng sản phẩm, số lượng, đơn giá, thành tiền.
- Trang `Theo dõi đơn hàng`: hiển thị tiến trình `PENDING` → `CONFIRMED` → `SHIPPING` → `DELIVERED`, địa chỉ giao và tổng thanh toán; có trạng thái riêng cho đơn đã hủy.
- Trang cá nhân Buyer: sửa họ tên, số điện thoại, địa chỉ liên hệ, công ty/cửa hàng, mã số thuế và địa chỉ kho nhận.

### Đồng bộ Buyer B2B và loại bỏ luồng bán lẻ

- Màn hình theo dõi chỉ lấy hợp đồng từ `GET /buyer/contracts` theo JWT Buyer; không còn lấy dữ liệu Farmer, fallback hoặc đơn hàng bán lẻ từ localStorage.
- Portal Buyer thay danh sách hợp đồng mẫu bằng dữ liệu backend sau khi đăng nhập; Buyer chưa có hợp đồng sẽ hiển thị danh sách rỗng.
- Đã gỡ mục `Sản phẩm đã mua`, `Theo dõi đơn hàng` và tab `Đơn Hàng Tiêu Dùng`; phần đánh giá được giữ ở mục `Đánh giá giao dịch B2B`.

### API mới

- `GET /buyer/orders?page=0&size=20`
  - Chỉ trả về đơn hàng thuộc Buyer hiện tại từ JWT.
- `GET /buyer/profile`
  - Trả về thông tin tài khoản, thông tin liên hệ và trạng thái KYC.
- `PUT /buyer/profile`
  - Cập nhật thông tin Buyer; username và email được giữ chỉ đọc.

Ngoài ra, khi checkout trong lúc đã đăng nhập, backend tự gắn đơn hàng vào tài khoản hiện tại để các đơn mới xuất hiện trong lịch sử Buyer. Các đơn cũ được tạo dưới dạng khách hoặc chưa có `user_id` sẽ không thể tự động truy ngược về tài khoản Buyer.

### File bổ sung

- `backend/src/main/java/com/btl/webbanrau/dto/response/BuyerProfileResponse.java`
- `frontend/src/components/BuyerOrdersPanel.tsx`
- `frontend/src/components/BuyerProfilePanel.tsx`

