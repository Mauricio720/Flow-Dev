# PRD: Assigned Issue Workspace and Local Project Execution

## Overview

Flow Dev currently combines issue authoring, publication, planning, specification, and execution in one chat-led task workspace. Developers need a clearer division: administrators create and publish issues in a focused authoring area; every authorized developer works from a separate area for GitHub issues assigned to them and marked `Ready` in the project's board. The work area accepts eligible issues regardless of whether Flow Dev created them.

The first eligible assignee to claim an issue becomes its responsible operator and the board item moves to `In Progress`. Planning then evaluates whether the issue needs a PRD, Tech Spec, or direct execution, followed by the existing explicit spec, task, and implementation journey. Each developer can link a checkout on their own machine, even when Flow Dev is hosted, so executions can follow that project's skills and required gates, including Playwright E2E tests when configured.

This PRD evolves the existing product behavior. Previous PRDs describe historical behavior and should be interpreted through the decisions recorded here for this feature.

## Goals

- Administrators can finish issue creation at publication without planning and execution controls crowding the authoring chat.
- Developers can find open, assigned GitHub issues in `Ready`, including issues created outside Flow Dev, and explicitly claim one.
- One responsible operator controls planning, approvals, and execution for each claimed issue while other authorized users can observe.
- A claim moves the board item to `In Progress` and retains a single durable Flow Dev work item for that GitHub issue.
- Claimed work remains available after leaving the Ready queue and follows the existing planning and execution capabilities.
- Each user can link their own local project and run required project-defined skills and gates against that environment, including Playwright E2E checks when required.
- The product shows accurate outcomes and preserves history when GitHub, the local machine, or a gate is unavailable.

## User Stories

[Full user stories](_user_stories.md) is the canonical acceptance catalog.

- US-001–US-002: Administrator-only issue authoring and clear navigation for other users.
- US-003–US-005: Assigned Ready discovery, first claim, and durable active work.
- US-006–US-008: Planning, downstream actions, and read-only observation.
- US-009–US-013: Per-user local project, project-defined gates, Playwright evidence, recovery, and operations.

## Core Features

### 1. Focused issue authoring

The existing conversation, context gathering, editable draft, explicit approval, and GitHub publication remain the issue-creation journey. Only administrators may start, edit, approve, or publish issues through Flow Dev. The authoring area ends with a publication result and a route to the separate work area. Historical conversations and source evidence remain readable to authorized project members. Post-publication planning and execution are presented in the assigned-issue workspace, not in the authoring chat.

### 2. Assigned Ready discovery

For each accessible Flow Dev project with a linked GitHub repository and Project board, the assigned-work area discovers open GitHub issues assigned to the signed-in user's GitHub identity whose board item is in the status named `Ready`. The queue includes issues created directly in GitHub or another tool. It excludes draft board items, pull requests, closed issues, unrelated repositories, and issues assigned only to someone else. The UI distinguishes an empty queue from missing board configuration, missing GitHub authorization, or provider unavailability. Pagination or equivalent bounded browsing must preserve access to all eligible issues.

### 3. Claim and active work

The user explicitly claims an eligible issue. The product verifies current assignment, open state, project and repository identity, board status, access, and that no other operator already claimed it. The first successful claim establishes one responsible operator and one durable work item, then moves the GitHub Project item to `In Progress`. A Flow Dev published issue reuses its existing issue identity and retained authoring history. An externally created issue receives a new Flow Dev work item using its confirmed issue title and body as planning context. Claimed issues remain in an active-work list after leaving `Ready`; other authorized members can follow the same item without operating it. Failed or uncertain GitHub transitions must be visible and reconciled before the user is told the claim succeeded or another claim is accepted.

### 4. Planning and downstream work

The operator explicitly starts the current assessment of whether the issue merits PRD, Tech Spec, or direct execution. The recommendation, reasons, uncertainties, editable route selection, and exact approval behavior continue in the new work area for both imported and Flow Dev authored issues. Subsequent spec, tasks, and available implementation or review actions retain their prerequisites, separated artifacts, safe activity, and explicit starts and approvals. Moving screens or importing an issue must not auto-start analysis or execution. The operator sees the source issue version used for decisions and is alerted if its content changes before later work.

### 5. Per-user local project link

Each developer may link a checkout on their own machine to an accessible Flow Dev project. The product verifies that the checkout belongs to that project's repository, shows whether the user's machine and project are ready, and keeps the link private to that user. Hosted Flow Dev must support this operating model; a path that exists only on the hosted server does not fulfill it. Before each local action, the operator sees the chosen project and explicitly starts the action. Past runs retain the actual project used even if the link later changes.

### 6. Project-defined skills, gates, and Playwright

Local execution honors applicable instructions, skills, and mandatory gates defined by the linked project. The agent can use the local checkout's files, uncommitted changes, environment configuration, and reachable local services needed to carry out the action. If the project requires Playwright E2E tests, the action runs those browser tests in the linked environment and reports their pass, fail, or blocked result with safe evidence. The product does not add an independent browser-control workflow; browser use serves project-defined gates. A required gate that fails, cannot run, or has an uncertain outcome cannot be shown as passed. No gate is invented when the project defines none.

## Business Rules

1. Only administrators may create, edit, approve, and publish Flow Dev issues. Project or GitHub access alone does not grant issue-creation rights.
2. Every authorized user may use the assigned-issue area. Discovery is scoped to projects and repositories they may currently access and to issues assigned to their signed-in GitHub identity.
3. A claimable issue is open, belongs to the project's linked repository and board, is assigned to the claimant, and has board status `Ready`. The board must provide `In Progress` for a successful claim.
4. A GitHub issue has at most one Flow Dev work item in a project and at most one responsible operator. Multiple assignees do not create independent flows. The first successful eligible claim wins.
5. A complete claim both records operator ownership and makes the issue `In Progress` on the GitHub Project. A partial or uncertain result is disclosed and reconciled before normal operation continues.
6. Authorship of a Flow Dev issue and responsibility for its downstream work are different roles. Publishing does not make the administrator the operator unless they are an eligible assignee and claim the issue.
7. Only the responsible operator may select or approve planning, answer agent questions, choose execution options, start, cancel, or retry actions, and approve generated packages. Authorized members can read safe shared results.
8. A claimed issue stays in active work after leaving `Ready`. Current project and repository access must be checked for each read or mutation; loss of access stops disclosure and new operations. A change in assignment or board status after claim blocks new operator actions pending eligibility review, while retained history is preserved for authorized readers.
9. Every planning and execution stage starts explicitly and only after its prerequisites. Approval of one stage never silently starts another. Stale or duplicate commands do not create duplicate decisions, issues, runs, or packages.
10. A local project link belongs to one user and one Flow Dev project. It must match the project's repository; it cannot be borrowed from another user. The operator must confirm the checkout chosen for each local action.
11. Local execution may read project-defined instructions, skills, files, and needed environment settings. Secret values and private local paths must not appear in browser-visible shared activity, artifacts, or diagnostics.
12. Required project gates govern the completion status of the relevant action. Playwright runs only where project rules require it. Gate results distinguish a test failure, an unavailable dependency, an unrun check, and a pass.
13. Provider outages, disconnected machines, failed gates, and uncertain results preserve prior decisions and artifacts. Restored prerequisites never start a previously blocked action automatically.
14. Existing published Flow Dev tasks retain their authoring history and GitHub identity. They can enter the new assigned flow through an eligible claim without duplicating the issue or discarding approved downstream history.

## User Experience

An administrator enters **Create issue**, describes the intention, reviews and edits the draft, then approves publication. The confirmation shows the resulting GitHub issue and a link to assigned work. A regular user sees assigned work without a new-issue action. Project members may still read permitted historical authoring conversations.

In **Assigned issues**, a developer chooses an accessible project and sees their open `Ready` issues with enough GitHub context to choose. They claim one. A successful claim immediately appears under **Active work** with the operator's name and `In Progress` board status. If another assignee claimed first, the developer sees the shared read-only work item. Direct links and refreshes open the same durable item.

The operator opens active work, requests route assessment, reviews the recommendation, approves a choice, and explicitly starts later actions when ready. Safe activity and generated documents are visible in the work area. Other authorized members follow progress without operation controls. Changed source content, lost assignment, unavailable board status, or lost access have clear explanations and recovery paths.

In project settings, each developer links a checkout on their own machine and sees repository match and readiness. A local action shows which checkout will be used. Required gates and Playwright outcomes appear as explicit statuses with relevant safe evidence; no generic browser interface is added. The experience remains in pt-BR, supports keyboard access and narrow screens, and does not rely on color alone for status.

## High-Level Technical Constraints

- GitHub remains the authority for issue identity, assignees, open state, repository, and Project board status. Flow Dev retains ownership, decisions, runs, and review history.
- Preserve existing GitHub OAuth and personal repository authorization boundaries. Board read and status mutation require actual authorized access; neither an administrator role nor project assignment substitutes for GitHub permission.
- Reuse the existing planning, spec, task, and CompozyOS action contracts where they fit, while supporting a verified externally created issue as an entry point. Preserve already approved legacy packages and publication history.
- A hosted deployment must reach each user's linked machine through a trusted, user-scoped execution mechanism. The TechSpec defines that mechanism and how local files, environment settings, services, and browser test dependencies are made available to the action.
- Protect local secrets and private repository data in all shared views, logs, artifacts, and diagnostics. Keep accurate provenance of the actual checkout, gates, and runtime used for each action.
- Claims and GitHub board transitions must withstand concurrent assignees, retries, rate limits, and uncertain provider outcomes without duplicate work items or false success.

## Non-Goals (Out of Scope)

- Non-administrator issue creation in Flow Dev; the user explicitly reserved it for administrators.
- Restricting work to issues that originated in Flow Dev; the user explicitly chose any eligible assigned GitHub issue.
- A shared server checkout as the only local-project model; the user chose each developer's own machine, including with hosted Flow Dev.
- A general-purpose browser control panel or manual browser testing feature. Browser execution is needed for project-defined Playwright E2E gates.
- Automatic planning, specification, implementation, or review merely because an issue was published or claimed.

## Architecture Decision Records

- [ADR-001: Separate issue authoring from assigned issue work](adrs/adr-001.md) — Administrator authoring ends at publication; assigned Ready issues enter a claimed work area.
- [ADR-002: Link each user's local project for project-defined execution](adrs/adr-002.md) — Each user's checkout supplies local instructions, environment, and required gates.

## Open Questions

- The TechSpec must establish the supported trusted connection between hosted Flow Dev and each developer machine, including offline recovery and limits on local access. A server path alone is insufficient.
- The TechSpec must define reconciliation of a claim whose local record and GitHub `In Progress` transition have different or uncertain outcomes.
- The TechSpec must verify which project instructions and gate declarations are available to the current runtime and how Playwright receives a working browser and access to local services.
- The product needs an explicit ownership-transfer policy if the responsible operator permanently leaves the team or loses assignment. Until that policy is decided, new mutations are blocked and authorized history remains intact; the system must not silently transfer ownership.
