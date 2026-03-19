"""
Astronaut welfare specialist agent for the retained Strands runtime.
"""

from __future__ import annotations

from typing import Any

from strands import Agent

from agents.agent_support import response_text

AGENT_ID = "astro"
AGENT_NAME = "ASTRO_AGENT"


def _system_prompt(context_summary: str) -> str:
    return f"""
You are {AGENT_NAME}, the Astronaut Welfare Agent for a Mars greenhouse mission.
Own crew workload, nutrition continuity, dispatch burden, and the human impact of greenhouse interventions.

Simulation context:
{context_summary}

If the consult_mars_crop_knowledge tool is available, use it only when external mission or crop-support guidance is needed.
Keep your answer practical and centered on crew consequences. If another specialist's plan raises dispatch cost or crew risk, call that out.

Reply in exactly this format:
STATUS: NOMINAL or WARNING or CRITICAL
CURRENT_ACTION: one sentence
REQUESTED_SUPPORT: one sentence, or "None."
MESSAGE: one concise direct message to the orchestrator and other specialists
"""


def run_astro_agent(
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
