import { ACCENT, type NodeSpec } from "../../graph/nodeSpec";
import { TransformNodeModule } from "../core";

const spec: NodeSpec = {
  type: "quantize",
  kind: "transform",
  label: "Quantize",
  blurb: "Snap to discrete steps (1–12).",
  accent: ACCENT.transform,
  hasSignalIn: true,
  params: [{ key: "steps", label: "Steps", min: 1, max: 12, default: 5, step: 1 }],
};

export const NODE_MODULE = new TransformNodeModule(spec, (input, params) => {
  const steps = Math.max(1, Math.round(params.steps));
  const stepSize = 1 / steps;
  // Quantize to nearest step
  const stepIndex = Math.round(input * (steps - 1));
  return (stepIndex / (steps - 1)) * 1.0;
});
