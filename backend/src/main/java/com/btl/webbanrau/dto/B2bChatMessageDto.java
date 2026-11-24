package com.btl.webbanrau.dto;

import lombok.*;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class B2bChatMessageDto {
    private String id;
    private Long rfqId;
    private String rfqCode;
    private Long senderId;
    private String senderName;
    private String senderRole; // "BUYER", "FARMER", "SYSTEM"
    private String content;
    private String messageType; // "TEXT", "IMAGE"
    private String imageUrl;
    private String createdAt;
}
