# Agents Runtime

This folder is now the single retained agent runtime for the product path.

Active modules:

- [agent_support.py](/home/mmestrov/Desktop/natjecanja/mars-greenhouse/agents/agent_support.py)
- [mcp_support.py](/home/mmestrov/Desktop/natjecanja/mars-greenhouse/agents/mcp_support.py)
- [environment_agent.py](/home/mmestrov/Desktop/natjecanja/mars-greenhouse/agents/environment_agent.py)
- [crop_agent.py](/home/mmestrov/Desktop/natjecanja/mars-greenhouse/agents/crop_agent.py)
- [astro_agent.py](/home/mmestrov/Desktop/natjecanja/mars-greenhouse/agents/astro_agent.py)
- [resource_agent.py](/home/mmestrov/Desktop/natjecanja/mars-greenhouse/agents/resource_agent.py)
- [mission_orchestrator.py](/home/mmestrov/Desktop/natjecanja/mars-greenhouse/agents/mission_orchestrator.py)
- [chat_runtime.py](/home/mmestrov/Desktop/natjecanja/mars-greenhouse/agents/chat_runtime.py)
- [agentcore_app.py](/home/mmestrov/Desktop/natjecanja/mars-greenhouse/agents/agentcore_app.py)

The runtime follows the official Strands `agents-as-tools` pattern:

- `ORCH_AGENT` is the top-level Strands agent
- each retained specialist is wrapped as a Strands `@tool`
- the orchestrator decides whether to answer directly or call one specialist or several
- specialists can use the Mars crop knowledge base through one shared Strands MCP wrapper in [mcp_support.py](/home/mmestrov/Desktop/natjecanja/mars-greenhouse/agents/mcp_support.py)

The deployed `chatResponder` Lambda still imports [chat_runtime.py](/home/mmestrov/Desktop/natjecanja/mars-greenhouse/agents/chat_runtime.py), so the frontend contract stays stable while the internal agent system uses the cleaned Strands runtime.

## AgentCore

[agentcore_app.py](/home/mmestrov/Desktop/natjecanja/mars-greenhouse/agents/agentcore_app.py) exposes the same runtime through `BedrockAgentCoreApp`, matching the Strands Python deployment guide for Bedrock AgentCore.

Use it as the container entrypoint for AgentCore-style deployment:

```bash
python -m agents.agentcore_app
```

## Testing

Smoke and regression coverage for this runtime lives in:

- [test_agent_roles.py](/home/mmestrov/Desktop/natjecanja/mars-greenhouse/agents/test_agent_roles.py)
- [test_runtime_smoke.py](/home/mmestrov/Desktop/natjecanja/mars-greenhouse/agents/test_runtime_smoke.py)
