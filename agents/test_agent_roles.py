import json

from agents.crop_health_agent import analyze_crop_health
from agents.crew_nutrition_agent import summarize_crew_nutrition
from agents.greenhouse_operations_agent import analyze_greenhouse_operations
from agents.incident_chaos_agent import create_chaos_report
from agents.mission_orchestrator import compose_mission_decision


def test_greenhouse_operations_detects_critical_conditions():
    report = analyze_greenhouse_operations(
        {
            "temperature": 33.0,
            "humidity": 82.0,
            "co2Ppm": 700,
            "lightPpfd": 150,
            "waterLitres": 70,
        }
    )

    assert report["status"] == "CRITICAL"
    assert report["risk_score"] > 0
    assert any(item["metric"] == "temperature" for item in report["issues"])
    assert any(cmd["tool"] == "trigger_irrigation" for cmd in report["recommended_commands"])


def test_crop_health_detects_disease_risk_and_monitored_crops():
    report = analyze_crop_health(
        {"humidity": 88.0, "temperature": 23.0, "co2Ppm": 1100},
        [
            {"name": "Tomato", "healthStatus": "MONITOR"},
            {"name": "Lettuce", "healthStatus": "HEALTHY"},
        ],
    )

    assert report["status"] in {"MONITOR", "CRITICAL"}
    assert report["disease_risk_score"] > 0
    assert len(report["anomalies"]) >= 1


def test_crew_nutrition_summary_exposes_required_ui_metrics():
    report = summarize_crew_nutrition(
        [
            {"name": "Wheat", "variety": "Test", "growthStage": 4, "daysToHarvest": 80, "healthStatus": "HEALTHY", "zone": "main"},
            {"name": "Potato", "variety": "Test", "growthStage": 3, "daysToHarvest": 30, "healthStatus": "MONITOR", "zone": "main"},
            {"name": "Lettuce", "variety": "Test", "growthStage": 2, "daysToHarvest": 14, "healthStatus": "HEALTHY", "zone": "nursery"},
        ]
    )

    assert 0 <= report["nutrition_score"] <= 100
    assert 0 <= report["meal_diversity"] <= 100
    assert 0 <= report["food_security"] <= 100
    assert report["crew_health_risk"] in {"LOW", "MEDIUM", "HIGH"}


def test_chaos_report_targets_two_greenhouses():
    report = create_chaos_report("wind", sensor_data={"humidity": 60})

    assert report["scenario"] in {"wind", "disease", "dust_storm"}
    assert len(report["affected_greenhouses"]) == 2
    assert report["severity"] in {"WARN", "CRITICAL"}


def test_mission_orchestrator_prioritizes_crew_risk_first():
    decision = compose_mission_decision(
        operations_report={"status": "CRITICAL"},
        crop_report={"status": "MONITOR"},
        crew_report={"crew_health_risk": "HIGH"},
        incident_report={"label": "Regional dust storm", "scenario": "dust_storm"},
    )

    assert decision["lead_agent"] == "crew-nutrition"
    assert "Crew health risk is high" in decision["chat_response"]
