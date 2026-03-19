"""Helpers for attaching the Mars knowledge base MCP server to Strands agents."""

from __future__ import annotations

import os
import shlex
from typing import Any

from mcp.client.stdio import StdioServerParameters, stdio_client
from mcp.client.streamable_http import streamablehttp_client
from strands.tools.mcp import MCPClient
DEFAULT_MARS_KB_SERVER_NAME = "mars-crop-knowledge-base"
DEFAULT_MARS_KB_URL = (
    "https://kb-start-hack-gateway-buyjtibfpg.gateway.bedrock-agentcore.us-east-2.amazonaws.com/mcp"
)


def build_mars_kb_tools() -> list[Any]:
    """Return the Mars knowledge base MCP client as a Strands tool provider."""
    kb_url = os.getenv("KB_MCP_URL", "").strip() or DEFAULT_MARS_KB_URL
    if kb_url:
        return [MCPClient(lambda: streamablehttp_client(kb_url))]

    kb_command = os.getenv("KB_MCP_COMMAND", "").strip()
    if not kb_command:
        return []

    kb_args = shlex.split(os.getenv("KB_MCP_ARGS", "").strip())
    return [
        MCPClient(
            lambda: stdio_client(
                StdioServerParameters(
                    command=kb_command,
                    args=kb_args,
                    env={key: value for key, value in os.environ.items() if key.startswith(("AWS_", "KB_"))},
                )
            )
        )
    ]
