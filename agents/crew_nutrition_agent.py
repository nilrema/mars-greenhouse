"""
Crew Nutrition Agent.

Functional first-pass agent that connects crop output and crop diversity to
crew nutrition score, meal diversity, food security, and health risk.
"""

from __future__ import annotations

import json
from typing import Any

from agents.agent_support import list_crop_records, utc_now_iso, write_agent_event
from agents.simulation.mars_sim import CropState
from agents.simulation.nutrition import (
    compute_mission_nutrition_status,
    recommend_replanting,
)

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


def summarize_crew_nutrition(crop_records: list[dict[str, Any]]) -> dict[str, Any]:
    crop_states = [
        crop_state
        for record in crop_records
        if (crop_state := _crop_state_from_record(record)) is not None
    ]

    mission = compute_mission_nutrition_status(crop_states, sol=30, harvest_log=[])
    diversity_ratio = min(1.0, len({state.name for state in crop_states}) / 5.0)
    food_security = min(100, round(mission["days_of_food_remaining"] / 1.2))
    nutrition_score = max(
        0,
        min(
            100,
            round(
                (diversity_ratio * 35)
                + (min(mission["days_of_food_remaining"], 120) / 120 * 45)
                + (sum(state.health for state in crop_states) / max(len(crop_states), 1) * 20)
            ),
        ),
    )
    meal_diversity = round(diversity_ratio * 100)

    if mission["viability_status"] == "CRITICAL" or nutrition_score < 35:
        crew_health_risk = "HIGH"
    elif mission["viability_status"] in ("AT_RISK", "MARGINAL") or nutrition_score < 65:
        crew_health_risk = "MEDIUM"
    else:
        crew_health_risk = "LOW"

    replanting = recommend_replanting(30, mission, available_area_m2=20.0)

    return {
        "agent": "crew-nutrition",
        "timestamp": utc_now_iso(),
        "nutrition_score": nutrition_score,
        "meal_diversity": meal_diversity,
        "food_security": food_security,
        "crew_health_risk": crew_health_risk,
        "mission_status": mission,
        "recommended_crop_actions": replanting,
    }


def run_crew_nutrition_agent() -> str:
    crop_records = list_crop_records()
    report = summarize_crew_nutrition(crop_records)

    severity = "CRITICAL" if report["crew_health_risk"] == "HIGH" else "WARN" if report["crew_health_risk"] == "MEDIUM" else "INFO"
    action_text = "Crew nutrition stable"
    if report["recommended_crop_actions"]:
        action_text = "; ".join(
            f"Plant {item['crop']} on {item['area_m2']} m2"
            for item in report["recommended_crop_actions"][:2]
        )

    write_agent_event(
        "crew-nutrition",
        severity,
        f"Crew nutrition score {report['nutrition_score']} and health risk {report['crew_health_risk']}",
        action_text,
    )
    return json.dumps(report)


if __name__ == "__main__":
    print(run_crew_nutrition_agent())
