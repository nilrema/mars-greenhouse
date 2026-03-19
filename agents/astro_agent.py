"""
Astro Agent.

Specialist for astronaut workload, dispatch, and human operational impact.
"""

from __future__ import annotations

import json
from typing import Any

from agents.agent_support import list_crop_records, utc_now_iso, write_agent_event
from agents.simulation.mars_sim import CropState
from agents.simulation.nutrition import compute_mission_nutrition_status, recommend_replanting

GROWTH_STAGE_TO_DAYS = {
    1: 5,
    2: 15,
    3: 30,
    4: 45,
    5: 60,
}

DEFAULT_AREA_BY_CROP = {
    "lettuce": 6.0,
    "tomato": 8.0,
    "potato": 10.0,
    "sweet_potato": 10.0,
    "wheat": 12.0,
    "soy": 8.0,
}


def _health_multiplier(status: str | None) -> float:
    if status == "CRITICAL":
        return 0.4
    if status == "MONITOR":
        return 0.75
    return 1.0


def _crop_state_from_record(record: dict[str, Any]) -> CropState | None:
    crop_name = (record.get("name") or "").strip().lower().replace(" ", "_")
    if not crop_name:
        return None

    area = DEFAULT_AREA_BY_CROP.get(crop_name, 6.0)
    growth_stage = record.get("growthStage") or 1
    days_to_harvest = record.get("daysToHarvest") or 30

    return CropState(
        name=crop_name,
        variety=record.get("variety") or "Unknown",
        days_planted=GROWTH_STAGE_TO_DAYS.get(growth_stage, max(0, days_to_harvest // 2)),
        days_to_harvest=days_to_harvest,
        zone=record.get("zone") or "main",
        area_m2=area,
        health=_health_multiplier(record.get("healthStatus")),
    )


def analyze_astro_workload(crop_records: list[dict[str, Any]]) -> dict[str, Any]:
    crop_states = [
        crop_state
        for record in crop_records
        if (crop_state := _crop_state_from_record(record)) is not None
    ]
    mission = compute_mission_nutrition_status(crop_states, sol=30, harvest_log=[])
    replanting = recommend_replanting(30, mission, available_area_m2=20.0)

    monitored = [record for record in crop_records if record.get("healthStatus") == "MONITOR"]
    critical = [record for record in crop_records if record.get("healthStatus") == "CRITICAL"]
    dispatch_queue = len(monitored) + (2 * len(critical))
    nutrition_score = max(0, min(100, round(min(mission["days_of_food_remaining"], 120) / 120 * 100)))

    if dispatch_queue >= 4 or mission["viability_status"] == "CRITICAL":
        status = "ALERT"
    elif dispatch_queue > 0 or mission["viability_status"] in ("AT_RISK", "MARGINAL"):
        status = "WATCH"
    else:
        status = "NOMINAL"

    recommendations = []
    if critical:
        recommendations.append("Dispatch inspection crew to critical grow lanes first")
    if monitored:
        recommendations.append("Queue follow-up checks for monitored crop sections")
    if replanting:
        recommendations.append(f"Prepare next planting rotation around {replanting[0]['crop']}")
    if not recommendations:
        recommendations.append("Keep astronaut workload on nominal harvest cadence")

    headline = (
        "Astronaut workload and dispatch queue are nominal."
        if status == "NOMINAL"
        else recommendations[0]
    )

    return {
        "agent": "astro",
        "timestamp": utc_now_iso(),
        "status": status,
        "headline": headline,
        "riskScore": min(100, dispatch_queue * 15 + max(0, 70 - nutrition_score)),
        "dispatchQueue": dispatch_queue,
        "nutritionScore": nutrition_score,
        "missionStatus": mission,
        "recommendations": recommendations,
        "commands": [
            {"tool": "dispatch_astronaut_team", "summary": recommendation}
            for recommendation in recommendations[:3]
        ],
        "affectedModules": ["mission-wide"],
    }


def run_astro_agent() -> str:
    crop_records = list_crop_records()
    report = analyze_astro_workload(crop_records)
    severity = "CRITICAL" if report["status"] == "ALERT" else "WARN" if report["status"] == "WATCH" else "INFO"
    write_agent_event("astro", severity, report["headline"], "; ".join(report["recommendations"][:2]))
    return json.dumps(report)


if __name__ == "__main__":
    print(run_astro_agent())
