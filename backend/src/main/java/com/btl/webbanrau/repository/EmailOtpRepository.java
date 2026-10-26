package com.btl.webbanrau.repository;
import com.btl.webbanrau.model.EmailOtp;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface EmailOtpRepository extends JpaRepository<EmailOtp, Long> {
    Optional<EmailOtp> findFirstByEmailAndOtpTypeOrderByIdDesc(String email, String type);
}
