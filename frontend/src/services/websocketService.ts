/**
 * Dịch vụ WebSocket STOMP Native Client cho hệ thống B2B
 * Kết nối trực tiếp tới Spring Boot STOMP Message Broker (/ws-b2b)
 * Không phụ thuộc vào thư viện bên ngoài, nhẹ và tối ưu RAM.
 */

export interface StompMessage {
  command: string;
  headers: Record<string, string>;
  body: string;
}

type MessageCallback = (payload: any, rawMessage: StompMessage) => void;
type ConnectionCallback = (connected: boolean) => void;

class B2bWebSocketService {
  private socket: WebSocket | null = null;
  private isWsConnected: boolean = false;
  private reconnectTimer: any = null;
  private heartbeatTimer: any = null;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 20;
  private subCounter: number = 0;

  // Map destination -> Map of subscriptionId -> callback
  private subscriptions: Map<string, Map<string, MessageCallback>> = new Map();
  // Map subscriptionId -> destination
  private subIdToDestination: Map<string, string> = new Map();
  // Connection state listeners
  private connectionListeners: Set<ConnectionCallback> = new Set();

  private getWebSocketUrl(): string {
    if (typeof window === 'undefined') return '';
    const envUrl = process.env.NEXT_PUBLIC_WS_URL;
    if (envUrl) {
      return envUrl.replace(/^http/, 'ws');
    }
    const host = window.location.hostname || 'localhost';
    return `ws://${host}:8080/api/v1/ws-b2b`;
  }

  public connect(): void {
    if (typeof window === 'undefined') return;
    if (this.socket && (this.socket.readyState === WebSocket.CONNECTING || this.socket.readyState === WebSocket.OPEN)) {
      return;
    }

    const wsUrl = this.getWebSocketUrl();
    if (!wsUrl) return;

    try {
      this.socket = new WebSocket(wsUrl);

      this.socket.onopen = () => {
        // Gửi khung STOMP CONNECT
        this.sendFrame('CONNECT', {
          'accept-version': '1.1,1.2',
          'heart-beat': '10000,10000',
        });
      };

      this.socket.onmessage = (event: MessageEvent) => {
        this.handleMessage(event.data);
      };

      this.socket.onerror = () => {
        // Bắt lỗi kết nối socket trong im lặng để không spam console
      };

      this.socket.onclose = () => {
        this.setConnected(false);
        this.stopHeartbeat();
        this.scheduleReconnect();
      };
    } catch {
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) return;
    const delay = Math.min(1000 * Math.pow(1.5, this.reconnectAttempts), 15000);
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.reconnectAttempts++;
      if (this.reconnectAttempts <= this.maxReconnectAttempts) {
        this.connect();
      }
    }, delay);
  }

  private startHeartbeat(): void {
    this.stopHeartbeat();
    this.heartbeatTimer = setInterval(() => {
      if (this.socket && this.socket.readyState === WebSocket.OPEN && this.isWsConnected) {
        // Gửi STOMP ping newline
        this.socket.send('\n');
      }
    }, 10000);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  private setConnected(connected: boolean): void {
    const changed = this.isWsConnected !== connected;
    this.isWsConnected = connected;
    if (connected) {
      this.reconnectAttempts = 0;
      this.resubscribeAll();
      this.startHeartbeat();
    }
    if (changed) {
      this.connectionListeners.forEach((cb) => {
        try {
          cb(connected);
        } catch {}
      });
    }
  }

  private sendFrame(command: string, headers: Record<string, string>, body: string = ''): void {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) return;
    let frame = `${command}\n`;
    for (const [k, v] of Object.entries(headers)) {
      frame += `${k}:${v}\n`;
    }
    frame += `\n${body}\x00`;
    this.socket.send(frame);
  }

  private handleMessage(data: string): void {
    if (!data) return;
    // Bỏ qua heartbeat newline
    if (data === '\n' || data === '\r\n') return;

    // Parse các STOMP frames
    const rawFrames = data.split('\x00');
    for (const raw of rawFrames) {
      const trimmed = raw.trim();
      if (!trimmed) continue;

      const headerEnd = trimmed.indexOf('\n\n');
      const headerEndCrLf = trimmed.indexOf('\r\n\r\n');
      const delimiterIndex = headerEnd !== -1 ? headerEnd : headerEndCrLf;
      const delimiterLength = headerEnd !== -1 ? 2 : 4;

      if (delimiterIndex === -1) {
        // Frame chỉ có header hoặc pong
        if (trimmed.startsWith('CONNECTED')) {
          this.setConnected(true);
        }
        continue;
      }

      const headerPart = trimmed.slice(0, delimiterIndex);
      const bodyPart = trimmed.slice(delimiterIndex + delimiterLength);

      const headerLines = headerPart.split(/\r?\n/);
      const command = headerLines[0]?.trim();
      const headers: Record<string, string> = {};

      for (let i = 1; i < headerLines.length; i++) {
        const line = headerLines[i];
        const colonIdx = line.indexOf(':');
        if (colonIdx !== -1) {
          const key = line.slice(0, colonIdx).trim();
          const val = line.slice(colonIdx + 1).trim();
          headers[key] = val;
        }
      }

      if (command === 'CONNECTED') {
        this.setConnected(true);
      } else if (command === 'MESSAGE') {
        const destination = headers['destination'];
        let parsedBody: any = null;
        try {
          parsedBody = JSON.parse(bodyPart);
        } catch {
          parsedBody = bodyPart;
        }

        const stompMsg: StompMessage = { command, headers, body: bodyPart };

        // 1. Gửi callback cho các subscriber khớp chính xác destination
        if (destination && this.subscriptions.has(destination)) {
          const subMap = this.subscriptions.get(destination)!;
          subMap.forEach((callback) => {
            try {
              callback(parsedBody, stompMsg);
            } catch (err) {
              console.error('Lỗi khi xử lý tin nhắn STOMP:', err);
            }
          });
        }

        // 2. Tự động bắn Window CustomEvent để toàn bộ portal lắng nghe
        this.dispatchGlobalEvent(destination, parsedBody);
      }
    }
  }

  private dispatchGlobalEvent(destination: string, payload: any): void {
    if (typeof window === 'undefined') return;
    try {
      window.dispatchEvent(
        new CustomEvent('b2b_ws_message', {
          detail: { destination, payload, timestamp: Date.now() },
        })
      );

      // Định tuyến sự kiện theo topic
      if (destination.includes('/topic/lots')) {
        window.dispatchEvent(new CustomEvent('b2b_lot_updated', { detail: payload }));
        window.dispatchEvent(new CustomEvent('b2b_sync_event', { detail: { type: 'LOT_UPDATED', payload } }));
      } else if (destination.includes('/topic/rfqs')) {
        window.dispatchEvent(new CustomEvent('b2b_rfq_updated', { detail: payload }));
        window.dispatchEvent(new CustomEvent('b2b_sync_event', { detail: { type: 'RFQ_UPDATED', payload } }));
      } else if (destination.includes('/topic/contracts')) {
        window.dispatchEvent(new CustomEvent('b2b_contract_updated', { detail: payload }));
        window.dispatchEvent(new CustomEvent('b2b_sync_event', { detail: { type: 'CONTRACT_UPDATED', payload } }));
      }
    } catch {}
  }

  private resubscribeAll(): void {
    this.subscriptions.forEach((subMap, destination) => {
      subMap.forEach((_, subId) => {
        this.sendFrame('SUBSCRIBE', {
          id: subId,
          destination,
          ack: 'auto',
        });
      });
    });
  }

  public subscribe(destination: string, callback: MessageCallback): () => void {
    const subId = `sub-${++this.subCounter}`;

    if (!this.subscriptions.has(destination)) {
      this.subscriptions.set(destination, new Map());
    }
    this.subscriptions.get(destination)!.set(subId, callback);
    this.subIdToDestination.set(subId, destination);

    if (this.isWsConnected) {
      this.sendFrame('SUBSCRIBE', {
        id: subId,
        destination,
        ack: 'auto',
      });
    } else {
      this.connect();
    }

    return () => {
      const dest = this.subIdToDestination.get(subId);
      if (dest && this.subscriptions.has(dest)) {
        this.subscriptions.get(dest)!.delete(subId);
        if (this.subscriptions.get(dest)!.size === 0) {
          this.subscriptions.delete(dest);
        }
      }
      this.subIdToDestination.delete(subId);

      if (this.isWsConnected) {
        this.sendFrame('UNSUBSCRIBE', { id: subId });
      }
    };
  }

  public onConnectionChange(callback: ConnectionCallback): () => void {
    this.connectionListeners.add(callback);
    callback(this.isWsConnected);
    return () => {
      this.connectionListeners.delete(callback);
    };
  }

  public isConnected(): boolean {
    return this.isWsConnected;
  }
}

// Singleton Instance
export const b2bWebSocket = new B2bWebSocketService();

/**
 * Tự động khởi tạo kết nối STOMP WebSocket và đăng ký các kênh broadcast chính
 */
export function initB2bWebSocket(): () => void {
  if (typeof window === 'undefined') return () => {};

  b2bWebSocket.connect();

  // Đăng ký các topic mặc định của B2B
  const unsubLots = b2bWebSocket.subscribe('/topic/lots', () => {});
  const unsubRfqs = b2bWebSocket.subscribe('/topic/rfqs', () => {});
  const unsubContracts = b2bWebSocket.subscribe('/topic/contracts', () => {});

  return () => {
    unsubLots();
    unsubRfqs();
    unsubContracts();
  };
}
