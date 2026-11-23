package com.btl.webbanrau.controller;

import com.btl.webbanrau.config.ApiExceptionHandler;
import com.btl.webbanrau.model.ImagePurpose;
import com.btl.webbanrau.model.Role;
import com.btl.webbanrau.model.UploadedAsset;
import com.btl.webbanrau.model.User;
import com.btl.webbanrau.repository.UploadedAssetRepository;
import com.btl.webbanrau.service.AuthException;
import com.btl.webbanrau.service.CloudinaryService;
import org.hamcrest.Matchers;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentMatchers;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.*;

import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

class CloudinaryUploadTest {

    private MockMvc mockMvc;
    private CloudinaryService cloudinaryService;
    private UploadedAssetRepository uploadedAssetRepository;
    private UploadController uploadController;

    private byte[] validJpegBytes;
    private byte[] validPngBytes;

    @BeforeEach
    void setUp() throws IOException {
        cloudinaryService = mock(CloudinaryService.class);
        uploadedAssetRepository = mock(UploadedAssetRepository.class);
        uploadController = new UploadController(cloudinaryService, uploadedAssetRepository);

        mockMvc = MockMvcBuilders.standaloneSetup(uploadController)
                .setControllerAdvice(new ApiExceptionHandler())
                .build();

        // Tạo ảnh JPEG 10x10 hợp lệ
        BufferedImage jpegImg = new BufferedImage(10, 10, BufferedImage.TYPE_INT_RGB);
        ByteArrayOutputStream jpegBaos = new ByteArrayOutputStream();
        ImageIO.write(jpegImg, "jpg", jpegBaos);
        validJpegBytes = jpegBaos.toByteArray();

        // Tạo ảnh PNG 10x10 hợp lệ
        BufferedImage pngImg = new BufferedImage(10, 10, BufferedImage.TYPE_INT_ARGB);
        ByteArrayOutputStream pngBaos = new ByteArrayOutputStream();
        ImageIO.write(pngImg, "png", pngBaos);
        validPngBytes = pngBaos.toByteArray();

        SecurityContextHolder.clearContext();
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    private void authenticateUser(Long userId, String username, String role) {
        User user = User.builder()
                .id(userId)
                .username(username)
                .email(username + "@example.com")
                .fullName(username)
                .roles(Set.of(new Role("ROLE_" + role, role)))
                .build();

        var auth = new UsernamePasswordAuthenticationToken(user, null,
                List.of(new SimpleGrantedAuthority("ROLE_" + role)));
        SecurityContextHolder.getContext().setAuthentication(auth);
    }

    @Test
    void testUploadValidJpegForCertificate() throws Exception {
        Map<String, Object> uploadResult = new HashMap<>();
        uploadResult.put("public_id", "hona_fresh/certificates/cert_123");
        uploadResult.put("secure_url", "https://res.cloudinary.com/test/image/authenticated/v1/hona_fresh/certificates/cert_123.jpg");
        uploadResult.put("format", "jpg");
        uploadResult.put("bytes", validJpegBytes.length);
        uploadResult.put("resource_type", "image");

        doReturn(uploadResult).when(cloudinaryService).uploadImage(ArgumentMatchers.any(), ArgumentMatchers.anyString(), eq(ImagePurpose.CERTIFICATE), eq("authenticated"));

        when(cloudinaryService.generateSignedUrl(eq("hona_fresh/certificates/cert_123"), eq("authenticated")))
                .thenReturn("https://res.cloudinary.com/test/image/authenticated/s--signed--/v1/hona_fresh/certificates/cert_123.jpg");

        MockMultipartFile file = new MockMultipartFile(
                "file", "cert.jpg", "image/jpeg", validJpegBytes);

        mockMvc.perform(multipart("/uploads/images")
                        .file(file)
                        .param("purpose", "CERTIFICATE"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code", Matchers.is(200)))
                .andExpect(jsonPath("$.result.assetId", Matchers.startsWith("med_")))
                .andExpect(jsonPath("$.result.publicId", Matchers.is("hona_fresh/certificates/cert_123")))
                .andExpect(jsonPath("$.result.url", Matchers.containsString("s--signed--")))
                .andExpect(jsonPath("$.result.resourceType", Matchers.is("image")));

        verify(uploadedAssetRepository, times(1)).save(ArgumentMatchers.any(UploadedAsset.class));
    }

    @Test
    void testUploadValidPngForProduct() throws Exception {
        authenticateUser(10L, "farmer1", "FARMER");

        Map<String, Object> uploadResult = new HashMap<>();
        uploadResult.put("public_id", "hona_fresh/products/prod_456");
        uploadResult.put("secure_url", "https://res.cloudinary.com/test/image/upload/v1/hona_fresh/products/prod_456.png");
        uploadResult.put("format", "png");
        uploadResult.put("bytes", validPngBytes.length);
        uploadResult.put("resource_type", "image");

        doReturn(uploadResult).when(cloudinaryService).uploadImage(ArgumentMatchers.any(), ArgumentMatchers.anyString(), eq(ImagePurpose.PRODUCT), eq("upload"));

        MockMultipartFile file = new MockMultipartFile(
                "file", "rau.png", "image/png", validPngBytes);

        mockMvc.perform(multipart("/uploads/images")
                        .file(file)
                        .param("purpose", "PRODUCT"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code", Matchers.is(200)))
                .andExpect(jsonPath("$.result.publicId", Matchers.is("hona_fresh/products/prod_456")))
                .andExpect(jsonPath("$.result.url", Matchers.containsString("prod_456.png")));
    }

    @Test
    void testUploadEmptyFileFails() throws Exception {
        MockMultipartFile emptyFile = new MockMultipartFile("file", "empty.jpg", "image/jpeg", new byte[0]);

        mockMvc.perform(multipart("/uploads/images")
                        .file(emptyFile)
                        .param("purpose", "CERTIFICATE"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error", Matchers.is("MISSING_FILE")));
    }

    @Test
    void testUploadFileExceeds5MBFails() throws Exception {
        byte[] oversizedBytes = new byte[5 * 1024 * 1024 + 10];
        MockMultipartFile hugeFile = new MockMultipartFile("file", "huge.jpg", "image/jpeg", oversizedBytes);

        mockMvc.perform(multipart("/uploads/images")
                        .file(hugeFile)
                        .param("purpose", "CERTIFICATE"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error", Matchers.is("FILE_TOO_LARGE")));
    }

    @Test
    void testSpoofedExtensionRejectedByMagicBytes() throws Exception {
        byte[] fakeBytes = "MZ\0\0\0\0\0\0This is a Windows executable renamed to jpg".getBytes();
        MockMultipartFile fakeFile = new MockMultipartFile("file", "malware.jpg", "image/jpeg", fakeBytes);

        mockMvc.perform(multipart("/uploads/images")
                        .file(fakeFile)
                        .param("purpose", "CERTIFICATE"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error", Matchers.is("INVALID_FILE_TYPE")));
    }

    @Test
    void testInvalidPurposeRejected() throws Exception {
        MockMultipartFile file = new MockMultipartFile("file", "photo.jpg", "image/jpeg", validJpegBytes);

        mockMvc.perform(multipart("/uploads/images")
                        .file(file)
                        .param("purpose", "INVALID_PURPOSE_HERE"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void testUnauthenticatedUserUploadingProductRejected() throws Exception {
        MockMultipartFile file = new MockMultipartFile("file", "prod.jpg", "image/jpeg", validJpegBytes);

        mockMvc.perform(multipart("/uploads/images")
                        .file(file)
                        .param("purpose", "PRODUCT"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.error", Matchers.is("UNAUTHENTICATED")));
    }

    @Test
    void testNonAdminUploadingCategoryRejected() throws Exception {
        authenticateUser(20L, "buyer1", "BUYER");
        MockMultipartFile file = new MockMultipartFile("file", "cat.jpg", "image/jpeg", validJpegBytes);

        mockMvc.perform(multipart("/uploads/images")
                        .file(file)
                        .param("purpose", "CATEGORY"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.error", Matchers.is("FORBIDDEN")));
    }

    @Test
    void testCloudinaryNotConfiguredThrows503() throws Exception {
        doThrow(new AuthException(503, "CLOUDINARY_NOT_CONFIGURED", "Dịch vụ tải ảnh Cloudinary chưa được cấu hình"))
                .when(cloudinaryService).uploadImage(ArgumentMatchers.any(), ArgumentMatchers.anyString(), ArgumentMatchers.any(), ArgumentMatchers.anyString());

        MockMultipartFile file = new MockMultipartFile("file", "cert.jpg", "image/jpeg", validJpegBytes);

        mockMvc.perform(multipart("/uploads/images")
                        .file(file)
                        .param("purpose", "CERTIFICATE"))
                .andExpect(status().isServiceUnavailable())
                .andExpect(jsonPath("$.code", Matchers.is(503)))
                .andExpect(jsonPath("$.error", Matchers.is("CLOUDINARY_NOT_CONFIGURED")));
    }

    @Test
    void testDeleteAssetForbiddenForNonOwner() throws Exception {
        authenticateUser(100L, "farmer1", "FARMER");

        UploadedAsset otherUserAsset = UploadedAsset.builder()
                .assetId("med_abc123")
                .publicId("hona_fresh/certificates/other")
                .userId(200L) // khác 100L
                .build();

        when(uploadedAssetRepository.findByAssetId("med_abc123")).thenReturn(Optional.of(otherUserAsset));

        mockMvc.perform(delete("/uploads/images/med_abc123"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.error", Matchers.is("ASSET_FORBIDDEN")));

        verify(cloudinaryService, never()).deleteImage(anyString(), anyString());
    }

    @Test
    void testDeleteAssetAllowedForOwner() throws Exception {
        authenticateUser(100L, "farmer1", "FARMER");

        UploadedAsset myAsset = UploadedAsset.builder()
                .assetId("med_my123")
                .publicId("hona_fresh/certificates/mine")
                .deliveryType("authenticated")
                .userId(100L)
                .build();

        when(uploadedAssetRepository.findByAssetId("med_my123")).thenReturn(Optional.of(myAsset));

        mockMvc.perform(delete("/uploads/images/med_my123"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code", Matchers.is(200)));

        verify(cloudinaryService, times(1)).deleteImage("hona_fresh/certificates/mine", "authenticated");
        verify(uploadedAssetRepository, times(1)).delete(myAsset);
    }

    @Test
    void testGetSignedUrlForbiddenForNonOwner() throws Exception {
        authenticateUser(100L, "farmer1", "FARMER");

        UploadedAsset otherUserAsset = UploadedAsset.builder()
                .assetId("med_secret456")
                .publicId("hona_fresh/certificates/secret")
                .userId(200L)
                .build();

        when(uploadedAssetRepository.findByAssetId("med_secret456")).thenReturn(Optional.of(otherUserAsset));

        mockMvc.perform(get("/uploads/images/med_secret456/signed-url"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.error", Matchers.is("ASSET_FORBIDDEN")));
    }

    @Test
    void testGetSignedUrlAllowedForAdmin() throws Exception {
        authenticateUser(1L, "admin", "ADMIN");

        UploadedAsset asset = UploadedAsset.builder()
                .assetId("med_secret456")
                .publicId("hona_fresh/certificates/secret")
                .deliveryType("authenticated")
                .userId(200L)
                .build();

        when(uploadedAssetRepository.findByAssetId("med_secret456")).thenReturn(Optional.of(asset));
        when(cloudinaryService.generateSignedUrl("hona_fresh/certificates/secret", "authenticated"))
                .thenReturn("https://res.cloudinary.com/test/image/authenticated/s--admin--/v1/hona_fresh/certificates/secret.jpg");

        mockMvc.perform(get("/uploads/images/med_secret456/signed-url"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.result.url", Matchers.containsString("s--admin--")));
    }
}
