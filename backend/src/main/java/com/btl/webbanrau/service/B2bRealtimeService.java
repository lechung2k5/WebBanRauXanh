package com.btl.webbanrau.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class B2bRealtimeService {

    private final SimpMessagingTemplate messagingTemplate;

    public void notifyLotUpdated(String action, Object lotData) {
        try {
            Map<String, Object> payload = new HashMap<>();
            payload.put("action", action);
            payload.put("lot", lotData);
            payload.put("timestamp", System.currentTimeMillis());
            messagingTemplate.convertAndSend("/topic/lots", payload);
            log.info("B2B Realtime: Sent lot update [{}] to /topic/lots", action);
        } catch (Exception e) {
            log.warn("Failed to send WebSocket lot notification", e);
        }
    }

    public void notifyRfqUpdated(String action, String rfqCode, Object rfqData) {
        try {
            Map<String, Object> payload = new HashMap<>();
            payload.put("action", action);
            payload.put("rfqCode", rfqCode);
            payload.put("rfq", rfqData);
            payload.put("timestamp", System.currentTimeMillis());

            messagingTemplate.convertAndSend("/topic/rfqs", payload);
            if (rfqCode != null && !rfqCode.isBlank()) {
                messagingTemplate.convertAndSend("/topic/rfqs/" + rfqCode.trim().toUpperCase(), payload);
            }
            log.info("B2B Realtime: Sent RFQ [{}] for code [{}]", action, rfqCode);
        } catch (Exception e) {
            log.warn("Failed to send WebSocket RFQ notification", e);
        }
    }

    public void notifyContractUpdated(String action, String contractCode, Object contractData) {
        try {
            Map<String, Object> payload = new HashMap<>();
            payload.put("action", action);
            payload.put("contractCode", contractCode);
            payload.put("contract", contractData);
            payload.put("timestamp", System.currentTimeMillis());

            messagingTemplate.convertAndSend("/topic/contracts", payload);
            if (contractCode != null && !contractCode.isBlank()) {
                messagingTemplate.convertAndSend("/topic/contracts/" + contractCode.trim().toUpperCase(), payload);
            }
            log.info("B2B Realtime: Sent Contract [{}] for code [{}]", action, contractCode);
        } catch (Exception e) {
            log.warn("Failed to send WebSocket Contract notification", e);
        }
    }
}
