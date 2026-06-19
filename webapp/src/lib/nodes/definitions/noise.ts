import { ACCENT, type NodeSpec } from "../../graph/nodeSpec";
import { AudioNodeModule } from "../core";

const spec: NodeSpec = {
  type: "noise",
  kind: "generator",
  label: "Noise wash",
  blurb: "Pink noise - wind, surf, texture. Lovely under a filter.",
  accent: ACCENT.generator,
  hasAudioOut: true,
  params: [{ key: "level", label: "Level", min: 0, max: 1, default: 0.25, step: 0.01, modulatable: true }],
};

export const NODE_MODULE = new AudioNodeModule(spec, (T, { ramp }) => {
  const noise = new T.Noise("pink").start();
  const out = new T.Gain(0.25);
  noise.connect(out);
  return {
    input: null,
    output: out,
    setParam(key, v) {
      if (key === "level") ramp(out.gain, v);
    },
    dispose() {
      noise.dispose();
      out.dispose();
    },
  };
});
