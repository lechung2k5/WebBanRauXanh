# 📧 HƯỚNG DẪN CẤU HÌNH GMAIL SMTP & KIỂM THỬ XÁC THỰC EMAIL OTP

Tài liệu này tổng hợp chi tiết các file đã sửa đổi, cơ chế bảo mật và quy trình từng bước kiểm thử luồng **Đăng ký tài khoản → Nhận mã OTP qua Gmail → Xác thực email & Kích hoạt tài khoản** trên hệ thống **HoNa Fresh (WebBanRauXanh)**.

---

## 1. Danh Sách Các File Đã Chỉnh Sửa

| STT | Đường dẫn File | Nội dung thay đổi |
|---|---|---|
| 1 | `backend/src/main/resources/application.properties` | Ghi trực tiếp cấu hình SMTP Gmail (không sử dụng biến môi trường), bổ sung `mail.smtp.starttls.required=true`, thiết lập timeout 5000ms. |
| 2 | `backend/src/main/java/com/btl/webbanrau/service/MailService.java` | Xóa log in mã OTP plain-text ra console; loại bỏ cơ chế nuốt lỗi fallback; ném lỗi `AuthException(503)` rõ ràng khi SMTP thất bại. |
| 3 | `frontend/src/components/AuthForm.tsx` | Cập nhật thông báo hướng dẫn người dùng kiểm tra Hộp thư đến (Inbox) hoặc Thư rác (Spam) thay cho hướng dẫn xem Terminal cũ. |

---

## 2. Chi Tiết Thay Đổi Trong Từng File

### 2.1. File `application.properties`
- **Vị trí**: `backend/src/main/resources/application.properties` (Dòng 44–55)
- **Nội dung cấu hình trực tiếp**:
```properties
# JavaMailSender / Gmail SMTP
spring.mail.host=smtp.gmail.com
spring.mail.port=587
spring.mail.username=honafresh@gmail.com
spring.mail.password=Nohafresh@123
spring.mail.properties.mail.smtp.auth=true
spring.mail.properties.mail.smtp.starttls.enable=true
spring.mail.properties.mail.smtp.starttls.required=true
spring.mail.properties.mail.smtp.connectiontimeout=5000
spring.mail.properties.mail.smtp.timeout=5000
spring.mail.properties.mail.smtp.writetimeout=5000
app.mail.from=honafresh@gmail.com
```

### 2.2. File `MailService.java`
- **Vị trí**: `backend/src/main/java/com/btl/webbanrau/service/MailService.java`
- **Các điểm cải tiến bảo mật & xử lý lỗi**:
  1. **Bảo mật tuyệt đối**: Đã xóa khối log in mã OTP ra console:
     ```java
     // ĐÃ XÓA: log.info("  Mã OTP 6 số: >>> {} <<<", code);
     // THAY BẰNG:
     log.info("Preparing OTP email for [{}]", email);
     ```
  2. **Không nuốt lỗi SMTP**: Khi gửi mail thất bại (sai mật khẩu ứng dụng, mạng ngắt kết nối, Google chặn...), hệ thống sẽ quăng lỗi 503 ngay lập tức, không để người dùng lầm tưởng mã đã gửi thành công:
     ```java
     } catch (Exception ex) {
         log.error("Failed to send email to [{}]: {}", email, ex.getMessage());
         throw new AuthException(503, "MAIL_UNAVAILABLE", 
             "Không thể gửi email xác thực qua Gmail SMTP. Vui lòng kiểm tra cấu hình mạng hoặc mật khẩu ứng dụng Gmail.");
     }
     ```

### 2.3. File `AuthForm.tsx`
- **Vị trí**: `frontend/src/components/AuthForm.tsx` (Dòng 383–391)
- **Cập nhật giao diện thông báo**:
```tsx
<div className="mt-2.5 p-2.5 bg-amber-50/80 border border-amber-200/80 rounded-xl text-amber-800 text-xs text-left">
  <p className="font-semibold flex items-center gap-1.5">
    <span>💡</span> <span>Lưu ý kiểm tra hộp thư:</span>
  </p>
  <p className="mt-0.5 text-gray-600">
    Vui lòng kiểm tra <strong>Hộp thư đến (Inbox)</strong> hoặc thư mục <strong>Thư rác (Spam)</strong> trong email của bạn để nhận mã xác thực OTP 6 số.
  </p>
</div>
```

---

## 3. Cơ Chế Nghiệp Vụ & An Toàn Của Mã OTP

Hệ thống tuân thủ nghiêm ngặt các tiêu chuẩn an toàn bảo mật trong `OtpService.java` và `AuthService.java`:
1. **Độ dài mã**: Đúng 6 chữ số ngẫu nhiên sinh bởi `SecureRandom` (`000000` đến `999999`).
2. **Thời hạn hiệu lực**: Hết hạn chính xác sau **5 phút** (`Instant.now().plusSeconds(300)`).
3. **Giới hạn số lần thử**: Cho phép tối đa **5 lần** nhập sai. Nếu vượt quá 5 lần, mã bị khóa (`used = true`) và không thể tái sử dụng.
4. **Chống Spam (Cooldown)**: Bắt buộc chờ **60 giây** trước khi yêu cầu gửi lại mã mới (`HTTP 429 OTP_COOLDOWN`).
5. **Lưu trữ mã an toàn**: Mã OTP gốc **KHÔNG BAO GIỜ** được lưu dưới dạng plain text vào cơ sở dữ liệu; hệ thống sử dụng thuật toán băm BCrypt (`encoder.encode(code)`) trong bảng `email_otp_verifications`.
6. **Kích hoạt tài khoản & Quy trình KYC**:
   - Khi nhập đúng OTP, hệ thống cập nhật `emailVerified = true`.
   - Giữ nguyên quy trình xét duyệt hồ sơ B2B: Tài khoản đối tác nông dân/thương lái sau khi xác thực email vẫn có `kycStatus = "PENDING"` và chờ Quản trị viên duyệt hồ sơ trước khi ký quỹ và xuất bán lô nông sản.

---

## 4. ⚠️ Lưu Ý Quan Trọng Về Mật Khẩu Ứng Dụng Gmail

- Mật khẩu mẫu hiện tại trong file là `Nohafresh@123`.
- **Thực tế Google SMTP**: Google yêu cầu **Mật khẩu ứng dụng (App Password) gồm 16 ký tự** (ví dụ: `abcd efgh ijkl mnop`), được tạo khi tài khoản Gmail đã kích hoạt **Xác minh 2 bước (2-Step Verification)**.
- **Nếu cần thay bằng tài khoản Gmail thật**:
  1. Mở file `backend/src/main/resources/application.properties`.
  2. Tìm dòng 47 và 48:
     ```properties
     spring.mail.username=dia_chi_gmail_that_cua_ban@gmail.com
     spring.mail.password=mat_khau_ung_dung_16_ky_tu
     ```
  3. Cập nhật dòng 55 cho đồng bộ:
     ```properties
     app.mail.from=dia_chi_gmail_that_cua_ban@gmail.com
     ```
  4. Lưu file và khởi động lại Backend.

---

## 5. Hướng Dẫn Từng Bước Kiểm Thử (Test Flow)

### Bước 1: Khởi động Backend trên IntelliJ IDEA
1. Mở dự án trong IntelliJ IDEA.
2. Tại thanh công cụ **Gradle** bên phải, nhấn nút **Reload All Gradle Projects** (biểu tượng hai mũi tên xoay tròn).
3. Tìm đến file:
   `backend/src/main/java/com/btl/webbanrau/WebBanRauApplication.java`
4. Chuột phải chọn **Run 'WebBanRauApplication'** (hoặc tổ hợp phím `Shift + F10`).
5. Quan sát console:
   - Backend khởi động tại cổng `8080` (Context path: `/api/v1`).
   - Kiểm tra log: Tuyệt đối không xuất hiện mật khẩu ứng dụng Gmail hay mã OTP plain-text.

### Bước 2: Khởi động Frontend
1. Mở Terminal mới tại thư mục `frontend`:
   ```bash
   cd frontend
   npm run dev
   ```
2. Mở trình duyệt truy cập: `http://localhost:3000/dang-ky`.

### Bước 3: Đăng ký tài khoản B2B mới
1. Chọn loại hình đối tác: **Nông dân / Hợp tác xã** hoặc **Thương lái / Mua sỉ**.
2. Điền các trường thông tin bắt buộc:
   - Họ và tên người đại diện: `Nguyễn Văn Thử Nghiệm`
   - Tên đăng nhập: `test_user_01` (chữ thường, số, không dấu)
   - **Email nhận mã**: Nhập **địa chỉ Gmail thật mà bạn có thể mở kiểm tra ngay** (Ví dụ: `your_personal_email@gmail.com`).
   - Số điện thoại: `0912345678`
   - Địa chỉ: `Đà Lạt, Lâm Đồng`
   - Mật khẩu: `MatKhau@12345` (tối thiểu 10 ký tự)
   - Tên nông trại / doanh nghiệp: `Nông Trại Rau Xanh Test`
   - Đánh dấu cam kết quy chế.
3. Nhấn **Đăng ký & Nhận mã OTP**.

### Bước 4: Kiểm tra kết quả phản hồi
- **Trường hợp A (SMTP kết nối gửi thành công)**:
  - Frontend chuyển sang màn hình nhập 6 ô OTP.
  - Bộ đếm thời gian bắt đầu lùi từ `05:00`.
  - Nút "Gửi lại mã OTP" hiển thị thời gian chờ đếm ngược 60 giây.
  - Mở Gmail của bạn, kiểm tra **Hộp thư đến** (hoặc mục **Thư rác/Spam**): Tìm email có tiêu đề `HoNa Fresh — Mã xác thực tài khoản B2B`.
- **Trường hợp B (Thông tin SMTP chưa hợp lệ hoặc Google từ chối xác thực)**:
  - Hệ thống hiển thị thông báo lỗi màu đỏ rõ ràng trên màn hình:
    *"Không thể gửi email xác thực qua Gmail SMTP. Vui lòng kiểm tra cấu hình mạng hoặc mật khẩu ứng dụng Gmail."*
  - Hệ thống không tạo trạng thái đã gửi mã giả lập.

### Bước 5: Xác nhận mã OTP & Kích hoạt tài khoản
1. Nhập mã 6 chữ số nhận được trong email vào 6 ô OTP trên giao diện.
2. Nhấn **Xác nhận & Kích hoạt**.
3. Sau khi xác nhận hợp lệ:
   - Tài khoản được đánh dấu `emailVerified = true`.
   - Hệ thống tự động cấp Access Token và Refresh Token.
   - Trình duyệt điều hướng thẳng vào trang Portal đối tác (`/portal/farmer` hoặc `/portal/buyer`).

### Bước 6: Kiểm thử các kịch bản ngoại lệ (Edge Cases)
1. **Kiểm thử Cooldown gửi lại**:
   - Nhấn nút "Gửi lại mã OTP" khi chưa hết 60 giây -> Nút bị vô hiệu hóa kèm thời gian đếm ngược.
2. **Kiểm thử nhập sai mã**:
   - Nhập một mã 6 số sai (ví dụ `000000`) -> Hệ thống báo lỗi: *"Mã không đúng. Còn 4 lần thử."*
   - Cố tình nhập sai quá 5 lần -> Mã bị khóa hoàn toàn.
3. **Kiểm thử mã hết hạn**:
   - Chờ quá 5 phút mới xác nhận -> Hệ thống từ chối xác thực và yêu cầu gửi mã mới.
