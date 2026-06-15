import { ALL_NODE_SPECS, PALETTE_SPECS, SOURCE_SPEC } from "../nodes/definitions";
import { defaultParams, type NodeKind, type NodeSpec, type ParamSpec } from "./nodeSpec";

const BY_TYPE: Record<string, NodeSpec> = Object.fromEntries(ALL_NODE_SPECS.map((s) => [s.type, s]));

export function specFor(type: string): NodeSpec {
  const spec = BY_TYPE[type];
  if (!spec) throw new Error(`unknown node type: ${type}`);
  return spec;
}

/** Default param values for a freshly-dropped node of this type. */
export { defaultParams, SOURCE_SPEC };
export const PALETTE: NodeSpec[] = PALETTE_SPECS;
export type { NodeKind, NodeSpec, ParamSpec };

export const KIND_ORDER: NodeKind[] = ["transform", "generator", "filter", "output"];
export const KIND_LABEL: Record<NodeKind, string> = {
  source: "Sources",
  transform: "Transforms",
  generator: "Generators",
  filter: "Filters",
  output: "Output",
};
