import { ACCENT, type NodeSpec } from "../../graph/nodeSpec";
import { SourceNodeModule } from "../core";

/**
 * Recorded source: plays back an imported CSV dataset.
 *
 * One node represents a whole dataset and exposes every numeric column as its
 * own signal output ("signal-out:<columnKey>"). All series share a single
 * playhead (they are time-aligned rows) driven by a per-node transport —
 * start/stop, loop and playback speed — held in the playback store and wired up
 * by the tick loop. The transport controls and per-series outputs are rendered
 * by SourceNode.svelte (componentType "source").
 */
const spec: NodeSpec = {
  type: "recordedSource",
  kind: "source",
  label: "Recorded source",
  blurb: "An imported CSV dataset: every column becomes a signal output with shared start/stop/loop and speed controls.",
  accent: ACCENT.source,
  hasSignalOut: true,
  params: [],
};

export const NODE_MODULE = new SourceNodeModule(spec, { componentType: "source" });
