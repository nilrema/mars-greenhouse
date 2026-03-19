"""Shared Bedrock defaults for the Mars greenhouse agents."""

from __future__ import annotations

import os

DEFAULT_BEDROCK_REGION = "us-west-2"
DEFAULT_BEDROCK_MODEL = "us.anthropic.claude-sonnet-4-5-20250929-v1:0"


def resolve_bedrock_model() -> str:
    """Return the Bedrock model ID used by the agent system."""
    explicit_model = os.getenv("STRANDS_MODEL") or os.getenv("BEDROCK_MODEL_ID")
    if explicit_model:
        return explicit_model

    # Keep the chat flow on the working Bedrock region unless the user explicitly overrides it.
    os.environ["AWS_REGION"] = os.getenv("AGENT_AWS_REGION") or DEFAULT_BEDROCK_REGION
    os.environ["AWS_DEFAULT_REGION"] = os.getenv("AGENT_AWS_REGION") or DEFAULT_BEDROCK_REGION
    return DEFAULT_BEDROCK_MODEL
