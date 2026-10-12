package com.btl.webbanrau.service;

import com.btl.webbanrau.dto.request.OrderItemRequest;
import com.btl.webbanrau.dto.request.OrderRequest;
import com.btl.webbanrau.dto.response.OrderItemResponse;
import com.btl.webbanrau.dto.response.OrderResponse;
import com.btl.webbanrau.dto.response.PageResponse;
import com.btl.webbanrau.model.Order;
import com.btl.webbanrau.model.OrderItem;
import com.btl.webbanrau.model.OrderStatus;
import com.btl.webbanrau.model.Product;
import com.btl.webbanrau.model.User;
import com.btl.webbanrau.repository.OrderRepository;
import com.btl.webbanrau.repository.ProductRepository;
import com.btl.webbanrau.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class OrderService {

    private final OrderRepository orderRepository;
    private final ProductRepository productRepository;
    private final UserRepository userRepository;

    @Transactional(readOnly = true)
    @PreAuthorize("hasRole('ADMIN')")
    public PageResponse<OrderResponse> getAllOrders(int page, int size) {
        Page<Order> orderPage = orderRepository.findAll(PageRequest.of(page, size, Sort.by("createdAt").descending()));
        List<OrderResponse> list = orderPage.getContent().stream().map(this::mapToResponse).toList();
        return PageResponse.<OrderResponse>builder()
                .currentPage(orderPage.getNumber())
                .totalPages(orderPage.getTotalPages())
                .pageSize(orderPage.getSize())
                .totalElements(orderPage.getTotalElements())
                .data(list)
                .build();
    }

    @Transactional(readOnly = true)
    public PageResponse<OrderResponse> getOrdersByUser(Long userId, int page, int size) {
        Page<Order> orderPage = orderRepository.findByUserId(userId, PageRequest.of(page, size, Sort.by("createdAt").descending()));
        List<OrderResponse> list = orderPage.getContent().stream().map(this::mapToResponse).toList();
        return PageResponse.<OrderResponse>builder()
                .currentPage(orderPage.getNumber())
                .totalPages(orderPage.getTotalPages())
                .pageSize(orderPage.getSize())
                .totalElements(orderPage.getTotalElements())
                .data(list)
                .build();
    }

    @Transactional(readOnly = true)
    public OrderResponse getOrderByCode(String orderCode) {
        Order o = orderRepository.findByOrderCode(orderCode)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy đơn hàng với mã: " + orderCode));
        return mapToResponse(o);
    }

    @Transactional
    public OrderResponse createOrder(OrderRequest request) {
        User user = null;
        if (request.getUserId() != null) {
            user = userRepository.findById(request.getUserId()).orElse(null);
        }

        String orderCode = "ORD-" + LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMdd"))
                + "-" + UUID.randomUUID().toString().substring(0, 6).toUpperCase();

        Order order = Order.builder()
                .orderCode(orderCode)
                .user(user)
                .recipientName(request.getRecipientName().trim())
                .recipientPhone(request.getRecipientPhone().trim())
                .shippingAddress(request.getShippingAddress().trim())
                .note(request.getNote())
                .paymentMethod(request.getPaymentMethod() != null ? request.getPaymentMethod() : "COD")
                .isPaid(false)
                .status(OrderStatus.PENDING)
                .totalAmount(BigDecimal.ZERO)
                .items(new ArrayList<>())
                .build();

        BigDecimal totalAmount = BigDecimal.ZERO;

        for (OrderItemRequest itemReq : request.getItems()) {
            Product product = productRepository.findById(itemReq.getProductId())
                    .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy sản phẩm ID: " + itemReq.getProductId()));

            if (product.getStockQuantity() < itemReq.getQuantity()) {
                throw new IllegalArgumentException("Sản phẩm " + product.getName() + " chỉ còn " + product.getStockQuantity() + " " + product.getUnit());
            }

            // Deduct stock
            product.setStockQuantity(product.getStockQuantity() - itemReq.getQuantity());
            productRepository.save(product);

            BigDecimal itemTotal = product.getPrice().multiply(BigDecimal.valueOf(itemReq.getQuantity()));
            totalAmount = totalAmount.add(itemTotal);

            OrderItem orderItem = OrderItem.builder()
                    .order(order)
                    .product(product)
                    .quantity(itemReq.getQuantity())
                    .unitPrice(product.getPrice())
                    .totalPrice(itemTotal)
                    .build();

            order.addItem(orderItem);
        }

        order.setTotalAmount(totalAmount);
        return mapToResponse(orderRepository.save(order));
    }

    @Transactional
    @PreAuthorize("hasRole('ADMIN')")
    public OrderResponse updateOrderStatus(Long id, OrderStatus status) {
        Order order = orderRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy đơn hàng!"));

        order.setStatus(status);
        if (status == OrderStatus.DELIVERED) {
            order.setIsPaid(true);
        }
        return mapToResponse(orderRepository.save(order));
    }

    private OrderResponse mapToResponse(Order order) {
        List<OrderItemResponse> itemResponses = order.getItems().stream()
                .map(item -> OrderItemResponse.builder()
                        .id(item.getId())
                        .productId(item.getProduct() != null ? item.getProduct().getId() : null)
                        .productName(item.getProduct() != null ? item.getProduct().getName() : "Sản phẩm")
                        .productImageUrl(item.getProduct() != null ? item.getProduct().getImageUrl() : "")
                        .unit(item.getProduct() != null ? item.getProduct().getUnit() : "")
                        .quantity(item.getQuantity())
                        .unitPrice(item.getUnitPrice())
                        .totalPrice(item.getTotalPrice())
                        .build())
                .toList();

        return OrderResponse.builder()
                .id(order.getId())
                .orderCode(order.getOrderCode())
                .userId(order.getUser() != null ? order.getUser().getId() : null)
                .recipientName(order.getRecipientName())
                .recipientPhone(order.getRecipientPhone())
                .shippingAddress(order.getShippingAddress())
                .note(order.getNote())
                .totalAmount(order.getTotalAmount())
                .paymentMethod(order.getPaymentMethod())
                .isPaid(order.getIsPaid())
                .status(order.getStatus())
                .items(itemResponses)
                .createdAt(order.getCreatedAt())
                .updatedAt(order.getUpdatedAt())
                .build();
    }
}
