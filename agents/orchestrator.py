"""
CLI wrapper for the Mission Orchestrator.

Default output is a readable agent-to-agent communication trace.
Use `--json` to print the full raw payload.
Supports both:
  - python -m agents.orchestrator
  - python agents/orchestrator.py
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

if __package__ in (None, ""):
    sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
    from agents.mission_orchestrator import run_mission_orchestrator
else:
    from agents.mission_orchestrator import run_mission_orchestrator


def _trim(text: str | None, limit: int = 140) -> str:
    if not text:
        return "-"
    clean = " ".join(str(text).split())
    return clean if len(clean) <= limit else clean[: limit - 3] + "..."


def _format_specialist(name: str, report: dict) -> list[str]:
    lines: list[str] = [f"[{name}]"]

    status = report.get("status")
    if status:
        lines.append(f"status: {status}")

    if "risk_score" in report:
        lines.append(f"risk_score: {report['risk_score']}")

    if "disease_risk_score" in report:
        lines.append(f"disease_risk_score: {report['disease_risk_score']}")

    if "nutrition_score" in report:
        lines.append(
            "crew: "
            f"nutrition={report.get('nutrition_score')}, "
            f"diversity={report.get('meal_diversity')}, "
            f"security={report.get('food_security')}, "
            f"health_risk={report.get('crew_health_risk')}"
        )

    if report.get("issues"):
        lines.append("issues: " + "; ".join(_trim(item.get("metric")) for item in report["issues"][:3]))

    if report.get("anomalies"):
        lines.append("anomalies: " + "; ".join(_trim(item.get("type")) for item in report["anomalies"][:3]))

    if report.get("recommended_actions"):
        lines.append("actions: " + "; ".join(_trim(item) for item in report["recommended_actions"][:2]))

    if report.get("recommended_commands"):
        command_names = [cmd.get("tool", "?") for cmd in report["recommended_commands"][:4]]
        lines.append("commands: " + ", ".join(command_names))

    if report.get("scenario"):
        lines.append(
            f"scenario: {report.get('scenario')} on {', '.join(report.get('affected_greenhouses') or [])}"
        )

    return lines


def format_orchestration_trace(result: dict) -> str:
    reports = result.get("reports", {})
    decision = result.get("decision", {})

    lines = [
        "MISSION ORCHESTRATOR TRACE",
        f"greenhouse: {result.get('greenhouse_id', '-')}",
        f"prompt: {_trim(result.get('prompt') or 'automatic cycle')}",
        "",
        "1. Mission Orchestrator -> Greenhouse Operations Agent",
        *_format_specialist("greenhouse-operations", reports.get("greenhouse_operations") or {}),
        "",
        "2. Mission Orchestrator -> Crop Health Agent",
        *_format_specialist("crop-health", reports.get("crop_health") or {}),
        "",
        "3. Mission Orchestrator -> Crew Nutrition Agent",
        *_format_specialist("crew-nutrition", reports.get("crew_nutrition") or {}),
    ]

    if reports.get("incident_chaos"):
        lines.extend(
            [
                "",
                "4. Mission Orchestrator -> Incident / Chaos Agent",
                *_format_specialist("incident-chaos", reports.get("incident_chaos") or {}),
            ]
        )

    lines.extend(
        [
            "",
            "5. Specialists -> Mission Orchestrator",
            f"lead_agent: {decision.get('lead_agent', '-')}",
            f"summary: {_trim(decision.get('overall_summary'))}",
            f"chat_response: {_trim(decision.get('chat_response'), 220)}",
        ]
    )

    priorities = decision.get("priority_stack") or []
    if priorities:
        lines.append("priority_stack:")
        for index, item in enumerate(priorities, start=1):
            lines.append(f"  {index}. {item.get('owner', '-')} -> {_trim(item.get('reason'), 180)}")

    return "\n".join(lines)


def run_orchestrator(prompt: str | None = None) -> str:
    return run_mission_orchestrator(prompt=prompt)


if __name__ == "__main__":
    args = sys.argv[1:]
    emit_json = False
    if "--json" in args:
        emit_json = True
        args = [arg for arg in args if arg != "--json"]

    prompt = " ".join(args) if args else None
    raw = run_orchestrator(prompt)

    if emit_json:
        print(raw)
    else:
        payload = json.loads(raw)
        print(format_orchestration_trace(payload))
