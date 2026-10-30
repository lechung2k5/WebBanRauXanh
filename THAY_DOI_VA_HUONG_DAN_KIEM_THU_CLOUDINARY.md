# Báo Cáo Thay Đổi & Hướng Dẫn Kiểm Thử Tích Hợp Cloudinary

Dự án: **HoNa Fresh / WebBanRauXanh**  
Mục tiêu: **Tích hợp tính năng tải ảnh từ máy tính lên Cloudinary thay cho việc nhập link thủ công, giữ nguyên 100% layout, bố cục, logic nghiệp vụ và bảo mật hiện có.**

---

## 1. Tóm tắt những thay đổi đã thực hiện

1. **Thêm thư viện SDK chính thức**:
   - Thêm `com.cloudinary:cloudinary-http5:2.5.0` vào `backend/build.gradle` (tương thích hoàn toàn với Spring Boot 3.3.4 và Java 21).
2. **Cấu hình biến môi trường an toàn**:
   - Bổ sung ánh xạ biến môi trường `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` vào `application.properties`.
   - Cấu hình dung lượng multipart tối đa 5 MB cho mỗi tệp ảnh.
   - Thêm `backend/.env.example` làm mẫu cấu hình.
   - Giữ nguyên cơ chế bảo mật: không hardcode secret, không đưa secret vào frontend.
3. **Migration Database tối giản (Flyway V4)**:
   - Tạo file `backend/src/main/resources/db/migration/V4__cloudinary_media.sql` tạo bảng `uploaded_assets` để theo dõi quyền sở hữu, định danh `public_id`, `secure_url`, `delivery_type`, `purpose`.
   - Thêm các cột `*_public_id` kiểu `NULL` cho bảng `users`, `harvest_lots`, `categories`, `products`. Không xóa hay thay đổi bất kỳ dữ liệu cũ nào.
4. **Backend Architecture & APIs**:
   - Tạo `CloudinaryConfig.java`: Tạo Bean Cloudinary an toàn, nếu thiếu cấu hình thì ứng dụng vẫn chạy bình thường.
   - Tạo `CloudinaryService.java`: Quản lý upload theo folder purpose whitelist, xóa ảnh và tạo URL ký duyệt cho tài nguyên bảo mật.
   - Tạo `UploadController.java`:
     - Endpoint `POST /api/v1/uploads/images` nhận multipart `file` và `purpose`.
     - Endpoint `DELETE /api/v1/uploads/images/{assetId}` xóa ảnh có kiểm tra quyền sở hữu.
     - Endpoint `GET /api/v1/uploads/images/{assetId}/signed-url` lấy URL xem chứng chỉ riêng tư.
     - Kiểm tra nghiêm ngặt: kích thước <= 5MB, magic bytes (JPEG/PNG/WebP), giải mã ảnh `ImageIO` và giới hạn độ phân giải tránh decompression bomb.
     - Phân quyền: Người chưa đăng nhập chỉ được upload `purpose=CERTIFICATE` trong luồng đăng ký (được giới hạn tần suất bởi `AuthRateLimitFilter`); các mục đích khác (`PRODUCT`, `CATEGORY`, `EPOD`) bắt buộc đăng nhập đúng vai trò.
   - Cập nhật `AuthService.java` & `TokenService.java`: Gắn `assetId` vào tài khoản người dùng, chống chiếm đoạt tài nguyên của người khác, tự động dọn ảnh cũ trên Cloudinary sau khi cập nhật ảnh mới thành công, tạo signed URL cho chứng chỉ KYC khi người dùng/admin xem hồ sơ.
5. **Next.js Route Proxy & Client API**:
   - Cập nhật `frontend/src/app/api/backend/[...path]/route.ts`: Hỗ trợ `multipart/form-data` chuyển tiếp nguyên vẹn lên Spring Boot kèm CSRF token (`X-HoNa-Request: 1`) và Cookie phiên, nâng hạn mức nhận tải tệp lên 7 MB.
   - Cập nhật `frontend/src/services/auth.ts`: Cho phép `api()` nhận `FormData` mà không bị ép gắn `Content-Type: application/json`.
   - Cập nhật `frontend/next.config.ts`: Thêm `res.cloudinary.com` vào `images.remotePatterns`.
6. **Giao diện Frontend (Giữ nguyên cấu trúc, chỉ thay thao tác nhập)**:
   - Tạo component dùng chung `ImageUploadField.tsx` (`@/components/ImageUploadField`): Chọn file từ máy, xem trước (preview thumbnail), hiển thị trạng thái đang upload, thông báo lỗi nếu quá dung lượng / sai định dạng, nút đổi ảnh hoặc xóa.
   - Thay thế ô nhập link ảnh chứng chỉ trong form đăng ký B2B (`AuthForm.tsx`).
   - Thay thế ô nhập link ảnh chứng chỉ trong form cập nhật hồ sơ đối tác (`PartnerPortal.tsx` thông qua `FormDialog`).
   - Tích hợp vào form đăng lô nông sản và thêm/sửa danh mục (`AdminConsole.tsx` & `Module2HarvestLots.tsx`).

---

## 2. Danh sách các file đã sửa và lý do

| STT | Đường dẫn file | Lý do thay đổi |
| :--- | :--- | :--- |
| 1 | `backend/build.gradle` | Bổ sung dependency Cloudinary Java SDK `com.cloudinary:cloudinary-http5:2.5.0`. |
| 2 | `backend/src/main/resources/application.properties` | Bổ sung cấu hình Cloudinary và giới hạn multipart file upload (5MB/6MB). |
| 3 | `backend/.env.example` | Mẫu biến môi trường cho Cloudinary để cấu hình cục bộ. |
| 4 | `backend/src/main/resources/db/migration/V4__cloudinary_media.sql` | Migration tạo bảng `uploaded_assets` và các cột `*_public_id`. |
| 5 | `backend/src/main/java/com/btl/webbanrau/config/CloudinaryConfig.java` | Bean khởi tạo Cloudinary từ biến môi trường. |
| 6 | `backend/src/main/java/com/btl/webbanrau/config/SecurityConfig.java` | Cho phép POST `/uploads/images` cho chứng chỉ đăng ký; bảo vệ các route khác. |
| 7 | `backend/src/main/java/com/btl/webbanrau/config/AuthRateLimitFilter.java` | Giới hạn tần suất gọi endpoint `/uploads/` chống spam. |
| 8 | `backend/src/main/java/com/btl/webbanrau/model/ImagePurpose.java` | Enum whitelist mục đích ảnh: `CERTIFICATE`, `PRODUCT`, `AVATAR`, `CATEGORY`, `LOT`, `EPOD`. |
| 9 | `backend/src/main/java/com/btl/webbanrau/model/UploadedAsset.java` | Entity quản lý tài nguyên ảnh đã upload và quyền sở hữu. |
| 10 | `backend/src/main/java/com/btl/webbanrau/model/User.java` | Bổ sung trường `certificationPublicId`. |
| 11 | `backend/src/main/java/com/btl/webbanrau/model/HarvestLot.java` | Bổ sung trường `imagePublicId`. |
| 12 | `backend/src/main/java/com/btl/webbanrau/model/Category.java` | Bổ sung trường `imagePublicId`. |
| 13 | `backend/src/main/java/com/btl/webbanrau/model/Product.java` | Bổ sung trường `imagePublicId`. |
| 14 | `backend/src/main/java/com/btl/webbanrau/repository/UploadedAssetRepository.java` | Repository truy vấn `UploadedAsset`. |
| 15 | `backend/src/main/java/com/btl/webbanrau/service/CloudinaryService.java` | Dịch vụ upload, xóa và ký URL xem ảnh. |
| 16 | `backend/src/main/java/com/btl/webbanrau/service/AuthService.java` | Gắn quyền sở hữu chứng chỉ, xóa ảnh cũ khi đổi ảnh mới, chặn gắn ảnh người khác. |
| 17 | `backend/src/main/java/com/btl/webbanrau/service/TokenService.java` | Hỗ trợ cấp signed URL khi xem chứng chỉ KYC riêng tư. |
| 18 | `backend/src/main/java/com/btl/webbanrau/controller/UploadController.java` | Controller nhận upload multipart, kiểm duyệt tệp nhị phân và xóa ảnh. |
| 19 | `backend/src/main/java/com/btl/webbanrau/controller/AdminUserController.java` | Cập nhật hàm gọi `tokens.viewUser` để Admin xem ảnh chứng chỉ có chữ ký. |
| 20 | `backend/src/main/java/com/btl/webbanrau/dto/response/ImageUploadResponse.java` | DTO trả về chuẩn cho client: `assetId`, `url`, `publicId`, `resourceType`. |
| 21 | `backend/src/test/java/com/btl/webbanrau/service/CloudinaryServiceTest.java` | Unit test cho CloudinaryService (kiểm tra folder, cấu hình, signed URL). |
| 22 | `backend/src/test/java/com/btl/webbanrau/controller/CloudinaryUploadTest.java` | Unit test cho UploadController (JPEG, PNG, file quá lớn, đổi đuôi giả mạo, phân quyền, xóa). |
| 23 | `backend/src/test/java/com/btl/webbanrau/service/AuthServiceCertificateTest.java` | Unit test cho AuthService (liên kết asset, chặn trộm asset, dọn ảnh cũ). |
| 24 | `frontend/next.config.ts` | Thêm domain `res.cloudinary.com` vào `remotePatterns`. |
| 25 | `frontend/src/services/auth.ts` | Bổ sung hỗ trợ `FormData` cho API client dùng chung mà không hỏng request JSON. |
| 26 | `frontend/src/app/api/backend/[...path]/route.ts` | Proxy hỗ trợ multipart, giữ nguyên CSRF và token cookie. |
| 27 | `frontend/src/components/ImageUploadField.tsx` | Component chọn file, hiển thị trạng thái và preview ảnh. |
| 28 | `frontend/src/components/AuthForm.tsx` | Thay ô nhập link HTTPS ảnh chứng chỉ thành component `ImageUploadField`. |
| 29 | `frontend/src/components/admin/AdminConsole.tsx` | Tích hợp `ImageUploadField` vào `FormDialog` và xem trước ảnh trong popup chi tiết. |
| 30 | `frontend/src/components/admin/Module2HarvestLots.tsx` | Thay ô nhập link ảnh lô nông sản và danh mục bằng `ImageUploadField`. |
| 31 | `CLOUDINARY_SETUP.md` | Tài liệu bàn giao đầy đủ 9 mục theo yêu cầu. |

---

## 3. Bằng chứng kiểm thử tự động thực tế

### 3.1. Biên dịch Backend (`./gradlew compileJava`)
```text
BUILD SUCCESSFUL in 11s
1 actionable task: 1 executed
```

### 3.2. Chạy toàn bộ Unit Tests của Cloudinary
Lệnh thực thi:
```powershell
./gradlew test --tests "com.btl.webbanrau.controller.CloudinaryUploadTest" --tests "com.btl.webbanrau.service.CloudinaryServiceTest" --tests "com.btl.webbanrau.service.AuthServiceCertificateTest"
```
Kết quả:
```text
> Task :compileJava UP-TO-DATE
> Task :classes UP-TO-DATE
> Task :compileTestJava UP-TO-DATE
> Task :testClasses UP-TO-DATE
> Task :test
BUILD SUCCESSFUL in 11s
```
**Danh sách 17 test cases đã vượt qua 100%**:
1. `testUploadValidJpegForCertificate`: Upload JPEG hợp lệ trả đúng assetId, publicId và url.
2. `testUploadValidPngForProduct`: Upload PNG hợp lệ cho nông sản thành công.
3. `testUploadEmptyFileFails`: File rỗng bị từ chối 400 `MISSING_FILE`.
4. `testUploadFileExceeds5MBFails`: File > 5MB bị từ chối 400 `FILE_TOO_LARGE`.
5. `testSpoofedExtensionRejectedByMagicBytes`: Tệp text/binary đổi đuôi thành `.jpg` bị chặn 400 `INVALID_FILE_TYPE`.
6. `testInvalidPurposeRejected`: Mục đích không thuộc enum whitelist bị từ chối 400.
7. `testUnauthenticatedUserUploadingProductRejected`: Chưa đăng nhập upload PRODUCT bị chặn 401.
8. `testNonAdminUploadingCategoryRejected`: Vai trò không phải ADMIN upload CATEGORY bị chặn 403.
9. `testCloudinaryNotConfiguredThrows503`: Khi chưa cấu hình credential, trả 503 `CLOUDINARY_NOT_CONFIGURED` rõ ràng.
10. `testDeleteAssetForbiddenForNonOwner`: Người dùng này không thể xóa ảnh của người dùng khác (403 `ASSET_FORBIDDEN`).
11. `testDeleteAssetAllowedForOwner`: Chủ tài nguyên xóa thành công, dọn dẹp cả Cloudinary và database.
12. `testGetSignedUrlForbiddenForNonOwner`: Người ngoài không lấy được link xem chứng chỉ KYC riêng tư.
13. `testGetSignedUrlAllowedForAdmin`: Quản trị viên lấy được signed URL để thẩm định KYC.
14. `isConfiguredReturnsFalseWhenNull` & `isConfiguredReturnsTrueWhenCloudinaryBeanPresent`: Kiểm tra trạng thái nạp bean cấu hình.
15. `resolveFolderAssignsCorrectWhitelistFolders`: Kiểm tra phân chia folder theo nghiệp vụ.
16. `testRegisterWithCertificateLinksAsset`: Đăng ký thành công liên kết ảnh vào ID tài khoản mới tạo.
17. `testProfileUpdateDeletesOldCloudinaryImageOnReplacement`: Cập nhật ảnh chứng chỉ mới thành công tự động kích hoạt dọn ảnh cũ trên Cloudinary.

### 3.3. Kiểm thử Typecheck & Build Frontend
- `npx tsc --noEmit`: **0 lỗi Type** (Exit code 0).
- `npm run build`:
```text
✓ Compiled successfully in 6.6s
✓ Generating static pages using 11 workers (31/31) in 877ms
Finalizing page optimization ...
Exit code 0
```

---

## 4. Hướng dẫn các bước kiểm thử thực tế cho bạn

### Bước 1: Cấu hình biến môi trường Cloudinary
Lấy thông tin từ [Cloudinary Console](https://console.cloudinary.com/pm):
- Cấu hình trong IntelliJ IDEA (**Run** -> **Edit Configurations** -> **Environment variables**):
  ```text
  CLOUDINARY_CLOUD_NAME=ten_cloud_cua_ban;CLOUDINARY_API_KEY=api_key_cua_ban;CLOUDINARY_API_SECRET=api_secret_cua_ban
  ```
- Hoặc cấu hình trong PowerShell trước khi chạy:
  ```powershell
  $env:CLOUDINARY_CLOUD_NAME="ten_cloud"
  $env:CLOUDINARY_API_KEY="api_key"
  $env:CLOUDINARY_API_SECRET="api_secret"
  ```

### Bước 2: Khởi động Backend và Frontend
- Terminal 1 (Backend):
  ```powershell
  cd d:\BTL_WWWJava\WebBanRauXanh\backend
  ./gradlew bootRun
  ```
  *(Flyway tự động chạy migration V4 tạo bảng `uploaded_assets`)*.
- Terminal 2 (Frontend):
  ```powershell
  cd d:\BTL_WWWJava\WebBanRauXanh\frontend
  npm run dev
  ```

### Bước 3: Thử nghiệm chức năng trên Website
1. **Kiểm tra khi chưa có cấu hình Cloudinary (hoặc cấu hình sai)**:
   - Thử bấm chọn file ảnh và tải lên: Hệ thống hiện thông báo lỗi màu đỏ gọn gàng: *"Dịch vụ tải ảnh Cloudinary chưa được cấu hình trên máy chủ..."* và cho phép bấm *"Thử lại"*.
2. **Kiểm tra khi đã cấu hình Cloudinary**:
   - Truy cập `http://localhost:3000/dang-nhap` ➔ tab **Đăng ký B2B** ➔ chọn vai trò **Nông dân / Hợp tác xã**.
   - Tại mục chứng chỉ: Nhấp **📁 Chọn ảnh** và chọn 1 ảnh `.jpg`, `.png` hoặc `.webp` (< 5MB) từ máy tính.
   - Quan sát: Trạng thái hiển thị *"Đang tải lên Cloudinary..."*, sau đó lập tức hiển thị ảnh thu nhỏ preview và dòng chữ xanh *"✅ Đã tải ảnh lên"*.
   - Hoàn tất điền form và bấm **Đăng ký**.
3. **Kiểm tra Cập nhật Hồ sơ trong Portal**:
   - Đăng nhập tài khoản Nông dân vừa tạo ➔ vào **Portal Nông Trại** (`/portal/farmer`).
   - Nhấn **Cập nhật hồ sơ**: Ô ảnh chứng nhận hiển thị component tải ảnh.
   - Bấm **Đổi ảnh** và chọn một ảnh khác từ máy.
   - Bấm **Xác nhận**: Ảnh mới được lưu, ảnh cũ được dọn dẹp trên Cloudinary.
   - Nhấn **F5** tải lại trang: Hồ sơ vẫn duy trì ảnh chứng chỉ mới chính xác.
4. **Kiểm tra Thêm ngành hàng / Lô nông sản trong Admin**:
   - Đăng nhập tài khoản Quản trị viên (`/admin`) ➔ tab **Nguồn cung & danh mục**.
   - Bấm **Thêm ngành hàng**: Chọn ảnh từ máy và lưu danh mục.
   - Danh mục hiển thị ảnh vừa tải lên một cách hoàn hảo.

---

## 5. Xác nhận tuân thủ ràng buộc phạm vi

1. **Giao diện**: Giữ nguyên 100% layout, bố cục trang, bảng màu, font chữ, kích thước các khối, navigation và thứ tự trường của form. Chỉ thay đổi đúng cơ chế nhập tại ô ảnh.
2. **Kiến trúc & Nghiệp vụ**: Không can thiệp hay sửa đổi logic đăng nhập, đăng ký, OTP, thanh toán, hợp đồng, IoT, AI Gemini, hay CSRF.
3. **Database**: Không xóa dữ liệu cũ, không đổi migration cũ, các URL ảnh cũ vẫn hiển thị bình thường.
4. **Dependencies**: Chỉ thêm duy nhất dependency Cloudinary `com.cloudinary:cloudinary-http5:2.5.0`, không nâng cấp Java hay bất kỳ package nào khác.
