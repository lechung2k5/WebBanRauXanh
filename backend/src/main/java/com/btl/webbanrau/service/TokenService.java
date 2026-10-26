package com.btl.webbanrau.service;

import com.btl.webbanrau.model.*;
import com.btl.webbanrau.repository.*;
import com.btl.webbanrau.dto.response.AuthResponse;
import com.nimbusds.jose.jwk.source.ImmutableSecret;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.*;
import java.time.*;
import java.util.*;

@Service
public class TokenService {
    private final RefreshTokenRepository tokens;
    private final UserRepository users;
    private final JwtEncoder encoder;
    private final JwtDecoder decoder;
    private final long accessSeconds;
    private static final SecureRandom RANDOM = new SecureRandom();
    public TokenService(RefreshTokenRepository tokens, UserRepository users,
                        @Value("${app.jwt.secret}") String secret, @Value("${app.jwt.access-seconds:900}") long seconds) {
        byte[] bytes=secret.getBytes(StandardCharsets.UTF_8);
        if(bytes.length<32) throw new IllegalStateException("JWT_SECRET phải có ít nhất 32 bytes");
        this.tokens=tokens; this.users=users; this.accessSeconds=seconds;
        encoder=new NimbusJwtEncoder(new ImmutableSecret<>(bytes));
        NimbusJwtDecoder jwtDecoder=NimbusJwtDecoder.withSecretKey(new SecretKeySpec(bytes,"HmacSHA256")).macAlgorithm(MacAlgorithm.HS256).build();
        jwtDecoder.setJwtValidator(JwtValidators.createDefaultWithIssuer("hona-fresh"));
        decoder=jwtDecoder;
    }
    public User authenticate(String raw) {
        Jwt jwt=decoder.decode(raw);
        if(!jwt.getAudience().contains("hona-api")) throw new AuthException(401,"INVALID_TOKEN","Token không hợp lệ");
        User user=users.findById(Long.valueOf(jwt.getSubject())).orElseThrow(()->new AuthException(401,"INVALID_TOKEN","Tài khoản không tồn tại"));
        Number version=jwt.getClaim("version");
        if(!user.isEnabled() || !user.isEmailVerified() || version==null || version.longValue()!=user.getTokenVersion())
            throw new AuthException(401,"SESSION_REVOKED","Phiên đã bị thu hồi");
        return user;
    }
    public static String randomToken() { byte[] bytes=new byte[32]; RANDOM.nextBytes(bytes); return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes); }
    public static String hash(String raw) {
        try { return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(raw.getBytes(StandardCharsets.UTF_8))); }
        catch(NoSuchAlgorithmException e) { throw new IllegalStateException(e); }
    }
    public AuthResponse issue(User user, boolean remember, String family, Instant deadline) {
        Instant now=Instant.now();
        String raw=randomToken();
        RefreshToken refresh=new RefreshToken(); refresh.setUser(user); refresh.setTokenHash(hash(raw));
        refresh.setFamilyId(family==null?UUID.randomUUID().toString():family); refresh.setRememberMe(remember);
        refresh.setExpiresAt(deadline==null?now.plus(Duration.ofDays(remember?30:7)):deadline); tokens.save(refresh);
        JwtClaimsSet claims=JwtClaimsSet.builder().issuer("hona-fresh").audience(List.of("hona-api")).subject(user.getId().toString())
            .issuedAt(now).expiresAt(now.plusSeconds(accessSeconds)).id(UUID.randomUUID().toString())
            .claim("userId",user.getId()).claim("username",user.getUsername()).claim("email",user.getEmail())
            .claim("roles",user.getRoles().stream().map(Role::getName).toList()).claim("fullName",user.getFullName())
            .claim("companyName",Objects.toString(user.getCompanyName(),"")).claim("kycStatus",user.getKycStatus()).claim("version",user.getTokenVersion()).build();
        AuthResponse result=view(user);
        result.setAccessToken(encoder.encode(JwtEncoderParameters.from(JwsHeader.with(MacAlgorithm.HS256).build(),claims)).getTokenValue());
        result.setRefreshToken(raw); result.setExpiresInSeconds(accessSeconds);
        result.setRefreshExpiresInSeconds(Math.max(0,Duration.between(now,refresh.getExpiresAt()).toSeconds()));
        return result;
    }
    @Transactional(noRollbackFor=AuthException.class)
    public AuthResponse refresh(String raw) {
        RefreshToken old=tokens.findByTokenHash(hash(raw)).orElseThrow(()->new AuthException(401,"INVALID_REFRESH","Phiên không hợp lệ"));
        if(old.isRevoked()) {
            tokens.revokeFamily(old.getFamilyId());
            User user=old.getUser(); user.setTokenVersion(user.getTokenVersion()+1); users.save(user);
            throw new AuthException(401,"REFRESH_REUSED","Phát hiện sử dụng lại token. Vui lòng đăng nhập lại.");
        }
        if(!old.getExpiresAt().isAfter(Instant.now()) || !old.getUser().isEnabled() || !old.getUser().isEmailVerified())
            throw new AuthException(401,"SESSION_EXPIRED","Phiên đã hết hạn hoặc bị khóa");
        old.setRevoked(true); tokens.saveAndFlush(old);
        return issue(old.getUser(),old.isRememberMe(),old.getFamilyId(),old.getExpiresAt());
    }
    @Transactional
    public void logout(String raw) {
        tokens.findByTokenHash(hash(raw)).ifPresent(t->{tokens.revokeFamily(t.getFamilyId()); User u=t.getUser(); u.setTokenVersion(u.getTokenVersion()+1); users.save(u);});
    }
    @Transactional
    public void revoke(User user) { tokens.revokeUser(user.getId()); user.setTokenVersion(user.getTokenVersion()+1); users.save(user); }
    public static boolean profileComplete(User u) {
        boolean buyer=u.getRoles().stream().anyMatch(r->r.getName().equals("ROLE_BUYER"));
        boolean farmer=u.getRoles().stream().anyMatch(r->r.getName().equals("ROLE_FARMER"));
        if(!buyer&&!farmer) return true;
        return present(u.getCompanyName()) && present(u.getPhone()) && present(u.getAddress()) &&
            (buyer ? present(u.getWarehouseAddress()) : (u.isHouseholdFarmer() || present(u.getTaxCode())));
    }
    private static boolean present(String s) { return s!=null&&!s.isBlank(); }
    public static AuthResponse view(User u) {
        return AuthResponse.builder().id(u.getId()).username(u.getUsername()).fullName(u.getFullName()).email(u.getEmail())
            .phone(u.getPhone()).address(u.getAddress()).roles(u.getRoles().stream().map(Role::getName).toList()).enabled(u.isEnabled())
            .emailVerified(u.isEmailVerified()).companyName(u.getCompanyName()).taxCode(u.getTaxCode()).warehouseAddress(u.getWarehouseAddress())
            .bankAccountNo(u.getBankAccountNo()).bankName(u.getBankName()).householdFarmer(u.isHouseholdFarmer()).individualBuyer(u.isIndividualBuyer()).pucCode(u.getPucCode())
            .certification(u.getCertification()).certificationUrl(u.getCertificationUrl()).kycStatus(u.getKycStatus()).kycNote(u.getKycNote()).profileComplete(profileComplete(u)).build();
    }
}
