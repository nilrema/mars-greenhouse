from __future__ import annotations

import os
import sys

RUNTIME_ROOT = os.path.join(
    os.path.dirname(os.path.dirname(__file__)),
    "amplify",
    "functions",
    "chatResponder",
    "runtime",
)
if RUNTIME_ROOT not in sys.path:
    sys.path.insert(0, RUNTIME_ROOT)

from chat_responder_runtime.models import (  # noqa: E402
    OrchestratorResolution,
    ResolutionStep,
    RouteDecision,
    RuntimeContext,
    SpecialistAssessment,
    SpecialistFollowUp,
)
from chat_responder_runtime.service import build_chat_response  # noqa: E402


class FakeBackend:
    def __init__(self, selected_agents: list[str]):
        self.selected_agents = selected_agents

    def route(self, context: RuntimeContext) -> RouteDecision:
        return RouteDecision(
            selected_agents=self.selected_agents,
            rationale="The request spans climate recovery, crop risk, and resource constraints.",
            dispatch_message="Mission control is opening a real specialist coordination cycle. Selected agents must respond with dependencies and concrete actions.",
        )

    def assess(self, agent_id: str, context: RuntimeContext, route: RouteDecision) -> SpecialistAssessment:
        risk = "critical" if agent_id == self.selected_agents[0] else "warning"
        return SpecialistAssessment(
            risk_level=risk,
            summary=f"{agent_id} assessment summary",
            key_evidence=[f"{agent_id} evidence"],
            requested_support=[f"{agent_id} support request"],
            proposed_actions=[f"{agent_id} first action"],
            current_action=f"{agent_id} first action",
            response_message=f"{agent_id} initial response to orchestrator",
        )

    def follow_up(
        self,
        agent_id: str,
        context: RuntimeContext,
        route: RouteDecision,
        initial_assessments: dict[str, SpecialistAssessment],
    ) -> SpecialistFollowUp:
        return SpecialistFollowUp(
            alignment_message=f"{agent_id} follow-up after reading peer updates",
            updated_action=f"{agent_id} updated action",
            blockers=[f"{agent_id} blocker"],
        )

    def resolve(
        self,
        context: RuntimeContext,
        route: RouteDecision,
        initial_assessments: dict[str, SpecialistAssessment],
        follow_ups: dict[str, SpecialistFollowUp],
    ) -> OrchestratorResolution:
        return OrchestratorResolution(
            lead_agent=self.selected_agents[0],
            summary="The specialists aligned on a coordinated recovery plan.",
            course_of_action=[
                ResolutionStep(owner=agent_id, action=f"{agent_id} action", reason=f"{agent_id} reason")
                for agent_id in self.selected_agents
            ],
            success_condition="Stabilize the greenhouse without introducing a secondary failure.",
        )


def test_runtime_builds_multi_agent_conversation():
    response = build_chat_response(
        {
            "message": "Coordinate the specialists for low water and low power.",
            "context": {
                "temperatureDrift": -6,
                "waterRecycling": 55,
                "powerAvailability": 61,
            },
        },
        backend=FakeBackend(["environment", "crop", "resource"]),
    )

    assert response["messages"][0]["agentId"] == "orchestrator"
    assert response["messages"][-1]["agentId"] == "orchestrator"
    assert "Course of action:" in response["messages"][-1]["message"]
    assert response["agentStatuses"][0]["id"] == "environment"
    assert any(item["agentId"] == "crop" for item in response["messages"])


def test_runtime_can_route_to_a_single_specialist():
    response = build_chat_response(
        {
            "message": "Environment only: explain the cold drift risk.",
            "context": {
                "temperatureDrift": -7,
                "waterRecycling": 97,
                "powerAvailability": 95,
            },
        },
        backend=FakeBackend(["environment"]),
    )

    agent_ids = [item["agentId"] for item in response["messages"]]
    assert agent_ids == ["orchestrator", "environment", "environment", "orchestrator"]
    astro_status = next(item for item in response["agentStatuses"] if item["id"] == "astro")
    assert astro_status["status"] == "nominal"
    assert astro_status["currentAction"] == "Standing by for orchestrator routing."
