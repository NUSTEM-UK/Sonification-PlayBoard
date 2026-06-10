"""Thin wrapper over python-osc for sending control values to Sonic Pi.

Sonic Pi listens for OSC on UDP 127.0.0.1:4560 by default. Incoming messages
become time-state in Sonic Pi, readable with ``get "/osc*/your/address"``.
"""

from __future__ import annotations

from typing import Protocol


class Sender(Protocol):
    """Anything that can send an OSC value (lets us swap in a fake for tests)."""

    def send(self, address: str, value: float) -> None: ...


class OscSender:
    """Sends single-float OSC messages to a UDP host:port."""

    def __init__(self, host: str = "127.0.0.1", port: int = 4560) -> None:
        from pythonosc.udp_client import SimpleUDPClient  # lazy import

        self._client = SimpleUDPClient(host, port)
        self.host = host
        self.port = port

    def send(self, address: str, value: float) -> None:
        self._client.send_message(address, float(value))


class PrintSender:
    """A dry-run sender that prints instead of sending (no deps)."""

    def send(self, address: str, value: float) -> None:
        print(f"OSC {address} {value:.4f}")
