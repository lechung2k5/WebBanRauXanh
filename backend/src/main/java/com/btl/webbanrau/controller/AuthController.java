package com.btl.webbanrau.controller;
import com.btl.webbanrau.dto.request.*;
import com.btl.webbanrau.dto.response.ApiResponse;
import com.btl.webbanrau.service.*;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

@RestController @RequestMapping("/auth") @RequiredArgsConstructor
public class AuthController {
    private final AuthService auth;
    private final TokenService tokens;
    @PostMapping("/register") public Object register(@Valid @RequestBody RegisterRequest r) { return ApiResponse.success(auth.register(r)); }
    @PostMapping("/login") public Object login(@Valid @RequestBody LoginRequest r) { return ApiResponse.success(auth.login(r)); }
    @PostMapping("/verify-register-otp") public Object verify(@Valid @RequestBody AuthRequests.Verify r) { return ApiResponse.success(auth.verify(r,"REGISTER_VERIFICATION")); }
    @PostMapping("/resend-otp") public Object resend(@Valid @RequestBody AuthRequests.Resend r) {
        if(!java.util.Set.of("REGISTER_VERIFICATION","LOGIN_OTP","FORGOT_PASSWORD").contains(r.type())) throw new AuthException(400,"INVALID_TYPE","Loại mã không hợp lệ. Với Google hãy đăng nhập lại. Nhân sự liên hệ Admin để gửi lại lời mời.");
        return ApiResponse.success(auth.request(r.email(),r.type()));
    }
    @PostMapping("/google-login") public Object google(@Valid @RequestBody AuthRequests.Google r) { return ApiResponse.success(auth.google(r)); }
    @PostMapping("/google-link") public Object link(@Valid @RequestBody AuthRequests.Google r) { auth.linkGoogle(r.idToken()); return ApiResponse.success("Đã liên kết Google",null); }
    @PostMapping("/gmail-otp/request") public Object request(@Valid @RequestBody AuthRequests.Email r) { return ApiResponse.success(auth.request(r.email(),"LOGIN_OTP")); }
    @PostMapping("/gmail-otp/verify") public Object verifyLogin(@Valid @RequestBody AuthRequests.Verify r) { return ApiResponse.success(auth.verify(r,"GOOGLE_LOGIN".equals(r.type())?"GOOGLE_LOGIN":"LOGIN_OTP")); }
    @PostMapping("/forgot-password") public Object forgot(@Valid @RequestBody AuthRequests.Email r) { return ApiResponse.success(auth.request(r.email(),"FORGOT_PASSWORD")); }
    @PostMapping("/reset-password") public Object reset(@Valid @RequestBody AuthRequests.Reset r) { auth.reset(r,"FORGOT_PASSWORD"); return ApiResponse.success("Đã đổi mật khẩu. Hãy đăng nhập lại.",null); }
    @PostMapping("/activate-staff") public Object activate(@Valid @RequestBody AuthRequests.Reset r) { auth.reset(r,"STAFF_ACTIVATION"); return ApiResponse.success("Đã kích hoạt tài khoản. Hãy đăng nhập.",null); }
    @PostMapping("/refresh-token") public Object refresh(@Valid @RequestBody AuthRequests.Refresh r) { return ApiResponse.success(tokens.refresh(r.refreshToken())); }
    @PostMapping("/logout") public Object logout(@Valid @RequestBody AuthRequests.Refresh r) { tokens.logout(r.refreshToken()); return ApiResponse.success("Đã đăng xuất",null); }
    @PostMapping("/logout-all") public Object logoutAll() { tokens.revoke(AuthService.current()); return ApiResponse.success("Đã thu hồi mọi phiên",null); }
    @GetMapping("/me") public Object me() { return ApiResponse.success(auth.getCurrentUser()); }
    @PutMapping("/profile") public Object profile(@Valid @RequestBody AuthRequests.Profile r) { return ApiResponse.success(auth.profile(r)); }
}
