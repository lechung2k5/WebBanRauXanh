# BỘ NGUYÊN TẮC THIẾT KẾ UI (UI STYLE GUIDE)
**Dự án:** Website Bán Rau Sạch Trực Tuyến - HoNa Fresh  
**Slogan:** *Rau sạch từ nông trại đến bàn ăn*  
**Định hướng phong cách:** Hiện đại, Tươi mới, Thân thiện & Gần gũi (Eco-friendly, Modern, Approachable)

---

## 1. Triết Lý & Mục Tiêu Thiết Kế (Design Philosophy)

*   **Tươi ngon & Sạch sẽ (Fresh & Clean):** Tối ưu không gian hiển thị hình ảnh thực tế của nông sản, sử dụng các khoảng trắng (white space) thoáng đãng, tránh gây cảm giác ngột ngạt hoặc quá nhiều quảng cáo rác.
*   **Thân thiện & Tự nhiên (Approachable & Organic):** Sử dụng các đường nét bo tròn mềm mại, chuyển màu nhẹ nhàng và đồ họa lấy cảm hứng từ tự nhiên nhằm tạo cảm giác gần gũi như đi chợ tại vườn.
*   **Minh bạch & Đáng tin cậy (Transparency & Trust):** Làm nổi bật thông tin chứng nhận (Organic, VietGAP), nguồn gốc xuất xứ và quy trình thu hoạch trên từng thẻ sản phẩm.

---

## 2. Hệ Thống Màu Sắc (Color Palette)

### 2.1. Màu thương hiệu chính (Primary Colors)
| Tên màu | Mã HEX | Ứng dụng trên giao diện |
| :--- | :--- | :--- |
| **Forest Green** | `#10542C` | Thanh điều hướng (Header/Nav), Tiêu đề chính (H1, H2), Nút bấm chính (Primary CTA), Footer |
| **Fresh Green** | `#4CAF50` | Tiêu đề phụ, Nút hành động phụ, Điểm nhấn menu, Trạng thái hover/active |

### 2.2. Màu bổ trợ & Điểm nhấn (Secondary & Accent Colors)
| Tên màu | Mã HEX | Ứng dụng trên giao diện |
| :--- | :--- | :--- |
| **Natural Leaf** | `#8BC34A` | Huy hiệu (Badges) "Organic", "Tươi trong ngày", Icon trang trí |
| **Tomato Red** | `#E53935` | Nhãn giảm giá (% Sale), Thông báo giỏ hàng (Cart badge), Cảnh báo sắp hết hàng |
| **Carrot Orange** | `#FB8C00` | Nút "Thêm vào giỏ", Điểm nhấn chương trình khuyến mãi, Đánh giá sao |
| **Earth Brown** | `#5D4037` | Đường viền phân cách, Thông tin bài viết về nông trại, Tag xuất xứ |

### 2.3. Màu nền & Màu chữ (Background & Neutral Colors)
| Tên màu | Mã HEX | Ứng dụng trên giao diện |
| :--- | :--- | :--- |
| **Warm Background** | `#F9F9F5` | Nền tổng thể toàn trang (màu kem ấm, dịu mắt hơn màu trắng tinh) |
| **Surface White** | `#FFFFFF` | Nền thẻ sản phẩm, Khung pop-up, Dropdown menu |
| **Dark Charcoal** | `#2C3E2E` | Màu chữ chính (văn bản đọc, thông tin mô tả chi tiết) |
| **Muted Grey** | `#758A7A` | Văn bản phụ, thông số kỹ thuật (trọng lượng, ngày thu hoạch) |

---

## 3. Kiểu Chữ (Typography)

*Ưu tiên sử dụng bộ font Sans-serif bo tròn nhẹ nhàng, hỗ trợ đầy đủ tiếng Việt.*

*   **Font Tiêu đề (Headings):** `Quicksand` hoặc `Nunito`
    *   *H1 (Banner / Hero Title):* 36px – 44px | Bold / Semi-bold
    *   *H2 (Danh mục / Khối nội dung chính):* 28px – 32px | Semi-bold
    *   *H3 (Tiêu đề sản phẩm / Card Title):* 18px – 20px | Semi-bold
*   **Font Nội dung (Body Text):** `Inter` hoặc `Be Vietnam Pro`
    *   *Body Large:* 16px | Regular / Medium (Dành cho giới thiệu, mô tả ngắn)
    *   *Body Regular:* 14px | Regular (Dành cho thông tin chi tiết, thành phần)
    *   *Caption / Badges:* 12px | Medium / Semi-bold (Dành cho nhãn tiêu chuẩn)

---

## 4. Thành Phần Giao Diện (UI Components)

### 4.1. Nút Bấm (Buttons)
*   **Hình dạng (Radius):** Bo góc lớn (`12px` đến `16px`) hoặc bo tròn toàn phần (`rounded-full`) để tạo sự mềm mại, thân thiện.
*   **Primary Button ("Mua ngay", "Thanh toán"):** 
    *   Nền `#10542C`, chữ trắng.
    *   Hiệu ứng: Chuyển màu nhẹ sang `#0C3E20` khi hover.
*   **Secondary Button ("Thêm vào giỏ"):**
    *   Nền `#FB8C00` (cam tươi) hoặc viền `#10542C` nền trong suốt.
*   **Đổ bóng (Box Shadow):** Đổ bóng mờ mịn, nhẹ nhàng (`0 4px 12px rgba(16, 84, 44, 0.1)`), hạn chế bóng viền sắc cạnh.

### 4.2. Thẻ Sản Phẩm (Product Card)
*   **Cấu trúc:**
    1.  *Hình ảnh:* Tỷ lệ 1:1, ảnh tách nền sạch sẽ hoặc chụp trên thớt/rổ tre tự nhiên.
    2.  *Badge góc:* Gắn thẻ nguồn gốc ("Hữu cơ", "VietGAP", "Tươi hôm nay").
    3.  *Tên sản phẩm:* Tối đa 2 dòng, font dễ đọc.
    4.  *Giá tiền:* Làm nổi bật đơn vị tính (ví dụ: `30.000 đ / 500g`).
    5.  *Nút thao tác nhanh:* Icon giỏ hàng hoặc nút "Thêm" nhỏ gọn.
*   **Phong cách:** Nền trắng `#FFFFFF`, bo góc `16px`, viền cực mỏng `1px solid #EAECE8` hoặc bóng đổ nổi mềm.

### 4.3. Thanh Tìm Kiếm & Lọc (Search & Filter)
*   Thanh tìm kiếm dài, bo tròn dạng con nhộng (`rounded-full`), placeholder gần gũi: *"Tìm rau củ quả tươi sạch cho bữa cơm hôm nay..."*.
*   Hệ thống bộ lọc nhanh dạng "Pill Tabs" (viên thuốc): *Tất cả*, *Rau ăn lá*, *Củ quả*, *Rau gia vị*, *Combo gia đình*.

---

## 5. Hình Ảnh & Minh Họa (Imagery & Graphic Elements)

*   **Hình ảnh chụp thực tế:**
    *   Ưu tiên ảnh chụp rau củ tươi non, có giọt nước đọng nhẹ, ánh sáng tự nhiên ấm áp.
    *   Hình ảnh người nông dân, luống rau, nhà lưới để củng cố độ tin cậy.
*   **Đồ họa trang trí (Doodles / Line-art):**
    *   Sử dụng các hình vẽ nét mỏng về củ cà rốt, trái cà chua, nhánh rau (tương tự đồ họa phụ trong logo) làm hình mờ nền ở banner hoặc footer.
    *   Đường lượn sóng mềm mại lấy cảm hứng từ nét uốn dưới chữ "Fresh" để làm ranh giới phân tách các phần (Section Dividers).
*   **Biểu tượng (Iconography):**
    *   Bộ icon nét tròn mềm (Line / Duotone), kích thước chuẩn 20px hoặc 24px (ví dụ: chiếc lá, giỏ nan, xe giao hàng xanh).

---

## 6. Trải Nghiệm Khách Hàng (UX Guidelines)

1.  **Dễ dàng cho người lớn tuổi / nội trợ:** Cỡ chữ rõ ràng, độ tương phản cao giữa chữ và nền, các nút bấm có kích thước vùng chạm lớn (tối thiểu 44x44px trên di động).
2.  **Thông tin minh bạch:** Luôn kèm theo nguồn gốc nông trại và thời gian thu hoạch dự kiến để khách hàng an tâm đặt hàng trước.
3.  **Tối ưu di động (Mobile First):** Ưu tiên thanh điều hướng nhanh cố định ở cạnh dưới màn hình (Bottom Navigation Bar) gồm: *Trang chủ*, *Danh mục*, *Giỏ hàng*, *Tài khoản*.