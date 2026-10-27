package com.btl.webbanrau.config;

import com.btl.webbanrau.service.CustomUserDetailsService;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.AuthenticationProvider;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity
@RequiredArgsConstructor
public class SecurityConfig {

    private final CustomUserDetailsService userDetailsService;

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder(10);
    }

    @Bean
    public AuthenticationProvider authenticationProvider() {
        DaoAuthenticationProvider authProvider = new DaoAuthenticationProvider();
        authProvider.setUserDetailsService(userDetailsService);
        authProvider.setPasswordEncoder(passwordEncoder());
        return authProvider;
    }

    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration config) throws Exception {
        return config.getAuthenticationManager();
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http, JwtAuthenticationFilter jwtFilter, AuthRateLimitFilter rateLimit) throws Exception {
        http
                .cors(Customizer.withDefaults())
                .csrf(csrf -> csrf.disable())
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers("/auth/me", "/auth/profile", "/auth/logout-all", "/auth/google-link").authenticated()
                        .requestMatchers("/auth/**", "/swagger-ui/**", "/v3/api-docs/**", "/swagger-ui.html", "/error").permitAll()
                        .requestMatchers(HttpMethod.GET, "/harvest-lots/**", "/cold-assets/public-status").permitAll()
                        .requestMatchers(HttpMethod.GET, "/products/**", "/categories/**").permitAll()
                        .requestMatchers(HttpMethod.GET, "/ai/search", "/ai/hybrid-search", "/ai/similar-products/**", "/ai/status").permitAll()
                        .requestMatchers(HttpMethod.POST, "/ai/chat", "/ai/config-key", "/ai/sync-embeddings").permitAll()

                        // 2. Portal Nông Trại: Chỉ dành cho FARMER
                        .requestMatchers("/farmer/**", "/harvest-lots/my-lots/**", "/contracts/farmer/**").hasRole("FARMER")

                        // 3. Portal Thương Lái: Chỉ dành cho BUYER
                        .requestMatchers("/buyer/**", "/rfq/**", "/contracts/buyer/**", "/escrow/deposit/**").hasRole("BUYER")

                        // 4. Portal Trạm Trung Chuyển & QC: WAREHOUSE_QC hoặc ADMIN
                        .requestMatchers("/hub-inspections/**", "/cold-assets/manage/**").hasAnyRole("WAREHOUSE_QC", "ADMIN")

                        // 5. Portal Tài Xế Lạnh: DRIVER hoặc ADMIN
                        .requestMatchers("/driver/**", "/shipments/epod/**").hasAnyRole("DRIVER", "ADMIN")

                        // 6. Portal Kế Toán & Thuế VAS: ACCOUNTANT hoặc ADMIN
                        .requestMatchers("/accounting/**", "/escrow/settlement/**", "/invoices/**").hasAnyRole("ACCOUNTANT", "ADMIN")

                        // Hợp đồng dùng chung giữa 2 bên
                        .requestMatchers("/portal/contracts").hasAnyRole("FARMER", "BUYER", "ADMIN")

                        // Quản lý Đơn hàng & Quản trị viên
                        .requestMatchers("/orders/**").hasRole("ADMIN")
                        .requestMatchers("/admin/**", "/users/**").hasRole("ADMIN")
                        .requestMatchers(HttpMethod.POST, "/products/**", "/categories/**").hasRole("ADMIN")
                        .requestMatchers(HttpMethod.PUT, "/products/**", "/categories/**").hasRole("ADMIN")
                        .requestMatchers(HttpMethod.DELETE, "/products/**", "/categories/**").hasRole("ADMIN")

                        // 7. Mọi request khác
                        .anyRequest().authenticated())
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .exceptionHandling(errors -> errors
                    .authenticationEntryPoint((req,res,ex)->{res.setStatus(401);res.setContentType("application/json;charset=UTF-8");res.getWriter().write("{\"code\":401,\"message\":\"Vui lòng đăng nhập\"}");})
                    .accessDeniedHandler((req,res,ex)->{res.setStatus(403);res.setContentType("application/json;charset=UTF-8");res.getWriter().write("{\"code\":403,\"message\":\"Bạn không có quyền truy cập\"}");}))
                .addFilterBefore(jwtFilter, org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter.class)
                .addFilterBefore(rateLimit, JwtAuthenticationFilter.class)
                .authenticationProvider(authenticationProvider())
                .formLogin(form -> form.disable());

        return http.build();
    }
}
