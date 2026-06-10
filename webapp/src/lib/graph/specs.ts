/**
 * The node taxonomy. Everything draggable onto the canvas is described here, so
 * the palette, the node UI, and the audio engine all read from one source of
 * truth.
 *
 * Two kinds of wire run between nodes:
 *   - SIGNAL  — a control value, normalised 0..1, that changes over time.
 *               Emitted by sources and transforms; consumed by node parameters.
 *   - AUDIO   — actual sound. Flows generator → filter → output.
 *
 * Handles encode their kind in their id so connections can be validated and the
 * tick loop can tell modulation edges from audio edges without extra bookkeeping
 * (see graph.svelte.ts / tick.ts):
 *   signal out  -> "signal-out"      audio out -> "audio-out"
 *   signal in   -> "signal-in"       audio in  -> "audio-in"
 *   param input -> "param:<key>"     (accepts a signal, modulates that param)
 */

export type NodeKind = "source" | "transform" | "generator" | "filter" | "output";

export interface ParamSpec {
  key: string;
  label: string;
  min: number;
  max: number;
  default: number;
  step?: number;
  unit?: string;
  /** Slider feels logarithmic (frequencies, cutoffs). */
  log?: boolean;
  /** Exposes a signal-in handle so the param can be driven by a data flow. */
  modulatable?: boolean;
}

export interface NodeSpec {
  /** Stable type key, e.g. "rollingAvg", "drone", "lowpass". */
  type: string;
  kind: NodeKind;
  label: string;
  blurb: string;
  params: ParamSpec[];
  accent: string;
  hasSignalIn?: boolean;
  hasSignalOut?: boolean;
  hasAudioIn?: boolean;
  hasAudioOut?: boolean;
}

const ACCENT = {
  source: "#38bdf8", // sky
  transform: "#a78bfa", // violet
  generator: "#34d399", // emerald
  filter: "#fbbf24", // amber
  output: "#f472b6", // pink
} as const;

// --- Transforms: signal in → (maths) → signal out, with a sparkline ---------

const TRANSFORMS: NodeSpec[] = [
  {
    type: "rollingAvg",
    kind: "transform",
    label: "Rolling average",
    blurb: "Smooths a signal by averaging the last N samples.",
    accent: ACCENT.transform,
    hasSignalIn: true,
    hasSignalOut: true,
    params: [{ key: "window", label: "Window", min: 1, max: 120, default: 12, step: 1, unit: "samples" }],
  },
  {
    type: "smooth",
    kind: "transform",
    label: "Smooth (glide)",
    blurb: "Exponential smoothing — higher = lazier, more gliding response.",
    accent: ACCENT.transform,
    hasSignalIn: true,
    hasSignalOut: true,
    params: [{ key: "amount", label: "Amount", min: 0, max: 0.98, default: 0.8, step: 0.01 }],
  },
  {
    type: "differential",
    kind: "transform",
    label: "Rate of change",
    blurb: "Outputs how fast the input is moving (centred at 0.5 = still).",
    accent: ACCENT.transform,
    hasSignalIn: true,
    hasSignalOut: true,
    params: [{ key: "gain", label: "Sensitivity", min: 1, max: 50, default: 10, step: 1 }],
  },
  {
    type: "scale",
    kind: "transform",
    label: "Scale & offset",
    blurb: "Stretch and shift a signal: out = clamp(in × gain + offset).",
    accent: ACCENT.transform,
    hasSignalIn: true,
    hasSignalOut: true,
    params: [
      { key: "gain", label: "Gain", min: 0, max: 4, default: 1, step: 0.05 },
      { key: "offset", label: "Offset", min: -1, max: 1, default: 0, step: 0.02 },
    ],
  },
];

// --- Generators: make sound. Audio out + modulatable parameters -------------

const GENERATORS: NodeSpec[] = [
  {
    type: "drone",
    kind: "generator",
    label: "Drone",
    blurb: "A sustained sawtooth tone — the spine of a pad.",
    accent: ACCENT.generator,
    hasAudioOut: true,
    params: [
      { key: "freq", label: "Pitch", min: 40, max: 400, default: 110, log: true, unit: "Hz", modulatable: true },
      { key: "level", label: "Level", min: 0, max: 1, default: 0.4, step: 0.01, modulatable: true },
    ],
  },
  {
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
  },
  {
    type: "noise",
    kind: "generator",
    label: "Noise wash",
    blurb: "Pink noise — wind, surf, texture. Lovely under a filter.",
    accent: ACCENT.generator,
    hasAudioOut: true,
    params: [{ key: "level", label: "Level", min: 0, max: 1, default: 0.25, step: 0.01, modulatable: true }],
  },
];

// --- Filters: shape sound. Audio in + audio out + modulatable parameters ----

const FILTERS: NodeSpec[] = [
  {
    type: "lowpass",
    kind: "filter",
    label: "Low-pass filter",
    blurb: "Opens and closes the brightness of whatever passes through.",
    accent: ACCENT.filter,
    hasAudioIn: true,
    hasAudioOut: true,
    params: [
      { key: "cutoff", label: "Cutoff", min: 80, max: 12000, default: 1200, log: true, unit: "Hz", modulatable: true },
      { key: "resonance", label: "Resonance", min: 0, max: 18, default: 2, step: 0.1, modulatable: true },
    ],
  },
  {
    type: "reverb",
    kind: "filter",
    label: "Reverb",
    blurb: "Adds space and tail. Big decay = cathedral.",
    accent: ACCENT.filter,
    hasAudioIn: true,
    hasAudioOut: true,
    params: [
      { key: "decay", label: "Size", min: 0.5, max: 12, default: 4, step: 0.1, unit: "s" },
      { key: "wet", label: "Mix", min: 0, max: 1, default: 0.5, step: 0.01, modulatable: true },
    ],
  },
  {
    type: "delay",
    kind: "filter",
    label: "Echo",
    blurb: "Feedback delay — repeats that fade. Motion and depth.",
    accent: ACCENT.filter,
    hasAudioIn: true,
    hasAudioOut: true,
    params: [
      { key: "time", label: "Time", min: 0.02, max: 1, default: 0.3, step: 0.01, unit: "s", modulatable: true },
      { key: "feedback", label: "Feedback", min: 0, max: 0.92, default: 0.4, step: 0.01, modulatable: true },
      { key: "wet", label: "Mix", min: 0, max: 1, default: 0.4, step: 0.01, modulatable: true },
    ],
  },
];

// --- Output: the master bus. Audio in only ---------------------------------

const OUTPUT: NodeSpec = {
  type: "master",
  kind: "output",
  label: "Master out",
  blurb: "Everything that reaches here is heard. One per board.",
  accent: ACCENT.output,
  hasAudioIn: true,
  params: [{ key: "level", label: "Volume", min: 0, max: 1, default: 0.8, step: 0.01, modulatable: true }],
};

/** The synthetic spec used by every discovered serial source node. */
export const SOURCE_SPEC: NodeSpec = {
  type: "source",
  kind: "source",
  label: "Source",
  blurb: "A live sensor channel from the gateway.",
  accent: ACCENT.source,
  hasSignalOut: true,
  params: [],
};

export const PALETTE: NodeSpec[] = [...TRANSFORMS, ...GENERATORS, ...FILTERS, OUTPUT];

const BY_TYPE: Record<string, NodeSpec> = Object.fromEntries(
  [...PALETTE, SOURCE_SPEC].map((s) => [s.type, s]),
);

export function specFor(type: string): NodeSpec {
  const spec = BY_TYPE[type];
  if (!spec) throw new Error(`unknown node type: ${type}`);
  return spec;
}

/** Default param values for a freshly-dropped node of this type. */
export function defaultParams(spec: NodeSpec): Record<string, number> {
  return Object.fromEntries(spec.params.map((p) => [p.key, p.default]));
}

export const KIND_ORDER: NodeKind[] = ["transform", "generator", "filter", "output"];
export const KIND_LABEL: Record<NodeKind, string> = {
  source: "Sources",
  transform: "Transforms",
  generator: "Generators",
  filter: "Filters",
  output: "Output",
};
