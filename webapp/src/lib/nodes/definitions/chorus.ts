import { ACCENT, type NodeSpec } from "../../graph/nodeSpec";
import { AudioNodeModule } from "../core";

const spec: NodeSpec = {
  type: "chorus",
  kind: "filter",
  label: "Chorus",
  blurb: "Lush modulated delay effect for width and shimmer.",
  accent: ACCENT.filter,
  hasAudioIn: true,
  hasAudioOut: true,
  params: [
    { key: "rate", label: "Rate", min: 0.5, max: 5, default: 1.5, step: 0.1, unit: "Hz", modulatable: true },
    { key: "depth", label: "Depth", min: 0, max: 0.02, default: 0.01, step: 0.001, modulatable: true },
    { key: "wet", label: "Mix", min: 0, max: 1, default: 0.5, step: 0.01, modulatable: true },
  ],
};

export const NODE_MODULE = new AudioNodeModule(spec, (T, { ramp }) => {
  const input = new T.Gain();
  const delay = new T.Delay({ maxDelay: 0.05 });
  const lfo = new T.Oscillator({ frequency: 1.5, type: "sine" });
  const lfoDepth = new T.Gain(0.01);
  const wet = new T.Gain(0.5);
  const dry = new T.Gain(0.5);
  const output = new T.Gain();

  // LFO modulates delay time
  lfo.connect(lfoDepth);
  lfoDepth.connect(delay.delayTime as any);

  input.connect(delay);
  input.connect(dry);
  delay.connect(wet);
  wet.connect(output);
  dry.connect(output);

  lfo.start();

  return {
    input,
    output,
    setParam(key, v) {
      if (key === "rate") ramp(lfo.frequency, v);
      if (key === "depth") ramp(lfoDepth.gain, v);
      if (key === "wet") {
        ramp(wet.gain, v);
        ramp(dry.gain, 1 - v);
      }
    },
    dispose() {
      input.dispose();
      lfo.stop();
      lfo.dispose();
      lfoDepth.dispose();
      delay.dispose();
      wet.dispose();
      dry.dispose();
      output.dispose();
    },
  };
});
