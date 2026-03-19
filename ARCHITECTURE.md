# ARCHITECTURE.md

## 1. Purpose

This document describes the current frontend-focused architecture for the screenshot-style greenhouse console.

The repository keeps the existing stack, but the active frontend path is now:

- `src/` as the primary frontend workspace
- `agents/` as the future backend/runtime landing zone
- mocked local state as the current frontend driver

## 2. System Layers

### Frontend

Primary path:

- [src/App.tsx](/home/mmestrov/Desktop/natjecanja/mars-greenhouse/src/App.tsx)

Responsibilities:

- render the screenshot-style three-column greenhouse console
- maintain local greenhouse, astronaut, agent, log, and slider state
- drive a mocked simulation popup and conversation flow
- keep the detail route as a future stub only

### Backend / Data

Primary path:

- [amplify/data/resource.ts](/home/mmestrov/Desktop/natjecanja/mars-greenhouse/amplify/data/resource.ts)

Responsibilities:

- remain available for later integration
- not block the current mocked frontend console

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
4. Starting the simulation updates metrics and creates a staged agent conversation.

### Detail Route

1. Route remains reachable.
2. Page only communicates that it is a future stub.

## 5. Boundaries

- the active frontend should stay close to the screenshots
- local mocked state is acceptable and preferred for now
- specialist conversation is more important than backend integration in this pass

## 6. Reversion Strategy

- keep the current root frontend as the active demo baseline
- keep the detail route as a future stub
- avoid reintroducing multi-module command-center concepts into the active main screen
