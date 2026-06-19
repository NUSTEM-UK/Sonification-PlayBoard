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

## End-to-End Data Flow

This section explains where values come from, how they are transformed, and where they end up.

### Signal Path (control data)

1. Source samples are read in src/lib/graph/tick.ts from gateway channel state.
2. The source value is normalized to 0..1 and stored as that source node's current runtime value.
3. Transform nodes are evaluated by calling each transform module's process function.
4. Transform outputs are also stored as runtime values and can feed other transforms.
5. Any signal edge connected to a param handle (param:key) is mapped into that parameter's real range.
6. Mapped values are sent to audioEngine.setParam, which updates the live Tone unit.

### Audio Path (sound)

1. Audio node instances are detected in src/lib/audio/engine.ts during graph sync.
2. For each audio node type, the engine asks the node definition for createAudioUnit.
3. The unit returns an input/output pair and setParam/dispose methods.
4. Audio edges are rewired from output -> input for the current graph.
5. Output nodes route to destination (for example master gain to speakers).

### Why the engine still matters

The engine is now an orchestrator, not the place where node behavior is authored.

1. Node-specific DSP setup lives in each node module file.
2. The engine handles lifecycle: create, connect, update params, dispose.
3. This keeps graph-level concerns centralized while node behavior stays local.

## 1) Source Example

File: src/lib/nodes/definitions/source.ts

```ts
import { ACCENT, type NodeSpec } from "../../graph/nodeSpec";
import { SourceNodeModule } from "../core";

// Spec describes identity and wiring affordances shown in the UI.
const spec: NodeSpec = {
  // Stable key used by graph serialization and registry lookup.
  type: "source",
  kind: "source",
  label: "Source",
  blurb: "A live sensor channel from the gateway.",
  accent: ACCENT.source,
  // Source nodes only emit signal data.
  hasSignalOut: true,
  // No user parameters on the base source node.
  params: [],
};

// Source behavior is handled by the tick loop reading gateway channel values.
// This module mainly declares node shape and category.
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

// Transform spec defines handles + configurable parameters.
const spec: NodeSpec = {
  type: "rollingAvg",
  kind: "transform",
  label: "Rolling average",
  blurb: "Smooths a signal by averaging the last N samples.",
  accent: ACCENT.transform,
  // Signal enters on the left and leaves on the right.
  hasSignalIn: true,
  hasSignalOut: true,
  // Window controls averaging horizon.
  params: [{ key: "window", label: "Window", min: 1, max: 120, default: 12, step: 1, unit: "samples" }],
};

export const NODE_MODULE = new TransformNodeModule(spec, (input, params, ctx) => {
  // Per-node persistent memory for this transform instance.
  const state = ctx.getState(() => ({ buf: [] as number[] }));

  // Read current parameter value (with fallback if missing).
  const window = Math.max(1, Math.round(params.window ?? 12));

  // Update local history buffer.
  state.buf.push(input);
  while (state.buf.length > window) state.buf.shift();

  // Return this tick's transformed signal.
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

// Generator spec: no audio input, one audio output.
const spec: NodeSpec = {
  type: "drone",
  kind: "generator",
  label: "Drone",
  blurb: "A sustained sawtooth tone - the spine of a pad.",
  accent: ACCENT.generator,
  hasAudioOut: true,
  params: [
    // modulatable means signal wires may drive this parameter.
    { key: "freq", label: "Pitch", min: 40, max: 400, default: 110, log: true, unit: "Hz", modulatable: true },
    { key: "level", label: "Level", min: 0, max: 1, default: 0.4, step: 0.01, modulatable: true },
  ],
};

export const NODE_MODULE = new AudioNodeModule(spec, (T, { ramp }) => {
  // Build Tone graph for one node instance.
  const osc = new T.Oscillator(110, "sawtooth").start();
  const out = new T.Gain(0.4);
  osc.connect(out);

  // Return unit contract consumed by audio engine lifecycle.
  return {
    // Pure generator has no external audio input.
    input: null,
    // Audio leaves from this node to downstream filters/outputs.
    output: out,

    // Engine calls this when sliders or modulation update a parameter.
    setParam(key, v) {
      if (key === "freq") ramp(osc.frequency, v);
      else if (key === "level") ramp(out.gain, v);
    },

    // Engine calls this when node is deleted or topology changes.
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

// Output spec: receives audio and terminates chain at speakers.
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
  // Final gain stage patched to destination.
  const gain = new T.Gain(0.8).toDestination();
  return {
    // Output node consumes upstream audio.
    input: gain,
    // No outgoing audio socket from final destination node.
    output: null,

    // Supports modulation/slider updates for output level.
    setParam(key, v) {
      if (key === "level") ramp(gain.gain, v);
    },

    // Release Tone resources when graph removes this node.
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

## Typical Modification Patterns

### Change how a transform computes

1. Edit only that transform file in src/lib/nodes/definitions.
2. Update the process function body.
3. Keep parameters and behavior in the same file to avoid drift.

### Add a new generator parameter

1. Add ParamSpec entry in the same node's spec.params list.
2. Handle it in setParam in the same file.
3. If modulatable is true, it can be wired from any signal source.

### Troubleshooting Data Flow

1. No sound from generator path:
- Check hasAudioOut on generator and hasAudioIn on downstream node.
- Confirm output node exists and receives audio edge.
2. Signal modulation not affecting parameter:
- Confirm param key matches setParam branch exactly.
- Confirm param uses modulatable: true.
- Confirm edge targets param:key handle.
