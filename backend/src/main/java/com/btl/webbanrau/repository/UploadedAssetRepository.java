package com.btl.webbanrau.repository;

import com.btl.webbanrau.model.UploadedAsset;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface UploadedAssetRepository extends JpaRepository<UploadedAsset, Long> {
    Optional<UploadedAsset> findByAssetId(String assetId);
    Optional<UploadedAsset> findByPublicId(String publicId);
    Optional<UploadedAsset> findBySecureUrl(String secureUrl);
    List<UploadedAsset> findByUserId(Long userId);
    List<UploadedAsset> findByUserIdAndPurpose(Long userId, String purpose);
}
