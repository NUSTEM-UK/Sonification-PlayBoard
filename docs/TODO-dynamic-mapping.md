# TODO — dynamic mapping, ambient engine, mapping UI

> **⚠️ Superseded (2026-06-10) by the web app in [`../webapp/`](../webapp/).**
>
> The architecture below assumed a Python bridge + OSC + Sonic Pi, on the belief
> that *"browsers can't read serial and can't send OSC."* That constraint no
> longer holds: **Chrome's Web Serial API** lets the browser read the gateway
> directly, and **Tone.js** makes the sound in-page. So the whole chain collapses
> to two boxes — **micro:bit gateway → Chrome web app** — and the node-graph
> mapping UI, auto-discovery, live remapping, and calibration *are* the web app.
>
> What carried over: the **`src,chan,val` wire protocol** (unchanged), the
> **dumb-sources principle**, the **micro:bit gateway + source firmware**, and
> the idea of **ambient, quality-based** sonification. What changed: no Python,
> no OSC, no manifest (the app owns its parameters), and **calibration is in-app**
> (auto-range + a "recalibrate/wiggle" reset) rather than YAML ranges. The
> original Python/Sonic Pi code is preserved under [`../legacy/`](../legacy/).
>
> The notes below are kept for historical context only.

---

Working notes for the next phase. Captured at the end of a session so it can be
picked up cold (likely on a branch). This supersedes the vague "Stage 3/4" lines
in the top-level README roadmap once it lands.

## Goal

Move from *static, hand-edited* sensor→sound mapping toward a system that:

- **auto-discovers** which data sources exist (no hand-listing),
- **reads the playback engine's declared parameters** (no hand-listing),
- lets a user **assign sources → parameters** with **gain/scale** via a
  drag-and-drop / node-based UI,
- targets **ambient, quality-based sonification** rather than a recognisable
  tune (you listen for *change in character*, not melody).

## Current state (start line for the branch)

- **Stage 1 — done.** `bridge/` reads `mapping.example.yaml`, linearly scales,
  sends OSC; `FakeSource` + `SerialSource`; tests pass.
- **Stage 2 firmware — written, NOT yet tested on hardware.** `microbit/` has a
  hub + two sources emitting `src,chan,val` over radio→serial. **← you are
  testing this now.** Confirm real lines stream before building on top.
- The **`Rule` model** (`bridge/sonification_bridge/mapping.py`) already *is* the
  gain/scale primitive (linear `in → out`). The UI work edits these live; the
  data model mostly exists.
- The Sonic Pi sketches already carry header comments listing their OSC
  addresses + ranges — i.e. ~90% of a parameter manifest, just not yet machine-
  readable.

## DECIDE FIRST — the strategic fork

This choice shapes everything below; pin it before building the UI or you risk
building the value/OSC plumbing twice.

- [ ] **Decision: keep Sonic Pi, or move to Web Audio (Tone.js) later?**
  - **Keep Sonic Pi:** expressive, livecodable. But it *cannot self-describe its
    parameters* and *cannot report live state back* — so we need a manifest +
    OSC + a websocket for live values.
  - **Web Audio (later):** one app owns parameters, UI, and audio. Param
    declaration becomes trivial, no OSC, no serial-vs-browser mismatch, simplest
    deploy — at the cost of rebuilding the instrument and losing livecoding.
  - Near-term assumption for these notes: **keep Sonic Pi**, but keep the
    bridge's audio-output boundary clean so a Web-Audio engine could replace it.

## Hard constraints (don't design around these by accident)

- **"Web-based" ≠ in-browser.** Browsers can't reliably read USB serial and
  **cannot send UDP OSC at all**. So the shape is **Python backend (serial +
  OSC) + local web UI over a websocket** — not a browser-native app.
- **Sonic Pi won't advertise or report parameters.** Hence the manifest.
- **micro:bit radio strings cap at ~19 chars** — limits how much a source can
  self-declare in one packet. Keep declarations minimal.

## Work items (low-risk → high; roughly the build order)

### 0. Hardware checkpoint (in progress, you)
- [ ] Flash hub + source(s); confirm `src,chan,val` lines over serial @115200.
- [ ] Confirm `--source serial` drives a Sonic Pi sketch end-to-end.
- [ ] Note any firmware fixes back into `microbit/`.

### 1. Ambient sonification sketch
Independent of all tooling; clarifies what "parameters" even are.
- [ ] New `sonicpi/ambient.rb`: drone/pad/granular texture, no melody.
- [ ] Map continuous "quality" params: brightness/cutoff, density, detune/
      warmth, motion/rate, reverb depth, stereo width.
- [ ] Reuse the `ctl`/`clamp` + `get "/osc*/play/<name>"` convention.
- [ ] Keep `peter_gunn*.rb` as a fun demo preset, not the default.
- Acceptance: wiggling each OSC control audibly changes *character*, and it's
  pleasant to leave running.

### 2. Parameter manifest (engine → bridge)
- [ ] Define a format: a declarative param list — `name`, OSC address, range,
      default, human label, maybe a "feel" hint (e.g. log/linear).
- [ ] Decide carrier: sidecar file (`ambient.params.yaml`) **or** a formalised,
      parseable header block inside the `.rb`. (Header-as-manifest is elegant —
      the doc comment becomes the contract.)
- [ ] Bridge reads the manifest to enumerate assignable targets.
- Acceptance: bridge can list available parameters without hand-config.

### 3. Hot-reloadable mapping (headless, no UI yet)
- [ ] Make the rule set mutable + thread-safe (source thread reads, control
      thread writes).
- [ ] Apply mapping changes live, no restart.
- Acceptance: edit a rule at runtime and hear it take effect immediately.

### 4. Source & port auto-discovery
- [ ] Passive source enumeration: track recently-seen `(src, chan)` pairs +
      last-seen timestamps (liveness). The heartbeat already helps.
- [ ] Serial port autodetect (scan `/dev/tty.usbmodem*`), pick/confirm.
- [ ] (Optional) tiny source self-announce with units/range hints — weigh
      against the "dumb sources" principle and the 19-char radio limit.
- Acceptance: start the bridge with no `--port`/no source list and have it find
  the hub and report which sources are live.

### 5. Mapping UI (the big lift — last)
- [ ] Python backend serves a local web UI; websocket carries **live values
      down** and **remap edits up**.
- [ ] Node-graph editor (React Flow / Rete.js / LiteGraph) — sources on one
      side, engine params on the other, gain/scale nodes between.
- [ ] Gain/scale node = the existing linear `in → out`; later add invert,
      curve, smoothing, deadzone.
- [ ] **Calibration / auto-range:** learn a source's min/max from a "wiggle it
      now" gesture rather than naive running min/max (outliers!).
- [ ] Serialise the live graph back to the mapping config format.
- Acceptance: drag a source onto a parameter, set a range by wiggling the
  sensor, hear it map — with nothing hand-edited in YAML.

## Open questions
- Manifest: sidecar file vs. parseable header? (Lean: header-as-manifest.)
- Auto-range UX: explicit "calibrate" button vs. continuous adaptive scaling?
- How much should a micro:bit self-declare vs. stay dumb (passive discovery)?
- Mapping persistence format once edited live — keep YAML, or JSON for the UI?

## Principles to preserve
- **Dumb sources, smart bridge.** Self-declaration nibbles at this — do it
  consciously and minimally, not by drift.
- **Frozen wire protocol** (`docs/PROTOCOL.md`) so any stage stays swappable.
- **Small, independently testable modules.**
