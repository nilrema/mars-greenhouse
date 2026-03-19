"""
Incident / Chaos Agent.

Functional first-pass incident agent that can inject demo scenarios and explain
which greenhouses are affected.
"""

from __future__ import annotations

import json
import random
from typing import Any

from agents.agent_support import (
    DEFAULT_CHAOS_TARGETS,
    DEFAULT_GREENHOUSE_ID,
    get_latest_sensor_snapshot,
    utc_now_iso,
    write_agent_event,
)

CHAOS_SCENARIOS = {
    "wind": {
        "label": "External wind-blown dust exposure",
        "effects": ["reduced light penetration", "temperature instability", "panel abrasion risk"],
    },
    "disease": {
        "label": "Localized disease outbreak",
        "effects": ["fungal spread risk", "crop isolation required", "inspection urgency"],
    },
    "dust_storm": {
        "label": "Regional dust storm",
        "effects": ["solar drop", "light reduction", "lower greenhouse temperature"],
    },
}


def create_chaos_report(
    scenario_name: str | None = None,
    greenhouse_id: str = DEFAULT_GREENHOUSE_ID,
    sensor_data: dict[str, Any] | None = None,
) -> dict[str, Any]:
    sensor_data = sensor_data or {}
    scenario_key = scenario_name if scenario_name in CHAOS_SCENARIOS else random.choice(list(CHAOS_SCENARIOS))
    scenario = CHAOS_SCENARIOS[scenario_key]
    severity = "CRITICAL" if scenario_key in {"disease", "dust_storm"} else "WARN"

    if sensor_data.get("humidity", 0) > 82 and scenario_key != "disease":
        scenario_key = "disease"
        scenario = CHAOS_SCENARIOS[scenario_key]
        severity = "CRITICAL"

    return {
        "agent": "incident-chaos",
        "timestamp": utc_now_iso(),
        "scenario": scenario_key,
        "label": scenario["label"],
        "severity": severity,
        "triggered_from": greenhouse_id,
        "affected_greenhouses": DEFAULT_CHAOS_TARGETS[:2],
        "effects": scenario["effects"],
        "recommended_actions": [
            "Escalate operator visibility in the chat panel",
            "Prioritize affected greenhouse inspections",
            "Re-run greenhouse operations and crop health analysis on impacted sites",
        ],
    }


def run_incident_chaos_agent(
    greenhouse_id: str = DEFAULT_GREENHOUSE_ID,
    scenario_name: str | None = None,
) -> str:
    sensor_data = get_latest_sensor_snapshot(greenhouse_id)
    report = create_chaos_report(scenario_name=scenario_name, greenhouse_id=greenhouse_id, sensor_data=sensor_data)
    write_agent_event(
        "incident-chaos",
        report["severity"],
        f"Chaos scenario active: {report['label']}",
        "; ".join(report["recommended_actions"]),
    )
    return json.dumps(report)


if __name__ == "__main__":
    print(run_incident_chaos_agent())
