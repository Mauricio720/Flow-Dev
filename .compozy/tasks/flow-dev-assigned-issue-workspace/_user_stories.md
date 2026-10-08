# User Stories: Assigned Issue Workspace

Canonical behavior catalog for separate issue authoring, assigned issue intake, and local project execution. Companion to [_prd.md](_prd.md).

## Personas

- **Administrator** — manages projects and is the only person allowed to create and publish issues through Flow Dev.
- **Assigned developer** — has project and repository access, finds their Ready issues, and may claim one to plan and execute.
- **Responsible operator** — the first eligible assignee to claim an issue; owns its downstream decisions and actions.
- **Authorized observer** — another authorized project member or assignee who follows a claimed issue without changing it.
- **Host operator** — maintains the hosted Flow Dev service and needs actionable diagnostics when local execution cannot connect.

## Story Index

| ID | Feature area | Persona | Story |
| --- | --- | --- | --- |
| US-001 | Issue authoring | Administrator | Create and publish an issue in a focused authoring area |
| US-002 | Issue authoring | Assigned developer | Understand that issue creation is administrator-only |
| US-003 | Discovery | Assigned developer | Find assigned Ready issues across accessible projects |
| US-004 | Intake | Assigned developer | Inspect an issue and claim it for work |
| US-005 | Intake | Responsible operator | Resume a claimed issue without another claim |
| US-006 | Planning | Responsible operator | Decide the route after claiming an issue |
| US-007 | Execution | Responsible operator | Run and review the existing spec and task journey |
| US-008 | Observation | Authorized observer | Follow progress without changing the issue work |
| US-009 | Local link | Assigned developer | Link and inspect their own local checkout |
| US-010 | Local execution | Responsible operator | Run project-defined skills and gates locally |
| US-011 | Gate evidence | Responsible operator | See Playwright and other required gate outcomes |
| US-012 | Recovery | Responsible operator | Recover from changed GitHub or local availability |
| US-013 | Operations | Host operator | Diagnose local execution readiness safely |

## Issue authoring

### US-001: Focused authoring

**As an** administrator, **I want** to discuss, review, and publish an issue in the authoring area, **so that** the chat stays focused on issue creation.

Acceptance criteria:

- AC-1: Given administrator and repository access, when I start an issue, I can converse, edit its draft, approve it, and explicitly publish it.
- AC-2: Given a successful publication, when I view the result, I see the GitHub issue identity and a path to the separate work area; PRD, spec, and execution controls do not occupy the authoring chat.
- AC-3: Given an existing authoring conversation, when I return, its draft, sources, and publication history remain readable.

Edge cases:

- EC-1: Blank or invalid intention → no issue is created and the input problem is explained.
- EC-2: No draft or no repository authorization → publication is unavailable with a specific reason.
- EC-3: GitHub rejects or rate-limits publication → the actual outcome is shown and the draft is retained.
- EC-4: Non-administrator opens a saved authoring URL → history allowed by project access is readable, but create, edit, approve, and publish controls are unavailable.
- EC-5: Two publication requests or a retry after an uncertain result → no second GitHub issue is presented as a fresh success until the original outcome is reconciled.
- EC-6: Navigation, refresh, or process restart during publication → the latest durable state remains visible.
- EC-7: A published issue is later closed or archived → its authoring history remains readable and no new authoring action resumes it.
- EC-8: Many historical conversations → browsing remains paginated or otherwise bounded without hiding saved items.

### US-002: Administrator-only creation

**As an** assigned developer, **I want** clear access to my assigned work without issue-creation controls, **so that** I know where to start.

Acceptance criteria:

- AC-1: Given a non-administrator session, when I navigate Flow Dev, I see the assigned-issue workspace and do not see an actionable new-issue entry point.
- AC-2: Given a direct request to create or publish an issue, when I submit it, the action is denied even if I can read the project.

Edge cases:

- EC-1: Missing or expired session → sign-in is required before either workspace opens.
- EC-2: Empty project access → a clear no-access state appears, not a creation shortcut.
- EC-3: A role changes while a page is open → the next protected action uses the current role and fails clearly if access was removed.
- EC-4: Repeated or concurrent direct creation requests by a non-administrator → all are denied without creating a draft or GitHub issue.
- EC-5: A stale bookmark to the old combined workspace → navigation still permits authorized reading while mutation controls follow the new role rule.
- EC-6: A long project list → the workspace remains navigable without exposing other projects.

## Discovery and intake

### US-003: Assigned Ready queue

**As an** assigned developer, **I want** to see issues assigned to me and in `Ready`, **so that** I can choose work from any accessible project.

Acceptance criteria:

- AC-1: Given a linked GitHub Project and repository access, when I open the queue, it includes open issues assigned to my GitHub identity whose board status is `Ready`, including issues created outside Flow Dev.
- AC-2: Given several accessible Flow Dev projects, when I choose a project, I see its eligible issues with title, repository, issue number, assignees, and status.
- AC-3: Given no eligible issues, I see an empty state distinguishing no Ready work from missing GitHub authorization or unavailable board data.

Edge cases:

- EC-1: A board item is a draft item, pull request, closed issue, or malformed issue → it is excluded from the claimable queue.
- EC-2: The issue has no assignee or is assigned to another GitHub account → it is not offered to me.
- EC-3: The board has no `Ready` option or no linked board → the project explains why discovery is unavailable.
- EC-4: Repository permission or GitHub session expires → private issue details are not shown and reconnection is requested.
- EC-5: GitHub returns no page, many pages, or a rate limit → the queue shows an accurate empty, continuing, or retry state without silently truncating eligible work.
- EC-6: The same issue appears twice through refresh or concurrent fetches → it appears as one issue in a project.
- EC-7: Status, assignment, or issue closure changes during browsing → claim rechecks eligibility and rejects stale entries with a refresh path.

### US-004: Claim one issue

**As an** assigned developer, **I want** to claim an eligible issue, **so that** I become the one operator for its planning and execution.

Acceptance criteria:

- AC-1: Given an open issue assigned to me in `Ready`, when I claim it, exactly one Flow Dev work item is associated with its GitHub issue and its board status becomes `In Progress`.
- AC-2: Given an issue created outside Flow Dev, when I claim it, its GitHub title and body are the initial planning context and the issue receives a durable Flow Dev identity.
- AC-3: Given an issue originally published in Flow Dev, when I claim it, its existing work item and publication history are reused.
- AC-4: Given multiple GitHub assignees, the first successful eligible claim names one responsible operator; all later claim attempts show who owns the work.

Edge cases:

- EC-1: Missing issue identity, repository mismatch, or non-issue board item → claim is rejected with a specific reason.
- EC-2: `In Progress` is absent from the board or GitHub refuses the status change → claim does not appear complete and the user sees the failed or uncertain state.
- EC-3: User loses assignment or project access before claim → claim is denied after fresh eligibility checks.
- EC-4: Two assignees claim simultaneously → one becomes operator and the other sees the already claimed item without a second work item.
- EC-5: Network interruption during status change → the outcome is marked uncertain until reconciliation; retry does not create a second work item.
- EC-6: Repeated claim by the operator → opens the existing work item; repeated claim by another assignee → opens its read-only view if authorized.
- EC-7: Issue closes or leaves `Ready` before claim → claim is blocked and the queue refreshes.
- EC-8: Many claim attempts on one issue → uniqueness and status remain consistent.

### US-005: Resume claimed work

**As a** responsible operator, **I want** claimed work to stay in my workspace after it leaves `Ready`, **so that** I can continue planning and execution.

Acceptance criteria:

- AC-1: Given a claimed issue in `In Progress`, when I return or refresh, I find its work item under active work and continue from the saved stage.
- AC-2: Given the same GitHub issue is visible through more than one navigation path, opening any path leads to the same Flow Dev work item.

Edge cases:

- EC-1: No claimed work exists → the active-work list has a useful empty state.
- EC-2: An issue is deleted, closed, or moved to another status after claim → its history remains visible and new operations show the current eligibility decision.
- EC-3: Project or repository access is removed → private details and mutation controls are blocked.
- EC-4: Two tabs act on the same item → stale actions fail with a refresh path, preserving the last accepted state.
- EC-5: Reload, navigation, disconnect, or repeated open → the same durable item and stage are shown.
- EC-6: A large active-work list → browsing remains bounded and permits locating an item.

## Planning and execution

### US-006: Plan after intake

**As a** responsible operator, **I want** the existing route assessment after claim, **so that** I can decide whether the issue merits a PRD, Tech Spec, or direct execution.

Acceptance criteria:

- AC-1: Given a claimed issue, when I explicitly start planning, the analysis uses the confirmed issue content and recommends the existing routes with reasons and uncertainties.
- AC-2: Given a recommendation, when I select and approve a route, the exact saved choice is recorded and does not start the next action automatically.
- AC-3: Given an externally created issue, I can complete the same planning journey as for an issue published in Flow Dev.

Edge cases:

- EC-1: Empty or oversized GitHub issue content → planning is blocked with an actionable content reason.
- EC-2: The issue has not been claimed or is no longer operable → planning controls are unavailable.
- EC-3: An observer or former authorized operator submits a planning action → it is denied.
- EC-4: Concurrent or repeated analysis and approval → at most one accepted operation or decision version exists.
- EC-5: Analysis fails, times out, or the browser reloads → saved state remains and an explicit retry is offered.
- EC-6: Issue content changes after the confirmed planning snapshot → the UI identifies the source version and requires a deliberate re-evaluation before new work uses changed content.
- EC-7: Many past attempts → the current decision stays clear while prior attempts remain inspectable.

### US-007: Existing downstream journey

**As a** responsible operator, **I want** to start, review, and approve the existing spec, tasks, and available loops, **so that** the selected route can reach execution.

Acceptance criteria:

- AC-1: Given an approved route, I see only actions whose prerequisites are satisfied and start each action explicitly.
- AC-2: Given a generated package, I can inspect its documents, request changes where supported, and approve the exact version shown.
- AC-3: Given an action in progress, I see the recorded status, provenance, and relevant safe activity in the assigned-issue workspace.

Edge cases:

- EC-1: Missing package, runtime option, model, connection, or worktree → the action is unavailable with a specific reason.
- EC-2: Action requested before planning approval or after an incompatible state change → it is rejected without starting a run.
- EC-3: Observer or user from another project submits an action → it is denied.
- EC-4: Two starts, approvals, or retries race → only valid current-version actions are accepted.
- EC-5: Worker failure, cancellation, restart, or lost connection → honest run state and explicit recovery remain available.
- EC-6: Repeated submission after success → no duplicate approved package or hidden next stage is created.
- EC-7: Many runs and documents → history remains browseable without confusing the current artifact.

### US-008: Read-only observation

**As an** authorized observer, **I want** to see the issue and work progress, **so that** I can follow shared work without interfering.

Acceptance criteria:

- AC-1: Given project and repository access, when I open a claimed issue, I see its responsible operator, current stage, approved decisions, safe activity, and artifacts permitted by the project.
- AC-2: I cannot claim the same issue, change its route, answer agent questions, start or cancel runs, approve packages, or configure another person's local link.

Edge cases:

- EC-1: No runs or artifacts yet → the view accurately says work has not started.
- EC-2: A private path, environment value, or credential appears in a run source → it is excluded or redacted from the shared view.
- EC-3: Project or repository access ends → future reads are denied.
- EC-4: Multiple observers load during a state transition → each eventually sees the one durable state, not conflicting controls.
- EC-5: Refresh, direct link, or long activity history → access rules and bounded browsing still apply.

## Local project and gates

### US-009: Link a per-user checkout

**As an** assigned developer, **I want** to link my local checkout to a Flow Dev project, **so that** execution can use the project on my own machine even when Flow Dev is hosted.

Acceptance criteria:

- AC-1: Given an accessible project, when I link a local folder, Flow Dev verifies that it is the corresponding repository and shows its readiness to me.
- AC-2: The link belongs to my user account; another member's link, paths, and local files are not offered as my execution choice.
- AC-3: Given no local link or an unavailable machine, I see a clear setup or reconnect action rather than a false ready state.
- AC-4: Given a changed link, future starts show the new choice, while past run provenance retains the actual checkout used.

Edge cases:

- EC-1: Blank, nonexistent, non-Git, or wrong-repository folder → link is rejected with the reason.
- EC-2: No local project has been linked → existing eligible nonlocal choices remain accurately represented.
- EC-3: A local path is excessively long or outside permitted access → validation fails before the link is saved.
- EC-4: Another user or project attempts to use the link → access is denied without disclosing its path.
- EC-5: Two link changes race or a save is repeated → one current link is shown, and previous run records stay unchanged.
- EC-6: Machine disconnects or folder moves after linking → readiness changes to unavailable; no action silently switches checkouts.
- EC-7: Many linked projects → each project's link and repository identity remain distinct.

### US-010: Project-defined execution

**As a** responsible operator, **I want** actions to run against my linked checkout using its skills, instructions, environment, and gates, **so that** results reflect my actual project.

Acceptance criteria:

- AC-1: Before each local start, I see which project checkout and action will run and explicitly initiate it.
- AC-2: An action reads the linked project's applicable instructions and skills and runs the gates required by that project for the action.
- AC-3: Where the project requires local services or environment configuration, the action can access them through the linked machine without exposing values in Flow Dev views.
- AC-4: Changes made by a local execution are attributed to that run and visible in the linked checkout; approved workflow stages still require explicit continuation.

Edge cases:

- EC-1: Missing or invalid project instructions → the action reports the precise constraint rather than claiming a passed gate.
- EC-2: No required gate is defined for an action → the result says none was required, not that tests passed.
- EC-3: Local service, dependency, or environment value is missing → the affected gate fails with safe diagnostic detail.
- EC-4: A different user or non-operator requests the local action → it is denied.
- EC-5: Concurrent starts against the same linked checkout → conflicting write runs are prevented or clearly serialized.
- EC-6: Machine or browser disconnects mid-run → final state is reconciled before retry; a retry requires explicit action.
- EC-7: A later action is requested before a required gate or approval → it remains blocked.
- EC-8: Very large output or many files → a bounded evidence view preserves the decisive gate result and an accessible path to retained details.

### US-011: Playwright gate evidence

**As a** responsible operator, **I want** Playwright E2E results when the project requires them, **so that** I can judge whether the work passed its gates.

Acceptance criteria:

- AC-1: Given a project gate requiring Playwright, when an eligible action runs, the browser tests execute in the linked project's environment and report pass, fail, or blocked status.
- AC-2: I can see which required checks ran and the safe failure evidence needed to investigate; authorized observers see only safe shared evidence.
- AC-3: A failed or unrun required Playwright gate cannot be represented as a successful completion of that gated action.

Edge cases:

- EC-1: No Playwright gate exists → no browser test is invented for the action.
- EC-2: Test configuration is invalid or browser dependency is absent → gate is blocked with a specific setup reason.
- EC-3: Application server or local service is unavailable → test failure is distinguished from a product assertion failure.
- EC-4: A secret, token, or private browser artifact appears in output → it is removed from shared evidence.
- EC-5: Two gate runs overlap, time out, or are retried → each has a distinct result; only the required current result controls completion.
- EC-6: Navigation or process restart during a test → recorded evidence and honest final status survive or the run is marked uncertain.
- EC-7: Many tests, screenshots, or logs → the summary identifies failures and bounded evidence remains inspectable.

### US-012: Recover changed prerequisites

**As a** responsible operator, **I want** actionable recovery when GitHub or my local machine changes, **so that** I can resume without losing decisions and artifacts.

Acceptance criteria:

- AC-1: If assignment, repository access, board status, or local readiness changes, the work item identifies the affected operation and its reason.
- AC-2: Restoring an eligible prerequisite preserves prior history and requires an explicit restart or retry; no blocked action begins on its own.
- AC-3: A GitHub or local operation with uncertain outcome is reconciled before any action that might duplicate its effect.

Edge cases:

- EC-1: An issue disappears or repository access is revoked → private content is hidden and operations stop.
- EC-2: `In Progress` is renamed or removed → the item explains that board coordination needs repair.
- EC-3: Ownership or assignment changes while a run is active → the run reports its real outcome; new actions obey current eligibility.
- EC-4: Multiple retries occur during recovery → at most one new accepted action begins.
- EC-5: Browser refresh or host restart during uncertainty → the same unresolved state remains visible until checked.
- EC-6: Many blocked work items → each shows its own cause without changing other items.

### US-013: Safe operational diagnostics

**As a** host operator, **I want** non-secret diagnostics for machine linking and gate readiness, **so that** I can repair hosted execution failures.

Acceptance criteria:

- AC-1: When a local execution cannot connect or a required host capability is absent, diagnostics identify the failing capability and a safe next step.
- AC-2: Diagnostics distinguish application, user machine, project, and GitHub prerequisites without exposing `.env` values or account credentials.

Edge cases:

- EC-1: No machine has linked yet → diagnostics say that no link is available, not that an attempted run failed.
- EC-2: Diagnostic data is malformed or too large → the view shows a bounded, safe failure rather than raw content.
- EC-3: Non-operator attempts to inspect restricted diagnostics → access is denied; their own task still shows a usable reason.
- EC-4: Multiple machines fail simultaneously → each failure is attributed to the correct project and user without exposing another user's path.
- EC-5: Connectivity returns or a check is repeated → status updates, but no previously blocked run starts automatically.
- EC-6: A process restarts during a check → the UI does not claim readiness from stale data.
