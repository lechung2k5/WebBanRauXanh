-- Script tạo Database và bảng cho Spring Security Demo (PostgreSQL)
-- Database name: security_demo

-- Bảng roles
CREATE TABLE IF NOT EXISTS roles (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,
    description VARCHAR(255)
);

-- Bảng users
CREATE TABLE IF NOT EXISTS users (
    id BIGSERIAL PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    password VARCHAR(100) NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Bảng users_roles (quan hệ nhiều - nhiều)
CREATE TABLE IF NOT EXISTS users_roles (
    user_id BIGINT NOT NULL,
    role_id BIGINT NOT NULL,
    PRIMARY KEY (user_id, role_id),
    CONSTRAINT fk_ur_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
    CONSTRAINT fk_ur_role FOREIGN KEY (role_id) REFERENCES roles (id) ON DELETE CASCADE
);

-- Bảng persistent_logins (chuẩn của Spring Security JdbcTokenRepositoryImpl)
CREATE TABLE IF NOT EXISTS persistent_logins (
    username VARCHAR(64) NOT NULL,
    series VARCHAR(64) NOT NULL PRIMARY KEY,
    token VARCHAR(64) NOT NULL,
    last_used TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Bảng products (dữ liệu nghiệp vụ)
CREATE TABLE IF NOT EXISTS products (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    price NUMERIC(15,2) NOT NULL CHECK (price >= 0),
    description VARCHAR(500)
);

-- Dữ liệu mẫu (Seed Data)
INSERT INTO roles (id, name, description) VALUES
(1, 'ROLE_ADMIN', 'Quản trị viên: toàn quyền'),
(2, 'ROLE_USER', 'Người dùng: chỉ xem sản phẩm')
ON CONFLICT (id) DO NOTHING;

-- Mật khẩu mặc định:
-- admin: admin123 ($2a$10$dJ5THFov4.eZ4fcZJ7bj6umrj0noyVNma0HAnW3foj/z2L7wquADG)
-- user: user123 ($2a$10$hzZblI5ZDZ8GNZu8SKE3me3/3eZe2.6C209Rarx4Ojw8HiGjrXQyC)
-- locked: user123 (enabled = false)
INSERT INTO users (id, username, password, full_name, email, enabled) VALUES
(1, 'admin', '$2a$10$dJ5THFov4.eZ4fcZJ7bj6umrj0noyVNma0HAnW3foj/z2L7wquADG', 'Quản Trị Viên', 'admin@example.com', TRUE),
(2, 'user', '$2a$10$hzZblI5ZDZ8GNZu8SKE3me3/3eZe2.6C209Rarx4Ojw8HiGjrXQyC', 'Nguyễn Văn A', 'user@example.com', TRUE),
(3, 'locked', '$2a$10$hzZblI5ZDZ8GNZu8SKE3me3/3eZe2.6C209Rarx4Ojw8HiGjrXQyC', 'Tài Khoản Khoá', 'locked@example.com', FALSE)
ON CONFLICT (id) DO NOTHING;

INSERT INTO users_roles (user_id, role_id) VALUES 
(1, 1), 
(1, 2), 
(2, 2), 
(3, 2)
ON CONFLICT (user_id, role_id) DO NOTHING;

INSERT INTO products (name, price, description) VALUES
('Rau Xà Lách Mỡ Đà Lạt', 25000, 'Xà lách mỡ canh tác thủy canh chuẩn VietGAP'),
('Cải Bó Xôi Hữu Cơ (Spinach)', 35000, 'Cải bó xôi giàu sắt và vitamin, chuẩn Organic'),
('Cà Chua Cherry Đỏ Đà Lạt', 45000, 'Cà chua bi ngọt thanh, mọng nước'),
('Cà Rốt Hữu Cơ Tươi', 28000, 'Cà rốt Đà Lạt giòn ngọt, giàu Beta-carotene'),
('Nấm Đùi Gà Tươi Thượng Hạng', 48000, 'Nấm đùi gà thân mập, giàu đạm thực vật'),
('Laptop Dell Inspiron 15', 15990000, 'Core i5, RAM 16GB, SSD 512GB'),
('Chuột không dây Logitech M331', 350000, 'Chuột quang không dây Silent Plus giảm 90% tiếng ồn'),
('Bàn phím cơ Akko 3087', 1290000, 'Switch Akko CS Jelly Pink'),
('Màn hình LG 24MP60G', 2890000, '24 inch IPS, 75Hz');
