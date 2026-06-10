# PlayBoard web app

In-browser sensor sonification. A node-graph UI where **live sensor channels**
(from a micro:bit serial gateway) are wired into an **ambient soundscape** built
from generators and filters. Everything runs in one Chrome tab — no Python, no
OSC, no Sonic Pi.

```text
[micro:bit sources] --radio--> [micro:bit gateway] --USB serial--> [ Chrome / this app ]
   sensors / pins                 radio → serial        Web Serial → nodes → Tone.js audio
```

## Run it

```bash
cd webapp
npm install
npm run dev        # opens on http://localhost:5173
```

Then in the app:

1. Click **🔊 Start audio** (browsers require a user gesture before sound).
2. Click **Mock data** to stream synthetic sensors with no hardware — or
   **Connect gateway** to pick the micro:bit's serial port (Chrome only).
3. Drag a channel from **Live sources** (left) onto the canvas.
4. Drag a **Generator** and the **Master out** from the **Components** well
   (right) onto the canvas. Connect generator → master (the green audio ports
   are on the top/bottom edges).
5. Drag from a source's right-hand port into a generator parameter's left-hand
   port to **modulate** it with the sensor. Twist the sensor and listen.

> Web Serial needs a secure context: `localhost` (dev/preview) or `https`. Use
> **Chrome** (or another Chromium browser). Firefox/Safari can still run mock
> mode.

## How it fits together

| Area | File | Role |
|---|---|---|
| Wire protocol | [`src/lib/serial/protocol.ts`](src/lib/serial/protocol.ts) | Parse `src,chan,val` lines (unchanged from the original project) |
| Gateway | [`src/lib/serial/gateway.svelte.ts`](src/lib/serial/gateway.svelte.ts) | Web Serial reader + mock generator; tracks channels and calibrates them to 0..1 |
| Node taxonomy | [`src/lib/graph/specs.ts`](src/lib/graph/specs.ts) | Every draggable node: params, handles, accent — one source of truth |
| Graph store | [`src/lib/graph/graph.svelte.ts`](src/lib/graph/graph.svelte.ts) | Nodes/edges bound into Svelte Flow; connection rules; edge classification |
| Signal tick | [`src/lib/graph/tick.ts`](src/lib/graph/tick.ts) | ~30 Hz loop: sources → transforms → parameter modulation |
| Runtime | [`src/lib/graph/runtime.ts`](src/lib/graph/runtime.ts) | Non-reactive per-node value + sparkline ring buffer |
| Audio engine | [`src/lib/audio/engine.ts`](src/lib/audio/engine.ts) | Reconciles the visual graph into a live Tone.js audio chain |
| UI | [`src/lib/components/`](src/lib/components/) | Toolbar, panels, canvas, and the three node components |

### Two kinds of wire

Connections carry one of two things, and the handle positions make it legible:

- **Signal** (control data, normalised `0..1`) — flows **left → right**. Emitted
  by sources and transforms; lands on a transform input or on a node
  **parameter** (where it becomes modulation). Thin, animated violet wires.
- **Audio** (actual sound) — flows **top → bottom**. Generator → filter →
  master out. Thick green wires.

Connections are validated so you can't cross the two (see `isValidConnection`).

### Where ranges come from

Sources stay **dumb** — the micro:bit emits raw integers. Each channel is
normalised to `0..1` *in the app* by an auto-expanding learned range, and a
**Recalibrate** button on the source node resets that range so you can "wiggle"
the sensor through its real travel and ignore earlier spikes. A `0..1` signal is
then mapped into a parameter's real range when it modulates (log-aware, so pitch
and cutoff sweep musically).

### Node palette

- **Transforms** (signal → signal, with a sparkline): rolling average, smooth
  (glide), rate of change, scale & offset.
- **Generators** (make sound): drone, warm pad, noise wash.
- **Filters** (shape sound): low-pass, reverb, echo.
- **Output**: master out (one per board).

## Build for the classroom

```bash
npm run build      # static bundle in dist/ — serve over https, or run `npm run preview`
```

The whole thing is a static SPA: host `dist/` anywhere that serves over `https`
(Web Serial requirement) and a class can open it in Chrome.
