package com.btl.webbanrau.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class BuyerWarehouseRequest {
    @NotBlank private String name;
    @NotBlank private String address;
    private String phone;
    private boolean defaultWarehouse;
}
