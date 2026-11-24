# -*- coding: utf-8 -*-
"""
CHƯƠNG 1: GIỚI THIỆU TỔNG QUAN ĐỀ TÀI
Nội dung chi tiết chuẩn khóa luận tốt nghiệp ngành Công nghệ thông tin
"""

CHAPTER_1_CONTENT = [
    ("CHƯƠNG 1: GIỚI THIỆU TỔNG QUAN ĐỀ TÀI", "h1"),
    
    ("1.1. Bối cảnh và Đặt vấn đề", "h2"),
    ("Việt Nam là một quốc gia có thế mạnh truyền thống về sản xuất nông nghiệp với sản lượng rau củ quả tươi sống hàng năm đạt hàng chục triệu tấn. Tuy nhiên, chuỗi cung ứng nông sản nội địa hiện nay vẫn mang nặng tính phân tán, tự phát và đối mặt với nhiều mắt xích trung gian kém hiệu quả. Theo các báo cáo khảo sát từ Bộ Nông nghiệp và Phát triển Nông thôn, nông sản từ khi xuất vườn đến tay đơn vị phân phối hoặc người tiêu dùng thường phải đi qua từ 3 đến 5 tầng nấc trung gian (thương lái địa phương, vựa thu mua, chành xe, chợ đầu mối và chợ dân sinh). Mô hình phân phối truyền thống nhiều tầng này dẫn đến hàng loạt hệ lụy nghiêm trọng cho cả nhà vườn lẫn bên thu mua.", "normal"),
    
    ("Thứ nhất, tình trạng bất đối xứng thông tin thị trường diễn ra phổ biến. Nhà vườn nhỏ lẻ và các hợp tác xã nông nghiệp thường thiếu thông tin cập nhật về nhu cầu tiêu thụ và giá cả thị trường tại các đô thị lớn, dẫn đến hiện tượng 'được mùa mất giá' diễn ra có tính chu kỳ. Vào các thời điểm thu hoạch rộ, người nông dân thường bị thương lái ép giá hoặc không tìm được kênh tiêu thụ tập trung, buộc phải bán đổ bán tháo với giá thấp hơn giá thành sản xuất.", "normal"),
    
    ("Thứ hai, tỷ lệ thất thoát và hao hụt sau thu hoạch tại Việt Nam hiện đang ở mức đáng báo động, dao động từ 20% đến 30% đối với các mặt hàng rau ăn lá và rau củ quả tươi sống. Nguyên nhân cốt lõi là do thiếu hụt cơ sở hạ tầng chuỗi lạnh (Cold Chain Logistics), quy trình bảo quản tại các trạm trung chuyển chưa đạt chuẩn, và việc vận chuyển đường dài bằng xe tải thông thường không kiểm soát được nhiệt độ và độ ẩm. Hơn nữa, việc bàn giao hàng hóa giữa nhà vườn, tài xế và thương lái hiện nay hầu hết được thực hiện thủ công bằng giấy tờ ghi chép sơ sài, dễ dẫn đến các tranh chấp phức tạp khi phát sinh sự cố dập nát, thối hỏng hoặc hao hụt khối lượng thực nhận.", "normal"),
    
    ("Thứ ba, sự thiếu vắng của cơ chế bảo chứng giao dịch thương mại số (Escrow). Trong các hợp đồng mua bán nông sản số lượng lớn (tính bằng hàng tấn), cả hai bên đều chịu rủi ro rất cao: nhà vườn lo sợ thương lái bỏ cọc hoặc chối bỏ cam kết thu mua khi giá thị trường sụt giảm; ngược lại, thương lái lo ngại nhà vườn không giao đủ sản lượng, trễ hạn thu hoạch hoặc chất lượng rau không đồng nhất với mẫu thỏa thuận ban đầu.", "normal"),
    
    ("Mặc dù các sàn thương mại điện tử lớn tại Việt Nam (như Shopee, Lazada, Tiki) đã phát triển rất mạnh mẽ, song các nền tảng này chủ yếu phục vụ mô hình bán lẻ B2C (Business-to-Consumer) dành cho các sản phẩm khô, đóng gói sẵn hoặc tiêu dùng nhanh. Chúng hoàn toàn không được thiết kế để đáp ứng đặc thù của giao dịch bán sỉ nông sản B2B (Business-to-Business), vốn đòi hỏi cơ chế giao dịch theo từng lô thu hoạch (Lot-based trading), quy trình đàm phán báo giá nhiều vòng (RFQ - Request for Quotation), hợp đồng kinh tế điện tử có đặt cọc bảo chứng và quy trình điều phối logistics chuỗi lạnh chuyên biệt.", "normal"),
    
    ("Xuất phát từ những đòi hỏi thực tiễn cấp bách đó, đề tài 'HONA FRESH – Nền tảng B2B kết nối Thương lái và Nhà vườn' được nghiên cứu và hiện thực hóa. Hệ thống nhằm mục tiêu xây dựng một nền tảng thương mại điện tử B2B chuyên biệt, kết nối trực tiếp các nhà vườn, trang trại canh tác đạt chuẩn VietGAP với các doanh nghiệp, thương lái thu mua nông sản quy mô lớn, tích hợp giải pháp quản lý chuỗi cung ứng lạnh khép kín, ứng dụng công nghệ trí tuệ nhân tạo (AI) và cơ chế bảo chứng ký quỹ minh bạch.", "normal"),

    ("1.2. Mục tiêu nghiên cứu và phát triển đề tài", "h2"),
    
    ("1.2.1. Mục tiêu tổng quát", "h3"),
    ("Mục tiêu tổng quát của đề tài là nghiên cứu, phân tích, thiết kế và xây dựng hoàn chỉnh nền tảng web B2B HONA FRESH. Hệ thống giải quyết toàn diện bài toán liên kết cung - cầu nông sản sỉ trực tuyến; số hóa toàn bộ vòng đời giao dịch từ đăng bán lô hàng, gửi yêu cầu báo giá RFQ, thương lượng giá cả đối ứng, ký kết hợp đồng thương mại điện tử, thanh toán ký quỹ bảo chứng Escrow, cho đến điều phối đội xe tải lạnh vận chuyển hai chặng, kiểm định chất lượng tại trạm trung chuyển (Hub QC) và nghiệm thu giao nhận điện tử (ePOD).", "normal"),

    ("1.2.2. Mục tiêu cụ thể", "h3"),
    ("Để hiện thực hóa mục tiêu tổng quát, đề tài tập trung giải quyết các mục tiêu kỹ thuật và nghiệp vụ cụ thể sau:", "normal"),
    ("• Xây dựng hệ thống định danh và phân quyền đa người dùng (RBAC): Hiện thực hóa cơ chế quản lý vai trò bảo mật cho 5 nhóm tác nhân (Farmer, Buyer, Driver, Hub Staff, Admin), tích hợp quy trình xác minh danh tính đối tác (KYC) dựa trên giấy phép kinh doanh, mã số vùng trồng (PUC) và chứng nhận VietGAP.", "bullet"),
    ("• Xây dựng phân hệ Chợ sỉ nông sản theo lô thu hoạch (Harvest Lot): Cho phép nhà vườn đăng tải thông tin chi tiết từng đợt thu hoạch (ngày thu hoạch, sản lượng khả dụng, điều kiện bảo quản nhiệt độ, quy cách đóng gói); cung cấp công cụ tìm kiếm, lọc và phân loại sản phẩm nâng cao.", "bullet"),
    ("• Hiện thực hóa cơ chế đàm phán báo giá hai chiều (RFQ Engine): Xây dựng máy trạng thái hữu hạn (State Machine) quản lý quy trình chào giá, trả giá đối ứng (Counter-Offer) nhiều vòng và tự động chuyển đổi thành Hợp đồng kinh tế B2B khi hai bên đạt được thỏa thuận mức giá.", "bullet"),
    ("• Triển khai mô hình Ký quỹ bảo chứng Escrow và Sổ nhật ký kế toán kép (General Ledger): Thiết lập cơ chế thanh toán an toàn gồm cọc 30% bảo chứng để kích hoạt lệnh thu hoạch và thanh toán 70% còn lại sau giao nhận; tự động hóa hệ thống hạch toán kế toán Nợ/Có kiểm soát dòng tiền, phí sàn và đối soát công nợ đối tác.", "bullet"),
    ("• Thiết kế quy trình điều phối logistics chuỗi lạnh hai chặng (Two-Leg Cold Chain Logistics): Số hóa quy trình gom hàng tại vườn (Inbound Pickup) bằng xe tải lạnh, nhập trạm trung chuyển (Hub Inbound), kiểm định chất lượng an toàn thực phẩm (KCS Brix, Nitrat, thuốc BVTV), quản lý kho lạnh theo nguyên tắc FEFO (First-Expired, First-Out), và điều phối chuyến giao chặng cuối (Outbound Delivery) kèm biên bản ký nhận điện tử ePOD.", "bullet"),
    ("• Ứng dụng Trí tuệ nhân tạo (Google Gemini AI & pgvector): Xây dựng trợ lý ảo AI hỗ trợ nhà vườn tư vấn kỹ thuật canh tác, chẩn đoán sâu bệnh và phân tích xu hướng giá cả thị trường; hiện thực hóa cơ chế tìm kiếm lai (Hybrid Search) kết hợp Full-Text Search và Vector Similarity Search trên PostgreSQL.", "bullet"),

    ("1.3. Đối tượng và Phạm vi nghiên cứu", "h2"),
    
    ("1.3.1. Đối tượng nghiên cứu", "h3"),
    ("• Quy trình nghiệp vụ chuỗi cung ứng nông sản tươi sống B2B: Nghiệp vụ đàm phán hợp đồng thương mại bán sỉ, quy trình đặt cọc bảo chứng Escrow và cơ chế giải quyết tranh chấp bồi thường hàng hóa hư hỏng.", "bullet"),
    ("• Kiến trúc phần mềm Full-stack hiện đại: Mô hình phân tách độc lập Frontend (Next.js/ReactJS) và Backend (Java Spring Boot RESTful API) theo kiến trúc Client-Server định hướng vi dịch vụ (Micro-kernel).", "bullet"),
    ("• Công nghệ lưu trữ và tìm kiếm dữ liệu: Cơ sở dữ liệu quan hệ PostgreSQL 16, công cụ di chuyển lược đồ Flyway và tiện ích mở rộng pgvector phục vụ tìm kiếm vector ngữ nghĩa.", "bullet"),

    ("1.3.2. Phạm vi hệ thống", "h3"),
    ("• Nền tảng ứng dụng: Ứng dụng web hoạt động trên môi trường trình duyệt đa nền tảng (Desktop, Laptop, Tablet và Mobile Web) thông qua thiết kế giao diện đáp ứng (Responsive Web Design).", "bullet"),
    ("• Phân hệ người dùng: Hệ thống cung cấp bảng điều khiển chuyên biệt cho từng vai trò, bao gồm Portal Nhà Vườn (Farmer Console), Portal Thương Lái (Buyer Console), Bảng điều phối Đội xe & Kho bãi (Dispatch Console) và Bảng quản trị trung tâm (Admin Management Console).", "bullet"),
    ("• Phạm vi nghiệp vụ: Tập trung vào thị trường nông sản rau củ quả tươi sống nội địa Việt Nam, đáp ứng các tiêu chuẩn thực hành nông nghiệp tốt (VietGAP) và quy chuẩn an toàn vệ sinh thực phẩm quốc gia.", "bullet"),

    ("1.3.3. Giới hạn đề tài", "h3"),
    ("• Đề tài tập trung xây dựng nền tảng ứng dụng Web tiêu chuẩn, không phát triển ứng dụng di động độc lập (Native Mobile App iOS/Android).", "bullet"),
    ("• Về mặt thanh toán và tài chính: Hệ thống tích hợp cơ chế đối soát thanh toán chuyển khoản tự động qua mã VietQR và webhook xác nhận giao dịch ngân hàng (SePay API); các nghiệp vụ ký quỹ tài khoản trung gian của tổ chức tín dụng được vận hành dựa trên mô hình dữ liệu kế toán kép nội bộ của sàn.", "bullet"),
    ("• Về thiết bị phần cứng IoT: Hệ thống thiết lập đầy đủ lược đồ cơ sở dữ liệu và API tiếp nhận dữ liệu telemetry cảm biến nhiệt độ/độ ẩm theo thời gian thực; trong phạm vi đồ án học phần, dữ liệu giám sát hành trình xe lạnh được mô phỏng theo kịch bản vận hành thực tế.", "bullet"),

    ("1.4. Yêu cầu hệ thống", "h2"),
    
    ("1.4.1. Yêu cầu chức năng (Functional Requirements)", "h3"),
    ("Hệ thống HONA FRESH được thiết kế gồm 6 nhóm phân hệ chức năng chính:", "normal"),
    ("1. Phân hệ Định danh, Xác thực & Quản lý hồ sơ đối tác (Auth & Profile): Hỗ trợ đăng ký, đăng nhập tài khoản an toàn qua JWT Token kết hợp cơ chế HttpOnly Cookie chống tấn công XSS; xác thực qua mã OTP Email; quy trình khai báo hồ sơ doanh nghiệp, kho hàng của Buyer và hồ sơ nông trại, chứng chỉ VietGAP của Farmer; Admin xét duyệt KYC trước khi đối tác được phép giao dịch chính thức.", "normal"),
    ("2. Phân hệ Chợ sỉ nông sản & Đàm phán RFQ (Marketplace & RFQ Engine): Cho phép Farmer đăng bán lô hàng thu hoạch (Harvest Lot) với đầy đủ thông số kỹ thuật, hình ảnh tải qua Cloudinary; Buyer tìm kiếm, lọc theo vùng trồng, chứng nhận và gửi yêu cầu báo giá (RFQ); hỗ trợ đàm phán trả giá đối ứng (Counter-Offer) nhiều lượt kèm phòng chat thương thảo riêng cho từng lô hàng.", "normal"),
    ("3. Phân hệ Hợp đồng điện tử B2B & Ký quỹ Escrow (Contract & Escrow): Tự động kết xuất Hợp đồng mua bán điện tử khi hai bên đạt được thỏa thuận mức giá; quản lý vòng đời hợp đồng chặt chẽ; ghi nhận tiền cọc bảo chứng 30% Escrow; tự động sinh mã hợp đồng duy nhất và theo dõi điều khoản thực hiện.", "normal"),
    ("4. Phân hệ Điều phối gom hàng tại vườn (Inbound Logistics & Receiving): Farmer cập nhật hình ảnh kiểm chứng bao bì và sẵn sàng thu hoạch; Admin lập lệnh điều phối chuyến xe tải lạnh (Pickup Trip) gom hàng đa điểm tại các vườn; tài xế cân đo tại vườn, ghi nhận nhiệt độ ban đầu và ký biên bản nhận hàng với nông dân.", "normal"),
    ("5. Phân hệ Kiểm định trạm Hub & Giao hàng chặng cuối (Hub QC & Outbound Delivery): Tiếp nhận lô hàng tại trạm Hub trung chuyển; cân tổng và cân bì (Gross/Tare) xác định trọng lượng tịnh; chuyên viên KCS kiểm tra độ ngọt Brix, dư lượng Nitrat, dư lượng thuốc BVTV; lưu trữ kho lạnh theo chuẩn FEFO; điều phối xe tải lạnh giao hàng đến kho của Buyer; thủ kho kiểm đếm và ký nhận trên biên bản giao nhận điện tử ePOD có đính kèm chữ ký cảm ứng và ảnh chụp hiện trường; Buyer thanh toán 70% giá trị còn lại.", "normal"),
    ("6. Phân hệ Quản trị, Kế toán & Trợ lý AI (Admin, Ledger & AI Assistant): Tự động sinh bút toán kế toán kép ghi nhận doanh thu phí sàn và giải ngân 100% tiền hàng cho nhà vườn; báo cáo thống kê dòng tiền; xử lý sự cố đền bù hàng hư hỏng; tích hợp chatbot AI Gemini hỗ trợ nhà vườn phân tích sâu bệnh và tra cứu kỹ thuật.", "normal"),

    ("1.4.2. Yêu cầu phi chức năng (Non-Functional Requirements)", "h3"),
    ("• Hiệu năng và khả năng phản hồi: Thời gian xử lý và phản hồi của các REST API trung bình dưới 250ms đối với các tác vụ truy vấn dữ liệu thông thường. Trang chủ và trang danh mục sản phẩm có thời gian tải trang ban đầu (First Contentful Paint) dưới 1.5 giây.", "bullet"),
    ("• Tính bảo mật và an toàn dữ liệu: Mật khẩu người dùng được băm một chiều an toàn bằng thuật toán BCrypt với độ dài muối (salt) đạt chuẩn; hệ thống phân quyền kép (kiểm tra Role tại Security Filter và kiểm tra quyền sở hữu đối tượng Object-level Ownership tại Service); bảo vệ toàn diện chống lại các lỗ hổng phổ biến (SQL Injection, CSRF, XSS, Broken Object Level Authorization).", "bullet"),
    ("• Tính toàn vẹn và nhất quán dữ liệu (Data Integrity): Sử dụng triệt để cơ chế Transactional trên cơ sở dữ liệu quan hệ PostgreSQL; đảm bảo tính toàn vẹn giao dịch ACID tuyệt đối trong các thao tác trừ sản lượng khả dụng của lô hàng, khởi tạo hợp đồng và hạch toán dòng tiền cọc Escrow, ngăn chặn triệt để tình trạng Race Condition khi nhiều Buyer cùng tranh mua một lô hàng.", "bullet"),
    ("• Khả năng mở rộng và bảo trì (Maintainability & Scalability): Kiến trúc mã nguồn được phân tách rõ ràng theo nguyên lý SOLID; Backend tổ chức theo cấu trúc phân lớp Controller - Service - Repository; Frontend áp dụng cấu trúc module hóa component tái sử dụng; toàn bộ thay đổi cấu trúc bảng cơ sở dữ liệu được quản lý đồng bộ bằng Flyway Migration.", "bullet"),
    ("• Tính khả dụng và tương thích (Usability & Compatibility): Giao diện người dùng thân thiện, trực quan, tuân thủ bảng mã màu công nghiệp chuẩn; tương thích hoàn hảo trên các trình duyệt hiện đại phổ biến (Google Chrome, Microsoft Edge, Mozilla Firefox, Safari).", "bullet"),

    ("1.5. Phương pháp nghiên cứu và Cấu trúc khóa luận", "h2"),
    
    ("1.5.1. Phương pháp nghiên cứu", "h3"),
    ("Đề tài áp dụng kết hợp các phương pháp nghiên cứu khoa học kỹ thuật phần mềm tiên tiến:", "normal"),
    ("• Phương pháp nghiên cứu lý thuyết: Tìm hiểu các tài liệu kỹ thuật chuyên sâu về tiêu chuẩn chất lượng nông nghiệp VietGAP (TCVN 11892-1:2017), nguyên lý vận hành chuỗi lạnh (Cold Chain), các quy chuẩn thiết kế hệ thống thương mại điện tử B2B và mô hình thanh toán ký quỹ Escrow.", "bullet"),
    ("• Phương pháp phân tích và thiết kế hệ thống: Ứng dụng phương pháp phân tích thiết kế hướng đối tượng (OOAD) kết hợp ngôn ngữ mô hình hóa UML (Use Case Diagram, Sequence Diagram, Activity Diagram, Entity-Relationship Diagram) để đặc tả chi tiết toàn bộ các luồng nghiệp vụ và cấu trúc thực thể dữ liệu.", "bullet"),
    ("• Phương pháp phát triển phần mềm Agile/Scrum: Triển khai dự án theo mô hình lặp và tăng trưởng (Iterative & Incremental); liên tục tích hợp, kiểm thử và tối ưu hóa từng phân hệ chức năng từ giai đoạn khảo sát, thiết kế cơ sở dữ liệu đến khi hoàn thiện hệ thống.", "bullet"),

    ("1.5.2. Cấu trúc báo cáo đồ án", "h3"),
    ("Báo cáo đồ án khóa luận được tổ chức thành 5 chương với nội dung chi tiết như sau:", "normal"),
    ("• CHƯƠNG 1: GIỚI THIỆU TỔNG QUAN ĐỀ TÀI — Trình bày bối cảnh nghiên cứu, tính cấp thiết của đề tài, các mục tiêu nghiên cứu, đối tượng, phạm vi giới hạn và yêu cầu hệ thống.", "normal"),
    ("• CHƯƠNG 2: CƠ SỞ LÝ THUYẾT VÀ CÔNG NGHỆ ÁP DỤNG — Khảo sát nền tảng kiến trúc Client-Server, phân tích chuyên sâu các công nghệ Frontend (ReactJS, Next.js, TypeScript), Backend (Java, Spring Boot, Spring Security, JPA), Hệ quản trị CSDL (PostgreSQL, Flyway), Trí tuệ nhân tạo (Gemini AI, pgvector) và lý thuyết nghiệp vụ logistics chuỗi lạnh B2B.", "normal"),
    ("• CHƯƠNG 3: PHÂN TÍCH VÀ THIẾT KẾ HỆ THỐNG — Mô tả chi tiết sơ đồ Use Case tổng quát, ma trận phân quyền tác nhân, sơ đồ tuần tự (Sequence Diagram) các quy trình cốt lõi và thiết kế lược đồ cơ sở dữ liệu quan hệ (ERD).", "normal"),
    ("• CHƯƠNG 4: HIỆN THỰC HỆ THỐNG VÀ KIỂM THỬ — Giới thiệu chi tiết giao diện các phân hệ chính, minh chứng chức năng hoạt động thực tế trên hệ thống và báo cáo kết quả kiểm thử (Test Cases).", "normal"),
    ("• CHƯƠNG 5: KẾT LUẬN VÀ HƯỚNG PHÁT TRIỂN — Đánh giá các kết quả đạt được so với mục tiêu đề ra ban đầu, nêu rõ các hạn chế còn tồn tại và đề xuất các hướng phát triển nâng cấp trong tương lai.", "normal")
]
