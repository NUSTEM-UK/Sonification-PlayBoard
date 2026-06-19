import { ACCENT, type NodeSpec } from "../../graph/nodeSpec";
import { TransformNodeModule } from "../core";

const spec: NodeSpec = {
  type: "invert",
  kind: "transform",
  label: "Invert",
  blurb: "Mirrors a signal around a center point.",
  accent: ACCENT.transform,
  hasSignalIn: true,
  hasSignalOut: true,
  params: [{ key: "center", label: "Center", min: 0, max: 1, default: 0.5, step: 0.01 }],
};

export const NODE_MODULE = new TransformNodeModule(spec, (input, params, ctx) => {
  const center = params.center ?? 0.5;
  return ctx.clamp01(2 * center - input);
});
