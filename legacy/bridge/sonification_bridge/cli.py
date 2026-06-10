"""Command-line entry point for the sonification bridge.

Examples
--------
Run with synthetic data (no hardware) into Sonic Pi:

    python -m sonification_bridge --config config/mapping.example.yaml

See what would be sent, without touching the network:

    python -m sonification_bridge --config config/mapping.example.yaml --dry-run

Read a real micro:bit sink on a serial port:

    python -m sonification_bridge --config config/mapping.example.yaml \
        --source serial --port /dev/tty.usbmodem1402
"""

from __future__ import annotations

import argparse
import sys

from .bridge import Bridge
from .mapping import load_config
from .osc_sender import OscSender, PrintSender
from .sources import FakeSource, SerialSource, lines_from


def build_parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(
        prog="sonification_bridge",
        description="Bridge sensor data (fake or serial) to OSC for Sonic Pi.",
    )
    p.add_argument("--config", required=True, help="path to mapping YAML")
    p.add_argument(
        "--source", choices=["fake", "serial"], default="fake",
        help="data source (default: fake)",
    )
    p.add_argument("--port", help="serial port (required for --source serial)")
    p.add_argument("--baud", type=int, default=115200, help="serial baud rate")
    p.add_argument("--rate", type=float, default=10.0, help="fake source Hz per channel")
    p.add_argument("--osc-host", help="override OSC host from config")
    p.add_argument("--osc-port", type=int, help="override OSC port from config")
    p.add_argument(
        "--dry-run", action="store_true",
        help="print OSC messages instead of sending them",
    )
    p.add_argument("--verbose", "-v", action="store_true", help="log every message")
    return p


def main(argv=None) -> int:
    args = build_parser().parse_args(argv)

    config = load_config(args.config)
    host = args.osc_host or config.osc_host
    port = args.osc_port or config.osc_port

    if args.dry_run:
        sender = PrintSender()
        print(f"[dry-run] would send to {host}:{port}")
    else:
        sender = OscSender(host, port)
        print(f"Sending OSC to {host}:{port}")

    if args.source == "serial":
        if not args.port:
            print("error: --source serial requires --port", file=sys.stderr)
            return 2
        source = SerialSource(args.port, args.baud)
        print(f"Reading serial {args.port} @ {args.baud}")
    else:
        source = FakeSource(config.rules, rate_hz=args.rate)
        print(f"Using fake source @ {args.rate} Hz across "
              f"{len(config.rules)} rule(s). Ctrl-C to stop.")

    bridge = Bridge(config, sender)
    on_message = (lambda a, v: print(f"  -> {a} {v:.4f}")) if args.verbose else None

    try:
        bridge.run(lines_from(source), on_message=on_message)
    except KeyboardInterrupt:
        print("\nStopped.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
