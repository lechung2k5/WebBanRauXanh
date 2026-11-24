package com.btl.webbanrau.repository;

import com.btl.webbanrau.model.PickupTrip;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface PickupTripRepository extends JpaRepository<PickupTrip, Long> {
    Optional<PickupTrip> findByTripCode(String tripCode);

    @Query("SELECT t FROM PickupTrip t WHERE t.warehouse.id = :warehouseId ORDER BY t.createdAt DESC")
    List<PickupTrip> findByWarehouseIdOrderByCreatedAtDesc(@Param("warehouseId") Long warehouseId);

    @Query("SELECT t FROM PickupTrip t WHERE t.warehouse.id = :warehouseId AND t.status IN :statuses ORDER BY t.createdAt DESC")
    List<PickupTrip> findByWarehouseIdAndStatusInOrderByCreatedAtDesc(@Param("warehouseId") Long warehouseId, @Param("statuses") List<String> statuses);

    @Query("SELECT t FROM PickupTrip t WHERE t.driver.id = :driverId AND t.status IN :statuses ORDER BY t.createdAt DESC")
    List<PickupTrip> findByDriverIdAndStatusInOrderByCreatedAtDesc(@Param("driverId") Long driverId, @Param("statuses") List<String> statuses);

    @Query("SELECT t FROM PickupTrip t WHERE t.driver.phone = :phone AND t.status IN :statuses ORDER BY t.createdAt DESC")
    List<PickupTrip> findByDriverPhoneAndStatusIn(@Param("phone") String phone, @Param("statuses") List<String> statuses);
}
