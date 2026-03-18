# Tech Stack & Standards

## Frontend
- React 18+ with functional components and hooks
- AWS Amplify Gen 2 for data and auth
- Recharts for data visualization
- @aws-amplify/ui-react for UI components
- Vite for build tooling

## Backend
- AWS Amplify Gen 2 (TypeScript)
- AppSync GraphQL API
- DynamoDB for sensor data, crop records, and agent events
- Lambda functions for sensor simulation and actuator control

## Agents
- Strands Agents SDK for Python
- Multi-agent architecture with orchestrator and specialists
- MCP (Model Context Protocol) for knowledge base integration
- Claude Sonnet 4.5 via Bedrock

## Infrastructure
- AWS Bedrock for LLM inference
- AWS Lambda for serverless functions
- DynamoDB for time-series sensor data
- AppSync for real-time subscriptions
- Cognito for authentication

## Development Standards
- TypeScript for type safety
- ESLint with Airbnb config
- Prettier for code formatting
- Git hooks for pre-commit validation
- Automated testing with Jest and React Testing Library