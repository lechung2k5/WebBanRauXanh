package com.btl.webbanrau.model;

import jakarta.persistence.*;
import lombok.*;

import java.util.HashSet;
import java.util.Set;

@Entity
@Table(name = "users")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class User extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 50)
    private String username;

    @Column(nullable = false, length = 100)
    private String password;

    @Column(nullable = false, length = 100)
    private String fullName;

    @Column(nullable = false, unique = true, length = 100)
    private String email;

    @Column(length = 20)
    private String phone;

    @Column(length = 255)
    private String address;

    @Builder.Default
    private boolean emailVerified = false;
    @Column(unique = true, length = 100)
    private String googleId;
    @Builder.Default
    private String authProvider = "LOCAL";
    private String companyName;
    private String taxCode;
    @Builder.Default
    private boolean householdFarmer = true;
    private String bankAccountNo;
    private String bankName;
    private String warehouseAddress;
    private String pucCode;
    private String certification;
    @Column(length = 500)
    private String certificationUrl;
    @Builder.Default
    private String kycStatus = "PENDING";
    private String kycNote;
    @Builder.Default
    private long tokenVersion = 0;

    @Column(nullable = false)
    @Builder.Default
    private boolean enabled = true; // Hỗ trợ khoá tài khoản

    @ManyToMany(fetch = FetchType.EAGER)
    @JoinTable(
            name = "users_roles",
            joinColumns = @JoinColumn(name = "user_id"),
            inverseJoinColumns = @JoinColumn(name = "role_id")
    )
    @Builder.Default
    private Set<Role> roles = new HashSet<>();
}
