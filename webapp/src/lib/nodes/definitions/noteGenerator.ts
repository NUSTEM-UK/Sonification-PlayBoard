import { ACCENT, type NodeSpec } from "../../graph/nodeSpec";
import { AudioNodeModule } from "../core";

const INSTRUMENTS = {
  bells: { name: "Bells", partials: [1, 2, 3], decay: 2 },
  pad: { name: "Pad", partials: [1, 1.5, 2], decay: 3 },
  pluck: { name: "Pluck", partials: [1, 2], decay: 0.5 },
  electric: { name: "Electric", partials: [1, 2, 3, 4], decay: 1.5 },
};

const INSTRUMENT_OPTIONS = [
  { value: 0, label: "Bells" },
  { value: 1, label: "Pad" },
  { value: 2, label: "Pluck" },
  { value: 3, label: "Electric" },
] as const;

const spec: NodeSpec = {
  type: "noteGenerator",
  kind: "generator",
  label: "Note Gen",
  blurb: "Play notes from discrete step input (0..1).",
  accent: ACCENT.generator,
  hasAudioOut: true,
  params: [
    { key: "noteInput", label: "Note", min: 0, max: 1, default: 0, step: 0.01, modulatable: true },
    { key: "instrument", label: "Instrument", min: 0, max: 3, default: 0, step: 1, options: [...INSTRUMENT_OPTIONS] },
    { key: "attack", label: "Attack", min: 0, max: 0.5, default: 0.05, step: 0.01, unit: "s" },
    { key: "release", label: "Release", min: 0.1, max: 2, default: 0.8, step: 0.1, unit: "s" },
    { key: "pitchMin", label: "Pitch Min", min: 0, max: 127, default: 48, step: 1 },
    { key: "octaveSpan", label: "Range", min: 1, max: 4, default: 2, step: 1 },
  ],
};

export const NODE_MODULE = new AudioNodeModule(spec, (T, { ramp }) => {
  const output = new T.Gain(0.2);
  let currentAttack = 0.05;
  let currentRelease = 0.8;
  let pitchMin = 48;
  let octaveSpan = 2;
  const synth = new T.PolySynth(T.Synth, {
    oscillator: { type: "triangle" },
    envelope: { attack: currentAttack, decay: 0.15, sustain: 0.2, release: currentRelease },
  }).connect(output);

  let lastMidiNote = -1;

  return {
    input: null,
    output,
    setParam(key, v) {
      if (key === "attack") {
        currentAttack = v;
        synth.set({ envelope: { attack: currentAttack, decay: 0.15, sustain: 0.2, release: currentRelease } });
      }
      if (key === "release") {
        currentRelease = v;
        synth.set({ envelope: { attack: currentAttack, decay: 0.15, sustain: 0.2, release: currentRelease } });
      }
      if (key === "pitchMin") {
        pitchMin = Math.round(v);
      }
      if (key === "octaveSpan") {
        octaveSpan = Math.round(v);
      }
      if (key === "noteInput") {
        // Normalize -1..1 input to 0..1
        const normalized = Math.max(0, Math.min(1, (v + 1) / 2));
        // Map to MIDI notes based on pitch range
        const semitones = Math.round(normalized * (octaveSpan * 12));
        const midi = pitchMin + semitones;

        if (midi !== lastMidiNote) {
          lastMidiNote = midi;
          synth.triggerRelease(T.now() + 0.01);
          synth.triggerAttack(midi, T.now() + 0.05); // Small delay to let release finish
        }
      }
    },
    dispose() {
      synth.dispose();
      output.dispose();
    },
  };
});
