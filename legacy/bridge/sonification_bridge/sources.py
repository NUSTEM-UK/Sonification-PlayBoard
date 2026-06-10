"""Data sources: where protocol lines come from.

Two sources ship in Stage 1:

- :class:`FakeSource` synthesises smoothly-varying values so the whole
  software path can be exercised and *heard* with no hardware attached.
- :class:`SerialSource` reads real lines from a USB serial port (the micro:bit
  sink in Stage 2).

Both are iterables yielding raw protocol lines (``str``), so the bridge treats
them identically.
"""

from __future__ import annotations

import math
import time
from typing import Iterable, Iterator, Sequence

from .mapping import Rule


class FakeSource:
    """Emit synthetic readings for a set of rules, so mappings actually fire.

    For each distinct (src, chan, in_range) referenced by the rules, we
    oscillate a sine wave across that input range. Running the bridge against
    this source should immediately wiggle every mapped Sonic Pi parameter.
    """

    def __init__(self, rules: Sequence[Rule], rate_hz: float = 20.0) -> None:
        self.rate_hz = rate_hz
        # Deduplicate channels, assigning each its own period for variety.
        seen = {}
        for r in rules:
            key = (r.src or "fake", r.chan or "chan", r.in_range)
            seen.setdefault(key, len(seen))
        self._channels = [
            {"src": src, "chan": chan, "lo": rng[0], "hi": rng[1],
             "period": 3.0 + idx * 1.7}
            for (src, chan, rng), idx in seen.items()
        ]
        if not self._channels:
            # No rules? Fall back to one demo channel so something happens.
            self._channels = [
                {"src": "fake", "chan": "demo", "lo": 0.0, "hi": 255.0,
                 "period": 4.0}
            ]

    def __iter__(self) -> Iterator[str]:
        start = time.monotonic()
        period_s = 1.0 / self.rate_hz
        while True:
            t = time.monotonic() - start
            for c in self._channels:
                phase = (t / c["period"]) * 2 * math.pi
                frac = (math.sin(phase) + 1.0) / 2.0  # 0..1
                val = c["lo"] + frac * (c["hi"] - c["lo"])
                # Emit ints for integer-ish ranges, else a rounded float.
                if float(c["lo"]).is_integer() and float(c["hi"]).is_integer():
                    val = int(round(val))
                else:
                    val = round(val, 3)
                yield f"{c['src']},{c['chan']},{val}"
            time.sleep(period_s)


class SerialSource:
    """Read protocol lines from a serial port (e.g. the micro:bit sink)."""

    def __init__(self, port: str, baud: int = 115200, timeout: float = 1.0) -> None:
        self.port = port
        self.baud = baud
        self.timeout = timeout

    def __iter__(self) -> Iterator[str]:
        import serial  # lazy: only needed for real hardware

        with serial.Serial(self.port, self.baud, timeout=self.timeout) as ser:
            while True:
                raw = ser.readline()
                if not raw:
                    continue  # timeout, just keep waiting
                yield raw.decode("utf-8", errors="replace")


def lines_from(source: Iterable[str]) -> Iterator[str]:
    """Normalise any line iterable, stripping trailing newlines."""
    for line in source:
        yield line.rstrip("\r\n")
