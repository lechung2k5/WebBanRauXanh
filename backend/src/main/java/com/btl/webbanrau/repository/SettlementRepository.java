package com.btl.webbanrau.repository;

import com.btl.webbanrau.model.B2bContract;
import com.btl.webbanrau.model.Settlement;
import com.btl.webbanrau.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

@Repository
public interface SettlementRepository extends JpaRepository<Settlement, Long> {
    Optional<Settlement> findBySettlementCode(String settlementCode);
    Optional<Settlement> findByContract(B2bContract contract);
    Optional<Settlement> findByContractId(Long contractId);
    List<Settlement> findByFarmerOrderByCreatedAtDesc(User farmer);

    @Query("SELECT COALESCE(SUM(s.payoutAmount), 0) FROM Settlement s WHERE s.farmer = :farmer AND s.isPaid = true")
    BigDecimal sumTotalPayoutByFarmer(@Param("farmer") User farmer);
}
