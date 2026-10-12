# 🛡️ Spring Security với Spring Boot + PostgreSQL (Gradle, IntelliJ)

Ứng dụng **Quản lý sản phẩm** bám sát theo **Chương 7 (Spring Web on Servlet Stack)** và **Chương 8 (Spring Security)** của đề cương học phần **Lập trình WWW (Java)**.

---

## 🚀 Tính Năng Bảo Mật & Kỹ Thuật

1. **Khách vãng lai**: Xem danh sách công khai, trang đăng nhập/đăng ký (`permitAll()`).
2. **Đăng ký tài khoản**: Mật khẩu mã hoá an toàn bằng `BCryptPasswordEncoder(10)`.
3. **Đăng nhập Form Login**: Tích hợp `CustomUserDetailsService` nạp tài khoản từ cơ sở dữ liệu **PostgreSQL**.
4. **Phân quyền vai trò**:
   - `ROLE_USER`: Chỉ được xem danh sách và chi tiết sản phẩm.
   - `ROLE_ADMIN`: Toàn quyền Thêm, Sửa, Xoá sản phẩm và Quản lý / Khoá tài khoản người dùng (`@PreAuthorize`, `hasRole('ADMIN')`).
5. **Ẩn / Hiện nút giao diện**: Sử dụng Thymeleaf Security Tag `sec:authorize="hasRole('ADMIN')"`.
6. **Khoá tài khoản**: Tài khoản bị khoá (`enabled = false`) không thể đăng nhập, hiển thị thông báo lỗi riêng (`DisabledException` → `/login?error=disabled`).
7. **Ghi nhớ đăng nhập (Remember-me 7 ngày)**: Lưu token vào PostgreSQL trong bảng `persistent_logins` (`JdbcTokenRepositoryImpl`).
8. **Kiểm soát phiên (Concurrent Sessions)**: Mỗi tài khoản chỉ được phép 1 phiên đăng nhập đồng thời (`maximumSessions(1)`).
9. **Chống tấn công CSRF & Đăng xuất an toàn**: CSRF Token mặc định cho mọi request POST/PUT/DELETE, logout qua method `POST`.
10. **Trang 403 thân thiện**: Chuyển hướng về `/403` khi truy cập trái quyền (`accessDeniedPage("/403")`).
11. **REST API `/api/**`**: Bảo vệ bằng Security Filter Chain thứ hai với **HTTP Basic Authentication** và `STATELESS`.

---

## 🛠️ Hướng Dẫn Cài Đặt & Chạy

### 1. Khởi động PostgreSQL qua Docker
Tại thư mục gốc:
```powershell
docker compose up -d postgres
```
- **PostgreSQL**: `localhost:5432` (DB: `security_demo`, User: `postgres`, Password: `password123`)
- **pgAdmin 4**: [http://localhost:5050](http://localhost:5050) (User: `admin@example.com`, Pass: `admin`)

---

### 2. Khởi chạy Ứng dụng Spring Boot
Tại thư mục `backend`:
```powershell
cd backend
.\gradlew.bat bootRun
```
Ứng dụng sẽ tự động tạo bảng và nạp dữ liệu mẫu (Roles, Users, Products, Persistent Logins).

---

### 👤 Tài Khoản Mẫu Để Kiểm Thử

| Username | Password | Vai trò | Trạng thái | Quyền hạn |
|---|---|---|---|---|
| `admin` | `admin123` | `ROLE_ADMIN`, `ROLE_USER` | Đang hoạt động | Toàn quyền thêm/sửa/xoá, khoá tài khoản |
| `user` | `user123` | `ROLE_USER` | Đang hoạt động | Chỉ xem sản phẩm |
| `locked` | `user123` | `ROLE_USER` | **Bị khoá** | Bị từ chối khi đăng nhập |

---

### 🌐 Kiểm Thử REST API (HTTP Basic)
```powershell
# 1. Chưa xác thực -> 401 Unauthorized
curl.exe -i http://localhost:8080/api/products

# 2. Đăng nhập với quyền USER -> 200 OK
curl.exe -i -u user:user123 http://localhost:8080/api/products

# 3. Lấy thông tin user hiện tại
curl.exe -i -u user:user123 http://localhost:8080/api/me

# 4. USER cố tình xoá sản phẩm -> 403 Forbidden
curl.exe -i -u user:user123 -X DELETE http://localhost:8080/api/products/1

# 5. ADMIN tạo sản phẩm mới -> 201 Created
curl.exe -i -u admin:admin123 -H "Content-Type: application/json" -d "{\"name\":\"Tai nghe Sony\",\"price\":500000,\"description\":\"Bluetooth\"}" http://localhost:8080/api/products
```
