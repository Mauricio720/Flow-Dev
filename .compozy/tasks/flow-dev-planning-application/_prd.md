# PRD: Continue Published Issues into Planning

## Overview

Flow Dev currently turns a developer's intention into a reviewed GitHub Issue and treats confirmed publication as the end of that task. Extend the same Issues workspace so publication becomes a milestone in the change's lifecycle. The author can request Dev Control analysis, inspect a saved PlanningDecision, keep or change its recommended development route, and explicitly approve the chosen route.

This feature serves the author, other authorized project members who follow the work, and administrators who inspect it under existing access rules. It preserves context and makes the next decision understandable without requiring users to read raw Markdown, JSON, or logs. The delivered journey ends at approved planning; it does not execute the selected route.

The complete product scope comes from [the planning brief](../../../flow-dev-planning-application.md). The user clarified two previously unspecified behaviors: uncertainties do not block approval, and approved planning is read-only. Existing repository behavior resolves ownership, shared visibility, the retained publication snapshot, and the existing Issues entry point. No additional product decision is awaiting an answer.

### Repository grounding

- [Product context](../../../apps/web/PRODUCT.md) and [TasksController](../../../packages/api/src/controllers/tasksController.ts) establish shared project history with author-only mutation. Administrators do not gain authorship override; repository-derived reads require personal repository access.
- [Task contracts](../../../packages/api/src/application/services/tasks/taskContracts.ts), [publication settlement](../../../packages/api/src/infra/database/dao/tasks/taskPublicationState.ts), and [workspace copy](../../../apps/web/src/features/issues/issue-composer/taskCopy.ts) currently stop at `published`. The new feature extends the lifecycle while retaining the confirmed publication and its snapshot.
- [PublishedResult](../../../apps/web/src/features/issues/issue-composer/components/PublishedResult.tsx) already identifies the publication snapshot and preserves the GitHub link, but exposes raw Markdown alongside rendered content. Planning needs a structured Human View and a clear distinction between artifacts, conversation, and progress.
- [DevControlIssueAuthorGateway](../../../packages/api/src/infra/issue-author/devControlIssueAuthorGateway.ts) and [its contract](../../../packages/api/src/application/issue-author/issueAuthorGateway.ts) establish Issue Author generation, not a planning operation. [TaskWorkerController](../../../packages/api/src/controllers/taskWorkerController.ts) and [operation records](../../../packages/api/src/infra/database/schema/tasks/operations.ts) establish durable generation/publication work and recovery patterns to preserve.
- The [task-creation PRD](../task-creation/_prd.md) defines publication as the former completion boundary. This PRD supersedes that boundary for planning continuation; it preserves authoring rules, immutable publication content, repository identity, and authorization. The [design context](../../../apps/web/DESIGN.md) supplies the existing timeline language and accessibility conventions, which must accommodate the new artifact.

Market research was not needed: this is an internal extension with an explicit product brief and established workflow, access rules, and visual language. It changes neither pricing nor public positioning, and no external product behavior is required to resolve its decisions. Code inspection establishes integration surfaces, not proof that an external planning service is already implemented or operational.

## Goals

- Let an author continue an existing published intention into planning without creating another work item or GitHub Issue.
- Show the real current lifecycle stage, the responsible agent or person, the resulting artifact, and the pending human action.
- Produce and durably retain a Dev Control recommendation with its complexity, explanation, and uncertainties.
- Let the author choose among Direct execution, Tech Spec, and PRD while preserving the original recommendation and the source of the selected route.
- Require explicit human approval, allow approval with recorded uncertainties, and make the approved decision read-only.
- Preserve access boundaries, publication identity, and accepted work across interruptions, retries, and concurrent use.
- Keep approval separate from any downstream artifact generation or implementation.

## User Stories

[Full user stories](_user_stories.md) is the canonical catalog of acceptance criteria and edge cases.

- `US-001`: Continuation from new and historical confirmed publications.
- `US-002`–`US-003`: Explicit analysis and durable resumption.
- `US-004`: Failed-analysis recovery and safe retry.
- `US-005`: Human View of the saved recommendation and uncertainties.
- `US-006`: Route selection and AI/human-override provenance.
- `US-007`: Explicit approval and final read-only planning.
- `US-008`: Lifecycle timeline and current-stage visibility.
- `US-009`: Distinct Issue and planning artifacts with retained context.
- `US-010`: Shared read-only visibility for project members.
- `US-011`: Administrative visibility without access or authorship bypass.

## Core Features

### 1. Continue the existing intention in Issues

Keep the existing Issues menu, intention list, and selected workspace as the entry point. Treat the selected intention conceptually as the work item for the complete change. The published Issue is one artifact of that change rather than its entire container. An entity rename is not required.

After confirmed publication, show that the Issue was created and that Dev Control can recommend the next development step. Offer “Analisar próxima etapa” to the author when no analysis or successful decision exists. Existing published items receive the same continuation when reopened. Do not reopen Issue authoring or imply that new chat messages update GitHub.

### 2. Request and retain Dev Control planning

An explicit author action initiates analysis of the retained approved publication snapshot. Preserve the association with the original intention, repository, and confirmed Issue. Display the accepted analysis as in progress with Dev Control attribution, save its execution outcome and valid PlanningDecision, and then present planning review.

At most one logical analysis may be active for an item. Navigation and refresh resume the accepted state rather than submit new work. Failures retain the original publication and offer an applicable recovery path. A confirmed failed attempt can be explicitly retried when eligible; a successful decision is not replaced through repeated start or retry actions. A late obsolete response cannot replace the authoritative result.

### 3. Provide a Human View of the decision

The primary view presents complexity, summary, recommended route, selected route, rationale, uncertainties, attribution, and status as named, readable information. Use pt-BR interface text and distinguish the agent's recommendation from the author's decision.

| Route | Meaning for the user |
| --- | --- |
| Direct execution / “Execução direta” | Implementation is the recommended next activity without first producing a PRD or Tech Spec. No execution starts here. |
| Tech Spec | Technical specification is the recommended next activity. No specification is generated here. |
| PRD | Product requirements definition is the recommended next activity. No PRD is generated here. |

Complexity uses Low, Medium, or High, displayed as “Baixa”, “Média”, or “Alta”. It expresses the agent's assessment rather than a deterministic routing rule: the rationale must explain the recommendation, and the author may choose any supported route regardless of complexity. Do not invent a numeric score or a forced complexity-to-route mapping.

Reasons must contain a meaningful explanation. Uncertainties may be empty; show an explicit empty state rather than invented concerns or a claim of implementation readiness. When uncertainties exist, retain them visibly through approval. They require neither answers nor a separate acknowledgement and are not marked resolved by approval.

Raw source content may be available as secondary detail. Neither raw JSON nor Markdown nor operational logs replace the Human View. Display recorded activity and sources only when they actually exist.

### 4. Select and explicitly approve a route

Start with the recommended route selected. During review, “Alterar rota” lets the author save one of the three supported routes. Changing the selected route preserves the original recommendation, assessment, reasons, and uncertainties and does not itself approve planning.

“Aprovar planejamento” approves the exact saved decision and route reviewed by the author. Retain the approval identity and time. If the saved decision or route has changed since the author reviewed it, require a fresh review rather than silently approve a different choice.

After approval, show the chosen route and the approved status in read-only form. Do not offer reopening, route changes, or reanalysis of approved planning in this delivery. Explain that the next route is recorded; do not offer a working-looking action for unavailable downstream execution.

### 5. Extend the lifecycle and distinguish artifacts

Evolve the existing vertical timeline to distinguish intention/Issue Author activity, GitHub publication, and planning. During planning, communicate whether analysis has been requested, is processing, awaits human review, has failed, or has been approved. Producing a recommendation is not the same event as approving it.

Keep the Issue and PlanningDecision individually identifiable within the same work item. Preserve access to the conversation and publication snapshot without requiring users to search messages for the decision or current status. The concepts Flow, Conversation, Artifacts, and Sources guide separation; implementing all four as tabs is not required.

Actual lifecycle progress stops at planning in this delivery. A route explanation may describe future direction, but PRD, Tech Spec, Tasks, implementation, review, QA, and PR cannot appear as running, completed, or already produced.

## Business Rules

### Identity, eligibility, and access

1. A continuing work item retains its existing identity, immutable author, project, stable repository binding, and confirmed GitHub Issue. Planning cannot publish a duplicate Issue or change its destination.
2. Eligibility requires a confirmed publication with usable retained content and Issue identity. Draft, publishing, failed publication, and uncertain publication are not sufficient. Reconcile uncertain publication through the existing flow before planning.
3. The approved publication snapshot is the content being planned. Later GitHub edits or closure do not silently replace that content or erase its publication. Existing personal repository-access checks still govern all reads and actions; archived status alone does not turn local planning into a GitHub write.
4. New and historical confirmed publications follow the same eligibility rules. Merely opening a historical item never automatically starts analysis.
5. Only the author may start or retry planning, save a route selection, or approve. Project readers and nonauthor administrators may inspect authorized content but cannot mutate it. Administrative project visibility does not bypass personal repository access.
6. Validate current authorization and resource scope for protected reads and actions, including direct access. Loss of access denies subsequent protected operations without transferring ownership or altering saved artifacts.

### Lifecycle

The names below describe product states, not mandatory implementation identifiers. Successful GitHub publication remains a retained fact in every subsequent planning state.

| State or milestone | Meaning | Allowed progression |
| --- | --- | --- |
| Issue published | The original GitHub creation is confirmed and retained. | Becomes eligible for awaiting planning without another external write. |
| Awaiting planning | No accepted active analysis or successful decision exists. | Author explicitly requests analysis → planning in progress. |
| Planning in progress | An analysis has been accepted and is queued or processing. | Valid saved decision → planning review; established failure → planning failed. |
| Planning failed | Analysis did not produce a valid saved decision and no active attempt remains. | Eligible explicit retry → planning in progress. |
| Planning review | A valid saved decision awaits the author's approval. | Save a route change → remain in review; explicit approval → planning approved. |
| Planning approved | The author approved the saved decision and chosen route. | Read-only terminal state for this delivery; no downstream work starts. |

7. A start or retry cannot replace a successful decision in review or after approval. Recovery resolves unconfirmed work before another logical attempt may compete with it.
8. A partial, malformed, unsupported, or unrelated agent result cannot enter review. A result that could not be durably saved cannot be presented as completed planning.
9. At most one current successful PlanningDecision belongs to a work item in this delivery. Recovery may retain attempt information but cannot expose conflicting current decisions.
10. Duplicate commands must not create additional logical analyses, artifacts, route changes, or approvals. Stale commands cannot silently overwrite a newer selection; delayed results and reads cannot regress current state.
11. Refresh, navigation, reconnection, and service restart preserve accepted work or expose a recoverable failure. They do not imply a new request, success, approval, or abandonment.

### Decision content and provenance

12. Retain a distinguishable decision identity, its parent work item and Issue association, producing execution, recommended route, selected route, complexity, summary, reasons, uncertainties, selection source, status, creation time, and approval time when approved. Retain human approval attribution. Reuse existing normalized identity and publication information rather than creating contradictory copies.
13. The supported route set is exactly Direct execution, Tech Spec, and PRD. A valid decision has one supported recommendation and one supported selected route. Unknown or absent routes are invalid; never silently substitute a default route for malformed agent output.
14. A new decision defaults its selected route to its recommendation and its source to `AI`. A saved differing selection uses `HUMAN_OVERRIDE`. Returning to the recommendation uses `AI` for the current selection. Source describes whether the chosen route follows the recommendation; it never means automatic approval.
15. Complexity is exactly Low, Medium, or High. Summary and rationale must be nonblank and meaningful; at least one reason is required. Uncertainties are a possibly empty collection. Supported content limits must be enforced explicitly without silently truncating content or manufacturing a valid result.
16. Route selection does not rewrite the agent's assessment or claim that its rationale supports a human-selected alternative. Present original and chosen routes distinctly when they differ.
17. Approval applies to the current saved decision and selected route. Unsaved or uncertain changes cannot be silently included in approval, and stale review requires reinspection of the current saved choice.
18. Uncertainties do not block approval, require acknowledgement, or become resolved by approval. They remain available to inform the chosen future activity.
19. Successful approval records the author and approval time once. Repetition preserves that outcome, and later requests cannot reopen, override, reanalyze, or replace it.
20. Planning and its approval belong to Flow Dev. Neither analysis, route selection, approval, nor recovery posts a GitHub planning comment, edits the Issue, or initiates a downstream stage in this delivery.

## User Experience

The author remains in Issues and selects an existing intention. After confirmed publication, the workspace retains the Issue number, repository, publication information, and trusted GitHub link and offers “Analisar próxima etapa”. Starting analysis updates the planning stage with Dev Control attribution and understandable progress.

When the result is saved, the author reads the complexity, summary, route recommendation, reasons, and uncertainties. They either retain the recommended route or use “Alterar rota” to save another choice. “Aprovar planejamento” then records the explicit decision. The final view retains both recommendation and selection, identifies the approver and time, shows unresolved uncertainties, and makes the chosen next route clear without claiming it has started.

Readers see the same saved artifacts and progress with an author identity and read-only explanation. Administrators use the same reader experience when they are not the author. An access-recovery flow returns users to the saved state and never initiates planning or approval automatically.

Keep the current pt-BR language, responsive workspace, typography, and timeline conventions. Controls need accessible names, visible keyboard focus, usable touch targets, and state announcements. Status cannot depend only on color; motion must respect reduced-motion preferences. Long rationale and uncertainty text must remain inspectable on narrow screens. Keep current state and the required human action discoverable even when conversation history is long or paginated.

Use clear empty, loading, failure, uncertain-request, read-only, and approved states. Tell the user what was accepted or saved and what recovery action is available. Show no invented durations, lookups, agents, artifacts, or future execution. Treat raw technical output as optional detail with safe rendering.

## High-Level Technical Constraints

- Integrate with the existing Issues workspace, authenticated project access, personal GitHub repository authorization, publication identity, and retained snapshot. Do not replace the current authoring/publication flow.
- Dev Control must provide real planning analysis. The current Issue Author contract does not establish that capability; the TechSpec must resolve the planning request/result contract and external service dependency before claiming integration readiness.
- Preserve durable execution and result association, accepted-work recovery, duplicate prevention, and stale-result rejection. Recovery timing, supported content limits, capacity, transport, storage design, and operational mechanisms belong to the TechSpec.
- Persist meaningful typed outputs for Issue and PlanningDecision as related artifacts of the change. Conversation, execution records, lifecycle facts, and artifacts must remain distinguishable; this constraint does not prescribe tables, endpoints, entity names, or tabs.
- Send only authorized context for the bound work item/repository to the agent. Keep service credentials and GitHub tokens out of browser data, artifact content, and user-visible history. Treat agent output as untrusted content.
- Preserve one trustworthy current state across navigation and concurrent views. Slow operations need understandable progress and a recoverable outcome rather than a blank workspace or simulated completion.
- Apply existing design and accessibility conventions while accommodating planning. The source's new Human View supersedes any old assumption that the published draft is the only visible artifact container.
- No new GitHub publication behavior is required. Viewing the linked Issue remains available where its retained link is trustworthy and the user is authorized.

## Non-Goals (Out of Scope)

- A separate Planning menu: the source explicitly retains Issues as the entry point.
- PRD Writer, PRD generation, Tech Spec Writer, and Tech Spec generation in the application: these are future possible routes, not capabilities delivered here.
- Task decomposition, code execution, Code Review, QA, PR creation, and PR/merge readiness: the source explicitly stops at route approval.
- Implementing the entire proposed Flow / Conversation / Artifacts / Sources tab set or renaming all existing entities to `WorkItem`: the source requires conceptual separation and continuity, not these particular implementations.
- Publishing planning automatically as a GitHub comment or making GitHub the container of the planning workflow: the source places the decision in Flow Dev.
- Blocking approval on uncertainties, collecting clarification answers as an approval prerequisite, or requiring a separate acknowledgement: the user chose nonblocking recorded uncertainties.
- Reopening, editing, or reanalyzing approved planning: the user chose read-only decisions after approval.

Existing non-goals for collaborative authoring, ownership transfer, and automatic synchronization of published Issue content remain unchanged by this feature.

## Architecture Decision Records

- [ADR-001: Continue the existing change through planning in Issues](adrs/adr-001.md) — Keep work-item continuity, the publication snapshot, and existing ownership/access rules.
- [ADR-002: Keep uncertainties visible without blocking route approval](adrs/adr-002.md) — Retain unanswered concerns without an acknowledgement or clarification gate.
- [ADR-003: Separate route selection from final human approval](adrs/adr-003.md) — Preserve recommendation and selection provenance; approval makes the saved decision read-only.
- [ADR-004: Present real planning artifacts and stop at route approval](adrs/adr-004.md) — Use a Human View and honest lifecycle progress without starting future stages.

## Open Questions

No unresolved product decisions remain for this scope. The two clarification answers are recorded in ADR-002 and ADR-003; other decisions derive from the source brief and the inspected existing product.

The TechSpec must establish the Dev Control planning capability and ownership of any required external-service change, specify its input/output and recovery behavior, and define supported operational limits. It must also choose how existing published items enter the extended lifecycle, how current-state concurrency and approval are enforced, and how the UI represents distinct artifacts consistently with the design system. These are implementation dependencies, not grounds to reduce the requested product scope or substitute mocked planning.
