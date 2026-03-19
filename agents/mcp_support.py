"""
Shared MCP configuration and query helpers for the retained agent runtime.
"""

from __future__ import annotations

import json
import logging
import os
from datetime import datetime, timedelta, timezone
from typing import Any, Callable

import httpx

logger = logging.getLogger(__name__)

DEFAULT_KB_MCP_URL = (
    "https://kb-start-hack-gateway-buyjtibfpg.gateway.bedrock-agentcore.us-east-2.amazonaws.com/mcp"
)
DEFAULT_TOOL_NAME = "kb-start-hack-target___knowledge_base_retrieve"

Transport = Callable[[str, dict[str, Any], dict[str, str]], dict[str, Any]]

_token_cache: dict[str, Any] = {"token": None, "expires_at": None}


def get_mcp_configuration() -> dict[str, Any]:
    return {
        "url": os.environ.get("KB_MCP_URL", DEFAULT_KB_MCP_URL).strip(),
        "toolName": os.environ.get("KB_MCP_TOOL_NAME", DEFAULT_TOOL_NAME).strip(),
        "clientId": os.environ.get("GATEWAY_CLIENT_ID", "").strip(),
        "clientSecret": os.environ.get("GATEWAY_CLIENT_SECRET", "").strip(),
        "tokenEndpoint": os.environ.get("GATEWAY_TOKEN_ENDPOINT", "").strip(),
        "scope": os.environ.get("GATEWAY_SCOPE", "").strip(),
    }


def describe_mcp_access() -> dict[str, Any]:
    config = get_mcp_configuration()
    return {
        "configured": bool(config["url"] and config["toolName"]),
        "url": config["url"] or None,
        "toolName": config["toolName"] or None,
    }


def _get_oauth_token(config: dict[str, Any]) -> str:
    now = datetime.now(timezone.utc)
    if _token_cache["token"] and _token_cache["expires_at"] and now < _token_cache["expires_at"]:
        return str(_token_cache["token"])

    if not all([config["clientId"], config["clientSecret"], config["tokenEndpoint"]]):
        return ""

    response = httpx.post(
        config["tokenEndpoint"],
        data={
            "grant_type": "client_credentials",
            "client_id": config["clientId"],
            "client_secret": config["clientSecret"],
            "scope": config["scope"],
        },
        headers={"Content-Type": "application/x-www-form-urlencoded"},
        timeout=10,
    )
    response.raise_for_status()
    payload = response.json()
    token = payload["access_token"]
    expires_in = max(60, int(payload.get("expires_in", 3600)) - 300)
    _token_cache["token"] = token
    _token_cache["expires_at"] = now + timedelta(seconds=expires_in)
    return token


def _default_transport(url: str, request: dict[str, Any], headers: dict[str, str]) -> dict[str, Any]:
    with httpx.Client(timeout=30.0) as client:
        response = client.post(url, json=request, headers=headers)
        response.raise_for_status()
        return response.json()


def query_mars_crop_knowledge(
    query: str,
    *,
    max_results: int = 5,
    transport: Transport | None = None,
) -> dict[str, Any]:
    config = get_mcp_configuration()
    access = describe_mcp_access()

    if not access["configured"]:
        return {
            "ok": False,
            "status": "unconfigured",
            "query": query,
            "error": "Mars crop knowledge base MCP configuration is missing.",
            "access": access,
        }

    headers: dict[str, str] = {}
    try:
        token = _get_oauth_token(config)
        if token:
            headers["Authorization"] = f"Bearer {token}"
    except Exception as error:  # pragma: no cover - defensive network handling
        logger.warning("Failed to refresh MCP OAuth token: %s", error)

    request = {
        "jsonrpc": "2.0",
        "method": "tools/call",
        "params": {
            "name": config["toolName"],
            "arguments": {
                "query": query,
                "max_results": max_results,
            },
        },
        "id": 1,
    }

    active_transport = transport or _default_transport
    try:
        response = active_transport(str(config["url"]), request, headers)
    except httpx.TimeoutException:
        return {
            "ok": False,
            "status": "unavailable",
            "query": query,
            "error": "MCP endpoint timeout - knowledge base unavailable.",
            "access": access,
        }
    except httpx.HTTPStatusError as error:
        status_code = error.response.status_code if error.response is not None else "unknown"
        return {
            "ok": False,
            "status": "unavailable",
            "query": query,
            "error": f"MCP HTTP error: {status_code}",
            "access": access,
        }
    except Exception as error:
        return {
            "ok": False,
            "status": "unavailable",
            "query": query,
            "error": str(error),
            "access": access,
        }

    if "result" in response:
        return {
            "ok": True,
            "status": "available",
            "query": query,
            "result": response["result"],
            "access": access,
        }

    error_payload = response.get("error") or "Unexpected response format from MCP endpoint."
    return {
        "ok": False,
        "status": "unavailable",
        "query": query,
        "error": error_payload if isinstance(error_payload, str) else json.dumps(error_payload),
        "access": access,
    }
