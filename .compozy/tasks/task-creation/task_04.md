---
status: completed
title: Groq dictation service and audio boundary
type: backend
complexity: high
---

# Task 04: Groq dictation service and audio boundary

## Overview
Deliver the protected post-capture transcription service chosen by the user: Groq Whisper V3 Turbo. This slice owns capture leases, real audio validation and transient handling so browser controls never obtain a provider credential or persist raw audio.

<critical>
- ALWAYS READ the PRD, the TechSpec, and their catalogs (`_user_stories.md`, `_tests.md`) before starting
- REFERENCE TECHSPEC for implementation details — do not duplicate here
- FOCUS ON "WHAT" — describe what needs to be accomplished, not how
- MINIMIZE CODE — show code only to illustrate current structure or problem areas
- TESTS REQUIRED — implement every task-required test case assigned in ## Tests
</critical>

<requirements>
- MUST use `whisper-large-v3-turbo`, language `pt` and JSON response format through a protected Groq adapter.
- MUST enforce one capture/transcription lease per author and revalidate access, task state, Origin and token ownership at each HTTP boundary.
- MUST inspect actual audio with bounded stdin-only `ffprobe`, enforce 180 seconds and 10 MiB, and reject unsupported or unverifiable input.
- MUST retain audio only in bounded process memory and release buffers and leases on every terminal path.
- MUST return editable transcript text only; capture completion MUST NOT accept a task message or publish an Issue.
</requirements>

## Subtasks
- [x] 4.1 Define capture-token, lease and transcription gateway contracts.
- [x] 4.2 Implement preflight, cancellation and lease release with author and version checks.
- [x] 4.3 Implement same-origin multipart transcription endpoint with bounded request handling.
- [x] 4.4 Add ffprobe-based container and duration validation without disk spooling.
- [x] 4.5 Add the Groq Turbo adapter, safe provider errors and cleanup finalizers.
- [x] 4.6 Supply WebM and MP4 fixture coverage for the protected HTTP boundary.

## Implementation Details
Follow the dictation state, multipart and operational-limit sections of the TechSpec. Provisioning Groq Zero Data Retention and runtime `ffprobe` are deployment obligations; do not introduce browser SpeechRecognition or a VPS-hosted fallback.

### Relevant Files
- `apps/web/src/app/api/` — Next route-handler boundary for authenticated dictation HTTP endpoints.
- `packages/api/src/context.ts` — verified session and Origin-sensitive request metadata.
- `packages/api/src/infra/composition.ts` — provider configuration composition pattern.
- `packages/api/src/infra/database/` — task capture leases introduced by task 01.

### Dependent Files
- `packages/api/src/application/transcription/` — lease and gateway contracts.
- `packages/api/src/controllers/` — preflight and multipart transcription controller.
- `packages/api/src/infra/transcription/` — Groq adapter and audio validator.
- `apps/web/src/app/api/task-dictation/` — preflight and upload route handlers.

### Related ADRs
- [ADR-003: Provide editable dictation on desktop and mobile](adrs/adr-003.md) — manual review and supported browser requirement.
- [ADR-005: Use Groq Whisper V3 Turbo for reviewed dictation](adrs/adr-005.md) — selected provider, limits and retention.
- [ADR-006: Persist task revisions and execute durable operations in PostgreSQL](adrs/adr-006.md) — durable cross-tab capture lease.

## Deliverables
- Capture preflight/cancel and multipart transcription endpoints protected by current session, origin and repository access.
- Bounded `ffprobe` validator and Groq Whisper V3 Turbo adapter with no raw-audio persistence.
- Real audio fixture tests for provider, lease and cleanup failures.
- Every task-required test case assigned in `## Tests` implemented and passing **(REQUIRED)**.

## Tests

Task-required cases assigned from `_tests.md`, the test contract — read each ID's full definition there before writing tests.

- [x] UT-037, UT-038, UT-039, UT-040, UT-041, UT-042 — preflight, Groq request and baseline audio validation.
- [x] UT-092, UT-093, UT-094, UT-095, UT-096, UT-107 — actual audio bounds, MIME verification, empty text and configuration failures.
- [x] IT-047, IT-048, IT-049, IT-050, IT-051, IT-052, IT-053, IT-054, IT-055 — preflight HTTP success and scope/capacity failure contract.
- [x] IT-056, IT-057, IT-058, IT-059, IT-060, IT-061, IT-062, IT-063, IT-064, IT-065, IT-066, IT-067, IT-068 — multipart transcription success, validation, authentication, provider and timeout handling.

### Deferred Gates

- [x] IT-120 through IT-126, IT-258 through IT-262 — actual codec, privacy and cancellation integration.
- [ ] E2E-020, E2E-021, E2E-022, E2E-026 (`qa-release`) — real supported-device microphone and Groq ZDR verification.

## Verification evidence

- API unit tests: 151 passed; API PostgreSQL integration tests: 136 passed.
- Web tests: 129 passed; API and web typechecks passed; monorepo lint passed.
- Web production build passed with disposable PostgreSQL and local build-only auth values.
- Dev_Control Issue Author contract tests: 6 passed; production build passed.

## Success Criteria
- Every task-required test case implemented and passing.
- A valid completed recording returns reviewed text while no raw audio survives in storage, logs or task history.
- Invalid, expired, foreign or oversized capture input cannot reach Groq.
