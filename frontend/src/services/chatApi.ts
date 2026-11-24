/**
 * Dịch vụ API và WebSocket Chat Realtime B2B HoNa Fresh
 * Kết nối Spring Boot Broker (/ws-b2b, /app/chat.sendMessage, /topic/chat/{rfq})
 * Hỗ trợ lưu trữ tin nhắn tạm Redis, tải ảnh và fallback HTTP an toàn
 */

import { b2bWebSocket } from './websocketService';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api/v1';

export interface B2bChatMessage {
  id: string;
  rfqId: number;
  rfqCode: string;
  senderId: number | string;
  senderName: string;
  senderRole: 'BUYER' | 'FARMER' | 'SYSTEM' | string;
  content: string;
  messageType: 'TEXT' | 'IMAGE';
  imageUrl?: string;
  createdAt: string;
}

/**
 * Lấy lịch sử tin nhắn của phiên đàm phán RFQ từ Backend (Redis cache + PostgreSQL)
 */
export async function getB2bChatHistory(rfqId?: number, rfqCode?: string): Promise<B2bChatMessage[]> {
  try {
    const idParam = rfqId && rfqId > 0 ? rfqId : 0;
    const query = rfqCode ? `?rfqCode=${encodeURIComponent(rfqCode)}` : '';
    const res = await fetch(`${API_BASE_URL}/chat/rfq/${idParam}/history${query}`, {
      cache: 'no-store',
    });

    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.result)) {
        return data.result;
      }
    }
  } catch (err) {
    console.debug('Không thể nạp lịch sử chat từ server, dùng bộ nhớ cục bộ:', err);
  }

  // Fallback đọc từ LocalStorage nếu backend offline
  if (typeof window !== 'undefined' && rfqCode) {
    try {
      const localKey = `b2b_chat_messages_${rfqCode}`;
      const saved = localStorage.getItem(localKey);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch {}
  }

  return [];
}

/**
 * Gửi tin nhắn qua WebSocket STOMP (kèm fallback HTTP)
 */
export async function sendB2bChatMessage(message: Omit<B2bChatMessage, 'id' | 'createdAt'> & { id?: string; createdAt?: string }): Promise<B2bChatMessage> {
  const fullMessage: B2bChatMessage = {
    ...message,
    id: message.id || `msg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    createdAt: message.createdAt || new Date().toISOString(),
  };

  // 1. Lưu dự phòng vào LocalStorage
  if (typeof window !== 'undefined' && fullMessage.rfqCode) {
    try {
      const localKey = `b2b_chat_messages_${fullMessage.rfqCode}`;
      const saved = localStorage.getItem(localKey);
      const list: B2bChatMessage[] = saved ? JSON.parse(saved) : [];
      list.push(fullMessage);
      localStorage.setItem(localKey, JSON.stringify(list));
    } catch {}
  }

  // 2. Gửi qua WebSocket STOMP (Realtime tới Redis & Đối tác)
  let sentViaWs = false;
  try {
    if (b2bWebSocket.getConnected()) {
      b2bWebSocket.publish('/app/chat.sendMessage', fullMessage);
      sentViaWs = true;
    }
  } catch (err) {
    console.warn('Lỗi gửi chat qua WebSocket:', err);
  }

  // 3. Nếu chưa gửi được qua WS, gọi HTTP REST API
  if (!sentViaWs) {
    try {
      await fetch(`${API_BASE_URL}/chat/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(fullMessage),
      });
    } catch (e) {
      console.warn('Lỗi gọi HTTP fallback chat send:', e);
    }
  }

  return fullMessage;
}

/**
 * Gửi tín hiệu đang soạn tin nhắn (Typing Indicator) qua WebSocket
 */
export function sendB2bTypingSignal(rfqCode: string, isTyping: boolean, senderName: string, rfqId?: number): void {
  try {
    if (b2bWebSocket.getConnected()) {
      b2bWebSocket.publish('/app/chat.typing', {
        rfqCode,
        rfqId,
        isTyping,
        senderName,
      });
    }
  } catch (err) {
    console.debug('Không thể gửi typing signal qua socket:', err);
  }
}

/**
 * Tải ảnh đính kèm trong tin nhắn chat
 */
export async function uploadB2bChatImage(file: File): Promise<string> {
  const formData = new FormData();
  formData.append('file', file);

  try {
    const res = await fetch(`${API_BASE_URL}/chat/upload-image`, {
      method: 'POST',
      body: formData,
    });

    if (res.ok) {
      const data = await res.json();
      if (data?.result?.imageUrl) {
        return data.result.imageUrl;
      }
    }
  } catch (err) {
    console.warn('Không thể upload ảnh lên server, chuyển đổi Base64 client:', err);
  }

  // Fallback đọc trực tiếp Base64 client-side
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
