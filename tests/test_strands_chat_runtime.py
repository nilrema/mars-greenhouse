from __future__ import annotations

import os
import sys

REPO_ROOT = os.path.dirname(os.path.dirname(__file__))
RUNTIME_ROOT = os.path.join(
    REPO_ROOT,
    "amplify",
    "functions",
    "chatResponder",
    "runtime",
)
if REPO_ROOT not in sys.path:
    sys.path.insert(0, REPO_ROOT)
if RUNTIME_ROOT not in sys.path:
    sys.path.insert(0, RUNTIME_ROOT)

from chat_responder_runtime.service import build_chat_response  # noqa: E402
from agents import chat_runtime as agents_chat_runtime  # noqa: E402
from agents import strands_runtime  # noqa: E402


class FakeMissionRuntime:
    def __init__(self, *, context_summary: str, conversation_id: str, request_id: str, model_id: str | None = None):
        self.context_summary = context_summary
        self.conversation_id = conversation_id
        self.request_id = request_id

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc, tb):
        return None

    def run(self, message: str) -> dict:
        return {
            "conversationId": self.conversation_id,
            "requestId": self.request_id,
            "agentStatuses": [
                {
                    "id": "environment",
                    "name": "ENV_AGENT",
                    "role": "Environment Control",
                    "icon": "🌡️",
                    "status": "warning",
                    "currentAction": "Increase temperature toward 22C.",
                },
                {
                    "id": "orchestrator",
                    "name": "ORCH_AGENT",
                    "role": "Mission Orchestration",
                    "icon": "🧭",
                    "status": "warning",
                    "currentAction": "Increase temperature toward 22C.",
                },
            ],
            "messages": [
                {
                    "id": "orchestrator-1",
                    "agentId": "orchestrator",
                    "agentName": "ORCH_AGENT",
                    "agentRole": "Mission Orchestration",
                    "severity": "info",
                    "message": "Mission control routed this request to ENV_AGENT.",
                    "timestamp": 100,
                },
                {
                    "id": "environment-2",
                    "agentId": "environment",
                    "agentName": "ENV_AGENT",
                    "agentRole": "Environment Control",
                    "severity": "warning",
                    "message": "Environment recommends increasing temperature toward 22C.",
                    "timestamp": 101,
                },
                {
                    "id": "orchestrator-3",
                    "agentId": "orchestrator",
                    "agentName": "ORCH_AGENT",
                    "agentRole": "Mission Orchestration",
                    "severity": "warning",
                    "message": "Orchestrator resolution: restore climate stability first.",
                    "timestamp": 102,
                },
            ],
        }


def test_service_delegates_to_agents_chat_runtime(monkeypatch):
    monkeypatch.setattr(agents_chat_runtime, "StrandsMissionRuntime", FakeMissionRuntime)

    response = build_chat_response(
        {
            "message": "What is the current temperature in the greenhouse?",
            "context": {
                "temperatureDrift": 0,
                "waterRecycling": 100,
                "powerAvailability": 100,
            },
        }
    )

    assert response["messages"][0]["agentId"] == "orchestrator"
    assert response["messages"][1]["agentId"] == "environment"
    assert response["agentStatuses"][-1]["id"] == "orchestrator"


def test_mcp_is_only_enabled_for_knowledge_grounded_queries():
    assert strands_runtime._should_enable_mcp("crop", "Use the Mars crop knowledge base for disease guidance.") is True
    assert strands_runtime._should_enable_mcp("environment", "What is the current temperature right now?") is False
    assert strands_runtime._should_enable_mcp("resource", "Summarize the current power availability.") is False


def test_keyed_block_parser_supports_specialist_and_orchestrator_formats():
    specialist = strands_runtime._parse_keyed_block(
        "STATUS: WARNING\nCURRENT_ACTION: Raise temperature.\nREQUESTED_SUPPORT: Resource hold the line.\nMESSAGE: Environment needs warmer grow lanes."
    )
    assert specialist["STATUS"] == "WARNING"
    assert specialist["MESSAGE"] == "Environment needs warmer grow lanes."

    orchestrator = strands_runtime._parse_keyed_block(
        "LEAD_AGENT: ENVIRONMENT\nSUMMARY: Climate recovery leads.\nNEXT_ACTIONS:\n- Raise temperature\n- Protect mature lanes\nSUCCESS_CONDITION: Climate returns to safe range.\nFINAL_MESSAGE: Restore the climate first."
    )
    assert orchestrator["LEAD_AGENT"] == "ENVIRONMENT"
    assert "Raise temperature" in orchestrator["NEXT_ACTIONS"]
