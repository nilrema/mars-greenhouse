# ARCHITECTURE.md

## 1. Purpose

This document describes the target system architecture for the Martian Greenhouse Command Center.

It keeps the current stack and repo layout, but aligns the system around the actual product:
- Mars Overview view
- Greenhouse Detail view
- agent reasoning and operator chat
- chaos simulation
- crew-health-aware greenhouse operations

## 2. System Layers

### Frontend

React application that renders the two primary product views:
- Mars Overview
- Greenhouse Detail

Responsibilities:
- render live greenhouse and crew data
- maintain selected base and selected crop-section context
- display agent reasoning
- capture operator prompts
- trigger chaos mode
- support crop inspection image flow

Key current path:
- [src/pages/Dashboard.jsx](/home/mmestrov/Desktop/natjecanja/mars-greenhouse/src/pages/Dashboard.jsx)

### Backend

Amplify Gen 2 provides the application backend.

Responsibilities:
- GraphQL models and API
- subscriptions for real-time UI updates
- Lambda-backed simulation and actions
- authentication via Cognito

Key current paths:
- [amplify/data/resource.ts](/home/mmestrov/Desktop/natjecanja/mars-greenhouse/amplify/data/resource.ts)
- [amplify/functions/sensorSimulator/handler.ts](/home/mmestrov/Desktop/natjecanja/mars-greenhouse/amplify/functions/sensorSimulator/handler.ts)
- [amplify/functions/actuatorControl/handler.ts](/home/mmestrov/Desktop/natjecanja/mars-greenhouse/amplify/functions/actuatorControl/handler.ts)

### Agents

Python agents provide reasoning and control recommendations.

Current implementation lives in `agents/`, but the target product is organized around these roles:
- Mission Orchestrator
- Greenhouse Operations Agent
- Crop Health Agent
- Crew Nutrition Agent
- Incident / Chaos Agent

Responsibilities:
- analyze greenhouse and crew state
- explain reasoning in a way that can be shown in the UI
- respond to operator prompts
- evaluate anomalies
- recommend greenhouse actions
- coordinate incident response during chaos mode

Key current paths:
- [agents/orchestrator.py](/home/mmestrov/Desktop/natjecanja/mars-greenhouse/agents/orchestrator.py)
- [agents/environment_agent.py](/home/mmestrov/Desktop/natjecanja/mars-greenhouse/agents/environment_agent.py)
- [agents/resource_agent.py](/home/mmestrov/Desktop/natjecanja/mars-greenhouse/agents/resource_agent.py)
- [agents/stress_agent.py](/home/mmestrov/Desktop/natjecanja/mars-greenhouse/agents/stress_agent.py)

### Data and External Services

- AppSync / GraphQL for application data access
- DynamoDB for operational state and event records
- Lambda for simulation and command execution
- Bedrock for model inference
- MCP gateway for knowledge-base access
- S3 for crop images and optional generated artifacts

## 3. Product-Level Data Flow

### Mars Overview flow

1. Sensor simulation updates greenhouse data.
2. Backend persists new readings and derived status.
3. Agents evaluate state and write reasoning / alerts.
4. Frontend subscribes to updates and renders:
   - three bases on Mars
   - selected-base summary
   - crew overview
   - agent reasoning stream

### Greenhouse Detail flow

1. Operator opens a greenhouse from the overview.
2. Frontend loads greenhouse summary, map data, crop sections, and active anomalies.
3. When a crop section is selected or zoomed, the UI fetches section-level analysis.
4. Operator can request agent analysis or upload/capture an image.
5. Agent returns diagnosis, risk, and recommended action.

### Chaos flow

1. Operator presses `Activate Chaos`.
2. Backend generates abnormal conditions for two greenhouses.
3. Agents re-evaluate the state.
4. UI shows changed metrics, alerts, and updated reasoning.

## 4. Core Domain Objects

The exact schema can evolve, but the architecture should support these product entities:

- Base
- BaseSummary
- Greenhouse
- GreenhouseSection
- SensorReading
- SectionAnalysis
- AnomalyEvent
- CrewMember
- CrewMissionStatus
- AgentMessage
- AgentDecision
- ActionRequest
- ChaosScenario
- CropInspection

## 5. Target Frontend Composition

### Mars Overview

- 3D Mars scene
- selected-base summary panel
- chat / reasoning panel
- crew overview strip
- chaos activation control

### Greenhouse Detail

- bird's-eye greenhouse map
- greenhouse summary panel
- crop-section analysis panel
- persistent chat panel
- image inspection entry point
- astronaut dispatch actions

## 6. Boundaries

- Frontend should not talk directly to Bedrock, DynamoDB, or Lambda outside the application APIs
- Agent reasoning should be persisted so the UI can render it consistently
- Chaos mode should be a first-class backend action, not only a local UI effect
- Crew metrics must be connected to greenhouse output, not treated as isolated decoration

## 7. CI Expectations

The repository should include CI that runs on every pull request and mainline merge candidate.

Minimum CI scope:
- install dependencies
- run frontend checks
- run backend / agent tests
- fail the pipeline if any test fails

CI should protect the main branch and act as the baseline quality gate for both Andrija and Marin.
