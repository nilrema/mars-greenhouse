import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from agents import orchestrator, specialized_agents
from agents.bedrock_config import DEFAULT_BEDROCK_MODEL, DEFAULT_BEDROCK_REGION, resolve_bedrock_model
from agents.mcp import DEFAULT_MARS_KB_URL, build_mars_kb_tools


def test_handle_chat_rejects_blank_query():
    assert orchestrator.handle_chat("   ") == "Please enter a question for the agent system."


def test_handle_chat_uses_orchestrator_agent(monkeypatch):
    class FakeOrchestrator:
        def __call__(self, query: str) -> str:
            assert query == "Power dropped and crops are stressed"
            return "combined answer"

    monkeypatch.setattr(orchestrator, "create_orchestrator_agent", lambda: FakeOrchestrator())
    assert orchestrator.handle_chat("Power dropped and crops are stressed") == "combined answer"


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
        orchestrator.environment_agent,
        orchestrator.crop_agent,
        orchestrator.astro_agent,
        orchestrator.resource_agent,
        "mars_kb",
    ]
    assert "multiple specialist tools" in captured["system_prompt"]


def test_environment_agent_returns_clean_response(monkeypatch):
    captured = {}

    class FakeAgent:
        def __init__(self, **kwargs):
            captured.update(kwargs)

        def __call__(self, query: str) -> str:
            assert "The greenhouse temperature is falling fast" in query
            assert "temperature_c: 18.5" in query
            return "  concise answer  "

    monkeypatch.setattr(specialized_agents, "Agent", FakeAgent)
    monkeypatch.setattr(specialized_agents, "build_mars_kb_tools", lambda: ["mars_kb"])
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

    assert specialized_agents.environment_agent("The greenhouse temperature is falling fast") == "concise answer"
    assert specialized_agents.greenhouse_data_tool in captured["tools"]


def test_specialized_agent_handles_errors(monkeypatch):
    class FailingAgent:
        def __init__(self, **kwargs):
            raise RuntimeError("boom")

    monkeypatch.setattr(specialized_agents, "Agent", FailingAgent)
    monkeypatch.setattr(specialized_agents, "build_mars_kb_tools", lambda: [])
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


def test_resolve_bedrock_model_defaults_to_us_west_2(monkeypatch):
    monkeypatch.delenv("STRANDS_MODEL", raising=False)
    monkeypatch.delenv("BEDROCK_MODEL_ID", raising=False)
    monkeypatch.delenv("AGENT_AWS_REGION", raising=False)
    monkeypatch.delenv("AWS_REGION", raising=False)
    monkeypatch.delenv("AWS_DEFAULT_REGION", raising=False)

    assert resolve_bedrock_model() == DEFAULT_BEDROCK_MODEL
    assert os.environ["AWS_REGION"] == DEFAULT_BEDROCK_REGION
    assert os.environ["AWS_DEFAULT_REGION"] == DEFAULT_BEDROCK_REGION


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
