import { ACCENT, type NodeSpec } from "../../graph/nodeSpec";
import { AudioNodeModule } from "../core";

const spec: NodeSpec = {
  type: "master",
  kind: "output",
  label: "Master out",
  blurb: "Everything that reaches here is heard. One per board.",
  accent: ACCENT.output,
  hasAudioIn: true,
  params: [{ key: "level", label: "Volume", min: 0, max: 1, default: 0.8, step: 0.01, modulatable: true }],
};

export const NODE_MODULE = new AudioNodeModule(spec, (T, { ramp }) => {
  const gain = new T.Gain(0.8).toDestination();
  return {
    input: gain,
    output: null,
    setParam(key, v) {
      if (key === "level") ramp(gain.gain, v);
    },
    dispose() {
      gain.dispose();
    },
  };
});
