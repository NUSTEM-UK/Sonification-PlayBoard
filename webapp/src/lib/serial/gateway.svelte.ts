/**
 * The gateway: the app's window onto the micro:bit serial link.
 *
 * Chrome's Web Serial API lets the browser read the USB gateway directly, so
 * there is no Python bridge any more — this store IS the bridge. It parses the
 * `src,chan,val` protocol, tracks every channel it has ever seen, and keeps a
 * live normalised (0..1) value per channel via in-app calibration.
 *
 * A mock mode emits synthetic channels so the whole app runs with no hardware.
 */

import { parseLine, channelId, type ChannelId } from "./protocol";

export type GatewayStatus = "disconnected" | "connecting" | "live" | "mock" | "error";

export interface Channel {
  id: ChannelId;
  src: string;
  chan: string;
  raw: number;
  /** Learned input range; `normalized` is raw mapped onto [calMin, calMax]. */
  calMin: number;
  calMax: number;
  normalized: number;
  lastSeen: number;
}

class Gateway {
  status = $state<GatewayStatus>("disconnected");
  error = $state<string | null>(null);
  channels = $state<Record<ChannelId, Channel>>({});

  // Web Serial plumbing (untyped: Web Serial isn't in the DOM lib yet).
  #port: any = null;
  #reader: any = null;
  #keepReading = false;
  #mockTimer: ReturnType<typeof setInterval> | null = null;

  get channelList(): Channel[] {
    return Object.values(this.channels).sort((a, b) => a.id.localeCompare(b.id));
  }

  /** Is the channel producing data in the last ~2s? */
  isLive(id: ChannelId): boolean {
    const c = this.channels[id];
    return !!c && performance.now() - c.lastSeen < 2000;
  }

  /** Forget a channel's learned range and relearn from here (the "wiggle"). */
  recalibrate(id: ChannelId): void {
    const c = this.channels[id];
    if (!c) return;
    c.calMin = c.raw;
    c.calMax = c.raw;
    c.normalized = 0.5;
  }

  #ingest(line: string): void {
    const r = parseLine(line);
    if (!r) return;
    const id = channelId(r.src, r.chan);
    const now = performance.now();
    const existing = this.channels[id];
    if (!existing) {
      this.channels[id] = {
        id,
        src: r.src,
        chan: r.chan,
        raw: r.val,
        calMin: r.val,
        calMax: r.val,
        normalized: 0.5,
        lastSeen: now,
      };
      return;
    }
    existing.raw = r.val;
    existing.lastSeen = now;
    // Auto-expanding range: the channel calibrates itself as values arrive.
    // "Recalibrate" resets this so a stray spike doesn't widen it forever.
    if (r.val < existing.calMin) existing.calMin = r.val;
    if (r.val > existing.calMax) existing.calMax = r.val;
    const span = existing.calMax - existing.calMin;
    existing.normalized = span > 1e-9 ? (r.val - existing.calMin) / span : 0.5;
  }

  // --- Real hardware over Web Serial ----------------------------------------

  async connectSerial(): Promise<void> {
    const serial = (navigator as any).serial;
    if (!serial) {
      this.error = "Web Serial isn't available. Use Chrome over https or localhost.";
      this.status = "error";
      return;
    }
    try {
      this.stopMock();
      this.status = "connecting";
      this.error = null;
      this.#port = await serial.requestPort();
      await this.#port.open({ baudRate: 115200 });
      this.status = "live";
      this.#keepReading = true;
      this.#readLoop();
    } catch (e) {
      this.error = e instanceof Error ? e.message : String(e);
      this.status = "error";
    }
  }

  async #readLoop(): Promise<void> {
    const decoder = new TextDecoderStream();
    this.#port.readable.pipeTo(decoder.writable).catch(() => {});
    this.#reader = decoder.readable.getReader();
    let buffer = "";
    try {
      while (this.#keepReading) {
        const { value, done } = await this.#reader.read();
        if (done) break;
        buffer += value;
        let nl: number;
        while ((nl = buffer.indexOf("\n")) >= 0) {
          this.#ingest(buffer.slice(0, nl));
          buffer = buffer.slice(nl + 1);
        }
      }
    } catch (e) {
      this.error = e instanceof Error ? e.message : String(e);
      this.status = "error";
    }
  }

  async disconnect(): Promise<void> {
    this.#keepReading = false;
    this.stopMock();
    try {
      await this.#reader?.cancel();
    } catch {
      /* ignore */
    }
    try {
      await this.#port?.close();
    } catch {
      /* ignore */
    }
    this.#reader = null;
    this.#port = null;
    if (this.status !== "error") this.status = "disconnected";
  }

  // --- Mock mode: synthetic sensors so it works with no hardware -------------

  startMock(): void {
    this.stopMock();
    this.#keepReading = false;
    this.status = "mock";
    this.error = null;
    let t = 0;
    this.#mockTimer = setInterval(() => {
      t += 0.1;
      // Emit the same protocol lines a real gateway would, raw ranges and all.
      const light = Math.round(128 + 110 * Math.sin(t * 0.7)); // 0..255-ish
      const accelX = Math.round(700 * Math.sin(t * 0.31) + 200 * Math.sin(t * 1.3)); // ~-1024..1024
      const pot = Math.round(512 + 480 * Math.sin(t * 0.17)); // 0..1023 slow ramp-ish
      const flex = Math.round(500 + 400 * (Math.sin(t * 0.9) * 0.5 + 0.5) * Math.sin(t * 0.05));
      this.#ingest(`1,light,${light}`);
      this.#ingest(`1,accel_x,${accelX}`);
      this.#ingest(`2,pot,${pot}`);
      this.#ingest(`2,flex,${flex}`);
    }, 100);
  }

  stopMock(): void {
    if (this.#mockTimer !== null) {
      clearInterval(this.#mockTimer);
      this.#mockTimer = null;
    }
  }
}

export const gateway = new Gateway();
