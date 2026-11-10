package com.btl.webbanrau.repository;

import com.btl.webbanrau.model.BuyerRfq;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface BuyerRfqRepository extends JpaRepository<BuyerRfq, Long> {
    List<BuyerRfq> findByBuyerIdOrderByCreatedAtDesc(Long buyerId);
}
