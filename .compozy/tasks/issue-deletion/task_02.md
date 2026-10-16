---
status: completed
title: GitHub Issue deletion gateway
type: backend
complexity: high
---

# Task 02: GitHub Issue deletion gateway

## Overview

Provide a narrow GitHub contract that identifies the exact Issue and its current deletion permission before mutation. The gateway must classify uncertain provider responses conservatively and prove absence for the frozen repository and Issue without trusting a 404, a null GraphQL node, or a stale board projection.

<critical>
- ALWAYS READ the PRD, the TechSpec, and their catalogs (`_user_stories.md`, `_tests.md`) before starting
- REFERENCE TECHSPEC for implementation details — do not duplicate here
- FOCUS ON "WHAT" — describe what needs to be accomplished, not how
- MINIMIZE CODE — show code only to illustrate current structure or problem areas
- TESTS REQUIRED — implement every task-required test case assigned in ## Tests
</critical>

<requirements>
- 1. The provider contract MUST inspect only GraphQL Issue nodes and expose verified node ID, repository database/node IDs, number, author database ID, and `viewerCanDelete` using the initiating person's token.
- 2. The gateway MUST reject Pull Requests, draft board items, repository transfers, changed repository identity, and changed Issue number without calling `deleteIssue` or choosing a replacement target.
- 3. A repository rename with stable IDs SHOULD update display data without changing the frozen mutation identity.
- 4. GitHub permission denial and organization policy refusal MUST yield a safe denial result; a displayed capability MUST NOT override the actual mutation result.
- 5. Absence MUST require REST `410 Gone` plus proven read access to the same repository; REST `404`, GraphQL null, redirect, auth loss, timeout, and malformed results MUST remain unknown or blocked.
- 6. The imported/Ready projection MUST expose the GitHub author's verified database ID for downstream local authorization without treating assignee or operator as author.
</requirements>

## Subtasks

- [x] 02.1 Define the application-side Issue facts, deletion result, and absence contract.
- [x] 02.2 Extend the imported Issue projection with verified author identity and deletion capability data.
- [x] 02.3 Implement exact-node inspection and stable repository/type/number checks.
- [x] 02.4 Implement user-scoped GraphQL Issue removal and safe provider error classification.
- [x] 02.5 Implement same-repository read-access proof and REST absence read-back.
- [x] 02.6 Add focused transport tests for denial, identity conflict, rename, 410, 404, null, and transfer.

## Implementation Details

Follow `_techspec.md` “Authorization and identity,” “Core Interfaces,” and “Integration Points.” The deletion gateway is separate from the existing issue-creation gateway. Existing generic GitHub request helpers may be reused where they preserve status details; REST `410` needs status-aware handling because the current helper throws on non-2xx responses.

PRD/story coverage: US-002 and US-003 linked deletion, US-005 uncertain provider outcomes, and US-006 GitHub permission.

### Relevant Files

- `packages/api/src/application/github/assignedIssueGateway.ts` — imported board Issue contract currently omits author identity.
- `packages/api/src/infra/github/{assignedIssueQueries,assignedIssueMapper,githubAssignedIssueGateway}.ts` — GraphQL projection, mapping, and fixture pattern.
- `packages/api/src/application/services/assigned-issues/{assignedIssueRules,assignedIssueDiscovery,assignedIssueLookup,assignedIssueContracts}.ts` — Ready/claimed Issue facts consumed downstream.
- `packages/api/src/application/github/repositoryAuthorizationService.ts` — current user token and GitHub identity.
- `packages/api/src/infra/github/{githubGraphql,githubRequest,githubRepositoryGateway,githubIssueGateway}.ts` — existing transport and repository verification patterns.

### Dependent Files

- `packages/api/src/application/github/issueDeletionGateway.ts` — new provider contract for inspection, mutation, and absence proof.
- `packages/api/src/infra/github/githubIssueDeletionGateway.ts` — new provider implementation with safe result classification.
- `packages/api/src/infra/github/githubIssueDeletionGateway.test.ts` — focused provider contract tests.
- `packages/api/src/infra/github/assignedIssueQueries.ts` and `assignedIssueMapper.ts` — imported author projection.

### Related ADRs

- [ADR-001: Delete linked issues from Flow Dev and GitHub](adrs/adr-001.md) — one linked deletion target.
- [ADR-003: Require local authority and confirmed GitHub deletion](adrs/adr-003.md) — user-scoped provider permission.
- [ADR-006: Prove GitHub absence before local issue cleanup](adrs/adr-006.md) — conservative 410 evidence.

## Deliverables

- Application gateway contract, provider implementation, and verified author projection for imported Issues.
- Mocked HTTP/GraphQL tests proving mutation and absence semantics without live GitHub writes.
- Every task-required test case assigned in `## Tests` implemented and passing **(REQUIRED)**.

## Tests

Task-required cases assigned from `_tests.md`, the test contract — read each ID's full definition there before writing tests.

- [x] UT-008 — reject a Pull Request node or board draft without removal.
- [x] UT-009 — reject mismatched frozen and provider repository IDs.
- [x] UT-010 — accept a rename only when stable IDs still match.
- [x] UT-011 — reject `viewerCanDelete=false` before mutation.
- [x] UT-012 — map GraphQL or organization denial safely.
- [x] UT-017 — accept 410 only after same-repository read access.
- [x] UT-018 — keep 404 or null GraphQL node uncertain.
- [x] UT-019 — reject transfer or 301 without retargeting.

## Success Criteria

- Every task-required test case implemented and passing.
- Provider mutation is addressed only by a verified Issue node and current user authorization.
- Only verified 410 evidence can report remote absence.
