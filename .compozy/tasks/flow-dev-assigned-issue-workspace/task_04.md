---
status: completed
title: User-scoped local companion pairing and project links
type: backend
complexity: critical
---

# User-scoped local companion pairing and project links

## Overview

Build the private user-machine foundation that allows hosted Flow Dev to pair with a developer’s companion through outbound HTTPS and link one verified checkout per project. The host retains only opaque, safe metadata; real paths, credentials, manifests, and raw diagnostics stay on the developer machine.

<critical>
- ALWAYS READ the PRD, the TechSpec, and their catalogs (`_user_stories.md`, `_tests.md`) before starting
- REFERENCE TECHSPEC for implementation details — do not duplicate here
- FOCUS ON "WHAT" — describe what needs to be accomplished, not how
- MINIMIZE CODE — show code only to illustrate current structure or problem areas
- TESTS REQUIRED — implement every task-required test case assigned in ## Tests
</critical>

<requirements>
- MUST pair a machine through a short-lived single-use code and secret over outbound HTTPS, with user-scoped confirmation and revocable machine credentials.
- MUST persist only opaque checkout handles, safe labels, verified repository identity, revisions, capabilities, and readiness on the host; paths, environment values, tokens, and raw logs MUST remain local.
- MUST validate versioned protocol input strictly, bound request bodies, reject browser-cookie auth on connector routes, and return bounded safe errors.
- MUST verify canonical Git roots, accepted remotes, allowlisted roots, link ownership, and compare-and-set revisions before publishing a link.
- MUST retain existing host execution choices while establishing machine-scoped provider/catalog metadata for later local action preparation.
</requirements>

## Subtasks
- [x] 4.1 Add machine, pairing, private-link, and machine-scoped provider persistence with migrations and DAOs.
- [x] 4.2 Implement authenticated browser pairing confirmation, machine listing/revocation, diagnostics, and local-project contracts.
- [x] 4.3 Implement versioned Node HTTPS connector handlers for pairing, exchange, heartbeat, links, polling, and events.
- [x] 4.4 Create the companion CLI pairing, linking, run/status, and unpair lifecycle with a restrictive local registry.
- [x] 4.5 Verify local Git identity/readiness and maintain only opaque host descriptors.
- [x] 4.6 Apply safe rate limits, heartbeat/readiness, request-key, and credential-rotation behavior.
- [x] 4.7 Prove controller, HTTP, CLI, and isolation behavior with real temporary Git roots and bounded fakes.

## Implementation Details

Implement the persistence, pairing, link, protocol, and private registry portions of the TechSpec. Task 05 owns preparation, command execution, locks, native runtime effects, gates, and evidence settlement; do not couple this task to a server filesystem path.

### Relevant Files
- `packages/api/src/infra/database/schema.ts` and `packages/api/src/infra/database/schema/software.ts` — exports and machine-scoped software connection evolution.
- `packages/api/src/application/database/dao/softwareDao.ts` and `packages/api/src/infra/database/dao/software/` — existing DAO/store patterns.
- `packages/api/src/routers/{index,taskFlow}.ts` and `packages/api/src/controllers/` — tRPC controller/router conventions for local machine/project procedures.
- `packages/api/src/cli/` and `packages/api/package.json` — companion CLI entry and package integration.
- `packages/api/src/infra/spec/localProjectAccess.ts` — server-path behavior to replace/deprecate for machine links.
- `apps/web/src/app/api/task-dictation/preflight/route.ts` — thin Node route handler conventions.

### Dependent Files
- `apps/web/src/app/api/local-connector/` — Node HTTPS route handlers for the companion protocol.
- `packages/api/src/cli/localConnector.ts` — public `pair`, `link`, `run`, `status`, and `unpair` entry point.
- `apps/web/src/features/projects/local-project/` — task 03’s private settings UI consumer.
- `packages/api/src/application/services/local-execution/` — task 05 consumes accepted machine/link/protocol contracts.

### Related ADRs
- [ADR-002: Link each user's local project for project-defined execution](adrs/adr-002.md) — per-user checkout and local environment.
- [ADR-004: Connect each developer machine through an outbound HTTPS companion](adrs/adr-004.md) — protocol, CLI, registry, and no-inbound-port decision.
- [ADR-005: Require current structured gate evidence before gated success](adrs/adr-005.md) — safe egress constraint for status/diagnostics.

## Deliverables

- Machine/pairing/link persistence, controller/router contracts, strict connector HTTP handlers, and companion CLI.
- User-private checkout link/readiness/provider metadata with no hosted absolute path or credential leakage.
- Every task-required test case assigned in `## Tests` implemented and passing **(REQUIRED)**.

## Tests

Task-required cases assigned from `_tests.md`.

- [x] `UT-052`–`UT-058`, `UT-079`–`UT-084`, `UT-106`–`UT-120`, `UT-162` — link ownership/identity, pairing, diagnostics, readiness, and preparation descriptors.
- [x] `IT-032`–`IT-039`, `IT-064`, `IT-109`–`IT-128` — pairing/link/provider persistence, safe diagnostics, and browser-authenticated local-machine/local-project APIs.
- [x] `IT-163`–`IT-220` — actual connector HTTP endpoint and public CLI contracts, including safe input/error boundaries.

### Deferred Gates

- [ ] `E2E-009`, `E2E-013`, `E2E-015`, `E2E-018` (`qa-release`) — pairing/link provenance, diagnostics, isolated machines, and local credential isolation.

## Success Criteria

- Every task-required test case implemented and passing.
- A user can pair and link only their own verified checkout, while other users cannot enumerate its path, metadata, or credentials.
- Connector routes accept only scoped machine credentials and never serialize raw local inputs or diagnostics.
- Existing explicit host choices remain available when no local link is usable.
