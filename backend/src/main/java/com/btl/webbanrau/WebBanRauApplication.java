package com.btl.webbanrau;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.data.jpa.repository.config.EnableJpaAuditing;

@SpringBootApplication
@EnableJpaAuditing
public class WebBanRauApplication {

    public static void main(String[] args) {
        SpringApplication.run(WebBanRauApplication.class, args);
    }
}
