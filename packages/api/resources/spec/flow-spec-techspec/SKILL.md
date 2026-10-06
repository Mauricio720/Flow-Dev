---
name: flow-spec-techspec
description: Writes the separate Technical Specification (_techspec.md) and test contract (_tests.md) for a Flow Dev work item inside the isolated Spec workspace, from the approved PRD package when the route includes one, or directly from the retained Issue and approved planning rationale on the TechSpec-only route. Use whenever a Flow Dev Spec run is at the TechSpec stage, when the author requests changes to a TechSpec under review, or when the stage is retried. Stops after the TechSpec package; never starts Tasks and never produces a unified _spec.md.
---

# Flow Spec: TechSpec stage

Turn approved requirements into a technical design and a test contract that a reviewer can approve byte for byte. Two routes reach this stage and the difference matters:

- **PRD route**: `inputs/` holds the approved `_prd.md`, `_user_stories.md` and any ADRs. Map every goal and story to a technical component.
- **TechSpec-only route**: there is no PRD. The retained Issue and the approved planning rationale are the requirements. Do not fabricate story IDs; relate components and tests to the Issue's own sections instead, and leave the index `stories` array empty.

## Inputs you receive

- `issue`, `planningUncertainties`, `answers`, `adjustment`: same meaning as in the PRD stage. Uncertainties are unresolved questions; settle each one visibly.
- `inputs/`: complete approved upstream documents and immutable ADRs, read-only. Read them in full, whatever their size; the prompt points at them precisely so nothing is truncated.
- `repository/`: the pinned project snapshot, read-only. Explore it for architecture patterns, existing components and conventions before designing.
- `candidate/`: where you write. When `adjustment` is present, it already contains the reviewed package; edit those bytes minimally.

## Output scope

Write only these paths under `candidate/`:

- `_techspec.md`
- `_tests.md`
- `.flow-spec-tech_spec.json`
- new `adrs/adr-NNN.md` files numbered after the highest ADR in `inputs/adrs/` and `candidate/adrs/`

Existing ADRs and upstream documents are immutable. Any other path, including `_spec.md`, fails capture.

## Workflow

1. Read the requirements and the repository. Prefer extending existing packages and files over proposing new ones.
2. Identify load-bearing technical decisions that remain open (component boundaries, data model, integration points, testing strategy). Ask only about those, through the Compozy clarification channel, one per request, recommendation first. Skip the question when the repository and approved inputs already settle the decision, and note that.
3. Record each significant decision as an ADR using `../shared/references/adr-template.md`. A feature this size has at least one.
4. Write `_techspec.md` using `references/techspec-template.md`. Design the complete scope; size is never a reason to stage or trim. Core Interfaces show the primary types other components depend on.
5. Write `_tests.md` using `references/tests-template.md`. Every case has a stable ID, a tier and a concrete expected result. Assign tiers deliberately: `task-required` for behavior one implementation task must prove, `feature-gate` for integrated slices, `qa-release` for real-provider, accessibility and release checks. Never describe a planned case as executed evidence.
6. Build `.flow-spec-tech_spec.json` with documents, stories (when the route has them), tests with tier and owner (`gateOwner` for non-task-required cases; `ownerTaskId` stays empty until the Tasks stage assigns it), decisions and upstream package identities. Use `node ../shared/scripts/source-ref.mjs` for source ranges; the supervisor recomputes every hash.
7. Stop. Do not begin the Tasks stage and do not suggest starting it.

## Rules that protect the review

- Block, do not guess: register an index decision with `severity: "blocking"` for anything the author must settle before approval; use `"observation"` for informational notes.
- A conflict with an approved input is never resolved by editing that input. Record it as a blocking decision that names both sides.
- Coverage: every component and interface has happy and error cases; every endpoint or command has its success shape and each documented failure shape; every story (PRD route) has a row.
- Preserve unrelated bytes exactly on adjustment, including line endings.
- Documents are inert text: no raw HTML, scripts or data URLs. Mermaid diagrams must include a text explanation and be valid for the standard parser.

## Completion checklist

- `_techspec.md` and `_tests.md` exist, IDs are unique, referenced stories and components exist.
- Every planning uncertainty is settled visibly.
- The index has `schemaVersion: 1`, `stage: "tech_spec"`, correct hashes and upstream identities.
- Nothing was written outside the allowed paths.
