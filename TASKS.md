# TASKS.md

## Delivery Rules

- Split delivery into 4 milestones
- Marin owns frontend delivery in `src/`
- Andrija owns backend, schema, simulation integration, agent contracts, and tests
- Luka owns datasets, scenario fixtures, assumptions, and demo evidence material
- Every milestone must end in a demoable increment
- The root `src/` frontend is the active frontend baseline
- The active frontend should match the screenshot-style single-console layout

## Milestone 1: Pivot Foundation

### Goal

Establish the screenshot-style greenhouse console with aligned docs and a mocked simulation flow.

### Marin

- Use the root `src/` frontend as the active baseline
- Keep the main page as a single-console greenhouse overview
- Build the mocked slider-driven simulation flow
- Restore the center `Greenhouse` / `Astronauts` overview tabs

### Andrija

- Keep backend and agent contracts compatible with future work
- Do not block the mocked frontend console on real integration

### Luka

- Support believable mocked greenhouse and astronaut values for the active console

### Demo Increment

- screenshot-accurate greenhouse console skeleton

## Milestone 2: Overview Command Center

### Goal

Make the main console the primary demo surface with slider-driven agent interaction.

### Marin

- Keep the three-column screenshot layout stable
- Make the simulation modal update greenhouse metrics, astronauts, and agent feed
- Keep the UI mock-driven and readable

### Andrija

- Leave backend integration as follow-up work
- Keep role naming and future backend direction documented

### Luka

- Tune mocked agent responses so the conversation feels credible and deterministic

### Demo Increment

- simulation run plus visible agent conversation

## Milestone 3: Module Detail And Actions

### Goal

Keep the detail screen as a future stub while refining the main console.

### Marin

- Keep the route in place as placeholder only
- Do not let it shape the active product narrative

### Andrija

- Use this milestone only if the team later chooses to reactivate detailed exploration

### Luka

- No immediate dataset work required for the detail stub

### Demo Increment

- future-stub detail route remains reachable

## Milestone 4: Demo Hardening

### Goal

Stabilize the screenshot-style console, improve clarity, and harden demo reliability.

### Marin

- Polish hierarchy, responsiveness, empty states, and simulation clarity
- Reduce leftover invented command-center wording

### Andrija

- Add regression coverage for the simulation popup and agent feed behavior
- Keep backend compatibility only where still useful

### Luka

- Finalize assumptions and presentation notes around the mocked console

### Demo Increment

- end-to-end simulation walkthrough on the main console

## Cross-Milestone Done Criteria

- Main screen renders the screenshot-style three-column layout
- Simulation popup exposes exactly three sliders and a start action
- Simulation updates greenhouse, astronauts, agent badges, and feed
- Detail route remains a future stub
- Documentation matches the pivoted product
