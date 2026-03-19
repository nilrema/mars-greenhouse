"""
Backend chat runtime that bridges the UI request contract to the retained agent
orchestration flow.
"""

from __future__ import annotations

import json
import sys
import time
from typing import Any

from agents.agent_support import DEFAULT_GREENHOUSE_ID
from agents.strands_runtime import StrandsMissionRuntime

BASELINE_TEMP = 24.0


def _build_sensor_snapshot(context: dict[str, Any] | None) -> dict[str, Any]:
    if not context:
        return {
            "temperature": 24.0,
            "humidity": 68.0,
            "co2Ppm": 1180.0,
            "lightPpfd": 420.0,
            "phLevel": 6.1,
            "nutrientEc": 1.9,
            "waterLitres": 180.0,
            "radiationMsv": 0.3,
        }

    effective_temp = BASELINE_TEMP + float(context.get("temperatureDrift") or 0)
    water_recycling = float(context.get("waterRecycling") or 100)
    power_availability = float(context.get("powerAvailability") or 100)
    humidity = max(
        22.0,
        68.0 - max(0.0, (15.0 - effective_temp) * 0.5) + (100.0 - water_recycling) * 0.1,
    )
    return {
        "temperature": round(effective_temp, 1),
        "humidity": round(humidity, 1),
        "co2Ppm": round(max(700.0, 1200.0 - max(0.0, 85.0 - power_availability) * 8.0), 1),
        "lightPpfd": round(max(160.0, 420.0 - max(0.0, 100.0 - power_availability) * 3.6), 1),
        "phLevel": 6.1 if water_recycling >= 65 else 6.6,
        "nutrientEc": 1.9 if water_recycling >= 65 else 1.5,
        "waterLitres": round(max(55.0, 1.8 * water_recycling), 1),
        "radiationMsv": 0.3,
    }


def _context_summary(context: dict[str, Any] | None) -> str:
    sensor_data = _build_sensor_snapshot(context)
    return (
        f"Simulation context for {DEFAULT_GREENHOUSE_ID}: "
        f"temperature {sensor_data['temperature']:.1f}C, "
        f"humidity {sensor_data['humidity']:.1f}%, "
        f"CO2 {sensor_data['co2Ppm']:.0f} ppm, "
        f"light {sensor_data['lightPpfd']:.0f} PPFD, "
        f"water {sensor_data['waterLitres']:.1f} L, "
        f"nutrient EC {sensor_data['nutrientEc']:.1f}, "
        f"pH {sensor_data['phLevel']:.1f}."
    )


def build_chat_response(payload: dict[str, Any]) -> dict[str, Any]:
    timestamp = int(time.time())
    message = str(payload.get("message") or "").strip()
    if not message:
        raise ValueError("Message is required.")

    conversation_id = payload.get("conversationId") or f"conv-{timestamp}"
    request_id = f"req-{timestamp}"
    context = payload.get("context") or None
    with StrandsMissionRuntime(
        context_summary=_context_summary(context),
        conversation_id=conversation_id,
        request_id=request_id,
    ) as runtime:
        return runtime.run(message)


def main() -> int:
    payload = json.load(sys.stdin)
    response = build_chat_response(payload)
    print(json.dumps(response))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
