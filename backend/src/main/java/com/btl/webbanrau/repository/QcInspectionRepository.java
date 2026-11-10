package com.btl.webbanrau.repository;

import com.btl.webbanrau.model.B2bContract;
import com.btl.webbanrau.model.QcInspection;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface QcInspectionRepository extends JpaRepository<QcInspection, Long> {
    Optional<QcInspection> findByContract(B2bContract contract);
    Optional<QcInspection> findByContractId(Long contractId);
}
