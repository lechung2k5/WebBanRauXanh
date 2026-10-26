package com.btl.webbanrau.service;

import com.btl.webbanrau.model.*;
import com.btl.webbanrau.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.security.SecureRandom;
import java.time.Instant;
import java.util.Set;

@Service @RequiredArgsConstructor
public class OtpService {
    private final EmailOtpRepository otps;
    private final UserRepository users;
    private final PasswordEncoder encoder;
    private final MailService mail;
    private static final SecureRandom RANDOM=new SecureRandom();
    public static final Set<String> TYPES=Set.of("REGISTER_VERIFICATION","LOGIN_OTP","GOOGLE_LOGIN","FORGOT_PASSWORD","STAFF_ACTIVATION");
    @Transactional(noRollbackFor=AuthException.class)
    public void send(String email, String type) {
        if(!TYPES.contains(type)) throw new AuthException(400,"INVALID_OTP_TYPE","Mục đích OTP không hợp lệ");
        users.lockByEmail(email).orElseThrow(()->new AuthException(400,"INVALID_ACCOUNT","Tài khoản không hợp lệ"));
        EmailOtp old=otps.findFirstByEmailAndOtpTypeOrderByIdDesc(email,type).orElse(null);
        if(old!=null && old.getCreatedAt().plusSeconds(60).isAfter(Instant.now())) throw new AuthException(429,"OTP_COOLDOWN","Vui lòng chờ 60 giây trước khi gửi lại mã");
        String code=String.format("%06d",RANDOM.nextInt(1_000_000));
        EmailOtp otp=new EmailOtp(); otp.setEmail(email); otp.setOtpType(type);
        otp.setOtpCodeHash(encoder.encode(code)); otp.setExpiresAt(Instant.now().plusSeconds(300));
        mail.otp(email,code);
        if(old!=null) { old.setUsed(true); otps.save(old); }
        otps.save(otp);
    }
    // The outer authentication transaction also commits failed-attempt counters.
    public void verify(String email, String type, String code) {
        users.lockByEmail(email).orElseThrow(()->new AuthException(400,"INVALID_OTP","Mã không hợp lệ"));
        EmailOtp otp=otps.findFirstByEmailAndOtpTypeOrderByIdDesc(email,type).orElseThrow(()->new AuthException(400,"INVALID_OTP","Mã không hợp lệ hoặc đã hết hạn"));
        if(otp.isUsed()||otp.getAttempts()>=5||!otp.getExpiresAt().isAfter(Instant.now())) throw new AuthException(400,"INVALID_OTP","Mã đã hết hạn, đã dùng hoặc bị khóa");
        if(!encoder.matches(code,otp.getOtpCodeHash())) {
            otp.setAttempts(otp.getAttempts()+1); if(otp.getAttempts()>=5) otp.setUsed(true); otps.saveAndFlush(otp);
            throw new AuthException(400,"INVALID_OTP","Mã không đúng. Còn " + (5-otp.getAttempts()) + " lần thử.");
        }
        otp.setUsed(true); otps.saveAndFlush(otp);
    }
}
