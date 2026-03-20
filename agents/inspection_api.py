"""CLI wrapper that returns JSON for popup disease inspection."""

from __future__ import annotations

import json
import sys

from .tools.disease_tools import inspect_disease_risk


def main() -> None:
    raw_input = sys.stdin.read().strip()
    try:
        payload = json.loads(raw_input) if raw_input else {}
    except json.JSONDecodeError:
        payload = {}

    image_data_url = payload.get("imageDataUrl")
    selection = payload.get("selection")
    camera_id = payload.get("cameraId")

    result = inspect_disease_risk(
        str(image_data_url) if isinstance(image_data_url, str) else "",
        selection=selection if isinstance(selection, dict) else None,
        camera_id=str(camera_id) if isinstance(camera_id, str) else None,
    )
    sys.stdout.write(json.dumps(result))


if __name__ == "__main__":
    main()
