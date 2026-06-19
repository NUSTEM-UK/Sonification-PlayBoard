import { ACCENT, type NodeSpec } from "../../graph/nodeSpec";
import { AudioNodeModule } from "../core";

const spec: NodeSpec = {
  type: "pad",
  kind: "generator",
  label: "Warm pad",
  blurb: "Two detuned voices for a thick, shimmering chord-like tone.",
  accent: ACCENT.generator,
  hasAudioOut: true,
  params: [
    { key: "freq", label: "Pitch", min: 80, max: 800, default: 220, log: true, unit: "Hz", modulatable: true },
    { key: "detune", label: "Detune", min: 0, max: 50, default: 14, step: 1, unit: "ct", modulatable: true },
    { key: "level", label: "Level", min: 0, max: 1, default: 0.3, step: 0.01, modulatable: true },
  ],
};

export const NODE_MODULE = new AudioNodeModule(spec, (T, { ramp }) => {
  const fat = new T.FatOscillator(220, "sawtooth", 14).start();
  fat.count = 3;
  const out = new T.Gain(0.3);
  fat.connect(out);
  return {
    input: null,
    output: out,
    setParam(key, v) {
      if (key === "freq") ramp(fat.frequency, v);
      else if (key === "detune") fat.spread = v;
      else if (key === "level") ramp(out.gain, v);
    },
    dispose() {
      fat.dispose();
      out.dispose();
    },
  };
});
