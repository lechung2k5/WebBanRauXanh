package com.btl.webbanrau.service;

import com.btl.webbanrau.model.ImagePurpose;
import com.cloudinary.Cloudinary;
import com.cloudinary.utils.ObjectUtils;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.util.HashMap;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class CloudinaryService {

    @Autowired(required = false)
    private final Cloudinary cloudinary;

    public boolean isConfigured() {
        return cloudinary != null;
    }

    public String resolveFolder(ImagePurpose purpose) {
        return switch (purpose) {
            case CERTIFICATE -> "hona_fresh/certificates";
            case PRODUCT -> "hona_fresh/products";
            case AVATAR -> "hona_fresh/avatars";
            case CATEGORY -> "hona_fresh/categories";
            case LOT -> "hona_fresh/lots";
            case EPOD -> "hona_fresh/epod";
        };
    }

    public Map<?, ?> uploadImage(byte[] fileBytes, String originalFilename, ImagePurpose purpose, String deliveryType) {
        if (!isConfigured()) {
            throw new AuthException(503, "CLOUDINARY_NOT_CONFIGURED",
                    "Dịch vụ tải ảnh Cloudinary chưa được cấu hình trên máy chủ. Vui lòng cấu hình CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET.");
        }

        String folder = resolveFolder(purpose);
        boolean isAuthenticated = "authenticated".equalsIgnoreCase(deliveryType);

        Map<String, Object> params = new HashMap<>();
        params.put("folder", folder);
        params.put("resource_type", "image");
        params.put("allowed_formats", new String[]{"jpg", "jpeg", "png", "webp"});
        params.put("use_filename", false);
        params.put("unique_filename", true);
        params.put("overwrite", false);

        if (isAuthenticated) {
            params.put("type", "authenticated");
        } else {
            params.put("type", "upload");
        }

        try {
            Map<?, ?> result = cloudinary.uploader().upload(fileBytes, params);
            log.info("Cloudinary upload success: publicId={}, folder={}, type={}",
                    result.get("public_id"), folder, result.get("type"));
            return result;
        } catch (IOException e) {
            log.error("Cloudinary upload failed: {}", e.getMessage(), e);
            throw new AuthException(502, "CLOUDINARY_UPLOAD_FAILED",
                    "Không thể tải ảnh lên Cloudinary: " + e.getMessage());
        }
    }

    public void deleteImage(String publicId, String deliveryType) {
        if (!isConfigured() || publicId == null || publicId.isBlank()) {
            return;
        }

        try {
            Map<String, Object> params = new HashMap<>();
            params.put("resource_type", "image");
            if ("authenticated".equalsIgnoreCase(deliveryType)) {
                params.put("type", "authenticated");
            }
            Map<?, ?> result = cloudinary.uploader().destroy(publicId, params);
            log.info("Cloudinary destroy publicId={}, result={}", publicId, result.get("result"));
        } catch (Exception e) {
            log.warn("Cloudinary deleteImage error for publicId {}: {}", publicId, e.getMessage());
        }
    }

    public String generateSignedUrl(String publicId, String deliveryType) {
        if (!isConfigured() || publicId == null || publicId.isBlank()) {
            return null;
        }

        try {
            boolean isAuthenticated = "authenticated".equalsIgnoreCase(deliveryType);
            if (isAuthenticated) {
                return cloudinary.url()
                        .resourceType("image")
                        .type("authenticated")
                        .signed(true)
                        .secure(true)
                        .generate(publicId);
            } else {
                return cloudinary.url()
                        .resourceType("image")
                        .type("upload")
                        .secure(true)
                        .generate(publicId);
            }
        } catch (Exception e) {
            log.warn("Cloudinary generateSignedUrl error for publicId {}: {}", publicId, e.getMessage());
            return null;
        }
    }
}
