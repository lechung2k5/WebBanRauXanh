package com.btl.webbanrau.model;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

@Entity
@Table(name = "uploaded_assets")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UploadedAsset {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "asset_id", nullable = false, unique = true, length = 64)
    private String assetId;

    @Column(name = "public_id", nullable = false, length = 255)
    private String publicId;

    @Column(name = "secure_url", nullable = false, length = 1000)
    private String secureUrl;

    @Column(name = "resource_type", nullable = false, length = 50)
    @Builder.Default
    private String resourceType = "image";

    @Column(name = "delivery_type", nullable = false, length = 50)
    @Builder.Default
    private String deliveryType = "upload";

    @Column(length = 20)
    private String format;

    @Column(name = "file_size")
    private Long fileSize;

    private Integer width;

    private Integer height;

    @Column(nullable = false, length = 50)
    private String purpose;

    @Column(name = "user_id")
    private Long userId;

    @Column(name = "ip_address", length = 45)
    private String ipAddress;

    @Column(name = "is_linked", nullable = false)
    @Builder.Default
    private boolean isLinked = false;

    @Column(name = "created_at", nullable = false)
    @Builder.Default
    private Instant createdAt = Instant.now();
}
