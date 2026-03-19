# TASKS.md

## Product Focus

This task list is intentionally limited to the core product work. It excludes presentation-only work, demo polish, and other side tasks so the team can stay focused on the functionality that needs to exist in the product.

## 1. Backend To Frontend Chat Integration

Andrija needs to connect the backend to the frontend chat interface so the chat no longer depends on mock responses. The goal is for messages from the UI to reach the backend, for the backend to return structured agent responses, and for the frontend to render those responses clearly and reliably in the existing chat flow.

This task should define the API contract between frontend and backend, wire the request and response lifecycle, and make sure the chat can handle loading, success, and failure states. Once this is in place, the chat becomes the real entry point for interacting with the system instead of a placeholder.

Notes:
- Added a minimal Strands Agents backend in `agents/` using the Agents-as-Tools pattern.
- Exposed `agents.handle_chat(query: str) -> str` and `agents.run_orchestrator(query: str) -> str` for chat integration.
- Added greenhouse specialist tools for environment, crop, astro, and resource responses, each with Mars knowledge base MCP access.
- Added an AppSync greenhouse data helper so specialist agents can read live `SensorReading`, `CropRecord`, `ModuleSummary`, `AgentSnapshot`, `ActionRequest`, and `ActuatorCommand` data from `amplify_outputs.json`.
- Wired the frontend chat panel to a lightweight `/api/chat` bridge that invokes `handle_chat(query)` through a small Python JSON wrapper.
- Added basic chat rendering for user turns, visible agent-routing steps, loading state, and final agent responses.
- Wired the simulation modal submit action into the backend agent flow so starting a scenario also triggers orchestrator analysis in the chat feed.
- Added focused pytest coverage for the orchestrator wiring and graceful error handling.

## 2. Dataset Creation For Frontend Integration

Luka needs to create the dataset that will be integrated into the frontend. The goal is to prepare data that matches the product model we want to show in the UI, so the frontend can display meaningful greenhouse state, inspection context, and any other product-relevant information without relying on invented placeholder values.

This task should produce a dataset structure that is consistent, easy to consume, and ready for integration. It should also be clear how this data maps into the frontend components, so connecting it later does not require rethinking the format.

## 3. Live Camera Zoom And Inspection Selection

Marin needs to implement zooming for the left-side live camera section. The goal is to let the user use the mouse to zoom into the camera feed and select a specific area for closer inspection.

This interaction should feel precise and intuitive, because the selected region will later be sent to the crop agent once the backend integration is ready. The implementation should therefore support both navigation within the image and clear selection of the exact area the user wants to inspect in more detail.

Status: completed on `feature/live-camera-inspection-zoom`

Notes:
- Added wheel-based zoom with clamped pan movement inside the live camera viewport.
- Added an explicit `Inspect area` mode so selection gestures do not conflict with panning.
- Preserved a normalized inspection payload with viewport state for future crop-agent integration.
- Added frontend smoke-level tests for zoom/mode flow and unit tests for selection normalization and payload shape.

## 4. Technology Tab In Center Overview

Marin needs to add a `Technology` tab to the center overview so operators can inspect the greenhouse devices that support crop monitoring and control. The goal is to make the core hardware visible alongside the crop and astronaut views, with the same concise control-room feel as the rest of the console.

The tab should list the following devices:

- Temperature Sensor
- Humidity Sensor
- Water Reservoir Level Sensor
- Plant Camera
- Ventilation

Each device should expose these variables in the UI:

- Status
- Power
- Connectivity
- Component Health
- Failure Risk

Status: completed on `feature/technology-tab`

Notes:
- Added a dedicated `Technology` tab between `Greenhouse` and `Astronauts` in the center panel.
- Rendered mocked operational cards for all five requested devices with the requested telemetry fields.
- Added a frontend smoke test that verifies the tab switch and device field visibility.
