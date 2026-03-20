"""Helpers for cleaning user-facing agent responses."""

from __future__ import annotations

import re
from typing import Iterable

_THINKING_BLOCK_RE = re.compile(r"<thinking>.*?</thinking>", re.IGNORECASE | re.DOTALL)
_TOOL_LINE_RE = re.compile(r"^Tool #\d+:.*$", re.IGNORECASE | re.MULTILINE)
_BULLET_PREFIX_RE = re.compile(r"^\s*(?:[-*•]|\d+\.)\s+")
_LEAD_IN_RE = re.compile(
    r"^\s*(?:actions needed|recommended actions|final answer|response|summary)\s*:\s*",
    re.IGNORECASE,
)
_SENTENCE_SPLIT_RE = re.compile(r"(?<=[.!?])\s+")
_NEGATIVE_ACTION_RE = re.compile(
    r"\b(?:no need|not required|no action|no immediate action|not necessary|do not|don't|no .{0,40} action needed)\b",
    re.IGNORECASE,
)


def clean_agent_response(text: str) -> str:
    """Remove internal reasoning/tool chatter from model output."""
    cleaned = _THINKING_BLOCK_RE.sub("", text)
    cleaned = _TOOL_LINE_RE.sub("", cleaned)
    cleaned = re.sub(r"\n{3,}", "\n\n", cleaned).strip()
    return cleaned or "The agent could not produce a clean response."


def format_action_response(text: str, *, max_bullets: int = 4) -> str:
    """Normalize model output into a short flat bullet list for operators."""
    cleaned = clean_agent_response(text)
    lines = [_LEAD_IN_RE.sub("", line).strip() for line in cleaned.splitlines()]
    lines = [line for line in lines if line]

    bullet_candidates = _extract_bullet_candidates(lines)
    if not bullet_candidates:
        bullet_candidates = _extract_sentence_candidates(cleaned)

    bullet_candidates = [_normalize_action_line(line) for line in bullet_candidates if line.strip()]
    bullet_candidates = [line for line in bullet_candidates if line and not _NEGATIVE_ACTION_RE.search(line)]

    if not bullet_candidates:
        fallback = _normalize_action_line(cleaned)
        return f"- {fallback}" if fallback else "- No immediate action required."

    return "\n".join(f"- {line}" for line in bullet_candidates[:max_bullets])


def _extract_bullet_candidates(lines: Iterable[str]) -> list[str]:
    candidates: list[str] = []
    for line in lines:
        if _BULLET_PREFIX_RE.match(line):
            candidates.append(_BULLET_PREFIX_RE.sub("", line).strip())
    return candidates


def _extract_sentence_candidates(text: str) -> list[str]:
    normalized = _LEAD_IN_RE.sub("", text.strip())
    sentences = [
        sentence.strip()
        for sentence in _SENTENCE_SPLIT_RE.split(normalized.replace("\n", " "))
        if sentence.strip()
    ]
    return sentences


def _normalize_action_line(line: str) -> str:
    normalized = _BULLET_PREFIX_RE.sub("", line).strip()
    normalized = _LEAD_IN_RE.sub("", normalized)
    normalized = re.sub(r"\s+", " ", normalized).strip(" -")
    return normalized.rstrip(".")
