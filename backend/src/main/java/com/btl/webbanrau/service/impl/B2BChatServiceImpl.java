package com.btl.webbanrau.service.impl;

import com.btl.webbanrau.dto.B2bChatMessageDto;
import com.btl.webbanrau.model.B2bChatMessage;
import com.btl.webbanrau.model.BuyerRfq;
import com.btl.webbanrau.repository.B2bChatMessageRepository;
import com.btl.webbanrau.repository.BuyerRfqRepository;
import com.btl.webbanrau.service.B2BChatService;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.concurrent.TimeUnit;

@Service
@RequiredArgsConstructor
@Slf4j
public class B2BChatServiceImpl implements B2BChatService {

    private final B2bChatMessageRepository chatMessageRepository;
    private final BuyerRfqRepository buyerRfqRepository;
    private final SimpMessagingTemplate messagingTemplate;
    private final Optional<StringRedisTemplate> redisTemplateOptional;
    private final ObjectMapper objectMapper;

    private static final String REDIS_CHAT_PREFIX = "b2b:chat:rfq:";
    private static final String REDIS_DIRTY_SET = "b2b:chat:dirty_rfqs";

    @Override
    public B2bChatMessageDto sendMessage(B2bChatMessageDto messageDto) {
        if (messageDto.getCreatedAt() == null || messageDto.getCreatedAt().isBlank()) {
            messageDto.setCreatedAt(LocalDateTime.now().format(DateTimeFormatter.ISO_LOCAL_DATE_TIME));
        }

        Long rfqId = messageDto.getRfqId();
        String rfqCode = messageDto.getRfqCode();

        // Chuẩn hóa rfqId nếu chỉ có rfqCode
        if ((rfqId == null || rfqId <= 0) && rfqCode != null && !rfqCode.isBlank()) {
            buyerRfqRepository.findByRfqCode(rfqCode).ifPresent(r -> messageDto.setRfqId(r.getId()));
        }

        // 1. Lưu tạm vào Redis (Cache-first write-behind pattern)
        boolean savedToRedis = false;
        if (redisTemplateOptional.isPresent() && rfqId != null) {
            try {
                StringRedisTemplate redis = redisTemplateOptional.get();
                String json = objectMapper.writeValueAsString(messageDto);
                String key = REDIS_CHAT_PREFIX + rfqId;
                redis.opsForList().rightPush(key, json);
                redis.expire(key, 7, TimeUnit.DAYS);
                redis.opsForSet().add(REDIS_DIRTY_SET, String.valueOf(rfqId));
                savedToRedis = true;
            } catch (Exception e) {
                log.warn("Redis write failed, fallback to direct DB save: {}", e.getMessage());
            }
        }

        // 2. Nếu không có Redis hoặc ghi Redis thất bại: Lưu trực tiếp vào Database để đảm bảo an toàn tuyệt đối
        if (!savedToRedis) {
            persistDtoToDatabase(messageDto);
        }

        // 3. Broadcast Realtime qua WebSocket STOMP topic
        String topicSuffix = (rfqId != null && rfqId > 0) ? String.valueOf(rfqId) : rfqCode;
        if (topicSuffix != null) {
            messagingTemplate.convertAndSend("/topic/chat/" + topicSuffix, messageDto);
            if (rfqCode != null && !rfqCode.equalsIgnoreCase(topicSuffix)) {
                messagingTemplate.convertAndSend("/topic/chat/" + rfqCode, messageDto);
            }
        }

        return messageDto;
    }

    @Override
    public List<B2bChatMessageDto> getChatHistory(Long rfqId, String rfqCode) {
        // Chuẩn hóa ID
        Long resolvedRfqId = rfqId;
        if ((resolvedRfqId == null || resolvedRfqId <= 0) && rfqCode != null && !rfqCode.isBlank()) {
            Optional<BuyerRfq> opt = buyerRfqRepository.findByRfqCode(rfqCode);
            if (opt.isPresent()) {
                resolvedRfqId = opt.get().getId();
            }
        }

        // =========================================================================================
        // YÊU CẦU BẮT BUỘC: Khi ấn lại vào cuộc trò chuyện thì tin nhắn từ Redis PHẢI lưu vào DB rồi!
        // Thực thi flush đồng bộ toàn bộ tin nhắn pending từ Redis sang PostgreSQL ngay lập tức
        // =========================================================================================
        if (resolvedRfqId != null) {
            flushRfqToDatabase(resolvedRfqId);
        }

        // Truy vấn danh sách tin nhắn bền vững từ PostgreSQL Database
        List<B2bChatMessage> dbList = (resolvedRfqId != null)
                ? chatMessageRepository.findByRfqIdOrderByCreatedAtAsc(resolvedRfqId)
                : chatMessageRepository.findByRfqCodeOrderByCreatedAtAsc(rfqCode);

        List<B2bChatMessageDto> result = new ArrayList<>();
        for (B2bChatMessage m : dbList) {
            result.add(toDto(m));
        }

        return result;
    }

    @Override
    public void flushRfqToDatabase(Long rfqId) {
        if (redisTemplateOptional.isEmpty() || rfqId == null || rfqId <= 0) return;
        StringRedisTemplate redis = redisTemplateOptional.get();
        String key = REDIS_CHAT_PREFIX + rfqId;

        try {
            List<String> rawMessages = redis.opsForList().range(key, 0, -1);
            if (rawMessages != null && !rawMessages.isEmpty()) {
                List<B2bChatMessage> entitiesToSave = new ArrayList<>();
                for (String raw : rawMessages) {
                    try {
                        B2bChatMessageDto dto = objectMapper.readValue(raw, B2bChatMessageDto.class);
                        entitiesToSave.add(toEntity(dto));
                    } catch (Exception ex) {
                        log.error("Failed to parse redis chat message for RFQ {}: {}", rfqId, ex.getMessage());
                    }
                }
                if (!entitiesToSave.isEmpty()) {
                    chatMessageRepository.saveAll(entitiesToSave);
                    log.info("✓ Flush-on-Open: Persisted {} chat messages from Redis to PostgreSQL for RFQ {}", entitiesToSave.size(), rfqId);
                }
                // Xóa danh sách tạm trong Redis sau khi đã lưu DB thành công
                redis.delete(key);
                redis.opsForSet().remove(REDIS_DIRTY_SET, String.valueOf(rfqId));
            }
        } catch (Exception e) {
            log.warn("Error flushing RFQ {} messages from Redis to DB: {}", rfqId, e.getMessage());
        }
    }

    @Scheduled(fixedDelay = 5000)
    @Override
    public void flushRedisToDatabase() {
        if (redisTemplateOptional.isEmpty()) return;
        StringRedisTemplate redis = redisTemplateOptional.get();

        try {
            Set<String> dirtyRfqs = redis.opsForSet().members(REDIS_DIRTY_SET);
            if (dirtyRfqs == null || dirtyRfqs.isEmpty()) return;

            for (String rfqIdStr : dirtyRfqs) {
                try {
                    Long rfqId = Long.parseLong(rfqIdStr);
                    flushRfqToDatabase(rfqId);
                } catch (Exception ex) {
                    log.error("Failed to parse dirty rfq id {}: {}", rfqIdStr, ex.getMessage());
                }
            }
        } catch (Exception e) {
            log.debug("Redis scheduled flush to database skipped: {}", e.getMessage());
        }
    }

    @Override
    public boolean canChat(Long rfqId, String rfqCode, Long userId, String userRole) {
        if ("ADMIN".equalsIgnoreCase(userRole)) return true;
        return userId != null && userId > 0;
    }

    private void persistDtoToDatabase(B2bChatMessageDto dto) {
        try {
            chatMessageRepository.save(toEntity(dto));
        } catch (Exception e) {
            log.error("Error persisting chat message to database: {}", e.getMessage());
        }
    }

    private B2bChatMessage toEntity(B2bChatMessageDto dto) {
        LocalDateTime created = LocalDateTime.now();
        if (dto.getCreatedAt() != null && !dto.getCreatedAt().isBlank()) {
            try {
                created = LocalDateTime.parse(dto.getCreatedAt(), DateTimeFormatter.ISO_LOCAL_DATE_TIME);
            } catch (Exception ignored) {}
        }

        return B2bChatMessage.builder()
                .rfqId(dto.getRfqId() != null ? dto.getRfqId() : 0L)
                .rfqCode(dto.getRfqCode() != null ? dto.getRfqCode() : "RFQ-UNKNOWN")
                .senderId(dto.getSenderId() != null ? dto.getSenderId() : 0L)
                .senderName(dto.getSenderName() != null ? dto.getSenderName() : "Thành viên B2B")
                .senderRole(dto.getSenderRole() != null ? dto.getSenderRole() : "BUYER")
                .content(dto.getContent())
                .messageType(dto.getMessageType() != null ? dto.getMessageType() : "TEXT")
                .imageUrl(dto.getImageUrl())
                .createdAt(created)
                .build();
    }

    private B2bChatMessageDto toDto(B2bChatMessage entity) {
        return B2bChatMessageDto.builder()
                .id(entity.getId() != null ? String.valueOf(entity.getId()) : null)
                .rfqId(entity.getRfqId())
                .rfqCode(entity.getRfqCode())
                .senderId(entity.getSenderId())
                .senderName(entity.getSenderName())
                .senderRole(entity.getSenderRole())
                .content(entity.getContent())
                .messageType(entity.getMessageType())
                .imageUrl(entity.getImageUrl())
                .createdAt(entity.getCreatedAt() != null ? entity.getCreatedAt().toString() : null)
                .build();
    }
}
