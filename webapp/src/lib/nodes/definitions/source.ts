import { ACCENT, type NodeSpec } from "../../graph/nodeSpec";
import { SourceNodeModule } from "../core";

const spec: NodeSpec = {
  type: "source",
  kind: "source",
  label: "Source",
  blurb: "A live sensor channel from the gateway.",
  accent: ACCENT.source,
  hasSignalOut: true,
  params: [],
};

export const NODE_MODULE = new SourceNodeModule(spec);
