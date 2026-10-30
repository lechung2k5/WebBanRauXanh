package com.btl.webbanrau.controller;

import com.btl.webbanrau.dto.response.ApiResponse;
import com.btl.webbanrau.dto.response.ImageUploadResponse;
import com.btl.webbanrau.model.ImagePurpose;
import com.btl.webbanrau.model.UploadedAsset;
import com.btl.webbanrau.model.User;
import com.btl.webbanrau.repository.UploadedAssetRepository;
import com.btl.webbanrau.service.AuthException;
import com.btl.webbanrau.service.AuthService;
import com.btl.webbanrau.service.CloudinaryService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/uploads")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Upload Controller", description = "Quản lý upload ảnh qua Cloudinary")
public class UploadController {

    private final CloudinaryService cloudinaryService;
    private final UploadedAssetRepository uploadedAssetRepository;

    @PostMapping(value = "/images", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @Operation(summary = "Upload một ảnh lên Cloudinary")
    public ResponseEntity<ApiResponse<ImageUploadResponse>> uploadImage(
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "purpose", defaultValue = "CERTIFICATE") String purposeStr,
            HttpServletRequest request
    ) throws IOException {
        if (file == null || file.isEmpty()) {
            throw new AuthException(400, "MISSING_FILE", "Vui lòng chọn tệp ảnh để tải lên");
        }

        if (file.getSize() > 5 * 1024 * 1024) {
            throw new AuthException(400, "FILE_TOO_LARGE", "Dung lượng ảnh vượt quá giới hạn cho phép (tối đa 5 MB)");
        }

        ImagePurpose purpose = ImagePurpose.fromString(purposeStr);

        User currentUser = null;
        try {
            currentUser = AuthService.current();
        } catch (AuthException e) {
            // Unauthenticated user
        }

        // Kiểm tra quyền theo mục đích
        if (purpose != ImagePurpose.CERTIFICATE && currentUser == null) {
            throw new AuthException(401, "UNAUTHENTICATED", "Vui lòng đăng nhập để thực hiện tải ảnh cho mục đích này");
        }

        if (currentUser != null) {
            if (purpose == ImagePurpose.CATEGORY && !AuthService.has(currentUser, "ADMIN")) {
                throw new AuthException(403, "FORBIDDEN", "Chỉ quản trị viên mới có quyền tải ảnh danh mục");
            }
            if ((purpose == ImagePurpose.LOT || purpose == ImagePurpose.PRODUCT)
                    && !AuthService.has(currentUser, "FARMER") && !AuthService.has(currentUser, "ADMIN")) {
                throw new AuthException(403, "FORBIDDEN", "Chỉ Nông trại hoặc Quản trị viên mới có quyền tải ảnh sản phẩm / lô nông sản");
            }
            if (purpose == ImagePurpose.EPOD
                    && !AuthService.has(currentUser, "BUYER") && !AuthService.has(currentUser, "DRIVER") && !AuthService.has(currentUser, "ADMIN")) {
                throw new AuthException(403, "FORBIDDEN", "Chỉ Thương lái, Tài xế hoặc Quản trị viên mới có quyền tải ảnh giao nhận ePOD");
            }
        }

        byte[] bytes = file.getBytes();
        validateImageContent(bytes, file.getOriginalFilename());

        // Phân quyền phân phối: CERTIFICATE có thông tin KYC riêng tư dùng 'authenticated', sản phẩm dùng 'upload'
        String deliveryType = (purpose == ImagePurpose.CERTIFICATE) ? "authenticated" : "upload";

        Map<?, ?> result = cloudinaryService.uploadImage(bytes, file.getOriginalFilename(), purpose, deliveryType);

        String publicId = (String) result.get("public_id");
        String secureUrl = (String) result.get("secure_url");
        String format = (String) result.get("format");
        Object resTypeObj = result.get("resource_type");
        String resourceType = resTypeObj != null ? resTypeObj.toString() : "image";
        Long fileSize = result.get("bytes") instanceof Number n ? n.longValue() : file.getSize();
        Integer width = result.get("width") instanceof Number n ? n.intValue() : null;
        Integer height = result.get("height") instanceof Number n ? n.intValue() : null;

        String assetId = "med_" + UUID.randomUUID().toString().replace("-", "").substring(0, 16);

        UploadedAsset asset = UploadedAsset.builder()
                .assetId(assetId)
                .publicId(publicId)
                .secureUrl(secureUrl)
                .resourceType(resourceType)
                .deliveryType(deliveryType)
                .format(format)
                .fileSize(fileSize)
                .width(width)
                .height(height)
                .purpose(purpose.name())
                .userId(currentUser != null ? currentUser.getId() : null)
                .ipAddress(request.getRemoteAddr())
                .isLinked(false)
                .build();

        uploadedAssetRepository.save(asset);

        // Với tài nguyên authenticated, tạo URL xem có chữ ký
        String viewUrl = secureUrl;
        if ("authenticated".equalsIgnoreCase(deliveryType)) {
            String signed = cloudinaryService.generateSignedUrl(publicId, deliveryType);
            if (signed != null) {
                viewUrl = signed;
            }
        }

        ImageUploadResponse response = new ImageUploadResponse(
                assetId,
                viewUrl,
                publicId,
                resourceType
        );

        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @DeleteMapping("/images/{assetId}")
    @Operation(summary = "Xóa ảnh do người dùng tải lên")
    public ResponseEntity<ApiResponse<Void>> deleteImage(@PathVariable String assetId) {
        User currentUser = AuthService.current();
        UploadedAsset asset = uploadedAssetRepository.findByAssetId(assetId)
                .orElseThrow(() -> new AuthException(404, "NOT_FOUND", "Không tìm thấy tài nguyên ảnh"));

        if (asset.getUserId() != null && !asset.getUserId().equals(currentUser.getId()) && !AuthService.has(currentUser, "ADMIN")) {
            throw new AuthException(403, "ASSET_FORBIDDEN", "Bạn không có quyền xóa tài nguyên ảnh này");
        }

        cloudinaryService.deleteImage(asset.getPublicId(), asset.getDeliveryType());
        uploadedAssetRepository.delete(asset);

        return ResponseEntity.ok(ApiResponse.success("Đã xóa ảnh thành công", null));
    }

    @GetMapping("/images/{assetId}/signed-url")
    @Operation(summary = "Lấy URL xem ảnh có chữ ký (dành cho chứng chỉ riêng tư)")
    public ResponseEntity<ApiResponse<Map<String, String>>> getSignedUrl(@PathVariable String assetId) {
        User currentUser = AuthService.current();
        UploadedAsset asset = uploadedAssetRepository.findByAssetId(assetId)
                .orElseThrow(() -> new AuthException(404, "NOT_FOUND", "Không tìm thấy tài nguyên ảnh"));

        if (asset.getUserId() != null && !asset.getUserId().equals(currentUser.getId()) && !AuthService.has(currentUser, "ADMIN")) {
            throw new AuthException(403, "ASSET_FORBIDDEN", "Bạn không có quyền xem tài nguyên ảnh này");
        }

        String url = cloudinaryService.generateSignedUrl(asset.getPublicId(), asset.getDeliveryType());
        if (url == null) {
            url = asset.getSecureUrl();
        }

        return ResponseEntity.ok(ApiResponse.success(Map.of("url", url)));
    }

    private void validateImageContent(byte[] bytes, String originalFilename) {
        if (bytes == null || bytes.length < 12) {
            throw new AuthException(400, "INVALID_FILE", "Nội dung tệp quá ngắn hoặc không hợp lệ");
        }

        boolean isJpeg = (bytes[0] == (byte) 0xFF && bytes[1] == (byte) 0xD8 && bytes[2] == (byte) 0xFF);
        boolean isPng = (bytes[0] == (byte) 0x89 && bytes[1] == (byte) 0x50 && bytes[2] == (byte) 0x4E && bytes[3] == (byte) 0x47
                && bytes[4] == (byte) 0x0D && bytes[5] == (byte) 0x0A && bytes[6] == (byte) 0x1A && bytes[7] == (byte) 0x0A);
        boolean isWebp = (bytes[0] == 'R' && bytes[1] == 'I' && bytes[2] == 'F' && bytes[3] == 'F'
                && bytes[8] == 'W' && bytes[9] == 'E' && bytes[10] == 'B' && bytes[11] == 'P');

        if (!isJpeg && !isPng && !isWebp) {
            throw new AuthException(400, "INVALID_FILE_TYPE",
                    "Nội dung tệp không phải định dạng ảnh hợp lệ. Chỉ chấp nhận ảnh JPEG, PNG, WebP.");
        }

        try {
            BufferedImage image = ImageIO.read(new ByteArrayInputStream(bytes));
            if (image == null) {
                throw new AuthException(400, "CORRUPTED_IMAGE", "Dữ liệu ảnh bị lỗi hoặc không thể giải mã");
            }
            int width = image.getWidth();
            int height = image.getHeight();
            if (width > 8000 || height > 8000 || ((long) width * height > 40_000_000L)) {
                throw new AuthException(400, "IMAGE_DIMENSIONS_TOO_LARGE",
                        "Độ phân giải ảnh quá lớn (" + width + "x" + height + "). Vui lòng chọn ảnh có kích thước nhỏ hơn.");
            }
        } catch (IOException e) {
            throw new AuthException(400, "CORRUPTED_IMAGE", "Lỗi giải mã hình ảnh: " + e.getMessage());
        }
    }
}
