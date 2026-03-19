"""Legacy knowledge-base helpers backed by the current MCP integration."""

from __future__ import annotations

import json

from agents.mcp import build_mars_kb_tools


def query_knowledge_base(query: str) -> str:
    """Query the Mars crop knowledge base when available."""
    try:
        mcp_tools = build_mars_kb_tools()
        if not mcp_tools:
            return json.dumps({"query": query, "message": "Knowledge base MCP server is not configured."})

        client = mcp_tools[0]
        with client:
            tools = client.list_tools_sync()
            if not tools:
                return json.dumps({"query": query, "message": "Knowledge base MCP server has no exposed tools."})

            tool_name = tools[0].tool_name
            result = client.call_tool_sync(tool_name, {"query": query})
            return json.dumps({
                "query": query,
                "tool": tool_name,
                "result": result.model_dump(mode="json") if hasattr(result, "model_dump") else str(result),
            })
    except Exception as exc:
        return json.dumps({"query": query, "error": str(exc)})


def get_crop_profile(crop: str) -> str:
    """Get a crop-specific profile from the knowledge base."""
    return query_knowledge_base(f"Provide a crop profile for {crop} in a Mars greenhouse.")
