package com.btl.webbanrau.model;

/**
 * Trạng thái chuẩn của một phiên đàm phán RFQ.
 * WAITING_* cho biết rõ bên nào đang được quyền phản hồi tiếp theo.
 */
public final class RfqStatus {

    public static final String WAITING_FARMER = "WAITING_FARMER";
    public static final String WAITING_BUYER = "WAITING_BUYER";
    public static final String ACCEPTED = "ACCEPTED";
    public static final String REJECTED = "REJECTED";
    public static final String EXPIRED = "EXPIRED";

    private RfqStatus() {
    }

    public static String normalize(String status) {
        if ("PENDING".equals(status)) return WAITING_FARMER;
        if ("COUNTER_OFFER".equals(status)) return WAITING_BUYER;
        return status;
    }

    public static boolean isFarmerTurn(String status) {
        return WAITING_FARMER.equals(normalize(status));
    }

    public static boolean isBuyerTurn(String status) {
        return WAITING_BUYER.equals(normalize(status));
    }

    public static String nextActor(String status) {
        String normalized = normalize(status);
        if (WAITING_FARMER.equals(normalized)) return "FARMER";
        if (WAITING_BUYER.equals(normalized)) return "BUYER";
        return "NONE";
    }

    public static String label(String status) {
        return switch (normalize(status)) {
            case WAITING_FARMER -> "Chờ người bán phản hồi";
            case WAITING_BUYER -> "Chờ người mua phản hồi";
            case ACCEPTED -> "Đã chốt đàm phán";
            case REJECTED -> "Đã từ chối";
            case EXPIRED -> "Đã hết hạn";
            default -> status == null ? "Không xác định" : status;
        };
    }
}
