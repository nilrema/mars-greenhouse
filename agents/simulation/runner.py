"""
450-Sol Accelerated Simulation Runner
Integrates crop growth, Martian events, nutrition, and agent setpoints.

Run with:  python -m agents.simulation.runner
"""

from __future__ import annotations

import json
import sys
from typing import Dict, List

from agents.simulation.mars_sim import (
    CROP_PROFILES,
    CropState,
    advance_crop,
    compute_growth_rate,
)
from agents.simulation.events import (
    ActiveEvent,
    roll_new_events,
    generate_sol_conditions,
)
from agents.simulation.nutrition import (
    ASTRONAUT_COUNT,
    KCAL_PER_ASTRONAUT_PER_SOL,
    MISSION_DURATION_SOLS,
    TOTAL_KCAL_NEEDED,
    compute_mission_nutrition_status,
    recommend_replanting,
)


# ── Initial greenhouse planting plan ────────────────────────────────────────

INITIAL_CROPS = [
    CropState(name="wheat",        variety="Martian Dwarf",   days_planted=0, days_to_harvest=90,  zone="main",      area_m2=15.0, planted_sol=0),
    CropState(name="sweet_potato", variety="Beauregard",      days_planted=0, days_to_harvest=120, zone="main",      area_m2=12.0, planted_sol=0),
    CropState(name="lettuce",      variety="Red Romaine",     days_planted=0, days_to_harvest=30,  zone="nursery",   area_m2=8.0,  planted_sol=0),
    CropState(name="tomato",       variety="Micro Dwarf",     days_planted=0, days_to_harvest=75,  zone="flowering", area_m2=10.0, planted_sol=0),
]

TOTAL_GROWING_AREA_M2 = 60.0  # total greenhouse crop area


def replant_crop(crop: CropState, sol: int) -> CropState:
    """Reset a crop for replanting after harvest."""
    return CropState(
        name=crop.name,
        variety=crop.variety,
        days_planted=0,
        days_to_harvest=crop.days_to_harvest,
        zone=crop.zone,
        area_m2=crop.area_m2,
        planted_sol=sol,
    )


def run_simulation(verbose: bool = False) -> dict:
    """
    Run a full 450-sol accelerated simulation.
    Returns comprehensive mission results.
    """
    # State
    crops: List[CropState] = [
        CropState(
            name=c.name, variety=c.variety, days_planted=0,
            days_to_harvest=c.days_to_harvest, zone=c.zone,
            area_m2=c.area_m2, planted_sol=0,
        )
        for c in INITIAL_CROPS
    ]
    active_events: List[ActiveEvent] = []
    harvest_log: List[dict] = []
    event_log: List[dict] = []
    nutrition_snapshots: List[dict] = []
    water_reserve = 2000.0  # starting water in litres

    # Agent setpoints (simple heuristic autopilot for simulation)
    setpoints = {
        "temp_target": 22.0,
        "humidity_target": 65.0,
        "co2_target": 1200,
        "ppfd_target": 400,
        "ph_target": 6.2,
        "ec_target": 2.2,
        "water_reserve": water_reserve,
    }

    for sol in range(1, MISSION_DURATION_SOLS + 1):
        # ── Roll for new events ─────────────────────────────────────
        new_events = roll_new_events(sol, active_events)
        for ev in new_events:
            event_log.append({"sol": sol, "event": ev.name, "action": "STARTED", "duration": ev.remaining_sols})
            if verbose:
                print(f"  Sol {sol:3d} ⚠️  {ev.name} started (duration: {ev.remaining_sols} sols)")
        active_events.extend(new_events)

        # ── Generate conditions ─────────────────────────────────────
        setpoints["water_reserve"] = water_reserve
        conditions = generate_sol_conditions(sol, active_events, setpoints)

        # ── Simple agent autopilot: respond to events ───────────────
        for ev in active_events:
            if ev.name == "dust_storm":
                setpoints["ppfd_target"] = max(200, setpoints["ppfd_target"] - 30)
            elif ev.name == "co2_scrubber_fault":
                setpoints["co2_target"] = max(800, setpoints["co2_target"] - 100)
            elif ev.name == "heater_malfunction":
                setpoints["temp_target"] = max(18, setpoints["temp_target"])

        # Restore setpoints after events end
        if not any(e.name == "dust_storm" for e in active_events):
            setpoints["ppfd_target"] = min(400, setpoints["ppfd_target"] + 10)
        if not any(e.name == "co2_scrubber_fault" for e in active_events):
            setpoints["co2_target"] = min(1200, setpoints["co2_target"] + 50)

        # ── Water consumption ───────────────────────────────────────
        daily_water = sum(
            CROP_PROFILES[c.name]["water_per_day_litres"] * c.area_m2 / 10
            for c in crops
        )
        # Throttle at 30%
        if water_reserve < 2000 * 0.3:
            daily_water *= 0.5
        if conditions.get("irrigation_available", True):
            water_reserve -= daily_water
        # Recycling recovers 85%
        water_reserve += daily_water * 0.85
        water_reserve = max(0, water_reserve)

        # ── Advance crops ───────────────────────────────────────────
        new_crops = []
        for crop in crops:
            water_ok = conditions.get("irrigation_available", True) and water_reserve > 50
            harvest = advance_crop(crop, conditions, water_available=water_ok)
            if harvest is not None:
                harvest["sol"] = sol
                harvest_log.append(harvest)
                if verbose:
                    print(f"  Sol {sol:3d} 🌾 Harvested {crop.name}: {harvest['biomass_kg']:.1f} kg ({harvest['kcal']:.0f} kcal)")
                # Replant immediately
                new_crops.append(replant_crop(crop, sol))
            else:
                new_crops.append(crop)
        crops = new_crops

        # ── Tick events ─────────────────────────────────────────────
        still_active = []
        for ev in active_events:
            if ev.tick():
                still_active.append(ev)
            else:
                event_log.append({"sol": sol, "event": ev.name, "action": "ENDED"})
                if verbose:
                    print(f"  Sol {sol:3d} ✅ {ev.name} ended")
        active_events = still_active

        # ── Nutrition snapshot (every 10 sols) ──────────────────────
        if sol % 10 == 0 or sol == 1 or sol == MISSION_DURATION_SOLS:
            status = compute_mission_nutrition_status(crops, sol, harvest_log)
            nutrition_snapshots.append(status)

            # Emergency replanting if needed
            if status["viability_status"] in ("AT_RISK", "CRITICAL"):
                used_area = sum(c.area_m2 for c in crops)
                free_area = TOTAL_GROWING_AREA_M2 - used_area
                if free_area > 0:
                    recs = recommend_replanting(sol, status, free_area)
                    for rec in recs:
                        profile = CROP_PROFILES[rec["crop"]]
                        new_crop = CropState(
                            name=rec["crop"],
                            variety="Emergency",
                            days_planted=0,
                            days_to_harvest=profile["days_to_harvest"],
                            zone="emergency",
                            area_m2=rec["area_m2"],
                            planted_sol=sol,
                        )
                        crops.append(new_crop)
                        if verbose:
                            print(f"  Sol {sol:3d} 🚨 Emergency planting: {rec['crop']} ({rec['area_m2']} m²)")

            if verbose and sol % 50 == 0:
                print(f"\n--- Sol {sol} Nutrition: {status['viability_status']} | "
                      f"Available: {status['kcal_total_available']:,.0f} kcal | "
                      f"Needed: {status['kcal_needed_remaining']:,.0f} kcal | "
                      f"Water: {water_reserve:.0f}L ---\n")

    # ── Final summary ───────────────────────────────────────────────
    final_nutrition = compute_mission_nutrition_status(crops, MISSION_DURATION_SOLS, harvest_log)

    total_harvested_kcal = sum(h.get("kcal", 0) for h in harvest_log)
    total_harvested_kg = sum(h.get("biomass_kg", 0) for h in harvest_log)

    # Group harvests by crop
    harvest_by_crop: Dict[str, dict] = {}
    for h in harvest_log:
        name = h["crop"]
        if name not in harvest_by_crop:
            harvest_by_crop[name] = {"count": 0, "total_kg": 0, "total_kcal": 0}
        harvest_by_crop[name]["count"] += 1
        harvest_by_crop[name]["total_kg"] += h["biomass_kg"]
        harvest_by_crop[name]["total_kcal"] += h["kcal"]

    # Round values for display
    for v in harvest_by_crop.values():
        v["total_kg"] = round(v["total_kg"], 1)
        v["total_kcal"] = round(v["total_kcal"], 0)

    return {
        "mission_duration_sols": MISSION_DURATION_SOLS,
        "astronaut_count": ASTRONAUT_COUNT,
        "total_kcal_required": TOTAL_KCAL_NEEDED,
        "total_kcal_harvested": round(total_harvested_kcal),
        "total_kg_harvested": round(total_harvested_kg, 1),
        "total_harvests": len(harvest_log),
        "harvest_by_crop": harvest_by_crop,
        "total_events": len([e for e in event_log if e["action"] == "STARTED"]),
        "event_log": event_log,
        "final_water_reserve_litres": round(water_reserve, 1),
        "final_nutrition": final_nutrition,
        "nutrition_timeline": nutrition_snapshots,
        "mission_viable": final_nutrition["mission_viable"],
    }


def main():
    print("=" * 70)
    print("  MARS GREENHOUSE — 450-Sol Mission Simulation")
    print("=" * 70)
    print()

    verbose = "--verbose" in sys.argv or "-v" in sys.argv
    results = run_simulation(verbose=verbose)

    print(f"Mission Duration:    {results['mission_duration_sols']} sols")
    print(f"Astronauts:          {results['astronaut_count']}")
    print(f"Total kcal required: {results['total_kcal_required']:,}")
    print(f"Total kcal produced: {results['total_kcal_harvested']:,}")
    print(f"Total kg harvested:  {results['total_kg_harvested']:,.1f}")
    print(f"Total harvests:      {results['total_harvests']}")
    print(f"Total events:        {results['total_events']}")
    print(f"Final water reserve: {results['final_water_reserve_litres']:.1f} L")
    print()

    print("Harvest breakdown:")
    for crop, data in results["harvest_by_crop"].items():
        print(f"  {crop:15s} — {data['count']:3d} harvests, "
              f"{data['total_kg']:8.1f} kg, {data['total_kcal']:10,.0f} kcal")
    print()

    status = results["final_nutrition"]
    print(f"Mission Viability:   {status['viability_status']}")
    print(f"Days of food left:   {status['days_of_food_remaining']:.1f}")
    if status["deficit_kcal"] > 0:
        print(f"Caloric deficit:     {status['deficit_kcal']:,.0f} kcal")
    else:
        print(f"Caloric surplus:     {status['surplus_kcal']:,.0f} kcal")
    print()

    if results["mission_viable"]:
        print("✅ MISSION VIABLE — Greenhouse can sustain the crew for 450 sols.")
    else:
        print("❌ MISSION AT RISK — Caloric deficit detected. Strategy adjustment needed.")

    print()
    print("=" * 70)

    # Write full results to JSON for dashboard consumption
    with open("simulation_results.json", "w") as f:
        json.dump(results, f, indent=2, default=str)
    print("Full results written to simulation_results.json")


if __name__ == "__main__":
    main()
