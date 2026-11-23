package com.btl.webbanrau.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.Instant;

@Entity @Table(name = "refresh_tokens")
@Getter @Setter @NoArgsConstructor
public class RefreshToken {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    private User user;
    @Column(nullable = false, unique = true, length = 64)
    private String tokenHash;
    @Column(nullable = false)
    private String familyId;
    @Column(nullable = false)
    private Instant expiresAt;
    private boolean revoked;
    private boolean rememberMe;
    @Column(nullable = false)
    private Instant createdAt = Instant.now();
}
