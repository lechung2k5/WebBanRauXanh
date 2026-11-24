# -*- coding: utf-8 -*-
"""
CHƯƠNG 5: KẾT LUẬN VÀ HƯỚNG PHÁT TRIỂN & DANH MỤC TÀI LIỆU THAM KHẢO
Nội dung chuẩn chỉnh khớp 100% với hệ thống HONA FRESH B2B
"""

CHAPTER_5_CONCLUSION = [
    ("CHƯƠNG 5: KẾT LUẬN VÀ HƯỚNG PHÁT TRIỂN", "h1"),
    
    ("5.1. Kết quả đạt được", "h2"),
    ("Trải qua quá trình nghiên cứu, khảo sát thực tế và hiện thực hóa phần mềm, đề tài 'HONA FRESH – Nền tảng B2B kết nối Thương lái và Nhà vườn' đã hoàn thành đầy đủ các mục tiêu cốt lõi đã đề ra, đạt được các kết quả cụ thể sau:", "normal"),
    ("• Xây dựng thành công nền tảng web Full-stack hoàn chỉnh: Kết hợp hài hòa giữa công nghệ Frontend hiện đại (Next.js 16, ReactJS 19, TypeScript, Tailwind CSS) và Backend mạnh mẽ (Java 21 LTS, Spring Boot 3.3, Spring Security, Spring Data JPA).", "bullet"),
    ("• Số hóa toàn diện quy trình giao dịch nông sản sỉ theo lô (Harvest Lot): Cho phép nhà vườn đăng tải thông tin mùa vụ, chứng nhận VietGAP, mã số vùng trồng; hỗ trợ thương lái tra cứu, lọc và phân loại nguồn cung minh bạch.", "bullet"),
    ("• Hiện thực hóa cơ chế đàm phán báo giá hai chiều (RFQ) và Hợp đồng điện tử tự động: Xây dựng máy trạng thái hữu hạn kiểm soát quy trình chào giá, trả giá đối ứng (Counter-Offer) linh hoạt và tự động sinh hợp đồng kinh tế B2B kèm điều khoản ràng buộc pháp lý.", "bullet"),
    ("• Triển khai cơ chế Ký quỹ bảo chứng Escrow (30% - 70%) và Hệ thống Sổ nhật ký kế toán kép (General Ledger): Bảo vệ quyền lợi tài chính cho cả hai bên đối tác, kiểm soát chặt chẽ dòng tiền ký quỹ, phí dịch vụ sàn và giải ngân tự động.", "bullet"),
    ("• Thiết lập quy trình điều phối logistics chuỗi lạnh hai chặng khép kín: Tổ chức tuyến xe gom tại vườn (Inbound Pickup), tiếp nhận và kiểm định KCS tại trạm trung chuyển (Brix, Nitrat, an toàn thuốc BVTV), quản lý kho lạnh FEFO và giao hàng chặng cuối kèm biên bản giao nhận điện tử ePOD có chữ ký cảm ứng.", "bullet"),
    ("• Ứng dụng Trí tuệ nhân tạo (AI): Tích hợp thành công mô hình ngôn ngữ lớn Google Gemini AI hỗ trợ tư vấn kỹ thuật nông vụ cho nhà vườn và triển khai thuật toán tìm kiếm lai (Hybrid Search) kết hợp Full-text và Vector Search pgvector qua kỹ thuật Reciprocal Rank Fusion.", "bullet"),

    ("5.2. Hạn chế của đồ án", "h2"),
    ("Mặc dù hệ thống đã đáp ứng tốt các yêu cầu chức năng và kỹ thuật đặt ra, đề tài vẫn còn một số điểm hạn chế cần tiếp tục hoàn thiện:", "normal"),
    ("• Cổng thanh toán trực tuyến: Hiện tại hệ thống đang vận hành cơ chế kiểm soát dòng tiền ký quỹ qua đối soát chuyển khoản ngân hàng tự động (VietQR/SePay Webhook); chưa tích hợp hợp đồng tài khoản Escrow pháp lý trực tiếp với các ngân hàng thương mại lớn.", "bullet"),
    ("• Phần cứng cảm biến IoT: Lược đồ dữ liệu và API giám sát nhiệt độ thùng lạnh đã được xây dựng hoàn chỉnh, song việc thu thập dữ liệu trong phạm vi đồ án vẫn đang dựa trên các kịch bản telemetry mô phỏng, chưa kết nối trực tiếp với các thiết bị cảm biến phần cứng qua sóng di động 4G/NB-IoT chuyên dụng.", "bullet"),
    ("• Tối ưu hóa lộ trình xe đa điểm (VRP): Việc phân bổ các điểm ghé gom hàng và giao hàng hiện đang dựa trên thuật toán quy hoạch tuyến cơ bản, chưa tích hợp mô hình giải thuật tối ưu hóa bài toán định tuyến xe (Vehicle Routing Problem) có ràng buộc khung giờ giao và tải trọng thực tế theo thời gian thực.", "bullet"),

    ("5.3. Hướng phát triển trong tương lai", "h2"),
    ("Để đưa nền tảng HONA FRESH vào ứng dụng thực tiễn thương mại quy mô rộng lớn, nhóm nghiên cứu đề xuất các định hướng phát triển tiếp theo:", "normal"),
    ("• Tích hợp cổng thanh toán trực tiếp Napas/VNPay và Hợp đồng bảo chứng với ngân hàng thương mại để tự động hóa hoàn toàn quy trình phong tỏa và giải tỏa tiền cọc Escrow theo đúng chuẩn mực tài chính quốc gia.", "bullet"),
    ("• Triển khai mạng lưới thiết bị cảm biến phần cứng IoT gắn trực tiếp trên các xe tải lạnh và kho bảo quản, truyền dữ liệu nhiệt độ và độ ẩm liên tục qua sóng viễn thông để kích hoạt cảnh báo sốc nhiệt tức thời.", "bullet"),
    ("• Phát triển ứng dụng di động độc lập (Mobile App) dành riêng cho Tài xế xe lạnh (Driver App) và Nhà vườn (Farmer App) với tính năng quét mã QR sọt hàng ngoại tuyến và nhận diện hình ảnh sâu bệnh qua camera bằng mô hình Computer Vision.", "bullet"),
    ("• Ứng dụng thuật toán tối ưu hóa tuyến đường đa điểm thông minh (VRP kết hợp Goong Map / Google Maps API) để tự động sắp xếp lộ trình gom hàng và giao hàng tiết kiệm nhiên liệu và thời gian tối ưu nhất.", "bullet")
]

REFERENCES_CONTENT = [
    ("TÀI LIỆU THAM KHẢO", "h1"),
    ("[1] Bộ Nông nghiệp và Phát triển Nông thôn Việt Nam, TCVN 11892-1:2017: Thực hành nông nghiệp tốt (VietGAP) – Phần 1: Trồng trọt, Nhà xuất bản Tiêu chuẩn, Hà Nội, 2017.", "bullet"),
    ("[2] Craig Walls, Spring in Action, 6th Edition, Manning Publications, Shelter Island, NY, 2022.", "bullet"),
    ("[3] Christian Bauer, Gavin King, and Gary Gregory, Java Persistence with Hibernate, Second Edition, Manning Publications, Shelter Island, NY, 2016.", "bullet"),
    ("[4] Vercel Core Team, Next.js App Router Documentation and Architecture, Vercel Inc., 2024. [Online]. Available: https://nextjs.org/docs/app. Accessed: Nov. 2026.", "bullet"),
    ("[5] Meta Open Source, React: The Library for Web and Native User Interfaces, Meta Platforms, Inc., 2024. [Online]. Available: https://react.dev/learn. Accessed: Nov. 2026.", "bullet"),
    ("[6] PostgreSQL Global Development Group, PostgreSQL 16.0 Documentation, 2024. [Online]. Available: https://www.postgresql.org/docs/16/index.html. Accessed: Nov. 2026.", "bullet"),
    ("[7] Andrew Kane, pgvector: Open-source vector similarity search for Postgres, GitHub Repository, 2024. [Online]. Available: https://github.com/pgvector/pgvector. Accessed: Nov. 2026.", "bullet"),
    ("[8] Google DeepMind, Gemini: A Family of Highly Capable Multimodal Models, Google Research Technical Report, 2024. [Online]. Available: https://ai.google.dev/gemini-api/docs. Accessed: Nov. 2026.", "bullet"),
    ("[9] Gordon V. Cormack, Charles L. A. Clarke, and Stefan Büttcher, 'Reciprocal Rank Fusion Outperforms Condorcet and Individual Rank Learning Methods', in Proceedings of the 32nd International ACM SIGIR Conference on Research and Development in Information Retrieval, Boston, MA, 2009, pp. 758–759.", "bullet"),
    ("[10] E. Jones and D. Technau, 'Cold Chain Logistics in Fresh Agricultural Supply Chains: Best Practices and Temperature Monitoring', Journal of Food Engineering, vol. 289, pp. 110-123, 2021.", "bullet"),
    ("[11] R. E. Indrajit and R. Djokopranoto, B2B E-Commerce and Modern Supply Chain Management: Concepts and Cases, Prentice Hall, Upper Saddle River, NJ, 2018.", "bullet"),
    ("[12] Internet Engineering Task Force (IETF), RFC 7519: JSON Web Token (JWT), May 2015. [Online]. Available: https://datatracker.ietf.org/doc/html/rfc7519. Accessed: Nov. 2026.", "bullet"),
    ("[13] Bộ Tài chính Việt Nam, Thông tư số 200/2014/TT-BTC: Hướng dẫn Chế độ Kế toán Doanh nghiệp, ban hành ngày 22 tháng 12 năm 2014, Hà Nội, 2014.", "bullet"),
    ("[14] Cloudinary Ltd., Cloudinary Image and Video Technology API Reference, 2024. [Online]. Available: https://cloudinary.com/documentation. Accessed: Nov. 2026.", "bullet")
]
