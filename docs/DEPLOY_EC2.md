# HƯỚNG DẪN DEPLOY BACKEND & DATABASE HONA FRESH LÊN AWS EC2

Tài liệu này hướng dẫn deploy đồng bộ **PostgreSQL (pgvector:pg16) + Redis + Spring Boot Backend** lên **AWS EC2 (Ubuntu 22.04 / 24.04 LTS)** bằng `docker-compose.prod.yml`.

---

## 1. Yêu cầu EC2 & Security Group

- **Cấu hình khuyên dùng:** `t3.small` (2 vCPU, 2 GB RAM) hoặc `t2.micro` (1 GB RAM — cần tạo thêm Swap 2 GB).
- **Ổ cứng (EBS):** Tối thiểu `20 GB` (gp3).
- **Inbound Rules (Security Group):**
  - `22` (SSH): Chỉ mở từ IP của bạn.
  - `8080` (Backend API & WebSocket): Mở tạm để test, hoặc mở `80` / `443` nếu dùng Nginx Reverse Proxy + SSL (khuyên dùng).
  - **Không mở** port `5432` (PostgreSQL) và `6379` (Redis) ra Internet.

---

## 2. Cài đặt Docker & Tạo Swap (Trên EC2 Ubuntu)

SSH vào EC2 và chạy:

```bash
# Cập nhật hệ thống & cài Docker
sudo apt update && sudo apt upgrade -y
sudo apt install -y docker.io docker-compose-v2 git
sudo systemctl enable --now docker
sudo usermod -aG docker $USER
newgrp docker

# (Bắt buộc nếu dùng t2.micro 1GB RAM) Tạo Swap 2GB để Gradle build không bị tràn RAM
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

---

## 3. Tải mã nguồn & Cấu hình `.env.prod`

```bash
git clone <URL_REPO_CUA_BAN> honafresh
cd honafresh

cp .env.prod.example .env.prod
nano .env.prod
```

Điền đầy đủ các thông tin thật trong `.env.prod`:
- `POSTGRES_PASSWORD`, `REDIS_PASSWORD`, `JWT_SECRET` (tối thiểu 32 ký tự).
- `APP_CORS_ALLOWED_ORIGINS`: Thêm URL Frontend (VD: `https://honafresh.vercel.app,http://<EC2_PUBLIC_IP>:3000,capacitor://localhost`).
- `GEMINI_API_KEY`, `CLOUDINARY_*`, `MAIL_*`, `SEPAY_*`, `IOT_INGEST_KEY`.

---

## 4. Khởi chạy Backend + Database + Redis

```bash
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --build
```

Kiểm tra trạng thái các container và log Backend:

```bash
docker compose -f docker-compose.prod.yml ps
docker compose -f docker-compose.prod.yml logs -f backend
```

Khi thấy log `Started WebBanRauApplication` và kiểm tra API:

```bash
curl http://localhost:8080/api/v1/categories
```

---

## 5. Kết nối Frontend (Vercel hoặc máy khác) tới Backend EC2

- Cấu hình biến môi trường cho Frontend:
  ```env
  BACKEND_API_URL=http://<EC2_PUBLIC_IP>:8080/api/v1
  NEXT_PUBLIC_WS_URL=http://<EC2_PUBLIC_IP>:8080/api/v1/ws-b2b
  ```
- Nếu dùng HTTPS (khuyên dùng **Nginx + Certbot** trỏ domain về EC2):
  - Proxy `/` → `http://127.0.0.1:8080`
  - Bật `proxy_http_version 1.1`, `Upgrade $http_upgrade`, `Connection "upgrade"` để **WebSocket STOMP** hoạt động mượt qua `https://`.

---

## 6. Các lệnh quản trị thường dùng trên EC2

```bash
# Cập nhật code mới và rebuild lại chỉ riêng Backend (không mất dữ liệu DB)
git pull
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --build backend

# Backup Database PostgreSQL ra file .sql
docker exec honafresh_postgres_prod pg_dump -U postgres webbanrau_db > backup_$(date +%F).sql
```
