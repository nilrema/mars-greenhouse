"""
Mission Orchestrator.

Functional first-pass coordinator for the new Mars greenhouse agent roles.
"""

from __future__ import annotations

import json
from typing import Any

from agents.agent_support import DEFAULT_GREENHOUSE_ID, get_latest_sensor_snapshot, safe_load_json, write_agent_event
from agents.crop_health_agent import run_crop_health_agent
from agents.crew_nutrition_agent import run_crew_nutrition_agent
from agents.greenhouse_operations_agent import run_greenhouse_operations_agent
from agents.incident_chaos_agent import run_incident_chaos_agent


def prompt_requests_chaos(prompt: str | None) -> bool:
    if not prompt:
        return False
    lowered = prompt.lower()
    return any(token in lowered for token in ("chaos", "incident", "disease", "dust storm", "wind"))


def compose_mission_decision(
    operations_report: dict[str, Any],
    crop_report: dict[str, Any],
    crew_report: dict[str, Any],
    incident_report: dict[str, Any] | None = None,
) -> dict[str, Any]:
    priorities: list[dict[str, str]] = []

    if crew_report["crew_health_risk"] == "HIGH":
        priorities.append(
            {
                "owner": "crew-nutrition",
                "reason": "Crew health risk is high, so food security must lead this cycle.",
            }
        )

    if operations_report["status"] == "CRITICAL":
        priorities.append(
            {
                "owner": "greenhouse-operations",
                "reason": "Greenhouse operating conditions are outside safe bounds.",
            }
        )

    if crop_report["status"] == "CRITICAL":
        priorities.append(
            {
                "owner": "crop-health",
                "reason": "Crop disease or anomaly risk is high enough to threaten production.",
            }
        )

    if incident_report:
        priorities.append(
            {
                "owner": "incident-chaos",
                "reason": f"Active incident detected: {incident_report['label']}.",
            }
        )

    if not priorities:
        priorities.append(
            {
                "owner": "mission-orchestrator",
                "reason": "All specialist reports are stable. Maintain current operating plan.",
            }
        )

    lead = priorities[0]
    summary = (
        f"Lead response: {lead['owner']}. "
        f"Operations={operations_report['status']}, Crop={crop_report['status']}, "
        f"CrewRisk={crew_report['crew_health_risk']}"
    )
    if incident_report:
        summary += f", Incident={incident_report['scenario']}"

    return {
        "lead_agent": lead["owner"],
        "priority_stack": priorities,
        "overall_summary": summary,
        "chat_response": " ".join(item["reason"] for item in priorities[:3]),
    }


def run_mission_orchestrator(
    greenhouse_id: str = DEFAULT_GREENHOUSE_ID,
    prompt: str | None = None,
) -> str:
    _ = get_latest_sensor_snapshot(greenhouse_id)
    operations_report = safe_load_json(run_greenhouse_operations_agent(greenhouse_id))
    crop_report = safe_load_json(run_crop_health_agent(greenhouse_id))
    crew_report = safe_load_json(run_crew_nutrition_agent())
    incident_report = None

    if prompt_requests_chaos(prompt) or operations_report["status"] == "CRITICAL":
        incident_report = safe_load_json(run_incident_chaos_agent(greenhouse_id))

    decision = compose_mission_decision(
        operations_report=operations_report,
        crop_report=crop_report,
        crew_report=crew_report,
        incident_report=incident_report,
    )

    write_agent_event(
        "mission-orchestrator",
        "CRITICAL" if decision["lead_agent"] != "mission-orchestrator" else "INFO",
        "Mission orchestration cycle complete",
        decision["overall_summary"],
    )

    return json.dumps(
        {
            "agent": "mission-orchestrator",
            "greenhouse_id": greenhouse_id,
            "prompt": prompt,
            "decision": decision,
            "reports": {
                "greenhouse_operations": operations_report,
                "crop_health": crop_report,
                "crew_nutrition": crew_report,
                "incident_chaos": incident_report,
            },
        }
    )


if __name__ == "__main__":
    print(run_mission_orchestrator())
