package com.btl.webbanrau.controller;

import com.btl.webbanrau.dto.response.ApiResponse;
import com.btl.webbanrau.dto.response.UserResponse;
import com.btl.webbanrau.service.UserService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/users")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
@Tag(name = "User Controller", description = "Quản lý người dùng và khoá/mở khoá tài khoản (Chỉ ADMIN)")
public class UserController {

    private final UserService userService;

    @GetMapping
    @Operation(summary = "Lấy danh sách tất cả tài khoản người dùng")
    public ResponseEntity<ApiResponse<List<UserResponse>>> getAllUsers() {
        return ResponseEntity.ok(ApiResponse.success(userService.getAllUsers()));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Lấy thông tin tài khoản người dùng theo ID")
    public ResponseEntity<ApiResponse<UserResponse>> getUserById(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success(userService.getUserById(id)));
    }

    @PostMapping("/{id}/toggle-status")
    @Operation(summary = "Khoá / Mở khoá tài khoản người dùng")
    public ResponseEntity<ApiResponse<Boolean>> toggleUserStatus(@PathVariable Long id) {
        try {
            boolean isEnabled = userService.toggleUserStatus(id);
            String message = isEnabled ? "Đã mở khoá tài khoản thành công!" : "Đã khoá tài khoản người dùng!";
            return ResponseEntity.ok(ApiResponse.success(message, isEnabled));
        } catch (Exception ex) {
            return ResponseEntity.badRequest().body(ApiResponse.error(400, ex.getMessage()));
        }
    }
}
