package com.btl.webbanrau.repository;

import com.btl.webbanrau.model.HarvestLot;
import com.btl.webbanrau.model.RfqNegotiation;
import com.btl.webbanrau.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface RfqNegotiationRepository extends JpaRepository<RfqNegotiation, Long> {
    Optional<RfqNegotiation> findByRfqCode(String rfqCode);
    List<RfqNegotiation> findByHarvestLot(HarvestLot harvestLot);

    @Query("SELECT r FROM RfqNegotiation r WHERE r.harvestLot.farmer = :farmer ORDER BY r.createdAt DESC")
    List<RfqNegotiation> findByFarmerOrderByCreatedAtDesc(@Param("farmer") User farmer);

    @Query("SELECT COUNT(r) FROM RfqNegotiation r WHERE r.harvestLot.farmer = :farmer AND r.status = :status")
    long countByFarmerAndStatus(@Param("farmer") User farmer, @Param("status") String status);
}
