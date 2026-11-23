ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS google_id VARCHAR(100) UNIQUE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS auth_provider VARCHAR(255) DEFAULT 'LOCAL';
ALTER TABLE users ADD COLUMN IF NOT EXISTS company_name VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS tax_code VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS household_farmer BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS bank_account_no VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS bank_name VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS warehouse_address VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS puc_code VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS certification VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS certification_url VARCHAR(500);
ALTER TABLE users ADD COLUMN IF NOT EXISTS kyc_status VARCHAR(255) DEFAULT 'PENDING';
ALTER TABLE users ADD COLUMN IF NOT EXISTS kyc_note VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS token_version BIGINT NOT NULL DEFAULT 0;
-- Stop on normalization collisions instead of silently merging identities.
CREATE UNIQUE INDEX users_email_normalized ON users(lower(trim(email)));
CREATE UNIQUE INDEX users_username_normalized ON users(lower(trim(username)));
UPDATE users SET email=lower(trim(email)), username=lower(trim(username));
INSERT INTO roles(name,description) VALUES ('ROLE_ADMIN','Admin'),('ROLE_ACCOUNTANT','Accountant'),('ROLE_WAREHOUSE_QC','QC'),('ROLE_DRIVER','Driver'),('ROLE_FARMER','Farmer'),('ROLE_BUYER','Buyer') ON CONFLICT(name) DO NOTHING;
-- Legacy customers become buyers awaiting profile completion and email verification.
INSERT INTO users_roles(user_id,role_id) SELECT ur.user_id,r.id FROM users_roles ur JOIN roles old ON old.id=ur.role_id CROSS JOIN roles r WHERE old.name='ROLE_USER' AND r.name='ROLE_BUYER' AND NOT EXISTS (SELECT 1 FROM users_roles a JOIN roles ar ON ar.id=a.role_id WHERE a.user_id=ur.user_id AND ar.name='ROLE_ADMIN') ON CONFLICT DO NOTHING;
DELETE FROM users_roles WHERE role_id IN (SELECT id FROM roles WHERE name='ROLE_USER');
DELETE FROM roles WHERE name='ROLE_USER';
-- Existing administrators must also verify ownership of their configured email.
CREATE TABLE refresh_tokens (id BIGSERIAL PRIMARY KEY, user_id BIGINT NOT NULL REFERENCES users(id), token_hash VARCHAR(64) UNIQUE NOT NULL, family_id VARCHAR(255) NOT NULL, expires_at TIMESTAMP WITH TIME ZONE NOT NULL, revoked BOOLEAN NOT NULL DEFAULT FALSE, remember_me BOOLEAN NOT NULL DEFAULT FALSE, created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE INDEX refresh_user_idx ON refresh_tokens(user_id);
CREATE INDEX refresh_family_idx ON refresh_tokens(family_id);
CREATE TABLE email_otp_verifications(id BIGSERIAL PRIMARY KEY, email VARCHAR(255) NOT NULL, otp_type VARCHAR(255) NOT NULL, otp_code_hash VARCHAR(255) NOT NULL, expires_at TIMESTAMP WITH TIME ZONE NOT NULL, attempts INTEGER NOT NULL DEFAULT 0, used BOOLEAN NOT NULL DEFAULT FALSE, created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE INDEX otp_email_type_idx ON email_otp_verifications(email,otp_type,id DESC);
CREATE TABLE auth_audit(id BIGSERIAL PRIMARY KEY, actor_id BIGINT, target_id BIGINT, action VARCHAR(255), created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP);
