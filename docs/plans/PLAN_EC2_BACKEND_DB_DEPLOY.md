# KẾ HOẠCH CHUẨN HÓA BACKEND & DATABASE ĐỂ DEPLOY LÊN AWS EC2

---

## A. Overview

- **Tên chức năng:** Chuẩn hóa cấu trúc, cấu hình và đóng gói Docker cho **Backend (Spring Boot)** + **Database (PostgreSQL pgvector + Redis)** để deploy ổn định, bảo mật lên **AWS EC2**.
- **Mục tiêu:**
  - Tách biệt hoàn toàn cấu hình **Dev local** và **Production EC2** (`SPRING_PROFILES_ACTIVE=prod`).
  - Đóng gói Backend bằng **Dockerfile multi-stage** (Java 21, tối ưu dung lượng image và RAM cho EC2 `t2.micro` / `t3.small` / `t3.medium`).
  - Chuẩn hóa **Docker Compose Production** (`docker-compose.prod.yml`) gồm `postgres` (`pgvector:pg16`), `redis` (có mật khẩu), `backend` (chờ DB/Redis healthy mới khởi động, `restart: unless-stopped`).
  - Loại bỏ phụ thuộc hardcode `localhost` ở production, hỗ trợ Reverse Proxy (Nginx/HTTPS) cho REST API và STOMP WebSocket.
- **Phạm vi:** Thư mục `backend/` và các file Docker/Env ở thư mục gốc dự án (giữ nguyên `docker-compose.yml` dev hiện tại để không ảnh hưởng môi trường chạy local).

---

## B. Current Architecture

- **Backend:** Java 21, Spring Boot `3.3.4`, Gradle (`backend/build.gradle`), port `8080`, context-path `/api/v1`.
- **Database & Cache:** `pgvector/pgvector:pg16`, `redis:alpine` (hiện nằm trong `docker-compose.yml` dùng cho dev local).
- **Những điểm chưa sẵn sàng cho EC2:**
  - Chưa có `backend/Dockerfile` và `backend/.dockerignore`.
  - Chưa có `docker-compose.prod.yml` để chạy đồng bộ Backend + PostgreSQL + Redis trên EC2.
  - Chưa có `application-prod.properties` (`server.forward-headers-strategy=framework` cho Nginx/HTTPS, tối ưu HikariCP, tắt log SQL thừa).
  - Chưa có `.env.prod.example` tổng hợp đầy đủ biến môi trường production.

---

## C. Implementation Scope

### 1. Docker & Deployment Files (Tạo mới tại root & `backend/`)
- `backend/Dockerfile`:
  - **Stage 1 (Build):** `eclipse-temurin:21-jdk-alpine`, copy `gradlew`, `gradle/`, `build.gradle`, `settings.gradle`, tải dependencies trước (tận dụng Docker layer cache), rồi copy `src/` và chạy `./gradlew bootJar --no-daemon`.
  - **Stage 2 (Runtime):** `eclipse-temurin:21-jre-alpine`, chạy dưới non-root user (`spring`), copy file `.jar`, cấu hình `JAVA_TOOL_OPTIONS` linh hoạt theo RAM EC2.
- `backend/.dockerignore`: Loại trừ `build/`, `.gradle/`, `.git/`, `*.log`, `*.md` để tăng tốc build Docker trên EC2.
- `docker-compose.prod.yml`:
  - `postgres`: `pgvector/pgvector:pg16`, volume bền vững `pg_prod_data`, `healthcheck` bằng `pg_isready`, **không mở port `5432` ra internet** (chỉ giao tiếp nội bộ Docker network để bảo mật).
  - `redis`: `redis:alpine` kèm `--requirepass`, volume `redis_prod_data`, `healthcheck` bằng `redis-cli ping`, chỉ mở nội bộ Docker network.
  - `backend`: Build từ `./backend`, `depends_on` `postgres` & `redis` (`condition: service_healthy`), nhận toàn bộ biến từ `.env.prod`, mở port `8080:8080`, `healthcheck` kiểm tra `/api/v1/products` hoặc `/api/v1/auth/me`.
- `.env.prod.example`: Mẫu toàn bộ biến môi trường cần điền trên EC2 (DB, Redis, JWT Secret mạnh, CORS origins, Gemini, Mail, Cloudinary, SePay, IoT Key).

### 2. Backend Configuration (`backend/src/main/resources/`)
- Tạo `application-prod.properties`:
  - `server.forward-headers-strategy=framework` (đảm bảo hoạt động đúng sau Nginx / AWS ALB HTTPS).
  - Tắt `spring.jpa.show-sql=false`, `spring.jpa.properties.hibernate.format_sql=false`.
  - Cấu hình `spring.datasource.hikari.maximum-pool-size=10`, `minimum-idle=2` (tối ưu cho EC2 cấu hình vừa/nhỏ).
  - Cho phép bật/tắt Swagger qua biến môi trường (`SPRINGDOC_ENABLED=${SWAGGER_ENABLED:false}` ở prod).
- Rà soát `application.properties`: Giữ tương thích 100% cho môi trường dev hiện tại, đảm bảo mọi tham số quan trọng đều override được qua biến môi trường.

### 3. Tài liệu hướng dẫn Deploy EC2
- Tạo `docs/DEPLOY_EC2.md`: Hướng dẫn từng bước từ lúc SSH vào EC2 Ubuntu/Amazon Linux, cài Docker & Docker Compose, cấu hình `.env.prod`, mở Security Group, khởi chạy hệ thống, xem log và cấu hình Nginx HTTPS (nếu cần).

### 4. Frontend & Database Schema
- **Frontend:** Không thay đổi code (chỉ lưu ý trỏ biến `BACKEND_API_URL=http://<EC2_IP_OR_DOMAIN>:8080/api/v1` khi deploy Frontend).
- **Database Schema:** Không thay đổi bảng hay migration Flyway hiện tại.

---

## D. API Contract

- Không thay đổi bất kỳ REST Endpoint hay DTO nào của Backend.
- Đường dẫn gốc API vẫn là `http://<EC2_IP>:8080/api/v1` (hoặc `https://<DOMAIN>/api/v1` nếu qua Nginx).

---

## E. Business Flow

- Khi chạy trên EC2 bằng `docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --build`:
  1. `postgres` (`pgvector:pg16`) và `redis` khởi động trước và báo `healthy`.
  2. `backend` khởi động với profile `prod`, Flyway tự động migrate schema Database, Hibernate đồng bộ, mở cổng `8080` phục vụ cả REST API lẫn STOMP WebSocket (`/api/v1/ws-b2b`).

---

## F. Implementation Steps

1. **Bước 1:** Tạo `backend/.dockerignore` và `backend/Dockerfile` (multi-stage Java 21).
2. **Bước 2:** Tạo `backend/src/main/resources/application-prod.properties` tối ưu cho EC2 Production.
3. **Bước 3:** Tạo `docker-compose.prod.yml` và `.env.prod.example` ở thư mục gốc.
4. **Bước 4:** Viết hướng dẫn deploy chi tiết `docs/DEPLOY_EC2.md`.
5. **Bước 5:** Kiểm tra tĩnh toàn bộ cấu hình (biến môi trường khớp 100% giữa `.env.prod.example`, `docker-compose.prod.yml` và `application.properties`).

---

## G. Risks & Considerations

- **RAM trên EC2 Free Tier (`t2.micro` 1 GB RAM):** Nếu dùng EC2 1 GB RAM, cần tạo thêm Swap 2 GB trên EC2 khi build Docker Gradle và đặt `JAVA_TOOL_OPTIONS=-Xmx512m -Xms256m` trong `.env.prod`.
- **Bảo mật Database:** Không map port `5432` và `6379` ra `0.0.0.0` trong `docker-compose.prod.yml` để tránh bị quét tấn công PostgreSQL/Redis từ internet.
- **Không làm hỏng Dev Local:** Giữ nguyên `docker-compose.yml` và `application.properties` hiện tại để chạy local không bị ảnh hưởng.

---

## H. Acceptance Criteria

1. Có đầy đủ `backend/Dockerfile`, `backend/.dockerignore`, `docker-compose.prod.yml`, `application-prod.properties`, `.env.prod.example` và `docs/DEPLOY_EC2.md`.
2. Mọi biến môi trường giữa `docker-compose.prod.yml`, `.env.prod.example` và `application.properties` / `application-prod.properties` khớp tên 100%, không thiếu biến bắt buộc.
3. Sẵn sàng copy lên EC2 và chạy bằng một lệnh `docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --build`.
