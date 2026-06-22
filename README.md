# Sonification-PlayBoard

A modular playground for **data sonification**, lashed together as a demo/proof-of-concept project for [Sonic Intangibles](https://sonicintangibles.github.io/) with the intention of exploring its use for public engagement work.

Core features, at time of writing:

- A browser-native, node-graph soundscape builder (Svelte + Tone.js)
- A micro:bit gateway that relays radio sensor readings from networked micro:bits to the browser, over USB serial
- Basic support for CSV saved data sources
- Basic generators (some of which sound... not entirely awful), data manipulation/transformation, and audio filter nodes
- Automatic range normalisation for input sources

![Screenshot of the web app, showing a node graph with a few nodes and connections, and a sidebar with controls for the selected node](docs/img/Playboard-screenshot.png)

Playboard is available for use at [playboard.nustem.uk](https://playboard.nustem.uk/), and the code is open source under the MIT License.

This collapses the original four-box chain (micro:bit → bridge.py → OSC → Sonic
Pi) down to two: there is no Python bridge, no OSC, and no Sonic Pi. Chrome's
**Web Serial API** lets the browser read the gateway directly, and **Tone.js**
makes the sound in-page.

## Quick start

```bash
cd webapp
npm install
npm run dev
```

Open the printed `localhost` URL in **Chrome**, click **🔊 Start audio**, then
**Mock data** to play with synthetic sensors (no hardware needed). Full
walkthrough — connecting real hardware, building a soundscape, calibration — is
in [webapp/README.md](webapp/README.md).

## What's here

| Path | What it is |
| --- | --- |
| [webapp/](webapp/) | The app: Svelte + Vite SPA, Svelte Flow node canvas, Tone.js soundscape, Web Serial gateway. **Start here.** |
| [docs/PROTOCOL.md](docs/PROTOCOL.md) | The `src,chan,val` wire protocol — still the contract every source shares |
| [microbit/](microbit/) | MakeCode firmware: the radio→serial **gateway** ([`hub_sink.ts`](microbit/hub_sink.ts)) + sensor **sources** |
| [legacy/](legacy/) | The original Python bridge + Sonic Pi sketches, kept for reference. Superseded by the web app. |
| [docs/TODO-dynamic-mapping.md](docs/TODO-dynamic-mapping.md) | Earlier roadmap notes — **superseded** by the web app (see the banner at its top) |

## The idea, in one breath

Sensors emit **raw numbers** (dumb sources). The web app **discovers** each
channel, **normalises** it to `0..1` with in-app calibration, and lets you wire
it — by dragging — into the **parameters** of an ambient soundscape you assemble
from generators and filters. You listen for a *change in character*, not a tune.

## Design principles

- **Dumb sources, smart app.** Devices broadcast raw numbers; all *meaning*
  (ranging, scaling, what-controls-what) lives in the web app.
- **One frozen wire protocol** ([docs/PROTOCOL.md](docs/PROTOCOL.md)) so any
  source — micro:bit, Touch Board, ESP32 — is swappable.
- **Two boxes, classroom-deployable.** A micro:bit gateway and a Chrome tab.
- **Small modules.** Each piece does one thing; see [webapp/README.md](webapp/README.md).

## Hardware path

The micro:bit firmware in [microbit/](microbit/) is unchanged and still
correct: **source** micro:bits broadcast `src,chan,val` over radio, and the
**gateway** ([`hub_sink.ts`](microbit/hub_sink.ts)) relays those lines verbatim
to USB serial. Plug the gateway into the computer and click **Connect gateway**
in the app. Flashing and wiring notes are in [microbit/README.md](microbit/README.md).
