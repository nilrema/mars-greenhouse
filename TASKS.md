# TASKS.md

## Delivery Rules

- Split work into 4 milestones
- Andrija and Marin own the full engineering delivery
- Andrija focuses on backend, data, agent integration, simulation, and CI
- Marin focuses on frontend, UX, visualization, and interaction flows
- Luka and Vedran are research leads supporting the engineering team with validation, datasets, business framing, user journey work, and presentation preparation
- Tasks inside a milestone should be independently executable where possible
- Each milestone should end in a demoable increment

## Milestone 1: Product Skeleton

### Goal

Create the product foundation for the two-screen experience and align the backend contracts with the target product model.

### Andrija

- Define the target GraphQL models for greenhouse-module overview, crew summary, greenhouse detail, section analysis, nutritional coverage, agent messages, and chaos events
- Extend or reshape the simulation layer so it can produce data for three greenhouse modules and four astronauts
- Define a backend action for chaos activation
- Add seed data for three greenhouse modules, greenhouse summaries, crop portfolios, and crew status
- Model realistic Mars CEA constraints in the simulation: sealed modules, artificial lighting, hydroponic water loops, and module-level isolation
- Establish the first automated backend / agent test setup

### Marin

- Replace the current single dashboard layout with explicit routing or view state for `Mars Overview` and `Greenhouse Detail`
- Build the high-level shell for the Mars Overview screen
- Add placeholder UI regions for the 3D Mars panel, module overview panel, chat panel, and crew strip
- Add the `Activate Chaos` control in the overview layout
- Create the high-level shell for the Greenhouse Detail screen

### Luka and Vedran

- Define the initial research plan for validating the concept with mentors, colleagues, and other hackathon teams
- Create the first version of the dataset plan: what simulated agronomy, nutrition, crew, and chaos data the engineering team needs
- Collect and summarize scientific assumptions that must stay realistic for Mars greenhouse operations
- Start the business framing: target audience, problem statement, and why this system matters beyond the demo
- Draft the first user journey from operator perspective for the two primary views

### Independent Delivery Notes

- Andrija can complete schema, simulation, and seed work without waiting for final UI styling
- Marin can build the layout and mock-driven flows before live integration is ready

### Milestone 1 Progress Notes

- 2026-03-19: Added explicit top-level view state for `Mars Overview` and `Greenhouse Detail`, preserving selected greenhouse context between the two screens.

## Milestone 2: Mars Overview End-to-End

### Goal

Make the first screen functional with selectable greenhouse modules, crew metrics, reasoning feed, and chaos response.

### Andrija

- Implement APIs and subscriptions for greenhouse-module summary, crew mission status, and agent reasoning feed
- Connect chaos activation to backend state changes affecting two greenhouses
- Produce derived module status fields for quick UI rendering
- Add tests for module selection data loading, crew summary data, and chaos event generation
- Expose a stable contract for chat message submission and reasoning retrieval

### Marin

- Implement the Mars Overview interface with interactive module selection
- Render the selected-module summary in the center panel
- Implement the right-side chat and reasoning stream UI
- Implement the bottom crew overview with nutrition score, meal diversity, food security, health risk, and nutritional coverage
- Add clear visual feedback for chaos mode impacts on affected modules

### Luka and Vedran

- Validate the product story with mentors and colleagues and capture feedback on clarity, usefulness, and realism
- Refine the dataset assumptions with Andrija so the simulated values support both engineering and demo storytelling
- Expand the business section: value proposition, demo positioning, and hackathon judging angle
- Refine the user journey so the first-view flow clearly communicates the operator decision loop
- Start the presentation outline and narrative structure for the final pitch

### Independent Delivery Notes

- Module-selection UI can be built against mock contracts while backend endpoints are finalized
- Chat UI can be completed before final agent orchestration is wired in

## Milestone 3: Greenhouse Detail And Inspection

### Goal

Deliver the second screen with greenhouse map exploration, section analysis, and crop inspection flow.

### Andrija

- Implement greenhouse detail models and APIs for summary, operational metrics, crop portfolio, crop-cycle stage, nutritional coverage, and section-level sensor data
- Add anomaly detection outputs for greenhouse sections
- Implement the image inspection backend flow for crop disease analysis
- Add action endpoints for astronaut inspection, harvest requests, and zone-isolation / crop-rebalancing actions
- Add tests for section analysis, anomaly reporting, image inspection submission, and action request handling

### Marin

- Build the bird's-eye greenhouse map view
- Add section zoom and selection interactions
- Implement the left summary panel with status, alert, risk, production, operational metrics, crop portfolio, and nutritional coverage
- Implement the right analysis panel for section-level analysis, sensor data, and anomaly display
- Build the image capture / upload interaction and hook it into the agent-chat workflow

### Luka and Vedran

- Create or curate the supporting dataset examples the detailed greenhouse view needs for realistic analysis and anomaly scenarios
- Validate the disease-inspection and astronaut-action flows with mentors and peer teams for usability and credibility
- Develop the business and user-story material around why detailed inspection, intervention, and crew-impact views matter
- Draft the visual and verbal explanation of the end-to-end user journey from overview to intervention
- Begin preparing the core presentation assets: storyline, supporting evidence, and backup slides

### Independent Delivery Notes

- Marin can complete map interactions with mock section data while backend analysis endpoints are under development
- Andrija can ship action and inspection APIs independently from final UI polish

## Milestone 4: Agent Coordination, Quality, And Demo Hardening

### Goal

Stabilize the full experience, align the agent model with the product, and enforce CI.

### Andrija

- Refactor agent orchestration toward the target roles: Mission Orchestrator, Greenhouse Operations, Crop Health, Crew Nutrition, Incident / Chaos
- Upgrade the current functional first-pass agents into richer domain-specific workflows and data contracts once the UI and schema settle
- Make agent reasoning crop-aware so recommendations reflect calorie, protein, micronutrient, water, and energy trade-offs rather than generic yield alone
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

### Luka and Vedran

- Finish validation of the idea with mentors, colleagues, and selected other teams and summarize what changed because of that feedback
- Finalize the dataset documentation and assumptions used in the demo so the team can defend the realism of the simulation
- Complete the business section and user journey narrative for judging
- Prepare the final presentation and pitch deck, including storyline, timing, speaker roles, and expected questions
- Support demo rehearsal by pressure-testing the narrative, the scientific assumptions, and the business framing

### Independent Delivery Notes

- CI and agent-role refactoring can proceed without blocking final frontend polish
- UI hardening and scenario testing can continue while backend reliability work is being completed

## Cross-Milestone Done Criteria

- Every milestone has at least one demoable walkthrough
- New backend behavior is covered by tests
- New frontend behavior has at least smoke-level verification
- Research outputs are turned into usable inputs for engineering, product decisions, and the final pitch
- No work is merged without passing CI
- Documentation stays aligned with the real product
