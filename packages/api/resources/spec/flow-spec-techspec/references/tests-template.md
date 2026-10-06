# Test Specification Template

`_tests.md` is the test contract. A behavior without a test ID here is a behavior nobody committed to verifying.

## ID rules
- `UT-NNN` unit, `IT-NNN` integration, `E2E-NNN` end-to-end; zero-padded and sequential per prefix. IDs are permanent; mark a dropped case `(withdrawn)` in place.

## Tiers
- `task-required`: implemented and run by the task that changes the behavior.
- `feature-gate`: runs after the dependent tasks complete.
- `qa-release`: runs during QA or release with real providers, full browsers or accessibility tours.

## Skeleton

```markdown
# Test Specification: [Feature]

## Strategy
- Frameworks and fixtures; fakes only at I/O boundaries.

## Coverage Matrix
| Source | Behavior | Task-required | Feature-gate | QA/release |
|--------|----------|---------------|--------------|------------|

## Unit Tests
- **UT-001** (`task-required`, happy): `Component` — given [input], produces [output].

## Integration Tests
- **IT-001** (`feature-gate`): [wired components] — setup [state]; do [action]; expect [observable result].

## End-to-End Tests
- **E2E-001** (`qa-release`): [entry] → [steps] → [outcome].
```

## Coverage demands
- Every story (PRD route) and every edge case has its own matrix row.
- Every component and interface has unit coverage including error paths.
- Every endpoint or command has cases for its success shape and each documented failure shape.
- Every user journey has at least one start-to-finish case.

## Case-writing rules
- Concrete or nothing: real function, route or command, actual input values, exact expected output or error.
- Tag each unit case: `happy`, `error`, `boundary`, `concurrency`, `idempotency`, `ordering` or `state`.
- One observable behavior per case. Prefer the cheapest tier that proves the risk.
