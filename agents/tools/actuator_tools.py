"""Legacy actuator helpers for compatibility with existing tests."""

from __future__ import annotations

import json


def adjust_temperature(target_value: float, zone: str = "main") -> str:
    """Return a simulated actuator command response."""
    return json.dumps({
        "type": "TEMPERATURE_ADJUST",
        "targetValue": target_value,
        "zone": zone,
        "status": "PENDING",
        "message": f"Queued temperature adjustment to {target_value}°C for zone {zone}.",
    })
