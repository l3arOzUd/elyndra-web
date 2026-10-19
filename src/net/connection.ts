import { PROTOCOL_VERSION, type ClientMsg, type ServerMsg } from "./protocol";

/**
 * The WebSocket to elyndra-server: login, ping/RTT, a server clock
 * estimate for interpolation, and byte counters for the debug overlay.
 */
export class Connection {
  private ws: WebSocket | null = null;
  private handlers: ((m: ServerMsg) => void)[] = [];
  private closeHandlers: ((reason: string) => void)[] = [];
  private pingTimer = 0;
  /** server time - local time, smoothed. */
  private offset = 0;
  private offsetReady = false;
  rttMs = 0;
  bytesIn = 0;
  private bytesWindow = 0;
  bytesPerSec = 0;
  private bytesTimer = 0;

  constructor(readonly url: string) {}

  /** job: the job a brand-new character starts as (ignored for existing ones). */
  connect(name: string, job?: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const ws = new WebSocket(this.url);
      this.ws = ws;
      let welcomed = false;
      ws.onopen = () => this.send({ t: "hello", v: PROTOCOL_VERSION, name, job });
      ws.onmessage = (ev) => {
        const text = String(ev.data);
        this.bytesIn += text.length;
        this.bytesWindow += text.length;
        const msg = JSON.parse(text) as ServerMsg;
        if ("time" in msg && typeof msg.time === "number") this.observeTime(msg.time);
        if (msg.t === "pong") this.rttMs = performance.now() - msg.c;
        if (msg.t === "welcome") {
          welcomed = true;
          resolve();
        }
        if (msg.t === "err" && !welcomed) reject(new Error(msg.msg));
        for (const h of this.handlers) h(msg);
      };
      ws.onerror = () => { if (!welcomed) reject(new Error(`cannot reach ${this.url}`)); };
      ws.onclose = (ev) => {
        clearInterval(this.pingTimer);
        clearInterval(this.bytesTimer);
        if (!welcomed) reject(new Error(ev.reason || `connection closed (${ev.code})`));
        for (const h of this.closeHandlers) h(ev.reason || "connection closed");
      };
      this.pingTimer = window.setInterval(() => this.send({ t: "ping", c: performance.now() }), 1000);
      this.bytesTimer = window.setInterval(() => { this.bytesPerSec = this.bytesWindow; this.bytesWindow = 0; }, 1000);
    });
  }

  private observeTime(serverMs: number) {
    const sample = serverMs - performance.now();
    if (!this.offsetReady) { this.offset = sample; this.offsetReady = true; }
    // Messages arrive late, never early: lean towards the largest offset seen.
    else this.offset = sample > this.offset ? this.offset + (sample - this.offset) * 0.5 : this.offset + (sample - this.offset) * 0.02;
  }

  /** Our estimate of the server's clock (ms since epoch). */
  serverNow(): number {
    return performance.now() + this.offset;
  }

  send(msg: ClientMsg) {
    if (this.ws?.readyState === WebSocket.OPEN) this.ws.send(JSON.stringify(msg));
  }

  onMessage(h: (m: ServerMsg) => void) { this.handlers.push(h); }
  onClose(h: (reason: string) => void) { this.closeHandlers.push(h); }
  close() { this.ws?.close(); }
}
