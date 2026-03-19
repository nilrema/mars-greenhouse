"""
Tests for the Mars simulation engine.
Run with: python -m pytest agents/simulation/test_sim.py -v
"""

import pytest
from agents.simulation.mars_sim import (
    CROP_PROFILES,
    CropState,
    advance_crop,
    compute_growth_rate,
    range_score,
)
from agents.simulation.events import (
    ActiveEvent,
    generate_sol_conditions,
    roll_new_events,
)
from agents.simulation.nutrition import (
    ASTRONAUT_COUNT,
    KCAL_PER_ASTRONAUT_PER_SOL,
    MISSION_DURATION_SOLS,
    compute_mission_nutrition_status,
    recommend_replanting,
)


# ── mars_sim tests ──────────────────────────────────────────────────────────


class TestRangeScore:
    def test_within_range(self):
        assert range_score(22, (18, 24)) == 1.0

    def test_at_boundaries(self):
        assert range_score(18, (18, 24)) == 1.0
        assert range_score(24, (18, 24)) == 1.0

    def test_below_range(self):
        score = range_score(15, (18, 24))
        assert 0.0 < score < 1.0

    def test_above_range(self):
        score = range_score(30, (18, 24))
        assert 0.0 < score < 1.0

    def test_far_below(self):
        assert range_score(0, (18, 24)) == 0.0

    def test_far_above(self):
        score = range_score(100, (18, 24))
        assert score == 0.0 or score < 0.1


class TestComputeGrowthRate:
    OPTIMAL_CONDITIONS = {
        "temperature": 22,
        "humidity": 65,
        "co2_ppm": 1200,
        "ppfd": 250,
    }

    def test_optimal_conditions_lettuce(self):
        rate = compute_growth_rate("lettuce", self.OPTIMAL_CONDITIONS)
        assert rate == 1.0

    def test_suboptimal_temperature(self):
        conditions = {**self.OPTIMAL_CONDITIONS, "temperature": 10}
        rate = compute_growth_rate("lettuce", conditions)
        assert 0.0 < rate < 1.0

    def test_all_crops_have_profiles(self):
        for crop in CROP_PROFILES:
            rate = compute_growth_rate(crop, self.OPTIMAL_CONDITIONS)
            assert 0.0 <= rate <= 1.0


class TestAdvanceCrop:
    def test_biomass_accumulates(self):
        crop = CropState(name="lettuce", variety="Test", days_planted=0,
                         days_to_harvest=30, area_m2=10.0)
        conditions = {"temperature": 22, "humidity": 65, "co2_ppm": 1200, "ppfd": 250}
        advance_crop(crop, conditions)
        assert crop.biomass_kg > 0
        assert crop.days_planted == 1

    def test_harvest_at_maturity(self):
        crop = CropState(name="lettuce", variety="Test", days_planted=29,
                         days_to_harvest=30, area_m2=10.0, biomass_kg=1.0)
        conditions = {"temperature": 22, "humidity": 65, "co2_ppm": 1200, "ppfd": 250}
        result = advance_crop(crop, conditions)
        assert result is not None
        assert "kcal" in result
        assert result["kcal"] > 0

    def test_no_harvest_before_maturity(self):
        crop = CropState(name="lettuce", variety="Test", days_planted=10,
                         days_to_harvest=30, area_m2=10.0)
        conditions = {"temperature": 22, "humidity": 65, "co2_ppm": 1200, "ppfd": 250}
        result = advance_crop(crop, conditions)
        assert result is None

    def test_water_stress_reduces_health(self):
        crop = CropState(name="lettuce", variety="Test", days_planted=0,
                         days_to_harvest=30, area_m2=10.0, health=1.0)
        conditions = {"temperature": 22, "humidity": 65, "co2_ppm": 1200, "ppfd": 250}
        advance_crop(crop, conditions, water_available=False)
        assert crop.health < 1.0


# ── events tests ────────────────────────────────────────────────────────────


class TestEvents:
    def test_generate_sol_conditions_returns_all_fields(self):
        conditions = generate_sol_conditions(1, [], {})
        for key in ["temperature", "humidity", "co2_ppm", "ppfd", "ph", "nutrient_ec", "sol"]:
            assert key in conditions

    def test_dust_storm_reduces_light(self):
        storm = ActiveEvent(
            name="dust_storm", remaining_sols=3,
            effects={"solar_power_reduction": 0.6, "ppfd_reduction": 0.8, "temp_drop_celsius": 4}
        )
        normal = generate_sol_conditions(1, [], {"ppfd_target": 400})
        stormy = generate_sol_conditions(1, [storm], {"ppfd_target": 400})
        assert stormy["ppfd"] < normal["ppfd"]

    def test_event_tick(self):
        ev = ActiveEvent(name="test", remaining_sols=2, effects={})
        assert ev.tick() is True   # 1 sol remaining
        assert ev.tick() is False  # 0 sols remaining

    def test_roll_no_duplicates(self):
        existing = [ActiveEvent(name="dust_storm", remaining_sols=3, effects={})]
        # run many rolls — dust_storm should never appear again
        for _ in range(100):
            new = roll_new_events(1, existing)
            assert not any(e.name == "dust_storm" for e in new)


# ── nutrition tests ─────────────────────────────────────────────────────────


class TestNutrition:
    def test_mission_constants(self):
        assert ASTRONAUT_COUNT == 4
        assert MISSION_DURATION_SOLS == 450

    def test_nutrition_status_structure(self):
        crops = [CropState(name="wheat", variety="Test", days_planted=0,
                           days_to_harvest=90, area_m2=20.0, health=1.0)]
        status = compute_mission_nutrition_status(crops, 0, [])
        assert "viability_status" in status
        assert "kcal_needed_remaining" in status
        assert "days_of_food_remaining" in status

    def test_stored_kcal_counted(self):
        harvests = [{"kcal": 100_000}, {"kcal": 200_000}]
        status = compute_mission_nutrition_status([], 400, harvests)
        assert status["kcal_from_storage"] == 300_000

    def test_recommend_replanting_when_critical(self):
        fake_status = {
            "viability_status": "CRITICAL",
            "deficit_kcal": 1_000_000,
            "sols_remaining": 200,
        }
        recs = recommend_replanting(250, fake_status, available_area_m2=20.0)
        assert len(recs) > 0
        assert recs[0]["action"] == "PLANT"

    def test_no_replanting_when_on_track(self):
        fake_status = {
            "viability_status": "ON_TRACK",
            "deficit_kcal": 0,
            "sols_remaining": 200,
        }
        recs = recommend_replanting(250, fake_status, available_area_m2=20.0)
        assert len(recs) == 0


# ── Integration test ────────────────────────────────────────────────────────


class TestSimulationIntegration:
    def test_full_simulation_runs(self):
        """Run the full 450-sol simulation and verify it completes."""
        from agents.simulation.runner import run_simulation
        results = run_simulation(verbose=False)

        assert results["mission_duration_sols"] == 450
        assert results["total_harvests"] > 0
        assert results["total_kcal_harvested"] > 0
        assert results["total_kg_harvested"] > 0
        assert "final_nutrition" in results
        assert "nutrition_timeline" in results
        assert len(results["nutrition_timeline"]) > 0
