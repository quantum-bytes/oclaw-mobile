import { GatewayClient } from './client';

const MIN_BACKOFF = 1_000;
const MAX_BACKOFF = 30_000;

export class ReconnectManager {
  private backoff = MIN_BACKOFF;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private stopped = false;

  constructor(
    private client: GatewayClient,
    private onReconnected: () => void,
  ) {
    client.events.on('disconnected', () => {
      if (!this.stopped) {
        this.scheduleReconnect();
      }
    });

    client.events.on('connected', () => {
      this.backoff = MIN_BACKOFF;
    });
  }

  private scheduleReconnect() {
    if (this.timer) return;

    const delay = this.backoff + Math.random() * 500;
    this.backoff = Math.min(this.backoff * 2, MAX_BACKOFF);

    this.timer = setTimeout(async () => {
      this.timer = null;
      if (this.stopped) return;

      try {
        this.client.status = 'reconnecting';
        await this.client.connect();
        this.onReconnected();
      } catch {
        // Will trigger disconnected event → retry
      }
    }, delay);
  }

  stop() {
    this.stopped = true;
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }

  reset() {
    this.stopped = false;
    this.backoff = MIN_BACKOFF;
  }
}
