# TASKS.md

## Product Focus

This task list is intentionally limited to the core product work. It excludes presentation-only work, demo polish, and other side tasks so the team can stay focused on the functionality that needs to exist in the product.

## 1. Backend To Frontend Chat Integration

Status: done

Andrija needs to connect the backend to the frontend chat interface so the chat no longer depends on mock responses. The goal is for messages from the UI to reach the backend, for the backend to return structured agent responses, and for the frontend to render those responses clearly and reliably in the existing chat flow.

This task should define the API contract between frontend and backend, wire the request and response lifecycle, and make sure the chat can handle loading, success, and failure states. Once this is in place, the chat becomes the real entry point for interacting with the system instead of a placeholder.

Status: completed on `feature/chat-backend-integration`

Notes:
- Added an Amplify custom mutation for chat submission backed by a dedicated `chatResponder` Lambda.
- Defined a shared request and response contract for message text, simulation context, agent status snapshots, and structured agent replies.
- Wired the frontend chat panel to submit real backend requests, append backend responses into the existing feed, and keep the UI stable during loading or failure states.
- Added regression coverage for the backend response builder plus frontend loading, success, and failure behavior.
- Replaced the remaining hardcoded simulation/orchestrator feed with a backend specialist coordination cycle and final orchestrator resolution.
- Simulation updates now trigger a backend review so the panel shows real agent communication instead of placeholder messages.

## 2. Dataset Creation For Frontend Integration

Luka needs to create the dataset that will be integrated into the frontend. The goal is to prepare data that matches the product model we want to show in the UI, so the frontend can display meaningful greenhouse state, inspection context, and any other product-relevant information without relying on invented placeholder values.

This task should produce a dataset structure that is consistent, easy to consume, and ready for integration. It should also be clear how this data maps into the frontend components, so connecting it later does not require rethinking the format.

## 3. Live Camera Zoom And Inspection Selection

Status: done

Marin needs to implement zooming for the left-side live camera section. The goal is to let the user use the mouse to zoom into the camera feed and select a specific area for closer inspection.

This interaction should feel precise and intuitive, because the selected region will later be sent to the crop agent once the backend integration is ready. The implementation should therefore support both navigation within the image and clear selection of the exact area the user wants to inspect in more detail.

Status: completed on `feature/live-camera-inspection-zoom`

Notes:
- Added wheel-based zoom with clamped pan movement inside the live camera viewport.
- Added an explicit `Inspect area` mode so selection gestures do not conflict with panning.
- Preserved a normalized inspection payload with viewport state for future crop-agent integration.
- Added frontend smoke-level tests for zoom/mode flow and unit tests for selection normalization and payload shape.

## 4. Technology Tab With Mocked System Inventory

Add a new `Technology` tab in the middle section of the UI.

The tab should show a mocked list of the current greenhouse technology components:

- Temperature Sensor
- Humidity Sensor
- Water Reservoir Level Sensor
- System Alarm / Fault Monitor
- Plant Camera (`CAM-01`)
- Ventilation
- Heating

Each listed component should expose mocked values for:

- Status
- Power
- Connectivity
- Component Health
- Failure Risk

This task should stay frontend-only for now. The data should be mocked locally, structured cleanly, and ready to swap with backend data later without redesigning the UI model.

## 5. Agent Runtime Cleanup And Real Orchestration

Status: done

Inspect and simplify the `agents/` folder so the active runtime only keeps the agent roles we still need:

- Environment agent
- Crop agent
- Astro agent
- Resource agent
- Orchestration agent

This task should remove or archive leftover agent files that are no longer part of the product path, verify that the retained agents still run correctly, and ensure the active agent set has consistent access to the Mars crop knowledge base MCP server.

Concise breakdown:

1. Audit `agents/` and identify the exact files that belong to the retained five-agent runtime versus leftovers from older experiments.
2. Remove, archive, or clearly de-scope unused agent entry points without breaking shared utilities, simulations, or tests that still matter.
3. Verify each retained agent has a clear entry point, expected inputs/outputs, and passes a focused smoke test.
4. Standardize MCP usage so the retained agents can all reach the Mars crop knowledge base through a shared helper or configuration path.
5. Replace the current TypeScript chat coordination shim with the real orchestrator/specialist runtime so UI conversations come from actual agent interaction.
6. Add or update tests for retained-agent execution, orchestrator resolution flow, and MCP availability/error handling.
7. Update docs to describe the final active agent set and how the real orchestration path works.

Status: completed on `feature/chat-backend-integration`

Notes:
- Narrowed the active `agents/` runtime to `environment_agent.py`, `crop_agent.py`, `astro_agent.py`, `resource_agent.py`, `mission_orchestrator.py`, and the new `chat_runtime.py` bridge.
- Archived older experimental entry points under `agents/archive/` so the product path no longer has parallel specialist or orchestrator aliases.
- Replaced the TypeScript-only chat coordination shim with a Lambda bridge that invokes the retained Python orchestrator/specialist runtime.
- Standardized Mars crop knowledge base access through `agents/mcp_support.py`, with `agents/tools/kb_tools.py` now wrapping the shared helper instead of owning separate MCP logic.
- Added smoke and regression coverage for retained-agent execution, orchestrator output, chat runtime flow, and MCP error handling.
