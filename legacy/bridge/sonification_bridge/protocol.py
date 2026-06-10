"""Parse and format the ``src,chan,val`` wire protocol.

See ../../docs/PROTOCOL.md for the spec. This module has no third-party
dependencies so it is trivially unit-testable.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Optional, Union

Number = Union[int, float]


@dataclass(frozen=True)
class Reading:
    """A single sensor reading from a source device."""

    src: str
    chan: str
    val: Number


def _parse_value(text: str) -> Number:
    """Parse a numeric field as int if possible, else float."""
    try:
        return int(text)
    except ValueError:
        return float(text)


def parse_line(line: str) -> Optional[Reading]:
    """Parse one protocol line into a :class:`Reading`.

    Returns ``None`` for blank lines, ``#`` comments, or malformed input
    (so the caller can simply skip falsy results).
    """
    line = line.strip()
    if not line or line.startswith("#"):
        return None

    parts = line.split(",")
    if len(parts) != 3:
        return None

    src, chan, raw = (p.strip() for p in parts)
    if not src or not chan:
        return None

    try:
        val = _parse_value(raw)
    except ValueError:
        return None

    return Reading(src=src, chan=chan, val=val)


def format_line(reading: Reading) -> str:
    """Format a :class:`Reading` back into a protocol line (no newline)."""
    return f"{reading.src},{reading.chan},{reading.val}"
