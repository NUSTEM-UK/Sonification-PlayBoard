import type { NodeKind, NodeSpec } from "../../graph/nodeSpec";
import type { NodeModule } from "../core";

interface DefinitionFileModule {
  NODE_MODULE?: NodeModule;
}

const KIND_RANK: Record<NodeKind, number> = {
  source: 0,
  transform: 1,
  generator: 2,
  filter: 3,
  output: 4,
};

const modules = import.meta.glob<DefinitionFileModule>("./*.ts", { eager: true });

const discoveredModules = Object.entries(modules)
  .filter(([path]) => !path.endsWith("/index.ts"))
  .map(([path, mod]) => {
    if (!mod.NODE_MODULE) {
      throw new Error(`Node definition module missing NODE_MODULE export: ${path}`);
    }
    return mod.NODE_MODULE;
  });

const uniqueTypes = new Set(discoveredModules.map((m) => m.type));
if (uniqueTypes.size !== discoveredModules.length) {
  throw new Error("Duplicate node type found in node definitions.");
}

const sourceModules = discoveredModules.filter((m) => m.type === "source");
if (sourceModules.length !== 1) {
  throw new Error(`Expected exactly one live source node module, found ${sourceModules.length}.`);
}

export const SOURCE_NODE_MODULE = sourceModules[0];
export const RECORDED_SOURCE_NODE_MODULE = discoveredModules.find((m) => m.type === "recordedSource");

if (!RECORDED_SOURCE_NODE_MODULE) {
  throw new Error("Expected a recordedSource node module, but none was found.");
}

export const PALETTE_NODE_MODULES: NodeModule[] = discoveredModules
  .filter((m) => m.kind !== "source")
  .sort((a, b) => {
    const kindCmp = KIND_RANK[a.kind] - KIND_RANK[b.kind];
    if (kindCmp !== 0) return kindCmp;
    return a.spec.label.localeCompare(b.spec.label);
  });

export const ALL_NODE_MODULES: NodeModule[] = [...PALETTE_NODE_MODULES, SOURCE_NODE_MODULE, RECORDED_SOURCE_NODE_MODULE];

export const SOURCE_SPEC: NodeSpec = SOURCE_NODE_MODULE.spec;
export const PALETTE_SPECS: NodeSpec[] = PALETTE_NODE_MODULES.map((m) => m.spec);
export const ALL_NODE_SPECS: NodeSpec[] = ALL_NODE_MODULES.map((m) => m.spec);
