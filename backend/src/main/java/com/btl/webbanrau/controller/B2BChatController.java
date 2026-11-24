package com.btl.webbanrau.controller;

import com.btl.webbanrau.dto.B2bChatMessageDto;
import com.btl.webbanrau.dto.response.ApiResponse;
import com.btl.webbanrau.model.ImagePurpose;
import com.btl.webbanrau.service.B2BChatService;
import com.btl.webbanrau.service.CloudinaryService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/chat")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "B2B Chat Controller", description = "Quản lý phòng chat thời gian thực B2B giữa Người Mua và Người Bán")
public class B2BChatController {

    private final B2BChatService chatService;
    private final CloudinaryService cloudinaryService;
    private final org.springframework.messaging.simp.SimpMessagingTemplate messagingTemplate;

    /**
     * WebSocket Message Handler: Nhận tin nhắn STOMP từ client gửi tới /app/chat.sendMessage
     */
    @MessageMapping("/chat.sendMessage")
    public void handleIncomingStompMessage(@Payload B2bChatMessageDto messageDto) {
        log.info("Received STOMP chat message for RFQ: {} from: {}", messageDto.getRfqCode(), messageDto.getSenderName());
        chatService.sendMessage(messageDto);
    }

    /**
     * WebSocket Typing Indicator: Broadcast trạng thái đang soạn tin nhắn
     */
    @MessageMapping("/chat.typing")
    public void handleTypingIndicator(@Payload Map<String, Object> payload) {
        String rfqCode = (String) payload.get("rfqCode");
        if (rfqCode != null && !rfqCode.isBlank()) {
            messagingTemplate.convertAndSend("/topic/chat/" + rfqCode + "/typing", payload);
            Object rfqId = payload.get("rfqId");
            if (rfqId != null) {
                messagingTemplate.convertAndSend("/topic/chat/" + rfqId + "/typing", payload);
            }
        }
    }

    /**
     * REST API gửi tin nhắn (dành cho client gọi qua HTTP fallback)
     */
    @PostMapping("/send")
    @Operation(summary = "Gửi tin nhắn chat B2B qua HTTP (fallback khi mất kết nối socket)")
    public ResponseEntity<ApiResponse<B2bChatMessageDto>> sendHttpChatMessage(@RequestBody B2bChatMessageDto messageDto) {
        B2bChatMessageDto saved = chatService.sendMessage(messageDto);
        return ResponseEntity.ok(ApiResponse.<B2bChatMessageDto>builder()
                .code(200)
                .message("Đã gửi tin nhắn thành công")
                .result(saved)
                .build());
    }

    /**
     * REST API lấy lịch sử tin nhắn của phiên đàm phán RFQ (kết hợp Redis Cache & Database)
     */
    @GetMapping("/rfq/{rfqId}/history")
    @Operation(summary = "Lấy toàn bộ lịch sử tin nhắn của phiên đàm phán RFQ")
    public ResponseEntity<ApiResponse<List<B2bChatMessageDto>>> getChatHistory(
            @PathVariable(required = false) Long rfqId,
            @RequestParam(required = false) String rfqCode) {
        List<B2bChatMessageDto> history = chatService.getChatHistory(rfqId, rfqCode);
        return ResponseEntity.ok(ApiResponse.<List<B2bChatMessageDto>>builder()
                .code(200)
                .message("Lấy lịch sử tin nhắn thành công")
                .result(history)
                .build());
    }

    /**
     * REST API tải ảnh gửi qua chat B2B
     */
    @PostMapping(value = "/upload-image", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @Operation(summary = "Tải ảnh đính kèm trong hội thoại chat B2B")
    public ResponseEntity<ApiResponse<Map<String, String>>> uploadChatImage(@RequestParam("file") MultipartFile file) throws IOException {
        if (file.isEmpty()) {
            return ResponseEntity.badRequest().body(ApiResponse.<Map<String, String>>builder()
                    .code(400)
                    .message("Tệp ảnh không được để trống")
                    .build());
        }

        String secureUrl = "";
        if (cloudinaryService.isConfigured()) {
            Map<?, ?> uploadResult = cloudinaryService.uploadImage(
                    file.getBytes(),
                    file.getOriginalFilename(),
                    ImagePurpose.CHAT,
                    "upload"
            );
            secureUrl = (String) uploadResult.get("secure_url");
        } else {
            // Fallback nếu Cloudinary chưa điền API Key: Tạo data URL base64 an toàn cho chat
            byte[] bytes = file.getBytes();
            String base64 = java.util.Base64.getEncoder().encodeToString(bytes);
            secureUrl = "data:" + (file.getContentType() != null ? file.getContentType() : "image/jpeg") + ";base64," + base64;
        }

        return ResponseEntity.ok(ApiResponse.<Map<String, String>>builder()
                .code(200)
                .message("Tải ảnh thành công")
                .result(Map.of("imageUrl", secureUrl))
                .build());
    }
}
