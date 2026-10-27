package com.btl.webbanrau.repository;

import com.btl.webbanrau.model.HarvestLot;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface HarvestLotRepository extends JpaRepository<HarvestLot, Long> {

    Optional<HarvestLot> findByLotCode(String lotCode);

    boolean existsByLotCode(String lotCode);

    List<HarvestLot> findByStatus(String status);

    @Query("SELECT l FROM HarvestLot l WHERE " +
           "(CAST(:keyword AS string) IS NULL OR " +
           " LOWER(l.lotCode) LIKE CONCAT('%', LOWER(CAST(:keyword AS string)), '%') OR " +
           " LOWER(l.productName) LIKE CONCAT('%', LOWER(CAST(:keyword AS string)), '%') OR " +
           " LOWER(l.farmerName) LIKE CONCAT('%', LOWER(CAST(:keyword AS string)), '%') OR " +
           " LOWER(l.pucCode) LIKE CONCAT('%', LOWER(CAST(:keyword AS string)), '%') OR " +
           " (l.certification IS NOT NULL AND LOWER(l.certification) LIKE CONCAT('%', LOWER(CAST(:keyword AS string)), '%'))) AND " +
           "(CAST(:status AS string) IS NULL OR CAST(:status AS string) = '' OR CAST(:status AS string) = 'ALL' OR l.status = CAST(:status AS string)) AND " +
           "(CAST(:category AS string) IS NULL OR CAST(:category AS string) = '' OR CAST(:category AS string) = 'ALL' OR l.category = CAST(:category AS string) OR (l.categoryId IS NOT NULL AND CAST(l.categoryId AS string) = CAST(:category AS string)))")
    Page<HarvestLot> searchLots(
            @Param("keyword") String keyword,
            @Param("status") String status,
            @Param("category") String category,
            Pageable pageable
    );

    long countByStatus(String status);

    long countByCategoryId(Long categoryId);

    long countByCategoryIdAndStatus(Long categoryId, String status);
}
