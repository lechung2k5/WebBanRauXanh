/**
 * Dịch vụ WebSocket STOMP Client cho hệ thống B2B Hona Fresh
 * Sử dụng thư viện chuẩn @stomp/stompjs và sockjs-client
 * Kết nối tới Spring Boot Message Broker: /ws-b2b (Prefix: /topic, /queue, /app)
 */

import { Client, IMessage, StompSubscription } from '@stomp/stompjs';

export type StompMessageCallback = (payload: any, rawMessage: IMessage) => void;

function getBrokerUrl(): string {
  if (typeof window === 'undefined') {
    return 'ws://localhost:8080/api/v1/ws-b2b';
  }
  if (process.env.NEXT_PUBLIC_WS_URL) {
    return process.env.NEXT_PUBLIC_WS_URL;
  }
  const host = window.location.hostname || 'localhost';
  // Spring Boot context-path là /api/v1 nên endpoint đầy đủ là /api/v1/ws-b2b
  return `ws://${host}:8080/api/v1/ws-b2b`;
}

class B2bStompService {
  private client: Client | null = null;
  private isConnected: boolean = false;
  private pendingSubscriptions: Array<{
    destination: string;
    callback: StompMessageCallback;
    id: string;
  }> = [];
  private activeSubscriptions: Map<string, StompSubscription> = new Map();
  private subCounter: number = 0;
  private connectionListeners: Set<(connected: boolean) => void> = new Set();

  constructor() {
    if (typeof window !== 'undefined') {
      this.initClient();
    }
  }

  public initClient(): Client {
    if (this.client) {
      return this.client;
    }

    const brokerURL = getBrokerUrl();

    this.client = new Client({
      brokerURL,
      reconnectDelay: 5000,
      heartbeatIncoming: 10000,
      heartbeatOutgoing: 10000,
      debug: () => {
        // Tắt log debug verbose để không spam console theo nguyên tắc AGENTS.md
      },
      onConnect: () => {
        this.isConnected = true;
        this.notifyConnectionListeners(true);
        // Kích hoạt lại các subscription đang chờ
        for (const item of this.pendingSubscriptions) {
          this.executeSubscription(item.id, item.destination, item.callback);
        }
      },
      onDisconnect: () => {
        this.isConnected = false;
        this.notifyConnectionListeners(false);
      },
      onStompError: (frame) => {
        console.warn('[STOMP] Lỗi broker:', frame.headers['message']);
      },
      onWebSocketClose: () => {
        this.isConnected = false;
        this.notifyConnectionListeners(false);
      },
    });

    try {
      this.client.activate();
    } catch (err) {
      console.warn('[STOMP] Không thể kích hoạt kết nối WebSocket:', err);
    }

    return this.client;
  }

  private notifyConnectionListeners(connected: boolean): void {
    this.connectionListeners.forEach((fn) => {
      try {
        fn(connected);
      } catch {}
    });
  }

  public onConnectionChange(listener: (connected: boolean) => void): () => void {
    this.connectionListeners.add(listener);
    listener(this.isConnected);
    return () => {
      this.connectionListeners.delete(listener);
    };
  }

  public getClient(): Client | null {
    if (!this.client && typeof window !== 'undefined') {
      return this.initClient();
    }
    return this.client;
  }

  public subscribe(
    destination: string,
    callback: StompMessageCallback
  ): () => void {
    const subId = `sub_${Date.now()}_${++this.subCounter}`;

    if (this.isConnected && this.client) {
      this.executeSubscription(subId, destination, callback);
    } else {
      this.pendingSubscriptions.push({ id: subId, destination, callback });
      if (!this.client && typeof window !== 'undefined') {
        this.initClient();
      }
    }

    return () => {
      this.unsubscribe(subId);
    };
  }

  private executeSubscription(
    id: string,
    destination: string,
    callback: StompMessageCallback
  ): void {
    if (!this.client || !this.isConnected) return;
    try {
      const sub = this.client.subscribe(destination, (message: IMessage) => {
        try {
          const payload = message.body ? JSON.parse(message.body) : {};
          callback(payload, message);
        } catch {
          callback(message.body, message);
        }
      });
      this.activeSubscriptions.set(id, sub);
    } catch (err) {
      console.warn(`[STOMP] Lỗi đăng ký topic ${destination}:`, err);
    }
  }

  public unsubscribe(subId: string): void {
    // Xóa khỏi danh sách chờ
    this.pendingSubscriptions = this.pendingSubscriptions.filter((p) => p.id !== subId);

    // Xóa khỏi active subscriptions
    const sub = this.activeSubscriptions.get(subId);
    if (sub) {
      try {
        sub.unsubscribe();
      } catch {}
      this.activeSubscriptions.delete(subId);
    }
  }

  public publish(destination: string, payload: any): void {
    if (!this.client || !this.isConnected) {
      return;
    }
    try {
      this.client.publish({
        destination,
        body: typeof payload === 'string' ? payload : JSON.stringify(payload),
      });
    } catch (err) {
      console.warn(`[STOMP] Lỗi publish tới ${destination}:`, err);
    }
  }

  public subscribeContract(
    contractCode: string,
    callback: (payload: any) => void
  ): () => void {
    const cleanCode = (contractCode || '').trim().toUpperCase();
    const topic = cleanCode ? `/topic/contracts/${cleanCode}` : '/topic/contracts';
    return this.subscribe(topic, (payload) => {
      callback(payload);
    });
  }

  public subscribeContracts(callback: (payload: any) => void): () => void {
    return this.subscribe('/topic/contracts', (payload) => {
      callback(payload);
    });
  }

  public subscribeRfq(
    rfqCode: string,
    callback: (payload: any) => void
  ): () => void {
    const cleanCode = (rfqCode || '').trim().toUpperCase();
    const topic = cleanCode ? `/topic/rfqs/${cleanCode}` : '/topic/rfqs';
    return this.subscribe(topic, (payload) => {
      callback(payload);
    });
  }

  public subscribeRfqs(callback: (payload: any) => void): () => void {
    return this.subscribe('/topic/rfqs', (payload) => {
      callback(payload);
    });
  }

  public subscribeLots(callback: (payload: any) => void): () => void {
    return this.subscribe('/topic/lots', (payload) => {
      callback(payload);
    });
  }

  public subscribeProducts(callback: (payload: any) => void): () => void {
    return this.subscribe('/topic/products', (payload) => {
      callback(payload);
    });
  }

  public subscribeDispatch(callback: (payload: any) => void): () => void {
    return this.subscribe('/topic/dispatch', (payload) => {
      callback(payload);
    });
  }

  public getConnected(): boolean {
    return this.isConnected;
  }

  public disconnect(): void {
    if (this.client) {
      try {
        this.client.deactivate();
      } catch {}
      this.client = null;
      this.isConnected = false;
      this.activeSubscriptions.clear();
      this.pendingSubscriptions = [];
    }
  }
}

export const b2bWebSocket = new B2bStompService();

export function initB2bWebSocket(): B2bStompService {
  if (typeof window !== 'undefined') {
    b2bWebSocket.initClient();
  }
  return b2bWebSocket;
}
