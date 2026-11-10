package com.btl.webbanrau.repository;

import com.btl.webbanrau.model.BuyerProfile;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface BuyerProfileRepository extends JpaRepository<BuyerProfile, Long> {
    Optional<BuyerProfile> findByUserId(Long userId);
}
