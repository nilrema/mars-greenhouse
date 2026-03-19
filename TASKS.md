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
