import json

from agents.astro_agent import run_astro_agent
from agents.chat_runtime import build_chat_response
from agents.crop_agent import run_crop_agent
from agents.environment_agent import run_environment_agent
from agents.mcp_support import query_mars_crop_knowledge
from agents.mission_orchestrator import run_mission_orchestrator
from agents.resource_agent import run_resource_agent

SENSOR_SNAPSHOT = {
    "temperature": 18.0,
    "humidity": 84.0,
    "co2Ppm": 790.0,
    "lightPpfd": 210.0,
    "phLevel": 6.7,
    "nutrientEc": 1.4,
    "waterLitres": 82.0,
}

CROP_RECORDS = [
    {"name": "Lettuce", "variety": "Butterhead", "growthStage": 2, "daysToHarvest": 16, "healthStatus": "MONITOR", "zone": "lane-a"},
    {"name": "Tomato", "variety": "Roma", "growthStage": 3, "daysToHarvest": 32, "healthStatus": "CRITICAL", "zone": "lane-b"},
    {"name": "Potato", "variety": "Yukon", "growthStage": 4, "daysToHarvest": 46, "healthStatus": "HEALTHY", "zone": "lane-c"},
]


def test_retained_specialists_expose_clear_smoke_outputs():
    environment = json.loads(run_environment_agent(sensor_data=SENSOR_SNAPSHOT, persist_event=False))
    crop = json.loads(
        run_crop_agent(
            sensor_data=SENSOR_SNAPSHOT,
            crop_records=CROP_RECORDS,
            persist_event=False,
        )
    )
    astro = json.loads(run_astro_agent(crop_records=CROP_RECORDS, persist_event=False))
    resource = json.loads(run_resource_agent(sensor_data=SENSOR_SNAPSHOT, persist_event=False))

    for agent_id, report in {
        "environment": environment,
        "crop": crop,
        "astro": astro,
        "resource": resource,
    }.items():
        assert report["agent"] == agent_id
        assert report["status"] in {"NOMINAL", "WATCH", "ALERT"}
        assert report["headline"]
        assert report["recommendations"]
        assert report["knowledgeBase"]["access"]["configured"] is True


def test_orchestrator_runs_retained_agent_set_only():
    result = json.loads(
        run_mission_orchestrator(
            prompt="Review water pressure and crop risk.",
            sensor_data=SENSOR_SNAPSHOT,
            crop_records=CROP_RECORDS,
            persist_events=False,
            include_knowledge=True,
        )
    )

    assert set(result["reports"].keys()) == {"environment", "crop", "astro", "resource"}
    assert result["decision"]["leadAgent"] in {"environment", "crop", "astro", "resource", "orchestrator"}
    assert result["reports"]["crop"]["knowledgeBase"]["guidance"]["status"] in {"available", "unavailable", "unconfigured"}


def test_chat_runtime_uses_real_orchestrator_flow():
    response = build_chat_response(
        {
            "message": "Review the latest simulation change and coordinate the specialists.",
            "context": {
                "temperatureDrift": -6,
                "waterRecycling": 58,
                "powerAvailability": 63,
            },
        }
    )

    assert response["messages"][0]["agentId"] == "orchestrator"
    assert response["messages"][-1]["agentId"] == "orchestrator"
    assert {message["agentId"] for message in response["messages"]} >= {
        "environment",
        "crop",
        "astro",
        "resource",
        "orchestrator",
    }
    assert response["agentStatuses"][-1]["id"] == "orchestrator"


def test_mcp_helper_reports_transport_errors_without_throwing():
    result = query_mars_crop_knowledge(
        "Mars crop stress guidance",
        transport=lambda url, request, headers: {"error": {"message": "gateway unavailable"}},
    )

    assert result["ok"] is False
    assert result["status"] == "unavailable"
    assert "gateway unavailable" in result["error"]
