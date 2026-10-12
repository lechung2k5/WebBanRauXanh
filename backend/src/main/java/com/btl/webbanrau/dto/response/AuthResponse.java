package com.btl.webbanrau.dto.response;

import lombok.*;

import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AuthResponse {

    private Long id;
    private String username;
    private String fullName;
    private String email;
    private String phone;
    private String address;
    private List<String> roles;
    private boolean enabled;
    private String token;
}
