"""Helpers for cleaning user-facing agent responses."""

from __future__ import annotations

import re

_THINKING_BLOCK_RE = re.compile(r"<thinking>.*?</thinking>", re.IGNORECASE | re.DOTALL)
_TOOL_LINE_RE = re.compile(r"^Tool #\d+:.*$", re.IGNORECASE | re.MULTILINE)


def clean_agent_response(text: str) -> str:
    """Remove internal reasoning/tool chatter from model output."""
    cleaned = _THINKING_BLOCK_RE.sub("", text)
    cleaned = _TOOL_LINE_RE.sub("", cleaned)
    cleaned = re.sub(r"\n{3,}", "\n\n", cleaned).strip()
    return cleaned or "The agent could not produce a clean response."
