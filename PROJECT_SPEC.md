# PROJECT_SPEC.md
## Martian Greenhouse Command Center

## 1. Product Summary

We are building a mission-control interface for three Martian greenhouse bases that support a crew of four astronauts.

The product has two main goals:
- help operators understand the state of all three bases at a glance
- let autonomous agents explain what they see, what they recommend, and what actions they are taking

The general architecture already exists in the repository. This document only defines the actual product we want to ship for the hackathon.

## 2. Scope

### In scope

- A dashboard with a Mars overview scene showing three greenhouse bases
- A detailed greenhouse view for one selected base
- Autonomous agent reasoning visible in the UI
- Operator-to-agent chat
- Simulated live sensor data and anomaly events
- Crew-level food and health overview
- Greenhouse-level monitoring, anomaly detection, and action controls
- Support for crop image inspection in the detailed greenhouse view

### Out of scope

- Real hardware integration
- Real astronaut devices or robotics
- Full mission-grade autonomy
- Multi-user workflows beyond the demo operator flow

## 3. Users

- Demo operator: monitors the system, asks the agent questions, triggers chaos mode, and requests actions
- Autonomous agents: analyze data, explain reasoning, suggest interventions, and coordinate greenhouse operations

## 4. Core Product Experience

### View 1: Mars Overview

The first view is the mission overview screen.

#### Left panel

- A 3D model of Mars
- Three visible greenhouse bases on the planet surface
- Each base is selectable
- Base markers should communicate high-level status at a glance

#### Center panel

When a base is selected, show a concise overview for that greenhouse:
- Temperature
- Humidity
- CO2
- Light
- Water
- Crop status

This panel also includes a button to open the detailed greenhouse view.

#### Right panel

- Chat interface with the autonomous agent system
- Visible agent reasoning and decision log
- Text input so the operator can talk to the agents

#### Bottom panel

Crew overview for 4 astronauts:
- Nutrition score
- Meal diversity
- Food security
- Crew health risk

#### Bottom-right action

- `Activate Chaos` button
- Triggers abnormal conditions affecting two greenhouses
- Example events: wind exposure, disease outbreak
- The impact must be visible in data, alerts, and agent reasoning

### View 2: Greenhouse Detail

The second view is the deep operational screen for one greenhouse.

#### Center panel

- A realistic 2D greenhouse model from a bird's-eye perspective
- Distinct crop sections visible on the map
- Zoom support for focusing on a specific crop section

#### Left panel

Greenhouse summary:
- Status
- Alert
- Risk
- Production

Operational metrics:
- Crop output
- Disease risk
- Water efficiency
- Energy efficiency
- Food inventory
- Crew supply

Also show the crop portfolio for the greenhouse.

#### Right panel

When the operator zooms into a crop section, show:
- Analysis & Control
- Sensor data
- Anomaly detection

The right side should also preserve the chat experience with the agent.

#### Detailed inspection workflow

- Operator can zoom into a crop area
- Operator can capture a plant image
- The image is sent to the agent for disease inspection
- The agent returns a diagnosis or confidence-based assessment

#### Human action workflow

The operator can request follow-up actions such as:
- send astronauts to inspect a crop section
- send astronauts to harvest crops

## 5. Target Agent System

The current files in `agents/` are not the final domain model. We will keep the existing Python agent runtime and tools, but the product should be framed around these actual agent responsibilities:

- Mission Orchestrator
  - coordinates the full system
  - decides which specialist should respond
  - explains the overall recommendation in the chat panel

- Greenhouse Operations Agent
  - monitors greenhouse environment and operating conditions
  - reasons about temperature, humidity, CO2, light, and water
  - recommends control actions inside a greenhouse

- Crop Health Agent
  - tracks crop status and anomaly signals
  - handles disease reasoning
  - supports image-based crop inspection

- Crew Nutrition Agent
  - evaluates crew nutrition score, meal diversity, food security, and health risk
  - connects greenhouse output to astronaut wellbeing

- Incident / Chaos Agent
  - injects abnormal scenarios for the demo
  - explains what changed and which greenhouses are impacted

These agents may map onto different code files than the current ones. The UI and planning documents should reflect this target system, not the temporary placeholders.

## 6. Functional Requirements

### Dashboard

- Show three greenhouse bases on Mars
- Allow base selection
- Show selected-base summary
- Show crew summary
- Show persistent chat and reasoning stream
- Allow chaos mode activation

### Greenhouse Detail

- Show 2D greenhouse map
- Support zoom into crop sections
- Show greenhouse summary and operational metrics
- Show crop-section analysis
- Support image capture / image upload flow for inspection
- Support commands to dispatch astronauts for inspection or harvest

### Agent Interaction

- Agent reasoning must be visible, not hidden
- Operator messages must appear in the same conversation space
- Agent outputs should be tied to selected base or selected crop section where relevant

### Simulation

- The system must run on simulated data
- Chaos mode must affect two greenhouses
- The UI must update clearly after abnormal events

## 7. Data Needed In The Product

### Base-level data

- Base id
- Base name
- Geographic placement on Mars model
- Temperature
- Humidity
- CO2
- Light
- Water
- Crop status
- Alert state
- Risk state

### Crew-level data

- Astronaut id
- Nutrition score
- Meal diversity
- Food security
- Crew health risk

### Greenhouse detail data

- Greenhouse layout
- Crop sections
- Section sensor readings
- Section anomalies
- Crop portfolio
- Production metrics
- Efficiency metrics
- Inventory and crew supply metrics

### Agent data

- Reasoning log entries
- Recommendations
- Actions requested
- Actions confirmed
- Chaos event records

## 8. UI Priorities

- The first screen must feel like mission control, not a generic dashboard
- The selected base should drive the context of the center panel and the chat
- The detailed greenhouse view should support exploration and inspection
- Agent output should be readable and actionable
- Chaos mode should create a dramatic but understandable change in the interface

## 9. Technical Constraints

Keep the current technologies and tools:

- React frontend
- AWS Amplify Gen 2
- AppSync / GraphQL data layer
- DynamoDB
- Lambda
- Cognito
- Python agents
- Strands Agents SDK
- MCP integration
- AWS Bedrock
- Recharts
- Vite
- Docker for agent packaging

This spec changes product shape and agent responsibilities. It does not change the stack.

## 10. Success Criteria

The demo is successful if:

- the Mars overview clearly shows three bases
- selecting a base updates the overview context
- the detailed greenhouse screen supports section-level inspection
- the operator can see agent reasoning in real time
- the operator can chat with the agent system
- chaos mode visibly disrupts two greenhouses
- the crew summary clearly connects greenhouse output to mission health

## 11. Implementation Notes

- Existing code in `agents/` should be treated as a starting point, not the final product definition
- Existing frontend code is an MVP scaffold and should evolve toward the two-view experience above
- Documentation, tasks, and architecture should describe the target system consistently
