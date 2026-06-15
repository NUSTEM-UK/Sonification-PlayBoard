import type * as Tone from "tone";
import type { NodeKind, NodeSpec } from "../graph/nodeSpec";

export type NodeComponentType = "source" | "transform" | "audio";

export interface NodeUiDefinition {
  componentType: NodeComponentType;
}

export interface TransformRuntimeContext {
  getState<T>(init: () => T): T;
  clamp01(value: number): number;
}

export type TransformProcessor = (
  input: number,
  params: Record<string, number>,
  ctx: TransformRuntimeContext,
) => number;

export interface AudioUnit {
  input: Tone.ToneAudioNode | null;
  output: Tone.ToneAudioNode | null;
  setParam(key: string, value: number): void;
  dispose(): void;
}

export interface AudioHelpers {
  ramp(target: Tone.Signal<any> | Tone.Param<any>, value: number): void;
}

export type AudioUnitFactory = (
  tone: typeof import("tone"),
  helpers: AudioHelpers,
) => AudioUnit;

export abstract class NodeModuleBase {
  readonly ui: NodeUiDefinition;

  constructor(
    public readonly spec: NodeSpec,
    public readonly enabledInWell = true,
    ui?: Partial<NodeUiDefinition>,
  ) {
    this.ui = {
      componentType: this.defaultComponentType(),
      ...ui,
    };
  }

  get type(): string {
    return this.spec.type;
  }

  get kind(): NodeKind {
    return this.spec.kind;
  }

  get componentType(): NodeComponentType {
    return this.ui.componentType;
  }

  private defaultComponentType(): NodeComponentType {
    if (this.kind === "source") return "source";
    if (this.kind === "transform") return "transform";
    return "audio";
  }
}

export class SourceNodeModule extends NodeModuleBase {
  constructor(spec: NodeSpec) {
    super(spec, false);
  }
}

export class TransformNodeModule extends NodeModuleBase {
  constructor(
    spec: NodeSpec,
    public readonly processSignal: TransformProcessor,
    enabledInWell = true,
  ) {
    super(spec, enabledInWell);
  }
}

export class AudioNodeModule extends NodeModuleBase {
  constructor(
    spec: NodeSpec,
    public readonly createAudioUnit: AudioUnitFactory,
    enabledInWell = true,
  ) {
    super(spec, enabledInWell);
  }
}

export type NodeModule = SourceNodeModule | TransformNodeModule | AudioNodeModule;
