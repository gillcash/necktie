#!/usr/bin/env python3
"""Create and advance an auditable Necktie research-prompt run packet."""

import argparse
import json
from pathlib import Path
import sys

from research_state import (
    ORIGIN_MODES, REVISION_LIMITS, STATES, LoopError, load_packet, new_packet,
    record_review, record_verification, save_packet, transition,
)

ACTIONS = {"transition": transition, "review": record_review, "verify": record_verification}


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description=__doc__)
    commands = parser.add_subparsers(dest="command", required=True)
    initialize = commands.add_parser("init", help="create a research-prompt run packet")
    initialize.add_argument("--goal", required=True)
    initialize.add_argument("--depth", choices=sorted(REVISION_LIMITS), default="standard")
    initialize.add_argument("--origin-mode", choices=sorted(ORIGIN_MODES), default="full")
    initialize.add_argument("--output", dest="file", type=Path, required=True)
    parsers = {name: commands.add_parser(name, help=help_text) for name, help_text in {
        "transition": "advance to an allowed phase",
        "review": "record a frozen-draft review decision",
        "verify": "record fresh-session verification",
        "show": "validate and print a run packet",
    }.items()}
    for command in parsers.values():
        command.add_argument("--file", type=Path, required=True)
    parsers["transition"].add_argument("--to", dest="target", choices=sorted(STATES), required=True)
    parsers["transition"].add_argument("--note", default="")
    for name, field, choices in (("review", "decision", ("APPROVE", "REVISE", "BLOCK")),
                                 ("verify", "result", ("PASS", "FAIL"))):
        parsers[name].add_argument(f"--{field}", choices=choices, required=True)
        parsers[name].add_argument("--reason", required=True)
        parsers[name].add_argument("--issue-signature", default="")
    return parser


def main(argv=None) -> int:
    options = vars(build_parser().parse_args(argv))
    command, path = options.pop("command"), options.pop("file")
    try:
        packet = new_packet(**options) if command == "init" else load_packet(path)
        if command == "show":
            print(json.dumps(packet, indent=2, ensure_ascii=False))
            return 0
        if command in ACTIONS:
            ACTIONS[command](packet, **options)
        save_packet(path, packet)
        print(f"initialized {packet['run_id']} at {path}" if command == "init" else f"state={packet['state']}")
    except (LoopError, OSError) as exc:
        print(f"error: {exc}", file=sys.stderr)
        return 2
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
