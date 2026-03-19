# PROJECT_SPEC.md

## Mars Agricultural Control

## 1. Product Summary

We are building a screenshot-accurate greenhouse operations console for the Syngenta x AWS START Hack 2026 hackathon.

The active frontend is a single-screen control room with:

- a top-down greenhouse live view on the left
- overview tabs for `Greenhouse` and `Astronauts` in the center
- an agent communication feed on the right
- a simulation popup that drives mocked agent interaction

The current frontend is intentionally mock-driven. It does not need real agents or real backend data yet, but it must present the right structure and believable specialist-agent behavior.

## 2. Demo Goals

- Match the screenshoted greenhouse control-room layout
- Show how specialist agents react to a simulated disturbance
- Keep the simulation flow simple, visual, and demo-ready
- Stay fast, clear, and demo-ready for hackathon judging

## 3. Active Frontend
### Main Console

This is the active demo screen.

It must show:

- left greenhouse live view image panel
- center overview tabs: `Greenhouse` and `Astronauts`
- right agent status row and conversation feed
- top-right `Simulation` button opening a modal
- bottom mission strip for nutrition, meal diversity, food security, and crew risk

### Future Detail View

The separate detail route remains a future stub only.

It is not part of the active demo scope and should not drive the current product narrative.

## 4. Agent Model

### Environment Agent

- reacts first to climate and power stress
- explains greenhouse stabilization steps

### Crop Agent

- reacts to crop stress and harvest impact
- explains how simulated conditions affect production

### Astro Agent

- reacts to crew and astronaut implications
- explains nutrition and workload impact

### Resource Agent

- reacts to water recycling and power constraints
- explains resource mitigation steps

### Optional Orchestrator Summary

- may appear at the end of the mocked conversation
- should not dominate the active UI

## 5. In Scope

- mocked greenhouse metrics and astronaut overview data
- slider-driven simulation popup
- visible specialist agent communication after simulation start
- screenshot-accurate three-column console

## 6. Out Of Scope

- real hardware integration
- full autonomous execution loops
- production-grade agronomy simulation
- multi-user collaboration
- scientific completeness beyond what is needed for a credible hackathon demo

## 7. Required Demo Scenarios

- Temperature drift
- Water recycling
- Power availability

These three variables must visibly change:

- greenhouse metrics
- astronaut overview
- agent badge status
- conversation feed

## 8. Data Needed In The Product

### Greenhouse-level

- temperature
- humidity
- water / recycling
- power
- health score
- crop status list

### Astronaut-level

- calories
- protein
- micronutrients
- hydration
- health status

### Agent-level

- agent id and role
- status
- current action
- conversation messages
- message severity

## 9. Delivery Priorities

- prioritize visual accuracy to the screenshots
- prefer mocked local frontend behavior over invented product complexity
- keep the current detail route only as a future stub
- optimize for a fast, credible, demo-ready hackathon delivery
