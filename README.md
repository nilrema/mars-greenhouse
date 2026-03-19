# Mars Agricultural Control

Screenshot-style greenhouse operations console for the Syngenta x AWS START Hack 2026 hackathon.

## Active Frontend
The active product is a single-console greenhouse UI with:

- left greenhouse live-view image
- center `Greenhouse` and `Astronauts` tabs
- right agent communication feed
- a simulation popup with three sliders

The current interaction model is mocked and frontend-driven.

The root `src/` frontend remains in the repo as a frozen legacy reference during the pivot.

## Main Paths

- [src/](/home/mmestrov/Desktop/natjecanja/mars-greenhouse/src)
- [agents/](/home/mmestrov/Desktop/natjecanja/mars-greenhouse/agents)
- [amplify/data/resource.ts](/home/mmestrov/Desktop/natjecanja/mars-greenhouse/amplify/data/resource.ts)
- [PROJECT_SPEC.md](/home/mmestrov/Desktop/natjecanja/mars-greenhouse/PROJECT_SPEC.md)
- [ARCHITECTURE.md](/home/mmestrov/Desktop/natjecanja/mars-greenhouse/ARCHITECTURE.md)
- [TASKS.md](/home/mmestrov/Desktop/natjecanja/mars-greenhouse/TASKS.md)

## Active Simulation Inputs

- temperature drift
- water recycling
- power availability

## Detail Route

The separate detail route remains in the app only as a future stub. The active demo flow is the main console at `/`.
