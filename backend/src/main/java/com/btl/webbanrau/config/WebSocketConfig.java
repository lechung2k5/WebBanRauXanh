package com.btl.webbanrau.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;

@Configuration
@EnableWebSocketMessageBroker
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    @Override
    public void configureMessageBroker(MessageBrokerRegistry config) {
        // Topic dành cho broadcast chung, Queue dành cho tin nhắn riêng
        config.enableSimpleBroker("/topic", "/queue");
        config.setApplicationDestinationPrefixes("/app");
    }

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        // Hỗ trợ cả SockJS fallback và Native WebSocket cho Frontend Next.js
        registry.addEndpoint("/ws-b2b")
                .setAllowedOriginPatterns("*")
                .withSockJS();

        registry.addEndpoint("/ws-b2b")
                .setAllowedOriginPatterns("*");
    }
}
