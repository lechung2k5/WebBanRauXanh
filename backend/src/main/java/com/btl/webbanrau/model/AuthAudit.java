package com.btl.webbanrau.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.Instant;

@Entity @Table(name = "auth_audit") @Getter @Setter @NoArgsConstructor
public class AuthAudit {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    private Long actorId;
    private Long targetId;
    private String action;
    private Instant createdAt = Instant.now();
    public AuthAudit(Long actorId, Long targetId, String action) {
        this.actorId = actorId; this.targetId = targetId; this.action = action;
    }
}
