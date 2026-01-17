import { LOCAL_STORAGE_KEYS } from "@/lib/constants";
import { CHAT_API_BASE_URL } from "@/api/constants";

/** WebSocket message types matching the backend */
export type WebSocketMessage =
  | {
      event_type: "new_items";
      conversation_id: string;
      items: unknown[];
    }
  | {
      event_type: "response_created";
      conversation_id: string;
      response_id?: string;
    }
  | {
      event_type: "typing";
      conversation_id: string;
      user_id: string;
      user_name?: string;
    }
  | {
      event_type: "ping";
    }
  | {
      event_type: "pong";
    };

export type WebSocketEventHandler = (message: WebSocketMessage) => void;

/** Connection state */
export type ConnectionState = "connecting" | "connected" | "disconnected" | "error";

/** Options for the WebSocket client */
export interface ConversationWebSocketOptions {
  /** Called when a message is received */
  onMessage?: WebSocketEventHandler;
  /** Called when connection state changes */
  onStateChange?: (state: ConnectionState) => void;
  /** Max reconnection attempts (default: 5) */
  maxReconnectAttempts?: number;
  /** Base reconnection delay in ms (default: 1000) */
  reconnectDelay?: number;
}

/**
 * WebSocket client for real-time conversation updates.
 *
 * Usage:
 * ```ts
 * const ws = new ConversationWebSocket({
 *   onMessage: (msg) => console.log("Received:", msg),
 *   onStateChange: (state) => console.log("State:", state),
 * });
 *
 * // Connect to a conversation
 * ws.connect("conv-123");
 *
 * // Later, disconnect
 * ws.disconnect();
 * ```
 */
export class ConversationWebSocket {
  private ws: WebSocket | null = null;
  private conversationId: string | null = null;
  private reconnectAttempts = 0;
  private reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
  private pingInterval: ReturnType<typeof setInterval> | null = null;
  private options: Required<ConversationWebSocketOptions>;
  private intentionalClose = false;

  constructor(options: ConversationWebSocketOptions = {}) {
    this.options = {
      onMessage: options.onMessage ?? (() => {}),
      onStateChange: options.onStateChange ?? (() => {}),
      maxReconnectAttempts: options.maxReconnectAttempts ?? 5,
      reconnectDelay: options.reconnectDelay ?? 1000,
    };
  }

  /**
   * Connect to a conversation's WebSocket channel
   */
  connect(conversationId: string): void {
    // Don't reconnect if already connected to the same conversation
    if (
      this.ws &&
      this.conversationId === conversationId &&
      (this.ws.readyState === WebSocket.CONNECTING || this.ws.readyState === WebSocket.OPEN)
    ) {
      return;
    }

    // Close existing connection if connecting to a different conversation
    if (this.ws) {
      this.disconnect();
    }

    this.conversationId = conversationId;
    this.intentionalClose = false;
    this.reconnectAttempts = 0;

    this.doConnect();
  }

  /**
   * Disconnect from the WebSocket
   */
  disconnect(): void {
    this.intentionalClose = true;
    this.cleanup();
    this.conversationId = null;
  }

  /**
   * Check if currently connected
   */
  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  /**
   * Get current conversation ID
   */
  getConversationId(): string | null {
    return this.conversationId;
  }

  private doConnect(): void {
    if (!this.conversationId) return;

    const token = localStorage.getItem(LOCAL_STORAGE_KEYS.TOKEN);
    if (!token) {
      console.warn("WebSocket: No auth token available");
      this.options.onStateChange("error");
      return;
    }

    // Convert HTTP URL to WebSocket URL
    const wsUrl = this.buildWebSocketUrl(this.conversationId, token);

    this.options.onStateChange("connecting");

    try {
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        console.debug(`WebSocket connected: conversation_id=${this.conversationId}`);
        this.reconnectAttempts = 0;
        this.options.onStateChange("connected");
        this.startPingInterval();
      };

      this.ws.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          this.options.onMessage(message);
        } catch (e) {
          console.warn("WebSocket: Failed to parse message:", e);
        }
      };

      this.ws.onerror = (error) => {
        console.warn("WebSocket error:", error);
        this.options.onStateChange("error");
      };

      this.ws.onclose = (event) => {
        console.debug(`WebSocket closed: code=${event.code}, reason=${event.reason}`);
        this.stopPingInterval();

        if (!this.intentionalClose && this.conversationId) {
          this.options.onStateChange("disconnected");
          this.scheduleReconnect();
        }
      };
    } catch (e) {
      console.error("WebSocket: Failed to create connection:", e);
      this.options.onStateChange("error");
    }
  }

  private buildWebSocketUrl(conversationId: string, token: string): string {
    // Convert https:// to wss:// or http:// to ws://
    const wsBase = CHAT_API_BASE_URL.replace(/^http/, "ws");

    // Build the full URL with auth token in query param (since WebSocket doesn't support headers well)
    // The backend should support token as a query parameter as fallback
    return `${wsBase}/v1/ws/conversations/${conversationId}?token=${encodeURIComponent(token)}`;
  }

  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.options.maxReconnectAttempts) {
      console.warn("WebSocket: Max reconnection attempts reached");
      return;
    }

    // Exponential backoff with jitter
    const delay =
      this.options.reconnectDelay * 2 ** this.reconnectAttempts +
      Math.random() * 1000;

    this.reconnectAttempts++;

    console.debug(
      `WebSocket: Scheduling reconnect in ${Math.round(delay)}ms (attempt ${this.reconnectAttempts}/${this.options.maxReconnectAttempts})`
    );

    this.reconnectTimeout = setTimeout(() => {
      this.doConnect();
    }, delay);
  }

  private startPingInterval(): void {
    // Send ping every 30 seconds to keep connection alive
    this.pingInterval = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ event_type: "ping" }));
      }
    }, 30000);
  }

  private stopPingInterval(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  private cleanup(): void {
    this.stopPingInterval();

    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    if (this.ws) {
      // Remove handlers before closing to avoid triggering reconnect
      this.ws.onclose = null;
      this.ws.onerror = null;
      this.ws.onmessage = null;
      this.ws.onopen = null;

      if (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING) {
        this.ws.close();
      }
      this.ws = null;
    }

    this.options.onStateChange("disconnected");
  }
}

/** Singleton instance for app-wide WebSocket connection */
let globalWebSocket: ConversationWebSocket | null = null;

/**
 * Get or create the global WebSocket instance
 */
export function getGlobalWebSocket(options?: ConversationWebSocketOptions): ConversationWebSocket {
  if (!globalWebSocket) {
    globalWebSocket = new ConversationWebSocket(options);
  }
  return globalWebSocket;
}

/**
 * Reset the global WebSocket instance (useful for testing or logout)
 */
export function resetGlobalWebSocket(): void {
  if (globalWebSocket) {
    globalWebSocket.disconnect();
    globalWebSocket = null;
  }
}
