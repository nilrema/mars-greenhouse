# Martian Greenhouse Command Center

Mission-control interface for a Mars agricultural system with three selectable greenhouse modules, built for the Syngenta x AWS START Hack 2026 hackathon.

## What We Are Building

The product has two main screens:

- Mars Overview
  - 3D Mars with three greenhouse modules
  - selected-module summary in the center
  - agent reasoning and operator chat on the right
  - crew overview for four astronauts at the bottom
  - `Activate Chaos` button to trigger abnormal events on two greenhouses

- Greenhouse Detail
  - bird's-eye 2D greenhouse map
  - greenhouse summary, operational metrics, and crop portfolio coverage on the left
  - section-level analysis, anomaly detection, and controls on the right
  - persistent agent chat
  - crop inspection flow with image input for disease analysis

Domain assumptions:
- Mars agriculture is modeled as sealed controlled-environment agriculture, not open-air farming.
- Hydroponic / soilless systems are the default because untreated Martian regolith is not a realistic primary grow medium.
- Artificial lighting, water recycling, and module isolation are first-class operational concerns.
- The greenhouse system supplements stored food and optimizes calorie, protein, and micronutrient coverage for the crew.

## Current Stack

We are keeping the existing technologies and tools:

- React
- AWS Amplify Gen 2
- AppSync / GraphQL
- DynamoDB
- Lambda
- Cognito
- Python agents
- Strands Agents SDK
- MCP integration
- AWS Bedrock
- Recharts
- Vite
- Docker

## Target Agent Roles

The current files in `agents/` are an implementation starting point, not the final product definition. The target system is organized around these roles:

- Mission Orchestrator
- Greenhouse Operations Agent
- Crop Health Agent
- Crew Nutrition Agent
- Incident / Chaos Agent

## Repository Structure

```text
mars-greenhouse/
├── agents/                  # Python agent runtime and tools
├── amplify/                 # Amplify Gen 2 backend definitions
├── scripts/                 # Local helper scripts
├── src/                     # React frontend
├── PROJECT_SPEC.md          # Product spec
├── ARCHITECTURE.md          # System design and boundaries
├── TASKS.md                 # Delivery plan split into milestones
├── AGENTS.md                # Team and agent working rules
└── README.md
```

## Key Existing Paths

- [src/pages/Dashboard.jsx](/home/mmestrov/Desktop/natjecanja/mars-greenhouse/src/pages/Dashboard.jsx)
- [amplify/data/resource.ts](/home/mmestrov/Desktop/natjecanja/mars-greenhouse/amplify/data/resource.ts)
- [agents/orchestrator.py](/home/mmestrov/Desktop/natjecanja/mars-greenhouse/agents/orchestrator.py)
- [agents/environment_agent.py](/home/mmestrov/Desktop/natjecanja/mars-greenhouse/agents/environment_agent.py)
- [agents/resource_agent.py](/home/mmestrov/Desktop/natjecanja/mars-greenhouse/agents/resource_agent.py)
- [agents/stress_agent.py](/home/mmestrov/Desktop/natjecanja/mars-greenhouse/agents/stress_agent.py)

## Getting Started

### Prerequisites

- Node.js 18+
- Python 3.11+
- AWS account with Bedrock access
- Docker

### Install

```bash
npm install
cd agents
pip install -r requirements.txt
cd ..
```

### Configure Agents

Create `agents/.env`:

```bash
AWS_REGION=us-east-2
KB_MCP_URL=https://kb-start-hack-gateway-buyjtibfpg.gateway.bedrock-agentcore.us-east-2.amazonaws.com/mcp
```

### Run Locally

Start Amplify sandbox:

```bash
npm run amplify:dev
```

Start the frontend:

```bash
npm run dev
```

Seed demo data:

```bash
npm run seed:demo
```

Run the orchestrator:

```bash
cd agents
python orchestrator.py
```

Build and run the agent container:

```bash
npm run agent:build
npm run agent:run
```

## Delivery Plan

- [PROJECT_SPEC.md](/home/mmestrov/Desktop/natjecanja/mars-greenhouse/PROJECT_SPEC.md) defines the product
- [ARCHITECTURE.md](/home/mmestrov/Desktop/natjecanja/mars-greenhouse/ARCHITECTURE.md) defines the system boundaries
- [TASKS.md](/home/mmestrov/Desktop/natjecanja/mars-greenhouse/TASKS.md) splits work into four milestones
- [AGENTS.md](/home/mmestrov/Desktop/natjecanja/mars-greenhouse/AGENTS.md) defines engineering rules and CI expectations
