"""Legacy knowledge-base helpers backed by the current MCP integration."""

from __future__ import annotations

import json
import re
from typing import Any

from agents.mcp import build_mars_kb_tools


RISK_LEVELS = ("low", "medium", "high")
RISK_LEVEL_RE = re.compile(r"\b(low|medium|high)\b", re.IGNORECASE)


def _result_to_jsonable(value: Any) -> Any:
    if hasattr(value, "model_dump"):
        return value.model_dump(mode="json")
    if isinstance(value, dict):
        return {key: _result_to_jsonable(item) for key, item in value.items()}
    if isinstance(value, (list, tuple)):
        return [_result_to_jsonable(item) for item in value]
    return value


def _flatten_text(value: Any) -> str:
    if isinstance(value, str):
        return value.strip()
    if isinstance(value, dict):
        parts: list[str] = []
        for key in ("text", "content", "message", "result", "output", "data"):
            if key in value:
                text = _flatten_text(value[key])
                if text:
                    parts.append(text)
        if parts:
            return "\n".join(parts)
        return "\n".join(filter(None, (_flatten_text(item) for item in value.values())))
    if isinstance(value, (list, tuple)):
        return "\n".join(filter(None, (_flatten_text(item) for item in value)))
    return str(value).strip()


def _first_tool_and_args(
    tools: list[Any],
    *,
    query: str,
    image_data_url: str | None = None,
    metadata: dict[str, Any] | None = None,
) -> tuple[str, dict[str, Any]]:
    tool = tools[0]
    tool_name = getattr(tool, "tool_name", None) or getattr(tool, "name", None) or "unknown_tool"
    schema = getattr(tool, "inputSchema", None) or getattr(tool, "input_schema", None) or {}
    properties = schema.get("properties", {}) if isinstance(schema, dict) else {}
    lowered_keys = {str(key).lower(): key for key in properties}

    arguments: dict[str, Any] = {"query": query}
    image_attached = False
    metadata_attached = False
    if image_data_url:
        for candidate in (
            "image",
            "image_data_url",
            "image_data",
            "image_url",
            "image_base64",
            "data_url",
        ):
            if candidate in lowered_keys:
                arguments[lowered_keys[candidate]] = image_data_url
                image_attached = True
                break
    if metadata:
        for candidate in ("metadata", "context", "selection", "inspection", "payload"):
            if candidate in lowered_keys:
                arguments[lowered_keys[candidate]] = metadata
                metadata_attached = True
                break
    if image_data_url and not image_attached:
        arguments["query"] = (
            f"{arguments['query']}\n\nInspection image data URL:\n{image_data_url}"
        )
    if metadata and not metadata_attached:
        arguments["query"] = (
            f"{arguments['query']}\n\nInspection metadata:\n{json.dumps(metadata, separators=(',', ':'))}"
        )

    return tool_name, arguments


def _call_knowledge_base(
    *,
    query: str,
    image_data_url: str | None = None,
    metadata: dict[str, Any] | None = None,
) -> dict[str, Any]:
    mcp_tools = build_mars_kb_tools()
    if not mcp_tools:
        return {"query": query, "message": "Knowledge base MCP server is not configured."}

    client = mcp_tools[0]
    with client:
        tools = client.list_tools_sync()
        if not tools:
            return {"query": query, "message": "Knowledge base MCP server has no exposed tools."}

        tool_name, arguments = _first_tool_and_args(
            tools,
            query=query,
            image_data_url=image_data_url,
            metadata=metadata,
        )
        result = client.call_tool_sync(f"{tool_name}-1", tool_name, arguments)
        return {
            "query": query,
            "tool": tool_name,
            "arguments": arguments,
            "result": _result_to_jsonable(result),
        }


def query_knowledge_base(query: str) -> str:
    """Query the Mars crop knowledge base when available."""
    try:
        return json.dumps(_call_knowledge_base(query=query))
    except Exception as exc:
        return json.dumps({"query": query, "error": str(exc)})


def get_crop_profile(crop: str) -> str:
    """Get a crop-specific profile from the knowledge base."""
    return query_knowledge_base(f"Provide a crop profile for {crop} in a Mars greenhouse.")
