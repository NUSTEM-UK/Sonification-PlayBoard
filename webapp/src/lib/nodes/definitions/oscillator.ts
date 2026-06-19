import { ACCENT, type NodeSpec } from "../../graph/nodeSpec";
import { AudioNodeModule } from "../core";

const WAVEFORMS = ["sine", "square", "sawtooth"] as const;
const WAVEFORM_OPTIONS = [
  { value: 0, label: "Sine", icon: "sine" },
  { value: 1, label: "Square", icon: "square" },
  { value: 2, label: "Saw", icon: "saw" },
] as const;

const spec: NodeSpec = {
  type: "oscillator",
  kind: "generator",
  label: "Oscillator",
  blurb: "Selectable waveform oscillator",
  accent: ACCENT.generator,
  hasAudioOut: true,
  params: [
    { key: "freq", label: "Pitch", min: 40, max: 1200, default: 220, log: true, unit: "Hz", modulatable: true },
    {
      key: "waveform",
      label: "Wave",
      min: 0,
      max: WAVEFORMS.length - 1,
      default: 0,
      step: 1,
      options: [...WAVEFORM_OPTIONS],
    },
    { key: "level", label: "Level", min: 0, max: 1, default: 0.3, step: 0.01, modulatable: true },
  ],
};

export const NODE_MODULE = new AudioNodeModule(spec, (T, { ramp }) => {
  const osc = new T.Oscillator(220, "sine").start();
  const out = new T.Gain(0.3);
  osc.connect(out);

  return {
    input: null,
    output: out,
    setParam(key, value) {
      if (key === "freq") {
        ramp(osc.frequency, value);
        return;
      }
      if (key === "level") {
        ramp(out.gain, value);
        return;
      }
      if (key === "waveform") {
        const idx = Math.max(0, Math.min(WAVEFORMS.length - 1, Math.round(value)));
        osc.type = WAVEFORMS[idx];
      }
    },
    dispose() {
      osc.dispose();
      out.dispose();
    },
  };
});
