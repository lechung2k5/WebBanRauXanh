-- Chuẩn hóa trạng thái RFQ và lưu rõ bên đang chờ phản hồi tiếp theo.
UPDATE rfq_negotiations SET status = 'WAITING_FARMER' WHERE status = 'PENDING';
UPDATE rfq_negotiations SET status = 'WAITING_BUYER' WHERE status = 'COUNTER_OFFER';
ALTER TABLE rfq_negotiations ALTER COLUMN status SET DEFAULT 'WAITING_FARMER';
