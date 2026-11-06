# Hướng dẫn Cấu hình Cloudinary và Vận hành Tải ảnh - HoNa Fresh

Tài liệu này hướng dẫn chi tiết cách thiết lập, cấu hình biến môi trường, kiểm thử API qua Postman và thao tác trên giao diện website HoNa Fresh cho tính năng tải ảnh lên Cloudinary.

---

## 1. Cách lấy Cloud Name, API Key, API Secret từ Cloudinary Console

1. Truy cập trang web chính thức của Cloudinary: [https://cloudinary.com](https://cloudinary.com) và đăng nhập (hoặc đăng ký tài khoản miễn phí).
2. Vào **Dashboard** (Bảng điều khiển) tại [https://console.cloudinary.com/pm](https://console.cloudinary.com/pm).
3. Tại mục **Product Environment Credentials**:
   - **Cloud name**: Chuỗi định danh tài khoản đám mây (ví dụ: `dxyza123`).
   - **API Key**: Dãy số định danh khóa API (ví dụ: `123456789012345`).
   - **API Secret**: Chuỗi bí mật API (nhấp biểu tượng con mắt để sao chép).

> [!WARNING]
> Tuyệt đối **không** chia sẻ, hardcode hoặc đẩy `API Secret` vào mã nguồn Git hay các file cấu hình công khai.

---

## 2. Cách cấu hình Environment Variables trong IntelliJ IDEA

Để backend nạp các biến môi trường mà **không cần ghi secret vào source code hay file `application.properties`**:

1. Mở dự án trong IntelliJ IDEA.
2. Trên thanh menu, chọn **Run** ➔ **Edit Configurations...**
3. Tìm cấu hình chạy ứng dụng Spring Boot: **WebBanRauApplication**.
4. Tại ô **Environment variables**, nhấp vào biểu tượng thư mục / dấu cộng và thêm 3 biến:
   ```text
   CLOUDINARY_CLOUD_NAME=ten_cloud_cua_ban;CLOUDINARY_API_KEY=key_cua_ban;CLOUDINARY_API_SECRET=secret_cua_ban
   ```
5. Nhấp **Apply** ➔ **OK**.
6. Khi khởi chạy backend từ IntelliJ, Spring Boot sẽ tự động map vào các thuộc tính cấu hình trong `application.properties`:
   - `cloudinary.cloud-name=${CLOUDINARY_CLOUD_NAME:}`
   - `cloudinary.api-key=${CLOUDINARY_API_KEY:}`
   - `cloudinary.api-secret=${CLOUDINARY_API_SECRET:}`

*(Nếu chạy qua Terminal PowerShell/CMD trên Windows, bạn có thể gán biến môi trường tạm thời trước khi chạy `./gradlew bootRun`)*:
```powershell
$env:CLOUDINARY_CLOUD_NAME="ten_cloud_cua_ban"
$env:CLOUDINARY_API_KEY="key_cua_ban"
$env:CLOUDINARY_API_SECRET="secret_cua_ban"
./gradlew bootRun
```

---

## 3. Cách chạy Backend, Frontend và Migration Database

### 3.1. Database & Flyway Migration
- Hệ thống sử dụng Flyway để tự động quản lý schema. Migration mới `V4__cloudinary_media.sql` nằm tại `backend/src/main/resources/db/migration/V4__cloudinary_media.sql`.
- Khi backend khởi động, Flyway sẽ tự động phát hiện và áp dụng `V4__cloudinary_media.sql` để tạo bảng `uploaded_assets` và các cột `*_public_id` (các cột này đều cho phép `NULL`, đảm bảo tương thích 100% với dữ liệu cũ).

### 3.2. Chạy Backend (Spring Boot 3.3.4, Java 21)
```powershell
cd d:\BTL_WWWJava\WebBanRauXanh\backend
./gradlew bootRun
```
Backend lắng nghe tại: `http://localhost:8080/api/v1`

### 3.3. Chạy Frontend (Next.js 16)
```powershell
cd d:\BTL_WWWJava\WebBanRauXanh\frontend
npm run dev
```
Frontend hoạt động tại: `http://localhost:3000`

---

## 4. Hợp đồng API Upload và Cơ chế Bảo mật

### 4.1. Endpoint Upload Ảnh
- **URL**: `POST /api/v1/uploads/images` (Proxy qua Next.js: `POST /api/backend/uploads/images`)
- **Headers**:
  - `X-HoNa-Request: 1` (Bắt buộc cho CSRF protection)
  - `Content-Type: multipart/form-data`
  - Cookie `hona_access` / `hona_refresh` (hoặc `Authorization: Bearer <token>`) nếu đã đăng nhập.
- **Request Parameters (Form-Data)**:
  - `file`: Tệp nhị phân ảnh (Chỉ chấp nhận JPEG, PNG, WebP; tối đa 5 MB).
  - `purpose`: Chuỗi Enum mục đích sử dụng ảnh (`CERTIFICATE`, `PRODUCT`, `AVATAR`, `CATEGORY`, `LOT`, `EPOD`).
- **Response Format (Chuẩn ApiResponse của dự án)**:
  ```json
  {
    "code": 200,
    "message": "Thành công",
    "result": {
      "assetId": "med_a1b2c3d4e5f67890",
      "url": "https://res.cloudinary.com/.../image/upload/.../ten_anh.jpg",
      "publicId": "hona_fresh/certificates/...",
      "resourceType": "image"
    }
  }
  ```

### 4.2. Endpoint Xóa Ảnh
- **URL**: `DELETE /api/v1/uploads/images/{assetId}`
- **Quyền**: Chỉ chủ sở hữu ảnh (người đã tải lên) hoặc Quản trị viên (`ROLE_ADMIN`) mới có quyền xóa.

### 4.3. Endpoint Lấy URL Xem Ảnh Có Chữ Ký (Signed URL cho KYC)
- **URL**: `GET /api/v1/uploads/images/{assetId}/signed-url`
- **Quyền**: Chỉ chủ sở hữu chứng chỉ hoặc Quản trị viên mới được tạo link xem có chữ ký thời hạn.

---

## 5. Hướng dẫn Kiểm thử qua Postman

### Bước 1: Đăng nhập lấy phiên (nếu upload cho Product, Category, hoặc Hồ sơ đối tác)
1. Tạo request: `POST http://localhost:3000/api/backend/auth/login`
2. Headers:
   - `Content-Type: application/json`
   - `X-HoNa-Request: 1`
3. Body (raw JSON):
   ```json
   {
     "username": "ten_dang_nhap_that",
     "password": "mat_khau_that_cua_ban"
   }
   ```
4. Gửi request, Postman sẽ tự động lưu cookie `hona_access` và `hona_refresh`.

*(Lưu ý: Đối với việc đăng ký kèm chứng chỉ mới, người dùng chưa có tài khoản vẫn có thể gọi thẳng upload với `purpose=CERTIFICATE` mà không cần đăng nhập).*

### Bước 2: Upload File lên Cloudinary
1. Tạo request: `POST http://localhost:3000/api/backend/uploads/images`
2. Headers:
   - `X-HoNa-Request: 1`
   - *(Tuyệt đối không tự gõ `Content-Type: multipart/form-data` trong Headers, hãy để Postman tự động sinh kèm boundary)*
3. Body: Chọn **form-data**:
   - Khóa 1: Tên `file`, đổi loại từ **Text** sang **File**, bấm chọn một file ảnh `.jpg`, `.png` hoặc `.webp` (dung lượng < 5 MB) trên máy bạn.
   - Khóa 2: Tên `purpose`, loại **Text**, giá trị `CERTIFICATE` (hoặc `PRODUCT`, `LOT`, `CATEGORY`, `EPOD`).
4. Bấm **Send**:
   - Kết quả trả về `200 OK` với thông tin `assetId`, `url`, `publicId`.
   - Nếu chưa cấu hình Cloudinary: Backend trả về `503 Service Unavailable` kèm thông báo `"CLOUDINARY_NOT_CONFIGURED"`.
   - Nếu gửi file `.exe` hoặc `.txt` đổi tên đuôi sang `.jpg`: Backend phân tích magic bytes và từ chối `400 Bad Request` `"INVALID_FILE_TYPE"`.

---

## 6. Hướng dẫn Kiểm thử trên Website HoNa Fresh

### 6.1. Kiểm thử Upload Chứng chỉ khi Đăng ký Đối tác B2B (Chưa đăng nhập)
1. Truy cập `http://localhost:3000/dang-nhap` và chọn tab **Đăng ký Tài khoản Đối tác B2B**.
2. Chọn vai trò **Nông dân / Hợp tác xã**.
3. Điền các trường định danh bắt buộc (Tên, Email, SĐT, Mật khẩu, Tên HTX).
4. Cuộn xuống ô **Ảnh chứng chỉ chất lượng (VietGAP / GlobalGAP)**:
   - Trước đây là ô nhập link HTTPS dạng text.
   - Hiện tại đã là nút **📁 Chọn ảnh**.
5. Nhấp **Chọn ảnh** và chọn 1 file ảnh từ máy tính của bạn:
   - Nhìn thấy trạng thái `"Đang tải lên Cloudinary..."`.
   - Sau khi hoàn tất: Hiện hình ảnh thu nhỏ (preview), tên file và dấu tích xanh `"✅ Đã tải ảnh lên"`.
   - Có tùy chọn **🔄 Đổi ảnh** hoặc **🗑️ Xóa**.
6. Bấm **Đăng ký**: Hệ thống gửi mã OTP về Gmail và lưu thông tin người dùng kèm ảnh chứng chỉ Cloudinary.

### 6.2. Kiểm thử Cập nhật Hồ sơ Nông trại trong Portal Đối tác (Đã đăng nhập)
1. Đăng nhập tài khoản Nông dân (Farmer).
2. Vào **Portal Nông Trại** (`/portal/farmer`).
3. Trong khối **Hồ sơ đối tác**, bấm nút **Cập nhật hồ sơ**.
4. Tại trường **Ảnh / Tài liệu chứng nhận**:
   - Chọn ảnh mới từ thiết bị.
   - Nhấn **Xác nhận**: Ảnh mới được lưu vào database; Cloudinary tự động kích hoạt dọn ảnh cũ đã lưu trước đó nếu có.
5. F5 tải lại trang: Hồ sơ vẫn lưu và hiển thị đúng ảnh chứng chỉ vừa cập nhật.

### 6.3. Kiểm thử Đăng lô nông sản vụ mùa / Quản trị Danh mục (Admin / Farmer)
1. Vào `/admin` bằng tài khoản Quản trị viên (`ROLE_ADMIN`).
2. Vào tab **Nguồn cung & danh mục**:
   - Bấm **Thêm ngành hàng**: Ô ảnh đại diện danh mục cho phép chọn file từ máy thay cho việc phải tự nhập link ảnh Unsplash.
   - Bấm **Tạo lô cho nông trại**: Ô ảnh lô nông sản cho phép chọn file từ máy, xem trước và lưu.

---

## 7. Cách Tái Sử dụng Service & Component Cho Tính năng Khác

### 7.1. Phía Frontend
Sử dụng component `ImageUploadField` đã được đóng gói sẵn tại `@/components/ImageUploadField`:
```tsx
import ImageUploadField from '@/components/ImageUploadField';

// Sử dụng trong bất kỳ form nào:
<ImageUploadField
  name="imageUrl"
  label="Ảnh sản phẩm"
  purpose="PRODUCT"
  required={true}
  value={form.imageUrl}
  onChange={(uploadedUrl, assetId) => setForm({ ...form, imageUrl: uploadedUrl })}
  hint="Ảnh sắc nét độ phân giải cao, tối đa 5 MB."
/>
```

### 7.2. Phía Backend
Tiêm `CloudinaryService` vào bất kỳ Spring Service nào:
```java
@Autowired
private CloudinaryService cloudinaryService;

// Tải ảnh:
Map<?, ?> result = cloudinaryService.uploadImage(fileBytes, filename, ImagePurpose.PRODUCT, "upload");

// Xóa ảnh khi cập nhật/xóa thực thể:
cloudinaryService.deleteImage(publicId, "upload");

// Tạo URL có chữ ký thời hạn cho dữ liệu mật:
String viewUrl = cloudinaryService.generateSignedUrl(publicId, "authenticated");
```

---

## 8. Xử lý các Tình huống Ngoại lệ & Giới hạn Kỹ thuật

| Tình huống | Cách hệ thống xử lý |
| :--- | :--- |
| **Chưa cấu hình Cloudinary** | Ứng dụng vẫn khởi động và phục vụ các tính năng khác bình thường. Endpoint upload trả về HTTP 503 với mã `CLOUDINARY_NOT_CONFIGURED`. Giao diện hiển thị thông báo rõ ràng và cho phép thử lại. |
| **Tệp quá 5 MB hoặc tệp rỗng** | Backend chặn ngay lập tức ở tầng kiểm duyệt, trả về HTTP 400 (`FILE_TOO_LARGE` / `MISSING_FILE`). |
| **Đổi đuôi file lạ thành .jpg** | Backend kiểm tra Header bytes (Magic bytes: `FF D8 FF` cho JPEG, `89 50 4E 47` cho PNG, `52 49 46 46` cho WebP) và kiểm tra khả năng giải mã của `ImageIO`. Tệp giả mạo bị từ chối 400 `INVALID_FILE_TYPE`. |
| **Tránh Decompression Bomb** | Backend giới hạn độ phân giải tối đa 8000x8000 và 40 Megapixels để bảo vệ bộ nhớ máy chủ. |
| **Dữ liệu ảnh cũ trong hệ thống** | Các URL cũ (Unsplash, HTTPS tĩnh) vẫn được bảo toàn nguyên vẹn và hiển thị bình thường. Hệ thống chỉ xử lý xóa đối với tài nguyên thuộc quyền sở hữu của Cloudinary HoNa Fresh. |

---

## 9. Chính sách Phân phối Tài nguyên (Public vs Private) và Dọn dẹp

1. **Ảnh KYC / Chứng chỉ (`CERTIFICATE`)**:
   - Được phân phối dưới dạng `authenticated` (tài nguyên riêng tư).
   - Truy cập yêu cầu URL có chữ ký do Backend tạo ra dựa trên quyền của chủ sở hữu hồ sơ hoặc Admin.
2. **Ảnh Sản phẩm, Lô hàng, Danh mục (`PRODUCT`, `LOT`, `CATEGORY`)**:
   - Được phân phối công khai qua giao thức HTTPS CDN tiêu chuẩn của Cloudinary để tối ưu tốc độ tải trang cho khách mua hàng.
3. **Quy tắc dọn dẹp khi thay ảnh**:
   - Luồng nghiệp vụ luôn đảm bảo: **Upload ảnh mới thành công ➔ Lưu liên kết vào database thành công ➔ Mới tiến hành xóa ảnh cũ**.
   - Nếu lưu database thất bại, ảnh cũ không bị mất.
