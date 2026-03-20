"""Minimal orchestrator for the frontend chat flow."""

from __future__ import annotations

import os
from typing import Any

from strands import Agent

from .bedrock_config import resolve_bedrock_model
from .greenhouse_data import clear_required_fresh_after_timestamp, set_required_fresh_after_timestamp
from .mcp import build_mars_kb_tools
from .response_cleaning import clean_agent_response
from .specialized_agents import (
    astro_agent,
    crop_agent,
    environment_agent,
    resource_agent,
)

ORCHESTRATOR_SYSTEM_PROMPT = """
You are the orchestrator for a Mars greenhouse control-room chat built with Strands.

Routing rules:
- Climate instability, environmental controls, or power stress -> use environment_agent.
- Crop health, harvest timing, yield, or production impact -> use crop_agent.
- Crew workload, astronaut nutrition, or human impact -> use astro_agent.
- Water recycling, reserves, power allocation, or mitigation tradeoffs -> use resource_agent.
- Queries that touch several concerns can call multiple specialist tools and then combine their results.
- Very simple conversational queries can be answered directly without calling a specialist.

When Mars greenhouse context helps, you may also use the Mars knowledge base MCP tools.
Keep the final answer clean, direct, and user-facing.
Do not mention internal routing unless it adds value.
""".strip()

VISIBLE_AGENT_STEPS = {
    "environment": "Using environment_agent to evaluate climate and power stress.",
    "crop": "Using crop_agent to assess crop stress and harvest impact.",
    "astro": "Using astro_agent to assess crew and nutrition impact.",
    "resource": "Using resource_agent to evaluate water and power constraints.",
}

ROUTING_KEYWORDS = {
    "environment": ("temperature", "climate", "humidity", "cooling", "heating", "power stress", "environment"),
    "crop": ("crop", "harvest", "yield", "plant", "production", "growth", "disease"),
    "astro": ("crew", "astronaut", "nutrition", "workload", "health", "meal", "food"),
    "resource": ("water", "recycling", "power", "resource", "battery", "reserve", "constraint"),
}


def create_orchestrator_agent() -> Agent:
    """Build the orchestrator agent with specialist tools and Mars MCP access."""
    return Agent(
        model=resolve_bedrock_model("orchestrator"),
        name="chat_orchestrator",
        system_prompt=ORCHESTRATOR_SYSTEM_PROMPT,
        tools=[
            environment_agent,
            crop_agent,
            astro_agent,
            resource_agent,
            *build_mars_kb_tools(),
        ],
    )


def handle_chat(query: str, *, fresh_after_timestamp: str | None = None) -> str:
    """Handle one frontend chat turn and return a plain-text response."""
    cleaned_query = query.strip()
    if not cleaned_query:
        return "Please enter a question for the agent system."

    try:
        set_required_fresh_after_timestamp(fresh_after_timestamp)
        return clean_agent_response(str(create_orchestrator_agent()(cleaned_query)).strip())
    except Exception as exc:
        return f"Sorry, the agent orchestrator is unavailable right now: {exc}"
    finally:
        clear_required_fresh_after_timestamp()


def preview_agent_usage(query: str) -> list[str]:
    """Return a lightweight list of likely specialist agents for UI step rendering."""
    lowered_query = query.lower()
    matched_agents = [
        agent_id
        for agent_id, keywords in ROUTING_KEYWORDS.items()
        if any(keyword in lowered_query for keyword in keywords)
    ]
    return matched_agents or ["environment"]


def handle_chat_turn(
    query: str,
    *,
    fresh_after_timestamp: str | None = None,
    greenhouse_id: str | None = None,
) -> dict[str, Any]:
    """Return a simple chat payload with visible routing steps and the final response."""
    cleaned_query = query.strip()
    if not cleaned_query:
        return {
            "steps": [],
            "response": "Please enter a question for the agent system.",
        }

    steps = [
        {
            "agent": "orchestrator",
            "message": "Routing your question through the Mars greenhouse agent system.",
        }
    ]
    for agent_id in preview_agent_usage(cleaned_query):
        steps.append(
            {
                "agent": agent_id,
                "message": VISIBLE_AGENT_STEPS[agent_id],
            }
        )

    return {
        "steps": steps,
        "response": handle_chat(cleaned_query, fresh_after_timestamp=fresh_after_timestamp),
        "telemetryContext": {
            "greenhouseId": greenhouse_id or os.getenv("GREENHOUSE_ID", "mars-greenhouse-1"),
            "freshAfterTimestamp": fresh_after_timestamp,
        },
    }


def run_orchestrator(query: str) -> str:
    """Compatibility wrapper used by the older integration test scaffolding."""
    return handle_chat(query)
