# AGENTS.md

## Purpose

These are the working rules for engineers and coding agents contributing to this repository.

## Branching

- Do not commit directly to `main`
- Create a feature branch for every task
- Use pull requests for all merges into shared branches
- Keep branches focused and small enough to review

## Ownership

- Andrija primarily owns backend, schema, simulation, agent integration, and CI work
- Marin primarily owns frontend, UX, visualization, and interaction work
- Shared changes should be coordinated before editing the same files

## Testing

- Write tests regularly, not at the end
- Every backend behavior change should include or update tests
- Every significant frontend flow should have at least smoke-level verification
- If a bug is fixed, add a regression test where practical
- Do not merge code with knowingly broken tests

## CI

- CI must run on every pull request
- CI must fail when any required test fails
- Main branch protection should require passing CI before merge
- Minimum CI scope:
  - install dependencies
  - run frontend checks
  - run backend / agent tests

## Pull Requests

- Keep pull requests small and reviewable
- Include a short summary of what changed
- Include how the change was tested
- Call out risks, gaps, or follow-up work explicitly

## Documentation

- Update docs when product behavior, architecture, or delivery plans change
- Keep documentation specific to the real product
- Avoid speculative or overly detailed text that does not help implementation

## Coding Expectations

- Prefer clear, maintainable code over clever code
- Reuse the existing stack and project conventions
- Keep agent outputs structured enough for the UI to render clearly
- Treat current implementation files as evolving scaffolding when the product model changes

## Safety Rules For Agents

- Do not make destructive changes without explicit approval
- Do not revert another contributor's work unless asked
- Check the working tree before editing
- Leave the repo in a runnable and reviewable state
