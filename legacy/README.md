# Legacy: Python bridge + Sonic Pi

This is the **original** PlayBoard software path, kept for reference. It is
**superseded** by the in-browser [web app](../webapp/) and is no longer the
recommended way to run the project.

```text
[micro:bit gateway] --USB serial--> [bridge.py] --OSC--> [Sonic Pi]
        the same protocol            scale & map         live music
```

- [`bridge/`](bridge/) — Python (uv) bridge: reads `src,chan,val` over serial,
  linearly scales via a YAML mapping config, sends OSC. Tests live here too.
- [`sonicpi/`](sonicpi/) — Sonic Pi sketches (the *Peter Gunn* demos) that read
  the OSC addresses the bridge emits.

## Why it was retired

Chrome's **Web Serial API** lets the browser read the gateway directly, and
**Tone.js** synthesises sound in-page — so the bridge, OSC, and Sonic Pi are no
longer needed. The new app also owns its own parameters (no manifest) and
calibrates sources in-app (no YAML ranges). See the banner in
[../docs/TODO-dynamic-mapping.md](../docs/TODO-dynamic-mapping.md) for the full
rationale.

## What carried forward

The **`src,chan,val` wire protocol** ([../docs/PROTOCOL.md](../docs/PROTOCOL.md))
and the **micro:bit firmware** ([../microbit/](../microbit/)) are unchanged — the
web app reads the very same serial lines this bridge did.

It still runs if you want it: `cd bridge && uv sync && uv run sonification-bridge
--config config/mapping.example.yaml --dry-run -v`.
