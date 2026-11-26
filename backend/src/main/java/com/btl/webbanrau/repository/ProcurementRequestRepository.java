package com.btl.webbanrau.repository;

import com.btl.webbanrau.model.ProcurementRequest;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ProcurementRequestRepository extends JpaRepository<ProcurementRequest, Long> {
    List<ProcurementRequest> findAllByOrderByCreatedAtDesc();
    List<ProcurementRequest> findByBuyerIdOrderByCreatedAtDesc(Long buyerId);
}
