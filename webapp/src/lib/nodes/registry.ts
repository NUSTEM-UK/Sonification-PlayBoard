import { ALL_NODE_MODULES } from "./definitions";
import { defaultParams, type NodeKind, type NodeSpec } from "../graph/nodeSpec";
import {
  AudioNodeModule,
  type AudioUnitFactory,
  type NodeComponentType,
  type NodeModule,
  type TransformProcessor,
  TransformNodeModule,
} from "./core";

export type { NodeComponentType };

export type NodeWellKind = Exclude<NodeKind, "source">;

export interface NodeDataSeed extends Record<string, unknown> {
  specType: string;
  params: Record<string, number>;
  title: string;
  channelId?: string;
  dataVersion: number;
}

export interface NodeDefinition {
  type: string;
  spec: NodeSpec;
  module: NodeModule;
  componentType: NodeComponentType;
  wellKind?: NodeWellKind;
  enabledInWell: boolean;
  processSignal?: TransformProcessor;
  createAudioUnit?: AudioUnitFactory;
  createData(overrides?: Partial<NodeDataSeed>): NodeDataSeed;
}

export const NODE_DATA_VERSION = 1;

const WELL_ORDER: NodeWellKind[] = ["transform", "generator", "filter", "output"];
const WELL_LABEL: Record<NodeWellKind, string> = {
  transform: "Transforms",
  generator: "Generators",
  filter: "Filters",
  output: "Output",
};

// Feature-flag style config for exposing node types in the component well.
const NODE_WELL_FLAGS: Record<string, boolean> = Object.fromEntries(ALL_NODE_MODULES.map((m) => [m.type, true]));

function createDefinition(module: NodeModule): NodeDefinition {
  const spec = module.spec;
  const enabledInWell = spec.kind === "source" ? false : (NODE_WELL_FLAGS[spec.type] ?? module.enabledInWell);
  return {
    type: spec.type,
    spec,
    module,
    componentType: module.componentType,
    wellKind: spec.kind === "source" ? undefined : spec.kind,
    enabledInWell,
    processSignal: module instanceof TransformNodeModule ? module.processSignal : undefined,
    createAudioUnit: module instanceof AudioNodeModule ? module.createAudioUnit : undefined,
    createData(overrides) {
      return {
        specType: spec.type,
        params: defaultParams(spec),
        title: spec.label,
        dataVersion: NODE_DATA_VERSION,
        ...overrides,
      };
    },
  };
}

const defs = ALL_NODE_MODULES.map(createDefinition);

const defsByType = new Map(defs.map((d) => [d.type, d]));

export function getNodeDefinition(type: string): NodeDefinition {
  const def = defsByType.get(type);
  if (!def) throw new Error(`unknown node definition: ${type}`);
  return def;
}

export interface WellGroup {
  kind: NodeWellKind;
  label: string;
  defs: NodeDefinition[];
}

export function getWellGroups(): WellGroup[] {
  return WELL_ORDER.map((kind) => {
    const defs = defsByType
      .values()
      .filter((d) => d.spec.kind === kind)
      .filter((d) => d.enabledInWell);
    return { kind, label: WELL_LABEL[kind], defs: [...defs] };
  }).filter((g) => g.defs.length > 0);
}
