import type { AppNode, AppEdge } from "./graph.svelte";

export interface GraphSnapshot {
  nodes: AppNode[];
  edges: AppEdge[];
  timestamp: number;
}

export function serializeGraph(nodes: AppNode[], edges: AppEdge[]): string {
  const snapshot: GraphSnapshot = {
    nodes,
    edges,
    timestamp: Date.now(),
  };
  return JSON.stringify(snapshot, null, 2);
}

export function deserializeGraph(json: string): GraphSnapshot {
  return JSON.parse(json);
}

export function downloadGraph(nodes: AppNode[], edges: AppEdge[], filename?: string): void {
  const json = serializeGraph(nodes, edges);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename || `playboard-${Date.now()}.json`;
  link.click();
  URL.revokeObjectURL(url);
}

export function uploadGraph(): Promise<GraphSnapshot> {
  return new Promise((resolve, reject) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) {
        reject(new Error("No file selected"));
        return;
      }
      try {
        const text = await file.text();
        const snapshot = deserializeGraph(text);
        resolve(snapshot);
      } catch (err) {
        reject(new Error(`Failed to parse graph file: ${err}`));
      }
    };
    input.onerror = () => reject(new Error("Failed to read file"));
    input.click();
  });
}
