# Technical Specification: Issue Deletion

## Executive Summary

Add a durable, identity-bound deletion operation for saved Flow Dev tasks and unclaimed GitHub Ready issues. A tRPC controller authorizes and confirms the target, a service coordinates issue-level admission fencing and active-work stopping, a GitHub gateway deletes only a verified Issue node using the initiating user's authorization, and a transactional cleanup routine removes issue-owned local data only after remote absence and work termination are confirmed. A content-free completion receipt remains for idempotency.

The existing PRD and ADRs already settle the load-bearing product choices: both destinations, both issue origins, author-or-admin initiation, interruption, recovery, and artifact preservation. Repository patterns determine the technical boundaries, so no additional user question was needed. The main trade-off is extra persisted state and remote read-back latency in exchange for safe recovery when deletion or publication has an uncertain outcome.

## System Architecture

### Component Overview

| Component | Responsibility and boundary |
| --- | --- |
| `issueDeletion` tRPC router and schema | Validate scoped target, expected confirmation fingerprint, and idempotency key; call one controller method per procedure. |
| `IssueDeletionController` | Use the session principal, map domain errors to safe tRPC codes, and return explicit DTOs. |
| `IssueDeletionService` | Check current project and author/admin access, freeze identity, reserve or resume one operation, coordinate stop/reconciliation, and decide when cleanup is allowed. |
| `IssueDeletionDao` and Drizzle implementation | Lock task/source and identity, persist operation leases and fences, block admissions, record remote evidence, and atomically purge task-owned rows plus mark completion. |
| `IssueDeletionWorker` | Resume pending operations after request or process interruption; stop/reconcile local work, call the provider through current user-scoped authorization, and retry only safe stages. Reuse the existing API worker process and lease conventions. |
| `GitHubIssueDeletionGateway` | Fetch verified Issue facts, send GraphQL `deleteIssue`, and read back REST `410 Gone`; classify denial, rate limit, unavailability, transfer, and uncertainty. |
| Web issue deletion feature | Present the same confirmation, progress, recovery, and safe navigation in the authoring workspace, claimed work detail, and Ready queue. |

Flow: preview reads current identity and permissions without changing work; start rechecks them under a database lock and persists a fence; the worker stops work and reconciles publication; the gateway proves the frozen Issue absent; one database transaction removes local history and marks the operation complete. A failure before that transaction leaves the task available with a truthful deletion state. The queue-only path uses the same operation but has no task rows to purge.

Place transport in `packages/api/src/routers/issueDeletion.ts` and `schemas/issueDeletion.ts`, controller in `controllers/`, contracts and service in `application/`, and PostgreSQL/provider implementations in `infra/`. Extend the existing `tasks.ts` and `assignedIssues.ts` admission paths, task/flow/spec worker paths, and their Drizzle DAOs at the actual write boundaries. The UI feature belongs under `apps/web/src/features/issues/issue-deletion/` and is composed by the existing `issue-composer` and `assigned-work` surfaces. Keep the App Router entries thin and use their current tRPC clients.

### Scope traceability

| PRD source | Technical owner |
| --- | --- |
| Goals: unpublished local removal; US-001 | Deletion service local-only classification, transactional DAO purge, authoring UI. |
| Goals: linked removal for both origins; US-002, US-003 | Frozen identity, GitHub gateway, queue/claimed-work wiring, remote read-back. |
| Goals: any-state interruption; US-004 | Admission fence, stage-specific stop coordinator, publication reconciliation. |
| Goals: visible progress and recoverable failure; US-005 | Persisted operation, status/retry procedures, web status presentation. |
| Goals: protected detail and initiation; US-006 | Project/author/admin policy, user-scoped GitHub authorization, safe DTOs. |
| US-007 and PRD Preserve code and review artifacts | Stop without checkout cleanup; confirmation and completion copy. |

The PRD Core Features and Business Rules determine the behavior within each owner; _user_stories.md supplies the exact acceptance and edge cases covered in _tests.md.

### Authorization and identity

`ProjectAccessService.requireProject` establishes current project access. Local deletion authority is `tasks.authorUserId === actor.userId` or `AccessDao.isAdmin(actor.userId)`. For imported and queue Issues, use GitHub's verified `Issue.author.databaseId` compared with `RepositoryAuthorizationService.githubIdentity(actor.userId)`; a missing author grants no author path, leaving the admin path. Assignment, claim, and run-control rights do not grant deletion. The web receives a server-computed capability, but every mutation repeats all checks.

Use the current project's repository database ID and node ID, the stored `task_issue_sources` identity when present, and the provider's Issue node ID. Re-resolve a queue Issue by node ID, never by title, URL, number, board position, or stale page data. A repository transfer or project binding mismatch blocks deletion and preserves the local record. Repository rename updates display labels only after stable IDs match. The author/admin rule is separate from GitHub's `viewerCanDelete` and the actual mutation result.

## Implementation Design

### Core Interfaces

```ts
type DeletionTarget =
  | { kind: "task"; projectId: string; taskId: string }
  | { kind: "queue"; projectId: string; issueNodeId: string };

type DeletionState = "stopping" | "reconciling" | "deleting_remote" |
  "verifying_remote" | "cleaning_local" | "recoverable" | "completed";
type RemotePresence = "not_applicable" | "present" | "absent" | "unknown";
type DeletionStatus = { operationId: string; state: DeletionState;
  remotePresence: RemotePresence; workStopped: boolean;
  reason: string | null; retryAfterSeconds: number | null };
```

```ts
type DeletionPreview = { target: DeletionTarget; title: string;
  repository: string; issueNumber: number | null;
  destinations: ("flow_dev" | "github")[];
  canDelete: boolean; fingerprint: string };
type StartDeletionInput = { target: DeletionTarget;
  fingerprint: string; requestKey: string };
type RetryDeletionInput = { operationId: string; requestKey: string };
```

```ts
interface IssueDeletionService {
  preview(actor: SessionPrincipal, target: DeletionTarget): Promise<DeletionPreview>;
  start(actor: SessionPrincipal, input: StartDeletionInput): Promise<DeletionStatus>;
  status(actor: SessionPrincipal, operationId: string): Promise<DeletionStatus>;
  retry(actor: SessionPrincipal, input: RetryDeletionInput): Promise<DeletionStatus>;
}
```

```ts
interface GitHubIssueDeletionGateway {
  inspect(token: string, issueNodeId: string): Promise<IssueFacts | ProviderFailure>;
  remove(token: string, issueNodeId: string): Promise<"accepted" | ProviderFailure>;
  absence(token: string, target: FrozenIssueIdentity): Promise<"present" | "absent" | ProviderFailure>;
}
```

`DeletionPreview` includes title, repository display name, Issue number if linked, destinations, artifact-preservation text, `canDelete`, and a fingerprint of the frozen identity and destination set. It includes no local path or credential. `StartDeletionInput` carries the target, preview fingerprint, and UUID request key; the server recomputes the fingerprint and returns `PRECONDITION_FAILED` before fencing if publication or identity changed. `RetryDeletionInput` carries operation ID and UUID request key; it never supplies a new target. Domain failures map to `NOT_FOUND` for inaccessible targets, `FORBIDDEN` for known local denial, `UNAUTHORIZED` for missing session, `PRECONDITION_FAILED` for changed confirmation, `CONFLICT` for identity or unresolved stop conflicts, and safe provider reason codes for recoverable states.

### Data Models

Add `issue_deletion_operations` with `id uuid`, `project_id uuid`, `task_id uuid nullable` (no FK, to survive purge), `repository_id text`, `repository_node_id text`, `issue_node_id text nullable`, `issue_number integer nullable`, `initiator_user_id uuid`, `request_key uuid`, `state text`, `remote_presence text`, `work_stopped boolean`, `reason text nullable`, `retry_at timestamptz nullable`, `lease_owner text nullable`, `lease_fence integer`, `lease_until timestamptz nullable`, `created_at`, `updated_at`, and `completed_at`. Include partial unique keys on nonnull `task_id` and on `(project_id, repository_id, issue_node_id)`, plus a unique `(initiator_user_id, request_key)` receipt key. Persist no token, title, body, private path, or provider error body. Keep minimal completed rows as receipts; they are not issue records and are excluded from product history/search.

Add a task admission flag or deletion-operation association that can be checked under the existing task row lock; use the operation row as the canonical state. A queued or running task operation, spec command, claim, or execution admission must check this fence in the same transaction as its state change. Worker settlement must compare the captured task/version and lease fence before writing; late results are discarded. For queue-only issues, serialize claim and deletion reservation by a transaction-scoped identity lock on `(project_id, repository_id, issue_node_id)` and the unique operation key. If a claim wins, attach its task ID to the existing deletion operation; if deletion wins, reject the claim. A claim that occurs between preview and reservation is included in the deletion scope.

Extend `task_operations.state` with a terminal `canceled` value for generation and planning stopped by deletion, update its database check and worker claim filters, and record the deletion operation ID as the cancellation reason. This distinguishes a confirmed stop from a failed generation. Do not infer a stop merely from an expired lease; a dispatched external call needs its own terminal acknowledgement or reconciliation.

Publication attempts remain attached to the task until the existing reconciliation process establishes `created` with its node ID or `rejected`/confirmed noncreation. `dispatching` and `uncertain` are not local-only proof. The frozen operation adopts a confirmed published node ID exactly once. If a different node ID is later returned, enter recoverable identity conflict and do not delete either Issue automatically.

### State transitions and cleanup

`stopping` fences new generation, publication, planning, spec commands, claims, and execution for this issue. Stop queued work by invalidating dispatch leases and active generation/planning by cancellation plus lease fencing. For spec and local execution, invoke their existing stop/cancel protocols for the current run ID; preserve the worktree and wait for a terminal or reconciled stop. Reconcile a run that finished concurrently. `reconciling` establishes any in-flight publication outcome. A failed or unknown stop, local connector disconnect, or uncertain publication moves to `recoverable` with the task intact. Retrying resumes the same operation and does not resume stopped work.

For a linked Issue, `deleting_remote` rechecks current project access, user-scoped GitHub token and identity, stable repository IDs, verified Issue facts, and `viewerCanDelete`; then it calls GraphQL `deleteIssue(issueId)` once per verified present state. `verifying_remote` always reads back absence. A timeout or lost response returns to verification before any new mutation. GitHub REST `410 Gone` for the frozen repository and number, after proven repository read access, establishes absence. `301`, `404`, null GraphQL node, permission denial, wrong type, or malformed response does not. A confirmed existing Issue leaves the task intact on denial or retryable provider failure. A linked Issue already proven absent skips the mutation. A never-attempted or confirmed-not-created draft sets `remote_presence=not_applicable`.

When the GraphQL node is null, run the REST absence check before classifying the result: a verified `410` completes the remote stage, while a `404` remains unknown. A deletion denial does not prove the Issue is present if a preceding mutation was uncertain; verify again before reporting presence.

`cleaning_local` runs one transaction that checks the deletion fence, terminal work states, publication outcome, and remote evidence again. It deletes issue-owned children in dependency order: local command/evidence rows tied to runs; unified packages, approvals and questions; spec workspaces, packages, attempts, commands and workflows; execution runs/actions/plans; planning decisions; claim attempts/claims, snapshots and sources; publication attempts; tool calls/activity/evidence; command receipts; messages and revisions; operations and capabilities; capture leases; repository snapshot; then the task. Clear task self-reference IDs before child removal. Use schema introspection plus an integration fixture containing one row of each actual dependent table to lock down the final order. Do not call filesystem removal, Git branch deletion, PR closure, or checkout cleanup. Mark the operation `completed` in the same transaction. For a queue-only Issue, mark completion after remote absence without inventing a task row.

If cleanup fails, retain the operation and local task, with `remote_presence=absent`; the next authorized retry repeats only local cleanup. A completed receipt prevents stale tabs and cached queue items from selecting another Issue. Reads of completed task IDs return unavailable without issue content. History, assigned lists, queue discovery, and direct routes filter pending/completed deletion appropriately: pending or recoverable task items remain visible with status, completed items are absent. A queue-only operation with confirmed remote presence remains discoverable with retry status; a pending or uncertain queue item cannot be claimed, and a completed item is filtered even if a cached board page still contains it.

### API Endpoints

| tRPC procedure | Input | Success | Failure shape |
| --- | --- | --- | --- |
| `issueDeletion.preview` query | `DeletionTarget` | `DeletionPreview` with current capability and fingerprint | `NOT_FOUND`, `UNAUTHORIZED`, safe provider availability reason |
| `issueDeletion.start` mutation | target, fingerprint, request key | `DeletionStatus` for the reserved operation | `NOT_FOUND`, `FORBIDDEN`, `PRECONDITION_FAILED`, `CONFLICT` |
| `issueDeletion.status` query | operation ID | `DeletionStatus` after current project and author/admin check | `NOT_FOUND`, `UNAUTHORIZED`, `FORBIDDEN` |
| `issueDeletion.retry` mutation | operation ID, request key | current `DeletionStatus`; resumes safe stage | `NOT_FOUND`, `FORBIDDEN`, `CONFLICT` or recoverable provider reason |

Use the existing protected tRPC procedure, Zod schemas under `packages/api/src/schemas/`, composition in `packages/api/src/infra/`, and an explicit DTO. The four procedure builders call only the controller. Status polling is bounded and stops on completion or recoverable failure. The worker uses a database lease with a fencing counter; independent issues can progress concurrently. Rate-limited operations persist `retry_at` and do not spin.

### Web integration

Create a shared `features/issues/issue-deletion` feature with a small client confirmation/action component and server-derived preview. Integrate it into `issue-composer`, assigned work detail, and Ready queue row without sibling-feature imports. The confirmation uses Portuguese copy, identifies the exact issue and destinations, warns about active work interruption, and explicitly preserves worktrees, branches, and PRs. Cancel changes no server state. Pending text uses a live region; retry explains whether GitHub is present, absent, or unknown and whether work stopped. A successful response navigates to the project issue list or empty state and refreshes relevant views. Other tabs converge through existing polling/refresh; stale direct routes show unavailable without removed content. Keyboard focus enters the dialog and returns to the trigger on cancel.

## Integration Points

**GitHub:** The GraphQL Issue node query supplies `id`, `number`, repository IDs, author database ID, `viewerCanDelete`, and type. GraphQL `deleteIssue` takes the verified node ID. REST Get an issue supplies `410 Gone` absence proof and `301` transfer signal. The initiating person's current OAuth token comes from the existing repository authorization service; no shared service credential substitutes for it. Refresh/retry requires current project membership and GitHub identity. Denial, authentication loss, rate limit, network timeout, and malformed response remain distinct safe statuses; raw provider text is logged privately only after sanitization.

**Local connector and spec runtime:** Existing cancel/stop operations are addressed by exact current run/command IDs. An unknown stop outcome keeps the deletion recoverable and preserves checkout files. No provider or filesystem operation is included in a database transaction.

## Impact Analysis

| Component | Impact Type | Description and Risk | Required Action |
| --- | --- | --- | --- |
| Task, source, publication, spec, execution schema | modified | Restrictive FKs and concurrent writers make cleanup high risk | Add operation table/fences; enumerate and test dependent rows |
| Task and assigned-work admissions/workers | modified | Late results can recreate content | Check deletion fence at admission and settlement; stop exact active work |
| GitHub gateways and issue mapping | modified | Imported author absent; wrong or masked identity is dangerous | Fetch author and delete capability; verify stable IDs; add read-back |
| tRPC/controller/composition | new | New destructive operation surface | Add scoped preview/start/status/retry and safe errors |
| Authoring and assigned-work UI | modified | Stale preview, multi-tab, and accessibility risk | Shared confirmation and status, refresh/navigation, server capability |
| Existing worktrees/branches/PRs | unchanged | Automatic cleanup would destroy code/review work | Assert preservation; never call artifact deletion APIs |

## Testing Approach

Use Vitest unit tests with fakes only at database, clock, provider, and local connector boundaries. Use the API PostgreSQL integration harness for real transactions, FK cleanup, competing claim/deletion, worker fencing, restart recovery, and tRPC wiring. Use mocked GitHub HTTP/GraphQL responses to pin success, 410, 301, 404, denial, and rate-limit semantics without touching live repositories. Use React Testing Library for the confirmation's focus, copy, and status behavior; focused Playwright specs cover the three public UI entry points and safe navigation with isolated development fixtures. Follow `.agents/rules/e2e-testing.md`; no production API or data. `_tests.md` defines all cases and tiers.

## Development Sequencing

### Build Order

1. Add operation schema, DAO, identity locking, admission fence, and cleanup inventory/transaction.
2. Add GitHub inspection/deletion/absence gateway and imported author projection.
3. Add service/controller/tRPC contract and stop/reconciliation worker integration.
4. Add shared web confirmation/status flow to authoring, claimed work, and Ready queue.
5. Run focused tests, package suites, affected build and Playwright spec, then feature-gate provider contract and cross-slice checks.

### Technical Dependencies

- The existing GitHub OAuth grant must permit Issue GraphQL deletion; GitHub's repository/organization policy remains authoritative.
- PostgreSQL migration must cover the operation table and every real task-owned FK dependency found in the schema before local purge can be enabled.
- The API worker process and local connector must expose terminal or unknown stop outcomes without deleting checkout files.
- No new package or queue infrastructure is required; use existing workers and database leases.

## Monitoring and Observability

Log transitions with operation ID, task ID when present, repository database ID, stage, lease fence, safe reason code, and duration; omit title, body, token, path, and provider response body. Count started, completed, recoverable, permission-denied, rate-limited, unknown-stop, uncertain-publication, and cleanup-failed operations. Track the age of the oldest pending operation and the count past its retry time. Alert when an operation stays in a nonrecoverable processing state beyond the worker lease plus reconciliation window, or cleanup fails repeatedly; operators inspect the persisted stage before manual intervention.

## Technical Considerations

### Key Decisions

- A persistent operation and minimal receipt replace a synchronous two-system delete; they allow restart recovery and idempotency without retaining issue content (ADR-005).
- A `410 Gone` read-back with confirmed repository access is the absence proof; a 404 or null node is insufficient (ADR-006).
- All work admissions and settlements consult one durable issue fence; stage-specific cancellation still uses existing protocols (ADR-002).
- The local purge is explicit and transactional; no broad cascade or filesystem cleanup is implicit (ADR-004, ADR-005).

### Known Risks

- An already dispatched publication may not be cancellable. Preserve the task until its existing recovery logic proves creation or noncreation; do not infer noncreation from a timeout.
- A provider identity can change by transfer. Block automatic completion on mismatch or redirect and require an authorized recovery path; never retarget by Issue number.
- A remote deletion may succeed while local cleanup fails. Keep the operation and task visible, marked remote-absent, until transactional cleanup succeeds.
- The current dependency graph is broad and partly lacks direct task FKs. Implementation must inventory all referencing tables and prove purge completeness with a populated integration fixture before enabling deletion.

## Architecture Decision Records

- [ADR-001: Delete linked issues from Flow Dev and GitHub](adrs/adr-001.md) — Both origins share confirmed deletion.
- [ADR-002: Stop active issue work during deletion](adrs/adr-002.md) — Stop and reconcile before completion.
- [ADR-003: Require local authority and confirmed GitHub deletion](adrs/adr-003.md) — Separate local and GitHub permission.
- [ADR-004: Preserve code artifacts associated with a deleted issue](adrs/adr-004.md) — Keep worktrees, branches, and PRs.
- [ADR-005: Persist one deletion operation per immutable issue identity](adrs/adr-005.md) — Durable stages and minimal receipt.
- [ADR-006: Prove GitHub absence before local issue cleanup](adrs/adr-006.md) — Verify remote outcome conservatively.
