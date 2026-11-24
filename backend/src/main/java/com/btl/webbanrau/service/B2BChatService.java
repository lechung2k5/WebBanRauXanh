package com.btl.webbanrau.service;

import com.btl.webbanrau.dto.B2bChatMessageDto;

import java.util.List;

public interface B2BChatService {
    B2bChatMessageDto sendMessage(B2bChatMessageDto messageDto);
    List<B2bChatMessageDto> getChatHistory(Long rfqId, String rfqCode);
    boolean canChat(Long rfqId, String rfqCode, Long userId, String userRole);
    void flushRfqToDatabase(Long rfqId);
    void flushRedisToDatabase();
}
