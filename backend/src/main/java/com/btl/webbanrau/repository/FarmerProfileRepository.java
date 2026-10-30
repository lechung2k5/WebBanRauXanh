package com.btl.webbanrau.repository;

import com.btl.webbanrau.model.FarmerProfile;
import com.btl.webbanrau.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface FarmerProfileRepository extends JpaRepository<FarmerProfile, Long> {
    Optional<FarmerProfile> findByUser(User user);
    Optional<FarmerProfile> findByUserId(Long userId);
    Optional<FarmerProfile> findByPucCode(String pucCode);
}
