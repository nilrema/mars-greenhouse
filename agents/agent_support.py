"""
Shared helpers for the retained Mars greenhouse agent runtime.
"""

from __future__ import annotations

from typing import Any

DEFAULT_GREENHOUSE_ID = "mars-greenhouse-1"
DEFAULT_MODEL_ID = "us.amazon.nova-pro-v1:0"

AGENT_ORDER = ["environment", "crop", "astro", "resource", "orchestrator"]
AGENT_METADATA = {
    "environment": {
        "name": "ENV_AGENT",
        "role": "Environment Control",
        "icon": "🌡️",
        "standby": "Holding climate watch until the orchestrator requests a review.",
    },
    "crop": {
        "name": "CROP_AGENT",
        "role": "Crop Management",
        "icon": "🌱",
        "standby": "Standing by for crop stress or harvest-risk escalation.",
    },
    "astro": {
        "name": "ASTRO_AGENT",
        "role": "Astronaut Welfare",
        "icon": "🧑‍🚀",
        "standby": "Standing by for crew-impact or workload review.",
    },
    "resource": {
        "name": "RESOURCE_AGENT",
        "role": "Resource Management",
        "icon": "⚡",
        "standby": "Holding resource reserves until the orchestrator requests support.",
    },
    "orchestrator": {
        "name": "ORCH_AGENT",
        "role": "Mission Orchestration",
        "icon": "🧭",
        "standby": "Reviewing the operator request and deciding whether specialist escalation is needed.",
    },
}

SPECIALIST_RESPONSE_KEYS = {
    "STATUS",
    "CURRENT_ACTION",
    "REQUESTED_SUPPORT",
    "MESSAGE",
}

ORCHESTRATOR_RESPONSE_KEYS = {
    "LEAD_AGENT",
    "SUMMARY",
    "NEXT_ACTIONS",
    "SUCCESS_CONDITION",
    "FINAL_MESSAGE",
}


def agent_name(agent_id: str) -> str:
    return AGENT_METADATA[agent_id]["name"]


def agent_role(agent_id: str) -> str:
    return AGENT_METADATA[agent_id]["role"]


def agent_icon(agent_id: str) -> str:
    return AGENT_METADATA[agent_id]["icon"]


def standby_action(agent_id: str) -> str:
    return AGENT_METADATA[agent_id]["standby"]


def response_text(response: Any) -> str:
    if isinstance(response, str):
        return response.strip()

    message = getattr(response, "message", None)
    if isinstance(message, dict):
        blocks = message.get("content", [])
        parts = [
            str(block.get("text", "")).strip()
            for block in blocks
            if isinstance(block, dict) and block.get("text")
        ]
        text = "\n".join(part for part in parts if part).strip()
        if text:
            return text

    if hasattr(response, "text") and isinstance(response.text, str):
        return response.text.strip()

    return str(response).strip()


def parse_keyed_block(text: str, allowed_keys: set[str]) -> dict[str, str]:
    parsed: dict[str, str] = {}
    current_key: str | None = None
    buffer: list[str] = []

    def flush() -> None:
        nonlocal current_key, buffer
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
            normalized = candidate_key.strip().upper().replace(" ", "_")
            if normalized in allowed_keys:
                flush()
                current_key = normalized
                buffer = [value.strip()]
                continue
        if current_key is None:
            current_key = "MESSAGE"
        buffer.append(line)

    flush()
    return parsed


def parse_bullets(raw: str) -> list[str]:
    items: list[str] = []
    for line in raw.splitlines():
        entry = line.strip()
        if not entry:
            continue
        items.append(entry[2:].strip() if entry.startswith("- ") else entry)
    return items


def normalize_status(raw_status: str | None) -> str:
    normalized = str(raw_status or "").strip().upper()
    if normalized in {"CRITICAL", "ALERT"}:
        return "CRITICAL"
    if normalized in {"WARNING", "WARN", "WATCH"}:
        return "WARNING"
    return "NOMINAL"


def status_to_ui(status: str) -> str:
    normalized = normalize_status(status)
    if normalized == "CRITICAL":
        return "critical"
    if normalized == "WARNING":
        return "warning"
    return "nominal"


def severity_from_status(status: str) -> str:
    normalized = normalize_status(status)
    if normalized == "CRITICAL":
        return "critical"
    if normalized == "WARNING":
        return "warning"
    return "success"


def join_agent_names(agent_ids: list[str]) -> str:
    names = [agent_name(agent_id) for agent_id in agent_ids]
    if not names:
        return ""
    if len(names) == 1:
        return names[0]
    return ", ".join(names[:-1]) + f", and {names[-1]}"
