"""Sonification bridge: serial/fake data sources -> OSC for Sonic Pi.

The package is split into small, independently testable pieces:

- ``protocol``    parse/format the ``src,chan,val`` wire protocol
- ``mapping``     scale raw readings to OSC messages via a config of rules
- ``sources``     where readings come from (fake generator, or serial port)
- ``osc_sender``  thin wrapper over python-osc
- ``bridge``      glue: read lines -> apply mappings -> send OSC
- ``cli``         command-line entry point
"""

from .protocol import Reading, parse_line, format_line

__all__ = ["Reading", "parse_line", "format_line"]
