package com.btl.webbanrau.repository;

import com.btl.webbanrau.model.HarvestLot;
import com.btl.webbanrau.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface HarvestLotRepository extends JpaRepository<HarvestLot, Long> {
    List<HarvestLot> findByFarmerOrderByCreatedAtDesc(User farmer);
    List<HarvestLot> findByFarmerIdOrderByCreatedAtDesc(Long farmerId);
    List<HarvestLot> findByStatusOrderByCreatedAtDesc(String status);
    Optional<HarvestLot> findByLotCode(String lotCode);
    long countByFarmerAndStatus(User farmer, String status);
}
