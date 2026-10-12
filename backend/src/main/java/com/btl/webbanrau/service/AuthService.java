package com.btl.webbanrau.service;

import com.btl.webbanrau.dto.request.LoginRequest;
import com.btl.webbanrau.dto.request.RegisterRequest;
import com.btl.webbanrau.dto.response.AuthResponse;
import com.btl.webbanrau.model.Role;
import com.btl.webbanrau.model.User;
import com.btl.webbanrau.repository.RoleRepository;
import com.btl.webbanrau.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.DisabledException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuthenticationManager authenticationManager;

    @Transactional
    public AuthResponse login(LoginRequest request) {
        User user = userRepository.findByUsernameOrEmail(request.getUsername(), request.getUsername())
                .orElseThrow(() -> new IllegalArgumentException("Tên đăng nhập hoặc mật khẩu không chính xác!"));

        if (!user.isEnabled()) {
            throw new DisabledException("Tài khoản của bạn đã bị khoá! Vui lòng liên hệ quản trị viên.");
        }

        Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(user.getUsername(), request.getPassword())
        );

        SecurityContextHolder.getContext().setAuthentication(authentication);

        String sessionToken = UUID.randomUUID().toString();

        return mapToAuthResponse(user, sessionToken);
    }

    @Transactional
    public AuthResponse register(RegisterRequest request) {
        if (userRepository.existsByUsername(request.getUsername())) {
            throw new IllegalArgumentException("Tên đăng nhập đã tồn tại!");
        }
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new IllegalArgumentException("Email đã được sử dụng!");
        }

        Role userRole = roleRepository.findByName("ROLE_USER")
                .orElseGet(() -> roleRepository.save(new Role("ROLE_USER", "Khách hàng mua hàng")));

        Set<Role> roles = new HashSet<>();
        roles.add(userRole);

        User user = User.builder()
                .username(request.getUsername().trim())
                .password(passwordEncoder.encode(request.getPassword()))
                .fullName(request.getFullName().trim())
                .email(request.getEmail().trim())
                .phone(request.getPhone())
                .address(request.getAddress())
                .enabled(true)
                .roles(roles)
                .build();

        User saved = userRepository.save(user);
        return mapToAuthResponse(saved, UUID.randomUUID().toString());
    }

    @Transactional(readOnly = true)
    public AuthResponse getCurrentUser() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated() || "anonymousUser".equals(auth.getName())) {
            return null;
        }

        User user = userRepository.findByUsername(auth.getName())
                .orElse(null);

        if (user == null) return null;
        return mapToAuthResponse(user, null);
    }

    private AuthResponse mapToAuthResponse(User user, String token) {
        List<String> roleNames = user.getRoles().stream()
                .map(Role::getName)
                .toList();

        return AuthResponse.builder()
                .id(user.getId())
                .username(user.getUsername())
                .fullName(user.getFullName())
                .email(user.getEmail())
                .phone(user.getPhone())
                .address(user.getAddress())
                .roles(roleNames)
                .enabled(user.isEnabled())
                .token(token)
                .build();
    }
}
