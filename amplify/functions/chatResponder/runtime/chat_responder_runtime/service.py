from __future__ import annotations

import os
import time
from contextlib import AbstractContextManager
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from typing import Any, Protocol

import boto3
import httpx
from mcp.client.streamable_http import streamablehttp_client
from pydantic import BaseModel
from strands import Agent
from strands.models import BedrockModel
from strands.tools.mcp.mcp_client import MCPClient

from .models import (
    OrchestratorResolution,
    ResolutionStep,
    RouteDecision,
    RuntimeContext,
    SpecialistAssessment,
    SpecialistFollowUp,
)

BASELINE_TEMP = 24.0
DEFAULT_MODEL_ID = os.environ.get("STRANDS_MODEL_ID", "us.amazon.nova-pro-v1:0")
DEFAULT_MCP_URL = os.environ.get(
    "KB_MCP_URL",
    "https://kb-start-hack-gateway-buyjtibfpg.gateway.bedrock-agentcore.us-east-2.amazonaws.com/mcp",
)
DEFAULT_GREENHOUSE_ID = "mars-greenhouse-1"
AGENT_ORDER = ["environment", "crop", "astro", "resource"]
KB_GENERAL_KEYWORDS = {
    "knowledge",
    "research",
    "best practice",
    "best practices",
    "guidance",
    "reference",
    "references",
    "scientific",
    "paper",
    "papers",
    "study",
    "studies",
    "mcp",
    "mars crop knowledge base",
}
KB_AGENT_KEYWORDS = {
    "environment": {"humidity", "co2", "lighting", "light recipe", "setpoint", "climate target"},
    "crop": {
        "crop",
        "plant",
        "disease",
        "pathogen",
        "yield",
        "harvest",
        "nutrient",
        "deficiency",
        "cultivar",
        "leaf",
        "canopy",
        "stress",
        "irrigation recipe",
    },
    "astro": {"crew nutrition", "nutrition", "crew workload", "human factors", "astronaut"},
    "resource": {"irrigation", "water recovery", "fertigation", "reservoir", "power budget", "resource plan"},
}

_TOKEN_CACHE: dict[str, Any] = {"token": None, "expires_at": None}


def _utc_now() -> datetime:
    return datetime.now(timezone.utc)


def _chat_timestamp() -> int:
    return int(time.time())


def _status_to_severity(status: str) -> str:
    return "critical" if status == "critical" else "warning" if status == "warning" else "success"


def _agent_name(agent_id: str) -> str:
    return {
        "environment": "ENV_AGENT",
        "crop": "CROP_AGENT",
        "astro": "ASTRO_AGENT",
        "resource": "RESOURCE_AGENT",
        "orchestrator": "ORCH_AGENT",
    }[agent_id]


def _agent_role(agent_id: str) -> str:
    return {
        "environment": "Environment Control",
        "crop": "Crop Management",
        "astro": "Astronaut Welfare",
        "resource": "Resource Management",
        "orchestrator": "Mission Orchestration",
    }[agent_id]


def _agent_icon(agent_id: str) -> str:
    return {
        "environment": "🌡️",
        "crop": "🌱",
        "astro": "🧑‍🚀",
        "resource": "⚡",
        "orchestrator": "🧭",
    }[agent_id]


def _normalize_context(context: dict[str, Any] | None) -> dict[str, float]:
    context = context or {}
    return {
        "temperatureDrift": float(context.get("temperatureDrift") or 0.0),
        "waterRecycling": float(context.get("waterRecycling") or 100.0),
        "powerAvailability": float(context.get("powerAvailability") or 100.0),
    }


def _context_summary(context: dict[str, float]) -> str:
    effective_temp = BASELINE_TEMP + context["temperatureDrift"]
    humidity = max(22.0, 68.0 - max(0.0, 15.0 - effective_temp) * 0.5 + (100.0 - context["waterRecycling"]) * 0.1)
    return (
        f"Simulation context for {DEFAULT_GREENHOUSE_ID}: "
        f"temperature drift {context['temperatureDrift']:+.1f}C "
        f"(effective canopy temperature {effective_temp:.1f}C), "
        f"water recycling {context['waterRecycling']:.0f}%, "
        f"power availability {context['powerAvailability']:.0f}%, "
        f"estimated humidity {humidity:.0f}%."
    )


def _route_system_prompt() -> str:
    return """
You are the Mars greenhouse orchestrator.
You receive the operator request and greenhouse simulation context.

Decide whether the request needs:
- one specialist only
- several specialists
- all four specialists

Available specialists:
- environment: climate, temperature, humidity, CO2, lighting stability
- crop: plant stress, disease risk, yield protection, inspection priorities
- astro: crew workload, nutrition, dispatch timing, human operational impact
- resource: water recovery, irrigation, power, reserve allocation

Select the minimum set of specialists needed to solve the request, but if the request is broad or the simulation suggests coupled failures, route to multiple agents.
Respond in natural language.
Write a short dispatch note to the specialists and include a brief rationale for why you selected them.
"""


def _specialist_system_prompt(agent_id: str) -> str:
    role_brief = {
        "environment": "You are the Environment Agent. Focus on climate stabilization, greenhouse envelope recovery, and risks from temperature, humidity, CO2, and lighting drift.",
        "crop": "You are the Crop Agent. Focus on crop stress, disease risk, inspection priorities, and harvest protection.",
        "astro": "You are the Astro Agent. Focus on crew workload, nutrition continuity, inspection labor, and astronaut operational impact.",
        "resource": "You are the Resource Agent. Focus on water recovery, irrigation scheduling, power limits, and reserve preservation.",
    }[agent_id]
    return f"""
{role_brief}

You are a real specialist agent in a multi-agent Mars greenhouse runtime.
You have access to the Mars crop knowledge base MCP server as a tool provider.
Use the MCP tools when you need grounding for crop, environment, Mars greenhouse, or mission reasoning.

Respond in natural language as a direct message to the orchestrator and peer specialists.
State your risk level, the key evidence you are relying on, your requested support, and your next action.
Use the MCP tools when needed, but do not force tool use when the simulation context already answers the question.
"""


def _follow_up_system_prompt(agent_id: str) -> str:
    return f"""
You are the {_agent_name(agent_id)} specialist in a live coordination round.
You already produced an initial assessment.
Now you have peer updates and must respond briefly with your coordination position.

Respond in natural language.
Do not repeat your full initial report.
Reference peer constraints directly, mention any blockers, and update your action if needed.
"""


def _resolution_system_prompt() -> str:
    return """
You are the Mars greenhouse orchestrator closing a specialist coordination cycle.
You have the operator request, simulation context, route decision, specialist first-pass replies, and specialist follow-up notes.

Choose the lead agent, write a concise summary, and produce an ordered course of action.
Every step must have an owner, an action, and a reason.
The final success condition must be operational and concrete.
Respond in natural language.
"""


def _parser_system_prompt(model_name: str) -> str:
    return f"""
You convert a Mars greenhouse agent transcript into the structured schema {model_name}.

Return structured output only.
Use only information grounded in the provided transcript and context.
Do not invent fields that were not implied by the transcript.
If the transcript contains a direct natural-language message to other agents, preserve that message in the appropriate text field.
"""


def _extract_text_content(message: Any) -> str:
    content = getattr(message, "get", None)
    blocks = content("content", []) if callable(content) else message.get("content", [])
    text_chunks: list[str] = []
    for block in blocks:
        if isinstance(block, dict) and block.get("text"):
            text_chunks.append(str(block["text"]).strip())
    return "\n".join(chunk for chunk in text_chunks if chunk).strip()


def _is_invalid_tool_sequence_error(error: Exception) -> bool:
    return "invalid sequence as part of ToolUse" in str(error)


def _normalize_message_text(text: str) -> str:
    return " ".join(text.lower().split())


def _should_enable_mcp(agent_id: str, context: RuntimeContext) -> bool:
    message = _normalize_message_text(context.user_message)

    if any(keyword in message for keyword in KB_GENERAL_KEYWORDS):
        return True

    if any(keyword in message for keyword in KB_AGENT_KEYWORDS.get(agent_id, set())):
        return True

    return False


def _headers_for_mcp() -> dict[str, str]:
    client_id = os.environ.get("GATEWAY_CLIENT_ID", "").strip()
    client_secret = os.environ.get("GATEWAY_CLIENT_SECRET", "").strip()
    token_endpoint = os.environ.get("GATEWAY_TOKEN_ENDPOINT", "").strip()
    scope = os.environ.get("GATEWAY_SCOPE", "").strip()

    if not all([client_id, client_secret, token_endpoint]):
        return {}

    now = _utc_now()
    if _TOKEN_CACHE["token"] and _TOKEN_CACHE["expires_at"] and now < _TOKEN_CACHE["expires_at"]:
        return {"Authorization": f"Bearer {_TOKEN_CACHE['token']}"}

    response = httpx.post(
        token_endpoint,
        data={
            "grant_type": "client_credentials",
            "client_id": client_id,
            "client_secret": client_secret,
            "scope": scope,
        },
        headers={"Content-Type": "application/x-www-form-urlencoded"},
        timeout=10,
    )
    response.raise_for_status()
    payload = response.json()
    _TOKEN_CACHE["token"] = payload["access_token"]
    _TOKEN_CACHE["expires_at"] = now + timedelta(seconds=max(60, int(payload.get("expires_in", 3600)) - 300))
    return {"Authorization": f"Bearer {_TOKEN_CACHE['token']}"}


def _mcp_transport():
    return streamablehttp_client(
        url=DEFAULT_MCP_URL,
        headers=_headers_for_mcp() or None,
        timeout=30,
        sse_read_timeout=300,
    )


class AgentBackend(Protocol):
    def route(self, context: RuntimeContext) -> RouteDecision: ...

    def assess(self, agent_id: str, context: RuntimeContext, route: RouteDecision) -> SpecialistAssessment: ...

    def follow_up(
        self,
        agent_id: str,
        context: RuntimeContext,
        route: RouteDecision,
        initial_assessments: dict[str, SpecialistAssessment],
    ) -> SpecialistFollowUp: ...

    def resolve(
        self,
        context: RuntimeContext,
        route: RouteDecision,
        initial_assessments: dict[str, SpecialistAssessment],
        follow_ups: dict[str, SpecialistFollowUp],
    ) -> OrchestratorResolution: ...


@dataclass
class StrandsBackend(AbstractContextManager):
    model_id: str = DEFAULT_MODEL_ID

    def __post_init__(self) -> None:
        session = boto3.Session(region_name=os.environ.get("AWS_REGION"))
        self.model = BedrockModel(boto_session=session, model_id=self.model_id)
        self.mcp_client = MCPClient(_mcp_transport, startup_timeout=30, prefix="mars_kb")
        self._mcp_started = False

    def __enter__(self) -> "StrandsBackend":
        return self

    def __exit__(self, exc_type, exc, tb) -> None:
        if self._mcp_started:
            self.mcp_client.stop(exc_type, exc, tb)
            self._mcp_started = False

    def _invoke_text(self, *, name: str, system_prompt: str, prompt: str, use_mcp: bool = True) -> str:
        attempts = 2 if use_mcp else 1
        last_error: Exception | None = None

        for attempt in range(attempts):
            agent = Agent(
                model=self.model,
                tools=[self.mcp_client] if use_mcp else [],
                system_prompt=system_prompt,
                name=name,
                description=name,
            )
            try:
                result = agent(prompt)
                text = _extract_text_content(result.message)
                if not text:
                    raise RuntimeError(f"{name} did not return any text output")
                return text
            except Exception as error:
                last_error = error
                if not use_mcp or attempt == attempts - 1 or not _is_invalid_tool_sequence_error(error):
                    raise
            finally:
                self._mcp_started = bool(getattr(self.mcp_client, "_tool_provider_started", False))
                agent.cleanup()

        raise RuntimeError(f"{name} failed without returning text") from last_error

    def _invoke_structured(self, *, name: str, system_prompt: str, prompt: str, output_model: type[BaseModel]) -> BaseModel:
        agent = Agent(
            model=self.model,
            tools=[],
            system_prompt=system_prompt,
            name=name,
            description=name,
        )
        try:
            result = agent(prompt, structured_output_model=output_model)
        finally:
            agent.cleanup()
        if result.structured_output is None:
            raise RuntimeError(f"{name} did not return structured output")
        return result.structured_output

    def route(self, context: RuntimeContext) -> RouteDecision:
        prompt = (
            f"Operator message: {context.user_message}\n"
            f"{context.simulation_summary}\n"
            "Decide which specialists should be routed right now."
        )
        route_message = self._invoke_text(
            name="orchestrator_router",
            system_prompt=_route_system_prompt(),
            prompt=prompt,
            use_mcp=False,
        )
        return self._invoke_structured(
            name="orchestrator_router_parser",
            system_prompt=_parser_system_prompt("RouteDecision"),
            prompt=(
                f"Context:\n{context.simulation_summary}\n\n"
                f"Operator message:\n{context.user_message}\n\n"
                f"Orchestrator routing transcript:\n{route_message}"
            ),
            output_model=RouteDecision,
        )

    def assess(self, agent_id: str, context: RuntimeContext, route: RouteDecision) -> SpecialistAssessment:
        prompt = (
            f"Operator request:\n{context.user_message}\n\n"
            f"Simulation context:\n{context.simulation_summary}\n\n"
            f"Orchestrator routing rationale:\n{route.rationale}\n\n"
            "Produce your specialist assessment."
        )
        assessment_message = self._invoke_text(
            name=f"{agent_id}_specialist",
            system_prompt=_specialist_system_prompt(agent_id),
            prompt=prompt,
            use_mcp=_should_enable_mcp(agent_id, context),
        )
        assessment = self._invoke_structured(
            name=f"{agent_id}_specialist_parser",
            system_prompt=_parser_system_prompt("SpecialistAssessment"),
            prompt=(
                f"Agent role: {agent_id}\n"
                f"Simulation context:\n{context.simulation_summary}\n\n"
                f"Routing rationale:\n{route.rationale}\n\n"
                f"Specialist transcript:\n{assessment_message}"
            ),
            output_model=SpecialistAssessment,
        )
        return assessment.model_copy(update={"response_message": assessment_message})

    def follow_up(
        self,
        agent_id: str,
        context: RuntimeContext,
        route: RouteDecision,
        initial_assessments: dict[str, SpecialistAssessment],
    ) -> SpecialistFollowUp:
        peer_notes = []
        for peer_id, assessment in initial_assessments.items():
            if peer_id == agent_id:
                continue
            peer_notes.append(
                f"{_agent_name(peer_id)} summary: {assessment.summary}\n"
                f"{_agent_name(peer_id)} asks: {', '.join(assessment.requested_support) or 'none'}\n"
                f"{_agent_name(peer_id)} actions: {', '.join(assessment.proposed_actions) or 'none'}"
            )
        prompt = (
            f"Operator request:\n{context.user_message}\n\n"
            f"Simulation context:\n{context.simulation_summary}\n\n"
            f"Your initial assessment:\n{initial_assessments[agent_id].response_message}\n\n"
            "Peer assessments:\n"
            + "\n\n".join(peer_notes)
            + "\n\nRespond with your coordination update."
        )
        follow_up_message = self._invoke_text(
            name=f"{agent_id}_follow_up",
            system_prompt=_follow_up_system_prompt(agent_id),
            prompt=prompt,
            use_mcp=False,
        )
        follow_up = self._invoke_structured(
            name=f"{agent_id}_follow_up_parser",
            system_prompt=_parser_system_prompt("SpecialistFollowUp"),
            prompt=(
                f"Agent role: {agent_id}\n"
                f"Simulation context:\n{context.simulation_summary}\n\n"
                f"Initial assessment:\n{initial_assessments[agent_id].response_message}\n\n"
                f"Peer notes:\n{chr(10).join(peer_notes)}\n\n"
                f"Follow-up transcript:\n{follow_up_message}"
            ),
            output_model=SpecialistFollowUp,
        )
        return follow_up.model_copy(update={"alignment_message": follow_up_message})

    def resolve(
        self,
        context: RuntimeContext,
        route: RouteDecision,
        initial_assessments: dict[str, SpecialistAssessment],
        follow_ups: dict[str, SpecialistFollowUp],
    ) -> OrchestratorResolution:
        specialist_bundle = []
        for agent_id, assessment in initial_assessments.items():
            specialist_bundle.append(
                f"{_agent_name(agent_id)} initial summary: {assessment.summary}\n"
                f"risk: {assessment.risk_level}\n"
                f"requested_support: {assessment.requested_support}\n"
                f"proposed_actions: {assessment.proposed_actions}\n"
                f"follow_up: {follow_ups[agent_id].alignment_message}"
            )
        prompt = (
            f"Operator request:\n{context.user_message}\n\n"
            f"Simulation context:\n{context.simulation_summary}\n\n"
            f"Routing rationale:\n{route.rationale}\n\n"
            "Specialist outputs:\n"
            + "\n\n".join(specialist_bundle)
            + "\n\nResolve the coordination cycle."
        )
        resolution_message = self._invoke_text(
            name="orchestrator_resolver",
            system_prompt=_resolution_system_prompt(),
            prompt=prompt,
            use_mcp=False,
        )
        return self._invoke_structured(
            name="orchestrator_resolver_parser",
            system_prompt=_parser_system_prompt("OrchestratorResolution"),
            prompt=(
                f"Operator request:\n{context.user_message}\n\n"
                f"Simulation context:\n{context.simulation_summary}\n\n"
                f"Routing rationale:\n{route.rationale}\n\n"
                f"Specialist bundle:\n{chr(10).join(specialist_bundle)}\n\n"
                f"Resolution transcript:\n{resolution_message}"
            ),
            output_model=OrchestratorResolution,
        )


def _message(agent_id: str, severity: str, body: str, timestamp: int) -> dict[str, Any]:
    return {
        "id": f"{agent_id}-{timestamp}",
        "agentId": agent_id,
        "agentName": _agent_name(agent_id),
        "agentRole": _agent_role(agent_id),
        "severity": severity,
        "message": body,
        "timestamp": timestamp,
    }


def build_chat_response(payload: dict[str, Any], backend: AgentBackend) -> dict[str, Any]:
    message_text = str(payload.get("message") or "").strip()
    if not message_text:
        raise ValueError("Message is required.")

    timestamp = _chat_timestamp()
    context = _normalize_context(payload.get("context"))
    conversation_id = payload.get("conversationId") or f"conv-{timestamp}"
    request_id = f"req-{timestamp}"
    runtime_context = RuntimeContext(
        user_message=message_text,
        conversation_id=conversation_id,
        request_id=request_id,
        simulation_context=context,
        simulation_summary=_context_summary(context),
    )

    route = backend.route(runtime_context)
    selected_agents = [agent for agent in route.selected_agents if agent in AGENT_ORDER]
    if not selected_agents:
        raise RuntimeError("Orchestrator did not select any specialist agents.")
    runtime_context.selected_agents = selected_agents

    initial_assessments = {agent_id: backend.assess(agent_id, runtime_context, route) for agent_id in selected_agents}
    follow_ups = {
        agent_id: backend.follow_up(agent_id, runtime_context, route, initial_assessments) for agent_id in selected_agents
    }
    resolution = backend.resolve(runtime_context, route, initial_assessments, follow_ups)

    messages: list[dict[str, Any]] = [
        _message("orchestrator", "info", route.dispatch_message, timestamp),
    ]
    next_timestamp = timestamp + 1
    for agent_id in selected_agents:
        assessment = initial_assessments[agent_id]
        messages.append(
            _message(agent_id, _status_to_severity(assessment.risk_level), assessment.response_message, next_timestamp)
        )
        next_timestamp += 1
    for agent_id in selected_agents:
        follow_up = follow_ups[agent_id]
        severity = _status_to_severity(initial_assessments[agent_id].risk_level)
        messages.append(_message(agent_id, severity, follow_up.alignment_message, next_timestamp))
        next_timestamp += 1

    plan_parts = [
        f"{index + 1}. {_agent_name(step.owner)}: {step.action} ({step.reason})"
        for index, step in enumerate(resolution.course_of_action)
    ]
    messages.append(
        _message(
            "orchestrator",
            _status_to_severity("critical" if resolution.lead_agent != "orchestrator" else "nominal"),
            (
                f"Orchestrator resolution: {resolution.summary} "
                f"Course of action: {' '.join(plan_parts)} "
                f"Success condition: {resolution.success_condition}"
            ),
            next_timestamp,
        )
    )

    statuses = []
    for agent_id in AGENT_ORDER:
        if agent_id in initial_assessments:
            assessment = initial_assessments[agent_id]
            follow_up = follow_ups[agent_id]
            statuses.append(
                {
                    "id": agent_id,
                    "name": _agent_name(agent_id),
                    "role": _agent_role(agent_id),
                    "icon": _agent_icon(agent_id),
                    "status": assessment.risk_level,
                    "currentAction": follow_up.updated_action or assessment.current_action,
                }
            )
        else:
            statuses.append(
                {
                    "id": agent_id,
                    "name": _agent_name(agent_id),
                    "role": _agent_role(agent_id),
                    "icon": _agent_icon(agent_id),
                    "status": "nominal",
                    "currentAction": "Standing by for orchestrator routing.",
                }
            )
    statuses.append(
        {
            "id": "orchestrator",
            "name": _agent_name("orchestrator"),
            "role": _agent_role("orchestrator"),
            "icon": _agent_icon("orchestrator"),
            "status": "warning" if resolution.lead_agent != "orchestrator" else "nominal",
            "currentAction": resolution.course_of_action[0].action,
        }
    )

    return {
        "conversationId": conversation_id,
        "requestId": request_id,
        "agentStatuses": statuses,
        "messages": messages,
    }
