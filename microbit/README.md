# micro:bit firmware (Stage 2)

The hardware end of the chain: small MakeCode programs that turn micro:bits into
**sensor sources** and one **radio→serial hub**, all speaking the project
[wire protocol](../docs/PROTOCOL.md).

```text
[source micro:bits] --radio--> [hub micro:bit] --USB serial--> [bridge.py] --OSC--> [Sonic Pi]
  read sensors, tag &              relay each line              scale & map
  broadcast a protocol line        verbatim to serial           to /play/*
```

Each source reads its sensors, tags every reading with its own `src` id and a
`chan` name, and broadcasts the finished protocol line (`src,chan,val`) over
radio. The hub does no thinking at all — it just copies whatever arrives on the
radio straight out to USB serial. All *meaning* (ranging, scaling, what controls
what) still lives in the bridge's [mapping config](../bridge/config/mapping.example.yaml).

## The programs

| File | Role | Sensors → channels | `src` |
|---|---|---|---|
| [hub_sink.ts](hub_sink.ts) | Hub / sink (plugs into the Mac) | — relays everything — | — |
| [source_1_light_accel.ts](source_1_light_accel.ts) | Source, built-in sensors | `light` (0–255), `accel_x` (±1024) | `1` |
| [source_2_pot_flex.ts](source_2_pot_flex.ts) | Source, analogue pins | `pot` (P0), `flex` (P1) | `2` |

The `src`/`chan` pairs above line up exactly with the rules in the example
mapping, so source 1 drives the bass filter + reverb and source 2 drives the
brass + drum levels.

## Two rules that must hold

1. **Same radio group.** Every micro:bit here sets `RADIO_GROUP = 7`. They only
   hear each other if the numbers match — change one, change them all.
2. **`SRC` matches the mapping.** A source's `SRC` is how the bridge knows which
   device it is. If you change `SRC` in a source, change the matching `src:` in
   the mapping YAML (or vice-versa).

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
2. Plug the **hub** into the Mac. It shows ✓ briefly, then a centre LED blinks
   on each relayed message.
3. Find the hub's serial port and start the bridge against it:

   ```bash
   ls /dev/tty.usbmodem*            # find the port
   cd bridge
   uv run sonification-bridge --config config/mapping.example.yaml \
       --source serial --port /dev/tty.usbmodemXXXX -v
   ```

   `-v` prints every mapped OSC message, so you can confirm sensor wiggles are
   getting through. Open a Peter Gunn sketch in Sonic Pi, hit Run, and the
   sensors modulate the music live.

## Sanity-checking without the bridge

Any serial monitor at **115200 baud** (the Arduino IDE, `screen`, or MakeCode's
own serial console) will show the raw lines streaming from the hub:

```
# hub alive, group 7
1,light,142
1,accel_x,-37
2,pot,880
2,flex,512
```

The `#` line is the hub's heartbeat — the protocol treats `#` lines as comments
and ignores them, so a quiet sensor still proves the link is up.

## Notes / gotchas

- **Radio string limit.** A `radio.sendString` payload is capped at ~19
  characters. Our longest line, `1,accel_x,-1024`, is 15 — fine — but keep new
  channel names short if you add sensors.
- **`accel_x` range.** The accelerometer reports milli-g and can briefly exceed
  ±1024 under a sharp knock; the mapping's input range assumes ±1024 and Sonic
  Pi clamps the result, so spikes just saturate rather than misbehave.
- **More sources.** Copy a source program, give it a new `SRC`, add matching
  rules to the mapping YAML. The hub and bridge need no changes.
