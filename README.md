# Sonification-PlayBoard

A modular playground for **data sonification**: simple sensors drive live,
expressive audio. Built as a public-engagement proof-of-concept, with schools
(and micro:bits) as a primary target audience.

The system is a chain of small, swappable parts joined by one tiny
[wire protocol](docs/PROTOCOL.md). Freeze the protocol, and any stage can be
replaced without touching the others.

```text
[micro:bit sources] --radio--> [micro:bit sink] --USB serial--> [bridge.py] --OSC--> [Sonic Pi]
   sensors / pins / JacDac        radio -> serial      protocol -> mapping -> OSC      live music
```

## Status: Stage 1 complete (software path)

The whole software chain works **with no hardware**, driven by a synthetic data
source, so the seams are proven before any micro:bit is flashed.

```bash
cd bridge
uv sync
uv run sonification-bridge --config config/mapping.example.yaml --dry-run -v
```

That prints scaled OSC messages. Drop `--dry-run`, open
[sonicpi/peter_gunn.rb](sonicpi/peter_gunn.rb) in Sonic Pi and hit Run, and the
synthetic sensors modulate the music live.

### What's here

| Path | What it is |
|---|---|
| [docs/PROTOCOL.md](docs/PROTOCOL.md) | The `src,chan,val` wire protocol — the contract every stage shares |
| [bridge/](bridge/) | Python (uv) bridge: data source → mapping → OSC. See its [README](bridge/README.md) |
| [bridge/config/mapping.example.yaml](bridge/config/mapping.example.yaml) | The remappable sensor→sound mapping (edit this, no re-flash) |
| [sonicpi/peter_gunn.rb](sonicpi/peter_gunn.rb) | Sonic Pi sketch: *Peter Gunn* with live filter / reverb / mix control |
| [microbit/](microbit/) | MakeCode firmware: radio→serial hub + sensor sources. See its [README](microbit/README.md) |

## Roadmap

- **Stage 1 — software path (done):** protocol, bridge, mapping config, Sonic Pi sketch, fake source, tests.
- **Stage 2 — first hardware (firmware done):** MakeCode micro:bit **hub** (radio→serial) + **sources** (built-in light/accel, and pot/flex on pins) in [microbit/](microbit/); swap the fake source for `--source serial`. Flash/wiring notes in its README. *Remaining: flash to real hardware and confirm end-to-end.*
- **Stage 3 — mesh + external sensors:** more source micro:bits (pot / LDR / flex on pins), JacDac source, shared radio group.
- **Stage 4 — prove modularity:** Bare Conductive Touch Board and/or ESP32 emitting the *same* protocol; live remapping UX.

## Design principles

- **Dumb sources, smart bridge.** Devices broadcast raw numbers; all *meaning*
  (ranging, scaling, what-controls-what) lives in the bridge's config.
- **Small modules.** Each piece does one thing and is independently testable.
- **Classroom-hackable.** micro:bit sources are authored as **MakeCode blocks**;
  the mapping is plain YAML; the Mac side is Python managed with **uv**.
