package com.btl.webbanrau.service.impl;

import com.btl.webbanrau.dto.request.SepayWebhookRequest;
import com.btl.webbanrau.model.B2bContract;
import com.btl.webbanrau.model.Order;
import com.btl.webbanrau.model.OrderStatus;
import com.btl.webbanrau.repository.B2bContractRepository;
import com.btl.webbanrau.repository.OrderRepository;
import com.btl.webbanrau.service.SepayService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
@RequiredArgsConstructor
@Slf4j
public class SepayServiceImpl implements SepayService {

    private final OrderRepository orderRepository;
    private final B2bContractRepository b2bContractRepository;

    @Value("${sepay.api-key:}")
    private String sepayApiKey;

    @Value("${sepay.webhook-secret:}")
    private String webhookSecret;

    @Override
    @Transactional
    public Map<String, Object> processWebhook(String authHeader, SepayWebhookRequest payload) {
        Map<String, Object> response = new HashMap<>();

        // 1. Xác thực bảo mật API Key từ SePay
        if (sepayApiKey != null && !sepayApiKey.isBlank()) {
            String trimmedKey = sepayApiKey.trim();
            boolean valid = authHeader != null && (
                    authHeader.trim().equalsIgnoreCase("Apikey " + trimmedKey) ||
                    authHeader.trim().equalsIgnoreCase(trimmedKey) ||
                    authHeader.contains(trimmedKey)
            );

            if (!valid) {
                log.warn("[SePay Webhook] Xác thực khóa API không thành công. Header: {}", authHeader);
                response.put("success", false);
                response.put("message", "Khóa xác thực SePay không hợp lệ.");
                return response;
            }
        }

        // 2. Chỉ tiếp nhận các giao dịch chuyển tiền vào ("in")
        if (payload == null || !"in".equalsIgnoreCase(payload.getTransferType())) {
            log.info("[SePay Webhook] Bỏ qua giao dịch không phải tiền vào (TransferType: {})",
                    payload != null ? payload.getTransferType() : "null");
            response.put("success", true);
            response.put("message", "Giao dịch đã được ghi nhận nhưng không cần xử lý.");
            return response;
        }

        String rawContent = payload.getContent() != null ? payload.getContent() : "";
        String normalizedContent = rawContent.toUpperCase().replaceAll("[^A-Z0-9-]", " ");
        log.info("[SePay Webhook] Đang xử lý giao dịch tiền vào: {} VND. Nội dung: '{}'",
                payload.getTransferAmount(), rawContent);

        boolean matched = false;

        // 3. Đối soát Hợp đồng sỉ B2B (Mã hợp đồng HD-...)
        Pattern contractPattern = Pattern.compile("(HD[-_A-Z0-9]+)");
        Matcher contractMatcher = contractPattern.matcher(normalizedContent);
        if (contractMatcher.find()) {
            String extractedCode = contractMatcher.group(1).replace("_", "-");
            Optional<B2bContract> contractOpt = b2bContractRepository.findFirstByContractCodeIgnoreCase(extractedCode);
            if (contractOpt.isPresent()) {
                B2bContract contract = contractOpt.get();
                contract.setDepositStatus("DEPOSIT_PAID");
                contract.setStatus("DEPOSIT_PAID");
                contract.setDepositPaidAt(LocalDateTime.now());
                b2bContractRepository.save(contract);
                matched = true;
                log.info("[SePay Webhook] Khớp Hợp đồng B2B thành công: {}", contract.getContractCode());
                response.put("matchedType", "B2B_CONTRACT");
                response.put("contractCode", contract.getContractCode());
            }
        }

        // 4. Đối soát Đơn hàng B2C (Mã đơn hàng DH-...)
        Pattern orderPattern = Pattern.compile("(DH[-_A-Z0-9]+)");
        Matcher orderMatcher = orderPattern.matcher(normalizedContent);
        if (!matched && orderMatcher.find()) {
            String extractedCode = orderMatcher.group(1).replace("_", "-");
            Optional<Order> orderOpt = orderRepository.findByOrderCode(extractedCode);
            if (orderOpt.isPresent()) {
                Order order = orderOpt.get();
                order.setIsPaid(true);
                if (order.getStatus() == OrderStatus.PENDING) {
                    order.setStatus(OrderStatus.CONFIRMED);
                }
                orderRepository.save(order);
                matched = true;
                log.info("[SePay Webhook] Khớp Đơn hàng B2C thành công: {}", order.getOrderCode());
                response.put("matchedType", "B2C_ORDER");
                response.put("orderCode", order.getOrderCode());
            }
        }

        // 5. Quét fallback từ khóa HONA hoặc số đơn hàng
        if (!matched) {
            String cleanCompact = normalizedContent.replaceAll("\\s+", "");
            // Thử tìm trong các đơn hàng chờ thanh toán gần nhất
            for (Order order : orderRepository.findAll()) {
                if (Boolean.FALSE.equals(order.getIsPaid())) {
                    String codeCompact = order.getOrderCode().replaceAll("[^A-Z0-9]", "");
                    if (!codeCompact.isBlank() && cleanCompact.contains(codeCompact)) {
                        order.setIsPaid(true);
                        if (order.getStatus() == OrderStatus.PENDING) {
                            order.setStatus(OrderStatus.CONFIRMED);
                        }
                        orderRepository.save(order);
                        matched = true;
                        log.info("[SePay Webhook] Khớp fallback Đơn hàng B2C: {}", order.getOrderCode());
                        response.put("matchedType", "B2C_ORDER_FALLBACK");
                        response.put("orderCode", order.getOrderCode());
                        break;
                    }
                }
            }
        }

        response.put("success", true);
        response.put("matched", matched);
        response.put("message", matched ? "Đã đối soát thanh toán thành công." : "Đã nhận webhook nhưng chưa khớp mã đơn.");
        return response;
    }

    @Override
    @Transactional(readOnly = true)
    public Map<String, Object> checkOrderStatus(String orderCode) {
        Map<String, Object> result = new HashMap<>();
        if (orderCode == null || orderCode.isBlank()) {
            result.put("found", false);
            result.put("isPaid", false);
            return result;
        }

        Optional<Order> orderOpt = orderRepository.findByOrderCode(orderCode.trim());
        if (orderOpt.isPresent()) {
            Order order = orderOpt.get();
            result.put("found", true);
            result.put("orderCode", order.getOrderCode());
            result.put("isPaid", Boolean.TRUE.equals(order.getIsPaid()));
            result.put("status", order.getStatus() != null ? order.getStatus().name() : "PENDING");
            result.put("totalAmount", order.getTotalAmount());
        } else {
            result.put("found", false);
            result.put("isPaid", false);
        }
        return result;
    }

    @Override
    @Transactional(readOnly = true)
    public Map<String, Object> checkContractStatus(String contractCode) {
        Map<String, Object> result = new HashMap<>();
        if (contractCode == null || contractCode.isBlank()) {
            result.put("found", false);
            result.put("isDepositPaid", false);
            return result;
        }

        Optional<B2bContract> contractOpt = b2bContractRepository.findFirstByContractCodeIgnoreCase(contractCode.trim());
        if (contractOpt.isPresent()) {
            B2bContract contract = contractOpt.get();
            boolean isDepositPaid = "DEPOSIT_PAID".equalsIgnoreCase(contract.getDepositStatus());
            result.put("found", true);
            result.put("contractCode", contract.getContractCode());
            result.put("isDepositPaid", isDepositPaid);
            result.put("depositStatus", contract.getDepositStatus());
            result.put("status", contract.getStatus());
            result.put("depositAmount", contract.getDepositAmount());
            result.put("totalAmount", contract.getTotalAmount());
        } else {
            result.put("found", false);
            result.put("isDepositPaid", false);
        }
        return result;
    }
}

