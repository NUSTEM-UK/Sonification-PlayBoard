/**
 * The signal tick: ~30 times a second, push live data through the graph.
 *
 *   1. Source nodes read their gateway channel's normalised value. Recorded
 *      sources read the sample under their playhead — one value per CSV column,
 *      each exposed on its own output handle.
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
import { getRuntime, setValue, outputId } from "./runtime";
import { datasetStore, type DatasetColumn, type DatasetRecord } from "../sources/datasets.svelte";
import { playback } from "../sources/playback.svelte";

const TICK_MS = 33;
const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);

interface TransformState {
  state: unknown;
}
const tStates = new Map<string, TransformState>();

function transformState(id: string): TransformState {
  let s = tStates.get(id);
  if (!s) {
    s = { state: undefined };
    tStates.set(id, s);
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

/**
 * Resolve which CSV column a recorded source's output handle refers to.
 * Handles are "signal-out:<columnKey>"; the bare "signal-out" (legacy edges,
 * and the node's own default) maps to the node's columnKey or first column.
 */
function columnForHandle(
  node: AppNode,
  dataset: DatasetRecord,
  handle: string | null | undefined,
): DatasetColumn | undefined {
  if (handle && handle.startsWith("signal-out:")) {
    const key = handle.slice("signal-out:".length);
    return dataset.columns.find((c) => c.key === key);
  }
  const fallback = node.data.columnKey;
  return (fallback && dataset.columns.find((c) => c.key === fallback)) || dataset.columns[0];
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

  // Advance each recorded node's own playhead once per tick.
  for (const node of nodes) {
    if (node.data.specType !== "recordedSource") continue;
    const did = node.data.datasetId as string | undefined;
    const ds = did ? datasetStore.get(did) : undefined;
    if (ds) playback.advance(node.id, ds.rowCount);
  }

  // Stale transform states cleanup
  const liveNodeIds = new Set(nodes.map((n) => n.id));
  for (const id of tStates.keys()) {
    if (!liveNodeIds.has(id)) tStates.delete(id);
  }
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const computed = new Set<string>();

  /**
   * Resolve a source's output to a 0..1 value. `handle` selects the output on
   * multi-output nodes (recorded sources); it is ignored elsewhere. Each
   * resolved value is cached under its runtime id so the sparkline stays live.
   */
  function valueOf(id: string, handle?: string | null): number {
    const node = byId.get(id);
    if (!node) return 0;
    const kind = specFor(node.data.specType).kind;

    if (kind === "source") {
      if (node.data.specType === "recordedSource") {
        const did = node.data.datasetId as string | undefined;
        const ds = did ? datasetStore.get(did) : undefined;
        const col = ds ? columnForHandle(node, ds, handle) : undefined;
        if (!did || !ds || !col) return 0;
        const runtimeId = outputId(id, col.key);
        if (computed.has(runtimeId)) return getRuntime(runtimeId).value;
        const pb = playback.get(id);
        const v = datasetStore.getNormalized(did, col.key, pb ? pb.position : 0);
        computed.add(runtimeId);
        setValue(runtimeId, v);
        return v;
      }
      if (computed.has(id)) return getRuntime(id).value;
      const ch = node.data.channelId ? gateway.channels[node.data.channelId] : undefined;
      const v = ch ? ch.normalized : 0;
      computed.add(id);
      setValue(id, v);
      return v;
    }

    if (kind === "transform") {
      if (computed.has(id)) return getRuntime(id).value;
      computed.add(id); // guards against cycles (falls back to last value)
      const inEdge = edges.find((e) => e.target === id && e.targetHandle === "signal-in");
      const input = inEdge ? valueOf(inEdge.source, inEdge.sourceHandle) : 0;
      const out = applyTransform(node, input);
      setValue(id, out);
      return out;
    }
    return 0; // audio nodes have no signal output
  }

  // Compute every signal-producing output so sparklines stay live even unwired.
  for (const node of nodes) {
    const kind = specFor(node.data.specType).kind;
    if (kind === "transform") {
      valueOf(node.id);
    } else if (kind === "source") {
      if (node.data.specType === "recordedSource") {
        const did = node.data.datasetId as string | undefined;
        const ds = did ? datasetStore.get(did) : undefined;
        if (ds) for (const col of ds.columns) valueOf(node.id, `signal-out:${col.key}`);
      } else {
        valueOf(node.id);
      }
    }
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
    const value = mapParam(pspec, valueOf(edge.source, edge.sourceHandle));
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
