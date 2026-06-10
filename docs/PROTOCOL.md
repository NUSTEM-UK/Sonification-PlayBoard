# Wire protocol

The whole system is held together by one deliberately tiny protocol. Freeze
this, and every stage becomes swappable: a micro:bit, a Touch Board, or an
ESP32 can all act as a data source as long as they emit these lines, and Sonic
Pi never needs to know which.

## Transport

Newline-delimited ASCII over USB serial.

- Default baud: **115200**
- Line terminator: `\n` (a trailing `\r` is tolerated)
- Encoding: ASCII / UTF-8

## Line format

```
src,chan,val
```

| Field  | Type            | Meaning                                          | Examples            |
|--------|-----------------|--------------------------------------------------|---------------------|
| `src`  | short string    | Which device produced the reading                | `1`, `acc`, `bcond` |
| `chan` | short string    | Which sensor / channel on that device            | `light`, `accel_x`  |
| `val`  | integer / float | The raw sensor value (units are the device's)    | `128`, `-512`, `0.7`|

Rules:

- Fields are separated by a single comma. No spaces required (spaces are trimmed).
- `src` and `chan` are `[A-Za-z0-9_]`.
- `val` is parsed as `int` if possible, otherwise `float`.
- Lines beginning with `#` are comments / heartbeats and are ignored.
- Blank or malformed lines are ignored (the bridge logs them in verbose mode).

### Examples

```
# source 1 = a micro:bit reading its built-in light sensor
1,light,128
1,accel_x,-204
2,pot,873
acc,temp,21
```

## Why raw values, not normalised?

Sources stay dumb: a micro:bit just reads a sensor and broadcasts the number it
got. All scaling, ranging, and *meaning* live in the bridge's mapping config
([../bridge/config/mapping.example.yaml](../bridge/config/mapping.example.yaml)).
That keeps the firmware trivial (good for the classroom) and makes "what does
this knob control?" a config edit, not a re-flash.

## micro:bit sink reference (Stage 2)

Implemented in [../microbit/](../microbit/). The scheme keeps the **sink dumb**:

- Each **source** micro:bit builds the whole protocol line itself, tagging the
  reading with its own `src` id and a `chan` name, and broadcasts it over radio
  as a string: `radio.sendString("1,light,142")`.
- The **hub / sink** relays each received string straight to USB serial,
  verbatim — no parsing, no reassembly:

  ```javascript
  radio.onReceivedString(received => serial.writeLine(received))
  ```

So the bytes on the wire are exactly the `src,chan,val` lines above. Building the
line on the source (rather than sending a `radio.sendValue` name/value pair and
reconstructing `src` from the sender's serial number) keeps `src` a friendly,
human-set id that matches the mapping config directly.

Radio strings are capped at ~19 characters, so keep `chan` names short.
