# -*- coding: utf-8 -*-
"""
CHƯƠNG 2: CƠ SỞ LÝ THUYẾT VÀ CÔNG NGHỆ ÁP DỤNG
Nội dung chi tiết chuẩn khóa luận tốt nghiệp ngành Công nghệ thông tin
"""

CHAPTER_2_CONTENT = [
    ("CHƯƠNG 2: CƠ SỞ LÝ THUYẾT VÀ CÔNG NGHỆ ÁP DỤNG", "h1"),
    ("Chương này tập trung trình bày các nền tảng lý thuyết công nghệ, kiến trúc phần mềm và quy trình nghiệp vụ cốt lõi được ứng dụng để phát triển nền tảng B2B HONA FRESH. Mọi công nghệ được phân tích gắn liền với vai trò thực tế trong hệ thống, chỉ rõ ưu điểm kỹ thuật và nguyên lý vận hành theo các phiên bản công nghệ mới nhất hiện có trong dự án.", "normal"),

    ("2.1. Kiến trúc tổng thể hệ thống (Architecture Overview)", "h2"),
    
    ("2.1.1. Mô hình Client-Server phân tán và Giao thức RESTful API", "h3"),
    ("Hệ thống HONA FRESH được thiết kế theo mô hình kiến trúc phân tán Client-Server hiện đại, phân tách hoàn toàn giữa tầng hiển thị giao diện người dùng (Frontend) và tầng xử lý nghiệp vụ, quản lý dữ liệu trung tâm (Backend). Việc tách biệt này mang lại nhiều lợi thế vượt trội so với các kiến trúc nguyên khối (Monolithic):", "normal"),
    ("• Độc lập trong vòng đời phát triển và triển khai: Đội ngũ phát triển Frontend và Backend có thể làm việc song song dựa trên hợp đồng giao tiếp API (API Contract) đã thống nhất trước, tối ưu hóa quy trình kiểm thử và tự động hóa CI/CD.", "bullet"),
    ("• Tối ưu hóa hiệu năng và trải nghiệm người dùng: Frontend chỉ yêu cầu các dữ liệu thực sự cần thiết dưới định dạng JSON nhẹ, giảm thiểu băng thông mạng và loại bỏ việc render lại toàn bộ trang web từ phía máy chủ.", "bullet"),
    ("• Khả năng mở rộng linh hoạt: Backend đóng vai trò là một RESTful API Server tập trung, sẵn sàng mở rộng hỗ trợ thêm các nền tảng giao diện khác trong tương lai (ứng dụng di động, hệ sinh thái đối tác tích hợp B2B) mà không cần viết lại logic nghiệp vụ.", "bullet"),

    ("2.1.2. Kiến trúc phân lớp chuyên biệt Backend (Layered Architecture)", "h3"),
    ("Tại phía máy chủ, backend Spring Boot áp dụng kiến trúc phân tầng 3 lớp (3-Tier Layered Architecture) kết hợp mô hình Domain-Driven Design (DDD) thu nhỏ, đảm bảo nguyên lý đơn trách nhiệm (Single Responsibility Principle):", "normal"),
    ("1. Tầng Controller (Presentation / API Gateway Layer): Tiếp nhận các yêu cầu HTTP (GET, POST, PUT, PATCH, DELETE), thực hiện kiểm tra bảo mật tiền điều kiện (`@PreAuthorize`), giải mã và ràng buộc dữ liệu đầu vào thông qua các đối tượng Data Transfer Object (DTO) được xác thực bằng Bean Validation, sau đó ủy thác xử lý cho tầng Service và đóng gói kết quả trả về dưới cấu trúc chuẩn `ApiResponse<T>`.", "normal"),
    ("2. Tầng Service (Business Logic Layer): Trái tim của hệ thống, chịu trách nhiệm hiện thực hóa toàn bộ các quy tắc nghiệp vụ nghiệp vụ phức tạp của nền tảng B2B (tính toán cọc Escrow, kiểm tra máy trạng thái RFQ, phân quyền sở hữu đối tượng, quản lý điều phối chuyến xe và hạch toán sổ cái). Toàn bộ các thao tác ghi dữ liệu có tính nguyên tử đều được bảo vệ trong ranh giới giao dịch `@Transactional`.", "normal"),
    ("3. Tầng Repository (Data Access Layer): Sử dụng Spring Data JPA để tương tác với cơ sở dữ liệu quan hệ PostgreSQL. Tầng này chịu trách nhiệm đóng gói các truy vấn dữ liệu phức tạp thông qua JPQL hoặc Native SQL, áp dụng các kỹ thuật tối ưu hóa `JOIN FETCH` để triệt tiêu lỗi N+1 query.", "normal"),

    ("2.2. Công nghệ phát triển Frontend", "h2"),
    
    ("2.2.1. Thư viện ReactJS 19 và Framework Next.js 16 (App Router)", "h3"),
    ("Phần giao diện người dùng của HONA FRESH được xây dựng trên nền tảng ReactJS 19 và framework Next.js phiên bản 16.4 tận dụng kiến trúc App Router tiên tiến nhất:", "normal"),
    ("• Nguyên lý Virtual DOM và Component-based Architecture: React chia nhỏ giao diện thành các thành phần độc lập, tái sử dụng cao. Khi trạng thái dữ liệu (state) thay đổi, thuật toán đối chiếu (Reconciliation) tính toán các thay đổi tối thiểu trên Virtual DOM để cập nhật DOM thật, đảm bảo tốc độ phản hồi cực nhanh.", "normal"),
    ("• Kiến trúc App Router & Server Components: Khác với kiến trúc Pages Router truyền thống, App Router hỗ trợ React Server Components (RSC) cho phép hiển thị các trang nội dung tĩnh trực tiếp từ server, giảm thiểu tối đa kích thước gói JavaScript tải về trình duyệt người dùng.", "normal"),
    ("• Route Handlers đóng vai trò API Gateway (BFF - Backend-For-Frontend): Đường dẫn `/api/backend/[...path]` trong Next.js được sử dụng như một proxy bảo mật trung gian. Route Handler này tự động đính kèm header chống tấn công CSRF (`x-hona-request: 1`), xử lý giải mã và tự động xoay vòng cặp token (Access Token và Refresh Token) được lưu trữ an toàn trong HttpOnly Cookie của trình duyệt, ngăn chặn hoàn toàn nguy cơ rò rỉ token qua mã độc XSS.", "normal"),

    ("2.2.2. Ngôn ngữ TypeScript", "h3"),
    ("Dự án áp dụng 100% ngôn ngữ TypeScript cho mã nguồn Frontend. TypeScript là một tập mẹ có định kiểu tĩnh của JavaScript, mang lại những giá trị cốt lõi:", "normal"),
    ("• Phát hiện lỗi ngay tại thời điểm biên dịch (Compile-time Type Checking): Ngăn ngừa các lỗi phổ biến như truy cập thuộc tính trên đối tượng `undefined` hoặc `null`, sai lệch tên trường dữ liệu JSON nhận về từ Backend.", "bullet"),
    ("• Chuẩn hóa dữ liệu với Interface và Type: Định nghĩa tường minh các cấu trúc nghiệp vụ B2B phức tạp như `HarvestLot`, `RfqNegotiation`, `B2bContract`, `OutboundDeliveryStop` và `Settlement`, giúp mã nguồn tự tài liệu hóa và nâng cao năng suất lập trình thông qua tính năng gợi ý mã (IntelliSense) của IDE.", "bullet"),

    ("2.2.3. Framework giao diện Tailwind CSS và Thư viện Lucide Icons", "h3"),
    ("Giao diện hệ thống được thiết kế theo phong cách hiện đại, tối giản và chuyên nghiệp dành cho ứng dụng doanh nghiệp:", "normal"),
    ("• Tailwind CSS: Framework CSS theo triết lý tiện ích (Utility-first), sử dụng trình biên dịch JIT (Just-In-Time) để chỉ đóng gói các class thực sự được sử dụng vào file CSS sản phẩm cuối cùng, giúp dung lượng stylesheet cực nhẹ (chỉ vài chục kilobyte) và tốc độ tải trang tối ưu.", "bullet"),
    ("• Lucide Icons: Bộ thư viện icon vector SVG nhẹ, sắc nét và đồng bộ, cung cấp hệ thống biểu tượng trực quan cho các thao tác nghiệp vụ phức tạp (trạng thái hợp đồng, xe tải lạnh, biểu đồ KCS, chứng nhận VietGAP).", "bullet"),

    ("2.3. Công nghệ phát triển Backend", "h2"),
    
    ("2.3.1. Ngôn ngữ Java 21 LTS và Framework Spring Boot 3.3", "h3"),
    ("Backend HONA FRESH được xây dựng dựa trên phiên bản Java 21 LTS (Long-Term Support) và framework Spring Boot 3.3.4:", "normal"),
    ("• Java 21 LTS: Tận dụng các tính năng mới đột phá của ngôn ngữ Java hiện đại như Record Classes (rút gọn mã nguồn DTO bất biến), Pattern Matching cho `switch` và `instanceof`, cùng khả năng mở rộng thông lượng xử lý đồng thời với luồng ảo (Virtual Threads).", "bullet"),
    ("• Spring Boot 3.3: Tự động hóa cấu hình (Auto-Configuration) dựa trên các starter dependencies; quản lý vòng đời đối tượng và phụ thuộc thông qua cơ chế Inversion of Control (IoC) và Dependency Injection (DI); quản lý quy trình biên dịch và gói phần mềm tối ưu bằng công cụ Gradle.", "bullet"),

    ("2.3.2. Hệ thống bảo mật Spring Security và Cơ chế xác thực JWT", "h3"),
    ("Hệ thống áp dụng kiến trúc bảo mật không trạng thái (Stateless Security) dựa trên tiêu chuẩn RFC 7519:", "normal"),
    ("• Cấu hình Security Filter Chain: Mọi yêu cầu HTTP đến máy chủ đều phải đi qua chuỗi bộ lọc bảo mật để kiểm tra tính hợp lệ của token trước khi chạm đến tầng Controller.", "normal"),
    ("• Cơ chế JSON Web Token (JWT) kép: Hệ thống sử dụng cặp token gồm Access Token (thời gian sống ngắn, 15 phút) dùng để xác thực nhanh trong từng request, và Refresh Token (thời gian sống dài, 7 ngày) được lưu trữ trong cơ sở dữ liệu để cấp mới Access Token mà không bắt người dùng đăng nhập lại.", "normal"),
    ("• Phân quyền RBAC (Role-Based Access Control): Sử dụng chú thích `@PreAuthorize(\"hasRole('ADMIN')\")` hoặc `@PreAuthorize(\"hasAnyRole('BUYER', 'ADMIN')\")` để kiểm soát chặt chẽ quyền truy cập của từng endpoint. Đồng thời, tầng Service thực hiện kiểm tra quyền sở hữu đối tượng (Object Ownership Validation) đảm bảo Buyer chỉ xem được RFQ/Hợp đồng của chính mình và Farmer chỉ quản lý được các lô hàng do mình tạo ra.", "normal"),

    ("2.3.3. Công nghệ truy xuất dữ liệu Spring Data JPA và Hibernate ORM", "h3"),
    ("Spring Data JPA đóng vai trò lớp trừu tượng hóa trên nền Hibernate ORM để quản lý dữ liệu đối tượng:", "normal"),
    ("• Object-Relational Mapping (ORM): Tự động ánh xạ các class Java Entity sang các bảng cơ sở dữ liệu quan hệ, quản lý các mối quan hệ phức tạp (`@OneToOne`, `@OneToMany`, `@ManyToOne`) một cách trực quan.", "normal"),
    ("• Tối ưu hóa truy vấn và Kiểm soát Transaction: Áp dụng chú thích `@Transactional(readOnly = true)` cho các thao tác đọc nhằm tối ưu hiệu năng bộ nhớ đệm Hibernate; sử dụng các câu lệnh truy vấn có mệnh đề `LEFT JOIN FETCH` để nạp trước các thực thể quan hệ liên quan, triệt tiêu hoàn toàn vấn đề N+1 query và ngoại lệ `LazyInitializationException` khi cấu hình `open-in-view = false`.", "normal"),

    ("2.3.4. Bean Validation và Quản lý ngoại lệ tập trung", "h3"),
    ("• Jakarta Bean Validation: Kiểm soát chặt chẽ tính toàn vẹn của dữ liệu đầu vào ngay tại tầng Controller thông qua các chú thích chuẩn (`@NotNull`, `@NotEmpty`, `@Size`, `@Min`, `@DecimalMin`, `@Pattern`), ngăn chặn các dữ liệu sai lệch gây lỗi logic nghiệp vụ bên dưới.", "bullet"),
    ("• Global Exception Handling: Sử dụng chú thích `@RestControllerAdvice` kết hợp `@ExceptionHandler` để bắt giữ và chuẩn hóa toàn bộ các lỗi phát sinh (ngoại lệ logic, ngoại lệ dữ liệu, ngoại lệ bảo mật 403 Forbidden, 404 Not Found, 400 Bad Request) thành thông báo JSON rõ ràng, thân thiện với người dùng và không để lộ thông tin nhạy cảm của hệ thống.", "bullet"),

    ("2.4. Hệ quản trị Cơ sở dữ liệu và Dịch vụ lưu trữ", "h2"),
    
    ("2.4.1. Hệ quản trị cơ sở dữ liệu quan hệ PostgreSQL 16", "h3"),
    ("PostgreSQL 16 được lựa chọn làm cơ sở dữ liệu trung tâm của HONA FRESH nhờ các ưu thế công nghệ hàng đầu:", "normal"),
    ("• Tính toàn vẹn ACID tuyệt đối: Đảm bảo độ tin cậy giao dịch cao nhất cho các nghiệp vụ tài chính, ký quỹ và hợp đồng thương mại điện tử.", "bullet"),
    ("• Kiểu dữ liệu phong phú: Hỗ trợ mạnh mẽ các kiểu số thực chính xác cao (`NUMERIC(15,2)` cho tiền tệ, `NUMERIC(12,2)` cho khối lượng nông sản), kiểu thời gian có múi giờ (`TIMESTAMPTZ`) và kiểu chuỗi văn bản không giới hạn (`TEXT`).", "bullet"),
    ("• Hệ thống chỉ mục và khóa ngoại: Thiết lập 57 ràng buộc khóa ngoại (Foreign Key Constraints) trên toàn bộ 40 bảng nghiệp vụ, bảo vệ tính toàn vẹn tham chiếu giữa các thực thể; kết hợp chỉ mục B-Tree trên các cột tìm kiếm thường xuyên (`rfq_code`, `contract_code`, `user_id`, `status`).", "bullet"),

    ("2.4.2. Công cụ quản lý tiến hóa cấu trúc CSDL Flyway Migration", "h3"),
    ("Hệ thống sử dụng Flyway để kiểm soát phiên bản mã nguồn cơ sở dữ liệu (Database as Code):", "normal"),
    ("• Đồng bộ hóa môi trường: Toàn bộ các thay đổi về bảng, cột, khóa ngoại và dữ liệu khởi tạo (seed data) được lưu trữ dưới dạng các file script SQL có đánh số phiên bản tuần tự (từ `V1__legacy_schema.sql` đến `V27__create_outbound_delivery_schema.sql`).", "bullet"),
    ("• Khả năng tự động hóa và truy vết: Khi ứng dụng khởi động, Flyway tự động kiểm tra bảng lịch sử `flyway_schema_history` và thực thi các script mới chưa được áp dụng, giúp việc triển khai trên môi trường máy chủ phát triển, kiểm thử hay vận hành luôn hoàn toàn nhất quán và an toàn.", "bullet"),

    ("2.4.3. Dịch vụ lưu trữ đám mây Cloudinary", "h3"),
    ("Hệ thống tích hợp Cloudinary Media API nhằm giải quyết bài toán lưu trữ và tối ưu hóa tài nguyên hình ảnh:", "normal"),
    ("• Quản lý lưu trữ tập trung: Hình ảnh nông sản thực tế, ảnh chứng nhận VietGAP, ảnh minh chứng bao bì thu hoạch và ảnh chữ ký số ePOD được tải trực tiếp lên Cloudinary thông qua backend API an toàn.", "bullet"),
    ("• Tối ưu hóa phân phối nội dung (CDN): Cloudinary tự động nén dung lượng ảnh, chuyển đổi định dạng WebP hiện đại và cung cấp mạng lưới CDN phân tán tốc độ cao, giảm tải tối đa cho máy chủ ứng dụng chính.", "bullet"),

    ("2.5. Trí tuệ nhân tạo (AI) và Tìm kiếm ngữ nghĩa (Semantic Search)", "h2"),
    
    ("2.5.1. Nền tảng Google Gemini API (gemini-3.5-flash-lite)", "h3"),
    ("Hệ thống tích hợp mô hình ngôn ngữ lớn (LLM) Google Gemini để xây dựng tính năng Trợ lý ảo nông nghiệp thông minh:", "normal"),
    ("• Tối ưu tốc độ và chi phí: Sử dụng phiên bản mô hình `gemini-3.5-flash-lite` mang lại tốc độ phản hồi cực nhanh, độ trễ thấp và chi phí tối ưu cho các tác vụ hỏi đáp tương tác thời gian thực.", "bullet"),
    ("• Prompt Engineering chuyên biệt: Hệ thống thiết lập System Prompt chuyên sâu về nông nghiệp Việt Nam, định hướng mô hình đóng vai trò là chuyên gia tư vấn kỹ thuật canh tác VietGAP, nhận diện sâu bệnh và phân tích chu kỳ giá nông sản cho nhà vườn.", "bullet"),

    ("2.5.2. Vector Embeddings và Tiện ích mở rộng pgvector", "h3"),
    ("Để hỗ trợ tìm kiếm nông sản thông minh theo ngữ cảnh người dùng, hệ thống sử dụng công nghệ tìm kiếm vector:", "normal"),
    ("• Mô hình nhúng ngôn ngữ (Embedding Model): Sử dụng mô hình `gemini-embedding-001` để chuyển đổi tiêu đề, mô tả và thuộc tính của nông sản thành các vector đặc trưng trong không gian 768 chiều (768-dimensional dense vectors).", "bullet"),
    ("• Tiện ích pgvector trên PostgreSQL: Cho phép lưu trữ trực tiếp các vector nhúng trong cột dữ liệu và tính toán khoảng cách độ tương đồng cosine (Cosine Distance `<=>`) trực tiếp bằng ngôn ngữ SQL với tốc độ truy vấn cao.", "bullet"),

    ("2.5.3. Thuật toán tìm kiếm lai (Hybrid Search) với kỹ thuật Reciprocal Rank Fusion (RRF)", "h3"),
    ("Thay vì chỉ dựa vào tìm kiếm từ khóa hoặc chỉ dựa vào tìm kiếm vector đơn lẻ, hệ thống triển khai kiến trúc Tìm kiếm lai (Hybrid Search):", "normal"),
    ("• Kết hợp đa nguồn: Thuật toán thực hiện đồng thời hai nhánh truy vấn: (1) Truy vấn Full-Text Search truyền thống bằng từ khóa SQL và (2) Truy vấn tương đồng vector ngữ nghĩa bằng pgvector.", "bullet"),
    ("• Kỹ thuật Reciprocal Rank Fusion (RRF): Kết hợp bảng xếp hạng của hai nhánh kết quả dựa trên công thức tính điểm chuẩn khoa học:", "bullet"),
    ("RRF_Score(d) = \\sum_{m \\in M} \\frac{1}{k + r_m(d)}", "normal"),
    ("Trong đó $M$ là tập hợp các phương pháp xếp hạng, $r_m(d)$ là thứ hạng của tài liệu $d$ trong phương pháp $m$, và $k$ là hằng số chuẩn hóa (được hệ thống thiết lập bằng 60). Kỹ thuật này giúp sản phẩm vừa khớp chính xác tên gọi từ khóa, vừa bám sát ngữ cảnh tìm kiếm của thương lái (ví dụ: tìm 'rau sạch ăn lá không đắng' vẫn trả về 'xà lách mỡ VietGAP').", "normal"),

    ("2.6. Lý thuyết Nghiệp vụ Chuỗi cung ứng B2B Nông sản và Logistics Chuỗi lạnh", "h2"),
    
    ("2.6.1. Quy trình đàm phán báo giá (RFQ) và Máy trạng thái hữu hạn", "h3"),
    ("Quy trình đàm phán trong thương mại bán buôn nông sản được mô hình hóa bằng máy trạng thái hữu hạn (Finite State Machine - FSM):", "normal"),
    ("• Vòng đời trạng thái RFQ: Khởi đầu bằng `WAITING_FARMER` khi thương lái gửi đề nghị mua; chuyển sang `WAITING_BUYER` khi nhà vườn đưa ra mức giá đối ứng (Counter-Offer); kết thúc bằng `ACCEPTED` khi hai bên đồng thuận mức giá hoặc `REJECTED` khi không đạt được thỏa thuận.", "bullet"),
    ("• Ràng buộc thời gian (Expiration): Mỗi lượt trả giá có thời hạn phản hồi mặc định là 24 giờ. Nếu quá hạn, hệ thống tự động chuyển trạng thái sang `EXPIRED` để giải phóng sản lượng nông sản cho các thương lái khác đàm phán.", "bullet"),

    ("2.6.2. Cơ chế Ký quỹ bảo chứng Escrow và Sổ nhật ký chung (General Ledger)", "h3"),
    ("Để giải quyết bài toán niềm tin trong giao dịch B2B số lượng lớn, HONA FRESH xây dựng cơ chế ký quỹ thông minh:", "normal"),
    ("• Quy tắc đặt cọc 30% bảo chứng: Khi hợp đồng được tạo, Buyer phải thanh toán khoản tiền cọc 30% giá trị hợp đồng vào tài khoản trung gian của sàn để kích hoạt lệnh thu hoạch. Khoản tiền này đảm bảo nhà vườn chắc chắn có người mua khi tiến hành cắt trĩu vườn.", "bullet"),
    ("• Thanh toán 70% và Giải ngân: Sau khi nhận hàng và ký ePOD thành công, Buyer thanh toán nốt 70% còn lại. Sàn tiến hành khấu trừ tỷ lệ phí nền tảng (3%) và giải ngân 100% doanh thu sạch cho nhà vườn.", "bullet"),
    ("• Hệ thống kế toán kép (General Ledger): Hệ thống tự động sinh các dòng bút toán Nợ (Debit) và Có (Credit) cân bằng tuyệt đối vào bảng `gl_journal_lines`, sử dụng mã tài khoản theo chuẩn kế toán Việt Nam (Tài khoản 112: Tiền gửi ngân hàng; Tài khoản 3388: Tiền ký quỹ giữ hộ; Tài khoản 5113: Doanh thu phí dịch vụ sàn; Tài khoản 3331: Thuế GTGT phải nộp).", "bullet"),

    ("2.6.3. Kiểm định chất lượng KCS và Nguyên tắc quản lý kho lạnh FEFO", "h3"),
    ("• Quy chuẩn kiểm định KCS tại trạm trung chuyển (Hub QC): Nông sản khi nhập trạm Hub được chuyên viên kiểm định đánh giá qua các chỉ số định lượng: độ ngọt khúc xạ quang học (Brix), hàm lượng dư lượng phân bón Nitrat ($NO_3^-$ ppm) và kiểm tra định tính an toàn thuốc bảo vệ thực vật. Các chỉ số này quyết định tỷ lệ hàng đạt chuẩn loại 1 (Grade 1 Ratio) của lô hàng.", "bullet"),
    ("• Nguyên tắc quản lý kho lạnh FEFO (First-Expired, First-Out): Hệ thống sắp xếp các sọt hàng vào từng vị trí Rack/Bin trong kho lạnh, ưu tiên xuất các lô hàng có hạn sử dụng gần hơn ra các chuyến xe giao chặng cuối, giảm thiểu tối đa tỷ lệ suy giảm phẩm chất và hao hụt tự nhiên của rau xanh.", "bullet"),

    ("2.6.4. Logistics chuỗi lạnh (Cold Chain) và Biên bản giao nhận điện tử ePOD", "h3"),
    ("• Chuỗi lạnh khép kín (Cold Chain): Hệ thống giám sát nhiệt độ bảo quản nghiêm ngặt từ khâu thu hoạch tại vườn ($18°C - 22°C$), xe tải lạnh gom hàng ($4°C - 8°C$), kho lạnh trạm Hub ($2°C - 6°C$) đến xe tải lạnh giao hàng chặng cuối, đảm bảo rau củ luôn giữ được độ tươi ngon và hàm lượng vi chất.", "bullet"),
    ("• Biên bản giao nhận điện tử ePOD (Electronic Proof of Delivery): Thay thế hoàn toàn chứng từ giấy tờ truyền thống. Tại điểm giao nhận kho của Buyer, tài xế và thủ kho tiến hành cân thực tế, ghi nhận khối lượng đạt chuẩn, khối lượng hao hụt/hư hỏng, đính kèm ảnh chụp hiện trường và chữ ký cảm ứng trực tiếp trên màn hình, tạo căn cứ pháp lý minh bạch cho bước quyết toán tài chính cuối cùng.", "bullet")
]
