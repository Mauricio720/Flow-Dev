---
status: completed
title: "Establish the CompozyOS control-plane foundation"
type: infra
complexity: high
---

# Task 01: Establish the CompozyOS control-plane foundation

## Overview

Establish the pinned, server-only CompozyOS control plane that the remaining feature can trust. It supplies fail-closed capability data, opaque credential operations, and truthful host/runtime diagnostics without changing the existing legacy Spec execution path.

<critical>
- ALWAYS READ the PRD, the TechSpec, and their catalogs (`_user_stories.md`, `_tests.md`) before starting
- REFERENCE TECHSPEC for implementation details — do not duplicate here
- FOCUS ON "WHAT" — describe what needs to be accomplished, not how
- MINIMIZE CODE — show code only to illustrate current structure or problem areas
- TESTS REQUIRED — implement every task-required test case assigned in ## Tests
</critical>

<requirements>
- MUST verify the pinned CompozyOS release and OpenAPI identity before capability data can authorize a new flow; timeout, malformed, contradictory, stale, or mismatched data MUST fail closed.
- MUST use the pinned HTTP/UDS control surface for provider probes and model discovery; the deprecated local CLI and workspace MCP relay MUST NOT be compatibility sources.
- MUST project only `available_live` models and their exact advertised reasoning values, with provider default represented explicitly and unsupported effort rejected safely.
- MUST keep credentials, private auth homes, device material, and raw account identity inside a host-only broker that returns only opaque IDs, safe identity, and attempt-scoped grants.
- MUST preserve the legacy environment-backed Spec configuration and dispatch behavior for existing workflows.
</requirements>

## Subtasks

- [x] 1.1 Define typed application contracts for CompozyOS capability results, credential operations, and non-secret readiness states.
- [x] 1.2 Implement release-pinned provider probe and model-catalog adapters over the existing UDS transport conventions.
- [x] 1.3 Implement the host-only credential-broker boundary for safe Codex operation lifecycle and private attempt grants.
- [x] 1.4 Produce an independent readiness projection for application, account, runtime, and host layers.
- [x] 1.5 Map transport and provider failures to bounded domain codes without retaining upstream response bodies.
- [x] 1.6 Add contract and policy tests for expiration, idempotency, live catalog choices, and fail-closed diagnostics.

## Implementation Details

Follow TechSpec sections “System Architecture”, “Core Interfaces”, “Integration Points”, “Config Lifecycle”, and “Safety Invariants”. Keep the existing session-only gateway and global environment route operational for legacy workflows; introduce a separate control adapter rather than expanding browser-visible configuration.

### Relevant Files

- `packages/api/src/application/spec/specPins.ts` — canonical CompozyOS release, agent, and OpenAPI pin.
- `packages/api/src/infra/spec/compozy/compozyTransport.ts` — established HTTP-over-UDS transport and timeout boundary.
- `packages/api/src/infra/spec/compozy/compozyCall.ts` — safe external-call/error handling pattern.
- `packages/api/src/infra/spec/compozy/compozySchemas.ts` — Zod response-contract convention.
- `packages/api/src/infra/spec/compozy/compozyRuntimeGateway.ts` — legacy session adapter that must remain isolated.
- `packages/api/src/infra/spec/specConfigurationProbe.ts` — existing host diagnostic primitives.
- `packages/api/src/infra/spec/specCodexAuth.ts` — private-home ownership and permission boundary.

### Dependent Files

- `packages/api/src/application/software/compozyControlGateway.ts` — new typed control-plane port.
- `packages/api/src/application/software/credentialBroker.ts` — new opaque credential and attempt-grant port.
- `packages/api/src/application/software/readiness.ts` — new safe readiness projection types.
- `packages/api/src/infra/spec/compozy/compozyControlGateway.ts` — pinned provider/catalog implementation and focused helpers.
- `packages/api/src/infra/spec/compozy/credentialBroker.ts` — host-only implementation of private connection state.
- `packages/api/src/infra/spec/compozy/hostReadiness.ts` — non-provisioning host diagnostics.
- `packages/api/src/infra/spec/compozy/*test.ts` — focused gateway and broker tests.

### Related ADRs

- [ADR-003: Connect Codex with ChatGPT in-app without exposing credentials](adrs/adr-003.md) — credential isolation and subscription semantics.
- [ADR-004: Use pinned CompozyOS control contracts and catalog](adrs/adr-004.md) — pinned HTTP/UDS control surface.

## Deliverables

- A release-pinned, fail-closed CompozyOS capability and readiness foundation.
- A host-only opaque credential-broker contract suitable for later Software and task-flow slices.
- Every task-required test case assigned in `## Tests` implemented and passing **(REQUIRED)**.

## Tests

Task-required cases assigned from `_tests.md`, the test contract — read each ID's full definition there before writing tests.

- [x] UT-005, UT-006 — expired and duplicate Codex login completion retain a safe, idempotent connection revision.
- [x] UT-008, UT-009, UT-010 — only live catalog capability and advertised reasoning choices are selectable.
- [x] IT-009 — malformed or contradictory readiness input is unknown/incompatible, never ready.

## Success Criteria

- Every task-required test case implemented and passing.
- Pinned control calls expose only typed, non-secret capability and diagnostic data.
- A stale, malformed, or unavailable capability can never authorize a future action.
- Existing legacy Spec configuration remains behaviorally unchanged.
