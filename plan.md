## Classroom Sonification Refactor Plan

Refactor to a plugin-style node architecture first, then deliver high-value classroom features in dependency order: configurable node registry, richer source panels (live + recorded), expanded transform/generator/output nodes, and robust save/load. Prioritize reliability and extensibility for rapid node iteration, with CSV-first data ingest and exportable graph files before local persistence.

### 1. Foundation and Node Architecture

1. Define a node module contract and registry system so each node is represented by a colocated logic + UI module pair.
2. Introduce a root node view/model abstraction to standardize shared behavior (title bar, controls, handles, sparkline/value panel, mute/solo support where applicable).
3. Replace hardcoded palette/spec arrays with registry-driven categories and feature flags for node-well exposure.
4. Refactor graph/audio integration to consume registry metadata instead of type switch statements.
5. Add migration-safe node type identifiers and a schema version field for future preset compatibility.

### 2. Source System (Left Panel)

1. Convert the source panel to a tabbed source catalog with Live Sources and Recorded Sources tabs.
2. Keep existing micro:bit live source behavior intact under Live Sources.
3. Implement a recorded data model supporting multichannel datasets with unified timeline/index.
4. Build CSV import pipeline for recorded datasets with validation (headers, numeric columns, missing values, units labels).
5. Add recorded dataset source nodes that can emit multiple outputs (for example, mean temperature plus CO2 ppm).
6. Add playback controls for recorded sources (play/pause, rate, scrub, loop range) integrated into the tick loop.

### 3. Node Catalog and Audio Capabilities (Right Panel)

1. Rework component grouping to Transform, Generator, Output sections.
2. Add transform nodes:
- Invert transform (input inversion around center).
- Quantizer transform with configurable outputs (start with pentatonic presets and root).
- More musical scale mapping (octave span and base note replacing opaque scale/offset behavior).
3. Expand baseline generator affordances with sine, square, and sawtooth waveforms.
4. Add generator-level mute and solo controls with deterministic graph-wide behavior.
5. Add multiple output nodes (without full bus complexity), each with level, stereo pan, and optional revealable effects (start with reverb controls).
6. Define clear mute/solo and multi-output resolution rules.

### 4. Save/Load and Project Interchange

1. Define a versioned project schema for nodes, edges, params, UI state, source bindings, and recorded dataset references.
2. Implement file export/import first.
3. Implement local browser persistence second (autosave + named projects).
4. Add non-fatal validation/recovery UX for invalid or partial imports.

### 5. Visual Comprehension and Teaching UX

1. Standardize waveform/sparkline widgets and apply to most nodes where meaningful.
2. Preserve and enhance animated connecting lines with clearer signal versus audio semantics and accessibility-safe contrast.
3. Add compact/default and expanded/advanced node inspector modes.

### 6. Classroom Readiness Hardening

1. Define performance budgets (node count, tick stability, animation load, audio dropouts).
2. Add safety rails (parameter clamping, output limits, startup safety state).
3. Add reliability features (undo/redo, autosave checkpoints, crash-safe restore).
4. Add classroom operations features (starter templates, reset-to-known-good state, read-only demo mode).
5. Publish teacher quickstart, student activity examples, and dataset format guide.

## Verification

1. Unit tests for transform math (invert, quantizer, octave mapping) and CSV parser edge cases.
2. Integration tests for graph serialization round-trip (export then import preserves topology and params).
3. Audio integration checks for mute/solo and multi-output behavior under graph edits.
4. Manual classroom scenario checks for live sources, recorded import/playback, mixed workflows, and save/load recovery.
5. Performance validation under target classroom graph sizes.

## Key Implementation Areas

- webapp/src/lib/graph/specs.ts
- webapp/src/lib/graph/graph.svelte.ts
- webapp/src/lib/graph/runtime.ts
- webapp/src/lib/graph/tick.ts
- webapp/src/lib/audio/engine.ts
- webapp/src/lib/components/SourcesPanel.svelte
- webapp/src/lib/components/ComponentWell.svelte
- webapp/src/lib/components/Canvas.svelte
- webapp/src/lib/components/nodes/SourceNode.svelte
- webapp/src/lib/components/nodes/TransformNode.svelte
- webapp/src/lib/components/nodes/AudioNode.svelte
- webapp/src/lib/components/Toolbar.svelte
- webapp/src/App.svelte

## Decisions Recorded

- MVP priority: reliability and core architecture first.
- Recorded datasets in v1: CSV only.
- Save/load sequencing: file export/import first, local storage second.
- Node packaging model: colocated per-node logic + UI module pairs.
