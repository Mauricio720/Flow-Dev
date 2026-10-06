# Technical Specification: Continue Published Issues into Planning

## Executive Summary

Extend the existing task in Issues with durable planning while preserving `tasks.status = published`, its author, repository binding, conversation, and confirmed publication snapshot. Add a separate planning status, one typed PlanningDecision per task, and a `plan` operation in the existing PostgreSQL queue. The current tRPC boundary, class controllers, application contracts, Drizzle persistence, worker process, and Issue Composer remain the implementation boundaries. Scope covers the complete [PRD](_prd.md) and all eleven [user stories](_user_stories.md), through final human approval.

The user selected option A on 2026-10-05: this specification defines a new Dev Control planning protocol and makes its external implementation a delivery dependency. The existing Issue Author endpoint does not implement that protocol. Dev Control analyzes the approved publication snapshot; Flow Dev validates and saves its recommendation, manages versioned route selection, and records immutable approval. No downstream agent or GitHub write occurs. This design trades live repository exploration and a provider job subsystem for a bounded snapshot-only analysis through the existing durable worker.

## System Architecture

### Repository grounding and clarification

Inspected the working-tree implementation, including uncommitted task-creation work, rather than assuming earlier specifications were implemented. Relevant existing paths are `packages/api/src/routers/tasks.ts`, `controllers/tasksController.ts`, `controllers/taskWorkerController.ts`, `infra/composition.ts`, `infra/database/schema/tasks/{records,operations,boundaries}.ts`, `infra/database/dao/tasks/taskOperationClaim.ts`, `taskPublicationState.ts`, and `apps/web/src/features/issues/issue-composer/`. The local package manifests provide Next.js 16.3.8, React 19, tRPC 11, Zod 4, Drizzle/PostgreSQL, Vitest, Testing Library, and Playwright. Reuse these installed dependencies; no new runtime library is required.

Read the repository's backend, tRPC, frontend-placement and E2E rules, `apps/web/PRODUCT.md`, `apps/web/DESIGN.md`, and the installed Next.js Server and Client Components guide. Existing product/design statements that publication ends the flow or that only the draft is an artifact container are superseded by this PRD. Existing task routers compose dependencies lazily and map errors in a router helper; new planning procedures use a composed controller facade with error mapping behind the router, following the local skills. Do not refactor unrelated routers.

Decision branches are resolved: external capability/ownership by the user's answer; publication identity, permissions, uncertainties, and finality by ADR-001–004; package placement, storage, worker, and tests by repository patterns; recovery budgets and snapshot-only protocol by the bounded design below. No additional product choice is needed. External deployment is a dependency, not an unresolved choice or permission to substitute fake planning.

### Component overview

Paths below are relative to `packages/api/src/` unless prefixed with `apps/web/`. Proposed files are implementation targets, not claims that they exist.

| ID | Component and ownership | Responsibility and boundary |
| --- | --- | --- |
| C01 | `application/services/tasks/planningContracts.ts`, `planningRules.ts`, `planningLimits.ts` | Domain types, eligibility, route/source rules, payload validation, and explicit limits. Plain domain errors; no transport or ORM imports. |
| C02 | `controllers/taskPlanningController.ts`, `application/services/tasks/planningService.ts` | Authenticate scope through existing repository access, enforce authorship, orchestrate transactions, commands and receipt lookup; map safe errors at the controller boundary. |
| C03 | `application/database/dao/taskPlanningDao.ts`, `infra/database/dao/tasks/drizzleTaskPlanningDao.ts` and focused persistence helpers | Scoped locks, atomic command receipts, one decision, versioned selection and final approval. Controller supplies transaction-scoped DAO to the contextual service. |
| C04 | `application/database/dao/taskPlanningWorkerDao.ts`, `infra/database/dao/tasks/drizzleTaskPlanningWorkerDao.ts` and claim/settlement helpers | Claim, heartbeat, authorization context, snapshot input, fenced settlement, bounded recovery. No generation settlement reuse. |
| C05 | `controllers/taskPlanningWorkerController.ts`, existing `taskWorkerController.ts`, `cli/tasksWorker.ts`, `infra/composition.ts` | HTTP work outside transactions; fair dispatch over generate/publish/plan; existing worker command and two shared slots. |
| C06 | `application/planning/planningGateway.ts`, `infra/planning/devControlPlanningGateway.ts` | New external protocol, server-only credentials, streaming byte cap, timeout, correlation, strict output validation. |
| C07 | `routers/taskPlanning.ts`, `schemas/planning.ts`, `controllers/planningErrorMapper.ts`, existing `trpc.ts` | Thin nested `tasks.planning` procedures; inferred API outputs and safe reason codes. Composition adds a lazy planning-controller accessor without changing other domain wiring. |
| C08 | Existing task DAO/read helpers, `controllers/mappers/taskDtoMapper.ts`, new `planningDtoMapper.ts` | Consistent workspace projection, compact history state, Issue/decision artifact DTOs, permissions and ISO timestamps. |
| C09 | `apps/web/src/features/issues/issue-composer/hooks/usePlanningActions.ts`, `planningCommandState.ts` | Explicit commands, request keys, uncertain submission recovery, dirty/saving state, approval gating. |
| C10 | Existing `workspaceState.ts`, `historyState.ts`, `hooks/useTaskWorkspace.ts`, `hooks/taskReads.ts` | Scope and version guards, bounded polling, authoritative refresh, access-error clearing, independently loaded conversation. |
| C11 | Feature-local `components/PlanningStage.tsx`, `PlanningDecisionView.tsx`, `PlanningRouteSelector.tsx`, `PlanningTimeline.tsx`, `planningCopy.ts` | Structured pt-BR decision, real lifecycle, accessible selection and approval; integrate with `TaskStage`, `Workspace`, and `SessionRail`. |
| C12 | Existing `components/PublishedResult.tsx`, `SourcesPanel.tsx`, `publicationModel.ts` | Separately inspectable Issue snapshot, trusted links, truthful context attribution; raw source only in optional details. |

Keep each new `.ts` file/class within 100 lines and each method within 30 lines by splitting cohesive validation, persistence, and mapping responsibilities. Do not create one service per command or a generic workflow abstraction. Client API types derive from `RouterOutputs`/`RouterInputs` through the type-only package entry. Existing server route entries remain thin; no new menu or route is needed.

### Data flow

```mermaid
sequenceDiagram
    participant U as Author in Issues
    participant A as tRPC / Planning controller
    participant D as PostgreSQL
    participant W as Existing tasks worker
    participant P as Dev Control planning v1
    U->>A: Start (task, request key, expected version)
    A->>D: Lock task; persist plan operation and receipt
    A-->>U: Accepted receipt
    W->>D: Claim with lease and fence
    W->>P: Approved publication snapshot
    P-->>W: Correlated recommendation
    W->>D: Atomically save decision and review state
    U->>A: Read current workspace
    A-->>U: Typed decision and publication
    U->>A: Save route, then approve exact saved version
    A->>D: Freeze selected route; record author and time
    A-->>U: Approved read-only planning
```

### PRD and story traceability

| PRD goal, in original order | Technical realization |
| --- | --- |
| Continue an existing publication | C01/C03/C08/C12; same task and publication attempt, no content migration. |
| Show stage, responsibility, artifact and pending action | C08/C10/C11; separate planning status and timeline. |
| Produce and durably retain recommendation | C04/C05/C06; validated result and atomic settlement. |
| Choose three routes with provenance | C01/C02/C03/C09/C11; selection version and source. |
| Explicit, final approval with uncertainties | C02/C03/C09/C11; exact-review guard and immutable approval. |
| Preserve access and work across interruptions/concurrency | C02–C10; scope checks, receipts, fencing, versions. |
| Separate approval from execution | C02/C05/C06/C11; no route dispatcher or GitHub mutation dependency. |

| Story | Owning components | Technical behavior |
| --- | --- | --- |
| US-001 | C01/C08/C11/C12 | Derive awaiting planning for new/historical confirmed snapshots. |
| US-002 | C02–C07 | Explicit persisted request, snapshot analysis, atomic result. |
| US-003 | C04/C05/C08/C10 | Browser-independent recovery and monotonic scoped reads. |
| US-004 | C01–C07/C09 | Bounded recovery followed by explicit, current-failure retry. |
| US-005 | C01/C06/C11 | Strict assessment schema and safe Human View. |
| US-006 | C01–C03/C09/C11 | Versioned saved route independent of recommendation. |
| US-007 | C02/C03/C09/C11 | Exact saved decision approval and finality. |
| US-008 | C08/C10/C11 | Compact history state and actual planning milestones. |
| US-009 | C08/C10/C12 | Independent artifacts/conversation and immutable snapshot. |
| US-010 | C02/C07–C11 | Personal repository access, shared reads, author-only writes. |
| US-011 | C02/C07–C11 | Administrative project visibility with the same repository and author checks. |

## Implementation Design

### Core interfaces

These primary TypeScript contracts define the boundary. Persisted times become ISO strings in DTOs. API consumers infer these types; they do not redeclare them.

```ts
type PlanningRoute = "direct_execution" | "tech_spec" | "prd";
type PlanningStatus = "awaiting" | "in_progress" | "failed" | "review" | "approved";
type PlanningAssessment = {
  recommendedRoute: PlanningRoute;
  complexity: "low" | "medium" | "high";
  summary: string;
  reasons: string[];
  uncertainties: string[];
};
type PlanningDecision = PlanningAssessment & {
  id: string; taskId: string; publicationAttemptId: string;
  operationId: string; executionId: string; version: number;
  selectedRoute: PlanningRoute; decisionSource: "AI" | "HUMAN_OVERRIDE";
  status: "review" | "approved"; createdAt: string;
  approvedByUserId: string | null; approvedAt: string | null;
};
```

```ts
type PlanningCommand = {
  projectId: string; taskId: string; requestKey: string; expectedVersion: number;
};
type PlanningSelection = PlanningCommand & {
  decisionId: string; expectedDecisionVersion: number; selectedRoute: PlanningRoute;
};
type PlanningReceipt = {
  taskId: string; operationId: string | null; decisionId: string | null;
  version: number; decisionVersion: number | null;
};
interface PlanningGateway {
  analyze(input: PlanningInput, signal: AbortSignal): Promise<PlanningEnvelope>;
}
```

`PlanningInput` and `PlanningEnvelope` are defined field-for-field in Integration Points. Approval takes `PlanningSelection` with `selectedRoute` renamed `reviewedRoute`. Retry adds `failedOperationId` to `PlanningCommand`. Actor user/session IDs always come from verified context, never input.

```ts
interface TaskPlanningDao {
  lockScoped(target: TaskTarget): Promise<PlanningRecord>;
  receipt(key: PlanningReceiptKey): Promise<StoredPlanningReceipt | null>;
  start(input: StartPlanningWrite): Promise<PlanningReceipt>;
  selectRoute(input: SelectPlanningWrite): Promise<PlanningReceipt>;
  approve(input: ApprovePlanningWrite): Promise<PlanningReceipt>;
}
interface TaskPlanningWorkerDao {
  claim(workerId: string): Promise<PlanningClaim | null>;
  heartbeat(claim: PlanningClaim): Promise<void>;
  input(claim: PlanningClaim): Promise<PlanningInput>;
  complete(input: PlanningSettlement): Promise<void>;
  fail(input: PlanningFailure): Promise<void>;
}
```

The DAO method parameter types bundle the already locked task, authenticated actor, validated command, and payload hash. `PlanningRecord` contains the task, confirmed publication attempt, latest planning operation, and optional decision. `PlanningClaim` contains task/project/author/session/operation/execution IDs, fence, worker ID and lease deadline; it contains no context capability. Settlement bundles claim and validated envelope. Failure bundles claim and a safe reason. Transactions use a small constructor-injected runner and DAO factory; the production factory belongs in `infra/composition.ts`. Only transaction-bound DAOs write command state. Worker DAO methods own short atomic claim/settlement transactions; the worker controller orchestrates authorization and HTTP between them.

### Data models

| Storage | Additions and invariants |
| --- | --- |
| `tasks` | Nullable `planning_status` constrained to `in_progress`, `failed`, `review`, `approved`; nullable `planning_operation_id` retaining the latest logical planning operation. Any nonnull planning status requires `status = published`. Composite `(id, planning_operation_id)` FK references the existing `(task_id,id)` operation unique index. Existing `active_operation_id` tracks active planning and is cleared on terminal settlement. |
| `task_operations` | Add `plan` to the kind check. Add nullable `publication_attempt_id` and `input_hash`; require both for `plan`, with a same-task composite FK to publication attempts. Reuse state, session, execution ID, fence, attempts, scheduling, lease, safe error, and result fields. Existing partial unique active-operation index covers planning automatically. Add `(task_id,kind,created_at,id)` for retained attempt inspection. |
| `task_publication_attempts` | Add unique `(task_id,id)` for composite FKs. Keep the created snapshot, verified receipt, immutable repository IDs, Issue ID/number/URL and content in this existing table. No planning code updates it. |
| `task_planning_decisions` | UUID `id`, unique UUID `task_id`, UUID `publication_attempt_id`, unique UUID `operation_id`, UUID `execution_id`, selection `version` integer default 1, route enums, complexity enum, summary text, JSONB string arrays `reasons` and `uncertainties`, source enum, status enum, `created_at` timestamptz, nullable approver UUID FK and `approved_at` timestamptz. Same-task composite FKs reference publication and producing operation. |
| `task_command_receipts` | Reuse nullable operation ID and JSON result; new actions `planning.start`, `planning.retry`, `planning.selectRoute`, `planning.approve`. Keep unique actor/project/action/request-key scope. No additional receipt table. Typed planning helpers validate stored results rather than casting an authoring receipt. |

The decision table checks valid enums, positive version, trimmed nonempty summary, reasons array length 1–20, uncertainties array length 0–20, coherent selection source (`AI` iff equal routes), and approval fields both present iff approved. Application validation additionally checks each string and content budget. Database immutability trigger forbids changing a review's identity, association, original assessment, or creation time; forbids updates/deletes of approved decisions; allows only selection/version/source updates or a coherent review-to-approved update. Approval transaction verifies approver equals task author. Transaction and FK checks require the referenced publication outcome `created` and the producing operation kind `plan`; a foreign key alone cannot enforce those predicates. The API has no delete or reopen operation.

Keep normalized identity in existing tables. Decision DTOs may compose Issue information for display but do not create a second canonical repository/Issue identity. `task_operations.result` stores `{protocolVersion:1, decisionId}` on success, not another copy of the assessment or raw provider body. Failed operations retain a safe code. The decision stores the successful execution ID even if an earlier claim was superseded. Preserve command receipts and all attempts for the task lifetime in this delivery.

#### State projection and eligibility

`task.status` still protects finalized authoring. `planning.status` is null for nonpublished tasks; for published tasks with a null stored planning status, project `awaiting`. Return `eligibility: {canStart, reason}` independently: require a created publication for the same task/repository IDs, a nonempty Issue ID, positive Issue number, nonempty URL, nonblank title/body, and supported payload size. A missing required snapshot or identity returns `publication_required` or `planning_input_limit`; never regenerate content from the current draft or fetch a live Issue as a replacement.

A nonempty but untrusted retained URL is not a trusted link. Stable repository/Issue IDs remain the analysis identity; the planning provider receives no Issue URL. `publishedIssueUrl` suppresses a URL whose host/path/number does not match the retained publication identity. Explain the discrepancy without rewriting it. Repository rename does not rewrite the original snapshot. Current personal access is checked against stable repository IDs. Archived repositories and disabled Issue creation do not prevent this read-only analysis when personal read access remains valid.

| Current planning state | Command/event | Result |
| --- | --- | --- |
| awaiting, eligible | Start | in_progress; queue one `plan` operation and store receipt. |
| in_progress | Worker claim/reclaim | in_progress with queued/running detail; no decision artifact yet. |
| in_progress | Valid fenced settlement | review; save one decision, default selection to recommendation and source to AI. |
| in_progress | Terminal failure/deadline | failed; keep publication, clear active operation, retain safe reason. |
| failed | Retry current failed operation | in_progress with a new logical operation and request key. |
| review | Save changed route | review; increment selection version and task version. |
| review | Approve matching saved review | approved; freeze selection version, set approver/time, increment task version. |
| approved | Exact repeated approval | Return original approval; no version/time change. |

Start during running returns `operation_active` for a different key; start during review/approved returns `planning_exists`; start during failure returns `planning_retry_required`. Retry during running returns `operation_active`; retry without the latest failed operation returns `planning_not_failed`; retry after review/approval returns `planning_exists`. Same-key accepted commands replay their receipt before evaluating these state transitions.

### Transaction, concurrency and idempotency rules

1. Each protected command checks current project and personal repository read access, stable binding, and author before receipt lookup. `submission` is also author-only. Revoked access cannot retrieve an old protected receipt.
2. Lock the task by project/task scope, then its relevant operation/decision rows. Recheck author under the lock. Find a receipt using actor/project/action/request key. Hash a fixed-order object containing every command field, including task/version/decision/route. Same key and same hash returns the original receipt; a different hash returns `request_key_reused`. Evaluate configuration and admission only for a new acceptance, so a later configuration outage cannot hide an already accepted receipt.
3. For a new command, validate expected task version and the state under this lock. A stale selection/approval returns `planning_conflict` with safe refresh guidance, never a silently rebased mutation. Route selection also compares decision ID/version; approval compares ID/version/reviewed route. Wrong decision IDs return `decision_unavailable` without another item's information.
4. Persist the state change and receipt in one transaction. Rollback exposes neither accepted work nor approval. Concurrent equal keys are serialized by the task lock; cross-task reuse is caught by the unique receipt constraint and maps to `request_key_reused`, not a driver error.
5. Selecting the already saved route with the current versions is a no-op receipt: no version bump. Changing away and back increments the selection version twice, restoring source `AI`; an old review cannot approve just because the route string matches again.
6. Repeated approval, even with a fresh key, returns the existing result only when decision ID, frozen selection version, reviewed route, and authenticated author match. This equivalence check precedes the now-stale task-version check. A different selection version or route conflicts. Approved selections cannot change through any API or persistence update.
7. Every user-visible planning transition, including queued-to-running and automatic requeue, increments `tasks.version` and updates `updated_at`. Heartbeats do not. Settlement requires active operation ID, current execution ID, matching fence/owner, unexpired lease and a still-in-progress task. A failed/obsolete callback cannot mutate even an error code. Lock and recheck inside the settlement transaction.
8. `tasks.byId` reads task, planning operation, publication and decision in one read-only repeatable-read transaction; then maps one coherent DTO. Existing revision/proposal reads must belong to that same snapshot. This avoids a newer decision paired with an older version. List pages expose compact status from task rows, without fetching decision bodies or conversations for every item.

### API endpoints

Use the existing `/api/trpc/[trpc]` route. Queries use GET and mutations POST. Successful tRPC responses use HTTP 200; starting work returns an accepted receipt, not a falsely completed decision or a new REST 202 route. Existing no-store and same-origin policy applies. Router handlers perform input validation, then exactly one controller call.

| Procedure | Input | Success shape |
| --- | --- | --- |
| `tasks.byId` (extended query) | Existing `{projectId,taskId}` | Existing detail plus `planning` with status, eligibility, latest operation summary, decision/null, and author-specific action permissions. Include task version. |
| `tasks.list` (extended query) | Existing scoped cursor/search/limit | Existing pagination plus nullable `planningStatus` in each compact task summary. Published/null means awaiting; detailed eligibility is checked on open. |
| `tasks.planning.start` | `PlanningCommand` | `PlanningReceipt`, nonnull operation ID, null decision ID. |
| `tasks.planning.retry` | Command plus `failedOperationId` UUID | Receipt for the one new accepted operation. |
| `tasks.planning.selectRoute` | `PlanningSelection` | Receipt with current decision and selection version; status remains review. |
| `tasks.planning.approve` | Command plus decision ID, expected decision version, reviewed route | Receipt for the frozen approved selection; subsequent byId returns approver/time. |
| `tasks.planning.submission` (query) | `{projectId,taskId,action,requestKey}`; action is one of the four planning action names | `{status:"accepted",receipt}` or `{status:"not_accepted"}`. Task scope must match the receipt. Observation creates no receipt or operation. |

All IDs/request keys are UUIDs, versions are positive safe integers, route enums are exact, and schemas reject unknown fields. The browser cannot supply publication content, actor, execution, approval timestamp or approval status. Planning reads provide no capability/token, raw provider errors, arbitrary provider metadata or operational logs. Latest operation summary exposes only ID, queued/running/failed/succeeded state, creation time, safe reason and retry time when applicable. Human attribution comes from stored user identity, not the provider.

#### Error contract

Extend `TaskErrorReason` and its formatter-compatible mapping, with a planning-specific mapper behind C02. Existing protected procedures retain session behavior. Below controllers, errors remain domain errors. Unknown exceptions map to `INTERNAL_SERVER_ERROR / service_unavailable`; preserve causes only in server diagnostics.

| Applies to | tRPC code / unbatched HTTP | Reasons or shape |
| --- | --- | --- |
| All protected reads/actions | UNAUTHORIZED / 401 | `session_required`. |
| All scoped reads/actions | NOT_FOUND / 404 | `project_unavailable`, `task_unavailable`; same safe unavailable text. |
| All schema inputs | BAD_REQUEST / 400 | Zod `data.zodError`; `invalid_input` or `invalid_request_key` where applicable. |
| All planning mutations and submission | FORBIDDEN / 403 | `author_required`; local revocation `access_revoked`. |
| Reads and commands requiring repository access | PRECONDITION_FAILED / 412 | `repository_authorization_needed`, `destination_unavailable`, `identity_mismatch`, `issue_permission_denied` under existing access mapping. |
| Reads/commands during provider access limit | TOO_MANY_REQUESTS / 429 | `provider_rate_limited`, with existing `retryAfterSeconds`. |
| Start/retry admission | TOO_MANY_REQUESTS / 429 | `planning_capacity`, retryAfterSeconds 30. |
| Start/retry eligibility | PRECONDITION_FAILED / 412 | `publication_required`; BAD_REQUEST / 400 for `planning_input_limit`. |
| All mutations | CONFLICT / 409 | `planning_conflict`, `request_key_reused`, `operation_active` as applicable. |
| Start/retry state | CONFLICT / 409 | `planning_exists`, `planning_retry_required`, `planning_not_failed`. |
| Selection/approval before review or after finality | CONFLICT / 409 | `planning_not_ready`, `planning_approved` (selection); `planning_conflict` for mismatched final approval. |
| Selection/approval wrong decision | NOT_FOUND / 404 | `decision_unavailable`. |
| Reads of corrupt persisted state | INTERNAL_SERVER_ERROR / 500 | `invalid_stored_content`; do not fabricate an empty review. |
| Missing provider configuration or unknown persistence failure | INTERNAL_SERVER_ERROR / 500 | `planning_unconfigured` on start/retry before acceptance; `service_unavailable` elsewhere. |

Batched tRPC transport keeps its existing envelope/status behavior; clients use `error.data.code/reason` rather than assuming a single HTTP status. Worker failures are saved outcomes, not late HTTP errors on a previously accepted browser command: `planning_timeout`, `planning_rate_limited`, `planning_provider_unavailable`, `planning_invalid_output`, `planning_execution_mismatch`, `planning_access_revoked`, `planning_input_limit`, `planning_deadline`, `planning_unconfigured`. UI copy identifies Dev Control separately from GitHub and Issue Author. Raw remote response text never becomes a reason/message.

### Workspace behavior

Keep existing `/projects/[projectId]/issues/[taskId]` navigation and feature ownership. For a published task, render a compact lifecycle/current-action region, the PlanningStage, the separately identifiable Issue snapshot, and accessible conversation details. A named conversation section may collapse, but its messages/revisions remain accessible. Do not require all messages to load before showing the artifacts or planning actions. Extend `taskReads` to refresh detail independently and retain already loaded pages; planning-only version changes must not refetch the entire conversation. Initial detail remains usable if the separate conversation request fails, with a conversation-specific recovery message.

PlanningDecisionView uses named fields for Dev Control, Baixa/Média/Alta, summary, original recommendation, saved selection, recommendation reasons, uncertainties and review/approval. Render provider strings as escaped text with normal wrapping, never raw HTML or active Markdown links. Route labels are exactly “Execução direta”, “Tech Spec”, “PRD”; each explains that the next activity has not started. Show “Nenhuma pendência informada” for an empty uncertainties array. Reported uncertainties remain visible after approval; add no mandatory acknowledgement. An override labels rationale as belonging to the original recommendation.

“Alterar rota” opens an accessible, labeled three-option radio group with explicit save and cancel. Its unsaved choice is distinct from the saved route. “Aprovar planejamento” is disabled while dirty, saving, uncertain, stale, or without permission. Saving does not approve. After a conflict, refresh and require a new explicit review action; do not automatically retry a route/approval against the new version. Approval success shows author/time and recorded next route with no working-looking execute button. Readers see author identity and read-only explanation; hiding controls complements server enforcement.

Hold a request key for the exact command until its outcome is known. Store only the pending command's IDs, versions, action, and route in tab-scoped session storage; do not store snapshots or credentials. After a lost response, query `submission` and refresh byId before offering another attempt. A `not_accepted` read can race an uncommitted write: resend only the exact same key/payload if needed; never infer permission to create a fresh request key from that result alone. On a new tab without pending metadata, refresh authoritative state first; optimistic task version and unique active-operation constraints prevent duplicate acceptance. Returning after access restoration never resubmits automatically.

Poll visible in-progress work every 2 seconds and other published planning states every 15 seconds, including approved state for protected-access refresh. Do not overlap reads; refresh on focus/online. On 429, use `retryAfterSeconds`; otherwise back off transient failures to 30 seconds and expose manual refresh. Ignore responses whose scope changed or whose task version is lower than the latest confirmed version; apply the same rule to history observations. Clear protected snapshots on session/access failures, stop polling until access recovery, and use existing sign-in/repository authorization flows. A transient network/500 failure retains a clearly labeled last confirmed view, never a false empty decision. Unknown lifecycle values render a refresh-required state with actions disabled.

PlanningTimeline shows intention/Issue Author, actual publication, and planning only. Queued/running/review/failed/approved have text, attribution and appropriate pending action; produced recommendation and human approval are separate facts. No fake tool rows, progress percentages, duration, future agent or artifact appear. SourcesPanel can retain actual Issue Author evidence under its own attribution; planning v1 identifies only the approved publication snapshot as its basis. `PublishedResult` keeps a rendered snapshot and collapses raw Markdown into labeled optional details. Use existing 40px action controls, tokens, focus ring, dark-mode variables, responsive drawers, `role=status` announcements, and reduced-motion behavior. Extend DESIGN/PRODUCT during implementation to document the second typed artifact without inventing a palette or new navigation system.

## Integration Points

### Dev Control planning v1 — new external deliverable

Required endpoint: `POST /flow-dev/planning/v1`. Server-only `PLANNING_BASE_URL` and `PLANNING_API_KEY`; HTTPS outside loopback test/development. Send `Authorization: Bearer …`, `Content-Type: application/json`, and `Idempotency-Key: <operationId>`. Reject redirects. Missing configuration fails start/retry before enqueue; if configuration disappears after acceptance, save a recoverable `planning_unconfigured` failure. The service key never authorizes a Flow Dev user's repository access.

Request JSON fields, all required:

| Field | Contract |
| --- | --- |
| `protocolVersion` | Literal `1`. |
| `operationId`, `executionId`, `taskId` | UUIDs from Flow Dev. Operation is stable across automatic recovery; execution changes on each claim. |
| `inputHash` | Lowercase SHA-256 hex of compact `JSON.stringify` UTF-8 encoding of the fixed-order object `{taskId,publication}` below: no whitespace, no Unicode normalization, and no optional ASCII escaping of Unicode. Execution/operation IDs are excluded from the content hash. |
| `publication` | Fixed-order object `{attemptId,repositoryId,repositoryNodeId,issueId,issueNumber,title,bodyMarkdown}`; stable IDs are strings, attemptId UUID, issueNumber positive integer, title/body are exact retained strings. No URL, live Issue body, arbitrary conversation, token or tool capability. |

Successful HTTP 200 response is the strict object `{protocolVersion:1,operationId,executionId,taskId,inputHash,result}`. Correlation must exactly match the current request. `result` is the strict PlanningAssessment schema from Core Interfaces. Dev Control cannot choose decision ID, selected route, source, approval identity/time or lifecycle status. Unknown enum values, missing fields, extra fields, empty rationale, fabricated activity fields, wrong correlation, invalid JSON or excessive bytes reject the entire output. There is no `needs_clarification` branch; missing knowledge belongs in uncertainties. Invalid output never defaults to a route.

Provider deduplication scope is its authenticated Flow Dev tenant plus operation ID. Same ID/hash must join an in-flight computation or return the saved assessment; a different hash returns HTTP 409. Replays echo the caller's current execution ID while returning the identical assessment. Persist the completed result for at least 7 days, well beyond Flow Dev's 15-minute operation deadline. Transport disconnect must not create a new logical provider job. HTTP 409/422 are terminal protocol/input failures; HTTP 401/403 are configuration failures; HTTP 429 honors a bounded Retry-After; network errors, HTTP 408/5xx and timeout are transient. All non-200 bodies are ignored except a numeric Retry-After header. Map to safe local reasons, not provider text.

Dev Control must treat the supplied Issue text as untrusted data, request structured analysis, and validate its own response. Its prompt requires reasons that explain the proposed next activity using the snapshot, and uncertainties for missing information; placeholders and unsupported claims of repository inspection are unacceptable. Structural validation proves shape and bounds, not semantic usefulness, so release includes human assessment of real output against the source snapshot. It may use its internal model but performs no repository reads or external writes under this protocol. The entire analysis is derived from the snapshot. A real staging acceptance run must prove schema, replay identity, concurrent deduplication, correlation, timeouts and absence of route/GitHub side effects. The Dev Control implementation/deployment owner is the owner of that service; assigning an individual and release coordination are operational dependencies, not additional product decisions. No external source code was inspected or modified here.

### Limits, worker recovery, and performance

These are explicit engineering budgets for the initial delivery, not measured production capacity:

| Concern | Budget / behavior |
| --- | --- |
| Request JSON | At most 256 KiB UTF-8 including envelope; exact boundary accepted. Title 1–256 code points; body 1–65,536 code points. Validate nonblank strings and byte budget without truncation. |
| Response JSON | Stream-read cap 256 KiB; cancel body immediately above it. |
| Assessment | Summary 1–4,000 code points; reasons 1–20 and uncertainties 0–20; each entry 1–2,000 code points after nonblank validation. Preserve accepted text; no numeric complexity score or deterministic route mapping. |
| Worker HTTP | 240-second absolute request deadline including body read; provider expected to finish within 220 seconds. Abort on lease loss/shutdown. |
| Durable claim | 60-second lease, 15-second heartbeat, fresh execution ID and incremented fence; claim checks state and current pointer under task-then-operation locks using SKIP LOCKED. |
| Recovery | At most 3 dispatches for one logical operation; waits 5 seconds then 15 seconds before transient retry. Lease-expiry recovery counts as another dispatch. Rate-limit wait uses Retry-After clamped to 5–60 seconds. |
| Absolute operation deadline | 15 minutes from acceptance, including queue time. Do not start a 240-second dispatch when less than that budget remains. Worker sweeps expired queued/running planning operations to `planning_deadline` under a fence; database outage delays this until recovery. |
| Capacity | Existing 2 slots shared across all kinds per process, 5-second idle polling. Deploy one configured worker process initially. Round-robin kind selection falls through idle kinds, preventing planning from starving publication/generation. |
| Admission | At most 5 active planning operations per author and 100 globally. Under a transaction-level planning-admission lock, count queued/running plan rows before insert; excess rejects with `planning_capacity`/30 seconds. Receipt replay is exempt from new admission counting. |
| Reads | Existing list limits/cursors retained; one selected decision body only. Target local DB projection p95 below 200ms at 10,000 tasks and 20 concurrent readers; provider authorization latency measured separately. End-to-end start acknowledgement target below 2 seconds when personal-access provider is healthy. |

Authorization is rechecked immediately before each provider dispatch using the operation's author and initiating session, current active account/project access and personal repository read access; compare repository IDs to the retained binding. Reuse the existing session-active persistence pattern. An expired/revoked session before dispatch saves `planning_access_revoked`; restored access allows an explicit retry with a new session. Browser closure alone does not revoke the accepted session. A response from work already dispatched may be retained locally if its fence remains current; subsequent reads/actions still require current access. This preserves accepted work without disclosing it to a revoked browser. No token reaches Dev Control.

Transient failure requeues the same logical operation only while both attempt and deadline budgets allow; invalid output/correlation, missing configuration and revoked access fail immediately. Final failure is established by durable fencing, even if an obsolete remote computation later finishes. Thus no special publication-style uncertain state is needed for side-effect-free planning. Explicit retry creates a new operation only after the old one is durably failed. Automatic recovery never replaces a saved decision. A DB error while saving a received result leaves the operation recoverable; do not report review or discard work by pretending failure was saved. Reclaim replays the same provider logical request and commits once.

Existing `tasks:worker` remains the only CLI. Do not introduce an independent unbounded planning loop. Preserve publication's stricter uncertain-write reconciliation and generation's existing settlement behavior. A per-slot kind cursor prevents starvation. New planning factories split out of `infra/composition.ts` if needed for code-size limits without relocating unrelated services.

## Impact Analysis

| Component | Impact type | Description and risk | Required action |
| --- | --- | --- | --- |
| Task/publication schemas and migrations | Modified/new | High: association and immutability invariants. | Generate additive migration, constraints and trigger; preserve all publication rows. |
| Existing task commands | Compatibility | High: published authoring must stay frozen. | Keep published guard; regression-test send/save/generation/publication behavior through planning. |
| Worker and composition | Modified | High: scheduling, fences, retries across kinds. | Add planning handler and fair scheduling; isolate settlement and share slot cap. |
| Dev Control | External new capability | Blocking: no existing verified planning endpoint. | Implement protocol and satisfy live staging gate before release. |
| tRPC contract and error formatter | Modified/new | Medium: new actions and safe reasons. | Add nested router, inferred outputs and guard registrations; preserve type-only client entry. |
| Workspace readers and polling | Modified | High: stale data, access exposure, history races. | Consistent read, version guards, access clearing and bounded polling. |
| PublishedResult and timeline | Modified/new | Medium: preserve snapshot and readable planning. | Structured sections, optional raw detail, truthful lifecycle. |
| PRODUCT/DESIGN | Modified during implementation | Low: current publication-only assumptions conflict. | Document the continuation and artifact containers with existing tokens. |
| Test/migration harness | Modified | Medium: hard-coded migrations, missing provider fixtures. | Register migration, add I/O fixtures, real-provider gate and scoped E2E. |

## Testing Approach

The complete cases and matrix are in [_tests.md](_tests.md). Use Vitest for pure rules, controller behavior, gateway fetch boundaries, and Testing Library components/hooks. Use real PostgreSQL transactions and the actual controller/service/DAO wiring for uniqueness, constraints, row locks, concurrent commands, receipt recovery and fenced settlement. Fake only external I/O (GitHub authorization, Dev Control HTTP), clock and browser transport in unit tests; do not mock PlanningService or DAO internals to claim integration coverage.

Existing API scripts: `pnpm --filter @flow-dev/api test` and `pnpm --filter @flow-dev/api test:integration`; frontend: `pnpm --filter web test`; E2E: `pnpm --filter web test:e2e`. Integration needs `TEST_DATABASE_URL` pointing to disposable PostgreSQL with database creation permissions. E2E uses existing `E2E_DATABASE_URL`, `E2E_AUTH_SECRET`, `E2E_BASE_URL` fixture patterns, an isolated app and worker, and deterministic local HTTP provider fixtures. E2E journeys use the UI and accessible locators; seed only their independent starting state. No production credentials/data. Missing environments are reported as not run, never passing.

Task-required cases are narrow rule, component, contract and PostgreSQL checks. Feature-gate runs the affected full journey, worker-restart tests, real staging Dev Control contract and regression gates. QA/release adds cross-browser, narrow viewport, keyboard/screen-reader, reduced-motion and operational load checks. Chromium is currently configured; additional browser projects are a QA harness change and must be explicitly configured before that matrix runs. Final implementation checks include `pnpm lint`, `pnpm typecheck`, `pnpm build`; this document-writing task does not claim those implementation checks have run.

## Development Sequencing

### Build order

1. Freeze protocol/fixtures and arrange Dev Control ownership using ADR-006; implement the external capability in parallel with local foundations, with contract compatibility required before release.
2. Add domain contracts/validators and additive migration with database constraints, immutable decision guard and harness registration.
3. Implement command transactions, authorization/error mapping and nested tRPC router with atomic receipt recovery.
4. Add the planning HTTP gateway, worker DAO/handler, deadline sweep, fair scheduler and production composition.
5. Extend consistent task reads and compact history projection; verify new and historical publications and access semantics.
6. Add feature-local actions, monotonic polling, lifecycle, Human View, route selector and artifact details; update PRODUCT/DESIGN within the implementation.
7. Execute the feature/test gates, real Dev Control staging contract, and QA checks before enabling the complete journey in production.

This is dependency order for one complete feature, not a staged scope reduction. `cy-create-tasks` assigns concrete test IDs and implementation ownership later.

### Technical dependencies and rollout

Required: PostgreSQL migration, compatible web/API and worker deployment, configured planning service key/URL, reachable real Dev Control endpoint and operational owner. No migration should make network calls or synthesize decisions. Generate the next migration number from the actual Drizzle journal at implementation time; do not assume the currently last `0011` remains last.

Apply additive DB changes first, deploy the compatible worker, deploy the API/UI, then expose configured planning service access after the staging contract passes. Old workers ignore `plan` because their claim filters explicitly select generation/publication. Stop old workers as part of rollout to guarantee bounded recovery and scheduling. Old clients still see `published` and cannot edit the snapshot. Do not roll back the schema or delete approved decisions; disable new starts through configuration if needed, retain reads/review/approval and let compatible workers finish or durably fail accepted operations. Returning to code that does not expose planning hides functionality but must never mutate its stored artifacts.

## Monitoring and Observability

Emit structured safe events `planning.accepted`, `planning.claimed`, `planning.requeued`, `planning.failed`, `planning.saved`, `planning.route_saved`, `planning.approved`, `planning.stale_result`, and `planning.command_replayed`. Fields: task/operation/execution IDs, fence, attempt number, task/decision versions, safe reason, queue age, elapsed milliseconds, and request correlation. Never log snapshot/body, provider response, service key, capability, GitHub token or full session ID. Events follow successful commits; log failures separately without asserting an unsaved outcome.

Use existing process logging; do not introduce a telemetry package. Derive counts/latency and queue age from these events and persisted operations. Operator thresholds: oldest eligible queued item above 60 seconds for 5 minutes indicates worker/capacity trouble; a plan active past 15 minutes plus one 5-second sweep interval indicates recovery trouble; five consecutive provider authentication/protocol failures indicates deployment mismatch; failed heartbeat or stale-result events trigger investigation if sustained. Alert the existing service operator through the deployment's normal monitoring configuration; this specification does not assume an alerting service exists. Staging release must include a restart/queue-drain exercise and document actual observed latency against the proposed budgets.

## Technical Considerations

### Key decisions

- Add planning beside immutable publication rather than rewriting authoring status (ADR-005); this requires explicit lifecycle projection in old status consumers.
- Analyze the exact retained snapshot through a dedicated versioned provider contract (ADR-006); no live synchronization, fabricated sources, or dependency on an unverified endpoint.
- Use row locks, scoped receipts, selection versions and exact-route approval (ADR-007); conflicts require another review instead of last-write-wins.
- Keep one current decision and no generic artifact engine; existing publication attempts already represent Issue artifacts.
- Keep polling and feature-local hooks; no global client store or streaming infrastructure is required for this bounded workload.

### Known risks

- External implementation and seven-day replay persistence remain unverified until the staging gate. Local tests cannot establish external readiness.
- Snapshot analysis can legitimately report uncertainty where code exploration would help; present that limitation through truthful sources and retained uncertainties, not invented activity.
- Long planning calls share capacity with existing operations; admission limits, hard deadlines and fair kind scheduling bound pressure. Load targets require measurement before changing defaults.
- The working tree includes substantial existing implementation changes. Apply this design to that actual baseline without reverting unrelated work or treating prior specifications as code.
- SQL triggers/composite constraints require real migration tests; unit mocks cannot establish their behavior.
- Existing helpers that assume published means no further updates must be enumerated during implementation, especially polling, status copy, history mapping and action permissions. Approval finality must not accidentally reactivate authoring or dictation.

## Architecture Decision Records

- [ADR-001: Continue the existing change through planning in Issues](adrs/adr-001.md) — identity, snapshot, access and continuity.
- [ADR-002: Keep uncertainties visible without blocking route approval](adrs/adr-002.md) — no acknowledgement or resolution gate.
- [ADR-003: Separate route selection from final human approval](adrs/adr-003.md) — exact approval and read-only finality.
- [ADR-004: Present real planning artifacts and stop at route approval](adrs/adr-004.md) — Human View and truthful scope.
- [ADR-005: Extend published tasks with durable local planning](adrs/adr-005.md) — additive storage, worker and component boundaries.
- [ADR-006: Define a dedicated snapshot-only Dev Control planning protocol](adrs/adr-006.md) — external contract and delivery ownership.
- [ADR-007: Version route review and render typed artifacts in the existing workspace](adrs/adr-007.md) — concurrency, resumption and presentation.
