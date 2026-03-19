# ARCHITECTURE.md

## 1. Purpose

This document describes the current frontend-focused architecture for the screenshot-style greenhouse console.

The repository keeps the existing stack, but the active frontend path is now:

- `src/` as the primary frontend workspace
- `agents/` as the active retained agent runtime
- local simulation state plus a backend chat mutation for operator requests

## 2. System Layers

### Frontend

Primary path:

- [src/App.tsx](/home/mmestrov/Desktop/natjecanja/mars-greenhouse/src/App.tsx)

Responsibilities:

- render the screenshot-style three-column greenhouse console
- maintain local greenhouse, astronaut, agent, chat, and slider state
- drive a simulation popup while sending operator chat requests and simulation review requests to the backend
- keep the detail route as a future stub only

### Backend / Data

Primary path:

- [amplify/data/resource.ts](/home/mmestrov/Desktop/natjecanja/mars-greenhouse/amplify/data/resource.ts)
- [amplify/functions/chatResponder/resource.ts](/home/mmestrov/Desktop/natjecanja/mars-greenhouse/amplify/functions/chatResponder/resource.ts)
- [handler.py](/home/mmestrov/Desktop/natjecanja/mars-greenhouse/amplify/functions/chatResponder/runtime/handler.py)
- [service.py](/home/mmestrov/Desktop/natjecanja/mars-greenhouse/amplify/functions/chatResponder/runtime/chat_responder_runtime/service.py)

Responsibilities:

- expose the chat mutation contract consumed by the active frontend
- run the active chat path in a Python Lambda bundled with Strands
- keep the backend response structured enough for the UI to render reliably

### Agents

Primary paths:

- [agents/mission_orchestrator.py](/home/mmestrov/Desktop/natjecanja/mars-greenhouse/agents/mission_orchestrator.py)
- [agents/environment_agent.py](/home/mmestrov/Desktop/natjecanja/mars-greenhouse/agents/environment_agent.py)
- [agents/crop_agent.py](/home/mmestrov/Desktop/natjecanja/mars-greenhouse/agents/crop_agent.py)
- [agents/astro_agent.py](/home/mmestrov/Desktop/natjecanja/mars-greenhouse/agents/astro_agent.py)
- [agents/resource_agent.py](/home/mmestrov/Desktop/natjecanja/mars-greenhouse/agents/resource_agent.py)
- [agents/chat_runtime.py](/home/mmestrov/Desktop/natjecanja/mars-greenhouse/agents/chat_runtime.py)
- [agents/mcp_support.py](/home/mmestrov/Desktop/natjecanja/mars-greenhouse/agents/mcp_support.py)
- [agents/agentcore_app.py](/home/mmestrov/Desktop/natjecanja/mars-greenhouse/agents/agentcore_app.py)

Responsibilities:

- execute the retained five-agent product runtime
- let backend chat resolve through a Strands-powered orchestrator using the official `agents-as-tools` pattern
- wrap each retained specialist as a callable Strands tool owned by the orchestrator
- expose one shared Strands MCP wrapper so specialists can consult the Mars crop knowledge base without raw remote tool-use sequences
- keep the same runtime deployable through Bedrock AgentCore with `BedrockAgentCoreApp`

## 3. Active Frontend State

### Main Console State

- `greenhouse`
- `astronauts`
- `agents`
- `logs`
- `metrics`
- `simParams`

## 4. Product Flow

### Main Console

1. Frontend loads mocked greenhouse and astronaut data.
2. Operator opens the simulation modal.
3. Operator adjusts temperature drift, water recycling, and power availability.
4. Starting the simulation updates metrics and local system status.
5. Frontend requests a backend specialist review for the updated simulation state.
6. The `chatResponder` mutation invokes a custom Python Lambda.
7. The Python Lambda delegates into the `agents/` runtime and starts a Strands orchestration cycle.
8. `ORCH_AGENT` decides whether to answer directly or call one or more retained specialist-agent tools.
9. Selected specialists run as focused Strands agents and use the shared Mars crop knowledge wrapper only when their query needs external guidance.
10. The orchestrator synthesizes the specialist tool outputs into the final mission resolution for the UI.
11. Operator can continue the same coordination thread from the right-side panel.

### Detail Route

1. Route remains reachable.
2. Page only communicates that it is a future stub.

## 5. Boundaries

- the active frontend should stay close to the screenshots
- local simulation state is still acceptable for greenhouse visuals
- operator chat now flows through the backend and the deployed Strands orchestration runtime
- the same runtime is packaged in an AgentCore-ready entrypoint for future deployment

## 6. Reversion Strategy

- keep the current root frontend as the active demo baseline
- keep the detail route as a future stub
- avoid reintroducing multi-module command-center concepts into the active main screen
