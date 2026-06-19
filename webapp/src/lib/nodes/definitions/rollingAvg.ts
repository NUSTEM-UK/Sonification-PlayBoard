import { ACCENT, type NodeSpec } from "../../graph/nodeSpec";
import { TransformNodeModule } from "../core";

const spec: NodeSpec = {
  type: "rollingAvg",
  kind: "transform",
  label: "Rolling average",
  blurb: "Smooths a signal by averaging the last N samples.",
  accent: ACCENT.transform,
  hasSignalIn: true,
  hasSignalOut: true,
  params: [{ key: "window", label: "Window", min: 1, max: 120, default: 12, step: 1, unit: "samples" }],
};

export const NODE_MODULE = new TransformNodeModule(spec, (input, params, ctx) => {
  const state = ctx.getState(() => ({ buf: [] as number[] }));
  const window = Math.max(1, Math.round(params.window ?? 12));
  state.buf.push(input);
  while (state.buf.length > window) state.buf.shift();
  return state.buf.reduce((a, b) => a + b, 0) / state.buf.length;
});
