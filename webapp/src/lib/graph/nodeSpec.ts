export type NodeKind = "source" | "transform" | "generator" | "filter" | "output";

export interface ParamOption {
  value: number;
  label: string;
  icon?: string;
}

export interface ParamSpec {
  key: string;
  label: string;
  min: number;
  max: number;
  default: number;
  step?: number;
  unit?: string;
  log?: boolean;
  modulatable?: boolean;
  options?: ParamOption[];
}

export interface NodeSpec {
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

export const ACCENT = {
  source: "#38bdf8",
  transform: "#a78bfa",
  generator: "#34d399",
  filter: "#fbbf24",
  output: "#f472b6",
} as const;

export function defaultParams(spec: NodeSpec): Record<string, number> {
  return Object.fromEntries(spec.params.map((p) => [p.key, p.default]));
}
