package com.btl.webbanrau.repository;

import com.btl.webbanrau.model.WarehouseZone;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface WarehouseZoneRepository extends JpaRepository<WarehouseZone, Long> {
    @Query("SELECT z FROM WarehouseZone z WHERE z.warehouse.id = :warehouseId ORDER BY z.zoneCode ASC")
    List<WarehouseZone> findByWarehouseIdOrderByZoneCodeAsc(@Param("warehouseId") Long warehouseId);

    @Query("SELECT z FROM WarehouseZone z WHERE z.warehouse.id = :warehouseId AND z.zoneCode = :zoneCode")
    Optional<WarehouseZone> findByWarehouseIdAndZoneCode(@Param("warehouseId") Long warehouseId, @Param("zoneCode") String zoneCode);
}
