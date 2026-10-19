package com.btl.webbanrau.repository;

import com.btl.webbanrau.model.Product;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

@Repository
public interface ProductRepository extends JpaRepository<Product, Long> {
    Optional<Product> findBySlug(String slug);
    List<Product> findByIsFeaturedTrueAndIsActiveTrue();
    List<Product> findByCategoryIdAndIsActiveTrue(Long categoryId);
    boolean existsByName(String name);
    boolean existsBySlug(String slug);
    long countByCategoryId(Long categoryId);

    @Query("SELECT p FROM Product p WHERE p.isActive = true AND " +
           "(:categoryId IS NULL OR p.category.id = :categoryId) AND " +
           "(CAST(:keyword AS string) IS NULL OR LOWER(p.name) LIKE CONCAT('%', LOWER(CAST(:keyword AS string)), '%') OR LOWER(p.description) LIKE CONCAT('%', LOWER(CAST(:keyword AS string)), '%')) AND " +
           "(:minPrice IS NULL OR p.price >= :minPrice) AND " +
           "(:maxPrice IS NULL OR p.price <= :maxPrice) AND " +
           "(:isOrganic IS NULL OR p.isOrganic = :isOrganic)")
    Page<Product> searchProducts(@Param("keyword") String keyword,
                                 @Param("categoryId") Long categoryId,
                                 @Param("minPrice") BigDecimal minPrice,
                                 @Param("maxPrice") BigDecimal maxPrice,
                                 @Param("isOrganic") Boolean isOrganic,
                                 Pageable pageable);
}
