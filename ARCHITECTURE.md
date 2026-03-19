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

Responsibilities:

- expose the chat mutation contract consumed by the active frontend
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

Responsibilities:

- execute the retained five-agent product runtime
- let backend chat resolve through the real orchestrator plus specialist reports
- share one MCP configuration and query path for Mars crop knowledge access
- keep archived experiments outside the active entry-point set

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
6. The `chatResponder` Lambda invokes the Python chat runtime bridge instead of a TypeScript-only coordination shim.
7. `chat_runtime.py` builds explicit runtime inputs, runs the retained specialist agents through `mission_orchestrator.py`, and returns structured specialist messages plus a final orchestrator resolution.
8. Operator can continue the same coordination thread from the right-side panel.

### Detail Route

1. Route remains reachable.
2. Page only communicates that it is a future stub.

## 5. Boundaries

- the active frontend should stay close to the screenshots
- local simulation state is still acceptable for greenhouse visuals
- operator chat now flows through the backend and the retained Python orchestration runtime

## 6. Reversion Strategy

- keep the current root frontend as the active demo baseline
- keep the detail route as a future stub
- avoid reintroducing multi-module command-center concepts into the active main screen
