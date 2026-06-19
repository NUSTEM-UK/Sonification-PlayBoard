import { ACCENT, type NodeSpec } from "../../graph/nodeSpec";
import { AudioNodeModule } from "../core";

const spec: NodeSpec = {
  type: "master",
  kind: "output",
  label: "Output",
  blurb: "Everything that reaches here is heard.",
  accent: ACCENT.output,
  hasAudioIn: true,
  params: [
    { key: "level", label: "Volume", min: 0, max: 1, default: 0.8, step: 0.01, modulatable: true },
    { key: "pan", label: "Pan", min: -1, max: 1, default: 0, step: 0.01, modulatable: true },
  ],
};

export const NODE_MODULE = new AudioNodeModule(spec, (T, { ramp }) => {
  const panner = new T.Panner(0);
  const gain = new T.Gain(0.8);
  gain.connect(panner);
  panner.toDestination();
  return {
    input: gain,
    output: null,
    setParam(key, v) {
      if (key === "level") ramp(gain.gain, v);
      if (key === "pan") ramp(panner.pan, v);
    },
    dispose() {
      gain.dispose();
      panner.dispose();
    },
  };
});
