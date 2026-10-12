# QUY TẮC BỐ CỤC GIAO DIỆN PHÂN HỆ KHÁCH HÀNG (CUSTOMER & GUEST UI LAYOUT RULES)

**Dự án:** Website Bán Rau Sạch Trực Tuyến - HoNa Fresh  
**Slogan:** *Rau sạch từ nông trại đến bàn ăn*  
**Mục tiêu:** Tích hợp luồng trải nghiệm khách hàng hiện đại, trực quan, kế thừa mô hình danh mục và tiện ích mua sắm tiện lợi (tương tự Bách Hóa Xanh).

---

## 0. Quy Chuẩn Không Gian & Khung Lưới (Global Grid & Tokens)

* **Container Width:** `max-width: 1240px; margin: 0 auto; padding: 0 16px;`
* **Hệ thống Grid:**
  * **Desktop:** 12 cột, Gutter `24px`.
  * **Tablet:** 8 cột, Gutter `16px`.
  * **Mobile:** 4 cột, Gutter `12px`.
* **Bảng màu giao diện:**
  * **Primary (Chủ đạo):** Forest Green (`#10542C`), Fresh Green (`#4CAF50`).
  * **Accent (Hành động & Điểm nhấn):** Carrot Orange (`#FB8C00`), Tomato Red (`#E53935`).
  * **Neutrals (Nền & Văn bản):** Warm Background (`#F9F9F5`), Card Surface (`#FFFFFF`), Chữ chính Dark Charcoal (`#2C3E2E`), Chữ phụ Muted Grey (`#6B7280`).
* **Bo góc (Border Radius):**
  * Containers / Cards / Modals: `16px`.
  * Buttons / Chips: `999px` (Pill shape) hoặc `12px`.
  * Form Input fields: `10px`.

---

## A. Thanh Điều Hướng Trên (Header & Global Navigation)

Thanh điều hướng cố định đỉnh trang (`position: sticky; top: 0; z-index: 1000; background: #FFFFFF; box-shadow: 0 2px 10px rgba(0,0,0,0.05);`).

### 1. Top Bar (Tầng phụ - Chiều cao: 36px)
* **Nền & Kiểu chữ:** Nền màu xanh đậm `#10542C`, chữ màu trắng, kích thước font 13px.
* **Nội dung trái:** Slogan *"Rau sạch từ nông trại đến bàn ăn"* kèm icon lá mầm.
* **Nội dung phải:** Bộ chọn vị trí giao hàng:
  * Hiển thị: `Giao đến: [Phường/Xã, Quận/Huyện ▼]` kèm icon bản đồ ghim.
  * Hành vi: Click mở modal xác định vị trí để định tuyến kho gần nhất và tính phí ship tự động.

### 2. Main Header (Tầng chính - Chiều cao: 76px)
* **Logo Thương hiệu (Chiếm ~20% chiều rộng):**
  * Đặt logo HoNa Fresh ở góc trái (`height: 48px; width: auto`).
  * Click vào logo luôn điều hướng về trang chủ.
* **Thanh Tìm kiếm Trung tâm (Chiếm ~50% chiều rộng):**
  * Khung Search bo tròn hoàn toàn dạng con nhộng (`border-radius: 999px; border: 1.5px solid #E5E7EB; background: #F9F9F5; height: 44px`).
  * Placeholder: *"Tìm rau củ quả tươi sạch cho bữa cơm hôm nay..."*.
  * Tích hợp thanh trượt bộ lọc nhanh (Pill Tabs) ngay phía dưới hoặc trong dropdown:
    * `[Tất cả]`, `[Rau ăn lá]`, `[Củ quả]`, `[Nấm]`, `[Combo]`.
    * Trạng thái Active: Nền `#10542C`, chữ trắng bo tròn.
* **Khối Tiện Ích & Tài Khoản (Chiếm ~30% chiều rộng, canh phải):**
  * **Nút Khuyến Mãi:** Icon hộp quà + nhãn *"Ưu đãi"*, hover chuyển màu `#4CAF50`.
  * **Giỏ Hàng:**
    * Icon giỏ hàng có Badge tròn hiển thị số lượng sản phẩm.
    * Màu badge: Tomato Red (`#E53935`), chữ trắng đậm, kích thước 18x18px.
  * **Khối Tài Khoản:**
    * *Dành cho Khách (Guest):* Nút `"Đăng ký / Đăng nhập"` viền mảnh, bo góc 8px.
    * *Dành cho Khách Hàng (Customer):* Avatar tròn + Tên hiển thị. Click mở menu: *Hồ sơ cá nhân*, *Lịch sử & Theo dõi đơn hàng*, *Đăng xuất*.

---

## B. Màn Hình Trang Chủ (Homepage Layout)

### 1. Hero Banner & Flash Sale
* **Bố cục:** Chia cột tỷ lệ 8:4 trên Desktop, xếp dọc trên Mobile.
* **Hero Slider (8 cột bên trái):**
  * Banner tỷ lệ chuẩn 16:9 hoặc 21:9.
  * Trình chiếu hình ảnh cam kết nông sản tươi sạch, nguồn gốc xuất xứ, chứng nhận VietGAP/Organic. Bo góc `16px`.
* **Khối Flash Sale (4 cột bên phải):**
  * Header khối: Nền màu Tomato Red (`#E53935`), chữ in hoa *"GIỜ VÀNG GIÁ SỐC"*, icon tia chớp.
  * Đồng hồ đếm ngược (Countdown Timer): Hiển thị `[Giờ] : [Phút] : [Giây]` trong các ô vuông nền sẫm bo góc 6px.
  * Mini Card sản phẩm giá sốc: Hiển thị ảnh, giá giảm và thanh tiến trình tồn kho (Progress bar) màu cam: *"Đã bán X/Y"*.

### 2. Khối Gợi Ý "Hôm Nay Ăn Gì?"
* **Tiêu đề khối:** Font chữ bo tròn, màu `#10542C`, đi kèm icon dụng cụ nấu nướng.
* **Bộ lọc thực đơn dạng thẻ tab:**
  * Các danh mục: `[Món mặn đậm đà]`, `[Nấu canh thanh mát]`, `[Xào & Luộc]`, `[Trộn salad tươi]`.
* **Cấu trúc gợi ý:**
  * Hiển thị combo nguyên liệu cần thiết cho món ăn đã chọn.
  * Nút CTA: `"Mua trọn combo"` nền Fresh Green (`#4CAF50`), chữ trắng.

### 3. Danh Mục Sản Phẩm Nổi Bật
Hiển thị danh sách truy cập nhanh gồm 4 nhóm chính:
* **Rau ăn lá:** Rau muống, cải ngọt, mồng tơi, xà lách thủy canh...
* **Củ, quả:** Cà rốt, khoai tây, cà chua, bí đỏ, dưa leo...
* **Nấm các loại:** Nấm kim châm, nấm đùi gà, nấm rơm, nấm linh chi...
* **Combo tiết kiệm:** Combo rau nấu canh, gói rau lẩu ưu đãi gia đình.

### 4. Lưới Sản Phẩm (Product Grid Layout)
* **Quy chuẩn Grid:** 4 cột (Desktop), 3 cột (Tablet), 2 cột (Mobile).
* **Thẻ Sản Phẩm (Product Card):**
  * **Khung:** Nền trắng `#FFFFFF`, viền mỏng `1px solid #F0F0F0`, bo góc `16px`.
  * **Hiệu ứng hover:** Đổ bóng mềm (`box-shadow: 0 8px 20px rgba(0,0,0,0.06); transform: translateY(-4px);`).
  * **Badge góc:** Tag xanh lá `"VietGAP"` / `"Organic"` hoặc tag đỏ `"-20%"`.
  * **Ảnh sản phẩm:** Tỷ lệ vuông 1:1, ảnh tách nền hoặc chụp cận độ tươi mới.
  * **Thông tin giá & Quy cách:**
    * Tên sản phẩm tối đa 2 dòng.
    * Đơn vị quy cách: `500g / túi`, `1 bó`.
    * Giá bán nổi bật màu `#10542C` (hoặc `#E53935` nếu đang sale).
  * **Nút hành động:**
    * Nút `"Thêm vào giỏ"` màu Carrot Orange (`#FB8C00`), dạng bo tròn viên thuốc (`rounded-full`), chữ trắng đậm.

---

## C. Màn Hình Danh Mục & Chi Tiết Sản Phẩm (Catalog & Product Detail)

### 1. Màn Hình Danh Mục (Catalog Layout)
* **Bố cục 2 cột:** Sidebar lọc (25% chiều rộng) + Lưới sản phẩm (75% chiều rộng).
* **Sidebar Bộ Lọc (Filter Sidebar):**
  * *Phân loại rau:* Checkbox (Rau ăn lá, Củ, Quả, Nấm, Combo).
  * *Chứng nhận chất lượng:* Checkbox (VietGAP, Hữu cơ / Organic, GlobalGAP).
  * *Khoảng giá:* Thanh trượt 2 đầu (Price Slider).
  * *Mục đích nấu nướng:* Ăn kiêng/Salad, Nấu canh, Ăn lẩu, Ăn dặm cho bé.
  * Nút bấm: `"Thiết lập lại"` và `"Áp dụng lọc"`.

### 2. Trang Chi Tiết Sản Phẩm (Product Detail)
* **Khối Trên (Above the fold - 2 cột 50:50):**
  * **Cột trái (Thư viện ảnh):** 1 khung ảnh lớn chất lượng cao + dãy thumbnail trượt ngang bên dưới (ảnh chụp giọt nước, bối cảnh nông trại, bao bì tem mác).
  * **Cột phải (Thông tin mua hàng):**
    * Tag chứng chỉ VietGAP/Organic.
    * Tên sản phẩm (H1, 28px, màu `#2C3E2E`).
    * Giá niêm yết và đơn vị tính rõ ràng.
    * Bộ tăng giảm số lượng: Nút `[-]` `[Số lượng]` `[+]`.
    * **Nhóm CTA:**
      * Nút `"Thêm vào giỏ hàng"`: Viền Forest Green `#10542C`, nền trong suốt.
      * Nút `"Mua ngay"`: Nền Carrot Orange `#FB8C00`, chữ trắng to rõ.
* **Khối Dưới (Tab thông tin minh bạch):**
  * **Tab Nguồn gốc & Thu hoạch:** Địa chỉ nông trại, ngày thu hoạch gần nhất, hạn sử dụng khuyên dùng, hướng dẫn bảo quản trong tủ lạnh.
  * **Tab Giá trị dinh dưỡng:** Bảng thống kê calo, hàm lượng chất xơ, vitamin A, C.
  * **Tab Đánh giá & Bình luận:** Đánh giá sao trung bình, danh sách review có gắn nhãn *"Đã mua hàng thành công"* kèm hình ảnh thực tế từ khách.

---

## D. Màn Hình Giỏ Hàng, Đặt Hàng & Thanh Toán (Checkout Layout)

### 1. Giỏ Hàng (Cart Layout)
* **Bố cục 2 cột:** Danh sách món hàng (65%) + Tóm tắt đơn hàng (35%).
* **Danh sách món hàng:**
  * Hiển thị ảnh thu nhỏ, tên sản phẩm, đơn vị tính, đơn giá.
  * Bộ nút tùy chỉnh số lượng (+/-) có cơ chế tự động kiểm tra tồn kho theo thời gian thực (báo đỏ nếu vượt quá lượng rau có sẵn trong kho).
* **Khung tóm tắt:**
  * Ô nhập mã giảm giá / Voucher khuyến mãi kèm nút Áp dụng.
  * Tạm tính, Phí vận chuyển (tự động tính theo địa chỉ kho gần nhất), Tiền giảm trừ.
  * Tổng tiền thanh toán (Cỡ chữ to, màu `#E53935`).
  * Nút chính: `"Tiến hành đặt hàng"` (Nền `#10542C`, toàn bộ chiều rộng thẻ).

### 2. Trang Đặt Hàng & Thanh Toán (Checkout Steps)
Gồm 3 khối thẻ được gom nhóm trực quan:
1. **Thông tin nhận hàng:**
   * Tên, số điện thoại, địa chỉ (chọn nhanh từ sổ địa chỉ đối với Customer, hoặc form nhập mới cho Guest).
   * Khung giờ nhận hàng linh hoạt: *Giao siêu tốc 2 giờ*, *Khung 8h - 10h sáng mai*, *Khung 16h - 18h chiều mai*.
2. **Phương thức thanh toán:**
   * Lựa chọn 1: *Thanh toán khi nhận hàng (COD)*.
   * Lựa chọn 2: *Cổng thanh toán trực tuyến / VietQR / Ví điện tử (VNPAY, MoMo)*. Giao diện mở rộng tự động hiển thị mã QR động để quét nhanh và có đồng hồ giữ đơn hàng.
3. **Ghi chú đơn hàng:**
   * Ô nhập thông tin phụ: *"Ghi chú cho người giao hàng (Ví dụ: Giao rau tươi sáng sớm, bấm chuông khi đến...)"*.

---

## E. Trang Quản Lý Cá Nhân & Theo Dõi Đơn Hàng (Customer Dashboard)

* **Bố cục:** Sidebar tài khoản (20%) + Nội dung chi tiết (80%).
* **Thanh Sidebar Cá Nhân:**
  * Thông tin tài khoản & Sổ địa chỉ nhận hàng.
  * Lịch sử đơn hàng & Trạng thái giao hàng.
  * Đổi mật khẩu & Thiết lập bảo mật.
* **Khối Theo Dõi Đơn Hàng (UC03 - Order Tracking Component):**
  * **Thanh tiến trình thời gian thực (Timeline Stepper):**
    * 4 nấc trực quan: `[Chờ xác nhận]` -> `[Đang đóng gói]` -> `[Đang giao]` -> `[Hoàn tất]`.
    * Nấc trạng thái hiện tại được tô sáng bằng Forest Green (`#10542C`) kèm hiệu ứng nhấp nháy nhẹ.
  * **Chi tiết kiện hàng:** Danh mục sản phẩm, hóa đơn điện tử, thông tin người giao hàng.
* **Chức Năng Mua Lại (UC04 - Quick Re-order):**
  * Nút `"Mua lại đơn này"` đặt ở góc phải trên mỗi thẻ đơn hàng cũ.
  * Hành vi: Tự động thêm toàn bộ các sản phẩm còn hàng từ đơn cũ vào giỏ hàng hiện tại với đúng 1 cú nhấp chuột và chuyển hướng ngay sang giỏ hàng.