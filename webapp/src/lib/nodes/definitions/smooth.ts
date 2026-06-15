import { ACCENT, type NodeSpec } from "../../graph/nodeSpec";
import { TransformNodeModule } from "../core";

const spec: NodeSpec = {
  type: "smooth",
  kind: "transform",
  label: "Smooth (glide)",
  blurb: "Exponential smoothing - higher = lazier, more gliding response.",
  accent: ACCENT.transform,
  hasSignalIn: true,
  hasSignalOut: true,
  params: [{ key: "amount", label: "Amount", min: 0, max: 0.98, default: 0.8, step: 0.01 }],
};

export const NODE_MODULE = new TransformNodeModule(spec, (input, params, ctx) => {
  const state = ctx.getState(() => ({ ema: input }));
  const amount = params.amount ?? 0.8;
  state.ema = amount * state.ema + (1 - amount) * input;
  return state.ema;
});
