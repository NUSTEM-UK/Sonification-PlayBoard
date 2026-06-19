import { ACCENT, type NodeSpec } from "../../graph/nodeSpec";
import { AudioNodeModule } from "../core";

const spec: NodeSpec = {
  type: "drone",
  kind: "generator",
  label: "Drone",
  blurb: "A sustained sawtooth tone - the spine of a pad.",
  accent: ACCENT.generator,
  hasAudioOut: true,
  params: [
    { key: "freq", label: "Pitch", min: 40, max: 400, default: 110, log: true, unit: "Hz", modulatable: true },
    { key: "level", label: "Level", min: 0, max: 1, default: 0.4, step: 0.01, modulatable: true },
  ],
};

export const NODE_MODULE = new AudioNodeModule(spec, (T, { ramp }) => {
  const osc = new T.Oscillator(110, "sawtooth").start();
  const out = new T.Gain(0.4);
  osc.connect(out);
  return {
    input: null,
    output: out,
    setParam(key, v) {
      if (key === "freq") ramp(osc.frequency, v);
      else if (key === "level") ramp(out.gain, v);
    },
    dispose() {
      osc.dispose();
      out.dispose();
    },
  };
});
