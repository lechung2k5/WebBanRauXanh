-- Bổ sung thông tin đăng nhập (username, email, password_hash) và liên kết user_id cho nhân viên & tài xế kho
ALTER TABLE fleet_drivers
    ADD COLUMN IF NOT EXISTS username VARCHAR(80),
    ADD COLUMN IF NOT EXISTS email VARCHAR(150),
    ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255),
    ADD COLUMN IF NOT EXISTS user_id BIGINT REFERENCES users(id) ON DELETE SET NULL;

-- Liên kết tài khoản mặc định đã seed (nếu tồn tại)
UPDATE fleet_drivers fd
SET username = u.username,
    email = u.email,
    password_hash = u.password,
    user_id = u.id
FROM users u
WHERE fd.driver_code = 'DRV-DT-01'
  AND u.username = 'driver_tms'
  AND fd.username IS NULL;

UPDATE fleet_drivers fd
SET username = u.username,
    email = u.email,
    password_hash = u.password,
    user_id = u.id
FROM users u
WHERE fd.driver_code = 'KTV-DT-01'
  AND u.username = 'qc_tram1'
  AND fd.username IS NULL;

-- Backfill các bản ghi còn lại chưa có thông tin đăng nhập (BCrypt hash mặc định cho Staff@123456)
UPDATE fleet_drivers
SET username = LOWER(REPLACE(driver_code, '-', '_'))
WHERE username IS NULL OR BTRIM(username) = '';

UPDATE fleet_drivers
SET email = LOWER(REPLACE(driver_code, '-', '.')) || '@honafresh.vn'
WHERE email IS NULL OR BTRIM(email) = '';

UPDATE fleet_drivers
SET password_hash = '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy'
WHERE password_hash IS NULL OR BTRIM(password_hash) = '';

CREATE UNIQUE INDEX IF NOT EXISTS uq_fleet_drivers_username ON fleet_drivers(username);
CREATE UNIQUE INDEX IF NOT EXISTS uq_fleet_drivers_email ON fleet_drivers(email);
