package com.btl.webbanrau.repository;

import com.btl.webbanrau.model.B2bContract;
import com.btl.webbanrau.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

@Repository
public interface B2bContractRepository extends JpaRepository<B2bContract, Long> {
    Optional<B2bContract> findByContractCode(String contractCode);
    Optional<B2bContract> findFirstByContractCodeIgnoreCase(String contractCode);
    List<B2bContract> findByBuyerPhoneOrderByCreatedAtDesc(String buyerPhone);
    List<B2bContract> findByFarmerOrderByCreatedAtDesc(User farmer);
    List<B2bContract> findByFarmerAndFulfillmentStatus(User farmer, String status);

    @Query("SELECT c FROM B2bContract c WHERE LOWER(c.contractCode) = LOWER(:query) OR c.buyerPhone = :query OR c.buyerPhone LIKE %:query% ORDER BY c.createdAt DESC")
    List<B2bContract> searchContractsForBuyer(@Param("query") String query);

    @Query("SELECT COUNT(c) FROM B2bContract c WHERE c.farmer = :farmer AND c.fulfillmentStatus != 'COMPLETED'")
    long countActiveContractsByFarmer(@Param("farmer") User farmer);

    @Query("SELECT COALESCE(SUM(c.depositAmount), 0) FROM B2bContract c WHERE c.farmer = :farmer AND c.depositStatus = 'DEPOSIT_PAID' AND c.fulfillmentStatus != 'COMPLETED'")
    BigDecimal sumEscrowDepositHolding(@Param("farmer") User farmer);
}
