/**
 * The graph store: the nodes and edges shown on the canvas, plus the helpers
 * that keep them coherent.
 *
 * `nodes` and `edges` are bound straight into <SvelteFlow>, which mutates them
 * for drags and connections. We add structure (drops, deletions) and classify
 * edges into the two wire kinds the rest of the app cares about.
 */

import type { Edge, Node, Connection, IsValidConnection } from "@xyflow/svelte";
import { dropRuntime } from "./runtime";
import { SOURCE_SPEC, specFor, type NodeSpec } from "./specs";
import { getNodeDefinition, NODE_DATA_VERSION } from "../nodes/registry";

export interface NodeData extends Record<string, unknown> {
  /** The spec key: "source" | "rollingAvg" | "drone" | "lowpass" | … */
  specType: string;
  /** Schema guard for future graph migration support. */
  dataVersion: number;
  params: Record<string, number>;
  /** Set on source nodes: which gateway channel they read. */
  channelId?: string;
  /** Display title (source nodes show the channel name). */
  title: string;
}

export type AppNode = Node<NodeData>;
export type AppEdge = Edge;

export type WireKind = "signal" | "audio";

/**
 * The two wire kinds are read straight off the target handle id:
 *   "audio-in"            → audio
 *   "signal-in"           → signal (transform input)
 *   "param:<key>"         → signal (modulating a parameter)
 */
export function edgeKind(edge: Pick<Edge, "targetHandle">): WireKind {
  return edge.targetHandle === "audio-in" ? "audio" : "signal";
}

let counter = 0;
function nextId(prefix: string): string {
  counter += 1;
  return `${prefix}-${counter}`;
}

class Graph {
  nodes = $state<AppNode[]>([]);
  edges = $state<AppEdge[]>([]);

  addSourceNode(channelId: string, position: { x: number; y: number }): void {
    const title = channelId; // "src/chan"
    const def = getNodeDefinition(SOURCE_SPEC.type);
    // Reassign (not push): <SvelteFlow bind:nodes> tracks the array reference,
    // so an in-place mutation wouldn't be reflected on the canvas.
    this.nodes = [
      ...this.nodes,
      {
        id: nextId("src"),
        type: def.componentType,
        position,
        data: def.createData({ title, channelId, params: {}, dataVersion: NODE_DATA_VERSION }),
      },
    ];
  }

  addPaletteNode(type: string, position: { x: number; y: number }): void {
    const def = getNodeDefinition(type);
    this.nodes = [
      ...this.nodes,
      {
        id: nextId(def.type),
        type: def.componentType,
        position,
        data: def.createData({ dataVersion: NODE_DATA_VERSION }),
      },
    ];
  }

  setParam(nodeId: string, key: string, value: number): void {
    const node = this.nodes.find((n) => n.id === nodeId);
    if (node) node.data.params[key] = value;
  }

  /** Is a parameter input currently being driven by a signal edge? */
  isModulated(nodeId: string, key: string): boolean {
    return this.edges.some((e) => e.target === nodeId && e.targetHandle === `param:${key}`);
  }

  /** Clean up runtime state when Svelte Flow deletes nodes. */
  onDelete(deleted: { nodes: AppNode[] }): void {
    for (const n of deleted.nodes) dropRuntime(n.id);
  }
}

export const graph = new Graph();

// --- Connection rules ------------------------------------------------------

/** Tag a new edge by kind so it can be styled (and read cheaply later). */
export function decorateConnection(connection: Connection): Edge {
  const kind = edgeKind(connection);
  return {
    ...connection,
    id: nextId("edge"),
    animated: kind === "signal",
    class: kind === "signal" ? "edge-signal" : "edge-audio",
  } as Edge;
}

/** Only allow signal→signal and audio→audio connections. */
export const isValidConnection: IsValidConnection = (c) => {
  const src = c.sourceHandle ?? "";
  const tgt = c.targetHandle ?? "";
  const sourceIsSignal = src === "signal-out";
  const sourceIsAudio = src === "audio-out";
  const targetIsSignal = tgt === "signal-in" || tgt.startsWith("param:");
  const targetIsAudio = tgt === "audio-in";
  if (sourceIsSignal && targetIsSignal) return true;
  if (sourceIsAudio && targetIsAudio) return true;
  return false;
};

/** A stable signature of the audio topology — changes only when re-sync is needed. */
export function audioTopologySignature(nodes: AppNode[], edges: AppEdge[]): string {
  const audioNodes = nodes
    .filter((n) => {
      const k = specFor(n.data.specType).kind;
      return k === "generator" || k === "filter" || k === "output";
    })
    .map((n) => `${n.id}:${n.data.specType}`)
    .sort();
  const audioEdges = edges
    .filter((e) => edgeKind(e) === "audio")
    .map((e) => `${e.source}>${e.target}`)
    .sort();
  return `${audioNodes.join(",")}|${audioEdges.join(",")}`;
}

export { specFor, type NodeSpec };
