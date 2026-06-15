import { specFor, type NodeSpec } from "../../graph/specs";
import type { NodeData } from "../../graph/graph.svelte";

export function asNodeData(data: unknown): NodeData {
  return data as NodeData;
}

export function nodeSpec(data: NodeData): NodeSpec {
  return specFor(data.specType);
}

export function formatParamValue(value: number | undefined, step: number | undefined): string {
  if (value === undefined) return "--";
  return value.toFixed(step && step >= 1 ? 0 : 2);
}
