package com.btl.webbanrau.repository;

import com.btl.webbanrau.model.WarehouseHub;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface WarehouseHubRepository extends JpaRepository<WarehouseHub, Long> {
    Optional<WarehouseHub> findByHubCode(String hubCode);
    List<WarehouseHub> findByActiveTrueOrderByHubNameAsc();
}
