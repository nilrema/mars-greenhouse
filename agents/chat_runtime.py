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
from agents.mission_orchestrator import run_mission_orchestrator

BASELINE_TEMP = 24.0


def _status_to_ui(status: str) -> str:
    normalized = str(status).upper()
    if normalized == "ALERT":
        return "critical"
    if normalized == "WATCH":
        return "warning"
    return "nominal"


def _message_severity(status: str) -> str:
    normalized = str(status).upper()
    if normalized == "ALERT":
        return "critical"
    if normalized == "WATCH":
        return "warning"
    return "success"


def _agent_name(agent_id: str) -> str:
    return {
        "environment": "ENV_AGENT",
        "crop": "CROP_AGENT",
        "astro": "ASTRO_AGENT",
        "resource": "RESOURCE_AGENT",
        "orchestrator": "ORCH_AGENT",
    }.get(agent_id, agent_id.upper())


def _agent_role(agent_id: str) -> str:
    return {
        "environment": "Environment Control",
        "crop": "Crop Management",
        "astro": "Astronaut Welfare",
        "resource": "Resource Management",
        "orchestrator": "Mission Orchestration",
    }.get(agent_id, "Mission Specialist")


def _agent_icon(agent_id: str) -> str:
    return {
        "environment": "🌡️",
        "crop": "🌱",
        "astro": "🧑‍🚀",
        "resource": "⚡",
        "orchestrator": "🧭",
    }.get(agent_id, "•")


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


def _health_status(index: int, stress_score: float) -> str:
    if stress_score >= 80 and index == 0:
        return "CRITICAL"
    if stress_score >= 55 and index in {0, 1}:
        return "MONITOR"
    if stress_score >= 35 and index == 1:
        return "MONITOR"
    return "HEALTHY"


def _build_crop_records(context: dict[str, Any] | None) -> list[dict[str, Any]]:
    if not context:
        stress_score = 0.0
    else:
        effective_temp = BASELINE_TEMP + float(context.get("temperatureDrift") or 0)
        water_recycling = float(context.get("waterRecycling") or 100)
        power_availability = float(context.get("powerAvailability") or 100)
        stress_score = max(0.0, (20.0 - effective_temp) * 4.0)
        stress_score += max(0.0, 72.0 - water_recycling) * 0.7
        stress_score += max(0.0, 82.0 - power_availability) * 0.5

    names = [
        ("Lettuce", "Butterhead", 2, 18, "lane-a"),
        ("Tomato", "Roma", 3, 34, "lane-b"),
        ("Potato", "Yukon", 4, 46, "lane-c"),
    ]
    records = []
    for index, (name, variety, growth_stage, days_to_harvest, zone) in enumerate(names):
        records.append(
            {
                "name": name,
                "variety": variety,
                "growthStage": growth_stage,
                "daysToHarvest": days_to_harvest,
                "healthStatus": _health_status(index, stress_score),
                "zone": zone,
            }
        )
    return records


def _status_snapshot(agent_id: str, report: dict[str, Any]) -> dict[str, Any]:
    recommendations = report.get("recommendations") or []
    return {
        "id": agent_id,
        "name": _agent_name(agent_id),
        "role": _agent_role(agent_id),
        "icon": _agent_icon(agent_id),
        "status": _status_to_ui(report.get("status", "NOMINAL")),
        "currentAction": recommendations[0] if recommendations else report.get("headline") or "Continue monitoring",
    }


def _report_message(report: dict[str, Any]) -> str:
    recommendations = report.get("recommendations") or []
    action = recommendations[0].lower() if recommendations else "maintain monitoring"
    headline = report.get("headline") or f"{report.get('agent', 'agent').title()} report available."
    return f"{headline} Current action: {action}."


def build_chat_response(payload: dict[str, Any]) -> dict[str, Any]:
    timestamp = int(time.time())
    message = str(payload.get("message") or "").strip()
    if not message:
        raise ValueError("Message is required.")

    conversation_id = payload.get("conversationId") or f"conv-{timestamp}"
    request_id = f"req-{timestamp}"
    context = payload.get("context") or None
    sensor_data = _build_sensor_snapshot(context)
    crop_records = _build_crop_records(context)

    orchestration = json.loads(
        run_mission_orchestrator(
            greenhouse_id=DEFAULT_GREENHOUSE_ID,
            prompt=message,
            sensor_data=sensor_data,
            crop_records=crop_records,
            persist_events=False,
            include_knowledge=True,
        )
    )
    reports = orchestration["reports"]
    decision = orchestration["decision"]

    specialist_order = ["environment", "crop", "astro", "resource"]
    messages = [
        {
            "id": f"orchestrator-{timestamp}",
            "agentId": "orchestrator",
            "agentName": _agent_name("orchestrator"),
            "agentRole": _agent_role("orchestrator"),
            "severity": "info",
            "message": "Mission control acknowledged the operator request and started the retained specialist runtime.",
            "timestamp": timestamp,
        }
    ]
    for index, agent_id in enumerate(specialist_order, start=1):
        report = reports[agent_id]
        messages.append(
            {
                "id": f"{agent_id}-{timestamp + index}",
                "agentId": agent_id,
                "agentName": _agent_name(agent_id),
                "agentRole": _agent_role(agent_id),
                "severity": _message_severity(report.get("status", "NOMINAL")),
                "message": _report_message(report),
                "timestamp": timestamp + index,
            }
        )

    lead_agent = decision.get("leadAgent") or "orchestrator"
    messages.append(
        {
            "id": f"orchestrator-{timestamp + len(specialist_order) + 1}",
            "agentId": "orchestrator",
            "agentName": _agent_name("orchestrator"),
            "agentRole": _agent_role("orchestrator"),
            "severity": "warning" if lead_agent != "orchestrator" else "success",
            "message": f"Orchestrator resolution: {decision['operatorSummary']} Next actions: {'; '.join(decision.get('nextActions') or ['Maintain standard monitoring cadence'])}.",
            "timestamp": timestamp + len(specialist_order) + 1,
        }
    )

    agent_statuses = [_status_snapshot(agent_id, reports[agent_id]) for agent_id in specialist_order]
    agent_statuses.append(
        {
            "id": "orchestrator",
            "name": _agent_name("orchestrator"),
            "role": _agent_role("orchestrator"),
            "icon": _agent_icon("orchestrator"),
            "status": "warning" if lead_agent != "orchestrator" else "nominal",
            "currentAction": (decision.get("nextActions") or ["Maintain standard monitoring cadence"])[0],
        }
    )

    return {
        "conversationId": conversation_id,
        "requestId": request_id,
        "agentStatuses": agent_statuses,
        "messages": messages,
    }


def main() -> int:
    payload = json.load(sys.stdin)
    response = build_chat_response(payload)
    print(json.dumps(response))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
