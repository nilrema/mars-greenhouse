from __future__ import annotations

import os
import sys
from types import SimpleNamespace

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
from chat_responder_runtime import service as runtime_service  # noqa: E402
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


def test_strands_backend_does_not_double_start_mcp_client(monkeypatch):
    events: list[str] = []
    tool_invocations: list[tuple[str, bool, bool]] = []

    class FakeMCPClient:
        def __init__(self, *args, **kwargs):
            self._tool_provider_started = False

        def start(self):
            events.append("start")
            if self._tool_provider_started:
                raise RuntimeError("the client session is currently running")
            self._tool_provider_started = True

        def stop(self, exc_type, exc, tb):
            events.append("stop")
            self._tool_provider_started = False

    class FakeAgent:
        def __init__(self, *, model, tools, system_prompt, name, description):
            self.tools = tools
            self.name = name

        def __call__(self, prompt, structured_output_model=None):
            tool_invocations.append((self.name, bool(self.tools), structured_output_model is not None))
            for tool in self.tools:
                if not getattr(tool, "_tool_provider_started", False):
                    tool.start()
                    tool._tool_provider_started = True
            if structured_output_model is None:
                return SimpleNamespace(
                    message={
                        "role": "assistant",
                        "content": [
                            {
                                "text": (
                                    "Route only ENV_AGENT because this is a contained thermal drift. "
                                    "Dispatch Environment to assess and confirm the temperature."
                                )
                            }
                        ],
                    },
                    structured_output=None,
                )
            return SimpleNamespace(
                structured_output=structured_output_model(
                    selected_agents=["environment"],
                    rationale="Climate-only issue.",
                    dispatch_message="Environment, assess the thermal drift.",
                )
            )

        def cleanup(self):
            return None

    monkeypatch.setattr(runtime_service, "BedrockModel", lambda *args, **kwargs: object())
    monkeypatch.setattr(runtime_service, "MCPClient", FakeMCPClient)
    monkeypatch.setattr(runtime_service, "Agent", FakeAgent)

    with runtime_service.StrandsBackend(model_id="test-model") as backend:
        result = backend.route(
            RuntimeContext(
                user_message="Assess the cold drift.",
                conversation_id="conv-1",
                request_id="req-1",
                simulation_context={"temperatureDrift": -5.0, "waterRecycling": 95.0, "powerAvailability": 96.0},
                simulation_summary="Cold drift only.",
            )
        )

    assert result.selected_agents == ["environment"]
    assert events == []
    assert tool_invocations == [
        ("orchestrator_router", False, False),
        ("orchestrator_router_parser", False, True),
    ]


def test_strands_backend_retries_invalid_tool_sequence_once(monkeypatch):
    attempts: list[str] = []

    class FakeMCPClient:
        def __init__(self, *args, **kwargs):
            self._tool_provider_started = False

        def start(self):
            self._tool_provider_started = True

        def stop(self, exc_type, exc, tb):
            self._tool_provider_started = False

    class FakeAgent:
        def __init__(self, *, model, tools, system_prompt, name, description):
            self.tools = tools
            self.name = name

        def __call__(self, prompt, structured_output_model=None):
            attempts.append(self.name)
            if self.tools and structured_output_model is None and len(attempts) == 1:
                raise RuntimeError(
                    "An error occurred (modelStreamErrorException) when calling the ConverseStream "
                    "operation: Model produced invalid sequence as part of ToolUse."
                )
            if structured_output_model is None:
                return SimpleNamespace(
                    message={"role": "assistant", "content": [{"text": "Crop risk is elevated; inspect for disease."}]},
                    structured_output=None,
                )
            return SimpleNamespace(
                structured_output=structured_output_model(
                    risk_level="warning",
                    summary="Climate-only issue.",
                    key_evidence=["cooler canopy"],
                    requested_support=["environment stabilization"],
                    proposed_actions=["inspect crop lanes"],
                    current_action="inspect crop lanes",
                    response_message="placeholder",
                )
            )

        def cleanup(self):
            return None

    monkeypatch.setattr(runtime_service, "BedrockModel", lambda *args, **kwargs: object())
    monkeypatch.setattr(runtime_service, "MCPClient", FakeMCPClient)
    monkeypatch.setattr(runtime_service, "Agent", FakeAgent)

    with runtime_service.StrandsBackend(model_id="test-model") as backend:
        context = RuntimeContext(
            user_message="Use the Mars crop knowledge base to assess crop disease risk.",
            conversation_id="conv-2",
            request_id="req-2",
            simulation_context={"temperatureDrift": -5.0, "waterRecycling": 95.0, "powerAvailability": 96.0},
            simulation_summary="Cold drift only.",
        )
        route = RouteDecision(
            selected_agents=["crop"],
            rationale="Need crop review.",
            dispatch_message="Crop, assess the disease risk.",
        )
        result = backend.assess("crop", context, route)

    assert result.summary == "Climate-only issue."
    assert attempts == ["crop_specialist", "crop_specialist", "crop_specialist_parser"]


def test_strands_backend_only_enables_mcp_for_knowledge_grounded_specialists(monkeypatch):
    tool_invocations: list[tuple[str, bool, bool]] = []

    class FakeMCPClient:
        def __init__(self, *args, **kwargs):
            self._tool_provider_started = False

        def start(self):
            self._tool_provider_started = True

        def stop(self, exc_type, exc, tb):
            self._tool_provider_started = False

    class FakeAgent:
        def __init__(self, *, model, tools, system_prompt, name, description):
            self.tools = tools
            self.name = name

        def __call__(self, prompt, structured_output_model=None):
            tool_invocations.append((self.name, bool(self.tools), structured_output_model is not None))
            if structured_output_model is None:
                return SimpleNamespace(
                    message={"role": "assistant", "content": [{"text": f"{self.name} transcript"}]},
                    structured_output=None,
                )

            payload_by_name = {
                "orchestrator_router_parser": RouteDecision(
                    selected_agents=["environment", "crop"],
                    rationale="Need climate plus agronomy input.",
                    dispatch_message="Environment and Crop, assess the greenhouse state.",
                ),
                "environment_specialist_parser": SpecialistAssessment(
                    risk_level="warning",
                    summary="Environment summary",
                    key_evidence=["env evidence"],
                    requested_support=["crop support"],
                    proposed_actions=["env action"],
                    current_action="env current action",
                    response_message="placeholder",
                ),
                "crop_specialist_parser": SpecialistAssessment(
                    risk_level="warning",
                    summary="Crop summary",
                    key_evidence=["crop evidence"],
                    requested_support=["env support"],
                    proposed_actions=["crop action"],
                    current_action="crop current action",
                    response_message="placeholder",
                ),
                "environment_follow_up_parser": SpecialistFollowUp(
                    alignment_message="env follow-up",
                    updated_action="env updated action",
                    blockers=[],
                ),
                "crop_follow_up_parser": SpecialistFollowUp(
                    alignment_message="crop follow-up",
                    updated_action="crop updated action",
                    blockers=[],
                ),
                "orchestrator_resolver_parser": OrchestratorResolution(
                    lead_agent="crop",
                    summary="Protect the crop while environment stabilizes.",
                    course_of_action=[
                        ResolutionStep(owner="environment", action="Raise temperature", reason="restore climate"),
                        ResolutionStep(owner="crop", action="Protect mature lanes", reason="avoid yield loss"),
                    ],
                    success_condition="Climate and crop stress are back in bounds.",
                ),
            }
            return SimpleNamespace(structured_output=payload_by_name[self.name])

        def cleanup(self):
            return None

    monkeypatch.setattr(runtime_service, "BedrockModel", lambda *args, **kwargs: object())
    monkeypatch.setattr(runtime_service, "MCPClient", FakeMCPClient)
    monkeypatch.setattr(runtime_service, "Agent", FakeAgent)

    with runtime_service.StrandsBackend(model_id="test-model") as backend:
        runtime_service.build_chat_response(
            {
                "message": "Use the Mars crop knowledge base to assess crop disease risk and climate targets.",
                "context": {
                    "temperatureDrift": -5,
                    "waterRecycling": 80,
                    "powerAvailability": 85,
                },
            },
            backend=backend,
        )

    assert tool_invocations == [
        ("orchestrator_router", False, False),
        ("orchestrator_router_parser", False, True),
        ("environment_specialist", True, False),
        ("environment_specialist_parser", False, True),
        ("crop_specialist", True, False),
        ("crop_specialist_parser", False, True),
        ("environment_follow_up", False, False),
        ("environment_follow_up_parser", False, True),
        ("crop_follow_up", False, False),
        ("crop_follow_up_parser", False, True),
        ("orchestrator_resolver", False, False),
        ("orchestrator_resolver_parser", False, True),
    ]
