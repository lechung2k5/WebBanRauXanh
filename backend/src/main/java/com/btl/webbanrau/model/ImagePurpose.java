package com.btl.webbanrau.model;

public enum ImagePurpose {
    CERTIFICATE,
    PRODUCT,
    AVATAR,
    CATEGORY,
    LOT,
    EPOD;

    public static ImagePurpose fromString(String value) {
        if (value == null || value.isBlank()) {
            throw new IllegalArgumentException("Mục đích sử dụng ảnh không được để trống");
        }
        try {
            return ImagePurpose.valueOf(value.trim().toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new IllegalArgumentException("Mục đích sử dụng ảnh không hợp lệ (CERTIFICATE, PRODUCT, AVATAR, CATEGORY, LOT, EPOD)");
        }
    }
}
