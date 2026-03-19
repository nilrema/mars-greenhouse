"""
Mars Greenhouse Crop Growth Simulation
Physics-lite model based on real agronomic data.
Uses Liebig's Law of the Minimum for growth rate calculation.
"""

from __future__ import annotations

import math
from dataclasses import dataclass, field
from typing import Dict, List, Optional


@dataclass
class CropState:
    """Represents the current state of a crop planting."""
    name: str
    variety: str
    days_planted: int
    days_to_harvest: int
    growth_rate: float = 1.0      # 0.0 to 1.0, affected by conditions
    biomass_kg: float = 0.0       # actual harvestable mass accumulating
    health: float = 1.0           # 0.0 to 1.0
    zone: str = "main"
    area_m2: float = 10.0         # growing area allocated
    planted_sol: int = 0          # sol when planted


# Real agronomic data — calibrated for controlled-environment agriculture
CROP_PROFILES = {
    "lettuce": {
        "days_to_harvest": 30,
        "optimal_temp": (18, 24),
        "optimal_humidity": (60, 70),
        "optimal_co2": (1000, 1500),
        "optimal_ppfd": (200, 300),
        "water_per_day_litres": 0.8,
        "kcal_per_kg": 150,
        "yield_kg_per_m2": 3.5,
    },
    "tomato": {
        "days_to_harvest": 75,
        "optimal_temp": (20, 26),
        "optimal_humidity": (65, 75),
        "optimal_co2": (1000, 1500),
        "optimal_ppfd": (400, 600),
        "water_per_day_litres": 2.1,
        "kcal_per_kg": 180,
        "yield_kg_per_m2": 8.0,
    },
    "sweet_potato": {
        "days_to_harvest": 120,
        "optimal_temp": (21, 26),
        "optimal_humidity": (60, 70),
        "optimal_co2": (1000, 1500),
        "optimal_ppfd": (300, 500),
        "water_per_day_litres": 1.5,
        "kcal_per_kg": 860,     # highest caloric density — critical for Mars
        "yield_kg_per_m2": 5.0,
    },
    "wheat": {
        "days_to_harvest": 90,
        "optimal_temp": (15, 22),
        "optimal_humidity": (50, 65),
        "optimal_co2": (1000, 1500),
        "optimal_ppfd": (400, 700),
        "water_per_day_litres": 1.2,
        "kcal_per_kg": 3400,    # extremely calorie-dense
        "yield_kg_per_m2": 1.8,
    },
}


def range_score(value: float, optimal_range: tuple[float, float]) -> float:
    """Score how close a value is to an optimal range (0.0–1.0)."""
    low, high = optimal_range
    if low <= value <= high:
        return 1.0
    elif value < low:
        return max(0.0, 1.0 - (low - value) / low) if low != 0 else 0.0
    else:
        return max(0.0, 1.0 - (value - high) / high) if high != 0 else 0.0


def compute_growth_rate(crop_name: str, conditions: dict) -> float:
    """
    Returns a growth rate multiplier 0.0–1.0 based on how close
    current conditions are to optimal for this crop.

    Based on Liebig's Law of the Minimum — the worst condition
    is the limiting factor, not the average.
    """
    profile = CROP_PROFILES[crop_name]
    scores = []

    scores.append(range_score(conditions["temperature"], profile["optimal_temp"]))
    scores.append(range_score(conditions["humidity"], profile["optimal_humidity"]))
    scores.append(range_score(conditions["co2_ppm"], profile["optimal_co2"]))
    scores.append(range_score(conditions["ppfd"], profile["optimal_ppfd"]))

    # Liebig's Law — worst factor limits growth
    return min(scores)


def advance_crop(crop: CropState, conditions: dict, water_available: bool = True) -> Optional[dict]:
    """
    Advance a crop by one sol. Returns a harvest dict if the crop is ready,
    otherwise returns None and updates the crop in-place.
    """
    profile = CROP_PROFILES[crop.name]

    # Compute growth rate from current conditions
    growth = compute_growth_rate(crop.name, conditions)

    # Water stress halves growth
    if not water_available:
        growth *= 0.5
        crop.health = max(0.0, crop.health - 0.02)

    crop.growth_rate = growth
    crop.days_planted += 1

    # Accumulate biomass (linear approximation scaled by growth rate and health)
    daily_biomass = (profile["yield_kg_per_m2"] * crop.area_m2) / profile["days_to_harvest"]
    crop.biomass_kg += daily_biomass * growth * crop.health

    # Health degrades slightly when conditions are poor
    if growth < 0.5:
        crop.health = max(0.0, crop.health - 0.01)
    elif growth > 0.8:
        crop.health = min(1.0, crop.health + 0.002)

    # Check for harvest
    if crop.days_planted >= profile["days_to_harvest"]:
        kcal = crop.biomass_kg * profile["kcal_per_kg"]
        harvest = {
            "crop": crop.name,
            "variety": crop.variety,
            "zone": crop.zone,
            "biomass_kg": round(crop.biomass_kg, 2),
            "kcal": round(kcal, 1),
            "health_at_harvest": round(crop.health, 3),
            "growth_efficiency": round(crop.biomass_kg / (profile["yield_kg_per_m2"] * crop.area_m2), 3),
            "harvested_sol": crop.days_planted + crop.planted_sol,
        }
        return harvest

    return None
