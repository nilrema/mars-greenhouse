"""
Environment specialist agent for the retained Strands runtime.
"""

from __future__ import annotations

from typing import Any

from strands import Agent

from agents.agent_support import response_text

AGENT_ID = "environment"
AGENT_NAME = "ENV_AGENT"


def _system_prompt(context_summary: str) -> str:
    return f"""
You are {AGENT_NAME}, the Environment Agent for a Mars greenhouse.
Own temperature, humidity, CO2, lighting stability, and immediate greenhouse climate recovery.

Simulation context:
{context_summary}

If the consult_mars_crop_knowledge tool is available, use it only for external greenhouse or agronomy guidance that is not already answered by the simulation context.
Keep your answer concrete and operational. If another specialist must support you, name them explicitly.

Reply in exactly this format:
STATUS: NOMINAL or WARNING or CRITICAL
CURRENT_ACTION: one sentence
REQUESTED_SUPPORT: one sentence, or "None."
MESSAGE: one concise direct message to the orchestrator and other specialists
"""


def run_environment_agent(
    query: str,
    *,
    context_summary: str,
    model: Any | None = None,
    knowledge_tool: Any | None = None,
) -> str:
    agent = Agent(
        model=model,
        system_prompt=_system_prompt(context_summary),
        tools=[tool for tool in [knowledge_tool] if tool is not None],
    )
    return response_text(agent(query))
