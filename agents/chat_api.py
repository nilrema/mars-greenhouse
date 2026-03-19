"""Small CLI wrapper that returns JSON for the frontend chat bridge."""

from __future__ import annotations

import io
import json
import sys
from contextlib import redirect_stderr, redirect_stdout

from .orchestrator import handle_chat_turn


def main() -> None:
    raw_input = sys.stdin.read().strip()
    try:
        payload = json.loads(raw_input) if raw_input else {}
    except json.JSONDecodeError:
        payload = {}

    query = str(payload.get("query", ""))
    captured_stdout = io.StringIO()
    captured_stderr = io.StringIO()

    # Strands can emit streamed text to stdout during execution; keep the bridge response JSON-only.
    with redirect_stdout(captured_stdout), redirect_stderr(captured_stderr):
        result = handle_chat_turn(query)

    sys.stdout.write(json.dumps(result))


if __name__ == "__main__":
    main()
