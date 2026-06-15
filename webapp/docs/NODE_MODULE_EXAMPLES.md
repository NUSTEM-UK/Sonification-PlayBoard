# Node Module Examples

This guide shows one concrete example for each node type in the class-based node module system:

1. Source
2. Transform
3. Generator
4. Output

All examples live under src/lib/nodes/definitions and each file exports a single NODE_MODULE.

## Mental Model

A node module file owns:

1. Node spec metadata (label, params, handles, accent)
2. Optional signal behavior (transform nodes)
3. Optional audio behavior (generator/filter/output nodes)
4. UI type via class default (source, transform, audio)

The runtime dispatch points are:

1. Signal processing dispatch in src/lib/graph/tick.ts
2. Audio unit creation dispatch in src/lib/audio/engine.ts
3. Auto-discovery and validation in src/lib/nodes/definitions/index.ts

## 1) Source Example

File: src/lib/nodes/definitions/source.ts

```ts
import { ACCENT, type NodeSpec } from "../../graph/nodeSpec";
import { SourceNodeModule } from "../core";

const spec: NodeSpec = {
  type: "source",
  kind: "source",
  label: "Source",
  blurb: "A live sensor channel from the gateway.",
  accent: ACCENT.source,
  hasSignalOut: true,
  params: [],
};

export const NODE_MODULE = new SourceNodeModule(spec);
```

What it does:

1. Defines source identity and ports only.
2. Source values themselves are pulled from gateway state by the tick loop.

## 2) Transform Example

File: src/lib/nodes/definitions/rollingAvg.ts

```ts
import { ACCENT, type NodeSpec } from "../../graph/nodeSpec";
import { TransformNodeModule } from "../core";

const spec: NodeSpec = {
  type: "rollingAvg",
  kind: "transform",
  label: "Rolling average",
  blurb: "Smooths a signal by averaging the last N samples.",
  accent: ACCENT.transform,
  hasSignalIn: true,
  hasSignalOut: true,
  params: [{ key: "window", label: "Window", min: 1, max: 120, default: 12, step: 1, unit: "samples" }],
};

export const NODE_MODULE = new TransformNodeModule(spec, (input, params, ctx) => {
  const state = ctx.getState(() => ({ buf: [] as number[] }));
  const window = Math.max(1, Math.round(params.window ?? 12));
  state.buf.push(input);
  while (state.buf.length > window) state.buf.shift();
  return state.buf.reduce((a, b) => a + b, 0) / state.buf.length;
});
```

What to notice:

1. Transform logic is local to the node module file.
2. getState gives per-node persistent state without global maps in your node file.
3. clamp01 is available via ctx for bounded outputs when needed.

## 3) Generator Example

File: src/lib/nodes/definitions/drone.ts

```ts
import { ACCENT, type NodeSpec } from "../../graph/nodeSpec";
import { AudioNodeModule } from "../core";

const spec: NodeSpec = {
  type: "drone",
  kind: "generator",
  label: "Drone",
  blurb: "A sustained sawtooth tone - the spine of a pad.",
  accent: ACCENT.generator,
  hasAudioOut: true,
  params: [
    { key: "freq", label: "Pitch", min: 40, max: 400, default: 110, log: true, unit: "Hz", modulatable: true },
    { key: "level", label: "Level", min: 0, max: 1, default: 0.4, step: 0.01, modulatable: true },
  ],
};

export const NODE_MODULE = new AudioNodeModule(spec, (T, { ramp }) => {
  const osc = new T.Oscillator(110, "sawtooth").start();
  const out = new T.Gain(0.4);
  osc.connect(out);
  return {
    input: null,
    output: out,
    setParam(key, v) {
      if (key === "freq") ramp(osc.frequency, v);
      else if (key === "level") ramp(out.gain, v);
    },
    dispose() {
      osc.dispose();
      out.dispose();
    },
  };
});
```

What to notice:

1. The module owns Tone unit creation and parameter mapping.
2. ramp helper keeps control updates smooth.
3. Parameters marked modulatable can be driven by signal wires.

## 4) Output Example

File: src/lib/nodes/definitions/master.ts

```ts
import { ACCENT, type NodeSpec } from "../../graph/nodeSpec";
import { AudioNodeModule } from "../core";

const spec: NodeSpec = {
  type: "master",
  kind: "output",
  label: "Master out",
  blurb: "Everything that reaches here is heard. One per board.",
  accent: ACCENT.output,
  hasAudioIn: true,
  params: [{ key: "level", label: "Volume", min: 0, max: 1, default: 0.8, step: 0.01, modulatable: true }],
};

export const NODE_MODULE = new AudioNodeModule(spec, (T, { ramp }) => {
  const gain = new T.Gain(0.8).toDestination();
  return {
    input: gain,
    output: null,
    setParam(key, v) {
      if (key === "level") ramp(gain.gain, v);
    },
    dispose() {
      gain.dispose();
    },
  };
});
```

What to notice:

1. Output nodes are also AudioNodeModule instances.
2. output is null when the node terminates at destination.

## Quick Add-Node Checklist

1. Create a new file in src/lib/nodes/definitions.
2. Define spec with a unique type.
3. Export NODE_MODULE using SourceNodeModule, TransformNodeModule, or AudioNodeModule.
4. For transform nodes, implement process function.
5. For audio nodes, return input/output/setParam/dispose audio unit.
6. Run npm run check.

No central index edit is required because definitions are auto-discovered.
