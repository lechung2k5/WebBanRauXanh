package com.btl.webbanrau.config;

import com.btl.webbanrau.service.AuthException;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.*;
import org.springframework.dao.DataIntegrityViolationException;
import java.util.Map;

@RestControllerAdvice
public class ApiExceptionHandler {
    @ExceptionHandler(AuthException.class)
    public ResponseEntity<?> auth(AuthException e) { return ResponseEntity.status(e.getStatus()).body(Map.of("code",e.getStatus(),"error",e.getError(),"message",e.getMessage())); }
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<?> validation(MethodArgumentNotValidException e) {
        return ResponseEntity.badRequest().body(Map.of("code",400,"message",e.getBindingResult().getFieldErrors().stream().map(x->x.getField()+": "+x.getDefaultMessage()).toList()));
    }
    @ExceptionHandler(DataIntegrityViolationException.class)
    public ResponseEntity<?> conflict() { return ResponseEntity.status(409).body(Map.of("code",409,"message","Dữ liệu đã tồn tại hoặc đang được sử dụng.")); }
    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<?> invalid(IllegalArgumentException e) { return ResponseEntity.badRequest().body(Map.of("code",400,"message",e.getMessage())); }
}
