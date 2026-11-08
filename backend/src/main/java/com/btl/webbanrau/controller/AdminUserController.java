package com.btl.webbanrau.controller;

import com.btl.webbanrau.dto.request.AuthRequests;
import com.btl.webbanrau.dto.response.*;
import com.btl.webbanrau.model.*;
import com.btl.webbanrau.repository.*;
import com.btl.webbanrau.service.*;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import java.util.*;

@RestController @RequestMapping("/admin/users") @RequiredArgsConstructor @PreAuthorize("hasRole('ADMIN')")
public class AdminUserController {
    private final UserRepository users;
    private final RoleRepository roles;
    private final TokenService tokens;
    private final OtpService otp;
    private final PasswordEncoder encoder;
    private final MailService mail;
    private final AuthAuditRepository audit;
    @GetMapping public Object list(@RequestParam(defaultValue="0") int page,@RequestParam(defaultValue="20") int size,
                                  @RequestParam(defaultValue="") String role,@RequestParam(defaultValue="") String q,
                                  @RequestParam(required=false) Boolean enabled,@RequestParam(defaultValue="") String kyc) {
        var matched=users.findAll(Sort.by("id").descending()).stream()
            .filter(u->role.isBlank()||AuthService.has(u,role.replace("ROLE_","")))
            .filter(u->q.isBlank()||(u.getUsername()+" "+u.getFullName()+" "+u.getEmail()+" "+u.getCompanyName()).toLowerCase(Locale.ROOT).contains(q.toLowerCase(Locale.ROOT)))
            .filter(u->enabled==null||u.isEnabled()==enabled).filter(u->kyc.isBlank()||kyc.equals(u.getKycStatus())).toList();
        int limit=Math.max(1,Math.min(size,100)), start=Math.min(matched.size(),Math.max(0,page)*limit);
        return ApiResponse.success(Map.of("data",matched.subList(start,Math.min(start+limit,matched.size())).stream().map(TokenService::view).toList(),"totalElements",matched.size(),"totalPages",(matched.size()+limit-1)/limit,"currentPage",Math.max(0,page)));
    }
    @GetMapping("/{id}") public Object detail(@PathVariable Long id) { return ApiResponse.success(tokens.viewUser(find(id))); }
    @PatchMapping("/{id}/toggle-status") @Transactional public Object toggle(@PathVariable Long id) {
        User u=find(id); protectAdmin(u);u.setEnabled(!u.isEnabled());tokens.revoke(u);audit.save(new AuthAudit(AuthService.current().getId(),id,"TOGGLE_STATUS"));return ApiResponse.success(tokens.viewUser(u));
    }
    @PostMapping("/{id}/revoke-sessions") @Transactional public Object revoke(@PathVariable Long id) {
        User u=find(id);tokens.revoke(u);audit.save(new AuthAudit(AuthService.current().getId(),id,"REVOKE_SESSIONS"));return ApiResponse.success("Đã thu hồi phiên",null);
    }
    @PatchMapping("/{id}/kyc-status") @Transactional public Object kyc(@PathVariable Long id,@Valid @RequestBody AuthRequests.Kyc r) {
        User u=find(id);
        if(!AuthService.has(u,"FARMER")&&!AuthService.has(u,"BUYER")) throw new AuthException(400,"INVALID_PARTNER","Chỉ duyệt KYC đối tác");
        if(!Set.of("VERIFIED","REJECTED").contains(r.status())||("REJECTED".equals(r.status())&&(r.note()==null||r.note().isBlank()))) throw new AuthException(400,"INVALID_KYC","Chọn trạng thái hợp lệ và lý do từ chối");
        if("VERIFIED".equals(r.status())&&(!u.isEmailVerified()||!TokenService.profileComplete(u))) throw new AuthException(400,"INCOMPLETE_PROFILE","Chưa xác thực email hoặc chưa đủ hồ sơ");
        mail.send(u.getEmail(),"Kết quả duyệt hồ sơ",r.status()+"\n"+Objects.toString(r.note(),""));
        u.setKycStatus(r.status());u.setKycNote(r.note());tokens.revoke(u);audit.save(new AuthAudit(AuthService.current().getId(),id,"KYC_"+r.status()));return ApiResponse.success(tokens.viewUser(u));
    }
    @PostMapping("/provision") @Transactional public Object provision(@Valid @RequestBody AuthRequests.Provision r) {
        if(!Set.of("ACCOUNTANT","WAREHOUSE_QC","DRIVER").contains(r.role())) throw new AuthException(400,"INVALID_ROLE","Chỉ cấp tài khoản QC, tài xế, kế toán");
        String name=r.username().trim().toLowerCase(Locale.ROOT);
        if(!name.matches("[a-z0-9_.-]{3,50}")) throw new AuthException(400,"INVALID_USERNAME","Username không hợp lệ");
        User u=User.builder().username(name).email(AuthService.email(r.email())).fullName(r.fullName())
            .password(encoder.encode(TokenService.randomToken())).kycStatus("VERIFIED")
            .roles(new HashSet<>(Set.of(roles.findByName("ROLE_"+r.role()).orElseThrow()))).build();
        users.saveAndFlush(u);otp.send(u.getEmail(),"STAFF_ACTIVATION");audit.save(new AuthAudit(AuthService.current().getId(),u.getId(),"PROVISION_"+r.role()));return ApiResponse.success(tokens.viewUser(u));
    }
    @PostMapping("/{id}/resend-invitation") @Transactional public Object invite(@PathVariable Long id) {
        User u=find(id);if(u.isEmailVerified()||AuthService.has(u,"ADMIN")||AuthService.has(u,"FARMER")||AuthService.has(u,"BUYER")) throw new AuthException(400,"INVALID_ACCOUNT","Tài khoản không cần kích hoạt nhân sự");
        otp.send(u.getEmail(),"STAFF_ACTIVATION");return ApiResponse.success("Đã gửi mã kích hoạt",null);
    }
    @PatchMapping("/{id}/role") @Transactional public Object role(@PathVariable Long id,@Valid @RequestBody AuthRequests.RoleChange r) {
        User u=find(id);
        if(AuthService.has(u,"ADMIN")||AuthService.has(u,"FARMER")||AuthService.has(u,"BUYER")||!Set.of("ACCOUNTANT","WAREHOUSE_QC","DRIVER").contains(r.role())) throw new AuthException(400,"INVALID_ROLE","Chỉ thay đổi vai trò nhân sự nội bộ");
        u.setRoles(new HashSet<>(Set.of(roles.findByName("ROLE_"+r.role()).orElseThrow())));tokens.revoke(u);audit.save(new AuthAudit(AuthService.current().getId(),id,"STAFF_ROLE_"+r.role()));return ApiResponse.success(tokens.viewUser(u));
    }
    private User find(Long id) { return users.findById(id).orElseThrow(()->new AuthException(404,"NOT_FOUND","Không tìm thấy tài khoản")); }
    private void protectAdmin(User u) { if(AuthService.has(u,"ADMIN")) throw new AuthException(400,"PROTECTED_ADMIN","Không khóa Admin qua chức năng này"); }
}
