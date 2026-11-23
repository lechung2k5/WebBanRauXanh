package com.btl.webbanrau.service;

import lombok.Getter;
@Getter
public class AuthException extends RuntimeException {
    private final int status;
    private final String error;
    public AuthException(int status, String error, String message) { super(message); this.status=status; this.error=error; }
}
