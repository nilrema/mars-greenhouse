"""
Shared Strands MCP support for the Mars crop knowledge base.
"""

from __future__ import annotations

import os
import uuid
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from typing import Any

import httpx
from mcp.client.streamable_http import streamablehttp_client
from strands import tool
from strands.tools.mcp.mcp_client import MCPClient

DEFAULT_MCP_URL = os.environ.get(
    "KB_MCP_URL",
    "https://kb-start-hack-gateway-buyjtibfpg.gateway.bedrock-agentcore.us-east-2.amazonaws.com/mcp",
)
_TOKEN_CACHE: dict[str, Any] = {"token": None, "expires_at": None}

KB_GENERAL_KEYWORDS = {
    "knowledge base",
    "mars crop knowledge",
    "mcp",
    "reference",
    "research",
    "guidance",
    "best practice",
    "scientific",
}
KB_AGENT_KEYWORDS = {
    "environment": {"climate recipe", "humidity target", "co2 target", "light recipe", "setpoint"},
    "crop": {"disease", "pathogen", "nutrient deficiency", "yield", "harvest quality", "cultivar"},
    "astro": {"crew nutrition", "human factors", "workload guidance", "astronaut food"},
    "resource": {"water recovery", "fertigation", "power budget", "reservoir guidance"},
}


@dataclass(frozen=True)
class MCPSettings:
    url: str
    configured: bool
    has_auth: bool


def _utc_now() -> datetime:
    return datetime.now(timezone.utc)


def _normalized(value: str) -> str:
    return " ".join(value.lower().split())


def get_mcp_settings() -> MCPSettings:
    client_id = os.environ.get("GATEWAY_CLIENT_ID", "").strip()
    client_secret = os.environ.get("GATEWAY_CLIENT_SECRET", "").strip()
    token_endpoint = os.environ.get("GATEWAY_TOKEN_ENDPOINT", "").strip()
    return MCPSettings(
        url=DEFAULT_MCP_URL,
        configured=bool(DEFAULT_MCP_URL.strip()),
        has_auth=bool(client_id and client_secret and token_endpoint),
    )


def describe_mcp_access() -> dict[str, Any]:
    settings = get_mcp_settings()
    return {
        "configured": settings.configured,
        "url": settings.url,
        "hasAuth": settings.has_auth,
        "provider": "strands-mcp-client",
    }


def should_enable_mcp(agent_id: str, query: str) -> bool:
    message = _normalized(query)
    if any(keyword in message for keyword in KB_GENERAL_KEYWORDS):
        return True
    return any(keyword in message for keyword in KB_AGENT_KEYWORDS.get(agent_id, set()))


def _headers_for_mcp() -> dict[str, str]:
    client_id = os.environ.get("GATEWAY_CLIENT_ID", "").strip()
    client_secret = os.environ.get("GATEWAY_CLIENT_SECRET", "").strip()
    token_endpoint = os.environ.get("GATEWAY_TOKEN_ENDPOINT", "").strip()
    scope = os.environ.get("GATEWAY_SCOPE", "").strip()

    if not all([client_id, client_secret, token_endpoint]):
        return {}

    now = _utc_now()
    cached_token = _TOKEN_CACHE["token"]
    cached_expiry = _TOKEN_CACHE["expires_at"]
    if cached_token and cached_expiry and now < cached_expiry:
        return {"Authorization": f"Bearer {cached_token}"}

    response = httpx.post(
        token_endpoint,
        data={
            "grant_type": "client_credentials",
            "client_id": client_id,
            "client_secret": client_secret,
            "scope": scope,
        },
        headers={"Content-Type": "application/x-www-form-urlencoded"},
        timeout=10,
    )
    response.raise_for_status()
    payload = response.json()
    token = payload["access_token"]
    expires_in = max(60, int(payload.get("expires_in", 3600)) - 300)
    _TOKEN_CACHE["token"] = token
    _TOKEN_CACHE["expires_at"] = now + timedelta(seconds=expires_in)
    return {"Authorization": f"Bearer {token}"}


def create_mcp_client() -> MCPClient | None:
    settings = get_mcp_settings()
    if not settings.configured:
        return None
    return MCPClient(
        lambda: streamablehttp_client(
            url=settings.url,
            headers=_headers_for_mcp() or None,
            timeout=30,
            sse_read_timeout=300,
        ),
        startup_timeout=30,
        prefix="mars_crop",
    )


def discover_tool_name(mcp_client: MCPClient | None) -> str | None:
    if mcp_client is None:
        return None
    tools = mcp_client.list_tools_sync()
    if not tools:
        return None
    return tools[0].tool_name


def _extract_tool_text(result: Any) -> str:
    content = result.get("content", []) if isinstance(result, dict) else []
    parts = [
        str(block.get("text", "")).strip()
        for block in content
        if isinstance(block, dict) and block.get("text")
    ]
    if parts:
        return "\n".join(part for part in parts if part)
    structured = result.get("structuredContent") if isinstance(result, dict) else None
    if structured:
        return str(structured)
    return str(result)


def query_mars_crop_knowledge(
    mcp_client: MCPClient | None,
    tool_name: str | None,
    *,
    query: str,
    agent_id: str,
) -> dict[str, Any]:
    if mcp_client is None:
        return {"ok": False, "status": "unconfigured", "error": "MCP client is not configured."}
    if not tool_name:
        return {"ok": False, "status": "unavailable", "error": "No Mars crop knowledge tool is available."}

    try:
        result = mcp_client.call_tool_sync(
            tool_use_id=f"{agent_id}-{uuid.uuid4().hex[:10]}",
            name=tool_name,
            arguments={"query": query},
        )
    except Exception as exc:  # pragma: no cover - defensive guard
        return {"ok": False, "status": "unavailable", "error": str(exc)}

    text = _extract_tool_text(result)
    status = str(result.get("status", "success")).lower() if isinstance(result, dict) else "success"
    if status == "error":
        return {"ok": False, "status": "unavailable", "error": text}
    return {"ok": True, "status": "available", "answer": text}


def build_knowledge_tool(
    *,
    mcp_client: MCPClient | None,
    tool_name: str | None,
    agent_id: str,
    enabled: bool,
):
    if not enabled:
        return None

    @tool
    def consult_mars_crop_knowledge(query: str) -> str:
        """
        Query the Mars crop knowledge base for agronomy and greenhouse guidance.

        Args:
            query: The agronomy or mission-support question to send to the MCP server.
        """

        result = query_mars_crop_knowledge(
            mcp_client,
            tool_name,
            query=query,
            agent_id=agent_id,
        )
        if result["ok"]:
            return result["answer"]
        return f"Knowledge lookup unavailable: {result['error']}"

    return consult_mars_crop_knowledge
