/**
 * Per-node live state, updated by the tick loop tens of times a second.
 *
 * Kept OUTSIDE Svelte reactivity on purpose: only the graph's *structure*
 * (nodes, edges, parameter settings) needs to be reactive. Live values flow
 * through here and are read imperatively by sparklines and value read-outs on
 * their own animation frame — see Sparkline.svelte.
 */

import { Ring } from "../util/ring";

const SPARK_SAMPLES = 160;

export interface NodeRuntime {
  /** Latest output value of the node (signals are 0..1). */
  value: number;
  history: Ring;
}

const runtimes = new Map<string, NodeRuntime>();

/**
 * Runtime id for one output of a multi-output node. A recorded source exposes
 * one signal per CSV column, each tracked (and sparkline'd) under its own id.
 * Single-output nodes just use the bare node id.
 */
export function outputId(nodeId: string, channel: string): string {
  return `${nodeId}::${channel}`;
}

export function getRuntime(id: string): NodeRuntime {
  let r = runtimes.get(id);
  if (!r) {
    r = { value: 0, history: new Ring(SPARK_SAMPLES) };
    runtimes.set(id, r);
  }
  return r;
}

export function setValue(id: string, value: number): void {
  const r = getRuntime(id);
  r.value = value;
  r.history.push(value);
}

export function dropRuntime(id: string): void {
  runtimes.delete(id);
}
