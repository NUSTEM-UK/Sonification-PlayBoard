import { ACCENT, type NodeSpec } from "../../graph/nodeSpec";
import { TransformNodeModule } from "../core";

const spec: NodeSpec = {
  type: "addition",
  kind: "transform",
  label: "Add",
  blurb: "Add two signals with per-input gain and offset.",
  accent: ACCENT.transform,
  hasSignalIn: true,
  params: [
    { key: "gain1", label: "In 1 Gain", min: 0, max: 2, default: 1, step: 0.01, modulatable: true },
    { key: "offset1", label: "In 1 Offset", min: -1, max: 1, default: 0, step: 0.01 },
    { key: "gain2", label: "In 2 Gain", min: 0, max: 2, default: 1, step: 0.01, modulatable: true },
    { key: "offset2", label: "In 2 Offset", min: -1, max: 1, default: 0, step: 0.01 },
  ],
};

export const NODE_MODULE = new TransformNodeModule(spec, (input, params) => {
  const a = input * params.gain1 + params.offset1;
  return a;
}, true, { componentType: "addition" });
