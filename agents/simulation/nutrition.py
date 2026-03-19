"""
Nutritional Accounting Model for Mars Mission
Tracks caloric projections for 4 astronauts across a 450-sol mission.
"""

from __future__ import annotations

from typing import Dict, List

from agents.simulation.mars_sim import CROP_PROFILES, CropState

# Mission constants
ASTRONAUT_COUNT = 4
KCAL_PER_ASTRONAUT_PER_SOL = 2300   # Mars Sol is ~24h 37min
MISSION_DURATION_SOLS = 450
TOTAL_KCAL_NEEDED = ASTRONAUT_COUNT * KCAL_PER_ASTRONAUT_PER_SOL * MISSION_DURATION_SOLS


def compute_mission_nutrition_status(
    crop_states: List[CropState],
    sol: int,
    harvest_log: List[dict],
) -> dict:
    """
    Projects whether current crop plan will feed 4 astronauts
    for the remaining mission duration.

    Returns a status dict with viability assessment and key metrics.
    """
    sols_remaining = max(0, MISSION_DURATION_SOLS - sol)
    kcal_needed_remaining = ASTRONAUT_COUNT * KCAL_PER_ASTRONAUT_PER_SOL * sols_remaining

    # Project yield from currently growing crops
    projected_kcal = 0.0
    crop_projections = []

    for crop in crop_states:
        if crop.name not in CROP_PROFILES:
            continue
        profile = CROP_PROFILES[crop.name]

        # How many full harvests can this crop complete in remaining sols?
        days_until_first_harvest = max(0, profile["days_to_harvest"] - crop.days_planted)
        if days_until_first_harvest > sols_remaining:
            # Won't complete even the current cycle
            remaining_after_first = 0
            harvests_remaining = 0
        else:
            remaining_after_first = sols_remaining - days_until_first_harvest
            # +1 for the current cycle completing
            harvests_remaining = 1 + (remaining_after_first // profile["days_to_harvest"])

        projected_kg = harvests_remaining * profile["yield_kg_per_m2"] * crop.area_m2
        crop_kcal = projected_kg * profile["kcal_per_kg"] * crop.health
        projected_kcal += crop_kcal

        crop_projections.append({
            "crop": crop.name,
            "zone": crop.zone,
            "area_m2": crop.area_m2,
            "health": round(crop.health, 3),
            "harvests_remaining": harvests_remaining,
            "projected_kg": round(projected_kg, 1),
            "projected_kcal": round(crop_kcal, 0),
        })

    # Add already harvested food in storage
    stored_kcal = sum(h.get("kcal", 0) for h in harvest_log)
    total_available = projected_kcal + stored_kcal
    deficit = kcal_needed_remaining - total_available
    days_of_food = (
        total_available / (ASTRONAUT_COUNT * KCAL_PER_ASTRONAUT_PER_SOL)
        if ASTRONAUT_COUNT * KCAL_PER_ASTRONAUT_PER_SOL > 0
        else 0
    )

    # Viability tiers
    if deficit <= 0:
        viability = "ON_TRACK"
    elif total_available >= kcal_needed_remaining * 0.9:
        viability = "MARGINAL"
    elif total_available >= kcal_needed_remaining * 0.6:
        viability = "AT_RISK"
    else:
        viability = "CRITICAL"

    return {
        "sol": sol,
        "sols_remaining": sols_remaining,
        "astronaut_count": ASTRONAUT_COUNT,
        "kcal_per_astronaut_per_sol": KCAL_PER_ASTRONAUT_PER_SOL,
        "kcal_needed_remaining": round(kcal_needed_remaining),
        "kcal_from_projected_harvests": round(projected_kcal),
        "kcal_from_storage": round(stored_kcal),
        "kcal_total_available": round(total_available),
        "deficit_kcal": round(max(0, deficit)),
        "surplus_kcal": round(max(0, -deficit)),
        "days_of_food_remaining": round(days_of_food, 1),
        "mission_viable": deficit <= 0,
        "viability_status": viability,
        "crop_projections": crop_projections,
    }


def recommend_replanting(
    sol: int,
    nutrition_status: dict,
    available_area_m2: float = 20.0,
) -> List[dict]:
    """
    If mission is at risk, recommend which crops to plant to close the caloric gap.
    Prioritises calorie-dense crops (wheat, sweet_potato) as mission end approaches.
    """
    if nutrition_status["viability_status"] == "ON_TRACK":
        return []

    sols_remaining = nutrition_status["sols_remaining"]
    deficit = nutrition_status["deficit_kcal"]

    recommendations = []

    # Sort crops by kcal-per-m2-per-sol (efficiency)
    efficiency = []
    for name, profile in CROP_PROFILES.items():
        if profile["days_to_harvest"] > sols_remaining:
            continue  # can't complete a harvest
        kcal_per_m2_per_sol = (
            profile["kcal_per_kg"] * profile["yield_kg_per_m2"]
        ) / profile["days_to_harvest"]
        efficiency.append((name, kcal_per_m2_per_sol, profile))

    efficiency.sort(key=lambda x: x[1], reverse=True)

    remaining_area = available_area_m2
    remaining_deficit = deficit

    for name, kcal_rate, profile in efficiency:
        if remaining_deficit <= 0 or remaining_area <= 0:
            break

        # How much area do we need to close the gap with this crop?
        harvests_possible = sols_remaining // profile["days_to_harvest"]
        if harvests_possible == 0:
            continue

        kcal_per_m2 = profile["kcal_per_kg"] * profile["yield_kg_per_m2"] * harvests_possible
        area_needed = min(remaining_area, remaining_deficit / kcal_per_m2) if kcal_per_m2 > 0 else 0
        area_needed = max(1.0, round(area_needed, 1))  # at least 1 m²

        if area_needed > remaining_area:
            area_needed = remaining_area

        kcal_from_this = kcal_per_m2 * area_needed

        recommendations.append({
            "action": "PLANT",
            "crop": name,
            "area_m2": area_needed,
            "expected_harvests": harvests_possible,
            "expected_kcal": round(kcal_from_this),
            "priority": "CRITICAL" if nutrition_status["viability_status"] == "CRITICAL" else "HIGH",
        })

        remaining_area -= area_needed
        remaining_deficit -= kcal_from_this

    return recommendations
