# BỘ TÀI LIỆU CHUẨN HÓA TÁC NHÂN VÀ USE CASE HỆ THỐNG HONA FRESH
> **Khóa luận tốt nghiệp / Báo cáo đồ án chuyên ngành Công nghệ Thông tin**  
> **Chương 3: Phân tích & Thiết kế hệ thống**  
> **Mục 3.1.2: Danh sách tác nhân & Mục 3.1.3: Danh sách các tình huống hoạt động (Use Cases)**  
> **Quy chuẩn tên Use Case:** Chuẩn UML 2.5 (Động từ + Cụm danh từ, tối đa ≤ 8 chữ/tên)

---

## 3.1.2. Danh sách tác nhân và mô tả (Actors)

Hệ thống **HONA FRESH** thiết lập ranh giới hệ thống phục vụ chuỗi cung ứng nông sản B2B khép kín từ nông trại đến kho thu mua sỉ. Dưới đây là danh sách toàn bộ các tác nhân tham gia tương tác trực tiếp và gián tiếp với hệ thống:

### Bảng 3.1. Danh sách tác nhân trong hệ thống HONA FRESH

| STT | Tác nhân (Actor) | Tên tiếng Anh | Phân loại | Mô tả vai trò & Trách nhiệm trong hệ thống |
| :---: | :--- | :--- | :---: | :--- |
| **1** | **Khách vãng lai** | `Guest` | Con người (Chưa định danh) | Người dùng truy cập sàn khi chưa đăng nhập. Được phép tra cứu thông tin giới thiệu sàn, xem danh mục nông sản, xem hồ sơ năng lực các nhà vườn và thực hiện đăng ký tài khoản thành viên. |
| **2** | **Thương lái thu mua** | `Buyer` | Con người (Nội bộ hệ thống) | Doanh nghiệp bán buôn, chuỗi siêu thị, nhà hàng hoặc thương lái thu mua sỉ. Có quyền tìm kiếm nguồn cung, tạo yêu cầu báo giá sỉ (RFQ), thương lượng đàm phán giá, ký hợp đồng, nạp tiền ký quỹ 30% Escrow, nhắn tin đối tác, giám sát hành trình xe và ký nhận bàn giao điện tử (ePOD). |
| **3** | **Nhà vườn / Hợp tác xã** | `Farmer` | Con người (Nội bộ hệ thống) | Chủ nông trại hoặc đại diện Hợp tác xã (HTX) sản xuất nông sản. Có quyền đăng bán các lô vụ mùa, phản hồi đàm phán RFQ (đồng ý, mặc cả lại, từ chối), quản lý hợp đồng, thực hiện quy trình thu hoạch - đóng gói, in tem QR truy xuất, bàn giao cho xe gom First-mile, theo dõi ví tiền và rút tiền quyết toán. |
| **4** | **Quản trị viên & Kế toán** | `Admin / Operator` | Con người (Ban quản trị) | Quản trị viên sàn và bộ phận kế toán. Chịu trách nhiệm thẩm định hồ sơ thành viên (KYC), kiểm duyệt bài đăng lô nông sản, giám sát hợp đồng B2B toàn sàn, quản lý dòng tiền bảo chứng Escrow, phê duyệt giải ngân và xem báo cáo tài chính tổng hợp. |
| **5** | **Nhân viên kiểm định KCS** | `Warehouse QC` | Con người (Vận hành kho) | Nhân viên kiểm định chất lượng tại trạm trung chuyển (Hub). Thực hiện tiếp nhận lô hàng từ xe gom, đo đạc chỉ số (độ ngọt Brix, độ ẩm, khối lượng thực nhận), lập biên bản KCS Inbound và phân bổ vị trí lưu kho lạnh. |
| **6** | **Tài xế vận chuyển** | `Logistics Driver` | Con người (Vận tải) | Đội ngũ lái xe tải lạnh chuyên dụng thực hiện 2 chặng: gom hàng từ vườn về trạm Hub (First-mile) và phân phối hàng từ trạm Hub đến tận kho của Thương lái (Outbound). |
<!-- | **7** | **Cổng thanh toán & Ký quỹ** | `Payment Gateway` | Hệ thống ngoại vi (External) | Dịch vụ trung gian thanh toán (SePay / VietQR) tự động xử lý tiền nạp ký quỹ 30%, đối soát biến động số dư và lệnh giải ngân chuyển khoản về tài khoản ngân hàng. |
| **8** | **Trạm cảm biến IoT & GPS** | `IoT Sensor Hub` | Hệ thống ngoại vi (External) | Mạng lưới cảm biến phần cứng trên thùng xe lạnh và trong kho mát, liên tục thu thập và truyền dữ liệu nhiệt độ, độ ẩm và tọa độ GPS về hệ thống theo thời gian thực. | -->
PHẦN NÀY KHÔNG CẦN VẼ
---

## 3.1.3. Danh sách các tình huống hoạt động (Use Cases)

Toàn bộ các chức năng của hệ thống được chuẩn hóa theo quy tắc: **Động từ hành động + Cụm từ mục tiêu**, đảm bảo **ngắn gọn súc tích (từ 4 đến 6 chữ, tuyệt đối không vượt quá 8 chữ)**, phù hợp hoàn hảo khi thể hiện trên sơ đồ Use Case UML và bảng biểu báo cáo.

Hệ thống bao gồm tổng cộng **42 Use Case chuẩn hóa**, phân chia thành 4 phân hệ chức năng tương ứng với 4 nhóm tác nhân:

---

### PHÂN HỆ 1: KHÁCH VÃNG LAI (GUEST) — 6 USE CASES

| STT | Mã Use Case | Tên Use Case chuẩn hóa (≤ 8 chữ) | Số chữ | Tác nhân chính | Trạng thái | Mô tả tóm tắt |
| :---: | :---: | :--- | :---: | :---: | :---: | :--- |
| 1 | **UC_G01** | **Xem thông tin giới thiệu sàn** | 6 chữ | Guest | [Đang có] | Xem trang chủ, chính sách bảo chứng Escrow và quy trình kết nối B2B. |
| 2 | **UC_G02** | **Xem danh mục lô nông sản** | 6 chữ | Guest | [Đang có] | Xem danh sách rau củ quả, lọc theo tiêu chuẩn VietGAP và vùng trồng. |
| 3 | **UC_G03** | **Xem thông tin các nông trại** | 6 chữ | Guest | [Đang có] | Tra cứu danh bạ hồ sơ năng lực, chứng nhận và quy mô của các nhà vườn. |
| 4 | **UC_G04** | **Đăng ký tài khoản thành viên** | 5 chữ | Guest | [Đang có] | Điền thông tin đăng ký tài khoản theo vai trò Thương lái hoặc Nhà vườn. |
| 5 | **UC_G05** | **Đăng nhập vào hệ thống** | 5 chữ | Guest | [Đang có] | Nhập email/mật khẩu, xác thực JWT và chuyển tiếp vào Portal phù hợp. |
| 6 | **UC_G06** | **Khôi phục mật khẩu qua OTP** | 5 chữ | Guest | [Đang có] | Yêu cầu gửi mã OTP về email để thiết lập lại mật khẩu đăng nhập mới. |

---

### PHÂN HỆ 2: THƯƠNG LÁI THU MUA SỈ (BUYER) — 12 USE CASES

| STT | Mã Use Case | Tên Use Case chuẩn hóa (≤ 8 chữ) | Số chữ | Tác nhân chính | Trạng thái | Mô tả tóm tắt |
| :---: | :---: | :--- | :---: | :---: | :---: | :--- |
| 7 | **UC_B01** | **Quản lý hồ sơ cá nhân** | 5 chữ | Buyer | [Đang có] | Cập nhật thông tin doanh nghiệp, GPKD, người liên hệ và kho nhận hàng. |
| 8 | **UC_B02** | **Tìm kiếm và lọc nông sản** | 6 chữ | Buyer | [Đang có] | Tìm kiếm thông minh bằng từ khóa, bộ lọc vụ mùa và trợ lý AI gợi ý. |
| 9 | **UC_B03** | **Tạo đơn đàm phán RFQ** | 5 chữ | Buyer | [Đang có] | Khởi tạo yêu cầu báo giá sỉ với mức giá mong muốn, khối lượng và ngày hẹn. |
| 10 | **UC_B04** | **Thương lượng giá lô nông sản** | 6 chữ | Buyer | [Đang có] | Phản hồi các lượt thương lượng (Counter-offer) về giá và sản lượng với nhà vườn. |
| 11 | **UC_B05** | **Chốt đơn lô nông sản** | 5 chữ | Buyer | [Đang có] | Chấp thuận giá thỏa thuận cuối cùng để hệ thống tự động sinh Hợp đồng B2B. |
| 12 | **UC_B06** | **Quản lý hợp đồng B2B** | 4 chữ | Buyer | [Đang có] | Tra cứu danh sách, chi tiết điều khoản, mã hợp đồng và lịch trình giao hàng. |
| 13 | **UC_B07** | **Thanh toán tiền ký quỹ 30%** | 6 chữ | Buyer, Payment | [Đang có] | Quét mã VietQR nạp 30% giá trị hợp đồng vào tài khoản ký quỹ bảo chứng Escrow. |
| 14 | **UC_B08** | **Nhắn tin trao đổi đối tác** | 5 chữ | Buyer | [Đang có] | Chat trực tuyến thời gian thực (WebSocket) với nhà vườn về quy cách đóng gói. |
| 15 | **UC_B09** | **Xem trạng thái lô hàng** | 5 chữ | Buyer, IoT | [Đang có] | Giám sát tiến độ đơn hàng theo thời gian thực (Thu hoạch, Vận chuyển, Nhập trạm). |
| 16 | **UC_B10** | **Xác nhận nhận hàng ePOD** | 5 chữ | Buyer | [Đang có] | Kiểm tra số lượng thực nhận tại kho và ký số xác nhận biên bản giao nhận điện tử. |
| 17 | **UC_B11** | **Đánh giá chất lượng nông sản** | 5 chữ | Buyer | [Đang có] | Gửi đánh giá số sao và nhận xét độ tươi ngon, uy tín của nhà vườn sau giao dịch. |
| 18 | **UC_B12** | **Xem thống kê chi tiêu** | 5 chữ | Buyer | [Sẽ có] | Xem biểu đồ tổng ngân sách thu mua, sản lượng nông sản đã gom theo mùa vụ. |

---

### PHÂN HỆ 3: NHÀ VƯỜN / HỢP TÁC XÃ (FARMER) — 12 USE CASES

| STT | Mã Use Case | Tên Use Case chuẩn hóa (≤ 8 chữ) | Số chữ | Tác nhân chính | Trạng thái | Mô tả tóm tắt |
| :---: | :---: | :--- | :---: | :---: | :---: | :--- |
| 19 | **UC_F01** | **Quản lý hồ sơ nông trại** | 5 chữ | Farmer | [Đang có] | Cập nhật thông tin nông trại, diện tích canh tác và chứng chỉ VietGAP/GlobalGAP. |
| 20 | **UC_F02** | **Đăng bán lô nông sản** | 5 chữ | Farmer | [Đang có] | Đăng bài lô nông sản mở bán kèm ngày dự kiến thu hoạch, sản lượng và giá sàn. |
| 21 | **UC_F03** | **Quản lý thông tin nông sản** | 5 chữ | Farmer | [Đang có] | Điều chỉnh giá bán, cập nhật khối lượng còn lại hoặc đóng/mở bài đăng lô vụ mùa. |
| 22 | **UC_F04** | **Quản lý đơn đàm phán** | 5 chữ | Farmer | [Đang có] | Tiếp nhận RFQ từ thương lái: Chấp thuận (Accept), Mặc cả lại (Counter), Từ chối. |
| 23 | **UC_F05** | **Quản lý hợp đồng mua bán** | 5 chữ | Farmer | [Đang có] | Theo dõi tiến độ thực hiện các hợp đồng B2B đã được thương lái nạp tiền cọc 30%. |
| 24 | **UC_F06** | **Thực hiện thu hoạch đóng gói** | 5 chữ | Farmer | [Đang có] | Bắt đầu quy trình thu hoạch thực tế, đóng sọt chuẩn quy cách và tải ảnh minh chứng. |
| 25 | **UC_F07** | **In tem mã vạch QR** | 5 chữ | Farmer | [Đang có] | Xuất và in nhãn dán mã QR truy xuất nguồn gốc gắn lên từng sọt hàng trước khi xuất vườn. |
| 26 | **UC_F08** | **Bàn giao lô hàng xe gom** | 6 chữ | Farmer | [Đang có] | Bàn giao hàng hóa cho tài xế xe tải lạnh First-mile và ký biên bản xuất vườn. |
| 27 | **UC_F09** | **Nhắn tin trao đổi đối tác** | 5 chữ | Farmer | [Đang có] | Trao đổi tin nhắn trực tiếp với thương lái để làm rõ thời gian cắt trưa/cắt sáng. |
| 28 | **UC_F10** | **Quản lý giải ngân nguồn tiền** | 5 chữ | Farmer | [Đang có] | Kiểm tra số dư tiền cọc đang bảo chứng và bảng phân bổ giải ngân sau khi nghiệm thu. |
| 29 | **UC_F11** | **Yêu cầu rút tiền về** | 5 chữ | Farmer, Payment | [Đang có] | Tạo lệnh rút tiền doanh thu bán hàng về tài khoản ngân hàng chính chủ của nhà vườn. |
| 30 | **UC_F12** | **Xem thống kê doanh thu** | 5 chữ | Farmer | [Đang có] | Xem báo cáo tài chính tổng doanh thu, sản lượng xuất bán và tỷ lệ hoàn tất hợp đồng. |

---

### PHÂN HỆ 4: QUẢN TRỊ VIÊN & QUẢN LÝ KHO (ADMIN & WAREHOUSE) — 12 USE CASES

| STT | Mã Use Case | Tên Use Case chuẩn hóa (≤ 8 chữ) | Số chữ | Tác nhân chính | Trạng thái | Mô tả tóm tắt |
| :---: | :---: | :--- | :---: | :---: | :---: | :--- |
| 31 | **UC_A01** | **Quản lý tài khoản người dùng** | 5 chữ | Admin | [Đang có] | Thẩm định hồ sơ định danh (KYC) đối tác, cấp quyền, khóa hoặc mở khóa tài khoản. |
| 32 | **UC_A02** | **Quản lý nguồn cung nông sản** | 5 chữ | Admin | [Đang có] | Kiểm duyệt bài đăng lô nông sản của nhà vườn, gỡ bỏ thông tin vi phạm quy chuẩn. |
| 33 | **UC_A03** | **Quản lý danh mục ngành hàng** | 5 chữ | Admin | [Đang có] | Thêm, sửa, xóa các chủng loại nông sản (rau ăn lá, củ quả, nấm) và tiêu chuẩn kỹ thuật. |
| 34 | **UC_A04** | **Quản lý hợp đồng mua bán** | 5 chữ | Admin | [Đang có] | Giám sát toàn bộ hợp đồng B2B trên sàn, can thiệp xử lý khiếu nại hoặc hủy cọc vi phạm. |
| 35 | **UC_A05** | **Điều phối vận chuyển lấy hàng** | 5 chữ | Admin | [Đang có] | Lập lộ trình xe gom First-mile, phân công tài xế và ghép lô tối ưu cung đường đón. |
| 36 | **UC_A06** | **Kiểm định chất lượng trạm Hub** | 6 chữ | QC Inspector | [Đang có] | Đo độ ngọt Brix, tỷ lệ hao hụt dập nát, khối lượng thực nhận và lập biên bản KCS. |
| 37 | **UC_A07** | **Quản lý kho hàng lưu trữ** | 5 chữ | Warehouse | [Đang có] | Phân bổ lô hàng vào các vị trí ngăn kệ (Bin/Zone) trong kho bảo quản chuỗi lạnh. |
| 38 | **UC_A08** | **Giám sát nhiệt độ độ ẩm** | 5 chữ | Warehouse, IoT | [Đang có] | Theo dõi biểu đồ cảm biến IoT trong kho mát và nhận cảnh báo khi vượt ngưỡng an toàn. |
| 39 | **UC_A09** | **Điều phối giao hàng chặng cuối** | 6 chữ | Admin, Driver | [Đang có] | Tạo bảng kê chuyến xe Outbound, xuất kho lạnh và điều phối giao hàng đến kho Buyer. |
| 40 | **UC_A10** | **Quản lý kế toán quyết toán** | 5 chữ | Admin, Accountant| [Đang có] | Bảng đối soát tài chính quyết toán cuối (Final Settlement), khấu trừ phí sàn và duyệt rút tiền. |
| 41 | **UC_A11** | **Báo cáo thống kê tổng hợp** | 5 chữ | Admin | [Đang có] | Xuất báo cáo tổng quan sản lượng giao dịch toàn sàn, tỷ lệ hao hụt nông sản chuỗi lạnh. |
| 42 | **UC_A12** | **Cài đặt cấu hình hệ thống** | 5 chữ | Admin | [Sẽ có] | Cấu hình tỷ lệ cọc bảo chứng Escrow (30%), phí dịch vụ sàn, phí lưu kho và thông báo. |

---

## 3.1.4. Bảng ma trận phân quyền tác nhân theo Use Case (Actor - Use Case Matrix)

Bảng ma trận thể hiện vai trò thực thi chính (`X`) của từng tác nhân trong toàn bộ hệ thống:

| Nhóm chức năng | Tên Use Case chuẩn hóa | Guest | Buyer | Farmer | Admin / QC | Hệ thống ngoài |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: |
| **Công khai & Định danh** | Xem thông tin giới thiệu sàn | **X** | **X** | **X** | | |
| | Xem danh mục lô nông sản | **X** | **X** | | | |
| | Xem thông tin các nông trại | **X** | **X** | | | |
| | Đăng ký tài khoản thành viên | **X** | | | | |
| | Đăng nhập vào hệ thống | **X** | **X** | **X** | **X** | |
| | Khôi phục mật khẩu qua OTP | **X** | **X** | **X** | | |
| **Quản lý nguồn hàng & Đăng bán** | Quản lý hồ sơ cá nhân / nông trại | | **X** | **X** | | |
| | Tìm kiếm và lọc nông sản | | **X** | | | |
| | Đăng bán lô nông sản | | | **X** | | |
| | Quản lý thông tin nông sản | | | **X** | | |
| | Quản lý nguồn cung nông sản | | | | **X** | |
| | Quản lý danh mục ngành hàng | | | | **X** | |
| **Đàm phán & Thương lượng B2B** | Tạo đơn đàm phán RFQ | | **X** | | | |
| | Thương lượng giá lô nông sản | | **X** | **X** | | |
| | Quản lý đơn đàm phán | | | **X** | | |
| | Chốt đơn lô nông sản | | **X** | **X** | | |
| | Nhắn tin trao đổi đối tác | | **X** | **X** | | |
| **Hợp đồng & Ký quỹ Escrow** | Quản lý hợp đồng B2B / Mua bán | | **X** | **X** | **X** | |
| | Thanh toán tiền ký quỹ 30% | | **X** | | | **Payment** |
| | Quản lý giải ngân nguồn tiền | | | **X** | **X** | |
| | Yêu cầu rút tiền về | | | **X** | | **Payment** |
| | Quản lý kế toán quyết toán | | | | **X** | |
| **Thu hoạch, Kho bãi & Vận tải**| Thực hiện thu hoạch đóng gói | | | **X** | | |
| | In tem mã vạch QR | | | **X** | | |
| | Bàn giao lô hàng xe gom | | | **X** | | |
| | Điều phối vận chuyển lấy hàng | | | | **X** | |
| | Kiểm định chất lượng trạm Hub | | | | **X (QC)**| |
| | Quản lý kho hàng lưu trữ | | | | **X** | |
| | Giám sát nhiệt độ độ ẩm | | **X** | | **X** | **IoT Hub** |
| | Điều phối giao hàng chặng cuối | | | | **X** | |
| | Xem trạng thái lô hàng | | **X** | **X** | **X** | |
| | Xác nhận nhận hàng ePOD | | **X** | | | |
| **Hậu mãi & Thống kê sàn** | Đánh giá chất lượng nông sản | | **X** | | | |
| | Xem thống kê chi tiêu / Doanh thu | | **X** | **X** | | |
| | Báo cáo thống kê tổng hợp | | | | **X** | |
| | Cài đặt cấu hình hệ thống | | | | **X** | |
