# System Architecture

## System Overview
The Martian Greenhouse Management System is a multi-agent AI system that autonomously manages a greenhouse in a Martian habitat. The system monitors environmental conditions, manages crop growth, and optimizes resource usage in a resource-constrained Martian environment.

## Architecture Components

### 1. Frontend Layer (React Dashboard)
- **Dashboard**: Real-time monitoring of all greenhouse metrics
- **Components**:
  - Metric Cards: Real-time sensor readings (temp, humidity, CO2, etc.)
  - Sensor Charts: Time-series visualization of sensor data
  - Agent Log: Real-time feed of agent decisions and actions
  - Crop Management: Crop health and growth monitoring
  - Alert System: Critical condition notifications

### 2. Backend Layer (Amplify Gen2)
- **Data Layer**: GraphQL API with AppSync
- **Authentication**: Cognito for user management
- **Storage**: 
  - DynamoDB for sensor data (time-series)
  - S3 for images and reports
  - AppSync for real-time subscriptions

### 3. Agent Layer (Strands Agents)
- **Orchestrator Agent**: Central coordinator, delegates to specialists
- **Environment Agent**: Controls temperature, humidity, CO2, lighting
- **Resource Agent**: Manages water, nutrients, power allocation
- **Stress Agent**: Monitors plant health, detects issues, triggers responses

### 4. Knowledge Base (MCP Integration)
- **Mars Environmental Constraints**: Atmospheric, radiation, pressure
- **Crop Profiles**: Plant-specific requirements and stress indicators
- **Agricultural Best Practices**: Controlled environment agriculture
- **Innovation Database**: Martian agriculture research

### 5. Infrastructure Layer
- **AWS Bedrock**: LLM inference for agent reasoning
- **Lambda Functions**: Sensor simulation, actuator control
- **DynamoDB**: Time-series sensor data, crop records, agent events
- **AppSync**: Real-time subscriptions for dashboard updates

## Data Flow
1. Sensors → DynamoDB (via Lambda)
2. Orchestrator Agent analyzes data
3. Specialist agents make decisions
4. Commands sent to actuators
5. Dashboard updates in real-time

## Security & Authentication
- Cognito for user authentication
- IAM roles for Lambda functions
- API Gateway with API keys
- Bedrock IAM policies for agent access

## Deployment
- Frontend: Vercel/Amplify Hosting
- Backend: AWS Amplify Gen2
- Agents: ECS Fargate or ECS/EKS
- Database: DynamoDB with time-series data