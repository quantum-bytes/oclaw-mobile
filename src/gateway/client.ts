import { v4 as uuid } from 'uuid';
import mitt, { Emitter } from 'mitt';
import type {
  RequestFrame,
  ResponseFrame,
  EventFrame,
  ConnectParams,
  ChallengePayload,
  HelloPayload,
  Frame,
} from './protocol';
import { getDeviceInfo } from './device';
import { Platform } from 'react-native';

const PROTOCOL_VERSION = 3;
const REQUEST_TIMEOUT_MS = 120_000;
const APP_VERSION = '0.1.0';

type EventMap = {
  event: EventFrame;
  connected: void;
  disconnected: { reason: string };
  error: { message: string };
};

interface PendingRequest {
  resolve: (payload: unknown) => void;
  reject: (error: Error) => void;
  timer: ReturnType<typeof setTimeout>;
}

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'reconnecting';

export class GatewayClient {
  private ws: WebSocket | null = null;
  private pending = new Map<string, PendingRequest>();
  private instanceId = uuid();
  private tickInterval = 30_000;
  private lastTick = 0;
  private tickWatchdog: ReturnType<typeof setInterval> | null = null;

  readonly events: Emitter<EventMap> = mitt<EventMap>();
  status: ConnectionStatus = 'disconnected';

  constructor(
    private host: string,
    private port: number,
    private token: string,
    private secure: boolean = false,
  ) {}

  async connect(): Promise<HelloPayload> {
    this.status = 'connecting';
    const scheme = this.secure ? 'wss' : 'ws';
    const url = `${scheme}://${this.host}:${this.port}`;

    return new Promise((resolve, reject) => {
      let settled = false;
      const ws = new WebSocket(url);
      this.ws = ws;

      const timeout = setTimeout(() => {
        if (!settled) {
          settled = true;
          ws.close();
          reject(new Error('Connection timeout'));
        }
      }, 15_000);

      ws.onerror = () => {
        clearTimeout(timeout);
        if (!settled) {
          settled = true;
          reject(new Error('WebSocket error'));
        }
        this.handleClose('connection error');
      };

      ws.onclose = () => {
        clearTimeout(timeout);
        if (!settled) {
          settled = true;
          reject(new Error('Connection closed during handshake'));
        }
        this.handleClose('connection closed');
      };

      // All messages — including during handshake — go through dispatchFrame.
      // The challenge is detected here; res frames are always routed to pending.
      ws.onmessage = (e) => {
        const frame = this.parseFrame(e);
        if (!frame) return;

        // Always dispatch res frames so request() can resolve
        if (frame.type === 'res') {
          this.dispatchResponse(frame as ResponseFrame);
          return;
        }

        if (frame.type === 'event') {
          const evt = frame as EventFrame;

          // During handshake, intercept challenge
          if (this.status === 'connecting' && evt.event === 'connect.challenge') {
            const challenge = evt.payload as ChallengePayload;
            this.performHandshake(challenge.nonce)
              .then((hello) => {
                clearTimeout(timeout);
                if (!settled) {
                  settled = true;
                  this.status = 'connected';
                  this.lastTick = Date.now();
                  this.startTickWatchdog();
                  this.events.emit('connected');
                  resolve(hello);
                }
              })
              .catch((err) => {
                clearTimeout(timeout);
                ws.close();
                if (!settled) {
                  settled = true;
                  reject(err instanceof Error ? err : new Error(String(err)));
                }
              });
            return;
          }

          // Handle tick events
          if (evt.event === 'tick') {
            this.lastTick = Date.now();
            return;
          }

          // Forward other events
          this.events.emit('event', evt);
        }
      };
    });
  }

  private async performHandshake(nonce: string): Promise<HelloPayload> {
    const device = await getDeviceInfo(nonce, this.token);

    const params: ConnectParams = {
      minProtocol: PROTOCOL_VERSION,
      maxProtocol: PROTOCOL_VERSION,
      client: {
        id: 'mobile',
        version: APP_VERSION,
        platform: Platform.OS,
        mode: 'mobile',
        instanceId: this.instanceId,
      },
      caps: [],
      auth: { token: this.token },
      device: device ?? undefined,
      role: 'operator',
      scopes: ['operator.admin', 'operator.read', 'operator.write'],
    };

    const res = await this.request<HelloPayload>('connect', params);

    // Validate hello-ok
    if (res.type !== 'hello-ok') {
      throw new Error(`Expected hello-ok, got ${res.type ?? 'unknown'}`);
    }
    if (res.protocol !== PROTOCOL_VERSION) {
      throw new Error(`Protocol mismatch: expected ${PROTOCOL_VERSION}, got ${res.protocol}`);
    }

    if (res.policy?.tickIntervalMs) {
      this.tickInterval = res.policy.tickIntervalMs;
    }

    return res;
  }

  async request<T = unknown>(method: string, params?: unknown): Promise<T> {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error('Not connected');
    }

    const id = uuid();
    const frame: RequestFrame = { type: 'req', id, method, params };

    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`Request ${method} timed out`));
      }, REQUEST_TIMEOUT_MS);

      this.pending.set(id, {
        resolve: resolve as (v: unknown) => void,
        reject,
        timer,
      });

      this.ws!.send(JSON.stringify(frame));
    });
  }

  private parseFrame(e: MessageEvent): Frame | null {
    try {
      return JSON.parse(typeof e.data === 'string' ? e.data : '');
    } catch {
      return null;
    }
  }

  private dispatchResponse(res: ResponseFrame) {
    const pending = this.pending.get(res.id);
    if (pending) {
      this.pending.delete(res.id);
      clearTimeout(pending.timer);
      if (res.ok) {
        pending.resolve(res.payload);
      } else {
        pending.reject(new Error(res.error?.message ?? 'Request failed'));
      }
    }
  }

  private handleClose(reason: string) {
    this.stopTickWatchdog();

    // Reject all pending requests
    for (const [, pending] of this.pending) {
      clearTimeout(pending.timer);
      pending.reject(new Error(`Disconnected: ${reason}`));
    }
    this.pending.clear();

    if (this.status !== 'disconnected') {
      this.status = 'disconnected';
      this.events.emit('disconnected', { reason });
    }
  }

  private startTickWatchdog() {
    this.stopTickWatchdog();
    this.tickWatchdog = setInterval(() => {
      const elapsed = Date.now() - this.lastTick;
      if (elapsed > this.tickInterval * 2) {
        this.ws?.close();
      }
    }, this.tickInterval);
  }

  private stopTickWatchdog() {
    if (this.tickWatchdog) {
      clearInterval(this.tickWatchdog);
      this.tickWatchdog = null;
    }
  }

  disconnect() {
    this.status = 'disconnected';
    this.stopTickWatchdog();
    if (this.ws) {
      this.ws.onclose = null;
      this.ws.close();
      this.ws = null;
    }
    for (const [, pending] of this.pending) {
      clearTimeout(pending.timer);
      pending.reject(new Error('Client disconnected'));
    }
    this.pending.clear();
  }

  get connected(): boolean {
    return this.status === 'connected' && this.ws?.readyState === WebSocket.OPEN;
  }
}
