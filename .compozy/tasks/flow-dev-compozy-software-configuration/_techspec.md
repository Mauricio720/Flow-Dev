# Technical Specification: CompozyOS Software Configuration and Task Flow Choice

Companion to [the PRD](_prd.md), [user stories](_user_stories.md), and [test contract](_tests.md). This feature is planned in the locally installed PRD → TechSpec → Tasks format. The unified `_spec.md` described below is the **future output of the Flow Dev application**, not the planning artifact for this feature.

## Executive Summary

Add a Software configuration slice and a task action-plan slice around the existing tRPC/controller/service/DAO layers. Keep the legacy `task_spec_*` rows and routes for already-started workflows. New rows identify an `os_unified` flow, its versioned action plan, and immutable per-run execution snapshots. An adapter talks to the pinned CompozyOS HTTP/UDS API. A new unified-spec capture path validates `_spec.md` and companions before review; later skill sessions and Loop runs consume the approved package. The cost is maintaining a legacy read path and a deliberate new execution path while preserving data.

## MVP Boundary

The first shippable slice is Software readiness plus one Codex connection and an explicit unified-spec action with provider/model/reasoning/checkout provenance. The same feature scope then adds Claude, native worktree modes, task creation, Loop selection/runs, and complete legacy coexistence. No smaller permanent product boundary removes requested capabilities.

## Developer Experience

[DX](_dx.md) specifies the tRPC surface and CompozyOS control calls; [UI map](_uiux.md) specifies the Software and task screens. Flow Dev does not add a public CLI, SDK, CompozyOS config key, or MCP tool.

## System Architecture

1. **Software router/controller/service/DAO:** administrator authorization, CAS settings writes, connection records, audit entries, safe diagnostics. Host-only credential broker owns login homes and never returns secrets.
2. **CompozyOS capability gateway:** pinned version/schema check, provider auth probe, fresh model/source status, worktree list/create/status, Loop catalog/inspect/validate/run/status, and session creation/prompt. It returns typed results and bounded error codes.
3. **Task action planner:** task-author authorization, planning eligibility, live action availability, versioned flow plan and runtime proposals. It never accepts arbitrary shell commands or unknown Loop inputs.
4. **Admission/worker:** under the task row lock, revalidate plan/connection/catalog/worktree/definition, create one immutable execution snapshot and idempotent outbox command, then dispatch through a fenced worker. The worker uses the snapshot, never current global defaults, and reconciles uncertain CompozyOS outcomes before retry.
5. **Artifact/review adapter:** capture unified `_spec.md` plus companions as one versioned package; use approved package for `cy-create-tasks`; attach Loop run evidence and Git diff without auto-publishing. Legacy package reads stay on the existing path.
6. **Frontend:** global Software area and task action plan/review/run views consume tRPC only. Readers see safe provenance; authors see eligible actions; admins see connection controls.

Data flow: administrator saves a connection → broker verifies account → capability gateway projects ready choices → author saves action plan → admission commits run snapshot → worker starts session/Loop → events and artifacts settle → author reviews/approves → next action becomes startable. A missing or stale capability stops at admission.

## Architectural Boundaries

`packages/api/src/routers/` is transport only. `controllers/` translates principal and DTOs. `application/services/` owns permissions, state, validation, and policies through DAO/gateway contracts. `infra/database/` owns Drizzle transactions; `infra/spec/` owns credentials, Git, Podman, and CompozyOS wire calls. `apps/web/src/features/software/` owns Software UI; task components remain in the existing issue-composer Spec feature. No browser component reads runtime files or provider credentials.

## Implementation Design

### Core Interfaces

```ts
type RuntimeChoice = { connectionId: string; providerId: string;
  modelId: string; reasoningEffort: string | null };
type WorkspaceChoice = { kind: "isolated" }
  | { kind: "existing"; worktreeId: string } | { kind: "new"; name: string };
type FlowAction =
  | { kind: "create_spec" | "create_tasks"; runtime: RuntimeChoice;
      workspace: WorkspaceChoice }
  | { kind: "loop"; loopName: string; loopVersion: string;
      inputs: Record<string, unknown>;
      runtimeBindings: Record<string, RuntimeChoice>; workspace: WorkspaceChoice };
type ActionSnapshot = FlowAction & { connectionRevisions: Record<string, number>;
  accountFingerprints: Record<string, string>; compozyVersion: string;
  worktreeId: string | null };
```

`SoftwareService` exposes `settings/readiness/listConnections/connect/status/disconnect/history` and requires `requireAdmin` on every method. `TaskFlowService` exposes `options/getPlan/savePlan/start/approve/cancel/retry` and requires existing task author or reader access as appropriate. `CompozyControlGateway` exposes `probeProvider`, `listModels`, `listWorktrees`, `createWorktree`, `inspectLoop`, `validateLoop`, `startLoop`, and `getRun`; every result includes a typed error and release identity. `CredentialBroker` exposes only opaque connection IDs and per-attempt filesystem grants, never token bytes to application DTOs.

### Data Models

Add `software_settings` (`id=1`, `revision`, `enabled BOOLEAN` default false, `docs_proxy_url TEXT` required HTTPS when enabled, `max_active_actions INTEGER` default 1 and bounded 1–4, `updated_by`, timestamps), `software_connections` (`id`, `label` unique case-folded, `provider_kind` codex/claude, `runtime_provider_id` unique, `auth_state`, `account_fingerprint`, `revision`, `disabled_at`), `software_auth_operations` (`id`, `connection_id`, `kind`, `state`, `expires_at`, `actor_id`, `nonce_digest`), and `software_audit` (`id`, `actor_id`, `event`, redacted diff, timestamp). Image digest, runtime binary/socket, runner ID, workspace root, network, and credential root remain host-only. Secret homes live outside the repository and DB under an owner-only host root, keyed by opaque connection ID. No token, auth file, device code, or raw account email enters audit.

Add `task_execution_plans` (`task_id` unique, `kind=os_unified`, `revision`, `status`, `created_by`), `task_execution_actions` (`id`, `task_id`, `position`, `kind`, `loop_name`, `loop_version`, validated input JSON, workspace choice, state), `task_execution_runtime_bindings` (`action_id`, `role`, `connection_id`, `provider_id`, `model_id`, `reasoning_effort`), and `task_execution_runs` (`id`, `action_id`, `attempt_number`, `state`, immutable snapshot JSON with indexed worktree and runtime IDs, lease fence, idempotency key, terminal code). A skill action has role `main`; a Loop action has exactly its declared runtime roles. Use side tables for searchable state; JSON is only for validated opaque Loop inputs and immutable snapshots. A unique partial index enforces one active write run per task. Existing `task_spec_workflows`, attempts, stages, and packages are not rewritten. Add an explicit flow-kind discriminator/read projection for legacy vs unified views.

Unified artifact package: `format=os_spec_v1`, spec parts, companion file manifest with SHA-256 and required/optional flags, source run ID, review version, and immutable snapshot ID. Require `_spec.md` Product and Technical headings, `_user_stories.md`, `_dx.md`, `_tests.md`, and `_uiux.md` for UI-bearing work; source validation follows the pinned skill contract. Old packages retain their original format.

### API Endpoints

Use authenticated tRPC procedures; names below are the client contract. `software.compozy.get`, `readiness`, `connections`, `history` are admin queries. `software.compozy.saveSettings`, `beginCodexLogin`, `pollLogin`, `beginClaudeLogin`, `confirmAccount`, `disconnect`, `renameConnection` are admin mutations. `taskFlow.options`, `byTask`, `runs` are access-checked queries; `taskFlow.savePlan`, `startAction`, `approvePackage`, `cancelRun`, `retryAction` are author-only mutations. Inputs use Zod, `expectedRevision` and `idempotencyKey` for writes, and bounded pagination for lists. Errors map to `UNAUTHORIZED`, `FORBIDDEN`, `BAD_REQUEST`, `CONFLICT`, `PRECONDITION_FAILED`, or `SERVICE_UNAVAILABLE` with a safe domain code (`auth_required`, `catalog_stale`, `model_unavailable`, `reasoning_effort_unsupported`, `worktree_not_ready`, `loop_version_changed`, `runtime_incompatible`, `outcome_unknown`). No raw upstream body is returned.

Codex login: server starts app-server `account/login/start` with `chatgptDeviceCode`; UI receives only verification URL, user code, expiration, and operation ID. Poll/complete correlates operation ID and administrator, confirms safe account identity, then probes subscription access. Reconnect creates a new private home and swaps connection revision only after confirmation. Claude login uses a server-supervised `claude auth login --claudeai` ceremony in an isolated `CLAUDE_CONFIG_DIR`; the UI may show the safe authorization URL/code and must not accept raw OAuth material. If this ceremony cannot be securely bridged in the target deployment, Claude remains `setup_required` until a verified host-assisted completion path is implemented. `claude auth status --json` and CompozyOS provider probe confirm login; no API-key fallback. Each verified connection maps to a CompozyOS provider overlay with a unique provider ID and its own home/environment policy, so discovery and account identity cannot bleed between connections.

Admission reads `availability_state=available_live` from each connection-specific CompozyOS provider catalog; `available_stale`, `unknown`, and static seed rows are not ready. Null reasoning means provider default; explicit effort must be in that model's live set. First prompt carries the nested runtime snapshot and remains authoritative; its 422 errors settle the attempt as blocked, preserving artifacts. A Loop run maps each selected role to the definition's declared `runtime` input; a Loop with hardcoded or unoverrideable runtime is unavailable for this picker. Existing worktree must be ready and owned by the registered repository; new worktree creation is idempotently recorded before session creation. A runtime container must retain a task-scoped CompozyOS home and Git worktree state across action restarts, with only one write action at a time. The worker mounts only the selected connections' attempt-scoped auth grants, not personal homes.

## Integration Points

- **CompozyOS `v0.3.0-beta.29`:** pinned HTTP/UDS and session/Loop APIs, provider auth probe, model catalog, worktree API. A version/digest mismatch blocks starts. MCP `compozy mcp serve` is optional and exposes only its approved workspace-bound Host API projection.
- **Codex app-server:** local self-operated device login and account status. A commercial hosted deployment needs a different approved auth contract.
- **Claude Code CLI:** subscription auth/status in a private config home; validate its supervised login ceremony before declaring ready.
- **Podman/GitHub:** preserve current rootless container, network, repository identity, Git access, resource limits, and snapshot/approved-package boundary. Worktree paths must be revalidated against the same repository before each run.

## Impact Analysis

| Component | Impact | Risk and required action |
| --- | --- | --- |
| `specConfiguration.ts`, admission, worker composition/dispatch | Modified | Remove global provider/model authority for new runs; preserve legacy read path and pinned host-only invariants. |
| `task_spec_*` schema/DAO | Extended | Add new side tables and additive migration; no destructive reset or rewriting approved packages. |
| Compozy runtime gateway and workspace/Podman adapters | Extended | Typed catalog, Loop, worktree operations; durable per-task runtime state and narrow auth grant. |
| tRPC/controller/service composition | New/modified | Admin Software and author task-flow procedures with existing auth/error patterns. |
| Software and task UI | New/modified | Admin global navigation, flow picker, unified review, run/provenance states. |
| Legacy split-stage route | Read/finish compatibility | Started workflows keep existing state and review; no new legacy starts once unified flow is enabled for a task. |

## Extensibility Integration Plan

Read the live `spec-cycle` resources and Loop catalog; do not copy stale v0.2 skills or assume the two bundled Loops cannot be disabled. Workspace Loops are admitted only by a declared-input and safe-task-context adapter. Flow Dev publishes no new CompozyOS extension, native tool, or MCP sidecar in this feature.

## Agent Manageability Plan

Software and task-flow tRPC have structured safe statuses for the Flow Dev UI. Operators can inspect the same CompozyOS workspace through its CLI, HTTP/UDS, and optional trusted `compozy mcp serve`; Flow Dev does not expose secrets through MCP. Flow Dev logs IDs, versions, and domain codes so an agent can diagnose a blocked run without scraping UI text.

## Config Lifecycle

Software saves only `enabled`, `docsProxyUrl`, and `maxActiveActions` with compare-and-swap revision and an audit row. `enabled=true` is valid only with an HTTPS docs proxy URL; a valid save does not override failed host or account checks. The host continues to own pinned image digest, socket paths, credentials root, rootless network, and deployment secrets. No browser write edits CompozyOS `config.toml` directly. A deliberate pin update regenerates/validates the CompozyOS API contract and runtime image before new starts.

## Testing Approach

Use Vitest for pure admission/DTO policies, Drizzle/PostgreSQL integration for locking and migration, and gateway contract fixtures from the pinned OpenAPI. Fake only CompozyOS/CLI/GitHub I/O in unit tests. Focused browser E2E covers admin and author journeys; live Codex/Claude login, Podman isolation, and worktree persistence are feature/QA gates, not ordinary unit fixtures. [Tests](_tests.md) owns concrete cases.

## Development Sequencing

1. Pin and validate CompozyOS capability contracts, auth feasibility, and durable worktree container topology.
2. Add additive schema and DTO contracts, then Software broker/readiness and admin UI.
3. Add task plan/admission and runtime snapshots before replacing global provider dispatch.
4. Add unified spec capture/review and task creation; retain legacy reads and in-progress completion.
5. Add Claude, worktrees, Loop catalog/run adapters, then full journey verification.

## Technical Dependencies

Pinned CompozyOS binary/API/image; PostgreSQL migration path; Codex app-server and Claude Code versions; Git >=2.37; rootless Podman; registered repository workspace; documented provider auth policy for local use. Prove these in a disposable environment before enabling the corresponding option. No production data reset is allowed.

## Monitoring and Observability

Record structured events for settings writes, connection state changes, catalog freshness, admission refusal, action start, runtime binding, artifact capture, Loop terminal outcome, and uncertain reconciliation. Include actor/task/action/run IDs, connection ID, provider/model, safe reason code, runtime pin, and correlation ID; exclude account secrets and raw prompts. Alert on repeated `runtime_incompatible`, orphaned active leases, persistent `outcome_unknown`, and stale provider catalog; operator owns host repairs.

## Technical Considerations

### Key Decisions

ADRs 001–006 own global Software, runtime choice, auth, control surface, per-action provenance, and unified spec/Loop lifecycle. The current CompozyOS MCP relay cannot replace the full control API. Static catalog seeds do not prove account entitlement. A split legacy read path is cheaper and safer than rewriting approved artifacts in place.

### Known Risks

Codex device login may be restricted by account/deployment; Claude login may require supervised terminal interaction; subscription entitlement may fail only on first prompt; worktree state could be lost if per-attempt containers stay ephemeral; Loop definitions may change or be disabled. Fail closed with actionable status, keep original content, and do not offer the affected option until its contract is proven.

## Safety Invariants

1. Every accepted action has exactly one task, author, immutable runtime snapshot, and idempotency key.
2. A task has at most one active write-capable run; fencing prevents a stale worker from settling a newer run.
3. Only the author can select/start/retry/approve; only administrators can change Software.
4. Every worktree belongs to the task's registered repository and is ready at admission.
5. An active run never changes any runtime role's provider account, model, or reasoning, nor its worktree or Loop version.
6. No connection token, auth file, OAuth result, or repository credential enters task DTOs, artifacts, audit, or logs.
7. Legacy approvals and packages never change format or status as a side effect of new configuration.
8. A failed or unknown external outcome never becomes success without authoritative reconciliation.

## File References

### Repo Files

- `packages/api/src/application/spec/specPins.ts` — exact CompozyOS release and managed agent pin.
- `packages/api/src/infra/spec/specConfiguration.ts` — current global provider/model and host gates to separate.
- `packages/api/src/infra/spec/compozy/compozyRuntimeGateway.ts` — existing runtime transport to extend.
- `packages/api/src/infra/database/schema/tasks/spec.ts` — current workflow/attempt schema and legacy preservation boundary.
- `packages/api/src/infra/database/dao/spec/specStart.ts` — author lock, version, idempotency, and prerequisite pattern.
- `packages/api/src/controllers/specDispatch.ts` — global provider dispatch to replace for new actions.
- `packages/api/src/infra/specWorkerComposition.ts` — composition root for gateway, workspace, and worker.
- `packages/api/src/routers/taskSpec.ts` — existing tRPC task boundary and errors.
- `apps/web/src/features/issues/issue-composer/spec/SpecStage.tsx` — task UI integration point.
- `apps/web/src/app/admin/access/page.tsx` — global admin access pattern.

### External References

No external code is vendored into this repository. The pinned upstream `cy-create-spec`, model catalog, worktree API, Loop catalog, and MCP relay are linked from the PRD and ADRs; inspect the exact release before changing wire contracts.

## Assumptions and Defaults

This is a locally operated Flow Dev deployment. New tasks default to a `create_spec` action and isolated checkout, with no provider/model guessed; the author must confirm a ready runtime. Later actions are opt-in and explicit. `reasoningEffort=null` means the provider default. Auto-commit, push, publication, and automatic step transition default off. Existing started workflows keep their legacy format and route.

## Architecture Decision Records

- [ADR-001](adrs/adr-001.md) — Global Software and host diagnostics.
- [ADR-002](adrs/adr-002.md) — Superseded split-stage task-wide choice, retained for history.
- [ADR-003](adrs/adr-003.md) — ChatGPT subscription connection without exposed credentials.
- [ADR-004](adrs/adr-004.md) — Pinned CompozyOS HTTP/UDS control contract; bounded MCP projection.
- [ADR-005](adrs/adr-005.md) — Per-action runtime and worktree provenance.
- [ADR-006](adrs/adr-006.md) — Unified spec and explicit CompozyOS Loop lifecycle.

