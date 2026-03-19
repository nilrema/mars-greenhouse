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
from agents import mission_orchestrator as orchestrator_module  # noqa: E402
from agents import mcp_support  # noqa: E402


class FakeMissionRuntime:
    def __init__(self, *, context_summary: str, conversation_id: str, request_id: str):
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
            "meta": {"leadAgent": "environment", "nextActions": ["Raise temperature"], "successCondition": "Climate returns to the safe band."},
        }


def test_service_delegates_to_agents_chat_runtime(monkeypatch):
    monkeypatch.setattr(
        agents_chat_runtime,
        "run_mission_orchestrator",
        lambda **kwargs: FakeMissionRuntime(
            context_summary=kwargs["context_summary"],
            conversation_id=kwargs["conversation_id"],
            request_id=kwargs["request_id"],
        ).run(kwargs["message"]),
    )

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


def test_orchestrator_parsers_keep_expected_structure():
    specialist = orchestrator_module._parse_specialist_output(
        "environment",
        "STATUS: WARNING\nCURRENT_ACTION: Raise temperature.\nREQUESTED_SUPPORT: RESOURCE_AGENT keep reserve power stable.\nMESSAGE: Climate recovery leads this cycle.",
    )
    assert specialist["status"] == "WARNING"
    assert specialist["message"] == "Climate recovery leads this cycle."

    final = orchestrator_module._parse_orchestrator_output(
        "LEAD_AGENT: ENVIRONMENT\nSUMMARY: Climate recovery leads.\nNEXT_ACTIONS:\n- Raise temperature\n- Hold reserve power\nSUCCESS_CONDITION: Climate stabilizes.\nFINAL_MESSAGE: Restore temperature first."
    )
    assert final["leadAgent"] == "environment"
    assert final["nextActions"] == ["Raise temperature", "Hold reserve power"]


def test_mcp_wrapper_returns_error_without_live_client():
    result = mcp_support.query_mars_crop_knowledge(
        None,
        None,
        query="Use the Mars crop knowledge base for disease guidance.",
        agent_id="crop",
    )

    assert result["ok"] is False
    assert result["status"] in {"unconfigured", "unavailable"}
