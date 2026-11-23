package com.btl.webbanrau.dto.response;

public record ImageUploadResponse(
        String assetId,
        String url,
        String publicId,
        String resourceType
) {}
