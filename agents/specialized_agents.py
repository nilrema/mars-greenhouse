"""Greenhouse specialist agents exposed as Strands tools."""

from __future__ import annotations

from typing import Any

from strands import Agent, tool
from strands_tools.retrieve import retrieve

from .bedrock_config import resolve_bedrock_model
from .greenhouse_data import format_greenhouse_snapshot, get_greenhouse_snapshot, greenhouse_data_tool
from .mcp import build_mars_kb_tools

ENVIRONMENT_AGENT_PROMPT = """
You are environment_agent for a Mars greenhouse control room.
React first to climate and power stress.
Explain greenhouse stabilization steps in clear operational language.
Prioritize temperature, humidity, ventilation, lighting, and safe recovery actions.
Use the provided live greenhouse AppSync telemetry as the source of truth for current conditions.
If the question asks for the current greenhouse state, answer from that telemetry directly.
Use the mars-crop-knowledge-base MCP server whenever general agriculture or Mars environment knowledge is needed.
Return a clean plain-text answer with no tool chatter.
""".strip()

CROP_AGENT_PROMPT = """
You are crop_agent for a Mars greenhouse control room.
Focus on crop stress, harvest impact, yield risk, and production consequences.
Explain how current conditions affect plant health and expected output.
Use the provided live greenhouse AppSync telemetry as the source of truth for current crop and environment state.
Use the mars-crop-knowledge-base MCP server whenever general agriculture or Mars environment knowledge is needed.
Return a clean plain-text answer with no tool chatter.
""".strip()

ASTRO_AGENT_PROMPT = """
You are astro_agent for a Mars greenhouse control room.
Focus on astronaut and crew impact.
Explain nutrition, workload, food availability, and crew health implications.
Use the provided live greenhouse AppSync telemetry as the source of truth for current operational conditions.
Use the mars-crop-knowledge-base MCP server whenever general agriculture or Mars environment knowledge is needed.
Return a clean plain-text answer with no tool chatter.
""".strip()

RESOURCE_AGENT_PROMPT = """
You are resource_agent for a Mars greenhouse control room.
Focus on water recycling, power constraints, and mitigation strategy.
Explain how to protect operations while managing scarce resources.
Use the provided live greenhouse AppSync telemetry as the source of truth for current resource conditions.
Use the mars-crop-knowledge-base MCP server whenever general agriculture or Mars environment knowledge is needed.
Return a clean plain-text answer with no tool chatter.
""".strip()


def _run_specialized_agent(
    *,
    query: str,
    system_prompt: str,
    tools: list[Any],
    agent_name: str,
) -> str:
    """Create a short-lived specialized agent and return a clean string response."""
    try:
        greenhouse_context = format_greenhouse_snapshot(get_greenhouse_snapshot())
        agent = Agent(
            model=resolve_bedrock_model(),
            name=agent_name,
            system_prompt=system_prompt,
            tools=[greenhouse_data_tool, *tools, *build_mars_kb_tools()],
        )
        response = str(
            agent(
                f"{query}\n\nCurrent greenhouse AppSync snapshot:\n{greenhouse_context}"
            )
        ).strip()
        return response or f"{agent_name} could not produce a response."
    except Exception as exc:
        return f"{agent_name} could not complete the request: {exc}"


@tool
def environment_agent(query: str) -> str:
    """Assess climate and power stress, then explain stabilization steps."""
    return _run_specialized_agent(
        query=query,
        system_prompt=ENVIRONMENT_AGENT_PROMPT,
        tools=[retrieve],
        agent_name="environment_agent",
    )


@tool
def crop_agent(query: str) -> str:
    """Explain crop stress, harvest impact, and production risk."""
    return _run_specialized_agent(
        query=query,
        system_prompt=CROP_AGENT_PROMPT,
        tools=[retrieve],
        agent_name="crop_agent",
    )


@tool
def astro_agent(query: str) -> str:
    """Explain astronaut and crew impacts around nutrition, workload, and health."""
    return _run_specialized_agent(
        query=query,
        system_prompt=ASTRO_AGENT_PROMPT,
        tools=[retrieve],
        agent_name="astro_agent",
    )


@tool
def resource_agent(query: str) -> str:
    """Explain resource mitigation for water recycling and power constraints."""
    return _run_specialized_agent(
        query=query,
        system_prompt=RESOURCE_AGENT_PROMPT,
        tools=[retrieve],
        agent_name="resource_agent",
    )
