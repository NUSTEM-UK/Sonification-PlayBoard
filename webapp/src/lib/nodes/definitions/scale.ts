import { ACCENT, type NodeSpec } from "../../graph/nodeSpec";
import { TransformNodeModule } from "../core";

const spec: NodeSpec = {
  type: "scale",
  kind: "transform",
  label: "Scale & offset",
  blurb: "Stretch and shift a signal: out = clamp(in * gain + offset).",
  accent: ACCENT.transform,
  hasSignalIn: true,
  hasSignalOut: true,
  params: [
    { key: "gain", label: "Gain", min: 0, max: 4, default: 1, step: 0.05 },
    { key: "offset", label: "Offset", min: -1, max: 1, default: 0, step: 0.02 },
  ],
};

export const NODE_MODULE = new TransformNodeModule(spec, (input, params, ctx) => {
  return ctx.clamp01(input * (params.gain ?? 1) + (params.offset ?? 0));
});
