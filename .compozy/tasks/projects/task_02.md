---
status: completed
title: Secure GitHub repository authorization and transport
type: backend
complexity: high
---

# Secure GitHub repository authorization and transport

## Overview

Deliver the separate repository OAuth authorization and server-only GitHub integration used to access repositories on behalf of the current person. This isolates broad `repo` credentials from identity login, protects credentials at rest, and provides reliable repository resolution across pagination, renames, transfer, expiry, and external failures.

<critical>
- ALWAYS READ the PRD, the TechSpec, and their catalogs (`_user_stories.md`, `_tests.md`) before starting
- REFERENCE TECHSPEC for implementation details — do not duplicate here
- FOCUS ON "WHAT" — describe what needs to be accomplished, not how
- MINIMIZE CODE — show code only to illustrate current structure or problem areas
- TESTS REQUIRED — implement every task-required test case assigned in ## Tests
</critical>

<requirements>
- MUST use a second OAuth App with `repo offline_access`; the Better Auth identity OAuth App MUST remain limited to identity scopes.
- MUST bind state and PKCE to the valid Flow Dev session, consume state exactly once within ten minutes, and accept only internal return destinations.
- MUST validate the GitHub identity and granted scope before persisting only encrypted credentials for that Flow Dev user.
- MUST keep tokens, authorization codes, callback URLs, and private repository data out of DTOs, browser modules, and logs.
- MUST classify GitHub 401, 403, ambiguous 404, 429, timeout, and 5xx results safely; every resolved repository MUST be checked against its stable ID.
</requirements>

## Subtasks
- [x] 2.1 Define repository identity, credential, OAuth-state, gateway, and named-error contracts in the application layer.
- [x] 2.2 Add encrypted credential and expiring OAuth-state persistence using the foundation migration contract.
- [x] 2.3 Implement secure second-app authorization initiation, callback completion, identity comparison, and safe redirects.
- [x] 2.4 Implement atomic refresh and revocation handling for repository credentials.
- [x] 2.5 Implement GitHub REST and GraphQL repository discovery and stable identity resolution.
- [x] 2.6 Add the server-only HTTP callback routes and configuration validation for repository OAuth.
- [x] 2.7 Test crypto, state single-use, account mismatch, pagination, rate limits, and callback failure behavior.

## Implementation Details

Follow the TechSpec integrations section and ADR-004. The tRPC router does not own OAuth flow or GitHub HTTP construction; route handlers invoke a controller/service boundary and all external HTTP remains in `packages/api/infra`.

### Relevant Files
- `packages/api/src/application/auth/destination.ts` — existing internal-destination validation pattern.
- `packages/api/src/application/auth/oauthPolicy.ts` — identity OAuth policy that must stay separate from repository OAuth.
- `packages/api/src/context.ts` — authenticated principal used to bind authorization state.
- `packages/api/src/infra/database/schema.ts` — schema owner for credential and OAuth-state tables.
- `apps/web/src/app/api/auth/[...all]/route.ts` — existing authentication Route Handler convention.
- `apps/web/src/lib/auth/auth.ts` — Better Auth identity configuration that must not receive repository scope.

### Dependent Files
- `packages/api/src/application/services/projects/projectCatalogService.ts` — creates projects only from gateway-verified repository identities.
- `packages/api/src/application/services/access/projectAccessService.ts` — later consumes the current user's credential and gateway checks.
- `packages/api/src/controllers/projectsController.ts` — later maps GitHub and authorization errors safely.
- `apps/web/src/app/api/github-repositories/connect/route.ts` — repository OAuth initiation Route Handler to create.
- `apps/web/src/app/api/github-repositories/callback/route.ts` — repository OAuth callback Route Handler to create.

### Related ADRs
- [ADR-002: Project membership and GitHub access both govern code use](adrs/adr-002.md) — credentials are personal and never shared through membership.
- [ADR-004: Autorizar repositórios com um segundo aplicativo OAuth GitHub](adrs/adr-004.md) — fixes the authorization design.
- [ADR-006: Resolver estado de conexão por usuário e revalidar ações de repositório](adrs/adr-006.md) — requires safe current-user checks.

## Deliverables

- Server-only GitHub repository gateway with pagination, identity comparison, and classified recoverable failures.
- Encrypted, renewable, per-user repository authorization storage and state/PKCE lifecycle.
- Secure repository OAuth connect and callback HTTP handlers with configuration validation.
- Every task-required test case assigned in `## Tests` implemented and passing **(REQUIRED)**.

## Tests

Task-required cases assigned from `_tests.md`, the test contract — read each ID's full definition there before writing tests.

- [x] UT-018, UT-019, UT-020 — GitHub pagination, identity mismatch, and rate-limit classification.
- [x] UT-021, UT-022, UT-023, UT-024, UT-025 — OAuth identity binding, single-use state, refresh, and revocation behavior.
- [x] UT-026, UT-027 — AES-GCM credential confidentiality and fail-closed decryption.
- [x] UT-045, UT-046 — PKCE/state initiation and invalid-callback behavior.
- [x] IT-056, IT-057, IT-058, IT-070 — connect and callback redirects, encrypted persistence, safe destinations, and origin protection.

### Deferred Gates

- [ ] IT-010, IT-011, IT-014, IT-015, IT-016 (`feature-gate`) — discovery, denial, rate-limit, cancellation, and rename integration.
- [ ] IT-031, IT-033, IT-041, IT-061, IT-062, IT-064, IT-065, IT-067, IT-069 (`feature-gate`) — renewal, race, classified failures, encryption persistence, and public fallback.
- [ ] E2E-003 (`feature-gate`), E2E-008, E2E-009 (`qa-release`) — picker consent and real staging OAuth/transfer journeys.

## Success Criteria

- Every task-required test case implemented and passing.
- Repository OAuth is independent of identity sign-in and credentials are never client-visible.
- A stable GitHub identity is verified before any downstream project operation relies on it.
