package com.btl.webbanrau.service;

import com.btl.webbanrau.dto.request.AuthRequests;
import com.btl.webbanrau.dto.request.RegisterRequest;
import com.btl.webbanrau.model.Role;
import com.btl.webbanrau.model.UploadedAsset;
import com.btl.webbanrau.model.User;
import com.btl.webbanrau.repository.AuthAuditRepository;
import com.btl.webbanrau.repository.RoleRepository;
import com.btl.webbanrau.repository.UploadedAssetRepository;
import com.btl.webbanrau.repository.UserRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class AuthServiceCertificateTest {

    private UserRepository users;
    private RoleRepository roles;
    private PasswordEncoder encoder;
    private OtpService otp;
    private TokenService tokens;
    private AuthAuditRepository audit;
    private UploadedAssetRepository uploadedAssets;
    private CloudinaryService cloudinaryService;
    private AuthService authService;

    @BeforeEach
    void setUp() {
        users = mock(UserRepository.class);
        roles = mock(RoleRepository.class);
        encoder = mock(PasswordEncoder.class);
        otp = mock(OtpService.class);
        tokens = mock(TokenService.class);
        audit = mock(AuthAuditRepository.class);
        uploadedAssets = mock(UploadedAssetRepository.class);
        cloudinaryService = mock(CloudinaryService.class);

        when(encoder.encode(anyString())).thenReturn("hashed_password");
        when(roles.findByName("ROLE_FARMER")).thenReturn(Optional.of(new Role("ROLE_FARMER", "Farmer")));

        authService = new AuthService(users, roles, encoder, otp, tokens, audit, uploadedAssets, cloudinaryService);
        SecurityContextHolder.clearContext();
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    private void authenticateUser(User user) {
        var auth = new UsernamePasswordAuthenticationToken(user, null,
                List.of(new SimpleGrantedAuthority("ROLE_FARMER")));
        SecurityContextHolder.getContext().setAuthentication(auth);
    }

    @Test
    void testRegisterWithCertificateLinksAsset() {
        when(users.existsByUsername(anyString())).thenReturn(false);
        when(users.existsByEmail(anyString())).thenReturn(false);

        UploadedAsset unlinkedAsset = UploadedAsset.builder()
                .id(1L)
                .assetId("med_cert1")
                .publicId("hona_fresh/certificates/cert1")
                .secureUrl("https://res.cloudinary.com/test/image/authenticated/cert1.jpg")
                .userId(null)
                .isLinked(false)
                .build();

        when(uploadedAssets.findBySecureUrl("https://res.cloudinary.com/test/image/authenticated/cert1.jpg"))
                .thenReturn(Optional.of(unlinkedAsset));

        RegisterRequest req = RegisterRequest.builder()
                .username("farmer1")
                .password("Password12345!")
                .fullName("Farmer One")
                .email("farmer1@example.com")
                .phone("0912345678")
                .address("Da Lat")
                .companyName("Farm HTX")
                .registerRole("FARMER")
                .isHouseholdFarmer(true)
                .certificationUrl("https://res.cloudinary.com/test/image/authenticated/cert1.jpg")
                .build();

        when(users.saveAndFlush(any(User.class))).thenAnswer(inv -> {
            User u = inv.getArgument(0);
            u.setId(99L);
            return u;
        });

        authService.register(req);

        ArgumentCaptor<UploadedAsset> assetCaptor = ArgumentCaptor.forClass(UploadedAsset.class);
        verify(uploadedAssets, times(1)).save(assetCaptor.capture());
        assertEquals(99L, assetCaptor.getValue().getUserId());
        assertTrue(assetCaptor.getValue().isLinked());
    }

    @Test
    void testRegisterWithAlreadyClaimedAssetFails() {
        when(users.existsByUsername(anyString())).thenReturn(false);
        when(users.existsByEmail(anyString())).thenReturn(false);

        UploadedAsset claimedAsset = UploadedAsset.builder()
                .id(1L)
                .assetId("med_cert1")
                .publicId("hona_fresh/certificates/cert1")
                .secureUrl("https://res.cloudinary.com/test/image/authenticated/cert1.jpg")
                .userId(55L) // already owned by user 55
                .isLinked(true)
                .build();

        when(uploadedAssets.findBySecureUrl("https://res.cloudinary.com/test/image/authenticated/cert1.jpg"))
                .thenReturn(Optional.of(claimedAsset));

        RegisterRequest req = RegisterRequest.builder()
                .username("thief1")
                .password("Password12345!")
                .fullName("Thief One")
                .email("thief1@example.com")
                .phone("0912345678")
                .address("Da Lat")
                .companyName("Fake Farm")
                .registerRole("FARMER")
                .isHouseholdFarmer(true)
                .certificationUrl("https://res.cloudinary.com/test/image/authenticated/cert1.jpg")
                .build();

        AuthException ex = assertThrows(AuthException.class, () -> authService.register(req));
        assertEquals(403, ex.getStatus());
        assertEquals("ASSET_FORBIDDEN", ex.getError());
    }

    @Test
    void testProfileUpdateDeletesOldCloudinaryImageOnReplacement() {
        User existingUser = User.builder()
                .id(100L)
                .username("farmer100")
                .fullName("Farmer Hundred")
                .email("f100@example.com")
                .phone("0912345678")
                .address("Da Lat")
                .companyName("HTX Dalat")
                .householdFarmer(true)
                .certificationUrl("https://res.cloudinary.com/test/old.jpg")
                .certificationPublicId("hona_fresh/certificates/old_public_id")
                .roles(Set.of(new Role("ROLE_FARMER", "Farmer")))
                .build();

        authenticateUser(existingUser);
        when(users.findById(100L)).thenReturn(Optional.of(existingUser));

        UploadedAsset newAsset = UploadedAsset.builder()
                .id(2L)
                .assetId("med_new")
                .publicId("hona_fresh/certificates/new_public_id")
                .secureUrl("https://res.cloudinary.com/test/new.jpg")
                .userId(100L)
                .build();

        when(uploadedAssets.findBySecureUrl("https://res.cloudinary.com/test/new.jpg"))
                .thenReturn(Optional.of(newAsset));

        AuthRequests.Profile profileReq = new AuthRequests.Profile(
                "HTX Dalat Moi",
                "",
                true,
                "123456",
                "Vietcombank",
                "",
                "PUC-123",
                "VietGAP",
                "https://res.cloudinary.com/test/new.jpg",
                "0912345678",
                "Da Lat"
        );

        authService.profile(profileReq);

        // Verify that old certificate on Cloudinary was deleted
        verify(cloudinaryService, times(1)).deleteImage("hona_fresh/certificates/old_public_id", "authenticated");

        // Verify that user now has the new public ID
        assertEquals("hona_fresh/certificates/new_public_id", existingUser.getCertificationPublicId());
        assertEquals("https://res.cloudinary.com/test/new.jpg", existingUser.getCertificationUrl());
    }
}
