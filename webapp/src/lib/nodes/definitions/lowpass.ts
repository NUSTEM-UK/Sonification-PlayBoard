import { ACCENT, type NodeSpec } from "../../graph/nodeSpec";
import { AudioNodeModule } from "../core";

const spec: NodeSpec = {
  type: "lowpass",
  kind: "filter",
  label: "Low-pass filter",
  blurb: "Opens and closes the brightness of whatever passes through.",
  accent: ACCENT.filter,
  hasAudioIn: true,
  hasAudioOut: true,
  params: [
    { key: "cutoff", label: "Cutoff", min: 80, max: 12000, default: 1200, log: true, unit: "Hz", modulatable: true },
    { key: "resonance", label: "Resonance", min: 0, max: 18, default: 2, step: 0.1, modulatable: true },
  ],
};

export const NODE_MODULE = new AudioNodeModule(spec, (_T, { ramp }) => {
  const T = _T;
  const filter = new T.Filter(1200, "lowpass");
  return {
    input: filter,
    output: filter,
    setParam(key, v) {
      if (key === "cutoff") ramp(filter.frequency, v);
      else if (key === "resonance") ramp(filter.Q, v);
    },
    dispose() {
      filter.dispose();
    },
  };
});
