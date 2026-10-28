package com.btl.webbanrau.service;

import com.btl.webbanrau.model.ImagePurpose;
import com.cloudinary.Cloudinary;
import com.cloudinary.Url;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

class CloudinaryServiceTest {

    private Cloudinary cloudinaryMock;
    private CloudinaryService cloudinaryService;

    @BeforeEach
    void setUp() {
        cloudinaryMock = Mockito.mock(Cloudinary.class);
        cloudinaryService = new CloudinaryService(cloudinaryMock);
    }

    @Test
    void isConfiguredReturnsFalseWhenNull() {
        CloudinaryService unconfigured = new CloudinaryService(null);
        assertFalse(unconfigured.isConfigured());

        AuthException ex = assertThrows(AuthException.class, () ->
                unconfigured.uploadImage(new byte[]{1, 2, 3}, "test.jpg", ImagePurpose.CERTIFICATE, "authenticated"));
        assertEquals(503, ex.getStatus());
        assertEquals("CLOUDINARY_NOT_CONFIGURED", ex.getError());
    }

    @Test
    void isConfiguredReturnsTrueWhenCloudinaryBeanPresent() {
        assertTrue(cloudinaryService.isConfigured());
    }

    @Test
    void resolveFolderAssignsCorrectWhitelistFolders() {
        assertEquals("hona_fresh/certificates", cloudinaryService.resolveFolder(ImagePurpose.CERTIFICATE));
        assertEquals("hona_fresh/products", cloudinaryService.resolveFolder(ImagePurpose.PRODUCT));
        assertEquals("hona_fresh/avatars", cloudinaryService.resolveFolder(ImagePurpose.AVATAR));
        assertEquals("hona_fresh/lots", cloudinaryService.resolveFolder(ImagePurpose.LOT));
        assertEquals("hona_fresh/categories", cloudinaryService.resolveFolder(ImagePurpose.CATEGORY));
        assertEquals("hona_fresh/epod", cloudinaryService.resolveFolder(ImagePurpose.EPOD));
    }

    @Test
    void deleteImageGracefullyHandlesNullOrBlank() {
        assertDoesNotThrow(() -> cloudinaryService.deleteImage(null, "upload"));
        assertDoesNotThrow(() -> cloudinaryService.deleteImage("", "upload"));
        verifyNoInteractions(cloudinaryMock);
    }

    @Test
    void generateSignedUrlReturnsUrlWhenConfigured() {
        Url urlMock = mock(Url.class);
        when(cloudinaryMock.url()).thenReturn(urlMock);
        when(urlMock.resourceType(anyString())).thenReturn(urlMock);
        when(urlMock.type(anyString())).thenReturn(urlMock);
        when(urlMock.signed(true)).thenReturn(urlMock);
        when(urlMock.secure(true)).thenReturn(urlMock);
        when(urlMock.generate(anyString())).thenReturn("https://res.cloudinary.com/test/image/authenticated/s--123--/v1/test.jpg");

        String result = cloudinaryService.generateSignedUrl("hona_fresh/certificates/abc", "authenticated");
        assertNotNull(result);
        assertTrue(result.contains("authenticated"));
    }
}
