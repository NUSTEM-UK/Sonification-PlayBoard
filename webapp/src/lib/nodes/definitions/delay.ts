import { ACCENT, type NodeSpec } from "../../graph/nodeSpec";
import { AudioNodeModule } from "../core";

const spec: NodeSpec = {
  type: "delay",
  kind: "filter",
  label: "Echo",
  blurb: "Feedback delay - repeats that fade. Motion and depth.",
  accent: ACCENT.filter,
  hasAudioIn: true,
  hasAudioOut: true,
  params: [
    { key: "time", label: "Time", min: 0.02, max: 1, default: 0.3, step: 0.01, unit: "s", modulatable: true },
    { key: "feedback", label: "Feedback", min: 0, max: 0.92, default: 0.4, step: 0.01, modulatable: true },
    { key: "wet", label: "Mix", min: 0, max: 1, default: 0.4, step: 0.01, modulatable: true },
  ],
};

export const NODE_MODULE = new AudioNodeModule(spec, (T, { ramp }) => {
  const delay = new T.FeedbackDelay(0.3, 0.4);
  return {
    input: delay,
    output: delay,
    setParam(key, v) {
      if (key === "time") ramp(delay.delayTime, v);
      else if (key === "feedback") ramp(delay.feedback, v);
      else if (key === "wet") ramp(delay.wet, v);
    },
    dispose() {
      delay.dispose();
    },
  };
});
