"""
Compatibility wrapper.

Crew nutrition is now a subsystem of the Astro Agent.
"""

from agents.astro_agent import analyze_astro_workload, run_astro_agent


def summarize_crew_nutrition(crop_records):
    report = analyze_astro_workload(crop_records)
    return {
        "agent": "crew-nutrition",
        "timestamp": report["timestamp"],
        "nutrition_score": report["nutritionScore"],
        "meal_diversity": min(100, max(20, 100 - report["dispatchQueue"] * 8)),
        "food_security": min(100, report["nutritionScore"]),
        "crew_health_risk": "HIGH" if report["status"] == "ALERT" else "MEDIUM" if report["status"] == "WATCH" else "LOW",
        "mission_status": report["missionStatus"],
        "recommended_crop_actions": report["recommendations"],
    }


def run_crew_nutrition_agent() -> str:
    return run_astro_agent()


if __name__ == "__main__":
    print(run_crew_nutrition_agent())
