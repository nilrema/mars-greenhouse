from agents.astro_agent import analyze_astro_workload
from agents.crop_agent import analyze_crop_health
from agents.environment_agent import analyze_environment
from agents.mission_orchestrator import compose_mission_decision
from agents.resource_agent import analyze_resources


def test_environment_agent_detects_climate_risk():
    report = analyze_environment(
        {
            "temperature": 32.0,
            "humidity": 86.0,
            "co2Ppm": 720,
            "lightPpfd": 180,
        }
    )

    assert report["status"] == "ALERT"
    assert report["riskScore"] > 0
    assert report["recommendations"]


def test_resource_agent_detects_water_and_power_pressure():
    report = analyze_resources(
        {
            "waterLitres": 70.0,
            "lightPpfd": 190.0,
            "nutrientEc": 1.4,
            "phLevel": 6.8,
        }
    )

    assert report["status"] == "ALERT"
    assert report["riskScore"] > 0
    assert any(item["metric"] == "waterLitres" for item in report["findings"])


def test_crop_agent_logic_detects_disease_risk():
    report = analyze_crop_health(
        {"humidity": 88.0, "temperature": 23.0, "co2Ppm": 1100},
        [
            {"name": "Tomato", "healthStatus": "MONITOR"},
            {"name": "Lettuce", "healthStatus": "HEALTHY"},
        ],
    )

    assert report["status"] in {"WATCH", "ALERT"}
    assert report["riskScore"] > 0


def test_astro_agent_exposes_dispatch_and_workload():
    report = analyze_astro_workload(
        [
            {"name": "Wheat", "variety": "Test", "growthStage": 4, "daysToHarvest": 80, "healthStatus": "HEALTHY", "zone": "main"},
            {"name": "Potato", "variety": "Test", "growthStage": 3, "daysToHarvest": 30, "healthStatus": "MONITOR", "zone": "main"},
            {"name": "Lettuce", "variety": "Test", "growthStage": 2, "daysToHarvest": 14, "healthStatus": "CRITICAL", "zone": "nursery"},
        ]
    )

    assert report["status"] in {"NOMINAL", "WATCH", "ALERT"}
    assert report["dispatchQueue"] >= 0
    assert report["recommendations"]


def test_orchestrator_prioritizes_highest_risk_specialist():
    decision = compose_mission_decision(
        environment_report={"agent": "environment", "status": "WATCH", "headline": "Environment watch", "riskScore": 30, "recommendations": []},
        crop_report={"agent": "crop", "status": "ALERT", "headline": "Crop alert", "riskScore": 72, "recommendations": []},
        astro_report={"agent": "astro", "status": "WATCH", "headline": "Astro watch", "riskScore": 44, "recommendations": []},
        resource_report={"agent": "resource", "status": "WATCH", "headline": "Resource watch", "riskScore": 61, "recommendations": []},
        scenario="disease-suspicion",
    )

    assert decision["leadAgent"] == "crop"
    assert "Scenario: disease-suspicion" in decision["operatorSummary"]
