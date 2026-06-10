/**
 * The PlayBoard wire protocol — unchanged from the original project:
 *
 *     src,chan,val
 *
 * Newline-delimited ASCII over USB serial. `src`/`chan` identify the device and
 * channel; `val` is the raw sensor reading (units are the device's own). Lines
 * starting with `#` are comments / heartbeats. See ../../../docs/PROTOCOL.md.
 *
 * Sources stay dumb: they emit raw numbers and ALL meaning (normalisation,
 * scaling, what-controls-what) lives in this web app.
 */

export interface Reading {
  src: string;
  chan: string;
  val: number;
}

/** A channel's stable identity across the app: `${src}/${chan}`. */
export type ChannelId = string;

export function channelId(src: string, chan: string): ChannelId {
  return `${src}/${chan}`;
}

const LINE = /^([A-Za-z0-9_]+)\s*,\s*([A-Za-z0-9_]+)\s*,\s*(-?\d+(?:\.\d+)?)\s*$/;

/**
 * Parse one line into a Reading, or `null` for comments / blanks / malformed
 * input (callers ignore nulls, matching the original bridge's tolerance).
 */
export function parseLine(line: string): Reading | null {
  const trimmed = line.trim();
  if (trimmed === "" || trimmed.startsWith("#")) return null;
  const m = LINE.exec(trimmed);
  if (!m) return null;
  return { src: m[1], chan: m[2], val: Number(m[3]) };
}
