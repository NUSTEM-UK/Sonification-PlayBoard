"""The core loop: read protocol lines, apply mappings, send OSC."""

from __future__ import annotations

from typing import Iterable, List, Tuple

from .mapping import MappingConfig
from .osc_sender import Sender
from .protocol import parse_line


class Bridge:
    """Glue between a line source, the mapping config, and an OSC sender."""

    def __init__(self, config: MappingConfig, sender: Sender) -> None:
        self.config = config
        self.sender = sender

    def handle_line(self, line: str) -> List[Tuple[str, float]]:
        """Process one raw protocol line; return the OSC messages it produced."""
        reading = parse_line(line)
        if reading is None:
            return []

        messages = self.config.messages_for(reading)
        for address, value in messages:
            self.sender.send(address, value)
        return messages

    def run(self, lines: Iterable[str], *, on_message=None) -> None:
        """Consume lines until the source is exhausted (or forever)."""
        for line in lines:
            for address, value in self.handle_line(line):
                if on_message is not None:
                    on_message(address, value)
