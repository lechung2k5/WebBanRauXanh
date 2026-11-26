package com.btl.webbanrau.repository;

import com.btl.webbanrau.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {
    @org.springframework.data.jpa.repository.Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
    @org.springframework.data.jpa.repository.Query("select u from User u where u.email=:email")
    Optional<User> lockByEmail(String email);
    Optional<User> findByGoogleId(String googleId);
    Optional<User> findByUsername(String username);
    Optional<User> findByEmail(String email);
    Optional<User> findByUsernameOrEmail(String username, String email);
    boolean existsByUsername(String username);
    boolean existsByEmail(String email);

    @org.springframework.data.jpa.repository.Query(
            "SELECT DISTINCT u FROM User u JOIN u.roles r " +
            "WHERE r.name IN ('ROLE_FARMER', 'ROLE_COOPERATIVE') AND u.enabled = true " +
            "ORDER BY u.id DESC"
    )
    java.util.List<User> findAllActiveFarmers();
}
