package com.btl.webbanrau.repository;

import com.btl.webbanrau.model.HubInspection;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface HubInspectionRepository extends JpaRepository<HubInspection, Long> {
    List<HubInspection> findByContractIdOrderByCreatedAtDesc(Long contractId);
}
