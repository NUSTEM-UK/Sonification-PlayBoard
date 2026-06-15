/**
 * The signal tick: ~30 times a second, push live data through the graph.
 *
 *   1. Source nodes read their gateway channel's normalised value.
 *   2. Transform nodes recompute from their upstream signal (rolling average,
 *      rate of change, …), in dependency order, and store their own value +
 *      sparkline history.
 *   3. Every signal edge landing on a parameter input modulates that parameter
 *      on the audio engine, mapped from 0..1 into the parameter's real range.
 *
 * Audio-rate work lives in Tone.js; this loop only nudges control values, so a
 * modest rate is plenty and keeps the UI cheap.
 */

import { gateway } from "../serial/gateway.svelte";
import { audioEngine } from "../audio/engine";
import { graph, edgeKind } from "./graph.svelte";
import type { AppNode } from "./graph.svelte";
import { specFor, type ParamSpec } from "./specs";
import { getNodeDefinition } from "../nodes/registry";
import { getRuntime, setValue } from "./runtime";
import { datasetStore } from "../sources/datasets.svelte";
import { playback } from "../sources/playback.svelte";

const TICK_MS = 33;
const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);

interface RecordedState {
  index: number;
}

interface TransformState {
  state: unknown;
}
const tStates = new Map<string, TransformState>();
const recordedStates = new Map<string, RecordedState>();

function transformState(id: string): TransformState {
  let s = tStates.get(id);
  if (!s) {
    s = { state: undefined };
    tStates.set(id, s);
  }
  return s;
}

function recordedState(id: string): RecordedState {
  let s = recordedStates.get(id);
  if (!s) {
    s = { index: -1 };
    recordedStates.set(id, s);
  }
  return s;
}

function applyTransform(node: AppNode, input: number): number {
  const def = getNodeDefinition(node.data.specType);
  if (!def.processSignal) return input;
  const store = transformState(node.id);
  return def.processSignal(input, node.data.params, {
    clamp01,
    getState<T>(init: () => T): T {
      if (store.state === undefined) store.state = init();
      return store.state as T;
    },
  });
}

/** Map a 0..1 signal onto a parameter's real range (log-aware). */
function mapParam(p: ParamSpec, signal: number): number {
  const s = clamp01(signal);
  if (p.log && p.min > 0) {
    return p.min * Math.pow(p.max / p.min, s);
  }
  return p.min + s * (p.max - p.min);
}

let timer: ReturnType<typeof setInterval> | null = null;

function evaluate(): void {
  const nodes = graph.nodes;
  const edges = graph.edges;

  // Advance each recorded dataset once per tick (all columns move together).
  const seenDatasets = new Set<string>();
  for (const node of nodes) {
    if (node.data.specType !== "recordedSource") continue;
    const did = node.data.datasetId as string | undefined;
    if (did && !seenDatasets.has(did)) {
      seenDatasets.add(did);
      const ds = datasetStore.get(did);
      if (ds) playback.advance(did, ds.rowCount);
    }
  }

  // Stale transform states cleanup
  const liveNodeIds = new Set(nodes.map((n) => n.id));
  for (const id of tStates.keys()) {
    if (!liveNodeIds.has(id)) tStates.delete(id);
  }
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const computed = new Set<string>();

  function valueOf(id: string): number {
    if (computed.has(id)) return getRuntime(id).value;
    const node = byId.get(id);
    if (!node) return 0;
    const kind = specFor(node.data.specType).kind;
    if (kind === "source") {
      if (node.data.specType === "recordedSource") {
    const liveNodeIds = new Set(nodes.map((n) => n.id));
    for (const id of recordedStates.keys()) {
      if (!liveNodeIds.has(id)) recordedStates.delete(id);
    }
        const did = node.data.datasetId as string | undefined;
        const ck  = node.data.columnKey  as string | undefined;
        const pb  = did ? playback.get(did) : null;
        const v   = did && ck && pb !== null
          ? datasetStore.getNormalized(did, ck, pb.position)
          : 0;
        computed.add(id);
        setValue(id, v);
        return v;
      }
      const ch = node.data.channelId ? gateway.channels[node.data.channelId] : undefined;
      const v = ch ? ch.normalized : 0;
      computed.add(id);
      setValue(id, v);
      return v;
    }
    if (kind === "transform") {
      computed.add(id); // guards against cycles (falls back to last value)
      const inEdge = edges.find((e) => e.target === id && e.targetHandle === "signal-in");
      const input = inEdge ? valueOf(inEdge.source) : 0;
      const out = applyTransform(node, input);
      setValue(id, out);
      return out;
    }
    return 0; // audio nodes have no signal output
  }

  // Compute every signal-producing node so sparklines stay live even unwired.
  for (const node of nodes) {
    const kind = specFor(node.data.specType).kind;
    if (kind === "source" || kind === "transform") valueOf(node.id);
  }

  // Drive parameter modulation from signal→param edges.
  for (const edge of edges) {
    if (edgeKind(edge) !== "signal") continue;
    const handle = edge.targetHandle ?? "";
    if (!handle.startsWith("param:")) continue;
    const key = handle.slice("param:".length);
    const target = byId.get(edge.target);
    if (!target) continue;
    const pspec = specFor(target.data.specType).params.find((pp) => pp.key === key);
    if (!pspec) continue;
    const value = mapParam(pspec, valueOf(edge.source));
    audioEngine.setParam(edge.target, key, value);
  }
}

export function startTick(): void {
  if (timer !== null) return;
  timer = setInterval(evaluate, TICK_MS);
}

export function stopTick(): void {
  if (timer !== null) {
    clearInterval(timer);
    timer = null;
  }
}
