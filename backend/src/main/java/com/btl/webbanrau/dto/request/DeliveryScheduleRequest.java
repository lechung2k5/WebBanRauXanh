package com.btl.webbanrau.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.*;

import java.time.LocalDate;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DeliveryScheduleRequest {
    @NotNull(message = "Ngày hẹn giao trạm không được để trống")
    private LocalDate hubDeliveryDate;

    @NotBlank(message = "Tên trạm trung chuyển không được để trống")
    private String hubName;

    private String timeSlot; // ví dụ: "06:00 - 09:00", "11:00 - 14:00", "16:00 - 19:00"
    private String truckType; // ví dụ: "Xe tải lạnh 2.5 tấn", "Xe bán tải 1 tấn"
    private String notes; // Ghi chú đặc biệt về bảo quản lạnh
}
