"""
Resource Agent.

First-class specialist for water, energy, nutrient, and storage pressure.
"""

from __future__ import annotations

import json
from typing import Any

from agents.agent_support import DEFAULT_GREENHOUSE_ID, get_latest_sensor_snapshot, utc_now_iso, write_agent_event


def analyze_resources(
    sensor_data: dict[str, Any],
    greenhouse_id: str = DEFAULT_GREENHOUSE_ID,
) -> dict[str, Any]:
    water_litres = float(sensor_data.get("waterLitres") or 0)
    light_ppfd = float(sensor_data.get("lightPpfd") or 0)
    nutrient_ec = float(sensor_data.get("nutrientEc") or 0)
    ph_level = float(sensor_data.get("phLevel") or 0)

    findings: list[dict[str, Any]] = []
    recommendations: list[str] = []
    risk_score = 0

    if water_litres < 120:
        status = "ALERT" if water_litres < 85 else "WATCH"
        findings.append({"metric": "waterLitres", "status": status, "value": water_litres})
        recommendations.append("Prioritize water recovery and stagger irrigation loads")
        risk_score += 35 if status == "ALERT" else 15

    if light_ppfd < 300:
        status = "ALERT" if light_ppfd < 220 else "WATCH"
        findings.append({"metric": "lightPpfd", "status": status, "value": light_ppfd})
        recommendations.append("Shift to energy-constrained lighting schedule for non-critical bays")
        risk_score += 25 if status == "ALERT" else 10

    if nutrient_ec and nutrient_ec < 1.6:
        findings.append({"metric": "nutrientEc", "status": "WATCH", "value": nutrient_ec})
        recommendations.append("Top up nutrient solution before the next harvest cycle")
        risk_score += 10

    if ph_level and (ph_level < 5.4 or ph_level > 6.5):
        findings.append({"metric": "phLevel", "status": "WATCH", "value": ph_level})
        recommendations.append("Rebalance solution pH to protect nutrient uptake")
        risk_score += 10

    status = "NOMINAL"
    if any(item["status"] == "ALERT" for item in findings):
        status = "ALERT"
    elif findings:
        status = "WATCH"

    headline = (
        "Resource reserves are within the nominal operating buffer."
        if not findings
        else recommendations[0]
    )

    return {
        "agent": "resource",
        "greenhouse_id": greenhouse_id,
        "timestamp": utc_now_iso(),
        "status": status,
        "headline": headline,
        "riskScore": min(risk_score, 100),
        "findings": findings,
        "recommendations": recommendations or ["Maintain current water, nutrient, and power budgets"],
        "commands": [
            {"tool": "resource_shift", "summary": recommendation}
            for recommendation in recommendations[:3]
        ],
        "affectedModules": [greenhouse_id],
    }


def run_resource_agent(greenhouse_id: str = DEFAULT_GREENHOUSE_ID) -> str:
    sensor_data = get_latest_sensor_snapshot(greenhouse_id)
    report = analyze_resources(sensor_data, greenhouse_id=greenhouse_id)
    severity = "CRITICAL" if report["status"] == "ALERT" else "WARN" if report["status"] == "WATCH" else "INFO"
    write_agent_event("resource", severity, report["headline"], "; ".join(report["recommendations"][:2]))
    return json.dumps(report)


if __name__ == "__main__":
    print(run_resource_agent())
