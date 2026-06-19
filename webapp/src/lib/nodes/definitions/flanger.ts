import { ACCENT, type NodeSpec } from "../../graph/nodeSpec";
import { AudioNodeModule } from "../core";

const spec: NodeSpec = {
  type: "flanger",
  kind: "filter",
  label: "Flanger",
  blurb: "Sweeping comb filter for jet-like modulation effects.",
  accent: ACCENT.filter,
  hasAudioIn: true,
  hasAudioOut: true,
  params: [
    { key: "rate", label: "Rate", min: 0.5, max: 5, default: 1.5, step: 0.1, unit: "Hz", modulatable: true },
    { key: "depth", label: "Depth", min: 0, max: 1, default: 0.5, step: 0.01, modulatable: true },
    { key: "feedback", label: "Feedback", min: 0, max: 0.9, default: 0.5, step: 0.01, modulatable: true },
    { key: "wet", label: "Mix", min: 0, max: 1, default: 0.5, step: 0.01, modulatable: true },
  ],
};

export const NODE_MODULE = new AudioNodeModule(spec, (T, { ramp }) => {
  const input = new T.Gain();
  const delayNode = new T.Delay({ maxDelay: 0.1 });
  const lfo = new T.Oscillator({ frequency: 1.5, type: "sine" });
  const lfoGain = new T.Gain(0.005); // modulation depth for delay time
  const feedback = new T.Gain(0.5);
  const wet = new T.Gain(0.5);
  const dry = new T.Gain(0.5);
  const output = new T.Gain();

  // LFO modulates delay time (0.005 to 0.055 seconds)
  lfo.connect(lfoGain);
  lfoGain.connect(delayNode.delayTime as any);

  // Wet path: input → delay → feedback → back to delay + output
  input.connect(delayNode);
  delayNode.connect(feedback);
  feedback.connect(delayNode);
  delayNode.connect(wet);
  wet.connect(output);

  // Dry path: input → dry → output
  input.connect(dry);
  dry.connect(output);

  lfo.start();

  return {
    input,
    output,
    setParam(key, v) {
      if (key === "rate") ramp(lfo.frequency, v);
      if (key === "depth") ramp(lfoGain.gain, v * 0.02); // depth modulates LFO gain
      if (key === "feedback") ramp(feedback.gain, v);
      if (key === "wet") {
        ramp(wet.gain, v);
        ramp(dry.gain, 1 - v);
      }
    },
    dispose() {
      input.dispose();
      lfo.stop();
      lfo.dispose();
      lfoGain.dispose();
      delayNode.dispose();
      feedback.dispose();
      wet.dispose();
      dry.dispose();
      output.dispose();
    },
  };
});
