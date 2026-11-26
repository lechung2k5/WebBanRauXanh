package com.btl.webbanrau.dto.request;

import lombok.Data;

@Data
public class DepartOutboundTripRequest {
    private String dispatcherName;
    private String dispatcherSignatureData;
    private String driverPickupSignatureData;
    private String departurePhotoUrl;
    private String notes;
}
