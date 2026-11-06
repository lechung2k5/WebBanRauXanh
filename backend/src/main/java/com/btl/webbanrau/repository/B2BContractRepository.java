package com.btl.webbanrau.repository;

import com.btl.webbanrau.model.B2BContract;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface B2BContractRepository extends JpaRepository<B2BContract, Long> {
    List<B2BContract> findByBuyerIdOrderByCreatedAtDesc(Long buyerId);
    Optional<B2BContract> findByRfqId(Long rfqId);
}
