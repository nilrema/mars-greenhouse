# ARCHITECTURE.md

## 1. Purpose

This document describes the current frontend-focused architecture for the screenshot-style greenhouse console.

The repository keeps the existing stack, but the active frontend path is now:

- `src/` as the primary frontend workspace
- `agents/` as the future backend/runtime landing zone
- local simulation state plus a backend chat mutation for operator requests

## 2. System Layers

### Frontend

Primary path:

- [src/App.tsx](/home/mmestrov/Desktop/natjecanja/mars-greenhouse/src/App.tsx)

Responsibilities:

- render the screenshot-style three-column greenhouse console
- maintain local greenhouse, astronaut, agent, chat, and slider state
- drive a simulation popup while sending operator chat requests to the backend
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

Responsibilities:

- remain compatible with future integration plans
- not define the active frontend interaction model yet

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
5. Operator sends a chat request from the right-side panel.
6. Backend returns structured agent messages and status updates for rendering.

### Detail Route

1. Route remains reachable.
2. Page only communicates that it is a future stub.

## 5. Boundaries

- the active frontend should stay close to the screenshots
- local simulation state is still acceptable for greenhouse visuals
- operator chat now flows through the backend instead of frontend mock responses

## 6. Reversion Strategy

- keep the current root frontend as the active demo baseline
- keep the detail route as a future stub
- avoid reintroducing multi-module command-center concepts into the active main screen
