package com.btl.webbanrau.service;

import com.btl.webbanrau.dto.response.UserResponse;
import com.btl.webbanrau.model.Role;
import com.btl.webbanrau.model.User;
import com.btl.webbanrau.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;
    private final TokenService tokens;

    @Transactional(readOnly = true)
    @PreAuthorize("hasRole('ADMIN')")
    public List<UserResponse> getAllUsers() {
        return userRepository.findAll().stream()
                .map(this::mapToResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    @PreAuthorize("hasRole('ADMIN')")
    public UserResponse getUserById(Long id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy người dùng!"));
        return mapToResponse(user);
    }

    @Transactional
    @PreAuthorize("hasRole('ADMIN')")
    public boolean toggleUserStatus(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy người dùng!"));

        if (AuthService.has(user,"ADMIN")) {
            throw new IllegalStateException("Không thể khoá tài khoản quản trị viên chính!");
        }

        user.setEnabled(!user.isEnabled());
        tokens.revoke(user);
        userRepository.save(user);
        return user.isEnabled();
    }

    private UserResponse mapToResponse(User u) {
        String fullName = u.getFullName();
        String address = u.getAddress();
        if ("buyer_coop".equals(u.getUsername()) || (fullName != null && fullName.contains("?"))) {
            if ("buyer_coop".equals(u.getUsername())) {
                fullName = "Nguyễn Thị Minh Hạnh";
                address = "199-205 Nguyễn Thái Học, Quận 1, TP.HCM";
            } else if ("buyer_winmart".equals(u.getUsername())) {
                fullName = "Phạm Hoàng Nam";
                address = "Tòa nhà Mplaza Saigon, 39 Lê Duẩn, Bến Nghé, Quận 1, TP.HCM";
            } else if ("buyer_lotte".equals(u.getUsername())) {
                fullName = "Lê Trọng Đạt";
                address = "469 Nguyễn Hữu Thọ, Phường Tân Hưng, Quận 7, TP.HCM";
            }
        }
        return UserResponse.builder()
                .id(u.getId())
                .username(u.getUsername())
                .fullName(fullName)
                .email(u.getEmail())
                .phone(u.getPhone())
                .address(address)
                .enabled(u.isEnabled())
                .roles(u.getRoles().stream().map(Role::getName).toList())
                .createdAt(u.getCreatedAt())
                .updatedAt(u.getUpdatedAt())
                .build();
    }
}
