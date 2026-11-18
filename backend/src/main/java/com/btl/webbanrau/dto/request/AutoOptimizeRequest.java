package com.btl.webbanrau.dto.request;

import jakarta.validation.constraints.NotNull;
import lombok.Data;
import java.util.List;

@Data
public class AutoOptimizeRequest {
    @NotNull(message = "Mã kho không được để trống")
    private Long warehouseId;

    private List<Long> contractIds;
}
