"""
Official Strands-based multi-agent runtime for the retained Mars greenhouse agents.

This module follows the Strands "agents as tools" pattern:
- the orchestrator is a Strands Agent
- each specialist is exposed as a Strands @tool wrapper around a focused Agent
- MCP access is managed through a shared MCPClient context and provided only to
  specialists when a query genuinely benefits from knowledge-base grounding
"""

from __future__ import annotations

import os
import time
from contextlib import AbstractContextManager
from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone
from typing import Any

import boto3
import httpx
from mcp.client.streamable_http import streamablehttp_client
from strands import Agent, tool
from strands.models import BedrockModel
from strands.tools.mcp.mcp_client import MCPClient

DEFAULT_MODEL_ID = os.environ.get("STRANDS_MODEL_ID", "us.amazon.nova-pro-v1:0")
DEFAULT_MCP_URL = os.environ.get(
    "KB_MCP_URL",
    "https://kb-start-hack-gateway-buyjtibfpg.gateway.bedrock-agentcore.us-east-2.amazonaws.com/mcp",
)

KB_GENERAL_KEYWORDS = {
    "knowledge",
    "research",
    "reference",
    "references",
    "scientific",
    "paper",
    "papers",
    "study",
    "studies",
    "guidance",
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


def _status_to_ui(status: str) -> str:
    normalized = status.strip().upper()
    if normalized == "CRITICAL":
        return "critical"
    if normalized == "WARNING":
        return "warning"
    return "nominal"


def _severity_from_status(status: str) -> str:
    normalized = status.strip().upper()
    if normalized == "CRITICAL":
        return "critical"
    if normalized == "WARNING":
        return "warning"
    return "success"


def _normalize_text(text: str) -> str:
    return " ".join(text.lower().split())


def _should_enable_mcp(agent_id: str, query: str) -> bool:
    message = _normalize_text(query)
    if any(keyword in message for keyword in KB_GENERAL_KEYWORDS):
        return True
    return any(keyword in message for keyword in KB_AGENT_KEYWORDS.get(agent_id, set()))


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


def _extract_text(result: Any) -> str:
    message = getattr(result, "message", {})
    if not isinstance(message, dict):
        return str(result)
    blocks = message.get("content", [])
    parts = [str(block["text"]).strip() for block in blocks if isinstance(block, dict) and block.get("text")]
    return "\n".join(part for part in parts if part).strip()


def _parse_keyed_block(text: str) -> dict[str, str]:
    parsed: dict[str, str] = {}
    current_key: str | None = None
    buffer: list[str] = []

    def flush() -> None:
        nonlocal buffer, current_key
        if current_key is not None:
            parsed[current_key] = "\n".join(buffer).strip()
        current_key = None
        buffer = []

    for raw_line in text.splitlines():
        line = raw_line.strip()
        if not line:
            if current_key is not None:
                buffer.append("")
            continue
        if ":" in line:
            candidate_key, value = line.split(":", 1)
            normalized_key = candidate_key.strip().upper().replace(" ", "_")
            if normalized_key in {
                "STATUS",
                "CURRENT_ACTION",
                "REQUESTED_SUPPORT",
                "MESSAGE",
                "LEAD_AGENT",
                "SUMMARY",
                "NEXT_ACTIONS",
                "SUCCESS_CONDITION",
                "FINAL_MESSAGE",
            }:
                flush()
                current_key = normalized_key
                buffer = [value.strip()]
                continue
        if current_key is None:
            current_key = "MESSAGE"
        buffer.append(line)

    flush()
    return parsed


def _parse_bullet_list(raw: str) -> list[str]:
    items = []
    for line in raw.splitlines():
        entry = line.strip()
        if not entry:
            continue
        if entry.startswith("- "):
            items.append(entry[2:].strip())
        else:
            items.append(entry)
    return items


def _format_specialist_fallback(agent_id: str, error: Exception) -> str:
    return (
        "STATUS: WARNING\n"
        "CURRENT_ACTION: Continue with simulation-context analysis while the knowledge lookup path is unavailable.\n"
        "REQUESTED_SUPPORT: None.\n"
        f"MESSAGE: {_agent_name(agent_id)} could not complete the knowledge-base tool call cleanly. "
        f"Proceeding with the current simulation context only. Error: {error}"
    )


def _specialist_prompt(agent_id: str, context_summary: str) -> str:
    focus = {
        "environment": "Own climate stabilization, temperature, humidity, CO2, and lighting stability.",
        "crop": "Own crop stress, disease risk, yield protection, and inspection priority.",
        "astro": "Own crew workload, nutrition continuity, dispatch cost, and operational burden.",
        "resource": "Own water recovery, nutrient budgets, power reserves, and rationing decisions.",
    }[agent_id]
    return f"""
You are {_agent_name(agent_id)}, a Mars greenhouse specialist.
{focus}

Simulation context:
{context_summary}

If MCP knowledge-base tools are available, use them only when the operator query requires external agronomy or mission guidance. Do not force tool use when the simulation context already answers the question.

Reply in exactly this format:
STATUS: NOMINAL or WARNING or CRITICAL
CURRENT_ACTION: one sentence
REQUESTED_SUPPORT: one sentence, or "None."
MESSAGE: a concise direct message to the orchestrator and other specialists
"""


def _orchestrator_prompt(context_summary: str) -> str:
    return f"""
You are ORCH_AGENT coordinating a Mars greenhouse mission.

Simulation context:
{context_summary}

You have four specialist-agent tools:
- consult_environment_agent for climate, temperature, humidity, CO2, and lighting
- consult_crop_agent for crop stress, disease, harvest, and inspection risk
- consult_astro_agent for crew workload and nutrition continuity
- consult_resource_agent for water, nutrient, and power allocation

Use the minimum number of specialist tools needed. You may call more than one specialist when the problem crosses domains. If the question is directly answered by the simulation context, answer directly without tools.

When you finish, reply in exactly this format:
LEAD_AGENT: ORCHESTRATOR or ENVIRONMENT or CROP or ASTRO or RESOURCE
SUMMARY: one concise paragraph
NEXT_ACTIONS:
- action one
- action two
SUCCESS_CONDITION: one sentence
FINAL_MESSAGE: one concise operator-facing resolution
"""


@dataclass
class StrandsMissionRuntime(AbstractContextManager):
    context_summary: str
    conversation_id: str
    request_id: str
    model_id: str = DEFAULT_MODEL_ID
    transcript: list[dict[str, Any]] = field(default_factory=list)
    agent_statuses: dict[str, dict[str, Any]] = field(default_factory=dict)

    def __post_init__(self) -> None:
        session = boto3.Session(region_name=os.environ.get("AWS_REGION"))
        self.model = BedrockModel(boto_session=session, model_id=self.model_id)
        self.mcp_client = MCPClient(_mcp_transport, startup_timeout=30, prefix="mars_kb")
        self.kb_tools: list[Any] = []
        self._mcp_entered = False

    def __enter__(self) -> "StrandsMissionRuntime":
        self.mcp_client.__enter__()
        self.kb_tools = list(self.mcp_client.list_tools_sync())
        self._mcp_entered = True
        return self

    def __exit__(self, exc_type, exc, tb) -> None:
        if self._mcp_entered:
            self.mcp_client.__exit__(exc_type, exc, tb)
            self._mcp_entered = False

    def _record_specialist(self, agent_id: str, raw_text: str) -> str:
        parsed = _parse_keyed_block(raw_text)
        status = parsed.get("STATUS", "NOMINAL").upper()
        current_action = parsed.get("CURRENT_ACTION", "Continue monitoring.")
        message = parsed.get("MESSAGE", raw_text.strip())
        self.transcript.append(
            {
                "agentId": agent_id,
                "agentName": _agent_name(agent_id),
                "agentRole": _agent_role(agent_id),
                "severity": _severity_from_status(status),
                "message": message,
            }
        )
        self.agent_statuses[agent_id] = {
            "id": agent_id,
            "name": _agent_name(agent_id),
            "role": _agent_role(agent_id),
            "icon": _agent_icon(agent_id),
            "status": _status_to_ui(status),
            "currentAction": current_action,
        }
        return raw_text

    def _run_specialist(self, agent_id: str, query: str) -> str:
        tools = self.kb_tools if _should_enable_mcp(agent_id, query) else []
        specialist = Agent(
            model=self.model,
            system_prompt=_specialist_prompt(agent_id, self.context_summary),
            tools=tools,
            name=f"{agent_id}_specialist",
            description=f"{agent_id} specialist agent",
        )
        try:
            result = specialist(query)
            raw_text = _extract_text(result)
            if not raw_text:
                raise RuntimeError("specialist returned no text")
        except Exception as error:
            raw_text = _format_specialist_fallback(agent_id, error)
        finally:
            specialist.cleanup()
        return self._record_specialist(agent_id, raw_text)

    def build_specialist_tools(self) -> list[Any]:
        @tool(name="consult_environment_agent")
        def consult_environment_agent(query: str) -> str:
            """Consult ENV_AGENT for greenhouse climate, temperature, humidity, CO2, and lighting stability."""
            return self._run_specialist("environment", query)

        @tool(name="consult_crop_agent")
        def consult_crop_agent(query: str) -> str:
            """Consult CROP_AGENT for crop stress, disease risk, inspection priority, and harvest protection."""
            return self._run_specialist("crop", query)

        @tool(name="consult_astro_agent")
        def consult_astro_agent(query: str) -> str:
            """Consult ASTRO_AGENT for crew workload, nutrition continuity, and operational burden."""
            return self._run_specialist("astro", query)

        @tool(name="consult_resource_agent")
        def consult_resource_agent(query: str) -> str:
            """Consult RESOURCE_AGENT for water recovery, nutrient budgets, power reserves, and rationing."""
            return self._run_specialist("resource", query)

        return [
            consult_environment_agent,
            consult_crop_agent,
            consult_astro_agent,
            consult_resource_agent,
        ]

    def run(self, message: str) -> dict[str, Any]:
        orchestrator = Agent(
            model=self.model,
            system_prompt=_orchestrator_prompt(self.context_summary),
            tools=self.build_specialist_tools(),
            name="mission_orchestrator",
            description="Routes Mars greenhouse questions to specialist agents as tools.",
        )
        try:
            result = orchestrator(message)
            final_text = _extract_text(result)
        finally:
            orchestrator.cleanup()

        parsed = _parse_keyed_block(final_text)
        selected_agents = list(dict.fromkeys(entry["agentId"] for entry in self.transcript))
        messages: list[dict[str, Any]] = []
        timestamp = int(time.time())

        if selected_agents:
            agent_labels = ", ".join(_agent_name(agent_id) for agent_id in selected_agents)
            messages.append(
                {
                    "id": f"orchestrator-{timestamp}",
                    "agentId": "orchestrator",
                    "agentName": _agent_name("orchestrator"),
                    "agentRole": _agent_role("orchestrator"),
                    "severity": "info",
                    "message": f"Mission control routed this request to {agent_labels}.",
                    "timestamp": timestamp,
                }
            )
            for offset, entry in enumerate(self.transcript, start=1):
                messages.append(
                    {
                        "id": f"{entry['agentId']}-{timestamp + offset}",
                        "agentId": entry["agentId"],
                        "agentName": entry["agentName"],
                        "agentRole": entry["agentRole"],
                        "severity": entry["severity"],
                        "message": entry["message"],
                        "timestamp": timestamp + offset,
                    }
                )
            final_timestamp = timestamp + len(self.transcript) + 1
        else:
            final_timestamp = timestamp

        final_message = parsed.get("FINAL_MESSAGE") or parsed.get("SUMMARY") or final_text.strip()
        next_actions = _parse_bullet_list(parsed.get("NEXT_ACTIONS", ""))
        success_condition = parsed.get("SUCCESS_CONDITION", "Keep the greenhouse operating within safe bounds.")
        messages.append(
            {
                "id": f"orchestrator-{final_timestamp}",
                "agentId": "orchestrator",
                "agentName": _agent_name("orchestrator"),
                "agentRole": _agent_role("orchestrator"),
                "severity": "warning" if selected_agents else "success",
                "message": (
                    f"Orchestrator resolution: {final_message} "
                    f"Next actions: {'; '.join(next_actions or ['Maintain standard monitoring cadence'])}. "
                    f"Success condition: {success_condition}"
                ),
                "timestamp": final_timestamp,
            }
        )

        statuses = []
        for agent_id in ("environment", "crop", "astro", "resource"):
            statuses.append(
                self.agent_statuses.get(
                    agent_id,
                    {
                        "id": agent_id,
                        "name": _agent_name(agent_id),
                        "role": _agent_role(agent_id),
                        "icon": _agent_icon(agent_id),
                        "status": "nominal",
                        "currentAction": "Standing by for orchestrator routing.",
                    },
                )
            )

        lead_agent = (parsed.get("LEAD_AGENT", "ORCHESTRATOR").strip().lower() or "orchestrator").replace("_agent", "")
        lead_action = next_actions[0] if next_actions else "Maintain standard monitoring cadence."
        statuses.append(
            {
                "id": "orchestrator",
                "name": _agent_name("orchestrator"),
                "role": _agent_role("orchestrator"),
                "icon": _agent_icon("orchestrator"),
                "status": "warning" if selected_agents else "nominal",
                "currentAction": lead_action if lead_agent != "orchestrator" else final_message,
            }
        )

        return {
            "conversationId": self.conversation_id,
            "requestId": self.request_id,
            "agentStatuses": statuses,
            "messages": messages,
        }
