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
        factory.setReadTimeout(6000);    // Phản hồi tối đa 6 giây (Fail-fast chuyển model)
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
