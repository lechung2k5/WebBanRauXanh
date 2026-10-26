package com.btl.webbanrau.service;

import com.btl.webbanrau.dto.request.*;
import com.btl.webbanrau.dto.response.AuthResponse;
import com.btl.webbanrau.model.*;
import com.btl.webbanrau.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.jwt.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.*;

@Service @RequiredArgsConstructor
public class AuthService {
    private final UserRepository users;
    private final RoleRepository roles;
    private final PasswordEncoder encoder;
    private final OtpService otp;
    private final TokenService tokens;
    private final AuthAuditRepository audit;
    @Value("${app.google.client-id:}") private String googleClientId;
    // Lazy JWK retrieval: startup must work without internet or Google configuration.
    private final JwtDecoder googleDecoder=NimbusJwtDecoder.withJwkSetUri("https://www.googleapis.com/oauth2/v3/certs").build();

    public static String email(String value) { return value.trim().toLowerCase(Locale.ROOT); }
    public static User current() {
        var auth=SecurityContextHolder.getContext().getAuthentication();
        if(auth==null || !(auth.getPrincipal() instanceof User user)) throw new AuthException(401,"UNAUTHENTICATED","Vui lòng đăng nhập");
        return user;
    }
    public static void approvedPartner(User user) {
        if(!TokenService.profileComplete(user)||!"VERIFIED".equals(user.getKycStatus())) throw new AuthException(403,"KYC_REQUIRED","Hoàn thiện hồ sơ và chờ Admin phê duyệt trước khi giao dịch.");
    }
    public static boolean has(User user,String role) { return user.getRoles().stream().anyMatch(r->r.getName().equals("ROLE_"+role)); }
    @Transactional
    public Map<String,Object> register(RegisterRequest r) {
        String username=r.getUsername().trim().toLowerCase(Locale.ROOT), email=email(r.getEmail());
        if(!username.matches("[a-z0-9_.-]{3,50}")) throw new AuthException(400,"INVALID_USERNAME","Tên đăng nhập chỉ gồm chữ thường, số, dấu chấm, gạch dưới hoặc gạch ngang");
        if(users.existsByUsername(username)||users.existsByEmail(email)) throw new AuthException(409,"ACCOUNT_EXISTS","Username hoặc email đã được sử dụng");
        if(!Set.of("FARMER","BUYER").contains(r.getRegisterRole())) throw new AuthException(400,"INVALID_ROLE","Chỉ cho phép đăng ký FARMER hoặc BUYER");
        checkPassword(r.getPassword());
        User u=User.builder().username(username).email(email).password(encoder.encode(r.getPassword())).fullName(r.getFullName().trim())
            .phone(r.getPhone()).address(r.getAddress()).companyName(r.getCompanyName()).taxCode(r.getTaxCode()).householdFarmer(r.isHouseholdFarmer())
            .individualBuyer(r.isIndividualBuyer())
            .bankAccountNo(r.getBankAccountNo()).bankName(r.getBankName()).warehouseAddress(r.getWarehouseAddress()).pucCode(r.getPucCode()).certification(r.getCertification())
            .roles(new HashSet<>(Set.of(roles.findByName("ROLE_"+r.getRegisterRole()).orElseThrow()))).build();
        u.setCertificationUrl(r.getCertificationUrl());
        if(!TokenService.profileComplete(u)) throw new AuthException(400,"INCOMPLETE_PROFILE","Thiếu thông tin hồ sơ B2B bắt buộc theo vai trò");
        users.saveAndFlush(u); otp.send(email,"REGISTER_VERIFICATION"); return challenge(email,"REGISTER_VERIFICATION");
    }
    @Transactional(noRollbackFor=AuthException.class)
    public Object login(LoginRequest r) {
        User u=users.findByUsernameOrEmail(email(r.getUsername()),email(r.getUsername())).orElse(null);
        if(u==null||!encoder.matches(r.getPassword(),u.getPassword())) throw new AuthException(401,"BAD_CREDENTIALS","Tên đăng nhập hoặc mật khẩu không chính xác");
        enabled(u);
        if(!u.isEmailVerified()) {
            try { otp.send(u.getEmail(),"REGISTER_VERIFICATION"); }
            catch(AuthException e) { if(e.getStatus()!=429) throw e; }
            return challenge(u.getEmail(),"REGISTER_VERIFICATION");
        }
        audit.save(new AuthAudit(u.getId(),u.getId(),"LOGIN_PASSWORD"));
        return tokens.issue(u,r.isRememberMe(),null,null);
    }
    @Transactional(noRollbackFor=AuthException.class)
    public AuthResponse verify(AuthRequests.Verify r, String type) {
        User u=users.lockByEmail(email(r.email())).orElseThrow(()->new AuthException(400,"INVALID_OTP","Mã không hợp lệ"));
        enabled(u); otp.verify(u.getEmail(),type,r.otp());
        if(type.equals("REGISTER_VERIFICATION")) u.setEmailVerified(true);
        else if(!u.isEmailVerified()) throw new AuthException(403,"EMAIL_UNVERIFIED","Hãy xác thực email trước");
        users.save(u); audit.save(new AuthAudit(u.getId(),u.getId(),"LOGIN_"+type));
        return tokens.issue(u,false,null,null);
    }
    @Transactional
    public Map<String,Object> request(String rawEmail, String type) {
        String email=email(rawEmail); User u=users.findByEmail(email).orElse(null);
        if(u!=null && u.isEnabled() && (type.equals("REGISTER_VERIFICATION")?!u.isEmailVerified():u.isEmailVerified())) otp.send(email,type);
        return challenge(email,type);
    }
    private Jwt googleToken(String raw) {
        if(googleClientId.isBlank()) throw new AuthException(503,"GOOGLE_NOT_CONFIGURED","Google Sign-In chưa được cấu hình");
        Jwt jwt;
        try { jwt=googleDecoder.decode(raw); } catch(JwtException ex) { throw new AuthException(401,"INVALID_GOOGLE_TOKEN","Google token không hợp lệ"); }
        if(!jwt.getAudience().contains(googleClientId)||!Set.of("https://accounts.google.com","accounts.google.com").contains(jwt.getClaimAsString("iss"))||!Boolean.TRUE.equals(jwt.getClaim("email_verified")))
            throw new AuthException(401,"INVALID_GOOGLE_TOKEN","Google token không hợp lệ");
        return jwt;
    }
    @Transactional
    public Map<String,Object> google(AuthRequests.Google r) {
        Jwt jwt=googleToken(r.idToken()); String address=email(jwt.getClaimAsString("email"));
        User u=users.findByGoogleId(jwt.getSubject()).orElse(null);
        if(u==null) {
            if(users.existsByEmail(address)) throw new AuthException(409,"LINK_REQUIRED","Email đã có tài khoản. Đăng nhập tài khoản hiện có để liên kết Google.");
            if(!Set.of("FARMER","BUYER").contains(Objects.toString(r.roleIfNewUser(),""))) throw new AuthException(400,"ROLE_REQUIRED","Hãy chọn vai trò FARMER hoặc BUYER");
            u=User.builder().username("g_"+UUID.randomUUID().toString().replace("-","")).email(address).googleId(jwt.getSubject()).authProvider("GOOGLE")
                .password(encoder.encode(TokenService.randomToken())).fullName(Objects.toString(jwt.getClaimAsString("name"),"Google user"))
                .emailVerified(true).roles(new HashSet<>(Set.of(roles.findByName("ROLE_"+r.roleIfNewUser()).orElseThrow()))).build();
            users.saveAndFlush(u);
        }
        enabled(u); otp.send(u.getEmail(),"GOOGLE_LOGIN"); return challenge(u.getEmail(),"GOOGLE_LOGIN");
    }
    @Transactional
    public void linkGoogle(String raw) {
        Jwt jwt=googleToken(raw); User u=users.findById(current().getId()).orElseThrow();
        if(!u.getEmail().equals(email(jwt.getClaimAsString("email")))) throw new AuthException(400,"EMAIL_MISMATCH","Google email không trùng email tài khoản");
        u.setGoogleId(jwt.getSubject()); users.save(u);
    }
    @Transactional(noRollbackFor=AuthException.class)
    public void reset(AuthRequests.Reset r,String type) {
        User u=users.lockByEmail(email(r.email())).orElseThrow(()->new AuthException(400,"INVALID_OTP","Mã không hợp lệ"));
        enabled(u); checkPassword(r.password()); otp.verify(u.getEmail(),type,r.otp());
        u.setPassword(encoder.encode(r.password())); u.setEmailVerified(true); tokens.revoke(u);
    }
    @Transactional
    public AuthResponse profile(AuthRequests.Profile r) {
        User u=users.findById(current().getId()).orElseThrow();
        if(!has(u,"FARMER")&&!has(u,"BUYER")) throw new AuthException(403,"PARTNER_REQUIRED","Chỉ đối tác được cập nhật hồ sơ B2B");
        u.setCompanyName(r.companyName()); u.setTaxCode(r.taxCode()); u.setHouseholdFarmer(r.isHouseholdFarmer()); u.setBankAccountNo(r.bankAccountNo());
        u.setBankName(r.bankName()); u.setWarehouseAddress(r.warehouseAddress()); u.setPhone(r.phone()); u.setAddress(r.address()); u.setPucCode(r.pucCode()); u.setCertification(r.certification());
        if(!TokenService.profileComplete(u)) throw new AuthException(400,"INCOMPLETE_PROFILE","Thiếu thông tin hồ sơ B2B bắt buộc theo vai trò");
        u.setCertificationUrl(r.certificationUrl());u.setKycStatus("PENDING"); u.setKycNote(null); users.save(u); return TokenService.view(u);
    }
    public AuthResponse getCurrentUser() { return TokenService.view(current()); }
    private static void enabled(User u) { if(!u.isEnabled()) throw new AuthException(403,"ACCOUNT_DISABLED","Tài khoản đã bị khóa"); }
    private static void checkPassword(String s) { if(s.getBytes(java.nio.charset.StandardCharsets.UTF_8).length>72||s.length()<10) throw new AuthException(400,"WEAK_PASSWORD","Mật khẩu phải từ 10 ký tự và tối đa 72 bytes"); }
    public static Map<String,Object> challenge(String email,String type) { return Map.of("email",email,"requireOtp",true,"otpType",type,"otpExpirySeconds",300,"resendAfterSeconds",60); }
}
