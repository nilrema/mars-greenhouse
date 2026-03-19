# TASKS.md

## Delivery Rules

- Split work into 4 milestones
- Andrija focuses on backend, data, agent integration, and CI
- Marin focuses on frontend, UX, visualization, and interaction flows
- Tasks inside a milestone should be independently executable where possible
- Each milestone should end in a demoable increment

## Milestone 1: Product Skeleton

### Goal

Create the product foundation for the two-screen experience and align the backend contracts with the target product model.

### Andrija

- Define the target GraphQL models for base overview, crew summary, greenhouse detail, section analysis, agent messages, and chaos events
- Extend or reshape the simulation layer so it can produce data for three bases and four astronauts
- Define a backend action for chaos activation
- Add seed data for three bases, greenhouse summaries, and crew status
- Establish the first automated backend / agent test setup

### Marin

- Replace the current single dashboard layout with explicit routing or view state for `Mars Overview` and `Greenhouse Detail`
- Build the high-level shell for the Mars Overview screen
- Add placeholder UI regions for the 3D Mars panel, base overview panel, chat panel, and crew strip
- Add the `Activate Chaos` control in the overview layout
- Create the high-level shell for the Greenhouse Detail screen

### Independent Delivery Notes

- Andrija can complete schema, simulation, and seed work without waiting for final UI styling
- Marin can build the layout and mock-driven flows before live integration is ready

## Milestone 2: Mars Overview End-to-End

### Goal

Make the first screen functional with selectable bases, crew metrics, reasoning feed, and chaos response.

### Andrija

- Implement APIs and subscriptions for base summary, crew mission status, and agent reasoning feed
- Connect chaos activation to backend state changes affecting two greenhouses
- Produce derived base status fields for quick UI rendering
- Add tests for base selection data loading, crew summary data, and chaos event generation
- Expose a stable contract for chat message submission and reasoning retrieval

### Marin

- Implement the Mars Overview interface with interactive base selection
- Render the selected-base summary in the center panel
- Implement the right-side chat and reasoning stream UI
- Implement the bottom crew overview with nutrition score, meal diversity, food security, and health risk
- Add clear visual feedback for chaos mode impacts on affected bases

### Independent Delivery Notes

- Base-selection UI can be built against mock contracts while backend endpoints are finalized
- Chat UI can be completed before final agent orchestration is wired in

## Milestone 3: Greenhouse Detail And Inspection

### Goal

Deliver the second screen with greenhouse map exploration, section analysis, and crop inspection flow.

### Andrija

- Implement greenhouse detail models and APIs for summary, operational metrics, crop portfolio, and section-level sensor data
- Add anomaly detection outputs for greenhouse sections
- Implement the image inspection backend flow for crop disease analysis
- Add action endpoints for astronaut inspection and harvest requests
- Add tests for section analysis, anomaly reporting, image inspection submission, and action request handling

### Marin

- Build the bird's-eye greenhouse map view
- Add section zoom and selection interactions
- Implement the left summary panel with status, alert, risk, production, operational metrics, and crop portfolio
- Implement the right analysis panel for section-level analysis, sensor data, and anomaly display
- Build the image capture / upload interaction and hook it into the agent-chat workflow

### Independent Delivery Notes

- Marin can complete map interactions with mock section data while backend analysis endpoints are under development
- Andrija can ship action and inspection APIs independently from final UI polish

## Milestone 4: Agent Coordination, Quality, And Demo Hardening

### Goal

Stabilize the full experience, align the agent model with the product, and enforce CI.

### Andrija

- Refactor agent orchestration toward the target roles: Mission Orchestrator, Greenhouse Operations, Crop Health, Crew Nutrition, Incident / Chaos
- Upgrade the current functional first-pass agents into richer domain-specific workflows and data contracts once the UI and schema settle
- Ensure agent reasoning is persisted in a UI-friendly structure
- Implement or document fallback behavior for missing data and agent timeouts
- Add CI pipeline for frontend and backend / agent tests
- Add release-oriented test coverage for critical flows

### Marin

- Polish the two-screen experience for demo readiness
- Improve responsiveness, loading states, error states, and empty states
- Tune the visual hierarchy so mission status, alerts, and agent reasoning are immediately understandable
- Validate the UX for chaos mode, crop inspection, and astronaut action requests
- Support final integration testing with realistic demo scenarios

### Independent Delivery Notes

- CI and agent-role refactoring can proceed without blocking final frontend polish
- UI hardening and scenario testing can continue while backend reliability work is being completed

## Cross-Milestone Done Criteria

- Every milestone has at least one demoable walkthrough
- New backend behavior is covered by tests
- New frontend behavior has at least smoke-level verification
- No work is merged without passing CI
- Documentation stays aligned with the real product
