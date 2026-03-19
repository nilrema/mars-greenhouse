"""
Crop specialist agent for the retained Strands runtime.
"""

from __future__ import annotations

from typing import Any

from strands import Agent

from agents.agent_support import response_text

AGENT_ID = "crop"
AGENT_NAME = "CROP_AGENT"


def _system_prompt(context_summary: str) -> str:
    return f"""
You are {AGENT_NAME}, the Crop Agent for a Mars greenhouse.
Own crop stress, disease risk, harvest timing, mature-lane protection, and crop yield impacts.

Simulation context:
{context_summary}

If the consult_mars_crop_knowledge tool is available, use it only when you need external crop guidance beyond the simulation context.
Connect your assessment to harvest impact and crop risk. If another specialist must act first, say so clearly.

Reply in exactly this format:
STATUS: NOMINAL or WARNING or CRITICAL
CURRENT_ACTION: one sentence
REQUESTED_SUPPORT: one sentence, or "None."
MESSAGE: one concise direct message to the orchestrator and other specialists
"""


def run_crop_agent(
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
