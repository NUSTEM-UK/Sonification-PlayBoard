"""Map raw readings to OSC messages via a list of scaling rules.

The *meaning* of every sensor lives here, not in the firmware. A rule matches
some (src, chan) and linearly scales the raw value from an input range to an
output range, emitting it on an OSC address.

The pure logic (Rule, scale) has no third-party dependencies. ``load_config``
imports PyYAML lazily so tests can exercise the maths without it installed.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import List, Optional, Sequence, Tuple

from .protocol import Number, Reading

Range = Tuple[float, float]


def scale(val: float, in_range: Range, out_range: Range, clamp: bool = True) -> float:
    """Linearly map ``val`` from ``in_range`` to ``out_range``."""
    in_lo, in_hi = in_range
    out_lo, out_hi = out_range

    if in_hi == in_lo:
        frac = 0.0
    else:
        frac = (val - in_lo) / (in_hi - in_lo)

    if clamp:
        frac = max(0.0, min(1.0, frac))

    return out_lo + frac * (out_hi - out_lo)


@dataclass(frozen=True)
class Rule:
    """One mapping from a source channel to an OSC parameter.

    ``src``/``chan`` of ``None`` act as wildcards (match anything).
    """

    osc: str
    in_range: Range
    out_range: Range
    src: Optional[str] = None
    chan: Optional[str] = None
    clamp: bool = True

    def matches(self, reading: Reading) -> bool:
        if self.src is not None and self.src != reading.src:
            return False
        if self.chan is not None and self.chan != reading.chan:
            return False
        return True

    def apply(self, reading: Reading) -> float:
        return scale(float(reading.val), self.in_range, self.out_range, self.clamp)


@dataclass
class MappingConfig:
    """A loaded config: OSC destination + the list of rules."""

    osc_host: str = "127.0.0.1"
    osc_port: int = 4560
    rules: Sequence[Rule] = ()

    def messages_for(self, reading: Reading) -> List[Tuple[str, float]]:
        """Return ``(osc_address, value)`` for every rule matching a reading."""
        out: List[Tuple[str, float]] = []
        for rule in self.rules:
            if rule.matches(reading):
                out.append((rule.osc, rule.apply(reading)))
        return out


def _range(value, field: str) -> Range:
    if not isinstance(value, (list, tuple)) or len(value) != 2:
        raise ValueError(f"'{field}' must be a [lo, hi] pair, got {value!r}")
    return (float(value[0]), float(value[1]))


def parse_rules(raw_rules) -> List[Rule]:
    """Build Rule objects from already-parsed config dicts."""
    rules: List[Rule] = []
    for i, r in enumerate(raw_rules):
        try:
            match = r.get("match", {}) or {}
            rules.append(
                Rule(
                    osc=r["osc"],
                    in_range=_range(r["in"], "in"),
                    out_range=_range(r["out"], "out"),
                    src=_as_str(match.get("src")),
                    chan=_as_str(match.get("chan")),
                    clamp=bool(r.get("clamp", True)),
                )
            )
        except (KeyError, ValueError) as exc:
            raise ValueError(f"mapping rule #{i} is invalid: {exc}") from exc
    return rules


def _as_str(value) -> Optional[str]:
    return None if value is None else str(value)


def load_config(path: str) -> MappingConfig:
    """Load a YAML mapping config from disk."""
    import yaml  # lazy: keeps the maths importable without PyYAML

    with open(path, "r", encoding="utf-8") as fh:
        data = yaml.safe_load(fh) or {}

    osc = data.get("osc", {}) or {}
    return MappingConfig(
        osc_host=str(osc.get("host", "127.0.0.1")),
        osc_port=int(osc.get("port", 4560)),
        rules=parse_rules(data.get("mappings", []) or []),
    )
