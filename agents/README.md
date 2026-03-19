# Agents Runtime

The retained specialist runtime keeps five agent roles:

- `environment_agent.py`
- `crop_agent.py`
- `astro_agent.py`
- `resource_agent.py`
- `mission_orchestrator.py`

The deployed chat path now lives in the Python Lambda runtime under
[`amplify/functions/chatResponder/runtime`](/home/mmestrov/Desktop/natjecanja/mars-greenhouse/amplify/functions/chatResponder/runtime),
where Strands orchestrates real LLM-based routing and specialist coordination.

`chat_runtime.py` remains a local compatibility bridge for the older
non-deployed Python flow, but it is no longer the active backend entry point.

## Shared MCP Access

All retained agents share the Mars crop knowledge base configuration through
`mcp_support.py`.

- `describe_mcp_access()` exposes configured MCP endpoint metadata
- `query_mars_crop_knowledge()` performs the shared MCP request and normalizes
  success/error payloads
- `agents/tools/kb_tools.py` remains the Strands-facing wrapper on top of the
  shared helper

## Archived Entry Points

Older experimental entry points were moved to
[agents/archive/README.md](/home/mmestrov/Desktop/natjecanja/mars-greenhouse/agents/archive/README.md)
so the active runtime path stays explicit.
