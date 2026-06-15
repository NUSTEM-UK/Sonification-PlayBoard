import { ACCENT, type NodeSpec } from "../../graph/nodeSpec";
import { SourceNodeModule } from "../core";

const spec: NodeSpec = {
  type: "recordedSource",
  kind: "source",
  label: "Recorded source",
  blurb: "A recorded CSV channel from an imported dataset.",
  accent: ACCENT.source,
  hasSignalOut: true,
  params: [],
};

export const NODE_MODULE = new SourceNodeModule(spec, { componentType: "source" });
