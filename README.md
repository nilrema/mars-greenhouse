# Martian Greenhouse Management System

## Syngenta × AWS START Hack 2026

An autonomous AI agent system to manage a Martian greenhouse, built for the Syngenta × AWS START Hack 2026 hackathon.

## System Overview

The Martian Greenhouse Management System is a multi-agent AI system that autonomously manages a greenhouse in a Martian habitat. The system monitors environmental conditions, manages crop growth, and optimizes resource usage in a resource-constrained Martian environment.

## Architecture

### Frontend Layer (React Dashboard)
- Real-time monitoring of all greenhouse metrics
- Metric Cards for sensor readings (temp, humidity, CO2, etc.)
- Sensor Charts for time-series visualization
- Agent Log for real-time agent decisions
- Crop Management for plant health monitoring
- Alert System for critical condition notifications

### Backend Layer (Amplify Gen2)
- GraphQL API with AppSync
- DynamoDB for sensor data, crop records, and agent events
- Lambda functions for sensor simulation and actuator control
- Cognito for authentication

### Agent Layer (Strands Agents)
- **Orchestrator Agent**: Central coordinator, delegates to specialists
- **Environment Agent**: Controls temperature, humidity, CO2, lighting
- **Resource Agent**: Manages water, nutrients, power allocation
- **Stress Agent**: Monitors plant health, detects issues, triggers responses

### Knowledge Base (MCP Integration)
- Mars Environmental Constraints
- Crop Profiles
- Plant Stress and Response Guide
- Human Nutritional Strategy
- Greenhouse Operational Scenarios

## Tech Stack

### Frontend
- React 18+ with functional components and hooks
- AWS Amplify Gen 2 for data and auth
- Recharts for data visualization
- @aws-amplify/ui-react for UI components
- Vite for build tooling

### Backend
- AWS Amplify Gen 2 (TypeScript)
- AppSync GraphQL API
- DynamoDB for time-series data
- Lambda functions (Node.js)

### Agents
- Python with Strands Agents SDK
- Multi-agent architecture
- MCP (Model Context Protocol) for knowledge base integration
- Claude Sonnet 4.5 via AWS Bedrock

### Infrastructure
- AWS Bedrock for LLM inference
- AWS Lambda for serverless functions
- DynamoDB for time-series sensor data
- AppSync for real-time subscriptions
- Cognito for authentication

## Project Structure

```
mars-greenhouse/
├── .kiro/                          # Kiro IDE configuration
│   ├── settings/mcp.json          # MCP endpoint configuration
│   └── steering/                  # Project guidance
├── amplify/                       # AWS Amplify Gen2 backend
│   ├── auth/resource.ts          # Cognito setup
│   ├── data/resource.ts          # GraphQL schema
│   ├── functions/                # Lambda functions
│   │   ├── sensorSimulator/      # Sensor data generation
│   │   └── actuatorControl/      # Actuator command execution
│   └── backend.ts                # Backend wiring
├── agents/                       # Python AI agents
│   ├── orchestrator.py           # Main coordinator agent
│   ├── environment_agent.py      # Environment control agent
│   ├── resource_agent.py         # Resource management agent
│   ├── stress_agent.py           # Plant stress detection agent
│   ├── tools/                    # Agent tools
│   │   ├── sensor_tools.py       # Read sensor data
│   │   ├── actuator_tools.py     # Control actuators
│   │   └── kb_tools.py          # Query knowledge base
│   ├── requirements.txt          # Python dependencies
│   └── Dockerfile               # Agent deployment
├── src/                          # React frontend
│   ├── components/              # React components
│   │   ├── MetricCard.jsx       # Sensor value display
│   │   ├── CropTable.jsx        # Crop list display
│   │   ├── AgentLog.jsx         # Agent event feed
│   │   ├── SensorChart.jsx      # Time-series charts
│   │   ├── EnvironmentPanel.jsx # Environmental metrics
│   │   └── AlertBanner.jsx      # Alert notifications
│   ├── hooks/                   # Custom React hooks
│   │   ├── useSensorData.js     # Sensor data fetching
│   │   └── useAgentLog.js       # Agent log subscription
│   ├── pages/Dashboard.jsx      # Main dashboard
│   ├── App.jsx                  # Root app component
│   └── main.jsx                 # Entry point
├── package.json                 # Node.js dependencies
├── vite.config.js              # Build configuration
└── README.md                   # This file
```

## Getting Started

### Prerequisites
- Node.js 18+ and npm
- Python 3.11+
- AWS Account with Bedrock access
- Docker (for agent deployment)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd mars-greenhouse
   ```

2. **Install frontend and Amplify dependencies**
   ```bash
   npm install
   ```

3. **Install agent dependencies**
   ```bash
   cd agents
   pip install -r requirements.txt
   cd ..
   ```

4. **Configure environment variables**
   Create `agents/.env` with:
   ```
   AWS_REGION=us-east-2
   KB_MCP_URL=https://kb-start-hack-gateway-buyjtibfpg.gateway.bedrock-agentcore.us-east-2.amazonaws.com/mcp
   ```
   The frontend reads its Amplify configuration from `amplify_outputs.json`, which is generated by Amplify.

### Running the System

1. **Start the Amplify sandbox (backend)**
   ```bash
   npm run amplify:dev
   ```
   This generates `amplify_outputs.json` in the project root so the React app can talk to your sandbox.
   This repo also patches the local AWS XML parser used by the Amplify CLI after `npm install`, because recent Amplify/CDK CloudFormation polling can exceed the parser's default entity expansion ceiling on stacks with nested auth/data/function resources.

2. **Start the frontend development server**
   ```bash
   npm run dev
   ```
   If `amplify_outputs.json` is not present yet, the dashboard boots in mock mode so the UI is still usable.

3. **Seed demo data for the dashboard**
   ```bash
   npm run seed:demo
   ```
   This creates initial sensor readings, crop records, and an agent event so the frontend has data immediately.

4. **Run the orchestrator agent**
   ```bash
   cd agents
   python orchestrator.py
   ```

5. **Build and run agents with Docker**
   ```bash
   npm run agent:build
   npm run agent:run
   ```

## Deployment

### Frontend Deployment
```bash
npm run build
```

### Backend Deployment
```bash
export AWS_BRANCH=main
export AWS_APP_ID=<your-amplify-app-id>
npm run amplify:deploy
```

### Amplify Hosting Deployment
1. Connect the repository to AWS Amplify Hosting.
2. Use the repository root as the app root.
3. Build with:
   ```bash
   npm ci
   npm run build
   ```
4. Amplify Gen 2 will provide branch-specific backend outputs during CI/CD.
5. To test the deployed backend locally, generate outputs for the branch:
   ```bash
   export AWS_BRANCH=main
   export AWS_APP_ID=<your-amplify-app-id>
   npm run amplify:outputs
   ```

### Agent Deployment
1. Build Docker image:
   ```bash
   cd agents
   docker build -t mars-greenhouse-agent .
   ```

2. Deploy to ECS Fargate or EKS:
   ```bash
   # Push to ECR
   docker tag mars-greenhouse-agent:latest <account-id>.dkr.ecr.us-east-2.amazonaws.com/mars-greenhouse-agent:latest
   docker push <account-id>.dkr.ecr.us-east-2.amazonaws.com/mars-greenhouse-agent:latest
   ```

## Hackathon Requirements Met

✅ **Monitor and control the environment** - Maintain optimal temperature, humidity, light, water, and CO₂  
✅ **Manage resources** - Efficiently use and recycle water and nutrients under Martian constraints  
✅ **Detect and respond to plant stress** - Identify nutrient deficiencies, disease, and trigger automated responses  
✅ **Optimize for growth** - Learn and adapt strategies for growing crops in a Martian environment  

✅ **Tech Stack Compliance**:
- React with AWS Amplify Gen2
- Recharts for sensor time-series charts
- Python agents using Strands Agents SDK
- Multi-agent pattern with orchestrator + specialists
- MCP client connecting to organizers' Knowledge Base
- AWS Bedrock (Claude Sonnet 4.5)
- AWS Lambda for sensor simulation and actuator control
- DynamoDB for sensor history, crop state, and agent event logs

## License

This project was created for the Syngenta × AWS START Hack 2026 hackathon.
