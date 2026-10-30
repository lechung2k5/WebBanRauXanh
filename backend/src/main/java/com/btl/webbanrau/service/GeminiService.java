package com.btl.webbanrau.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.Getter;
import lombok.Setter;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import jakarta.annotation.PostConstruct;
import java.io.File;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.*;

@Service
@Slf4j
public class GeminiService {

    @Getter
    @Value("${gemini.api.key:}")
    private String apiKey;

    private static final String KEY_FILE = ".gemini_api_key";

    @PostConstruct
    public void initApiKeyPersistence() {
        try {
            Path path = Paths.get(KEY_FILE);
            if (Files.exists(path)) {
                String savedKey = Files.readString(path).trim();
                if (!savedKey.isEmpty() && (this.apiKey == null || this.apiKey.isBlank())) {
                    this.apiKey = savedKey;
                    log.info("Đã tự động tải Google Gemini API Key từ file lưu trữ ({})", KEY_FILE);
                }
            }
        } catch (Exception e) {
            log.warn("Không thể đọc file lưu trữ key: {}", e.getMessage());
        }
    }

    public void setApiKey(String key) {
        this.apiKey = key != null ? key.trim() : "";
        try {
            Path path = Paths.get(KEY_FILE);
            if (!this.apiKey.isEmpty()) {
                Files.writeString(path, this.apiKey);
                log.info("Đã lưu Google Gemini API Key vào file đĩa cứng bền vững ({})", KEY_FILE);
            } else {
                Files.deleteIfExists(path);
            }
        } catch (Exception e) {
            log.warn("Không thể lưu API Key vào file: {}", e.getMessage());
        }
    }

    @Value("${gemini.model.chat:gemini-3.5-flash-lite}")
    private String chatModel;

    @Value("${gemini.model.embedding:gemini-embedding-001}")
    private String embeddingModel;

    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public GeminiService() {
        this.restTemplate = new RestTemplate();
        org.springframework.http.client.SimpleClientHttpRequestFactory factory = new org.springframework.http.client.SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(3000); // Kết nối tối đa 3 giây
        factory.setReadTimeout(18000);   // Phản hồi tối đa 18 giây
        this.restTemplate.setRequestFactory(factory);
    }

    public boolean hasApiKey() {
        return apiKey != null && !apiKey.trim().isEmpty();
    }

    /**
     * Xác thực trực tiếp với máy chủ Google xem API Key có dùng được không
     */
    public boolean validateApiKey(String keyToTest) {
        if (keyToTest == null || keyToTest.trim().isEmpty()) {
            return false;
        }
        try {
            String url = String.format("https://generativelanguage.googleapis.com/v1beta/models?key=%s", keyToTest.trim());
            ResponseEntity<String> res = restTemplate.getForEntity(url, String.class);
            return res.getStatusCode().is2xxSuccessful();
        } catch (Exception e) {
            log.warn("Kiểm tra Google API Key thất bại: {}", e.getMessage());
            return false;
        }
    }

    /**
     * Kiểm tra thử xem Embedding API của Gemini có gọi được không (test 1 từ)
     */
    public boolean testEmbeddingCall() {
        if (!hasApiKey()) return false;
        try {
            String url = String.format("https://generativelanguage.googleapis.com/v1beta/models/%s:embedContent?key=%s",
                    embeddingModel, apiKey.trim());
            Map<String, Object> body = Map.of(
                    "model", "models/" + embeddingModel,
                    "content", Map.of("parts", List.of(Map.of("text", "test"))),
                    "outputDimensionality", 768
            );
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(body, headers);
            ResponseEntity<String> response = restTemplate.postForEntity(url, entity, String.class);
            return response.getStatusCode().is2xxSuccessful();
        } catch (Exception e) {
            log.warn("Thử nghiệm gọi Gemini Embedding API không thành công: {}", e.getMessage());
            return false;
        }
    }

    private volatile long embeddingQuotaExhaustedUntil = 0;

    /**
     * Tạo vector embedding 768 chiều cho văn bản thông qua Gemini API
     */
    public List<Double> getEmbedding(String text) {
        if (text == null || text.trim().isEmpty()) {
            return generateMockEmbedding("empty");
        }

        if (!hasApiKey() || System.currentTimeMillis() < embeddingQuotaExhaustedUntil) {
            return generateMockEmbedding(text);
        }

        try {
            String url = String.format("https://generativelanguage.googleapis.com/v1beta/models/%s:embedContent?key=%s",
                    embeddingModel, apiKey.trim());

            Map<String, Object> part = Map.of("text", text);
            Map<String, Object> content = Map.of("parts", List.of(part));
            Map<String, Object> requestBody = Map.of(
                    "model", "models/" + embeddingModel,
                    "content", content,
                    "outputDimensionality", 768
            );

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(requestBody, headers);

            ResponseEntity<String> response = restTemplate.postForEntity(url, entity, String.class);
            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                JsonNode root = objectMapper.readTree(response.getBody());
                JsonNode valuesNode = root.path("embedding").path("values");
                if (valuesNode.isArray() && valuesNode.size() > 0) {
                    List<Double> vector = new ArrayList<>(valuesNode.size());
                    for (JsonNode val : valuesNode) {
                        vector.add(val.asDouble());
                    }
                    return vector;
                }
            }
        } catch (Exception e) {
            String msg = e.getMessage() != null ? e.getMessage() : "";
            if (msg.contains("429") || msg.contains("RESOURCE_EXHAUSTED") || msg.contains("Quota") || msg.contains("quota")) {
                this.embeddingQuotaExhaustedUntil = System.currentTimeMillis() + 60000;
                log.warn("Gemini Embedding API đạt giới hạn hạn mức (429 Rate Limit/Quota). Tự động dùng vector ngữ nghĩa dự phòng trong 60 giây.");
            } else {
                log.warn("Gọi Gemini Embedding API thất bại ({}). Đang chuyển sang vector dự phòng.", msg);
            }
        }

        return generateMockEmbedding(text);
    }

    @Getter
    private String lastSuccessfulModel = "Google Gemini AI";

    private final List<String> fallbackChatModels = List.of(
            "gemini-3.5-flash-lite",
            "gemini-3.1-flash-lite",
            "gemini-flash-lite-latest",
            "gemini-flash-latest"
    );

    /**
     * Gọi Gemini Chat với Context RAG, tự động fallback model khi 503 High Demand
     */
    public String generateAnswer(String systemPrompt, String userMessage) {
        if (!hasApiKey()) {
            return "🌱 **Trợ lý HoNa Fresh AI**:\n\n" +
                    "Bạn chưa cấu hình **Google Gemini API Key** từ Google AI Studio (https://aistudio.google.com).\n" +
                    "Tuy nhiên, hệ thống tìm kiếm vector với **PostgreSQL pgvector** vẫn đang hoạt động tốt!\n\n" +
                    "Dưới đây là các sản phẩm nông sản phù hợp nhất được trích xuất trực tiếp từ cơ sở dữ liệu dựa trên câu hỏi của bạn:";
        }

        // Tạo danh sách các model để thử: ưu tiên model cấu hình, sau đó đến các fallback
        List<String> modelsToTry = new ArrayList<>();
        if (chatModel != null && !chatModel.isBlank()) {
            modelsToTry.add(chatModel.trim());
        }
        for (String m : fallbackChatModels) {
            if (!modelsToTry.contains(m)) {
                modelsToTry.add(m);
            }
        }

        for (String model : modelsToTry) {
            try {
                String url = String.format("https://generativelanguage.googleapis.com/v1beta/models/%s:generateContent?key=%s",
                        model, apiKey.trim());

                Map<String, Object> userPart = Map.of("text", userMessage);
                Map<String, Object> userContent = Map.of(
                        "role", "user",
                        "parts", List.of(userPart)
                );

                Map<String, Object> systemPart = Map.of("text", systemPrompt);
                Map<String, Object> systemInstruction = Map.of(
                        "parts", List.of(systemPart)
                );

                Map<String, Object> generationConfig = Map.of(
                        "temperature", 0.3,
                        "maxOutputTokens", 650
                );

                Map<String, Object> requestBody = Map.of(
                        "contents", List.of(userContent),
                        "systemInstruction", systemInstruction,
                        "generationConfig", generationConfig
                );

                HttpHeaders headers = new HttpHeaders();
                headers.setContentType(MediaType.APPLICATION_JSON);
                HttpEntity<Map<String, Object>> entity = new HttpEntity<>(requestBody, headers);

                ResponseEntity<String> response = restTemplate.postForEntity(url, entity, String.class);
                if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                    JsonNode root = objectMapper.readTree(response.getBody());
                    JsonNode candidates = root.path("candidates");
                    if (candidates.isArray() && candidates.size() > 0) {
                        JsonNode textNode = candidates.get(0).path("content").path("parts").get(0).path("text");
                        this.lastSuccessfulModel = "Google " + model;
                        return textNode.asText();
                    }
                }
            } catch (Exception e) {
                log.warn("Model {} tạm thời quá tải hoặc không khả dụng ({}). Đang tự động chuyển model tiếp theo...", model, e.getMessage());
            }
        }

        // Smart RAG Fallback: Nếu tất cả các model Google đều nghẽn tạm thời (503 High Demand)
        this.lastSuccessfulModel = "HoNa Fresh RAG Engine (PostgreSQL pgvector)";
        return "🌱 **HoNa Fresh AI** xin chào bạn!\n\n" +
                "Máy chủ Google Gemini đang tạm thời tiếp nhận lưu lượng truy cập cao (503 Spikes in Demand).\n" +
                "Tuy nhiên, **hệ thống Vector Database (pgvector)** của HoNa Fresh đã phân tích ngữ nghĩa câu hỏi **\"" + userMessage + "\"** và chọn lọc ra các nguyên liệu nông sản tươi sạch chuẩn hữu cơ/VietGAP phù hợp nhất bên dưới.\n\n" +
                "👉 Bạn có thể xem ngay chi tiết sản phẩm, công dụng và bấm **'Thêm vào giỏ'** để đặt mua nhé!";
    }

    /**
     * Vector ngữ nghĩa dự phòng 768 chiều chuẩn hóa L2, dựa trên tính chất từ ngữ và hash
     * Đảm bảo pgvector luôn có vector chuẩn để tính cosine distance kể cả khi chưa có internet/API key.
     */
    
    /**
     * Trợ lý HoNa Fresh AI dành riêng cho Bà con Nông dân và HTX
     * Sử dụng ngôn từ bình dị, mộc mạc, gần gũi, am hiểu thực tế ruộng vườn và chuỗi lạnh
     */
    public String generateFarmerChat(String userMessage) {
        if (!hasApiKey()) {
            return "Dạ thưa bà con, hiện tại kết nối AI đang gián đoạn một chút. Bà con mình có thể hỏi em về giá chợ sỉ (cà chua 15.000 - 16.500 đ/kg, xà lách 28.000 đ/kg, cà phê 114.000 - 116.000 đ/kg), khung giờ cắt rau sáng sớm 5h-7h30 hoặc cách làm mát hạ nhiệt sơ bộ trước khi lên xe lạnh nhé!";
        }

        String systemPrompt = """
            Bạn là Trợ Lý HoNa Fresh - Người bạn đồng hành thân thiết, am hiểu và tận tâm của bà con nông dân và Hợp tác xã CHUYÊN CANH RAU CỦ QUẢ tại Việt Nam.

            PHẠM VI NGHIÊM NGẶT (QUAN TRỌNG NHẤT):
            - Hệ thống HoNa Fresh là sàn chuyên biệt 100% về RAU CỦ QUẢ TƯƠI SẠCH:
              + Rau ăn lá: Xà lách thủy canh, xà lách lolo, bắp cải trái tim, bắp cải tím, cải thìa, cải ngọt, cải bó xôi, rau thơm, rau muống, mồng tơi...
              + Rau ăn quả: Cà chua beef, cà chua cherry, ớt chuông Sweet Paler, dưa leo baby, bí đỏ, bầu, mướp, đậu bắp...
              + Rau ăn củ: Khoai tây vàng Đà Lạt, cà rốt Buôn Hồ/Hải Dương, củ dền, củ sắn, củ cải...
              + Nấm tươi sạch: Nấm bào ngư xám, nấm đùi gà baby, nấm kim châm, nấm đông cô tươi...
            - BẠN CHỈ HỖ TRỢ VÀ TƯ VẤN VỀ CÁC MẶT HÀNG RAU CỦ QUẢ TRÊN.
            - NẾU NGƯỜI DÙNG HỎI VỀ CÂY CÔNG NGHIỆP (cà phê, cao su, tiêu, điều...) hoặc TRÁI CÂY LỚN (sầu riêng, thanh long, bưởi...):
              BẠN PHẢI TỪ CHỐI THẬT DUYÊN DÁNG, LỊCH SỰ VÀ HƯỚNG BÀ CON QUAY LẠI MẶT HÀNG RAU CỦ QUẢ:
              "Dạ thưa bà con/anh chị, em là Trợ Lý HoNa Fresh chỉ chuyên sâu hỗ trợ về **mặt hàng rau củ quả tươi sạch** (như rau ăn lá, cà chua, ớt chuông, bắp cải, cà rốt, khoai tây, nấm tươi...) thôi nè! Về cây công nghiệp (như cà phê, tiêu, cao su...) hay cây ăn trái lớn (như sầu riêng, thanh long...) thì sàn HoNa Fresh tụi em không chuyên trách. Bà con mình hỏi em về giá cả, khung giờ thu hoạch hay cách làm mát bảo quản các loại rau củ quả để em tư vấn tận tình cho bà con nha!"

            PHONG CÁCH VÀ VĂN PHONG:
            - Dùng từ ngữ BÌNH DỊ, DỄ HIỂU, GẦN GŨI, THÂN THIỆN như một người kỹ sư nông nghiệp đang ngồi uống trà tâm sự cùng bà con ở chòi vườn.
            - Xưng hô: Xưng "em", gọi "bà con" hoặc "chú/bác/anh/chị". Tránh hoàn toàn giọng điệu máy móc, sách vở, hàn lâm, giáo điều. Không dùng từ tiếng Anh khó hiểu mà phải giải thích mộc mạc (VD: Pre-cooling là "hạ nhiệt làm mát sơ bộ trước khi lên xe lạnh", Pulp temperature là "nhiệt độ trong ruột củ/quả", Chilling injury là "cảm lạnh / thâm ruột do để quá lạnh").
            - Trả lời THỰC TẾ, ĐI THẲNG VÀO VIỆC, CÓ CON SỐ RÕ RÀNG, CHỈ DẪN DỄ LÀM NGAY.

            3 CHỦ ĐỀ CHUYÊN MÔN CỐT LÕI (CHỈ ÁP DỤNG CHO RAU CỦ QUẢ):
            1. TRA CỨU GIÁ SỈ RAU CỦ QUẢ CHỢ ĐẦU MỐI HÔM NAY:
               - Cung cấp giá sỉ tham khảo tại chợ đầu mối Thủ Đức, Bình Điền, Hóc Môn:
                 • Cà chua beef Đà Lạt: 15.000 - 16.500 đ/kg (loại 1, tai xanh quả bóng). Cà chua cherry: 22.000 - 26.000 đ/kg.
                 • Xà lách lô lô xanh / Roman: 21.000 - 24.500 đ/kg. Xà lách thủy canh VietGAP: 28.000 - 32.000 đ/kg.
                 • Bắp cải trái tim Đà Lạt: 11.500 - 13.000 đ/kg. Bắp cải tím: 16.000 - 18.500 đ/kg.
                 • Ớt chuông Sweet Paler (Đỏ/Vàng): 38.000 - 43.000 đ/kg.
                 • Khoai tây vàng Đà Lạt: 17.000 - 20.000 đ/kg. Cà rốt Buôn Hồ loại 1: 12.000 - 14.500 đ/kg.
                 • Dưa leo baby: 16.000 - 19.500 đ/kg. Cải thìa / Cải ngọt: 13.000 - 16.000 đ/kg.
                 • Nấm bào ngư xám: 45.000 - 55.000 đ/kg. Nấm đùi gà baby: 60.000 - 75.000 đ/kg.
               - Mách nước thời điểm chốt giá sỉ theo bậc (Tier pricing: đi số lượng tạ/tấn được hỗ trợ bao tiêu xe lạnh).
            2. TƯ VẤN KHUNG GIỜ THU HOẠCH LÝ TƯỞNG:
               - Rau ăn lá: Cắt sáng sớm tinh sương 5h - 7h30 sáng lúc sương vừa tan, tế bào lá căng mọng giòn ngọt nhất; tránh trưa nắng gắt 10h - 14h làm héo rũ táp lá.
               - Rau ăn quả (cà chua, ớt chuông): Hái 7h30 - 10h sáng khi ráo hẳn sương đêm để cuống khô ráo không bị nấm mốc khi đóng thùng.
               - Rau ăn củ: Nhổ 6h - 9h sáng khi đất ráo nhẹ, tơi xốp không đứt rễ.
               - Dặn dò kỹ khi trời mưa dầm: Ráng đừng cắt lúc mưa dầm vì bẹ lá ngậm nước dễ thối nhũn; nếu lỡ cắt thì phải bật quạt đối lưu thổi ráo nước trên mặt lá trước khi xếp sọt.
            3. KỸ THUẬT HẠ NHIỆT SƠ BỘ (PRE-COOLING) & XE LẠNH RAU CỦ:
               - Thổi quạt gió mát qua sọt nan hoặc xối nước lạnh sạch (Hydro-cooling cho cà rốt/củ quả) để ruột củ quả mát xuống dưới 8°C (sờ mát rượi tay).
               - Xe lạnh cài 2°C - 5°C (riêng cà chua và ớt chuông chỉ cài 8°C - 12°C kẻo bị cảm lạnh thâm vỏ). Xếp sọt hở rãnh gió để kiểm định QC trạm đạt 98% ngay chuyến đầu.

            RÀNG BUỘC CÂU HỎI NGOÀI LỀ (GUARDRAILS):
            - Nếu hỏi chuyện ngoài lề (viết code, giải toán, chính trị, ca sĩ, xem bói...): Từ chối duyên dáng, vui vẻ: "Dạ em là trợ lý nhà nông, chuyên ăn ngủ cùng ruộng vườn rau củ quả, giá chợ với xe lạnh thôi hà! Mấy chuyện đó em hổng rành đâu. Bà con mình hỏi em chuyện vụ mùa rau củ hôm nay hay cách giữ rau củ quả tươi lâu để em mách nước nha!"
            """;

        List<String> modelsToTry = List.of("gemini-3.5-flash-lite", "gemini-flash-lite-latest", "gemini-flash-latest");

        for (String model : modelsToTry) {
            try {
                String url = String.format("https://generativelanguage.googleapis.com/v1beta/models/%s:generateContent?key=%s",
                        model, apiKey.trim());

                Map<String, Object> userPart = Map.of("text", userMessage != null ? userMessage : "Xin chào");
                Map<String, Object> userContent = Map.of("role", "user", "parts", List.of(userPart));
                Map<String, Object> systemPart = Map.of("text", systemPrompt);
                Map<String, Object> systemInstruction = Map.of("parts", List.of(systemPart));
                Map<String, Object> generationConfig = Map.of("temperature", 0.4, "maxOutputTokens", 800);

                Map<String, Object> requestBody = Map.of(
                        "contents", List.of(userContent),
                        "systemInstruction", systemInstruction,
                        "generationConfig", generationConfig
                );

                HttpHeaders headers = new HttpHeaders();
                headers.setContentType(MediaType.APPLICATION_JSON);
                HttpEntity<Map<String, Object>> entity = new HttpEntity<>(requestBody, headers);

                ResponseEntity<String> response = restTemplate.postForEntity(url, entity, String.class);
                if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                    JsonNode root = objectMapper.readTree(response.getBody());
                    JsonNode candidates = root.path("candidates");
                    if (candidates.isArray() && candidates.size() > 0) {
                        return candidates.get(0).path("content").path("parts").get(0).path("text").asText();
                    }
                }
            } catch (Exception e) {
                log.warn("Farmer AI chat model {} lỗi: {}", model, e.getMessage());
            }
        }

        return "Dạ thưa bà con, em là Trợ Lý HoNa Fresh đây ạ! Hệ thống máy chủ AI đang tải hơi nhiều một chút. Bà con mình cứ gửi lại câu hỏi về giá nông sản hôm nay, giờ cắt rau củ hoặc cách làm mát nông sản trước khi chở đi, em sẽ trả lời ngay nhé ạ!";
    }

    public List<Double> generateMockEmbedding(String text) {
        int dim = 768;
        double[] vec = new double[dim];
        String normalized = text.toLowerCase().trim();
        String[] words = normalized.split("\\s+");

        try {
            MessageDigest md = MessageDigest.getInstance("SHA-256");
            for (String word : words) {
                byte[] hash = md.digest(word.getBytes(StandardCharsets.UTF_8));
                for (int i = 0; i < hash.length; i++) {
                    int idx = Math.abs((word.hashCode() * 31 + i * 17) % dim);
                    vec[idx] += ((hash[i] & 0xFF) - 128.0) / 128.0;
                }
            }
        } catch (Exception ignored) {
        }

        // Chuẩn hóa L2 norm
        double sumSq = 0;
        for (double v : vec) sumSq += v * v;
        double norm = Math.sqrt(sumSq);
        if (norm == 0) norm = 1.0;

        List<Double> result = new ArrayList<>(dim);
        for (double v : vec) {
            result.add(v / norm);
        }
        return result;
    }
}
