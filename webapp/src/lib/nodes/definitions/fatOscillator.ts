import { ACCENT, type NodeSpec } from "../../graph/nodeSpec";
import { AudioNodeModule } from "../core";

const spec: NodeSpec = {
  type: "fatOscillator",
  kind: "generator",
  label: "Fat Oscillator",
  blurb: "A rich sawtooth with detuned voices for a fuller sound.",
  accent: ACCENT.generator,
  hasAudioOut: true,
  params: [
    { key: "freq", label: "Pitch", min: 40, max: 400, default: 110, log: true, unit: "Hz", modulatable: true },
    { key: "count", label: "Voices", min: 1, max: 7, default: 3, step: 1, modulatable: false },
    { key: "spread", label: "Spread", min: 0, max: 100, default: 30, step: 1, unit: "cents", modulatable: false },
    { key: "level", label: "Level", min: 0, max: 1, default: 0.4, step: 0.01, modulatable: true },
  ],
};

export const NODE_MODULE = new AudioNodeModule(spec, (T, { ramp }) => {
  const osc = new T.FatOscillator(110, "sawtooth");
  osc.count = 3;
  osc.spread = 30;
  osc.start();
  const out = new T.Gain(0.4);
  osc.connect(out);

  return {
    input: null,
    output: out,
    setParam(key, v) {
      if (key === "freq") ramp(osc.frequency, v);
      else if (key === "count") osc.count = Math.max(1, Math.round(v));
      else if (key === "spread") osc.spread = v;
      else if (key === "level") ramp(out.gain, v);
    },
    dispose() {
      osc.dispose();
      out.dispose();
    },
  };
});
