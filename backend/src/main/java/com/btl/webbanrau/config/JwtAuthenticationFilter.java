package com.btl.webbanrau.config;

import com.btl.webbanrau.model.User;
import com.btl.webbanrau.service.TokenService;
import jakarta.servlet.*;
import jakarta.servlet.http.*;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;
import java.io.IOException;

@Component @RequiredArgsConstructor
public class JwtAuthenticationFilter extends OncePerRequestFilter {
    private final TokenService tokens;
    @Override protected void doFilterInternal(HttpServletRequest request,HttpServletResponse response,FilterChain chain) throws ServletException,IOException {
        String header=request.getHeader("Authorization");
        if(header!=null&&header.startsWith("Bearer ")) {
            try {
                User user=tokens.authenticate(header.substring(7));
                var auth=new UsernamePasswordAuthenticationToken(user,null,user.getRoles().stream().map(r->new SimpleGrantedAuthority(r.getName())).toList());
                SecurityContextHolder.getContext().setAuthentication(auth);
            } catch(org.springframework.security.oauth2.jwt.JwtException|com.btl.webbanrau.service.AuthException|NumberFormatException e) {
                response.setStatus(401); response.setContentType("application/json;charset=UTF-8");
                response.getWriter().write("{\"code\":401,\"error\":\"INVALID_TOKEN\",\"message\":\"Phiên hết hạn hoặc không hợp lệ\"}"); return;
            }
        }
        chain.doFilter(request,response);
    }
}
