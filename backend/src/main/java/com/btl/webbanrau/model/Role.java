package com.btl.webbanrau.model;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "roles")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Role {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 50)
    private String name; // ROLE_ADMIN, ROLE_USER

    @Column(length = 255)
    private String description;

    public Role(String name, String description) {
        this.name = name;
        this.description = description;
    }
}
