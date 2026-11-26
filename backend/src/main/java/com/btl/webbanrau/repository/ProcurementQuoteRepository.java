package com.btl.webbanrau.repository;

import com.btl.webbanrau.model.ProcurementQuote;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ProcurementQuoteRepository extends JpaRepository<ProcurementQuote, Long> {
    long countByProcurementRequestId(Long procurementRequestId);
    boolean existsByProcurementRequestIdAndFarmerId(Long procurementRequestId, Long farmerId);
    boolean existsByProcurementRequestIdAndFarmerIdAndHarvestLotId(Long procurementRequestId, Long farmerId, Long harvestLotId);
    List<ProcurementQuote> findByProcurementRequestIdOrderByCreatedAtDesc(Long procurementRequestId);
    List<ProcurementQuote> findByFarmerIdOrderByCreatedAtDesc(Long farmerId);
}
