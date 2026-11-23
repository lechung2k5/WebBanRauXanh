package com.btl.webbanrau.repository;

import com.btl.webbanrau.model.IotSensorLog;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface IotSensorLogRepository extends JpaRepository<IotSensorLog, Long> {
    List<IotSensorLog> findTop50ByContractIdOrderByRecordedAtDesc(Long contractId);
}
