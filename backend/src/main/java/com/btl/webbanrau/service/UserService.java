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

        if ("admin".equals(user.getUsername())) {
            throw new IllegalStateException("Không thể khoá tài khoản quản trị viên chính!");
        }

        user.setEnabled(!user.isEnabled());
        userRepository.save(user);
        return user.isEnabled();
    }

    private UserResponse mapToResponse(User u) {
        return UserResponse.builder()
                .id(u.getId())
                .username(u.getUsername())
                .fullName(u.getFullName())
                .email(u.getEmail())
                .phone(u.getPhone())
                .address(u.getAddress())
                .enabled(u.isEnabled())
                .roles(u.getRoles().stream().map(Role::getName).toList())
                .createdAt(u.getCreatedAt())
                .updatedAt(u.getUpdatedAt())
                .build();
    }
}
