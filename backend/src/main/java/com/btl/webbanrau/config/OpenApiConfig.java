package com.btl.webbanrau.config;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Contact;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.info.License;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class OpenApiConfig {

    @Bean
    public OpenAPI webBanRauOpenAPI() {
        return new OpenAPI()
                .info(new Info()
                        .title("BTL Web Bán Rau Củ Quả Sạch - API Docs")
                        .description("Tài liệu REST API cho hệ thống Bán Rau Hữu Cơ tích hợp Spring Security & PostgreSQL")
                        .version("1.0.0")
                        .contact(new Contact().name("BTL Web Ban Rau Team").email("support@webbanrau.com"))
                        .license(new License().name("Apache 2.0").url("http://springdoc.org")));
    }
}
