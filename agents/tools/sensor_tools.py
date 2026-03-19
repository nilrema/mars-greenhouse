"""Legacy sensor helpers backed by the current AppSync greenhouse snapshot."""

from __future__ import annotations

import json

from agents.greenhouse_data import get_greenhouse_snapshot


def get_latest_sensor_reading(greenhouse_id: str = "mars-greenhouse-1") -> str:
    """Return the latest greenhouse sensor reading as JSON."""
    try:
        snapshot = get_greenhouse_snapshot(greenhouse_id)
        reading = snapshot.get("latestSensorReading")
        if not reading:
            return json.dumps({"greenhouseId": greenhouse_id, "error": "No sensor reading found."})
        return json.dumps(reading)
    except Exception as exc:
        return json.dumps({"greenhouseId": greenhouse_id, "error": str(exc)})
