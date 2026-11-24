package com.btl.webbanrau.repository;

import com.btl.webbanrau.model.OutboundDeliveryStop;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface OutboundDeliveryStopRepository extends JpaRepository<OutboundDeliveryStop, Long> {

    @Query("SELECT s FROM OutboundDeliveryStop s WHERE s.trip.id = :tripId ORDER BY s.stopSequence ASC")
    List<OutboundDeliveryStop> findByTripIdOrderByStopSequenceAsc(@Param("tripId") Long tripId);

    @Query("SELECT s FROM OutboundDeliveryStop s WHERE s.contract.id = :contractId AND s.status != 'CANCELLED'")
    Optional<OutboundDeliveryStop> findByContractId(@Param("contractId") Long contractId);

    @Query("SELECT COUNT(s) > 0 FROM OutboundDeliveryStop s WHERE s.contract.id = :contractId AND s.status != 'CANCELLED'")
    boolean existsActiveByContractId(@Param("contractId") Long contractId);

    @Query("SELECT s FROM OutboundDeliveryStop s LEFT JOIN FETCH s.trip t LEFT JOIN FETCH s.contract c ORDER BY s.createdAt DESC")
    List<OutboundDeliveryStop> findAllWithTripAndContract();

    @Query("SELECT s FROM OutboundDeliveryStop s LEFT JOIN FETCH s.trip t LEFT JOIN FETCH s.contract c WHERE c.buyer.id = :buyerUserId AND s.status IN :statuses ORDER BY s.createdAt DESC")
    List<OutboundDeliveryStop> findByBuyerUserIdAndStatusIn(@Param("buyerUserId") Long buyerUserId, @Param("statuses") List<String> statuses);

    @Query("SELECT s FROM OutboundDeliveryStop s LEFT JOIN FETCH s.trip t LEFT JOIN FETCH s.contract c WHERE c.buyer.id = :buyerUserId ORDER BY s.createdAt DESC")
    List<OutboundDeliveryStop> findByBuyerUserIdOrderByCreatedAtDesc(@Param("buyerUserId") Long buyerUserId);
}
