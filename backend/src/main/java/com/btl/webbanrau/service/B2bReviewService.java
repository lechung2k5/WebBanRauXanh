package com.btl.webbanrau.service;

import com.btl.webbanrau.dto.request.B2bReviewRequest;
import com.btl.webbanrau.model.User;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;

@Service
@RequiredArgsConstructor
public class B2bReviewService {
    private final JdbcTemplate db;

    @Transactional
    public Map<String, Object> submit(Long contractId, B2bReviewRequest request, String reviewerRole) {
        User actor = AuthService.current();
        String role = normalizeRole(reviewerRole);
        if ("BUYER".equals(role) && !AuthService.has(actor, "BUYER")) {
            throw new AuthException(403, "BUYER_REQUIRED", "Chỉ tài khoản Buyer được gửi đánh giá.");
        }
        if ("FARMER".equals(role) && !AuthService.has(actor, "FARMER") && !AuthService.has(actor, "COOPERATIVE")) {
            throw new AuthException(403, "FARMER_REQUIRED", "Chỉ tài khoản Nhà vườn/HTX được gửi đánh giá.");
        }

        Map<String, Object> contract = ownedContract(contractId, actor, role);
        String status = Objects.toString(contract.get("status"), "");
        if (!List.of("DELIVERED", "SETTLED").contains(status)) {
            throw new AuthException(400, "REVIEW_NOT_READY", "Chỉ được đánh giá sau khi hợp đồng đã giao hàng hoặc quyết toán.");
        }

        String comment = request.getComment() == null ? "" : request.getComment().trim();
        db.update("""
                INSERT INTO b2b_reviews (contract_id, reviewer_id, reviewer_role, rating, comment)
                VALUES (?, ?, ?, ?, ?)
                ON CONFLICT (contract_id, reviewer_id, reviewer_role)
                DO UPDATE SET rating=EXCLUDED.rating, comment=EXCLUDED.comment, updated_at=CURRENT_TIMESTAMP
                """, contractId, actor.getId(), role, request.getRating(), comment);
        return review(contractId, actor.getId(), role);
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> list(Long contractId, String reviewerRole) {
        User actor = AuthService.current();
        String role = normalizeRole(reviewerRole);
        ownedContract(contractId, actor, role);
        return db.queryForList("""
                SELECT r.id, r.contract_id AS \"contractId\", r.reviewer_id AS \"reviewerId\",
                       r.reviewer_role AS \"reviewerRole\", r.rating, r.comment,
                       r.created_at AS \"createdAt\", r.updated_at AS \"updatedAt\",
                       u.full_name AS \"reviewerName\"
                FROM b2b_reviews r
                JOIN users u ON u.id=r.reviewer_id
                WHERE r.contract_id=?
                ORDER BY r.created_at DESC
                """, contractId);
    }

    private Map<String, Object> ownedContract(Long contractId, User actor, String role) {
        String ownerColumn = "BUYER".equals(role) ? "buyer_id" : "farmer_id";
        List<Map<String, Object>> rows = db.queryForList(
                "SELECT id, status, contract_code FROM b2b_contracts WHERE id=? AND " + ownerColumn + "=?",
                contractId, actor.getId());
        if (rows.isEmpty()) {
            throw new AuthException(404, "CONTRACT_NOT_FOUND", "Không tìm thấy hợp đồng hoặc bạn không có quyền truy cập.");
        }
        return new LinkedHashMap<>(rows.getFirst());
    }

    private Map<String, Object> review(Long contractId, Long reviewerId, String role) {
        return db.queryForMap("""
                SELECT r.id, r.contract_id AS \"contractId\", r.reviewer_id AS \"reviewerId\",
                       r.reviewer_role AS \"reviewerRole\", r.rating, r.comment,
                       r.created_at AS \"createdAt\", r.updated_at AS \"updatedAt\"
                FROM b2b_reviews r
                WHERE r.contract_id=? AND r.reviewer_id=? AND r.reviewer_role=?
                """, contractId, reviewerId, role);
    }

    private static String normalizeRole(String role) {
        if (!"BUYER".equals(role) && !"FARMER".equals(role)) {
            throw new AuthException(400, "INVALID_REVIEW_ROLE", "Vai trò đánh giá không hợp lệ.");
        }
        return role;
    }
}
