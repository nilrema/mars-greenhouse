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
    greenhouse_id = payload.get("greenhouseId")
    fresh_after_timestamp = payload.get("freshAfterTimestamp")
    greenhouse_id = str(greenhouse_id) if isinstance(greenhouse_id, str) else None
    fresh_after_timestamp = str(fresh_after_timestamp) if isinstance(fresh_after_timestamp, str) else None
    captured_stdout = io.StringIO()
    captured_stderr = io.StringIO()

    # Strands can emit streamed text to stdout during execution; keep the bridge response JSON-only.
    with redirect_stdout(captured_stdout), redirect_stderr(captured_stderr):
        result = handle_chat_turn(
            query,
            fresh_after_timestamp=fresh_after_timestamp,
            greenhouse_id=greenhouse_id,
        )

    sys.stdout.write(json.dumps(result))


if __name__ == "__main__":
    main()
