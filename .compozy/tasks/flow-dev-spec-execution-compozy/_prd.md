# PRD: Route-driven Spec Execution with Compozy

## Overview

Continue an existing Flow Dev work item beyond approved planning into an interactive specification workflow powered by Compozy 0.3. The author starts the next eligible stage through a button derived from the approved planning route, follows the agent's work as it happens, answers questions and permission requests in Flow Dev, requests adjustments, and approves each saved artifact package through a Human View.

The `prd` route produces PRD → Tech Spec → Tasks. The `tech_spec` route produces Tech Spec → Tasks using the product decisions already established in the published Issue. PRD and Tech Spec remain separate documents. Approval releases a separate button to start the next stage; it does not start that stage automatically. The delivery ends with approved Tasks prepared for later implementation. Direct execution and code implementation remain outside this scope at the user's request.

The feature serves the work item's author, authorized project readers, and administrators inspecting work under existing access rules. Its value is making agent work and specification decisions understandable in the application, while preserving reviewable files in the project's checkout. A raw transcript, Markdown viewer, or completion summary alone does not deliver this feature.

The primary input is [the Spec execution brief](../../../flow-dev-spec-execution-compozy.md). The user confirmed the full flow through Tasks, separate PRD and Tech Spec documents on the current runtime, individual stage approvals, Human View at every stage, agent-driven adjustments, checkout artifacts plus application visibility without automatic Git publication, and cancellation/retry with saved context preserved.

### Repository and dependency evidence

- [Planning contracts](../../../packages/api/src/application/services/tasks/planningContracts.ts), [planning actions](../../../apps/web/src/features/issues/issue-composer/components/PlanningActions.tsx), and [planning progression](../../../apps/web/src/features/issues/issue-composer/planningModel.ts) already retain the three routes and end at approved planning. They do not currently start Spec work.
- The inspected [Dev Control planning skill](../../../../Dev_Control/src/mastra/skills/determine-spec-path/SKILL.md) specifies PRD followed by Tech Spec for unresolved product behavior, and Tech Spec for unresolved technical decisions. Its [response schema](../../../../Dev_Control/src/mastra/schemas/planning-decision.ts) derives a suggested next step from the recommendation. Flow Dev's actual action must follow the approved selected route, including an author override.
- The [planning gateway](../../../packages/api/src/application/planning/planningGateway.ts) returns a complete analysis response; the existing [polling hook](../../../apps/web/src/features/issues/issue-composer/hooks/usePolling.ts) reads saved state. Neither establishes live Compozy execution or an agent-interaction channel. Those capabilities are required additions, not existing integrations.
- [Product guidance](../../../apps/web/PRODUCT.md), [design guidance](../../../apps/web/DESIGN.md), and the [planning PRD](../flow-dev-planning-application/_prd.md) establish the same-work-item journey, author-only mutation, shared reading, personal repository authorization, explicit approval, and a structured Human View. This PRD supersedes their planning-only delivery boundary and absence of Spec actions while preserving those invariants.
- Official sources inspected on 2026-10-05 show that [create-spec](https://github.com/compozy/compozy/blob/main/extensions/spec-cycle/skills/cy-create-spec/SKILL.md) produces a unified `_spec.md`, while [create-tasks](https://github.com/compozy/compozy/blob/main/extensions/spec-cycle/skills/cy-create-tasks/SKILL.md) consumes it. [Session documentation](https://www.compozy.com/docs/sessions/) describes durable activity and interactions. These source observations do not demonstrate a working Flow Dev integration. Compatibility with separate artifacts on a chosen 0.3 release must be established downstream.

Market research was unnecessary: this internal workflow has explicit product intent and established access and design rules. External research was limited to official dependency sources where the brief contained material uncertainty. No runtime was installed, migrated, or exercised during PRD creation.

## Goals

- Turn the approved planning choice into the correct, explicit next action inside the existing Issues workspace.
- Let the author complete PRD when required, Tech Spec, and task decomposition without moving to a terminal to supervise the agent.
- Make activity, pending human input, artifact content, changes, and approval status understandable through a Human View for every stage.
- Preserve separate product and technical documents while using Compozy 0.3 rather than the deprecated runtime.
- Require approval of each exact saved package before a subsequent stage can consume it.
- Let the author request changes, cancel, and retry while retaining applicable saved decisions and artifacts.
- Keep application review versions traceable to the project's repository files, without automatic commit, push, Issue edits, or PR creation.
- Preserve ownership, repository scope, access checks, accepted work, and coherent state across refreshes, interruptions, and concurrent use.

## User Stories

[Full user stories](_user_stories.md) is the canonical catalog of acceptance criteria and edge cases.

- `US-001`–`US-002`: Route-derived continuation and explicit stage execution with approved context.
- `US-003`: Live Human View, current-stage visibility, and honest execution progress.
- `US-004`–`US-005`: Author responses to clarification questions and scoped permission requests.
- `US-006`–`US-008`: Human Views for PRD, Tech Spec, and Tasks with their companion documents.
- `US-009`–`US-010`: Agent-driven adjustments, exact-version approval, and explicit stage progression.
- `US-011`–`US-012`: Cancellation, durable recovery, and context-preserving retry.
- `US-013`: Repository artifact continuity and matching application review versions.
- `US-014`–`US-015`: Shared reading and administrative observation within existing access boundaries.

## Core Features

### 1. Derive the next action from approved planning

Keep the existing Issues entry point and work-item identity. Retain the original Issue, publication snapshot, planning recommendation, approved selected route, rationale, uncertainties, and approval attribution. New and historical eligible approved decisions use the same continuation.

| Approved selected route | First generation action | Required progression | Completion boundary |
| --- | --- | --- | --- |
| `prd` | “Criar PRD” | PRD approval → explicit Tech Spec start → Tech Spec approval → explicit Tasks start → Tasks approval | Spec approved; tasks prepared |
| `tech_spec` | “Criar Tech Spec” | Tech Spec approval → explicit Tasks start → Tasks approval | Spec approved; tasks prepared |
| `direct_execution` | No execution action in this delivery | Retain the approved route and explain that its continuation is unavailable | Planning remains approved |

The skill's route assessment determines which kind of work is recommended. The author's approved saved selection determines which action is eligible. Neither arbitrary text emitted by the agent nor the original recommendation's button label can override that selection. Unsupported or inconsistent route data produces an explicit unavailable state, never a guessed default.

Only offer actions whose prerequisites and authorization are currently satisfied. Show the reason when an author action is blocked. The overall stage sequence can be visible, but future stages must not appear running or complete. On the Tech Spec-only route, PRD is absent or labeled unnecessary for this route; it is never falsely marked generated or approved.

### 2. Execute a bounded, contextual Spec stage

An explicit author start requests the applicable Compozy workflow for the bound project checkout. The run receives the retained published Issue snapshot, approved planning choice and explanation, remaining uncertainties, applicable approved upstream documents, and relevant saved clarification context. It uses project evidence where required to resolve the actual specification work.

Preserve settled decisions instead of repeating discovery by default. On the PRD route, unresolved product behavior is clarified in the PRD stage. On the Tech Spec route, the published Issue supplies established product intent; the absence of `_prd.md` is not a missing prerequisite. If consequential new product ambiguity emerges, the agent asks the author and makes any conflict with approved inputs explicit. It cannot silently reclassify the planning route or rewrite an approved upstream package.

Stage success means the expected complete document package is saved and available for review. A successful model turn, a terminal message, or file existence alone does not establish that outcome. Service, workspace, skill-compatibility, and capture failures must remain visible and recoverable. Do not substitute mocked artifacts or a deprecated runtime when the required integration is unavailable.

### 3. Make live work understandable

Every stage presents its name, state, responsible agent or person, available artifact version, and required next action. During work, show actual user-visible agent messages and recorded tool activity with understandable purpose and sources where available. Preserve the distinction between conversation, execution activity, artifacts, and overall progression without requiring a particular tab layout.

Questions and permission requests receive prominent, distinct treatment. Queued, running, waiting for input, awaiting review, stopping, failed, canceled, and approved states must be distinguishable. Connection loss is a visibility problem until reconciled, not proof the agent stopped. State changes use accessible announcements, and the current action remains discoverable even when history is long.

Operational traces may be available as safe secondary detail. Do not expose credentials, unrelated project information, or private internal model reasoning. Do not invent activity, percentages, durations, sources, or artifacts. When no new activity exists, display the last trustworthy state honestly.

### 4. Answer questions and permission requests inside Flow Dev

The author answers the active stage's clarifications using the supported choices or free text and an explicit send action. Show the saved answer and subsequent runtime state once acceptance is confirmed. Pending questions survive navigation and are not resolved by elapsed time, a preselected option, or a reconnect.

Permission requests identify the proposed action and target sufficiently for a meaningful allow/deny decision. A permission resolution is distinct from answering a product question and from approving an artifact. Configured project and Spec boundaries remain enforceable even if the author attempts to approve a broader operation. No blanket permission for code implementation, unrelated repositories, or Git publication is implied by starting Spec.

A runtime restart may leave a recorded interaction without a live provider turn. Explain that condition and recover explicitly; recording an answer does not prove delivery to a live agent. A runtime timeout or failure can end an attempt, but it cannot fabricate a response or approval. Authorized readers can inspect the interaction history without answering it.

### 5. Review each artifact through its own Human View

The primary review surface must expose the substantive content needed to judge the package, not merely summarize that files were generated. Retain access to full material sections and companion documents. Unknown or unrenderable material must be surfaced; an omitted requirement cannot silently fall outside the author's approval.

| Stage | Human View content | Required artifact package |
| --- | --- | --- |
| PRD | Problem, outcomes, scope and non-goals, personas, features, business rules, experience, unresolved decisions, stories with acceptance and edge cases, relevant decision provenance | `_prd.md`, `_user_stories.md`, applicable ADRs |
| Tech Spec | Approach, responsibilities, data and public contracts, integrations, lifecycle behavior, material risks and decisions, explanatory diagrams/tables/examples, validation behavior and coverage relationships | `_techspec.md`, `_tests.md`, applicable ADRs |
| Tasks | Identifiable task list, intended outcomes, dependencies, full task scope and acceptance, validation ownership, relevant references, relationship to the approved Spec | `_tasks.md`, every referenced individual task file, applicable package references |

Sections apply to the actual content; do not manufacture fields, complexity estimates, diagrams, or decisions just to fill a template. Present nonapplicable and genuinely empty optional content clearly. Missing required documents or unresolved material interpretation gaps prevent a complete-review claim.

Task decomposition must describe a coherent dependency graph and preserve the approved scope and validation contract. Surface missing dependency targets, cycles, duplicate identities, missing task files, and unassigned or contradictory required test ownership before approval. Described test cases are planned validation, not executed evidence. Prepared tasks are not implemented tasks.

Use navigable sections and relationships, readable typography, accessible tables or alternatives, and clear change and approval states. Raw Markdown, source filenames, and operational details support inspection; they do not replace the Human View. The interface remains pt-BR, with document content preserved faithfully.

### 6. Request adjustments and approve the reviewed version

In the current unapproved review stage, the author can request changes from the agent. This is the correction mechanism; the feature does not add direct document editing in the application. Pass the reviewed version and request to the agent while retaining the previous complete package. A completed adjustment produces a new review version and an understandable description of actual changes with access to the full content.

Approval applies to the exact current saved package, including its required companion documents. Record the author and approval time. A stale view, active generation, unresolved submission, pending interaction, unsent adjustment request, incomplete package, or unresolved blocking specification decision prevents approval until resolved. Nonblocking observations can remain visible; approval never fabricates their resolution.

PRD approval releases “Criar Tech Spec”; Tech Spec approval releases “Criar Tasks”. These are separate explicit start actions. Tasks approval ends this workflow with “Spec aprovado”. Approved versions remain stable inputs, and later stages cannot silently mutate their contents. The existing approved planning choice also remains unchanged.

### 7. Cancel and recover with saved context

The author can request cancellation of active generation or adjustment, including queued work and work waiting for an interaction. Show stopping while confirmation is pending. Preserve accepted requests, responses, recorded activity, complete prior versions, and saved partial outputs. Label partial output as incomplete and keep it distinct from an approved or review-ready package.

After a confirmed failure or cancellation, offer an explicit retry using applicable saved context. Do not require answers to already settled questions merely because an attempt changed. Reusing context does not authorize unrelated operations using previous permission grants. Whether a runtime session can be reused or must be replaced is an implementation decision.

If adjustment fails or is canceled, the author can explicitly return to the previous complete review version after the attempt settles, or retry the adjustment. Returning discards the pending proposal as the current review candidate while retaining its history; it does not approve the older version automatically.

Reconcile unknown outcomes before admitting competing attempts. Navigation, refresh, reconnection, or service restart neither starts new work nor implies cancellation, approval, or completion. A late result cannot replace an authoritative newer version or resurrect a confirmed canceled run.

### 8. Preserve repository files and review history

Save each work item's specification package in `.compozy/tasks/<slug>/` inside its bound project checkout. The application displays captured versions corresponding to those files, with their stage, producing attempt, approved inputs, and review status identifiable. Preserve the document separation the user selected on Compozy 0.3.

Completion requires both the required repository outputs and a trustworthy review representation. Partial file writes or failed application capture remain incomplete. Existing packages, unrelated files, and approved inputs must not be overwritten silently. Detected external file changes are conflicts or external state to reconcile, not implicit new approvals.

No generation, response, adjustment, cancellation, retry, or approval action in this feature commits, pushes, opens a PR, edits the Issue, or posts a planning comment. Local specification files are the chosen destination; Git publication is a future workflow decision.

## Business Rules

### Identity, ownership, and scope

1. One Spec workflow belongs to one existing Flow Dev work item, its immutable author, project, stable repository binding, confirmed Issue, and approved planning decision. No duplicate Issue or replacement intention is created.
2. Eligibility requires confirmed publication, usable retained context, approved planning, the appropriate supported selected route, current authorization, and compatible project execution capability. Merely opening the work item is read-only.
3. Only the author can start, answer, resolve permissions, request changes, cancel, retry, return to a previous review version, or approve. Other project members and nonauthor administrators receive authorized read-only visibility, including live observation.
4. Current project visibility and personal repository authorization apply to every protected action, artifact, interaction, historical revision, and live delivery. Administrative visibility does not bypass repository access or authorship.
5. Access loss denies subsequent protected activity without transferring ownership, erasing saved outcomes, or treating a pending interaction as answered. This feature adds no administrative takeover.
6. Generated implementation tasks belong to the Spec package. Their creation does not create GitHub Issues, start code execution, or assert that implementation or tests ran.

### Route and stage progression

7. Route mapping is exactly `prd` → PRD → Tech Spec → Tasks, and `tech_spec` → Tech Spec → Tasks. `direct_execution` remains a supported planning value without an executable continuation in this feature. Unknown route values never receive a fallback.
8. Buttons follow the approved selected route and current stage eligibility. Preserve the original recommendation and override provenance separately; agent-supplied action text is not authority to run arbitrary commands.
9. Starting Spec is separate from planning approval. Starting a subsequent stage is separate from its predecessor's approval. No automatic chain starts on success, refresh, or reconnection.
10. Tech Spec on the PRD route consumes the approved PRD package. On the Tech Spec-only route it consumes the approved Issue/planning context without requiring a PRD. Tasks consumes the approved Tech Spec and its applicable approved product inputs.
11. Approved planning and stage versions are stable. Current-stage adjustment cannot silently reopen or alter approved upstream scope. Conflicts require explicit clarification and remain visible if not resolvable within those inputs.
12. The supported workflow ends after Tasks approval. Future implementation, review, QA, and PR milestones cannot appear active or complete because Spec finished.

### Stage lifecycle

These are product states, not mandatory storage or runtime identifiers. The original Issue publication and prior approvals remain retained facts throughout.

| State | Observable meaning | Allowed progression |
| --- | --- | --- |
| Not started / blocked | The stage has no accepted run; a prerequisite or execution dependency may still be missing | Eligible explicit author start → queued/running |
| Queued / running | Accepted generation or adjustment is waiting for capacity or actively working | Waiting for input/permission, finalizing, failed, or stopping |
| Waiting for clarification | An unresolved author question prevents the current work from continuing | Accepted explicit answer → runtime continuation; explicit cancellation → stopping; actual runtime failure → failed |
| Waiting for permission | The agent is waiting for a bounded allow/deny decision | Explicit resolution → the actual resulting runtime state; cancellation → stopping |
| Finalizing result | The run has produced output but the complete package is not yet available consistently for review | Complete captured package → review; failure → failed |
| In review | A complete saved current package awaits the author | Adjustment → queued/running; eligible exact-version approval → approved |
| Stopping | Cancellation was requested; the settled outcome is not yet known | Confirmed cancellation → canceled; already-settled completion/failure → its authoritative outcome |
| Failed / canceled | The attempt has a confirmed terminal outcome without a newly approved package | Eligible explicit retry → queued/running; explicit return to an earlier complete version after a failed/canceled adjustment → review |
| Approved | The author approved an exact saved package | Release the next eligible start action; Tasks approval completes Spec preparation |

13. At most one logical generation or adjustment attempt can be current and active for a stage; stage prerequisites prevent competing downstream generation. Repeated commands must not create additional logical work or duplicate approvals.
14. Unknown submission, stopping, or runtime outcomes require reconciliation before a competing start or retry. A view may be stale or disconnected independently of the execution state.
15. Late, duplicate, reordered, or superseded results cannot regress state, overwrite a newer package, or resurrect a canceled attempt. Completion and cancellation races resolve to one authoritative outcome.
16. Save identity and association for attempts, interactions, artifact versions, approved inputs, and approval attribution sufficiently to make the visible history trustworthy. Mechanisms and retention policy belong to the TechSpec.

### Interaction and artifact integrity

17. An answer or permission decision applies to exactly the pending interaction it identifies. Preserve one authoritative resolution; repeating it cannot answer another question or broaden a grant.
18. Silence, preselection, navigation, timeout, and failed delivery are never answers or approvals. Runtime failure and orphaned interaction recovery are visible conditions with distinct outcomes.
19. Starting Spec authorizes the bounded specification workflow. Runtime permissions still restrict unrelated files, repositories, implementation, and external writes; an agent request cannot redefine that scope.
20. A review-ready package contains all required stage documents and an inspectable faithful representation. Incomplete, malformed, conflicting, unsafe, or uncaptured output cannot be presented as fully reviewable or approved.
21. Approval applies to one saved version and all its required companions, with the approver and time recorded once. Stale or uncertain review cannot approve a different version implicitly.
22. PRD and Tech Spec remain separate artifacts on Compozy 0.3. Adopting a unified `_spec.md` or downgrading the runtime would violate the confirmed product choice.
23. Stage context preserves explicit published and approved decisions. Planning uncertainties are carried forward; they do not automatically block starting Spec or become resolved by earlier planning approval. The current specification workflow must resolve genuinely blocking decisions or expose why it cannot finish.
24. Agent-driven adjustments return to review. Preserve previous complete versions and the adjustment history. Partial results and failed proposals are never promoted merely because files exist.
25. Files and displayed versions remain scoped to the work item and bound checkout. Collisions or detected external edits require visible reconciliation, not silent overwrite or implicit approval.
26. Readable Human Views must retain access to all material review content. Limits, absent sections, and interpretation gaps are explained explicitly; no silent truncation changes the approved scope.
27. Tasks must be a coherent decomposition of the approved specification, including valid references and validation ownership. Described checks are not evidence that checks ran.
28. No command in this feature triggers Git publication or code implementation. Final Tasks approval records preparation for subsequent work only.

## User Experience

The author stays in Issues, opens the existing work item, and sees the confirmed Issue and approved planning decision. The next action clearly follows the selected route. If the route requires PRD, “Criar PRD” begins product specification; otherwise “Criar Tech Spec” begins the technical stage with the Issue's established product intent.

During generation, the stage communicates what the agent is doing through real activity and user-visible messages. A clarification or permission request appears as an actionable human decision in that stage. The author answers without leaving the workspace. Readers can follow the same authorized progress and identify who must act.

When the complete package is saved, the stage changes to review. The author navigates its Human View, inspects companion documents, and requests adjustments when needed. A changed version returns with an understandable account of its changes. Approval identifies the exact reviewed package and releases the next start button. The author repeats this cycle through Tasks, where the final state makes it clear that specification is approved and implementation has not started.

Cancellation, retry, lost contact, missing execution setup, and incompatible runtime/skills receive clear explanations and applicable recovery actions. A stopped or failed adjustment leaves earlier complete work inspectable and allows an explicit return to that version. Do not replace the workspace with a generic error page when useful authorized saved content remains available.

Preserve the current pt-BR interface and visual language, including the distinction between ordinary actions and approval styling. Extend the stage/timeline model to Spec rather than inventing progress bars or fake durations. Keep current state, pending decisions, documents, and approval actions discoverable on narrow screens and with long histories. Controls need accessible names, keyboard focus, readable contrast, and usable touch targets; status cannot depend on color or motion. Respect reduced-motion preferences and preserve reading position where practical during live updates.

## High-Level Technical Constraints

- Use Compozy 0.3 with actual agent execution and interactive supervision. The local runtime, authenticated provider capability, project checkout, and Flow Dev integration must be available in an appropriate execution environment. The existing request/response planning integration does not establish this capability.
- Validate the selected 0.3 release and actual skill contracts for separate PRD/Tech Spec generation and Tasks input. The inspected upstream unified format is a compatibility dependency, not permission to change the confirmed product design or use 0.2.
- Provide a correctly scoped project checkout and protect other projects, existing specification directories, and approved inputs. Provisioning, workspace/session composition, isolation, and collision handling are TechSpec decisions.
- Support durable association, interaction resolution, live observation, reconnect/replay, duplicate prevention, cancellation settlement, and stale-result rejection. Do not prescribe SSE, WebSocket, polling cadence, endpoints, tables, or process topology in this PRD.
- Preserve a trustworthy relationship between saved files, captured review packages, approvals, and inputs to subsequent stages. A transient file or successful agent message cannot be the sole basis for completion.
- Define document interpretation and presentation contracts that can support substantive Human Views and companion navigation. Preserve material content that does not fit a summary; safe rendering and visible incomplete states are mandatory.
- Apply existing project and personal repository access boundaries to reads, commands, and ongoing event delivery. Keep runtime credentials, provider secrets, and repository tokens out of browser payloads, artifacts, and visible logs. Treat agent output and repository content as untrusted data.
- Keep Compozy execution restricted to specification activity and its authorized output location. Permission interactions cannot silently expand that scope or enable publication and implementation.
- Preserve existing Issue authoring, publication reconciliation, and planning approval behavior. Only the old terminal boundary after planning is extended; existing approved decisions are not reopened.
- Follow repository ownership and coding conventions in the downstream implementation. Concrete runtime/provider limits, content limits, storage/retention behavior, performance checks, and operational recovery mechanisms must be established in the TechSpec; this PRD invents no numeric targets.

## Non-Goals (Out of Scope)

- Direct-execution behavior: the user explicitly deferred that route's continuation.
- Implementing generated tasks, code review, QA execution, or a code PR: the user chose a Spec workflow ending at prepared, approved Tasks.
- A unified product/technical `_spec.md` as the user-facing artifact contract: the user selected separate PRD and Tech Spec documents.
- The deprecated Compozy 0.2 runtime: the user explicitly retained the 0.3 target.
- Automatically running all stages with only one final review: the user selected individual approvals and explicit next-stage starts.
- Direct artifact editing in Flow Dev: the user chose adjustment requests to the agent.
- Automatic commits, pushes, or document PR publication: the user selected local checkout artifacts and application visibility without automatic Git publication.

Existing boundaries for collaborative mutation, authorship transfer, reopening approved planning, and automatic synchronization of the published Issue remain unchanged. This PRD does not introduce an operator administration product, a general-purpose terminal, or a migration of unrelated Compozy installations.

## Architecture Decision Records

- [ADR-001: Follow the approved planning route through Spec and Tasks](adrs/adr-001.md) — Route-driven buttons, explicit progression, and the final Spec boundary.
- [ADR-002: Keep separate PRD and Tech Spec documents on Compozy 0.3](adrs/adr-002.md) — Required artifact format and runtime compatibility dependency.
- [ADR-003: Review every stage through a Human View and request changes from the agent](adrs/adr-003.md) — Substantive review, revision handling, and exact-version approval.
- [ADR-004: Preserve context across interactive runs, cancellation, and retry](adrs/adr-004.md) — Author control, shared observation, interaction persistence, and recovery.
- [ADR-005: Keep repository artifacts and the Flow Dev review synchronized without Git publication](adrs/adr-005.md) — Artifact destination, review integrity, and publication boundaries.

## Open Questions

No unresolved product choices remain for this requested scope. The clarification answers are recorded in the ADRs and reflected in the story catalog. The following implementation dependencies must be resolved by `cy-create-techspec` before claiming integration readiness:

1. Pin and exercise a Compozy 0.3 release in isolation. Establish its actual authentication, enrolled skill/extension identities, supported events, interaction responses, restart behavior, and cancellation semantics; inconsistent upstream naming and untested documentation are not a verified integration.
2. Define maintained compatibility for separate `_prd.md`/`_techspec.md` packages and task decomposition, including the Tech Spec route with no PRD. Validate actual outputs and companion contracts rather than merely changing a skill name or renaming a unified file.
3. Determine where execution runs, how each project obtains a correctly authorized checkout, how concurrent work is isolated, and which responsibilities belong to Flow Dev, Dev Control, and the Compozy integration.
4. Specify durable state, live delivery/replay, command and interaction reconciliation, access revalidation, cancellation races, and safe recovery from orphaned interactions or uncertain runtime outcomes.
5. Define the artifact capture/version contract, faithful Human View representation, mismatch/collision recovery, output completeness checks, and preservation of approved inputs and earlier review versions.
6. Establish supported limits, resource availability checks, retention, and applicable verification evidence for the end-to-end workflow. Preserve the full approved product scope when resolving these details; do not replace an unverified dependency with mocked success.
