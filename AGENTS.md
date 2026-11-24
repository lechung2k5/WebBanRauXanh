# DEVELOPMENT RULES — HONA FRESH

> **PROJECT:** HONA FRESH  
> **DESCRIPTION:** Nền tảng B2B kết nối Thương lái và Nhà vườn  
> **ARCHITECTURE:** Full-stack Web Application  
> **LANGUAGE:** Vietnamese  
> **PRIORITY:** Performance, Code Quality, Resource Optimization & Controlled Execution

---

## 1. PROJECT CONTEXT — BỐI CẢNH DỰ ÁN

### 1.1. Tổng quan hệ thống

**HONA FRESH** là nền tảng thương mại B2B kết nối trực tiếp giữa Thương lái và Nhà vườn, hỗ trợ tìm kiếm nguồn cung nông sản, đăng bán sản phẩm, quản lý giao dịch và tối ưu hóa quy trình kết nối giữa các bên.

Hệ thống hướng đến môi trường kinh doanh thực tế, yêu cầu tính ổn định, khả năng mở rộng, bảo mật và trải nghiệm người dùng chuyên nghiệp.

### 1.2. Công nghệ sử dụng

**Frontend**
- ReactJS.
- JavaScript / TypeScript (theo cấu hình hiện tại của dự án).
- Tailwind CSS / CSS (theo cấu trúc hiện có).
- Lucide Icons.
- REST API Integration.

**Backend**
- Java Spring Boot.
- Spring Web / Spring MVC.
- Spring Data JPA / Hibernate (nếu dự án đang sử dụng).
- Spring Security (nếu được tích hợp).
- RESTful API.
- Database theo cấu hình hiện tại của dự án.

**Nguyên tắc:**
- Không tự ý thay đổi công nghệ hoặc kiến trúc hiện tại.
- Không tự ý thêm thư viện hoặc dependency mới.
- Ưu tiên tận dụng các thư viện, component, service và cấu trúc đã có.

### 1.3. Ngôn ngữ giao tiếp

- Giao tiếp bằng tiếng Việt.
- Ngắn gọn, chính xác, tập trung vào vấn đề.
- Sử dụng thuật ngữ chuyên ngành phù hợp với phát triển phần mềm và nghiệp vụ B2B.
- Tên biến, hàm, class, API và database tuân thủ quy ước hiện có của dự án.

---

## 2. RESOURCE OPTIMIZATION — TỐI ƯU TÀI NGUYÊN

**Mục tiêu:** Bảo vệ RAM, CPU và giảm tối đa các tác vụ không cần thiết trên máy cấu hình yếu.

### 2.1. Kiểm soát Terminal

TUYỆT ĐỐI KHÔNG tự ý thực thi các lệnh có khả năng tiêu tốn nhiều tài nguyên:

- Khởi động Frontend: `npm run dev`, `npm start`, `vite`.
- Khởi động Backend: `mvn spring-boot:run`, `gradlew bootRun`.
- Build: `npm run build`, `mvn package`, `gradle build`.
- Test: `jest`, `vitest`, `mvn test`, `gradle test`.
- Các lệnh khởi chạy Docker hoặc nhiều service cùng lúc.

Chỉ thực hiện khi người dùng yêu cầu rõ ràng.

### 2.2. Cấm tác vụ nền

- Không tự ý chạy process watch liên tục.
- Không khởi chạy daemon hoặc background task.
- Không chạy polling không cần thiết.
- Không tự động khởi động nhiều service.
- Không quét toàn bộ ổ cứng hoặc thư mục dependency.

### 2.3. Kiểm soát lệnh thực thi

Khi cần chạy lệnh terminal:
1. Giải thích mục đích.
2. Nêu rõ lệnh sẽ thực thi.
3. Đánh giá tác động đến RAM, CPU và dữ liệu.
4. Xin xác nhận trước khi thực hiện.

Ưu tiên cung cấp câu lệnh để người dùng tự chạy thủ công.

### 2.4. Static Analysis First

Ưu tiên đọc và phân tích code tĩnh trước khi chạy thử.

- Kiểm tra luồng dữ liệu.
- Kiểm tra logic nghiệp vụ.
- Kiểm tra kiểu dữ liệu.
- Kiểm tra cấu trúc API.
- Kiểm tra quan hệ giữa Frontend và Backend.
- Dự đoán tác động của thay đổi đến các module liên quan.

---

## 3. CODE SCOPE — KIỂM SOÁT PHẠM VI

### 3.1. Local Scope Only

Chỉ đọc và chỉnh sửa những file có liên quan trực tiếp đến yêu cầu.

Không:
- Quét toàn bộ repository.
- Đọc toàn bộ source code khi không cần thiết.
- Phân tích thư mục `node_modules`, `target`, `build` hoặc các thư mục sinh tự động.
- Tự ý mở rộng phạm vi chỉnh sửa sang module khác.

Nếu phát hiện dependency giữa các module, chỉ mở rộng phạm vi khi thực sự cần thiết.

### 3.2. Không sinh file rác

- Không tạo file log hoặc file debug tạm.
- Không tạo bản sao backup không cần thiết.
- Không tạo file test ngoài phạm vi yêu cầu.
- Không tạo tài liệu phát sinh không được yêu cầu.

**Ngoại lệ:** File kế hoạch Markdown (`.md`) là bắt buộc đối với task phức tạp theo quy định tại Mục 4.

### 3.3. Code Modification

- Giữ nguyên coding convention hiện tại.
- Tái sử dụng component, hook, service và repository đã có.
- Không tự ý refactor những phần không liên quan.
- Không thay đổi API contract nếu không có yêu cầu hoặc lý do kỹ thuật rõ ràng.
- Không sử dụng `any` tùy tiện trong TypeScript.
- Không tạo code trùng lặp khi có thể tái sử dụng logic hiện tại.

---

## 4. TASK CLASSIFICATION — PHÂN LOẠI CÔNG VIỆC

Đây là quy tắc quan trọng nhất trong quy trình phát triển HONA FRESH.

Mọi yêu cầu phải được phân loại trước khi thực hiện.

### 4.1. SIMPLE TASK — TASK ĐƠN GIẢN

Được phép bắt tay vào phân tích và thực hiện ngay, không cần lập kế hoạch hoặc xin xác nhận trước.

Ví dụ:

- Sửa lỗi chính tả, nội dung hiển thị.
- Thay đổi màu sắc, font chữ, kích thước, khoảng cách.
- Điều chỉnh CSS hoặc Tailwind.
- Chỉnh sửa giao diện component hiện có.
- Sửa lỗi một hàm có nguyên nhân rõ ràng.
- Đổi tên biến, hàm hoặc cập nhật một điều kiện logic đơn giản.
- Điều chỉnh validation đơn giản.
- Sửa lỗi mapping dữ liệu đã xác định được nguyên nhân.

**Điều kiện:**
- Phạm vi thay đổi nhỏ.
- Không ảnh hưởng đến kiến trúc hệ thống.
- Không làm thay đổi nghiệp vụ quan trọng.
- Không phát sinh thay đổi lớn giữa Frontend và Backend.

Nếu trong quá trình xử lý phát hiện rủi ro lớn hơn dự kiến, phải dừng và chuyển sang Complex Task.

### 4.2. COMPLEX TASK — TASK PHỨC TẠP

Bắt buộc lập kế hoạch và chờ người dùng phê duyệt trước khi chỉnh sửa.

Ví dụ:

- Xây dựng chức năng nghiệp vụ mới.
- Thêm module quản lý mới.
- Xây dựng quy trình giao dịch B2B.
- Thay đổi cấu trúc Database hoặc quan hệ Entity.
- Thay đổi kiến trúc Backend.
- Tích hợp API mới giữa Frontend và Backend.
- Thay đổi Authentication / Authorization.
- Xây dựng hệ thống phân quyền.
- Thay đổi luồng xử lý đơn hàng hoặc giao dịch.
- Tích hợp thanh toán, thông báo hoặc dịch vụ bên ngoài.
- Refactor nhiều module.
- Thay đổi cấu trúc routing hoặc state management toàn hệ thống.

### 4.3. Nguyên tắc phân loại

Nếu không chắc chắn một task thuộc loại nào:

- Ưu tiên phân tích phạm vi ảnh hưởng.
- Nếu có nguy cơ ảnh hưởng đến dữ liệu, bảo mật hoặc nghiệp vụ thì xếp vào Complex Task.
- Không tự ý coi một thay đổi nghiệp vụ lớn là task đơn giản chỉ vì số lượng file chỉnh sửa ít.

---

## 5. EXECUTION PLAN — QUY TRÌNH LẬP KẾ HOẠCH

Đối với Complex Task, bắt buộc thực hiện theo quy trình dưới đây.

### BƯỚC 1 — ANALYSIS

Tiếp nhận yêu cầu và xác định:

- Mục tiêu nghiệp vụ.
- Đối tượng sử dụng chức năng.
- Luồng hoạt động của người dùng.
- Dữ liệu đầu vào và đầu ra.
- Các module liên quan.
- Phạm vi Frontend.
- Phạm vi Backend.
- Các vấn đề cần làm rõ.

### BƯỚC 2 — FILE INSPECTION

Chỉ đọc các file cần thiết để xác định chính xác vị trí triển khai.

Phải xác định được:

- Component hoặc Page cần chỉnh sửa.
- Hook hoặc Service Frontend liên quan.
- API Controller / REST Endpoint.
- Service xử lý nghiệp vụ Backend.
- Repository / Entity / DTO liên quan.
- Database và quan hệ dữ liệu nếu có thay đổi.

Không được đoán tên file hoặc cấu trúc dự án khi chưa kiểm tra.

### BƯỚC 3 — CREATE MARKDOWN PLAN

Bắt buộc tạo một file kế hoạch có định dạng `.md`.

Tên file gợi ý:

`docs/plans/PLAN_<FEATURE_NAME>.md`

Nếu dự án chưa có thư mục `docs/plans`, cần kiểm tra và lựa chọn vị trí phù hợp, không tự ý tạo thêm cấu trúc tài liệu không cần thiết.

File kế hoạch phải có nội dung:

#### A. Overview
- Tên chức năng.
- Mục tiêu.
- Phạm vi nghiệp vụ.
- Kết quả mong muốn.

#### B. Current Architecture
- Cấu trúc hiện tại có liên quan.
- Các module đang xử lý nghiệp vụ.
- Những thành phần có thể tái sử dụng.

#### C. Implementation Scope

**Frontend**
- Danh sách file dự kiến đọc/sửa/tạo.
- Component hoặc Page.
- Hook, State và API Service.
- UI/UX và validation.
- Trạng thái loading, error, empty và success.

**Backend**
- Danh sách file dự kiến đọc/sửa/tạo.
- Controller / Endpoint.
- Service xử lý nghiệp vụ.
- DTO / Entity / Repository.
- Validation và Exception Handling.
- Authentication / Authorization nếu cần.

**Database**
- Bảng hoặc Entity liên quan.
- Quan hệ dữ liệu.
- Migration nếu cần.
- Rủi ro ảnh hưởng dữ liệu hiện có.

#### D. API Contract

Nếu chức năng có giao tiếp Frontend - Backend, phải mô tả:

- HTTP Method.
- Endpoint.
- Request Parameters / Body.
- Response Structure.
- HTTP Status Codes.
- Quy tắc Authentication / Authorization.
- Validation và Error Response.

Không tạo API mới nếu có thể tận dụng API hiện tại một cách hợp lý.

#### E. Business Flow

Mô tả luồng nghiệp vụ từ thao tác người dùng đến xử lý Backend và phản hồi Frontend.

#### F. Implementation Steps

Danh sách các bước thực hiện theo thứ tự phụ thuộc.

#### G. Risks & Considerations

- Ảnh hưởng đến module khác.
- Tương thích dữ liệu.
- Bảo mật.
- Hiệu năng.
- Khả năng mở rộng.

#### H. Acceptance Criteria

Các điều kiện cụ thể để xác định chức năng hoàn thành.

### BƯỚC 4 — PRESENT PLAN & WAIT

Sau khi hoàn thành file Markdown:

- Phải hiển thị nội dung kế hoạch dưới dạng file `.md` để người dùng có thể xem và tải xuống.
- Không chỉ gửi danh sách kế hoạch dưới dạng tin nhắn thông thường.
- Có thể tóm tắt ngắn gọn các điểm quan trọng trong phần chat.
- Đính kèm file kế hoạch hoàn chỉnh.

**Tại bước này TUYỆT ĐỐI KHÔNG:**
- Chỉnh sửa source code.
- Tạo các file triển khai.
- Thực hiện migration.
- Cài đặt dependency.
- Chạy lệnh terminal.
- Tự ý bắt đầu triển khai một phần chức năng.

Câu xác nhận bắt buộc:

"Bạn có đồng ý với kế hoạch triển khai này không? Vui lòng phản hồi 'Chấp nhận' hoặc cung cấp ý kiến điều chỉnh."

### BƯỚC 5 — EXECUTION

Chỉ bắt đầu triển khai khi người dùng phản hồi đồng ý hoặc yêu cầu tiến hành rõ ràng.

Các từ khóa chấp nhận:

- Accept.
- Chấp nhận.
- OK.
- Đồng ý.
- Tiến hành.
- Bắt đầu thực hiện.

Sau khi được phê duyệt:

1. Tuân thủ đúng phạm vi trong file kế hoạch.
2. Thực hiện theo thứ tự phụ thuộc.
3. Đảm bảo tính đồng bộ giữa Frontend và Backend.
4. Không tự ý mở rộng chức năng.
5. Nếu phát hiện cần thay đổi kiến trúc hoặc phạm vi đã duyệt, phải dừng và xin ý kiến.

---

## 6. FULL-STACK DEVELOPMENT — NGUYÊN TẮC PHÁT TRIỂN FRONTEND & BACKEND

**Mọi chức năng nghiệp vụ phải được xem xét trên toàn bộ luồng hệ thống, không chỉ tập trung vào giao diện.**

### 6.1. Frontend — ReactJS

- Tuân thủ cấu trúc thư mục hiện tại.
- Tách biệt UI Component và Business Logic hợp lý.
- Tái sử dụng component.
- Hạn chế prop drilling không cần thiết.
- Không lạm dụng global state.
- Chỉ sử dụng state management phù hợp với phạm vi chức năng.
- Tối ưu render, tránh re-render không cần thiết.
- Sử dụng lazy loading khi thực sự cần thiết.
- Tối ưu việc gọi API, tránh request trùng lặp.
- Có xử lý loading, error, empty và success.
- Validation phía Frontend chỉ hỗ trợ trải nghiệm người dùng, không thay thế validation Backend.
- Không hardcode dữ liệu nghiệp vụ khi dữ liệu phải lấy từ Backend.

### 6.2. Backend — Spring Boot

- Tuân thủ kiến trúc và package hiện tại.
- Tách biệt Controller, Service, Repository.
- Sử dụng DTO cho request và response khi phù hợp.
- Không đưa toàn bộ nghiệp vụ vào Controller.
- Không trả trực tiếp Entity cho Client nếu gây lộ dữ liệu hoặc phụ thuộc cấu trúc Database.
- Validation đầu vào bằng cơ chế phù hợp của Spring.
- Xử lý Exception tập trung và nhất quán.
- Kiểm tra Authentication và Authorization ở Backend.
- Đảm bảo các thao tác ghi dữ liệu có tính nhất quán.
- Sử dụng Transaction đúng phạm vi.
- Tối ưu truy vấn Database, tránh N+1 Query.
- Phân trang đối với danh sách dữ liệu lớn.
- Không trả dữ liệu thừa cho Frontend.

### 6.3. Frontend - Backend Integration

Khi triển khai một chức năng có liên quan đến cả hai phía:

1. Xác định API Contract trước khi triển khai.
2. Đảm bảo Request và Response thống nhất.
3. Thống nhất kiểu dữ liệu và định dạng ngày giờ.
4. Xử lý đúng HTTP Status Code.
5. Đồng bộ validation và Error Response.
6. Kiểm tra quyền truy cập ở Backend.
7. Đảm bảo Frontend hiển thị đúng dữ liệu trả về.
8. Tránh gọi API liên tục hoặc không có mục đích.

Không được xây dựng giao diện hoàn chỉnh với dữ liệu giả rồi xem đó là chức năng đã hoàn thành nếu nghiệp vụ yêu cầu tích hợp Backend.

### 6.4. Business Logic

HONA FRESH là nền tảng B2B nên phải ưu tiên tính chính xác của nghiệp vụ.

Các nguyên tắc:

- Không tự suy diễn quy tắc nghiệp vụ khi chưa có căn cứ.
- Không tự thay đổi quy trình giao dịch.
- Không tự quyết định công thức tính giá, phí hoặc số lượng.
- Không tự thay đổi trạng thái đơn hàng.
- Phân biệt rõ vai trò Thương lái và Nhà vườn.
- Kiểm tra quyền sở hữu dữ liệu khi thực hiện thao tác.
- Đảm bảo dữ liệu giao dịch nhất quán giữa các bên.

Nếu nghiệp vụ chưa rõ, phải hỏi người dùng trước khi triển khai.

---

## 7. PERFORMANCE OPTIMIZATION — TỐI ƯU HIỆU NĂNG

### 7.1. Frontend

- Tránh re-render không cần thiết.
- Không sử dụng useMemo / useCallback một cách máy móc.
- Tối ưu kích thước component.
- Hạn chế import thư viện lớn nếu chỉ cần một chức năng nhỏ.
- Tối ưu hình ảnh và tài nguyên tĩnh.
- Hạn chế request API dư thừa.
- Debounce các thao tác tìm kiếm phù hợp.
- Phân trang hoặc lazy loading dữ liệu lớn.
- Không tải toàn bộ dữ liệu khi chỉ cần một phần.

### 7.2. Backend

- Tránh truy vấn Database lặp lại.
- Tối ưu JOIN và quan hệ Entity.
- Sử dụng Projection hoặc DTO khi cần.
- Phân trang dữ liệu lớn.
- Tránh xử lý đồng bộ nặng không cần thiết.
- Không tạo Thread hoặc tác vụ nền tùy tiện.
- Không sử dụng Cache nếu chưa xác định được lợi ích và chiến lược invalidation.

### 7.3. Database

- Không truy vấn dữ liệu không cần thiết.
- Chỉ lấy các trường cần sử dụng.
- Đánh giá Index dựa trên truy vấn thực tế.
- Không tự ý thay đổi cấu trúc bảng.
- Không xóa hoặc cập nhật dữ liệu hàng loạt khi chưa có sự đồng ý.

---

## 8. CODE QUALITY & SECURITY

### 8.1. Code Quality

- Không sử dụng `any` tùy tiện.
- Không viết code dư thừa.
- Không tạo hàm quá lớn khi có thể tách hợp lý.
- Không lặp lại logic nghiệp vụ.
- Không tự ý đổi tên hoặc xóa các thành phần đang được sử dụng.
- Giữ nguyên quy ước đặt tên và định dạng hiện tại.
- Ưu tiên code dễ đọc, dễ bảo trì.

### 8.2. Security

- Không lưu mật khẩu dạng plaintext.
- Không hardcode secret, token hoặc API Key.
- Không để lộ thông tin nhạy cảm trong response.
- Kiểm tra quyền truy cập ở Backend.
- Chống truy cập trái phép vào dữ liệu của người dùng khác.
- Không tin tưởng dữ liệu gửi từ Frontend.
- Kiểm tra và validate toàn bộ dữ liệu đầu vào phù hợp với nghiệp vụ.
- Không tự ý thay đổi cấu hình bảo mật hiện tại.

---

## 9. DEPENDENCY & DATABASE CONTROL

### 9.1. Dependency

TUYỆT ĐỐI KHÔNG tự ý:

- Chạy `npm install`.
- Chạy `npm update`.
- Thêm package mới.
- Thay đổi version dependency.
- Thêm Maven Dependency.
- Thay đổi Gradle Dependency.

Nếu thực sự cần thiết:
1. Giải thích lý do.
2. Nêu dependency cần thêm.
3. Đánh giá tác động.
4. Chờ người dùng đồng ý.

### 9.2. Database

- Không tự ý chạy Migration.
- Không tự ý DROP, TRUNCATE hoặc DELETE dữ liệu.
- Không thay đổi Schema ngoài phạm vi đã duyệt.
- Không chạy Seed hoặc Reset Database.
- Phải đánh giá khả năng tương thích dữ liệu hiện có.

---

## 10. GIT CONTROL — KIỂM SOÁT GIT

TUYỆT ĐỐI KHÔNG tự ý:

- `git push`.
- `git push --force`.
- Tạo Pull Request.
- Merge branch.
- Xóa branch.
- Commit code khi chưa được yêu cầu.
- Reset hoặc ghi đè thay đổi của người dùng.

Đặc biệt:
- Không ghi đè code chưa commit.
- Không tự ý loại bỏ thay đổi đang có trong working tree.
- Không thực hiện thao tác Git có nguy cơ mất dữ liệu.

Mọi hoạt động đồng bộ code lên GitHub phải được người dùng cho phép.

---

## 11. TESTING & VERIFICATION

Không tự ý chạy test, build hoặc khởi động ứng dụng.

Ưu tiên kiểm tra tĩnh:

**Frontend**
- Kiểm tra cú pháp.
- Kiểm tra imports.
- Kiểm tra props và types.
- Kiểm tra API mapping.
- Kiểm tra state và event handling.

**Backend**
- Kiểm tra imports.
- Kiểm tra kiểu dữ liệu.
- Kiểm tra DTO mapping.
- Kiểm tra luồng Controller → Service → Repository.
- Kiểm tra Exception Handling.
- Kiểm tra Transaction và quyền truy cập.

**Integration**
- Kiểm tra API Contract.
- Kiểm tra Request / Response.
- Kiểm tra các trạng thái lỗi.
- Kiểm tra tính nhất quán dữ liệu giữa Frontend và Backend.

Sau khi hoàn thành, báo cáo rõ:

- Đã kiểm tra tĩnh những gì.
- Những gì chưa được kiểm chứng bằng thực thi.
- Các lệnh người dùng có thể tự chạy để kiểm tra nếu cần.

Không được tuyên bố chức năng đã test thành công nếu chưa thực sự chạy test.

---

## 12. FINAL REPORT — BÁO CÁO SAU KHI THỰC HIỆN

Sau mỗi task, phản hồi ngắn gọn theo cấu trúc:

### 1. Kết quả
Mô tả chính xác những gì đã hoàn thành.

### 2. Files Changed
Liệt kê file đã tạo, sửa hoặc xóa.

### 3. Frontend
Tóm tắt thay đổi liên quan đến ReactJS nếu có.

### 4. Backend
Tóm tắt thay đổi liên quan đến Spring Boot nếu có.

### 5. Verification
Nêu rõ những gì đã kiểm tra và những gì chưa kiểm tra.

### 6. Manual Commands
Cung cấp lệnh cần thiết để người dùng tự thực hiện nếu có.

**Quy tắc hiển thị code:**
- Không in toàn bộ file dài.
- Chỉ hiển thị đoạn code thay đổi khi cần.
- Ưu tiên diff ngắn gọn.
- Không lặp lại những nội dung đã có trong source code.

---

## 13. CORE PRINCIPLES — NGUYÊN TẮC CỐT LÕI

Mọi hoạt động phát triển HONA FRESH phải tuân thủ các nguyên tắc sau:

1. **Simple Task → Execute Immediately:** Task nhỏ, rõ ràng, ít rủi ro được thực hiện ngay.
2. **Complex Task → Plan First:** Task phức tạp bắt buộc có file kế hoạch Markdown và chờ phê duyệt.
3. **Full-stack Thinking:** Mọi chức năng nghiệp vụ phải xem xét đồng bộ Frontend, Backend, API và Database khi có liên quan.
4. **Local Scope Only:** Chỉ thao tác trên các file thực sự cần thiết.
5. **Resource First:** Bảo vệ RAM và CPU, không tạo tác vụ ngầm.
6. **Static Analysis First:** Ưu tiên phân tích code tĩnh trước khi thực thi.
7. **No Unapproved Changes:** Không tự ý thay đổi kiến trúc, dependency, database hoặc nghiệp vụ.
8. **No Unapproved Git Push:** Không tự ý đẩy code lên GitHub.
9. **Business Accuracy:** Không tự suy diễn nghiệp vụ B2B.
10. **Transparent Reporting:** Báo cáo trung thực, phân biệt rõ việc đã thực hiện và việc chưa kiểm chứng.

> **FINAL DIRECTIVE:**  
> Ưu tiên giải pháp đơn giản, ổn định, tiết kiệm tài nguyên và phù hợp với kiến trúc hiện tại của HONA FRESH. Không over-engineering, không tự ý mở rộng phạm vi và luôn đảm bảo sự đồng bộ giữa Frontend ReactJS và Backend Spring Boot.