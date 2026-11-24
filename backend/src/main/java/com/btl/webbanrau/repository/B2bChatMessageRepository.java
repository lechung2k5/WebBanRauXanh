package com.btl.webbanrau.repository;

import com.btl.webbanrau.model.B2bChatMessage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface B2bChatMessageRepository extends JpaRepository<B2bChatMessage, Long> {
    List<B2bChatMessage> findByRfqIdOrderByCreatedAtAsc(Long rfqId);
    List<B2bChatMessage> findByRfqCodeOrderByCreatedAtAsc(String rfqCode);
}
