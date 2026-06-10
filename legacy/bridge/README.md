# sonification-bridge

Reads sensor data (synthetic, or real lines from a USB serial port) and emits
OSC control messages to Sonic Pi. Managed with [uv](https://docs.astral.sh/uv/).

## Setup

```bash
cd bridge
uv sync                 # create .venv and install deps (incl. dev/pytest)
```

## Run

Synthetic data (no hardware) into Sonic Pi:

```bash
uv run sonification-bridge --config config/mapping.example.yaml
```

Watch what it would send, without the network:

```bash
uv run sonification-bridge --config config/mapping.example.yaml --dry-run -v
```

Read a real micro:bit sink (Stage 2):

```bash
uv run sonification-bridge --config config/mapping.example.yaml \
    --source serial --port /dev/tty.usbmodem1402
```

## Test

```bash
uv run pytest
```

## Layout

| Module        | Responsibility                                   |
|---------------|--------------------------------------------------|
| `protocol.py` | parse/format the `src,chan,val` wire protocol    |
| `mapping.py`  | scale raw readings to OSC via config rules       |
| `sources.py`  | fake generator + serial reader                   |
| `osc_sender.py` | python-osc wrapper (+ dry-run printer)         |
| `bridge.py`   | the read -> map -> send loop                     |
| `cli.py`      | argument parsing / entry point                   |

The protocol is specified in [../docs/PROTOCOL.md](../docs/PROTOCOL.md).
