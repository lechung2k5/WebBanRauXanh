package com.btl.webbanrau.repository;

import com.btl.webbanrau.model.FleetVehicle;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface FleetVehicleRepository extends JpaRepository<FleetVehicle, Long> {
    Optional<FleetVehicle> findByPlateNumber(String plateNumber);

    @Query("SELECT v FROM FleetVehicle v WHERE v.warehouse.id = :warehouseId ORDER BY v.plateNumber ASC")
    List<FleetVehicle> findByWarehouseIdOrderByPlateNumberAsc(@Param("warehouseId") Long warehouseId);

    @Query("SELECT v FROM FleetVehicle v WHERE v.warehouse.id = :warehouseId AND v.status = :status ORDER BY v.capacityKg DESC")
    List<FleetVehicle> findByWarehouseIdAndStatusOrderByCapacityKgDesc(@Param("warehouseId") Long warehouseId, @Param("status") String status);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT v FROM FleetVehicle v WHERE v.id = :id")
    Optional<FleetVehicle> findByIdForUpdate(@Param("id") Long id);
}
