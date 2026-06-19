import { ACCENT, type NodeSpec } from "../../graph/nodeSpec";
import { AudioNodeModule } from "../core";

const PENTATONIC = [0, 2, 4, 7, 9]; // Semitone offsets within an octave

const INSTRUMENTS = {
  bells: { name: "Bells", oscillator: "sine", decay: 2.5 },
  pad: { name: "Pad", oscillator: "sawtooth", decay: 3 },
  pluck: { name: "Pluck", oscillator: "triangle", decay: 0.6 },
  electric: { name: "Electric", oscillator: "square", decay: 1.5 },
} as const;

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
    { key: "pitchMin", label: "Pitch Min", min: 36, max: 120, default: 60, step: 1 },
    { key: "octaveSpan", label: "Range", min: 1, max: 4, default: 3, step: 1 },
  ],
};

export const NODE_MODULE = new AudioNodeModule(spec, (T, { ramp }) => {
  const output = new T.Gain(0.2);
  let currentAttack = 0.05;
  let currentRelease = 0.8;
  let pitchMin = 60;
  let octaveSpan = 3;
  const synth = new T.Synth({
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
      if (key === "instrument") {
        const instIdx = Math.round(v);
        const instKeys = Object.keys(INSTRUMENTS) as Array<keyof typeof INSTRUMENTS>;
        const inst = INSTRUMENTS[instKeys[instIdx]];
        synth.set({ oscillator: { type: inst.oscillator as any } });
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
        // Map to pentatonic scale
        const totalSteps = octaveSpan * PENTATONIC.length;
        const stepIndex = Math.round(normalized * (totalSteps - 1));
        const octave = Math.floor(stepIndex / PENTATONIC.length);
        const degreeInOctave = stepIndex % PENTATONIC.length;
        const semitones = octave * 12 + PENTATONIC[degreeInOctave];
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
