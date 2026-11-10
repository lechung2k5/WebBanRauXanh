package com.btl.webbanrau.service;

import com.btl.webbanrau.dto.request.SepayWebhookRequest;

import java.util.Map;

public interface SepayService {
    Map<String, Object> processWebhook(String authHeader, SepayWebhookRequest payload);
    Map<String, Object> checkOrderStatus(String orderCode);
    Map<String, Object> checkContractStatus(String contractCode);
}

