# micro:bit firmware

The hardware end of the chain: small MakeCode programs that turn micro:bits into
**sensor sources** and one **radio→serial gateway**, all speaking the project
[wire protocol](../docs/PROTOCOL.md).

```text
[source micro:bits] --radio--> [gateway micro:bit] --USB serial--> [ Chrome web app ]
  read sensors, tag &              relay each line          Web Serial → nodes → audio
  broadcast a protocol line        verbatim to serial
```

Each source reads its sensors, tags every reading with its own `src` id and a
`chan` name, and broadcasts the finished protocol line (`src,chan,val`) over
radio. The gateway does no thinking at all — it just copies whatever arrives on
the radio straight out to USB serial. All *meaning* (ranging, scaling, what
controls what) lives in the [web app](../webapp/).

> The firmware is unchanged from the original Sonic Pi build — the box once
> labelled "hub / sink" is now the "gateway", but its job (relay radio →
> serial, verbatim) is identical. [`hub_sink.ts`](hub_sink.ts) keeps its name.

## The programs

| File | Role | Sensors → channels | `src` |
|---|---|---|---|
| [hub_sink.ts](hub_sink.ts) | Gateway (plugs into the computer) | — relays everything — | — |
| [source_1_light_accel.ts](source_1_light_accel.ts) | Source, built-in sensors | `light` (0–255), `accel_x` (±1024) | `1` |
| [source_2_pot_flex.ts](source_2_pot_flex.ts) | Source, analogue pins | `pot` (P0), `flex` (P1) | `2` |

Each `src/chan` pair shows up as a draggable **Live source** in the web app
(e.g. `1/light`, `2/pot`), so there is nothing to hand-configure — connect the
gateway and the channels appear.

## Two rules that must hold

1. **Same radio group.** Every micro:bit here sets `RADIO_GROUP = 7`. They only
   hear each other if the numbers match — change one, change them all.
2. **`SRC` is the device's identity.** A source's `SRC` is the name you'll see
   in the app's source list. Give each source a distinct `SRC`; the value is
   free-form (`[A-Za-z0-9_]`).

## Flashing

These are written in MakeCode's JavaScript so they paste cleanly:

1. Open <https://makecode.microbit.org> → **New Project**.
2. Switch the editor from **Blocks** to **JavaScript** (top toggle).
3. Replace everything with the contents of one `.ts` file here.
4. **Download** the `.hex` and drag it onto the `MICROBIT` USB drive.
5. Repeat for each micro:bit (one hub, one or more sources).

Flipping back to **Blocks** works too — the JavaScript round-trips, so students
can tinker with the block view after flashing.

## Wiring source 2

Both pins are read with `analogReadPin` (0–1023), so each sensor is just a
voltage divider to the big edge pads (use crocodile clips):

- **Potentiometer** → outer legs to **3V** and **GND**, wiper (middle) to **P0**.
- **Flex sensor** → flex sensor and a ~47 kΩ fixed resistor in series between
  **3V** and **GND**; read their **junction on P1**.

Source 1 needs no wiring — it uses the on-board light sensor (the LED matrix)
and accelerometer.

## Running it

1. Power the source micro:bit(s) (battery or USB). The top-left LED flickers as
   they broadcast.
2. Plug the **gateway** into the computer. It shows ✓ briefly, then a centre LED
   blinks on each relayed message.
3. Open the [web app](../webapp/) in **Chrome**, click **Connect gateway**, and
   pick the micro:bit's serial port. Each live channel appears in the **Live
   sources** panel — drag one onto the canvas and wire it into a sound.

## Sanity-checking without the app

Any serial monitor at **115200 baud** (the Arduino IDE, `screen`, or MakeCode's
own serial console) will show the raw lines streaming from the gateway:

```
# hub alive, group 7
1,light,142
1,accel_x,-37
2,pot,880
2,flex,512
```

The `#` line is the gateway's heartbeat — the protocol treats `#` lines as
comments and ignores them, so a quiet sensor still proves the link is up.

## Notes / gotchas

- **Radio string limit.** A `radio.sendString` payload is capped at ~19
  characters. Our longest line, `1,accel_x,-1024`, is 15 — fine — but keep new
  channel names short if you add sensors.
- **`accel_x` range.** The accelerometer reports milli-g and can briefly exceed
  ±1024 under a sharp knock. The app learns each channel's range and clamps the
  normalised result, so spikes just saturate; hit **Recalibrate** on the source
  node if a stray knock has stretched the range.
- **More sources.** Copy a source program and give it a new `SRC`. It shows up
  in the app's source list automatically — the gateway needs no changes.
