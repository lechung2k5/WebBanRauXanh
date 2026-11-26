package com.btl.webbanrau.repository;

import com.btl.webbanrau.model.WarehouseIotLog;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface WarehouseIotLogRepository extends JpaRepository<WarehouseIotLog, Long> {
    Optional<WarehouseIotLog> findTopByWarehouseIdAndZoneCodeOrderByRecordedAtDescIdDesc(Long warehouseId, String zoneCode);

    List<WarehouseIotLog> findByWarehouseIdOrderByRecordedAtDescIdDesc(Long warehouseId, Pageable pageable);

    List<WarehouseIotLog> findByWarehouseIdAndZoneCodeOrderByRecordedAtDescIdDesc(Long warehouseId, String zoneCode, Pageable pageable);
}
