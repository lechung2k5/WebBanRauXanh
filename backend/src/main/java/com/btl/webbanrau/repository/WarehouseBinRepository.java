package com.btl.webbanrau.repository;

import com.btl.webbanrau.model.WarehouseBin;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface WarehouseBinRepository extends JpaRepository<WarehouseBin, Long> {
    @Query("SELECT b FROM WarehouseBin b WHERE b.warehouse.id = :warehouseId ORDER BY b.rackCode ASC, b.binCode ASC")
    List<WarehouseBin> findByWarehouseIdOrderByRackCodeAscBinCodeAsc(@Param("warehouseId") Long warehouseId);

    @Query("SELECT b FROM WarehouseBin b WHERE b.zone.id = :zoneId ORDER BY b.rackCode ASC, b.binCode ASC")
    List<WarehouseBin> findByZoneIdOrderByRackCodeAscBinCodeAsc(@Param("zoneId") Long zoneId);

    @Query("SELECT b FROM WarehouseBin b WHERE b.warehouse.id = :warehouseId AND b.binCode = :binCode")
    Optional<WarehouseBin> findByWarehouseIdAndBinCode(@Param("warehouseId") Long warehouseId, @Param("binCode") String binCode);
}
