import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from agents import orchestrator, specialized_agents
from agents.bedrock_config import (
    DEFAULT_BEDROCK_MODEL,
    DEFAULT_BEDROCK_REGION,
    DEFAULT_ORCHESTRATOR_MODEL,
    DEFAULT_SPECIALIST_MODEL,
    normalize_bedrock_model_id,
    resolve_bedrock_model,
)
from agents.mcp import DEFAULT_MARS_KB_URL, build_mars_kb_tools
from agents.response_cleaning import clean_agent_response, format_action_response


def test_handle_chat_rejects_blank_query():
    assert orchestrator.handle_chat("   ") == "Please enter a question for the agent system."


def test_handle_chat_uses_orchestrator_agent(monkeypatch):
    monkeypatch.setattr(orchestrator, "get_greenhouse_snapshot", lambda **kwargs: {
        "greenhouseId": "mars-greenhouse-1",
        "latestSensorReading": {},
        "cropRecords": [],
        "moduleSummaries": [],
        "agentSnapshots": [],
        "actionRequests": [],
        "actuatorCommands": [],
    })

    class FakeOrchestrator:
        def __call__(self, query: str) -> str:
            assert "Operator request:\nPower dropped and crops are stressed" in query
            assert "Relevant specialists for this request:" in query
            assert "resource_agent" in query
            return "- Reduce LED light usage.\n- Harvest lettuce now."

    monkeypatch.setattr(orchestrator, "create_orchestrator_agent", lambda: FakeOrchestrator())
    assert orchestrator.handle_chat("Power dropped and crops are stressed") == (
        "- Reduce LED light usage\n- Harvest lettuce now"
    )


def test_handle_chat_prefers_operator_telemetry_for_current_temperature(monkeypatch):
    monkeypatch.setattr(orchestrator, "get_greenhouse_snapshot", lambda **kwargs: {
        "greenhouseId": "mars-greenhouse-1",
        "latestSensorReading": {
            "timestamp": "2026-03-20T10:00:00Z",
            "temperature": 22.09,
            "humidity": 64,
            "recycleRatePercent": 100,
            "powerKw": 9.2,
            "cropStressIndex": 34,
        },
        "cropRecords": [],
        "moduleSummaries": [],
        "agentSnapshots": [],
        "actionRequests": [],
        "actuatorCommands": [],
    })

    assert orchestrator.handle_chat(
        "What is the current temperature?",
        operator_telemetry={
            "timestamp": "2026-03-20T10:01:00Z",
            "temperature": 16,
            "humidity": 59,
            "waterRecycling": 60,
            "powerAvailability": 30,
            "healthScore": 72,
        },
    ) == (
        "- Current temperature: 16.00°C\n"
        "- Current humidity: 59%\n"
        "- Water recycling: 60%\n"
        "- Power availability: 30%\n"
        "- Health score: 72"
    )


def test_handle_chat_returns_full_current_metrics_from_effective_conditions(monkeypatch):
    monkeypatch.setattr(orchestrator, "get_greenhouse_snapshot", lambda **kwargs: {
        "greenhouseId": "mars-greenhouse-1",
        "latestSensorReading": {
            "timestamp": "2026-03-20T10:00:00Z",
            "temperature": 21.63,
            "humidity": 64,
            "recycleRatePercent": 58,
            "powerKw": 2.76,
            "cropStressIndex": 34,
        },
        "cropRecords": [],
        "moduleSummaries": [],
        "agentSnapshots": [],
        "actionRequests": [],
        "actuatorCommands": [],
    })

    assert orchestrator.handle_chat(
        "What are current: temperature, humidity, water / recycling level, power, health score?"
    ) == (
        "- Current temperature: 21.63°C\n"
        "- Current humidity: 64%\n"
        "- Water recycling: 58%\n"
        "- Power availability: 30%\n"
        "- Health score: 66"
    )


def test_handle_chat_turn_uses_telemetry_step_for_current_state():
    payload = orchestrator.handle_chat_turn("What's the current temperature?")
    assert payload["steps"] == [
        {
            "agent": "orchestrator",
            "message": "Reading the latest greenhouse telemetry for your request.",
        }
    ]


def test_handle_chat_uses_orchestrator_agent_for_simulation_telemetry(monkeypatch):
    monkeypatch.setattr(orchestrator, "get_greenhouse_snapshot", lambda **kwargs: {
        "greenhouseId": "mars-greenhouse-1",
        "latestSensorReading": {
            "timestamp": "2026-03-20T10:00:00Z",
            "temperature": 16,
            "recycleRatePercent": 60,
            "powerKw": 2.76,
        },
        "cropRecords": [],
        "moduleSummaries": [],
        "agentSnapshots": [],
        "actionRequests": [],
        "actuatorCommands": [],
    })

    class FakeOrchestrator:
        def __call__(self, query: str) -> str:
            assert "Analyze this simulation update for temperature, water recycling, and power." in query
            return (
                "- Turn on the heating because the temperature is 16.00°C\n"
                "- Increase flow in the irrigation pump because water recycling is at 60%\n"
                "- Reduce LED light usage because power availability is at 30%"
            )

    monkeypatch.setattr(orchestrator, "create_orchestrator_agent", lambda: FakeOrchestrator())

    assert orchestrator.handle_chat("Analyze this simulation update for temperature, water recycling, and power.") == (
        "- Turn on the heating because the temperature is 16.00°C\n"
        "- Increase flow in the irrigation pump because water recycling is at 60%\n"
        "- Reduce LED light usage because power availability is at 30%"
    )


def test_handle_chat_turn_returns_structured_tool_calls_for_simulation_telemetry(monkeypatch):
    monkeypatch.setattr(orchestrator, "get_greenhouse_snapshot", lambda **kwargs: {
        "greenhouseId": "mars-greenhouse-1",
        "latestSensorReading": {
            "timestamp": "2026-03-20T10:00:00Z",
            "temperature": 16,
            "recycleRatePercent": 60,
            "powerKw": 2.76,
        },
        "cropRecords": [],
        "moduleSummaries": [],
        "agentSnapshots": [],
        "actionRequests": [],
        "actuatorCommands": [],
    })
    monkeypatch.setattr(orchestrator, "environment_agent", lambda query: "- Turn on the heating because the temperature is 16.00°C")
    monkeypatch.setattr(orchestrator, "resource_agent", lambda query: (
        "- Increase flow in the irrigation pump because water recycling is at 60%\n"
        "- Reduce LED light usage because power availability is at 30%"
    ))

    class FakeOrchestrator:
        def __call__(self, query: str) -> str:
            orchestrator.tracked_environment_agent("temperature is dropping")
            orchestrator.tracked_resource_agent("water recycling and power are low")
            return (
                "- Turn on the heating because the temperature is 16.00°C\n"
                "- Increase flow in the irrigation pump because water recycling is at 60%\n"
                "- Reduce LED light usage because power availability is at 30%"
            )

    monkeypatch.setattr(orchestrator, "create_orchestrator_agent", lambda: FakeOrchestrator())

    payload = orchestrator.handle_chat_turn(
        "Analyze this simulation update for temperature, water recycling, and power."
    )

    assert payload["steps"] == [
        {
            "agent": "environment",
            "message": "Using environment_agent to evaluate climate and power stress.",
        },
        {
            "agent": "resource",
            "message": "Using resource_agent to evaluate water and power constraints.",
        },
    ]
    assert payload["toolCalls"] == [
        {
            "id": "turn_on_heater-1",
            "type": "turn_on_heater",
            "label": "Heater",
            "summary": "Turn on the heating because the temperature is 16.00°C",
            "agent": "environment",
            "metadata": {
                "currentTemperature": 16,
                "targetTemperature": 22.0,
            },
        },
        {
            "id": "increase_irrigation_pump-2",
            "type": "increase_irrigation_pump",
            "label": "Pump",
            "summary": "Increase flow in the irrigation pump because water recycling is at 60%",
            "agent": "resource",
            "metadata": {
                "currentWaterRecycling": 60.0,
                "targetWaterRecycling": 78.0,
            },
        },
        {
            "id": "reduce_led_light_usage-3",
            "type": "reduce_led_light_usage",
            "label": "LED",
            "summary": "Reduce LED light usage because power availability is at 30%",
            "agent": "resource",
            "metadata": {
                "currentPowerAvailability": 30.0,
                "targetPowerAvailability": 55.0,
                "targetLedBrightness": 24,
            },
        },
    ]


def test_create_orchestrator_agent_registers_specialists_and_kb(monkeypatch):
    captured = {}

    class FakeAgent:
        def __init__(self, **kwargs):
            captured.update(kwargs)

    monkeypatch.setattr(orchestrator, "Agent", FakeAgent)
    monkeypatch.setattr(orchestrator, "build_mars_kb_tools", lambda: ["mars_kb"])

    orchestrator.create_orchestrator_agent()

    assert captured["name"] == "chat_orchestrator"
    assert captured["tools"] == [
        orchestrator.tracked_environment_agent,
        orchestrator.tracked_crop_agent,
        orchestrator.tracked_astro_agent,
        orchestrator.tracked_resource_agent,
        "mars_kb",
    ]
    assert "very brief operator action list" in captured["system_prompt"]
    assert "Do not invent new action types" in captured["system_prompt"]


def test_environment_agent_returns_clean_response(monkeypatch):
    captured = {}

    class FakeAgent:
        def __init__(self, **kwargs):
            captured.update(kwargs)

        def __call__(self, query: str) -> str:
            assert "The greenhouse temperature is falling fast" in query
            assert "temperature_c: 18.5" in query
            return "Turn heating on."

    monkeypatch.setattr(specialized_agents, "Agent", FakeAgent)
    monkeypatch.setattr(specialized_agents, "get_greenhouse_snapshot", lambda: {
        "greenhouseId": "mars-greenhouse-1",
        "latestSensorReading": {
            "greenhouseId": "mars-greenhouse-1",
            "timestamp": "2026-03-19T22:00:00Z",
            "temperature": 18.5,
            "humidity": 63,
            "co2Ppm": 1220,
            "lightPpfd": 340,
            "phLevel": 6.2,
            "nutrientEc": 2.0,
            "waterLitres": 132,
            "radiationMsv": 0.07,
        },
        "cropRecords": [],
        "moduleSummaries": [],
        "agentSnapshots": [],
        "actionRequests": [],
        "actuatorCommands": [],
    })

    assert specialized_agents.environment_agent("The greenhouse temperature is falling fast") == "- Turn heating on"
    assert captured["tools"] == []
    assert "Turn heating on when the greenhouse is too cold" in captured["system_prompt"]


def test_astro_agent_registers_mars_kb_tools(monkeypatch):
    captured = {}

    class FakeAgent:
        def __init__(self, **kwargs):
            captured.update(kwargs)

        def __call__(self, query: str) -> str:
            assert "Crew hydration is low and protein intake is behind target" in query
            return "- Plant more lentils and leafy greens."

    monkeypatch.setattr(specialized_agents, "Agent", FakeAgent)
    monkeypatch.setattr(specialized_agents, "build_mars_kb_tools", lambda: ["mars_kb"])
    monkeypatch.setattr(specialized_agents, "get_greenhouse_snapshot", lambda: {
        "greenhouseId": "mars-greenhouse-1",
        "latestSensorReading": None,
        "cropRecords": [],
        "moduleSummaries": [],
        "agentSnapshots": [],
        "actionRequests": [],
        "actuatorCommands": [],
    })

    response = specialized_agents.astro_agent("Crew hydration is low and protein intake is behind target")
    assert response == "- Plant more lentils and leafy greens"
    assert captured["tools"] == ["mars_kb"]
    assert "provide a short planting plan tuned to crew needs" in captured["system_prompt"]


def test_crop_agent_limits_to_harvest_recommendations(monkeypatch):
    captured = {}

    class FakeAgent:
        def __init__(self, **kwargs):
            captured.update(kwargs)

        def __call__(self, query: str) -> str:
            assert "daysToHarvest=1" in query
            return "Harvest the lettuce now."

    monkeypatch.setattr(specialized_agents, "Agent", FakeAgent)
    monkeypatch.setattr(specialized_agents, "get_greenhouse_snapshot", lambda: {
        "greenhouseId": "mars-greenhouse-1",
        "latestSensorReading": None,
        "cropRecords": [
            {
                "name": "Lettuce",
                "zone": "bay-2",
                "healthStatus": "HEALTHY",
                "growthStage": 98,
                "daysToHarvest": 1,
            }
        ],
        "moduleSummaries": [],
        "agentSnapshots": [],
        "actionRequests": [],
        "actuatorCommands": [],
    })

    response = specialized_agents.crop_agent("This crop is harvest-ready and effectively at daysToHarvest=1.")
    assert response == "- Harvest the lettuce now"
    assert captured["tools"] == []
    assert "daysToHarvest is 2 or less" in captured["system_prompt"]


def test_resource_agent_limits_to_allowed_actions(monkeypatch):
    captured = {}

    class FakeAgent:
        def __init__(self, **kwargs):
            captured.update(kwargs)

        def __call__(self, query: str) -> str:
            assert "Water recycling dropped and the humidity sensor has high failure risk." in query
            return """
Recommended actions:
1. Increase flow in the irrigation pump.
2. Replace the humidity sensor.
"""

    monkeypatch.setattr(specialized_agents, "Agent", FakeAgent)
    monkeypatch.setattr(specialized_agents, "get_greenhouse_snapshot", lambda: {
        "greenhouseId": "mars-greenhouse-1",
        "latestSensorReading": None,
        "cropRecords": [],
        "moduleSummaries": [],
        "agentSnapshots": [],
        "actionRequests": [],
        "actuatorCommands": [],
    })

    response = specialized_agents.resource_agent(
        "Water recycling dropped and the humidity sensor has high failure risk."
    )
    assert response == (
        "- Increase flow in the irrigation pump\n"
        "- Replace the humidity sensor"
    )
    assert "Increase irrigation pump flow when water recycling drops" in captured["system_prompt"]
    assert "Reduce LED light usage when power availability drops" in captured["system_prompt"]


def test_preview_agent_usage_matches_demo_keywords():
    assert orchestrator.preview_agent_usage("Crew hydration is low and protein intake dropped") == ["astro"]
    assert orchestrator.preview_agent_usage("Water recycling is down and LED usage must drop") == ["resource"]
    assert orchestrator.preview_agent_usage("Temperature is too cold for the greenhouse") == ["environment"]


def test_specialized_agent_handles_errors(monkeypatch):
    class FailingAgent:
        def __init__(self, **kwargs):
            raise RuntimeError("boom")

    monkeypatch.setattr(specialized_agents, "Agent", FailingAgent)
    monkeypatch.setattr(specialized_agents, "get_greenhouse_snapshot", lambda: {
        "greenhouseId": "mars-greenhouse-1",
        "latestSensorReading": None,
        "cropRecords": [],
        "moduleSummaries": [],
        "agentSnapshots": [],
        "actionRequests": [],
        "actuatorCommands": [],
    })

    response = specialized_agents.resource_agent("Water recycling is down to 52%")
    assert "resource_agent could not complete the request" in response


def test_clean_agent_response_removes_thinking_and_tool_chatter():
    raw = """
<thinking>internal</thinking>
Tool #1: greenhouse_data_tool

Keep heating active.
"""
    assert clean_agent_response(raw) == "Keep heating active."


def test_format_action_response_normalizes_prose_into_brief_bullets():
    raw = """
Summary:
Turn on the heating immediately. Reduce LED light usage in bay 2. Increase irrigation pump flow.
"""
    assert format_action_response(raw, max_bullets=3) == (
        "- Turn on the heating immediately\n"
        "- Reduce LED light usage in bay 2\n"
        "- Increase irrigation pump flow"
    )


def test_format_action_response_drops_negative_action_bullets():
    raw = """
- Turn heating on when the greenhouse is too cold.
- No heating action needed currently due to temperature being above the ideal range.
- Reduce LED light usage.
"""
    assert format_action_response(raw, max_bullets=4) == (
        "- Turn heating on when the greenhouse is too cold\n"
        "- Reduce LED light usage"
    )


def test_handle_chat_limits_final_output_to_four_bullets(monkeypatch):
    monkeypatch.setattr(orchestrator, "get_greenhouse_snapshot", lambda **kwargs: {
        "greenhouseId": "mars-greenhouse-1",
        "latestSensorReading": {
            "timestamp": "2026-03-20T10:00:00Z",
            "temperature": 22.0,
            "humidity": 64,
            "recycleRatePercent": 100,
            "powerKw": 9.2,
            "cropStressIndex": 34,
        },
        "cropRecords": [],
        "moduleSummaries": [],
        "agentSnapshots": [],
        "actionRequests": [],
        "actuatorCommands": [],
    })

    class FakeOrchestrator:
        def __call__(self, query: str) -> str:
            return """
Actions needed:
- Turn on heating.
- Increase irrigation pump flow.
- Reduce LED light usage.
- Replace the humidity sensor.
- Harvest the lettuce.
"""

    monkeypatch.setattr(orchestrator, "create_orchestrator_agent", lambda: FakeOrchestrator())
    assert orchestrator.handle_chat("Complex scenario") == (
        "- Turn on heating\n"
        "- Increase irrigation pump flow\n"
        "- Reduce LED light usage\n"
        "- Replace the humidity sensor"
    )


def test_resolve_bedrock_model_defaults_to_us_west_2(monkeypatch):
    monkeypatch.delenv("STRANDS_MODEL", raising=False)
    monkeypatch.delenv("BEDROCK_MODEL_ID", raising=False)
    monkeypatch.delenv("STRANDS_ORCHESTRATOR_MODEL", raising=False)
    monkeypatch.delenv("STRANDS_SPECIALIST_MODEL", raising=False)
    monkeypatch.delenv("AGENT_AWS_REGION", raising=False)
    monkeypatch.delenv("AWS_REGION", raising=False)
    monkeypatch.delenv("AWS_DEFAULT_REGION", raising=False)
    monkeypatch.setattr(
        "agents.bedrock_config._list_system_inference_profile_ids",
        lambda region: frozenset(),
    )

    assert resolve_bedrock_model() == DEFAULT_BEDROCK_MODEL
    assert resolve_bedrock_model("orchestrator") == DEFAULT_ORCHESTRATOR_MODEL
    assert resolve_bedrock_model("specialist") == DEFAULT_SPECIALIST_MODEL
    assert os.environ["AWS_REGION"] == DEFAULT_BEDROCK_REGION
    assert os.environ["AWS_DEFAULT_REGION"] == DEFAULT_BEDROCK_REGION


def test_resolve_bedrock_model_prefers_role_specific_overrides(monkeypatch):
    monkeypatch.delenv("STRANDS_MODEL", raising=False)
    monkeypatch.delenv("BEDROCK_MODEL_ID", raising=False)
    monkeypatch.setenv("STRANDS_ORCHESTRATOR_MODEL", "amazon.nova-lite-v1:0")
    monkeypatch.setenv("STRANDS_SPECIALIST_MODEL", "anthropic.claude-3-5-haiku-20241022-v1:0")
    monkeypatch.setattr(
        "agents.bedrock_config._list_system_inference_profile_ids",
        lambda region: frozenset({
            "us.amazon.nova-lite-v1:0",
            "us.anthropic.claude-3-5-haiku-20241022-v1:0",
        }),
    )

    assert resolve_bedrock_model("orchestrator") == "us.amazon.nova-lite-v1:0"
    assert resolve_bedrock_model("specialist") == "us.anthropic.claude-3-5-haiku-20241022-v1:0"


def test_resolve_bedrock_model_prefers_global_override(monkeypatch):
    monkeypatch.setenv("STRANDS_MODEL", "anthropic.claude-haiku-4-5-20251001-v1:0")
    monkeypatch.setenv("STRANDS_ORCHESTRATOR_MODEL", "amazon.nova-micro-v1:0")
    monkeypatch.setenv("STRANDS_SPECIALIST_MODEL", "amazon.nova-lite-v1:0")
    monkeypatch.setattr(
        "agents.bedrock_config._list_system_inference_profile_ids",
        lambda region: frozenset({"global.anthropic.claude-haiku-4-5-20251001-v1:0"}),
    )

    assert resolve_bedrock_model("orchestrator") == "global.anthropic.claude-haiku-4-5-20251001-v1:0"
    assert resolve_bedrock_model("specialist") == "global.anthropic.claude-haiku-4-5-20251001-v1:0"


def test_normalize_bedrock_model_id_leaves_unknown_models_unchanged(monkeypatch):
    monkeypatch.setattr(
        "agents.bedrock_config._list_system_inference_profile_ids",
        lambda region: frozenset({"us.amazon.nova-lite-v1:0"}),
    )

    assert normalize_bedrock_model_id("custom.model-v1:0", region="us-west-2") == "custom.model-v1:0"


def test_mcp_defaults_to_mars_crop_knowledge_base(monkeypatch):
    captured = {}

    class FakeMCPClient:
        def __init__(self, transport_factory):
            captured["transport_factory"] = transport_factory

    def fake_streamablehttp_client(url: str):
        captured["url"] = url
        return "transport"

    monkeypatch.delenv("KB_MCP_URL", raising=False)
    monkeypatch.setattr("agents.mcp.MCPClient", FakeMCPClient)
    monkeypatch.setattr("agents.mcp.streamablehttp_client", fake_streamablehttp_client)

    tools = build_mars_kb_tools()
    assert len(tools) == 1
    captured["transport_factory"]()
    assert captured["url"] == DEFAULT_MARS_KB_URL
