package com.btl.webbanrau.repository;

import com.btl.webbanrau.model.OutboundDeliveryTrip;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface OutboundDeliveryTripRepository extends JpaRepository<OutboundDeliveryTrip, Long> {
    Optional<OutboundDeliveryTrip> findByTripCode(String tripCode);

    @Query("SELECT t FROM OutboundDeliveryTrip t WHERE t.hub.id = :hubId ORDER BY t.createdAt DESC")
    List<OutboundDeliveryTrip> findByHubIdOrderByCreatedAtDesc(@Param("hubId") Long hubId);

    @Query("SELECT t FROM OutboundDeliveryTrip t WHERE t.hub.id = :hubId AND t.status IN :statuses ORDER BY t.createdAt DESC")
    List<OutboundDeliveryTrip> findByHubIdAndStatusInOrderByCreatedAtDesc(@Param("hubId") Long hubId, @Param("statuses") List<String> statuses);

    @Query("SELECT t FROM OutboundDeliveryTrip t WHERE t.driver.id = :driverId AND t.status IN :statuses ORDER BY t.createdAt DESC")
    List<OutboundDeliveryTrip> findByDriverIdAndStatusInOrderByCreatedAtDesc(@Param("driverId") Long driverId, @Param("statuses") List<String> statuses);

    @Query("SELECT t FROM OutboundDeliveryTrip t WHERE t.driver.phone = :phone AND t.status IN :statuses ORDER BY t.createdAt DESC")
    List<OutboundDeliveryTrip> findByDriverPhoneAndStatusIn(@Param("phone") String phone, @Param("statuses") List<String> statuses);
}
