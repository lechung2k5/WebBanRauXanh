package com.btl.webbanrau.repository;

import com.btl.webbanrau.model.FleetDriver;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface FleetDriverRepository extends JpaRepository<FleetDriver, Long> {
    Optional<FleetDriver> findByDriverCode(String driverCode);
    Optional<FleetDriver> findByLicenseNumber(String licenseNumber);

    @Query("SELECT d FROM FleetDriver d WHERE d.warehouse.id = :warehouseId ORDER BY d.fullName ASC")
    List<FleetDriver> findByWarehouseIdOrderByFullNameAsc(@Param("warehouseId") Long warehouseId);

    @Query("SELECT d FROM FleetDriver d WHERE d.warehouse.id = :warehouseId AND d.status = :status ORDER BY d.experienceYears DESC")
    List<FleetDriver> findByWarehouseIdAndStatusOrderByExperienceYearsDesc(@Param("warehouseId") Long warehouseId, @Param("status") String status);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT d FROM FleetDriver d WHERE d.id = :id")
    Optional<FleetDriver> findByIdForUpdate(@Param("id") Long id);
}
