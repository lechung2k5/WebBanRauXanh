-- V4: Xóa bỏ hoàn toàn mô hình đơn hàng bán lẻ (orders, order_items), thay thế bằng Hợp đồng B2B (b2b_contracts)
DROP TABLE IF EXISTS order_items CASCADE;
DROP TABLE IF EXISTS orders CASCADE;
