'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  getBuyerB2bContractsApi,
  getBuyerClaimsApi,
  getBuyerRfqsApi,
} from '@/services/api';
import { fleetDispatchApi } from '@/services/fleetDispatchApi';
import { getSyncContracts, subscribeB2bSyncEvents } from '@/services/b2bSyncService';
import { b2bWebSocket } from '@/services/websocketService';

export interface BuyerRealtimeBadges {
  negotiationsCount: number;
  contractsCount: number;
  claimsCount: number;
  totalAlertsCount: number;
}

const EMPTY_BADGES: BuyerRealtimeBadges = {
  negotiationsCount: 0,
  contractsCount: 0,
  claimsCount: 0,
  totalAlertsCount: 0,
};

export function useBuyerRealtimeBadges(enabled: boolean): BuyerRealtimeBadges {
  const [badges, setBadges] = useState<BuyerRealtimeBadges>(EMPTY_BADGES);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const fetchBadges = useCallback(async () => {
    if (!enabled) return;

    try {
      const [backendContracts, backendRfqs, backendStops, backendClaims] = await Promise.all([
        getBuyerB2bContractsApi().catch(() => []),
        getBuyerRfqsApi().catch(() => []),
        fleetDispatchApi.getBuyerDeliveries().catch(() => []),
        getBuyerClaimsApi().catch(() => []),
      ]);

      if (!isMountedRef.current) return;

      // 1. Đếm RFQ chờ Buyer phản hồi (WAITING_BUYER)
      const rfqSeenCodes = new Set<string>();
      let negotiationsCount = 0;
      for (const rfq of backendRfqs || []) {
        const code = (rfq.rfqCode || `RFQ-${rfq.id}`).trim().toUpperCase();
        if (rfqSeenCodes.has(code)) continue;
        rfqSeenCodes.add(code);
        if (String(rfq.status || '').toUpperCase() === 'WAITING_BUYER') {
          negotiationsCount += 1;
        }
      }

      // 2. Đếm Hợp đồng chờ đặt cọc (khớp logic pendingDepositContracts trong BuyerManagementConsole)
      const localContracts = getSyncContracts();
      const localDepositPaidCodes = new Set<string>();
      for (const lc of localContracts) {
        if (lc.depositStatus === 'DEPOSIT_PAID') {
          const code = (lc.contractCode || `HD-${lc.id}`).trim().toUpperCase();
          localDepositPaidCodes.add(code);
        }
      }

      const contractMap = new Map<string, boolean>();
      for (const bc of backendContracts || []) {
        if (!bc.contractCode) continue;
        const code = bc.contractCode.trim().toUpperCase();
        const rawStatus = String((bc as unknown as { status?: string }).status || bc.depositStatus || '').toUpperCase();
        const isDepositPaid =
          rawStatus === 'DEPOSIT_PAID' ||
          rawStatus === 'ACTIVE' ||
          bc.depositStatus === 'DEPOSIT_PAID' ||
          Boolean(bc.depositPaidAt) ||
          localDepositPaidCodes.has(code);
        contractMap.set(code, isDepositPaid);
      }

      let pendingDepositCount = 0;
      for (const isDepositPaid of contractMap.values()) {
        if (!isDepositPaid) pendingDepositCount += 1;
      }

      // 3. Đếm chuyến giao hàng cần Buyer xác nhận ePOD
      const pendingDeliveriesCount = (Array.isArray(backendStops) ? backendStops : []).filter(
        (stop) => stop.status === 'PENDING_BUYER_CONFIRMATION' || stop.status === 'ARRIVED',
      ).length;

      const contractsCount = pendingDepositCount + pendingDeliveriesCount;

      // 4. Đếm khiếu nại đang mở (OPEN)
      const claimsCount = (Array.isArray(backendClaims) ? backendClaims : []).filter(
        (claim) => String(claim.status || '').toUpperCase() === 'OPEN',
      ).length;

      setBadges({
        negotiationsCount,
        contractsCount,
        claimsCount,
        totalAlertsCount: negotiationsCount + contractsCount + claimsCount,
      });
    } catch {
      // Giữ nguyên state hiện tại nếu lỗi mạng tạm thời
    }
  }, [enabled]);

  useEffect(() => {
    if (!enabled) {
      setBadges(EMPTY_BADGES);
      return;
    }

    void fetchBadges();

    const triggerRefresh = () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      debounceTimerRef.current = setTimeout(() => {
        void fetchBadges();
      }, 300);
    };

    const unsubWsContracts = b2bWebSocket.subscribeContracts(triggerRefresh);
    const unsubWsRfqs = b2bWebSocket.subscribeRfqs(triggerRefresh);
    const unsubWsDispatch = b2bWebSocket.subscribeDispatch(triggerRefresh);
    const unsubSync = subscribeB2bSyncEvents(triggerRefresh);

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        triggerRefresh();
      }
    };

    window.addEventListener('b2b_sync_event', triggerRefresh);
    window.addEventListener('b2b_contract_updated', triggerRefresh);
    window.addEventListener('b2b_rfq_updated', triggerRefresh);
    window.addEventListener('focus', triggerRefresh);
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      unsubWsContracts();
      unsubWsRfqs();
      unsubWsDispatch();
      unsubSync();
      window.removeEventListener('b2b_sync_event', triggerRefresh);
      window.removeEventListener('b2b_contract_updated', triggerRefresh);
      window.removeEventListener('b2b_rfq_updated', triggerRefresh);
      window.removeEventListener('focus', triggerRefresh);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [enabled, fetchBadges]);

  return badges;
}
