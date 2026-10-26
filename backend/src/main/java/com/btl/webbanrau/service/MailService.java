package com.btl.webbanrau.service;

import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
@Slf4j
public class MailService {

    private final JavaMailSender sender;

    @Value("${app.mail.from:honafresh.service@gmail.com}")
    private String from;

    @Value("${spring.mail.password:}")
    private String mailPassword;

    public void send(String email, String subject, String body) {
        String html = "<div style=\"font-family:sans-serif;padding:20px;\"><h2 style=\"color:#10542C;\">HoNa Fresh B2B</h2><p>"
                + body.replace("\n", "<br/>") + "</p></div>";
        sendHtml(email, subject, html, body);
    }

    public void sendHtml(String email, String subject, String htmlContent, String fallbackText) {
        log.info("Sending email to [{}] with subject [{}]", email, subject);
        try {
            MimeMessage mimeMessage = sender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(mimeMessage, true, "UTF-8");
            helper.setFrom(from);
            helper.setTo(email);
            helper.setSubject("HoNa Fresh — " + subject);
            helper.setText(htmlContent, true);
            sender.send(mimeMessage);
            log.info("Email sent successfully to [{}] via SMTP", email);
        } catch (Exception ex) {
            log.warn("Could not dispatch email via SMTP (GMAIL_APP_PASSWORD may not be set or network offline): {}", ex.getMessage());
            if (mailPassword != null && !mailPassword.isBlank()) {
                // If password is set and still failed, throw exception
                throw new AuthException(503, "MAIL_UNAVAILABLE", "Không thể gửi email xác thực qua Gmail SMTP. Vui lòng kiểm tra cấu hình mạng hoặc mật khẩu ứng dụng Gmail.");
            }
        }
    }

    public void otp(String email, String code) {
        log.info("===============================================================================");
        log.info("  [HONA FRESH OTP VERIFICATION]");
        log.info("  Email: {}", email);
        log.info("  Mã OTP 6 số: >>> {} <<<", code);
        log.info("  Thời hạn hiệu lực: 5 phút | Số lần thử tối đa: 5 lần");
        log.info("===============================================================================");

        String htmlTemplate = """
            <!DOCTYPE html>
            <html lang="vi">
            <head>
              <meta charset="UTF-8">
              <style>
                body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f7f9f6; margin: 0; padding: 20px; }
                .container { max-width: 560px; margin: 0 auto; background: #ffffff; border-radius: 20px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.06); border: 1px solid #e5e9e2; }
                .header { background: linear-gradient(135deg, #10542C 0%, #1e7e43 100%); padding: 32px 24px; text-align: center; color: #ffffff; }
                .header h1 { margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.5px; }
                .header p { margin: 8px 0 0; font-size: 13px; opacity: 0.9; }
                .content { padding: 36px 32px; color: #2d3748; line-height: 1.6; }
                .badge { display: inline-block; padding: 4px 12px; background: #eaf6ee; color: #10542C; font-weight: 700; border-radius: 999px; font-size: 12px; margin-bottom: 16px; }
                .otp-box { background: #f0f7f2; border: 2px dashed #10542C; border-radius: 16px; padding: 24px; text-align: center; margin: 24px 0; }
                .otp-code { font-size: 38px; font-weight: 900; letter-spacing: 10px; color: #10542C; margin: 0; font-family: Consolas, monospace; }
                .notice { font-size: 13px; color: #718096; margin-top: 12px; }
                .footer { background: #fcfdfc; padding: 20px 32px; border-top: 1px solid #edf2ec; font-size: 12px; color: #a0aec0; text-align: center; }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <h1>🌿 HoNa Fresh B2B</h1>
                  <p>Hệ Thống Sàn Nông Sản Trung Gian Ký Quỹ & Chuỗi Lạnh Logistics</p>
                </div>
                <div class="content">
                  <span class="badge">XÁC THỰC BẢO MẬT B2B</span>
                  <p>Xin chào quý đối tác,</p>
                  <p>Bạn đang thực hiện thao tác xác thực tài khoản trên sàn giao dịch nông sản <strong>HoNa Fresh</strong>. Vui lòng sử dụng mã xác thực OTP 6 chữ số dưới đây để hoàn tất:</p>
                  
                  <div class="otp-box">
                    <div class="otp-code">%s</div>
                    <div class="notice">⏱️ Mã có hiệu lực trong <strong>5 phút</strong> (tối đa 5 lần nhập sai).</div>
                  </div>

                  <p style="font-size: 13px; color: #e53e3e;">⚠️ <strong>Cảnh báo an toàn:</strong> Tuyệt đối không cung cấp mã OTP này cho bất kỳ ai, kể cả nhân viên hỗ trợ sàn HoNa Fresh.</p>
                  <p style="font-size: 13px; color: #718096;">Nếu bạn không yêu cầu mã này, vui lòng bỏ qua email hoặc thông báo cho bộ phận an ninh của chúng tôi.</p>
                </div>
                <div class="footer">
                  © 2026 HoNa Fresh Platform • Hệ thống Nông sản B2B Chuẩn Quốc Gia
                </div>
              </div>
            </body>
            </html>
            """.formatted(code);

        sendHtml(email, "Mã xác thực tài khoản B2B", htmlTemplate, "Mã OTP của bạn là: " + code);
    }
}
