"""
Canonical Strands multi-agent runtime for Mars greenhouse chat coordination.
"""

from __future__ import annotations

import os
import time
from contextlib import AbstractContextManager
from dataclasses import dataclass, field
from typing import Any, Callable

from strands import Agent, tool
from strands.models import BedrockModel

from agents.agent_support import (
    AGENT_ORDER,
    DEFAULT_MODEL_ID,
    ORCHESTRATOR_RESPONSE_KEYS,
    SPECIALIST_RESPONSE_KEYS,
    agent_icon,
    agent_name,
    agent_role,
    join_agent_names,
    normalize_status,
    parse_bullets,
    parse_keyed_block,
    response_text,
    severity_from_status,
    standby_action,
    status_to_ui,
)
from agents.astro_agent import run_astro_agent
from agents.crop_agent import run_crop_agent
from agents.environment_agent import run_environment_agent
from agents.mcp_support import build_knowledge_tool, create_mcp_client, describe_mcp_access, discover_tool_name, should_enable_mcp
from agents.resource_agent import run_resource_agent

SPECIALIST_RUNNERS: dict[str, Callable[..., str]] = {
    "environment": run_environment_agent,
    "crop": run_crop_agent,
    "astro": run_astro_agent,
    "resource": run_resource_agent,
}


def _orchestrator_prompt(context_summary: str) -> str:
    return f"""
You are ORCH_AGENT, the orchestrator for a Mars greenhouse mission.

Simulation context:
{context_summary}

You can respond directly or call specialist tools:
- consult_environment_agent for greenhouse climate recovery
- consult_crop_agent for crop stress and harvest impact
- consult_astro_agent for crew workload and nutrition continuity
- consult_resource_agent for water, nutrient, and power tradeoffs

Route only to the specialists that are actually needed. If the operator asks a simple direct question that can be answered from the simulation context, answer directly without specialist tools.
When specialists are used, synthesize their results into one coordinated plan with explicit ordering and a clear success condition.

Reply in exactly this format:
LEAD_AGENT: ORCHESTRATOR or ENVIRONMENT or CROP or ASTRO or RESOURCE
SUMMARY: one concise paragraph
NEXT_ACTIONS:
- action one
- action two
SUCCESS_CONDITION: one sentence
FINAL_MESSAGE: one concise operator-facing resolution
"""


def _specialist_fallback(agent_id: str, error: Exception) -> str:
    return (
        "STATUS: WARNING\n"
        "CURRENT_ACTION: Continue with simulation-context reasoning while the specialist runtime recovers.\n"
        "REQUESTED_SUPPORT: None.\n"
        f"MESSAGE: {agent_name(agent_id)} could not complete its analysis cleanly. Proceeding with the current simulation context only. Error: {error}"
    )


def _parse_specialist_output(agent_id: str, raw: str) -> dict[str, str]:
    parsed = parse_keyed_block(raw, SPECIALIST_RESPONSE_KEYS)
    return {
        "agentId": agent_id,
        "status": normalize_status(parsed.get("STATUS")),
        "currentAction": parsed.get("CURRENT_ACTION") or standby_action(agent_id),
        "requestedSupport": parsed.get("REQUESTED_SUPPORT") or "None.",
        "message": parsed.get("MESSAGE") or raw.strip() or standby_action(agent_id),
    }


def _parse_orchestrator_output(raw: str) -> dict[str, Any]:
    parsed = parse_keyed_block(raw, ORCHESTRATOR_RESPONSE_KEYS)
    lead_agent = (parsed.get("LEAD_AGENT") or "ORCHESTRATOR").strip().lower()
    if lead_agent == "orchestrator":
        lead_agent = "orchestrator"
    elif lead_agent not in {"environment", "crop", "astro", "resource"}:
        lead_agent = "orchestrator"
    next_actions = parse_bullets(parsed.get("NEXT_ACTIONS", ""))
    return {
        "leadAgent": lead_agent,
        "summary": parsed.get("SUMMARY") or raw.strip(),
        "nextActions": next_actions,
        "successCondition": parsed.get("SUCCESS_CONDITION") or "Mission remains stable after this coordination cycle.",
        "finalMessage": parsed.get("FINAL_MESSAGE") or parsed.get("SUMMARY") or raw.strip(),
    }


def _message_entry(agent_id: str, *, severity: str, message: str, timestamp: int, request_id: str) -> dict[str, Any]:
    return {
        "id": f"{request_id}-{agent_id}-{timestamp}",
        "agentId": agent_id,
        "agentName": agent_name(agent_id),
        "agentRole": agent_role(agent_id),
        "severity": severity,
        "message": message,
        "timestamp": timestamp,
    }


@dataclass
class StrandsMissionRuntime(AbstractContextManager):
    context_summary: str
    conversation_id: str
    request_id: str
    model_id: str = field(default_factory=lambda: os.environ.get("STRANDS_MODEL_ID", DEFAULT_MODEL_ID))
    specialist_transcript: list[dict[str, str]] = field(default_factory=list)
    consulted_agents: list[str] = field(default_factory=list)

    def __post_init__(self) -> None:
        self.model = BedrockModel(model_id=self.model_id)
        self.mcp_client = create_mcp_client()
        self.mcp_tool_name: str | None = None

    def __enter__(self) -> "StrandsMissionRuntime":
        if self.mcp_client is not None:
            self.mcp_client.__enter__()
            self.mcp_tool_name = discover_tool_name(self.mcp_client)
        return self

    def __exit__(self, exc_type, exc, tb) -> None:
        if self.mcp_client is not None:
            self.mcp_client.__exit__(exc_type, exc, tb)
        return None

    def _run_specialist(self, agent_id: str, query: str) -> str:
        knowledge_tool = build_knowledge_tool(
            mcp_client=self.mcp_client,
            tool_name=self.mcp_tool_name,
            agent_id=agent_id,
            enabled=should_enable_mcp(agent_id, query),
        )
        runner = SPECIALIST_RUNNERS[agent_id]
        try:
            return runner(
                query,
                context_summary=self.context_summary,
                model=self.model,
                knowledge_tool=knowledge_tool,
            )
        except Exception as exc:  # pragma: no cover - defensive guard
            return _specialist_fallback(agent_id, exc)

    def _build_specialist_tool(self, agent_id: str):
        @tool(name=f"consult_{agent_id}_agent")
        def specialist_tool(query: str) -> str:
            """
            Consult the retained Mars greenhouse specialist agent.

            Args:
                query: The operator or orchestration sub-question to send to the specialist.
            """

            raw = self._run_specialist(agent_id, query)
            self.consulted_agents.append(agent_id)
            self.specialist_transcript.append(_parse_specialist_output(agent_id, raw))
            return raw

        return specialist_tool

    def _build_orchestrator(self) -> Agent:
        return Agent(
            model=self.model,
            system_prompt=_orchestrator_prompt(self.context_summary),
            tools=[
                self._build_specialist_tool("environment"),
                self._build_specialist_tool("crop"),
                self._build_specialist_tool("astro"),
                self._build_specialist_tool("resource"),
            ],
        )

    def run(self, message: str) -> dict[str, Any]:
        self.specialist_transcript.clear()
        self.consulted_agents.clear()

        orchestrator = self._build_orchestrator()
        final_raw = response_text(orchestrator(message))
        final = _parse_orchestrator_output(final_raw)

        base_timestamp = int(time.time())
        messages: list[dict[str, Any]] = []
        if self.consulted_agents:
            messages.append(
                _message_entry(
                    "orchestrator",
                    severity="info",
                    message=f"Mission control routed this request to {join_agent_names(self.consulted_agents)}.",
                    timestamp=base_timestamp,
                    request_id=self.request_id,
                )
            )
        else:
            messages.append(
                _message_entry(
                    "orchestrator",
                    severity="info",
                    message="Mission control handled this request directly from the current simulation context.",
                    timestamp=base_timestamp,
                    request_id=self.request_id,
                )
            )

        for offset, specialist in enumerate(self.specialist_transcript, start=1):
            messages.append(
                _message_entry(
                    specialist["agentId"],
                    severity=severity_from_status(specialist["status"]),
                    message=specialist["message"],
                    timestamp=base_timestamp + offset,
                    request_id=self.request_id,
                )
            )

        final_severity = "info"
        if any(entry["status"] == "CRITICAL" for entry in self.specialist_transcript):
            final_severity = "critical"
        elif self.specialist_transcript:
            if any(entry["status"] == "WARNING" for entry in self.specialist_transcript):
                final_severity = "warning"
            else:
                final_severity = "success"

        messages.append(
            _message_entry(
                "orchestrator",
                severity=final_severity,
                message=f"Orchestrator resolution: {final['finalMessage']}",
                timestamp=base_timestamp + len(self.specialist_transcript) + 1,
                request_id=self.request_id,
            )
        )

        specialist_map = {entry["agentId"]: entry for entry in self.specialist_transcript}
        agent_statuses: list[dict[str, Any]] = []
        for agent_id in AGENT_ORDER:
            specialist_entry = specialist_map.get(agent_id)
            if agent_id == "orchestrator":
                action = final["nextActions"][0] if final["nextActions"] else final["summary"]
                status = "warning" if self.consulted_agents else "nominal"
            elif specialist_entry:
                action = specialist_entry["currentAction"]
                status = status_to_ui(specialist_entry["status"])
            else:
                action = standby_action(agent_id)
                status = "nominal"

            agent_statuses.append(
                {
                    "id": agent_id,
                    "name": agent_name(agent_id),
                    "role": agent_role(agent_id),
                    "icon": agent_icon(agent_id),
                    "status": status,
                    "currentAction": action,
                }
            )

        return {
            "conversationId": self.conversation_id,
            "requestId": self.request_id,
            "agentStatuses": agent_statuses,
            "messages": messages,
            "meta": {
                "leadAgent": final["leadAgent"],
                "nextActions": final["nextActions"],
                "successCondition": final["successCondition"],
                "mcp": describe_mcp_access(),
            },
        }


def run_mission_orchestrator(
    *,
    message: str,
    context_summary: str,
    conversation_id: str,
    request_id: str,
) -> dict[str, Any]:
    with StrandsMissionRuntime(
        context_summary=context_summary,
        conversation_id=conversation_id,
        request_id=request_id,
    ) as runtime:
        return runtime.run(message)
