# Agents Runtime

The retained specialist runtime keeps five agent roles:

- `environment_agent.py`
- `crop_agent.py`
- `astro_agent.py`
- `resource_agent.py`
- `mission_orchestrator.py`
- `strands_runtime.py`

The canonical Strands multi-agent runtime now lives in
[strands_runtime.py](/home/mmestrov/Desktop/natjecanja/mars-greenhouse/agents/strands_runtime.py).
It follows the official Strands `agents-as-tools` pattern:

- `ORCH_AGENT` is the top-level Strands agent
- each retained specialist is exposed as a Strands `@tool`
- the orchestrator decides whether to answer directly or call one or more specialists
- specialist agents get MCP-backed Mars crop knowledge tools only when the request actually needs knowledge grounding

The deployed chat path under
[`amplify/functions/chatResponder/runtime`](/home/mmestrov/Desktop/natjecanja/mars-greenhouse/amplify/functions/chatResponder/runtime)
now delegates to the `agents/` runtime instead of keeping a separate custom orchestration stack.

[chat_runtime.py](/home/mmestrov/Desktop/natjecanja/mars-greenhouse/agents/chat_runtime.py)
is the shared request-to-response bridge used by both local tests and the deployed Lambda path.

## Shared MCP Access

All retained agents share the Mars crop knowledge base configuration through
`mcp_support.py`.

- `describe_mcp_access()` exposes configured MCP endpoint metadata
- `query_mars_crop_knowledge()` performs the shared MCP request and normalizes
  success/error payloads
- the Strands runtime uses `MCPClient` with manual context management and tool discovery, matching the official Strands MCP guidance
- `agents/tools/kb_tools.py` remains available for non-runtime wrappers and local tool access

## Archived Entry Points

Older experimental entry points were moved to
[agents/archive/README.md](/home/mmestrov/Desktop/natjecanja/mars-greenhouse/agents/archive/README.md)
so the active runtime path stays explicit.
