package com.btl.webbanrau.model;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "b2b_chat_messages")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class B2bChatMessage {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long rfqId;

    @Column(nullable = false, length = 50)
    private String rfqCode;

    @Column(nullable = false)
    private Long senderId;

    @Column(nullable = false, length = 150)
    private String senderName;

    @Column(nullable = false, length = 30)
    private String senderRole; // "BUYER", "FARMER", "SYSTEM"

    @Column(columnDefinition = "TEXT")
    private String content;

    @Builder.Default
    @Column(nullable = false, length = 20)
    private String messageType = "TEXT"; // "TEXT", "IMAGE"

    @Column(length = 1000)
    private String imageUrl;

    @Column(nullable = false)
    private LocalDateTime createdAt;
}
