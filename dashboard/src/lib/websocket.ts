import { useRef } from 'react';

// ---- Types ------------------------------------------------------------------

export type DocumentStatus = 'PROCESSING' | 'READY' | 'ERROR';

export type DocumentStatusCallback = (
  documentId: string,
  status: DocumentStatus,
  progress?: number
) => void;

// ---- WebSocketClient --------------------------------------------------------

export class WebSocketClient {
  private readonly serverUrl: string;
  private readonly token: string;
  private callbacks: Map<string, DocumentStatusCallback[]> = new Map();
  private ws: WebSocket | null = null;
  private connected = false;

  constructor(serverUrl: string, token: string) {
    this.serverUrl = serverUrl;
    this.token = token;
  }

  connect(): void {
    if (this.connected) return;
    // Stub: server-side WS endpoint is not yet implemented.
    // Store connection params for future use — the actual connection will be
    // established once the server WS endpoint is ready.
    void this.serverUrl;
    void this.token;
    this.connected = true;
  }

  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.connected = false;
  }

  subscribe(documentId: string, callback: DocumentStatusCallback): void {
    const existing = this.callbacks.get(documentId) ?? [];
    this.callbacks.set(documentId, [...existing, callback]);
  }

  unsubscribe(documentId: string): void {
    this.callbacks.delete(documentId);
  }

  /** Notify all subscribers for a document (used internally and in tests). */
  notify(documentId: string, status: DocumentStatus, progress?: number): void {
    const handlers = this.callbacks.get(documentId) ?? [];
    handlers.forEach((cb) => cb(documentId, status, progress));
  }

  /** Handle an incoming WebSocket message event (called when WS is active). */
  handleMessage(event: MessageEvent<string>): void {
    try {
      const msg = JSON.parse(event.data) as {
        documentId: string;
        status: DocumentStatus;
        progress?: number;
      };
      this.notify(msg.documentId, msg.status, msg.progress);
    } catch {
      // Ignore malformed messages
    }
  }
}

// ---- Singleton hook ---------------------------------------------------------

export function useWebSocket(serverUrl?: string, token?: string) {
  const clientRef = useRef<WebSocketClient | null>(null);

  if (!clientRef.current && serverUrl && token) {
    clientRef.current = new WebSocketClient(serverUrl, token);
    clientRef.current.connect();
  }

  return clientRef.current;
}
