from __future__ import annotations

from agents.chat_runtime import build_chat_response
from agents import mission_orchestrator as orchestrator_module


class FakeResponse:
    def __init__(self, text: str):
        self.message = {"content": [{"text": text}]}


class FakeAgent:
    def __init__(self, *, system_prompt: str, tools=None, model=None):
        self.system_prompt = system_prompt
        self.tools = tools or []

    def __call__(self, prompt: str):
        if "You are ORCH_AGENT" in self.system_prompt:
            self.tools[0]("Review the greenhouse climate and temperature recovery plan.")
            self.tools[3]("Review reserve power and water support for the climate plan.")
            return FakeResponse(
                "LEAD_AGENT: ENVIRONMENT\n"
                "SUMMARY: Environment leads the recovery with Resource support.\n"
                "NEXT_ACTIONS:\n"
                "- Raise temperature toward 22C.\n"
                "- Hold reserve power for the recovery cycle.\n"
                "SUCCESS_CONDITION: Climate returns to the safe operating band.\n"
                "FINAL_MESSAGE: Restore the greenhouse temperature first, then hold reserves steady."
            )

        if "ENV_AGENT" in self.system_prompt:
            return FakeResponse(
                "STATUS: CRITICAL\n"
                "CURRENT_ACTION: Increase temperature toward 22C in the active grow lanes.\n"
                "REQUESTED_SUPPORT: RESOURCE_AGENT should preserve heater power during this cycle.\n"
                "MESSAGE: The greenhouse is too cold to trust recovery until the climate envelope stabilizes."
            )

        if "RESOURCE_AGENT" in self.system_prompt:
            return FakeResponse(
                "STATUS: WARNING\n"
                "CURRENT_ACTION: Protect reserve power and avoid non-essential loads.\n"
                "REQUESTED_SUPPORT: None.\n"
                "MESSAGE: Resource can support the climate recovery, but only if discretionary loads stay low."
            )

        return FakeResponse(
            "STATUS: NOMINAL\n"
            "CURRENT_ACTION: Hold the current plan.\n"
            "REQUESTED_SUPPORT: None.\n"
            "MESSAGE: No further action required."
        )


def test_chat_runtime_smoke(monkeypatch):
    monkeypatch.setattr(orchestrator_module, "Agent", FakeAgent)

    response = build_chat_response(
        {
            "message": "Temperature is drifting down. Coordinate the team.",
            "context": {
                "temperatureDrift": -5,
                "waterRecycling": 72,
                "powerAvailability": 64,
            },
        }
    )

    assert response["messages"][0]["agentId"] == "orchestrator"
    assert response["messages"][1]["agentId"] == "environment"
    assert response["messages"][2]["agentId"] == "resource"
    assert response["messages"][-1]["agentId"] == "orchestrator"
    assert {status["id"] for status in response["agentStatuses"]} == {
        "environment",
        "crop",
        "astro",
        "resource",
        "orchestrator",
    }
