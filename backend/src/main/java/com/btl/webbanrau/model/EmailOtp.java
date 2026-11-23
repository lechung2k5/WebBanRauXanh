package com.btl.webbanrau.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.Instant;

@Entity @Table(name = "email_otp_verifications", indexes = @Index(columnList = "email,otpType"))
@Getter @Setter @NoArgsConstructor
public class EmailOtp {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(nullable = false)
    private String email;
    @Column(nullable = false)
    private String otpType;
    @Column(nullable = false)
    private String otpCodeHash;
    @Column(nullable = false)
    private Instant expiresAt;
    private int attempts;
    private boolean used;
    @Column(nullable = false)
    private Instant createdAt = Instant.now();
}
