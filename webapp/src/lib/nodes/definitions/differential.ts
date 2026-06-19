import { ACCENT, type NodeSpec } from "../../graph/nodeSpec";
import { TransformNodeModule } from "../core";

const spec: NodeSpec = {
  type: "differential",
  kind: "transform",
  label: "Rate of change",
  blurb: "Outputs how fast the input is moving (centred at 0.5 = still).",
  accent: ACCENT.transform,
  hasSignalIn: true,
  hasSignalOut: true,
  params: [{ key: "gain", label: "Sensitivity", min: 1, max: 50, default: 10, step: 1 }],
};

export const NODE_MODULE = new TransformNodeModule(spec, (input, params, ctx) => {
  const state = ctx.getState(() => ({ prev: input }));
  const gain = params.gain ?? 10;
  const delta = input - state.prev;
  state.prev = input;
  return ctx.clamp01(0.5 + delta * gain);
});
