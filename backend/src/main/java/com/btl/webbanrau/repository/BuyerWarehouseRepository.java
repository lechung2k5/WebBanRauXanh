package com.btl.webbanrau.repository;

import com.btl.webbanrau.model.BuyerProfile;
import com.btl.webbanrau.model.BuyerWarehouse;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface BuyerWarehouseRepository extends JpaRepository<BuyerWarehouse, Long> {
    List<BuyerWarehouse> findByBuyerProfileOrderByDefaultWarehouseDescNameAsc(BuyerProfile profile);
}
