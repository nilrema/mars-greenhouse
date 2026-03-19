"""
Martian Environmental Hazard Events
Realistic mission-threatening scenarios that agents must handle.
"""

from __future__ import annotations

import random
from dataclasses import dataclass, field
from typing import Dict, List


@dataclass
class ActiveEvent:
    """An event currently affecting the greenhouse."""
    name: str
    remaining_sols: int
    effects: Dict

    def tick(self) -> bool:
        """Advance one sol. Returns True if event is still active."""
        self.remaining_sols -= 1
        return self.remaining_sols > 0


MARTIAN_EVENTS = [
    {
        "name": "dust_storm",
        "probability_per_sol": 0.03,    # ~13 events over 450 sols
        "duration_sols": 7,
        "effects": {
            "solar_power_reduction": 0.6,   # 60% power loss
            "ppfd_reduction": 0.8,          # 80% light reduction
            "temp_drop_celsius": 4,
        },
    },
    {
        "name": "co2_scrubber_fault",
        "probability_per_sol": 0.01,
        "duration_sols": 2,
        "effects": {
            "co2_ppm_increase_per_hour": 50,
        },
    },
    {
        "name": "water_pump_failure",
        "probability_per_sol": 0.008,
        "duration_sols": 1,
        "effects": {
            "irrigation_disabled": True,
        },
    },
    {
        "name": "nutrient_contamination",
        "probability_per_sol": 0.005,
        "duration_sols": 3,
        "effects": {
            "ph_drift": 1.5,
            "ec_spike": 1.8,
        },
    },
    {
        "name": "heater_malfunction",
        "probability_per_sol": 0.007,
        "duration_sols": 2,
        "effects": {
            "temp_drop_celsius": 8,
        },
    },
    {
        "name": "humidity_sensor_drift",
        "probability_per_sol": 0.006,
        "duration_sols": 4,
        "effects": {
            "humidity_offset": 12,
        },
    },
]


def roll_new_events(sol: int, active_events: List[ActiveEvent]) -> List[ActiveEvent]:
    """
    Roll for new events on this sol. Prevents duplicate active events.
    Returns list of newly triggered events.
    """
    active_names = {e.name for e in active_events}
    new_events = []

    for template in MARTIAN_EVENTS:
        if template["name"] in active_names:
            continue
        if random.random() < template["probability_per_sol"]:
            event = ActiveEvent(
                name=template["name"],
                remaining_sols=template["duration_sols"],
                effects=dict(template["effects"]),
            )
            new_events.append(event)

    return new_events


def generate_sol_conditions(
    sol: int,
    active_events: List[ActiveEvent],
    agent_setpoints: dict,
) -> dict:
    """
    Generate realistic sensor readings for a given sol,
    accounting for Martian events and agent-controlled setpoints.
    """
    base = {
        "temperature": agent_setpoints.get("temp_target", 22) + random.gauss(0, 0.3),
        "humidity": agent_setpoints.get("humidity_target", 65) + random.gauss(0, 1.2),
        "co2_ppm": agent_setpoints.get("co2_target", 1200) + random.gauss(0, 30),
        "ppfd": agent_setpoints.get("ppfd_target", 350) + random.gauss(0, 15),
        "water_litres": agent_setpoints.get("water_reserve", 1000),
        "ph": agent_setpoints.get("ph_target", 6.2) + random.gauss(0, 0.05),
        "nutrient_ec": agent_setpoints.get("ec_target", 2.2) + random.gauss(0, 0.1),
        "sol": sol,
    }

    # Apply active event effects
    irrigation_disabled = False
    for event in active_events:
        effects = event.effects
        if "solar_power_reduction" in effects:
            base["ppfd"] *= (1 - effects["ppfd_reduction"])
            base["temperature"] -= effects.get("temp_drop_celsius", 0)
        if "co2_ppm_increase_per_hour" in effects:
            base["co2_ppm"] += effects["co2_ppm_increase_per_hour"] * 24
        if "ph_drift" in effects:
            base["ph"] += effects["ph_drift"]
        if "ec_spike" in effects:
            base["nutrient_ec"] *= effects["ec_spike"]
        if "irrigation_disabled" in effects:
            irrigation_disabled = True
        if "temp_drop_celsius" in effects and "solar_power_reduction" not in effects:
            base["temperature"] -= effects["temp_drop_celsius"]
        if "humidity_offset" in effects:
            base["humidity"] += effects["humidity_offset"]

    base["irrigation_available"] = not irrigation_disabled

    # Clamp to physically possible values
    base["temperature"] = max(-10, base["temperature"])
    base["humidity"] = max(5, min(100, base["humidity"]))
    base["co2_ppm"] = max(200, base["co2_ppm"])
    base["ppfd"] = max(0, base["ppfd"])
    base["ph"] = max(3.0, min(10.0, base["ph"]))
    base["nutrient_ec"] = max(0.1, base["nutrient_ec"])

    return base
