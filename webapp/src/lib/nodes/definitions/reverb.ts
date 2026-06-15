import { ACCENT, type NodeSpec } from "../../graph/nodeSpec";
import { AudioNodeModule } from "../core";

const spec: NodeSpec = {
  type: "reverb",
  kind: "filter",
  label: "Reverb",
  blurb: "Adds space and tail. Big decay = cathedral.",
  accent: ACCENT.filter,
  hasAudioIn: true,
  hasAudioOut: true,
  params: [
    { key: "decay", label: "Size", min: 0.5, max: 12, default: 4, step: 0.1, unit: "s" },
    { key: "wet", label: "Mix", min: 0, max: 1, default: 0.5, step: 0.01, modulatable: true },
  ],
};

export const NODE_MODULE = new AudioNodeModule(spec, (T, { ramp }) => {
  const reverb = new T.Reverb(4);
  reverb.generate();
  let pending: ReturnType<typeof setTimeout> | null = null;
  return {
    input: reverb,
    output: reverb,
    setParam(key, v) {
      if (key === "wet") ramp(reverb.wet, v);
      else if (key === "decay") {
        reverb.decay = v;
        if (pending) clearTimeout(pending);
        pending = setTimeout(() => reverb.generate(), 120);
      }
    },
    dispose() {
      if (pending) clearTimeout(pending);
      reverb.dispose();
    },
  };
});
