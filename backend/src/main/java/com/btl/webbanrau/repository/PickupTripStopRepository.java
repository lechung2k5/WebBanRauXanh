package com.btl.webbanrau.repository;

import com.btl.webbanrau.model.PickupTripStop;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface PickupTripStopRepository extends JpaRepository<PickupTripStop, Long> {
    @Query("SELECT s FROM PickupTripStop s WHERE s.trip.id = :tripId ORDER BY s.stopOrder ASC")
    List<PickupTripStop> findByTripIdOrderByStopOrderAsc(@Param("tripId") Long tripId);

    @Query("SELECT s FROM PickupTripStop s WHERE s.trip.id = :tripId AND s.contract.id = :contractId")
    Optional<PickupTripStop> findByTripIdAndContractId(@Param("tripId") Long tripId, @Param("contractId") Long contractId);

    @Query("SELECT COUNT(s) > 0 FROM PickupTripStop s WHERE s.contract.id = :contractId AND s.status IN :statuses")
    boolean existsByContractIdAndStatusIn(@Param("contractId") Long contractId, @Param("statuses") List<String> statuses);
}
