import * as WebSocket from "ws";

interface RealtimeConfig {
  schema: string;
  table: string;
  event: string;
}

export class CustomRealtimeClient {
  private socket: WebSocket | null = null;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private heartbeatInterval: NodeJS.Timeout | null = null;

  constructor(private supabaseUrl: string, private supabaseApiKey: string, private config: RealtimeConfig) {}

  private connect() {
    const socketUrl = `wss://${this.supabaseUrl}/realtime/v1/websocket?apikey=${this.supabaseApiKey}&vsn=1.0.0`;
    this.socket = new WebSocket(socketUrl);

    this.socket.onopen = () => {
      console.log("WebSocket connection opened");
      this.subscribe();
      this.startHeartbeat();
    };

    this.socket.onmessage = (event) => {
      const data = JSON.parse(event.data.toString());
      console.log("Received message:", data);
    };

    this.socket.onclose = (event) => {
      console.log("WebSocket connection closed:", event);
      this.reconnect();
    };

    this.socket.onerror = (error) => {
      console.error("WebSocket error:", error);
    };
  }

  private subscribe() {
    const payload = {
      topic: `realtime:${this.config.schema}-${this.config.table}-changes`,
      event: "phx_join",
      payload: {
        config: {
          broadcast: {
            ack: false,
            self: false,
          },
          presence: {
            key: "",
          },
          postgres_changes: [this.config],
        },
      },
      ref: "1",
      join_ref: "1",
    };

    this.socket?.send(JSON.stringify(payload));
  }

  private startHeartbeat() {
    this.heartbeatInterval = setInterval(() => {
      const heartbeat = {
        topic: "phoenix",
        event: "heartbeat",
        payload: {},
        ref: "2",
      };
      this.socket?.send(JSON.stringify(heartbeat));
    }, 60000); // Send heartbeat every 1 minute
  }

  private reconnect() {
    if (this.reconnectTimeout) return;

    this.reconnectTimeout = setTimeout(() => {
      this.reconnectTimeout = null;
      this.connect();
    }, 5000); // Reconnect after 5 seconds
  }

  public subscribeToChanges() {
    this.connect();
  }
}
