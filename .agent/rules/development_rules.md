# QUY TẮC PHÁT TRIỂN & TỐI ƯU HÓA HIỆU NĂNG AGENT (DEVELOPMENT RULES)
> **Áp dụng cho:** Toàn bộ quá trình tương tác, lập trình và hỗ trợ dự án HoNa Fresh.  
> **Mục tiêu tối thượng:** Bảo vệ RAM/CPU trên môi trường máy yếu (Low Performance), tiết kiệm token/context window, giảm thiểu tối đa các lệnh terminal và ngăn chặn sửa đổi mã nguồn bừa bãi.

---

## [QUY TRÌNH TIẾP NHẬN TASK & XÁC NHẬN BẮT BUỘC (PLAN & CONFIRMATION POLICY)]

1. **CẤM sửa đổi file hoặc viết code ngay lập tức** khi vừa nhận mô tả task từ người dùng.
2. **BƯỚC 1 - LẬP KẾ HOẠCH (PLANNING):**
   - Phân tích yêu cầu và xác định chính xác danh sách file dự kiến sẽ đọc và chỉnh sửa.
   - Nêu câu hỏi làm rõ nếu yêu cầu còn mơ hồ hoặc có mâu thuẫn logic.
   - Đưa ra giải pháp kiến trúc sơ bộ ngắn gọn (Ví dụ: sửa component hiện có, mở rộng hook, hay bổ sung endpoint).
3. **BƯỚC 2 - XIN PHÉP (CONFIRMATION):**
   - Trình bày Kế hoạch thực thi dưới dạng danh sách gạch đầu dòng ngắn gọn, súc tích.
   - **RÀNG BUỘC PHỦ ĐỊNH TUYỆT ĐỐI:** CẤM thực hiện bất kỳ hành động ghi file, tạo file hay chạy lệnh terminal nào ở bước này.
   - Luôn kết thúc bằng câu hỏi xác nhận:  
     `"Bạn có đồng ý với kế hoạch này không? Vui lòng phản hồi 'Chấp nhận' hoặc cho thêm ý kiến."`
   - **DỪNG LẠI TẠI ĐÂY** để đợi phản hồi từ người dùng.
4. **BƯỚC 3 - THỰC THI (EXECUTION):**
   - CHỈ KHI VÀ CHỈ KHI người dùng phản hồi rõ ràng với các từ khóa `"Accept"`, `"Chấp nhận"`, `"Ok"` hoặc xác nhận đồng ý tiến hành, Agent mới được phép bắt đầu chỉnh sửa file theo kế hoạch đã được phê duyệt.

---

## [1. HẠN CHẾ TERMINAL & BẢO VỆ RAM (MÁY YẾU)]

1. **KHÔNG ĐƯỢC TỰ Ý CHẠY TERMINAL:**
   - Tuyệt đối không tự ý chạy các lệnh nặng như `npm run dev`, `npm run build`, `npm test`, `./gradlew build`, `./gradlew test` trừ khi có yêu cầu bằng văn bản rõ ràng từ người dùng.
2. **CẤM TÁC VỤ NỀN & QUÉT HỆ THỐNG:**
   - CẤM chạy các lệnh watch file liên tục, lệnh quét sâu toàn bộ ổ đĩa, hoặc khởi tạo daemon/tiến trình nền gây cạn kiệt tài nguyên CPU và RAM.
3. **GIẢI THÍCH & XÁC NHẬN TRƯỚC KHI CHẠY LỆNH:**
   - Khi thực sự cần thiết phải chạy một lệnh terminal, phải giải thích rõ ràng mục đích của lệnh đó và đợi người dùng xác nhận (Y/N) trước khi thực thi.
4. **ƯU TIÊN PHÂN TÍCH TĨNH (STATIC ANALYSIS):**
   - Ưu tiên phương pháp "Đọc và Suy ngẫm" (đọc code, suy luận logic luồng dữ liệu) để tìm lỗi và phát hiện bug thay vì liên tục chạy code thử nghiệm.

---

## [2. KIỂM SOÁT PHẠM VI (TIẾT KIỆM TOKEN & GIẢM TẢI)]

1. **GIỚI HẠN PHẠM VI ĐỌC/SỬA FILE:**
   - Chỉ được đọc và chỉnh sửa đúng các file liên quan trực tiếp đến task. Cấm quét hàng loạt hoặc đọc toàn bộ repository.
2. **KHÔNG SINH FILE RÁC:**
   - Không tự ý tạo file log tạm, file scratch, script phụ hoặc file test trung gian ngoài phạm vi yêu cầu.
3. **TIẾT KIỆM CONTEXT WINDOW & HIỂN THỊ CODE NGẮN GỌN:**
   - Khi phản hồi trong đoạn chat, chỉ hiển thị đoạn code cần thay đổi hoặc code diff.
   - Cấm in lại toàn bộ nội dung của các file dài hàng trăm/nghìn dòng để tránh lãng phí context window và token.

---

## [3. QUY TRÌNH LÀM VIỆC NHẸ NHÀNG (WORKFLOW)]

- **Bước 1 (Xác định phạm vi):** Tiếp nhận task -> Khoanh vùng chính xác các file đích cần tác động.
- **Bước 2 (Kiểm tra trong tư duy):** Viết nháp trong tư duy logic, tự đối chiếu cú pháp (syntax), kiểu dữ liệu (types) và tính tương thích bằng mắt trước khi ghi vào file.
- **Bước 3 (Thao tác chính xác 1 lần):** Áp dụng thay đổi trực tiếp vào file một cách chuẩn xác, dứt điểm, hạn chế tối đa việc chỉnh sửa chắp vá nhiều lần trên cùng một file.
- **Bước 4 (Báo cáo & Bàn giao):** Báo cáo kết quả ngắn gọn bằng tiếng Việt. Liệt kê các lệnh terminal liên quan (nếu có) dưới dạng văn bản để người dùng tự quyết định chạy thủ công khi cần.

---

## [4. RÀNG BUỘC PHỦ ĐỊNH (NEGATIVE CONSTRAINTS)]

1. **CẤM TỰ Ý CÀI THƯ VIỆN:**
   - Không tự ý chạy `npm install`, `npm i <package>` hoặc thêm dependency mới vào `package.json`/`build.gradle` khi chưa được người dùng cho phép cụ thể.
2. **CẤM SỬ DỤNG KIỂU DỮ LIỆU `any` BỪA BÃI:**
   - Luôn sử dụng kiểu dữ liệu tường minh trong TypeScript; không ép kiểu `any` tùy tiện làm chậm quá trình type-checking và gây lỗi ngầm.
3. **CẤM DÔNG DÀI, LÝ THUYẾT SUÔNG:**
   - Trực tiếp đi vào vấn đề, không giải thích lý thuyết chung chung, không lặp lại câu hỏi hay đưa ra các lời khuyên hiển nhiên ngoài phạm vi task.
4. **NGÔN NGỮ GIAO TIẾP:**
   - Sử dụng tiếng Việt rõ ràng, ngắn gọn, súc tích trong mọi câu trả lời và báo cáo.

---

## [QUY TẮC NGÔN NGỮ GIAO DIỆN HƯỚNG KHÁCH HÀNG (UI COPYWRITING)]
1. **ĐỐI TƯỢNG SỬ DỤNG:** Sản phẩm cuối cùng dành cho khách hàng phổ thông và nhân viên vận hành thực tế, KHÔNG phải lập trình viên.
2. **CẤM TUYỆT ĐỐI TỪ NGỮ KỸ THUẬT TRÊN UI:**
   - Không hiển thị mã quản lý nội bộ (Ví dụ: cấm viết "Module 6:", "Feature A", "ID_123" lên tiêu đề hoặc nhãn).
   - Không dùng từ viết tắt chuyên ngành hoặc thuật ngữ công nghệ (Ví dụ: cấm dùng "ePOD", "API", "Database", "Sync", "Cache", "Token", "Payload", "Null", "Undefined").
   - Không hiển thị thông báo lỗi thô từ hệ thống hoặc mã lỗi HTTP (Ví dụ: cấm hiện "Error 500", "Network Failed", "Exception").
3. **CHUYỂN ĐỔI SANG NGÔN NGỮ ĐỜI THƯỜNG:**
   - Mọi thuật ngữ hệ thống phải được dịch sang ngôn ngữ nghiệp vụ tự nhiên, dễ hiểu với người dùng cuối.
   - Ví dụ chuyển đổi chuẩn:
     * SAI: "Module 6: Quản trị đội xe tải lạnh chuyên dụng và lưu trữ ePOD."
     * ĐÚNG: "Quản lý đội xe tải lạnh và phiếu giao nhận điện tử."
   - Ví dụ thông báo lỗi chuẩn:
     * SAI: "Lỗi đồng bộ API hoặc timeout."
     * ĐÚNG: "Kết nối mạng không ổn định. Vui lòng thử lại sau giây lát."
4. **TỰ KIỂM TRA TRƯỚC KHI XUẤT CODE:** Trước khi sửa đổi bất kỳ đoạn văn bản (string) nào hiển thị ra màn hình (JSX/HTML), Agent phải tự rà soát để đảm bảo 100% câu chữ tự nhiên như người thật giao tiếp.


