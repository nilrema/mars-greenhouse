# Mars Agricultural Control

Terragen is a fully autonomous AI agent system for managing a Martian greenhouse and stress-testing greenhouse operations against disaster scenarios.

The current product centers on a single control-room screen with:

- a left-side greenhouse live view
- center overview tabs for `Greenhouse`, `Technology`, and `Astronauts`
- a right-side agent communication panel
- a simulation flow for temperature drift, water recycling, and power availability

The frontend is the main experience today, while the backend agent layer and Amplify data stack support live telemetry, chat orchestration, and disease inspection.

## Stack

- `Vite + React + TypeScript` for the UI
- `AWS Amplify + AppSync` for greenhouse data
- `Python + Strands Agents` for orchestration and specialist agents
- `Amazon Bedrock + MCP` for model-backed agent reasoning and Mars knowledge access

## Project Layout

- `src/` contains the active frontend
- `agents/` contains the Python chat and inspection backends
- `amplify/` contains the Amplify backend definition
- `tests/` contains agent integration notes and scripts
- `PROJECT_SPEC.md`, `ARCHITECTURE.md`, and `TASKS.md` describe product scope and current implementation

## Run Locally

There are two practical ways to run this repo locally:

1. UI + local Python bridge
2. Full AWS-backed local development

### Prerequisites

- Node.js and npm
- Python 3
- AWS credentials if you want live Amplify data or Bedrock-backed agent features

### 1. Install dependencies

```bash
npm install
python3 -m venv .venv
source .venv/bin/activate
pip install -r agents/requirements.txt
```

The Vite dev server calls Python modules behind `/api/chat` and `/api/inspect-disease`, so the Python environment is needed if you want chat and disease inspection to work locally.

### 2. Start the frontend

```bash
npm run dev
```

Open `http://localhost:8080`.

This gives you the local UI shell immediately. If Python dependencies are missing, the main screen will still load, but chat and disease inspection requests will fail because those routes are handled by the local Python bridge.

## Full Local Development With AWS

Use this when you want live AppSync telemetry, Amplify outputs, and Bedrock-backed agent behavior instead of just the local UI shell.

### 1. Export AWS credentials

Make sure your shell has valid AWS credentials and an appropriate region. The agent code defaults to `us-west-2` for Bedrock if you do not override it.

```bash
export AWS_ACCESS_KEY_ID=...
export AWS_SECRET_ACCESS_KEY=...
export AWS_SESSION_TOKEN=...
export AWS_REGION=us-west-2
```

Optional overrides:

```bash
export AGENT_AWS_REGION=us-west-2
export KB_MCP_URL=https://your-mcp-endpoint/mcp
```

Note: the repo already has a default Mars knowledge base MCP URL wired in, so `KB_MCP_URL` is only needed if you want to point at a different endpoint.

### 2. Start the Amplify sandbox

```bash
npm run amplify:dev
```

This runs the Amplify sandbox and generates or refreshes `amplify_outputs.json`, which both the frontend and Python agent layer read for AppSync access.

### 3. Start the app

In a second terminal:

```bash
source .venv/bin/activate
npm run dev
```

## Common Local Workflows

### Frontend-only iteration

```bash
npm run dev
```

Best for layout, styling, and general UI work.

### Frontend tests

```bash
npm test
```

### Agent and integration checks

```bash
python3 tests/check_prerequisites.py
python3 tests/test_end_to_end.py
python3 tests/test_agent_integration.py
```

`test_agent_integration.py` expects the AWS-backed pieces to be available. If Amplify, Bedrock, or MCP access is missing, failures are expected.

## Troubleshooting

### `Unable to start Python chat bridge`

Install Python 3, create `.venv`, and install `agents/requirements.txt`.

### `Amplify data URL or API key missing in amplify_outputs.json`

Run:

```bash
npm run amplify:dev
```

### Chat or disease inspection fails even though the UI loads

Those features call the local Python bridge and may also require AWS access:

- chat uses the Strands-based agent orchestrator
- disease inspection calls Bedrock multimodal analysis

### Bedrock or MCP-related errors

Check:

- your AWS credentials are valid
- Bedrock model access is enabled
- `KB_MCP_URL` is set only if you need to override the built-in default

## Docs

- [PROJECT_SPEC.md](./PROJECT_SPEC.md)
- [ARCHITECTURE.md](./ARCHITECTURE.md)
- [TASKS.md](./TASKS.md)
- [tests/README.md](./tests/README.md)
- [tests/TESTING_GUIDE.md](./tests/TESTING_GUIDE.md)
