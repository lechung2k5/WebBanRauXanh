package com.btl.webbanrau.repository;
import com.btl.webbanrau.model.RefreshToken;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.*;
import java.util.*;

public interface RefreshTokenRepository extends JpaRepository<RefreshToken, Long> {
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    Optional<RefreshToken> findByTokenHash(String hash);
    @Modifying @Query("update RefreshToken t set t.revoked=true where t.familyId=:family")
    void revokeFamily(String family);
    @Modifying @Query("update RefreshToken t set t.revoked=true where t.user.id=:userId")
    void revokeUser(Long userId);
}
