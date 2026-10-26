package com.btl.webbanrau.config;

import jakarta.servlet.*;
import jakarta.servlet.http.*;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;
import java.io.IOException;
import java.util.concurrent.ConcurrentHashMap;

/** Per-node IP limit. User-row locks enforce OTP cooldown across nodes. */
@Component
public class AuthRateLimitFilter extends OncePerRequestFilter {
    private final ConcurrentHashMap<String,Window> windows=new ConcurrentHashMap<>();
    private record Window(long minute,int count) {}
    @Override protected void doFilterInternal(HttpServletRequest req,HttpServletResponse res,FilterChain chain) throws ServletException,IOException {
        String path=req.getServletPath();
        if("POST".equals(req.getMethod()) && (path.startsWith("/auth/")||path.equals("/ai/chat"))) {
            long minute=System.currentTimeMillis()/60000;
            if(windows.size()>10000) windows.entrySet().removeIf(e->e.getValue().minute()<minute);
            Window window=windows.compute(req.getRemoteAddr(),(key,old)->old==null||old.minute()!=minute?new Window(minute,1):new Window(minute,old.count()+1));
            if(window.count()>30) { res.setStatus(429);res.setHeader("Retry-After","60");res.setContentType("application/json;charset=UTF-8");res.getWriter().write("{\"code\":429,\"message\":\"Quá nhiều yêu cầu. Thử lại sau 60 giây.\"}"); return; }
        }
        chain.doFilter(req,res);
    }
}
