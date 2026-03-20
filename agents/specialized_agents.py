"""Greenhouse specialist agents exposed as Strands tools."""

from __future__ import annotations

from strands import Agent, tool

from .bedrock_config import resolve_bedrock_model
from .greenhouse_data import format_greenhouse_snapshot, get_greenhouse_snapshot
from .mcp import build_mars_kb_tools
from .response_cleaning import format_action_response

ENVIRONMENT_AGENT_PROMPT = """
You are environment_agent for a Mars greenhouse control room.
You only handle temperature deviation in this demo scenario lab.
Allowed actions:
- Turn heating on when the greenhouse is too cold.
- Turn cooling on when the greenhouse is too hot.
Do not recommend ventilation, humidity changes, lighting changes, crop actions, crew actions, or any other mitigation.
Use the provided live greenhouse AppSync telemetry as the source of truth for current conditions.
If the question asks for the current greenhouse state, answer from that telemetry directly.
If user-supplied numbers conflict with the live telemetry, call out the mismatch briefly and prioritize the live telemetry.
This is a sealed Mars greenhouse. Avoid Earth-only recommendations.
Return at most 2 short bullet-style action lines focused only on heating or cooling.
""".strip()

CROP_AGENT_PROMPT = """
You are crop_agent for a Mars greenhouse control room.
You only handle harvest-near-ready recommendations in this demo scenario lab.
Allowed action:
- Suggest harvesting a crop that is effectively ready now.
Treat crops as harvest-near-ready when the prompt explicitly says they are around 98 percent ready, harvest-ready, or when telemetry shows daysToHarvest is 2 or less.
Do not recommend planting plans, environmental controls, resource reallocations, or general crop strategy.
Use the provided live greenhouse AppSync telemetry as the source of truth for current crop and environment state.
If user-supplied numbers conflict with the live telemetry, call out the mismatch briefly and prioritize the live telemetry.
This is a sealed Mars greenhouse. Avoid Earth-only recommendations.
Return at most 2 short bullet-style action lines focused only on harvesting.
""".strip()

ASTRO_AGENT_PROMPT = """
You are astro_agent for a Mars greenhouse control room.
You own crew-impact analysis in this demo scenario lab.
When crew hydration is low or protein intake is too low, provide a short planting plan tuned to crew needs.
Use Mars crop knowledge when it helps choose suitable crops, but keep the result practical and brief.
Do not recommend harvest actions, irrigation pump changes, LED reductions, heating, cooling, or sensor replacement.
Use the provided live greenhouse AppSync telemetry as the source of truth for current operational conditions.
If user-supplied numbers conflict with the live telemetry, call out the mismatch briefly and prioritize the live telemetry.
This is a sealed Mars greenhouse. Avoid Earth-only recommendations.
Return at most 2 short bullet-style action lines focused on crew needs and planting guidance.
""".strip()

RESOURCE_AGENT_PROMPT = """
You are resource_agent for a Mars greenhouse control room.
You only handle resource suggestions in this demo scenario lab.
Allowed actions:
- Increase irrigation pump flow when water recycling drops.
- Reduce LED light usage when power availability drops.
- Replace the humidity sensor when the prompt or context already indicates high failure risk.
Do not recommend any other resource strategy, crop strategy, crew plan, or environmental action.
Use the provided live greenhouse AppSync telemetry as the source of truth for current resource conditions.
If user-supplied numbers conflict with the live telemetry, call out the mismatch briefly and prioritize the live telemetry.
This is a sealed Mars greenhouse. Avoid Earth-only recommendations such as rainwater collection.
Return at most 3 short bullet-style action lines using only the allowed actions.
""".strip()


def _run_specialized_agent(
    *,
    query: str,
    system_prompt: str,
    agent_name: str,
    tools: list[object] | None = None,
) -> str:
    """Create a short-lived specialized agent and return a clean string response."""
    try:
        greenhouse_context = format_greenhouse_snapshot(get_greenhouse_snapshot())
        agent = Agent(
            model=resolve_bedrock_model("specialist"),
            name=agent_name,
            system_prompt=system_prompt,
            tools=tools or [],
        )
        response = str(
            agent(
                f"{query}\n\nCurrent greenhouse AppSync snapshot:\n{greenhouse_context}"
            )
        ).strip()
        return format_action_response(response, max_bullets=3) or f"{agent_name} could not produce a response."
    except Exception as exc:
        return f"{agent_name} could not complete the request: {exc}"


@tool
def environment_agent(query: str) -> str:
    """Assess climate and power stress, then explain stabilization steps."""
    return _run_specialized_agent(
        query=query,
        system_prompt=ENVIRONMENT_AGENT_PROMPT,
        agent_name="environment_agent",
    )


@tool
def crop_agent(query: str) -> str:
    """Explain crop stress, harvest impact, and production risk."""
    return _run_specialized_agent(
        query=query,
        system_prompt=CROP_AGENT_PROMPT,
        agent_name="crop_agent",
    )


@tool
def astro_agent(query: str) -> str:
    """Explain astronaut and crew impacts around nutrition, workload, and health."""
    return _run_specialized_agent(
        query=query,
        system_prompt=ASTRO_AGENT_PROMPT,
        agent_name="astro_agent",
        tools=build_mars_kb_tools(),
    )


@tool
def resource_agent(query: str) -> str:
    """Explain resource mitigation for water recycling and power constraints."""
    return _run_specialized_agent(
        query=query,
        system_prompt=RESOURCE_AGENT_PROMPT,
        agent_name="resource_agent",
    )
