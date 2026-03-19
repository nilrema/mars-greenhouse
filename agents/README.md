# Agents Runtime

The active runtime keeps five agent roles:

- `environment_agent.py`
- `crop_agent.py`
- `astro_agent.py`
- `resource_agent.py`
- `mission_orchestrator.py`

`chat_runtime.py` is the backend bridge that maps UI chat requests into the
retained specialist/orchestrator flow and returns the structured response
contract used by the frontend.

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
