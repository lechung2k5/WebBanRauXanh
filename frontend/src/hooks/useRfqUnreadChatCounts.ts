import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getB2bChatHistory } from '@/services/chatApi';
import { b2bWebSocket } from '@/services/websocketService';

export interface RfqChatTarget {
  id?: number;
  rfqCode?: string;
}

const STORAGE_KEY_PREFIX = 'b2b_chat_last_read_';

function parseTimestampMs(value?: string | null): number {
  if (!value) return 0;
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? 0 : parsed;
}

function getLastReadMs(role: 'FARMER' | 'BUYER', rfqCode: string): number {
  if (typeof window === 'undefined' || !rfqCode) return 0;
  try {
    const raw = localStorage.getItem(`${STORAGE_KEY_PREFIX}${role}_${rfqCode}`);
    if (!raw) return 0;
    const num = Number(raw);
    return Number.isFinite(num) ? num : parseTimestampMs(raw);
  } catch {
    return 0;
  }
}

function saveLastReadMs(role: 'FARMER' | 'BUYER', rfqCode: string, timestampMs: number): void {
  if (typeof window === 'undefined' || !rfqCode) return;
  try {
    localStorage.setItem(`${STORAGE_KEY_PREFIX}${role}_${rfqCode}`, String(timestampMs));
  } catch {}
}

/**
 * Theo dõi số lượng tin nhắn chat chưa đọc theo từng RFQ (nạp lịch sử + lắng nghe realtime STOMP).
 */
export function useRfqUnreadChatCounts(
  rfqs: RfqChatTarget[],
  currentRole: 'FARMER' | 'BUYER',
  activeChatRfqCode?: string | null
) {
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  const latestMsgTimeRef = useRef<Record<string, number>>({});
  const seenMessageIdsRef = useRef<Set<string>>(new Set());
  const activeCodeRef = useRef<string | null | undefined>(activeChatRfqCode);

  useEffect(() => {
    activeCodeRef.current = activeChatRfqCode;
  }, [activeChatRfqCode]);

  const normalizedTargets = useMemo(() => {
    const seen = new Set<string>();
    const list: { id?: number; rfqCode: string }[] = [];
    for (const r of rfqs) {
      const code = r?.rfqCode?.trim();
      if (!code || seen.has(code)) continue;
      seen.add(code);
      list.push({ id: r.id, rfqCode: code });
    }
    return list;
  }, [rfqs]);

  const targetSignature = useMemo(
    () => normalizedTargets.map((t) => `${t.id || 0}:${t.rfqCode}`).join('|'),
    [normalizedTargets]
  );

  const markChatAsRead = useCallback(
    (rfqCode?: string | null) => {
      if (!rfqCode) return;
      const latestKnown = latestMsgTimeRef.current[rfqCode] || 0;
      const readMs = Math.max(Date.now(), latestKnown);
      saveLastReadMs(currentRole, rfqCode, readMs);
      setUnreadCounts((prev) => {
        if (!prev[rfqCode]) return prev;
        return { ...prev, [rfqCode]: 0 };
      });
    },
    [currentRole]
  );

  // Tự động đánh dấu đã đọc khi modal chat đang mở cho rfqCode tương ứng
  useEffect(() => {
    if (activeChatRfqCode) {
      markChatAsRead(activeChatRfqCode);
    }
  }, [activeChatRfqCode, markChatAsRead]);

  // Nạp số tin nhắn chưa đọc ban đầu từ lịch sử chat
  useEffect(() => {
    if (normalizedTargets.length === 0) {
      setUnreadCounts({});
      return;
    }

    let cancelled = false;

    Promise.all(
      normalizedTargets.map(async ({ id, rfqCode }) => {
        try {
          const history = await getB2bChatHistory(id, rfqCode);
          const lastReadMs = getLastReadMs(currentRole, rfqCode);
          let unread = 0;
          let maxMsgMs = latestMsgTimeRef.current[rfqCode] || 0;

          for (const msg of history) {
            if (msg.id) {
              seenMessageIdsRef.current.add(String(msg.id));
            }
            const msgMs = parseTimestampMs(msg.createdAt);
            if (msgMs > maxMsgMs) maxMsgMs = msgMs;

            const isPartnerMsg =
              Boolean(msg.senderRole) &&
              msg.senderRole !== currentRole &&
              msg.senderRole !== 'SYSTEM';

            if (isPartnerMsg && msgMs > lastReadMs) {
              unread += 1;
            }
          }

          latestMsgTimeRef.current[rfqCode] = maxMsgMs;
          return { rfqCode, unread };
        } catch {
          return { rfqCode, unread: 0 };
        }
      })
    ).then((results) => {
      if (cancelled) return;
      setUnreadCounts((prev) => {
        const next: Record<string, number> = { ...prev };
        for (const { rfqCode, unread } of results) {
          next[rfqCode] = activeCodeRef.current === rfqCode ? 0 : unread;
        }
        return next;
      });
    });

    return () => {
      cancelled = true;
    };
  }, [targetSignature, currentRole]);

  // Lắng nghe tin nhắn mới realtime qua WebSocket để tăng badge ngay lập tức
  useEffect(() => {
    if (normalizedTargets.length === 0) return;

    const unsubscribers = normalizedTargets.map(({ id, rfqCode }) => {
      const topicTarget = id && id > 0 ? String(id) : rfqCode;
      return b2bWebSocket.subscribe(`/topic/chat/${topicTarget}`, (payload: any) => {
        if (!payload || payload.rfqCode !== rfqCode) return;

        const msgId = payload.id ? String(payload.id) : '';
        if (msgId) {
          if (seenMessageIdsRef.current.has(msgId)) return;
          seenMessageIdsRef.current.add(msgId);
        }

        const msgMs = parseTimestampMs(payload.createdAt) || Date.now();
        if (msgMs > (latestMsgTimeRef.current[rfqCode] || 0)) {
          latestMsgTimeRef.current[rfqCode] = msgMs;
        }

        const isPartnerMsg =
          Boolean(payload.senderRole) &&
          payload.senderRole !== currentRole &&
          payload.senderRole !== 'SYSTEM';

        if (!isPartnerMsg) return;

        if (activeCodeRef.current === rfqCode) {
          saveLastReadMs(currentRole, rfqCode, Math.max(Date.now(), msgMs));
          setUnreadCounts((prev) => (prev[rfqCode] ? { ...prev, [rfqCode]: 0 } : prev));
        } else {
          setUnreadCounts((prev) => ({
            ...prev,
            [rfqCode]: (prev[rfqCode] || 0) + 1,
          }));
        }
      });
    });

    return () => {
      unsubscribers.forEach((unsub) => unsub());
    };
  }, [targetSignature, currentRole]);

  return { unreadCounts, markChatAsRead };
}
