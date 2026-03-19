"""
Environment Agent.

First-class specialist for greenhouse climate and environmental control.
"""

from __future__ import annotations

import json
from typing import Any

from agents.agent_support import (
    DEFAULT_GREENHOUSE_ID,
    get_latest_sensor_snapshot,
    utc_now_iso,
    write_agent_event,
)
from agents.mcp_support import describe_mcp_access

OPTIMAL_RANGES = {
    "temperature": {"min": 20.0, "max": 25.0, "target": 22.0, "label": "temperature"},
    "humidity": {"min": 60.0, "max": 72.0, "target": 65.0, "label": "humidity"},
    "co2Ppm": {"min": 1000.0, "max": 1400.0, "target": 1200.0, "label": "CO2"},
    "lightPpfd": {"min": 320.0, "max": 520.0, "target": 420.0, "label": "light"},
}


def _metric_status(value: float, minimum: float, maximum: float) -> str:
    span = max(1.0, (maximum - minimum) * 0.35)
    if minimum <= value <= maximum:
        return "NOMINAL"
    if value < minimum - span or value > maximum + span:
        return "ALERT"
    return "WATCH"


def analyze_environment(
    sensor_data: dict[str, Any],
    greenhouse_id: str = DEFAULT_GREENHOUSE_ID,
) -> dict[str, Any]:
    findings: list[dict[str, Any]] = []
    recommendations: list[str] = []
    risk_score = 0

    for metric, config in OPTIMAL_RANGES.items():
        value = sensor_data.get(metric)
        if value is None:
            continue

        status = _metric_status(float(value), config["min"], config["max"])
        if status == "NOMINAL":
            continue

        direction = "increase" if value < config["min"] else "decrease"
        findings.append(
            {
                "metric": metric,
                "status": status,
                "value": value,
                "target": config["target"],
                "direction": direction,
            }
        )
        recommendations.append(f"{direction.title()} {config['label']} toward {config['target']}")
        risk_score += 30 if status == "ALERT" else 15

    humidity = float(sensor_data.get("humidity") or 0)
    temperature = float(sensor_data.get("temperature") or 0)
    if humidity > 78 and 18 <= temperature <= 28:
        findings.append(
            {
                "metric": "disease-friendly-climate",
                "status": "ALERT" if humidity > 84 else "WATCH",
                "value": humidity,
                "target": 65,
                "direction": "decrease",
            }
        )
        recommendations.append("Reduce humidity and increase circulation in affected grow lanes")
        risk_score += 25 if humidity > 84 else 12

    status = "NOMINAL"
    if any(item["status"] == "ALERT" for item in findings):
        status = "ALERT"
    elif findings:
        status = "WATCH"

    headline = (
        "Environmental envelope is stable across the selected module."
        if not findings
        else recommendations[0]
    )

    return {
        "agent": "environment",
        "greenhouse_id": greenhouse_id,
        "timestamp": utc_now_iso(),
        "status": status,
        "headline": headline,
        "riskScore": min(risk_score, 100),
        "findings": findings,
        "recommendations": recommendations or ["Maintain current greenhouse climate setpoints"],
        "commands": [
            {
                "tool": "adjust_environment",
                "summary": recommendation,
            }
            for recommendation in recommendations[:3]
        ],
        "affectedModules": [greenhouse_id],
        "knowledgeBase": {
            "access": describe_mcp_access(),
            "queryHint": "Mars greenhouse environmental stabilization guidance",
        },
    }


def run_environment_agent(
    greenhouse_id: str = DEFAULT_GREENHOUSE_ID,
    sensor_data: dict[str, Any] | None = None,
    persist_event: bool = True,
) -> str:
    sensor_snapshot = sensor_data if sensor_data is not None else get_latest_sensor_snapshot(greenhouse_id)
    report = analyze_environment(sensor_snapshot, greenhouse_id=greenhouse_id)
    severity = "CRITICAL" if report["status"] == "ALERT" else "WARN" if report["status"] == "WATCH" else "INFO"
    if persist_event:
        write_agent_event("environment", severity, report["headline"], "; ".join(report["recommendations"][:2]))
    return json.dumps(report)


def analyze_environmental_conditions(greenhouse_id: str = DEFAULT_GREENHOUSE_ID) -> str:
    return run_environment_agent(greenhouse_id)


if __name__ == "__main__":
    print(run_environment_agent())
