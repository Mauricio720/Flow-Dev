# PRD: CompozyOS Software Configuration and Task Flow Choice

This feature's own delivery follows the locally installed Compozy workflow: `_prd.md` → `_techspec.md` → `_tasks.md` and `task_*.md`. The CompozyOS unified `_spec.md` described in this PRD is the format the **Flow Dev application will produce after this feature is implemented**. This directory does not use `_spec.md` as its planning source.

## Overview

Flow Dev's existing Spec workflow continues an approved task through separate PRD, Tech Spec, and Tasks stages, but its execution setup is operator-managed and tied to environment-wide provider/model values. The user wants the Flow Dev integration to follow CompozyOS's current spec-driven contracts, configure it through a global Software menu, connect Codex using an existing ChatGPT subscription without API credits, make Claude available, and choose the runtime and flow on each task.

This feature gives administrators an in-app place to manage supported execution connections and application-level CompozyOS settings, with a truthful view of host prerequisites. After planning approval, a task author chooses a supported CompozyOS flow, connection, model, reasoning level, and checkout/worktree context. Each selected action starts explicitly and keeps its effective runtime provenance. Existing Issue identity, planning approval, review, and artifact safety boundaries remain in force.

This feature revises [Route-driven Spec Execution with Compozy](../flow-dev-spec-execution-compozy/_prd.md) where its legacy route and document format conflict with CompozyOS 0.3. The later user direction to follow CompozyOS supersedes separate PRD/Tech Spec generation as the future integration contract. Existing persisted PRD/Tech Spec packages remain readable and approved; migration never resets them or reinterprets an approval. Author-only starts and explicit review remain.

CompozyOS 0.3's bundled `cy-create-spec` skill writes one `_spec.md` with Product and Technical parts and companion contracts. Flow Dev will present the corresponding spec for review as one coherent artifact. The author can then explicitly create tasks and, if selected in that task's flow, start the bundled `implement-tasks` and `review-and-fix` Loops. A custom workspace Loop is offered only if its live definition and inputs are compatible with the task and permissions. No stage is silently started by a preceding approval.

### Repository and dependency evidence

- Flow Dev currently has a global administrator-only [Access area](../../../apps/web/src/app/admin/access/page.tsx) and per-project [Settings](../../../apps/web/src/features/projects/project-settings/index.tsx), but no Software menu. Runtime configuration is therefore not yet an application feature.
- The current [Spec worker configuration](../../../packages/api/src/infra/spec/specConfiguration.ts) and [start admission](../../../packages/api/src/infra/spec/environmentAdmission.ts) read environment-wide settings. The [container plan](../../../packages/api/src/infra/spec/containerPlan.ts) launches a single configured provider/model, so a task-level choice requires a real product and execution contract rather than a picker alone.
- The existing [Codex authentication check](../../../packages/api/src/infra/spec/specCodexAuth.ts) expects a dedicated host-side ChatGPT login. It does not provide the requested browser-led connection, status, reconnection, or disconnection experience.
- The [Spec execution PRD](../flow-dev-spec-execution-compozy/_prd.md) requires explicit starts, exact-version review, and preserved task content. The unified CompozyOS flow retains those safety properties while superseding the legacy split-stage format for new execution.
- The [pinned CompozyOS model catalog](https://raw.githubusercontent.com/compozy/compozy/v0.3.0-beta.29/packages/site/content/docs/agents/model-catalog.mdx) exposes provider models and their reasoning levels; [worktrees](https://raw.githubusercontent.com/compozy/compozy/v0.3.0-beta.29/packages/site/content/docs/worktrees/index.mdx) are a native execution context. The [pinned Loop catalog](https://raw.githubusercontent.com/compozy/compozy/v0.3.0-beta.29/packages/site/content/docs/loops/catalog.mdx) includes implementation/review Loops but no compatible Spec Loop by default. The installed local legacy Compozy is not the product contract for this feature.
- The [pinned `cy-create-spec` skill](https://raw.githubusercontent.com/compozy/compozy/v0.3.0-beta.29/extensions/spec-cycle/skills/cy-create-spec/SKILL.md) uses one `_spec.md` with Product and Technical parts plus companion contracts. Flow Dev's new review action uses that package; existing PRD and Tech Spec approvals remain legacy history.
- The [pinned CompozyOS MCP relay](https://raw.githubusercontent.com/compozy/compozy/v0.3.0-beta.29/packages/site/content/docs/operations/mcp-serve.mdx) publishes a workspace-bound subset of Host API operations, excluding global provider bootstrap and model/worktree administration. Flow Dev's server integration therefore uses the pinned HTTP/UDS contracts for those controls. No CompozyOS MCP server is currently registered in this development client's MCP list.
- [Official Codex authentication guidance](https://learn.chatgpt.com/docs/auth) distinguishes ChatGPT subscription login from usage-based API-key login and treats cached login material as a password. The [pinned Compozy provider guide](https://raw.githubusercontent.com/compozy/compozy/v0.3.0-beta.29/packages/site/content/docs/agents/providers.mdx) lists `codex` as a native-login provider. These sources establish the intended authentication direction, not a verified browser-to-container integration.

Market/competitive research was unnecessary for this internal workflow: the user specified the desired menu, task timing, and subscription constraint. External research was limited to official authentication and runtime documentation because those affect feasibility and credential safety. No host setup, login, migration, or provider request was performed to create this PRD.

## Goals

- Let a Flow Dev administrator find Compozy setup in a global Software area, connect and reconnect Codex through the application, and see an honest account and runtime status.
- Let administrators maintain multiple supported Codex and Claude execution connections without replacing one global active provider whenever a different task needs another option.
- Let the author of each eligible task choose a CompozyOS-supported sequence of spec creation, task decomposition, and eligible Loops, plus a ready connection, advertised model/reasoning effort, and safe checkout/worktree context for each runnable action.
- Make `_spec.md` and its applicable companion contracts the new spec-driven output while preserving access to already approved legacy PRD and Tech Spec packages.
- Block unsafe or impossible starts with an actionable explanation while retaining existing projects, tasks, messages, planning approvals, and Spec artifacts.
- Keep credentials, subscription login material, and operational secrets out of task pages, browser payloads, artifacts, logs, and ordinary settings fields.
- Separate application configuration from host provisioning: Software diagnoses missing host prerequisites and explains the required operator action without claiming to perform privileged setup.

## User Stories

[Full user stories](_user_stories.md) is the canonical catalog of acceptance criteria and edge cases.

- `US-001`: Administrator access to the global Software area.
- `US-002`–`US-003`: Runtime readiness and non-secret application settings.
- `US-004`–`US-005`: In-app Codex ChatGPT connection and account lifecycle.
- `US-006`: Multiple supported execution connections.
- `US-007`–`US-008`: Per-task choice before Spec and stable execution provenance.
- `US-009`–`US-010`: Safe blocked states and shared non-secret visibility.
- `US-011`: Configuration-change accountability.
- `US-012`–`US-014`: Claude connection, CompozyOS model/reasoning choice, and native worktree choice.
- `US-015`: Choose and run a CompozyOS-compatible spec-driven flow without implicit transitions.

## Core Features

### 1. Global Software area for Compozy

Add a Software destination outside any individual project, visible and editable only to Flow Dev administrators. Its Compozy section presents required application settings, supported connections, a readiness summary, and non-secret change history. It starts with a useful empty state. Project readers and task authors do not gain administrator access because they can use Spec.

Administrators can enter and update required non-secret application settings. Invalid or incomplete changes do not replace a valid effective configuration. The view distinguishes settings that the application can save from host prerequisites that an operator must prepare. It cannot declare the system ready merely because a form saved or a provider logged in.

### 2. Connection and readiness management

Support a complete browser-led Codex connection using an eligible ChatGPT subscription, including status, reconnect, and disconnect. The Codex path must not require an OpenAI API key or separate API credit purchase. Show the connected account's safe identity, authentication status, and whether its access is actually usable. Never display or accept raw cached login material in the menu.

Allow multiple distinct Codex and Claude execution connections to coexist. Each has a stable identity, label, provider, authentication state, compatible models, and readiness state. A connection cannot be offered to a task merely because its name exists: the underlying provider, model, credentials, runtime, and host restrictions must be usable together. Unsupported providers or models remain unavailable with a reason instead of appearing as working options. Codex uses ChatGPT subscription login; Claude uses its own validated Claude Code authentication path. The CompozyOS 0.3 runtime, not the deprecated local Compozy installation, determines provider availability.

Readiness identifies application settings, account connection, pinned runtime/agent compatibility, and host isolation as separate concerns. When a host image, isolated network, workspace, or documentation access is missing, Software provides actionable diagnostics and identifies operator responsibility. It does not install Podman, create unrestricted networks, bypass isolation, or claim that a login alone makes Spec runnable.

### 3. CompozyOS flow and execution choice on each task

After planning approval and before new execution, the author chooses which CompozyOS-supported actions the task will use: create the unified spec, create tasks, and optionally run available implementation and review Loops. Flow Dev shows the live Loop catalog and each definition's declared inputs, validation, and required prerequisites rather than inventing workflow names or assuming every Loop fits a Spec task. The selected flow has explicit author start/approval gates; an action never starts because another action finished. A legacy task already in progress stays on its original route until an explicit, safe migration contract exists.

For each runnable action, the author chooses ready connection/model/reasoning values for every runtime role that CompozyOS declares, plus a workspace mode. A skill action has one runtime role; a Loop may declare several. Workspace mode is an isolated checkout or a ready CompozyOS worktree belonging to the project; managed worktree creation is offered only when supported. A task may retain defaults to prefill later actions, but the effective values are confirmed and bound separately for each attempt/run. Each attempt, run, and saved package retains every actual runtime role, worktree, runtime version, and flow definition/version as non-secret provenance. Later connection, Loop, or worktree changes do not rewrite history or silently switch an active action.

The new Spec action produces `_spec.md` with Product and Technical parts and its applicable `_user_stories.md`, `_dx.md`, `_uiux.md`, and `_tests.md` contracts. Task decomposition consumes that spec. Bundled `implement-tasks` and `review-and-fix` are offered as explicit actions when their inputs and prerequisites are satisfied. Loop settings such as verification gates and attempt ceilings remain CompozyOS-owned; Flow Dev displays effective values and permits only validated selections the runtime exposes.

### 4. Safe failure and recovery

Every new start rechecks the selected connection and runtime. Missing authentication, ineligible subscription access, incompatible model, unavailable host prerequisite, or uncertain health blocks the start with a specific user-facing reason. The author sees what happened and whether an administrator or host operator must resolve it. The administrator sees the corresponding Software diagnostic.

Repairing a connection or prerequisite never auto-starts a previously blocked task. The author must explicitly retry or start the eligible action after the check passes. Configuration changes do not reset planning, delete approved packages, or turn failed work into apparent success. Existing active attempts settle with an honest outcome if a connection is disconnected or a dependency disappears.

## Business Rules

1. Software configuration is global to the Flow Dev deployment and editable only by administrators. Task-level execution choice belongs to the task author under existing ownership and project access rules.
2. A connection has a stable identity independent of its display label. Renaming or replacing one cannot reattribute historical attempts or a task bound to the original connection.
3. Codex ChatGPT subscription login and OpenAI API-key billing are distinct paths. The required Codex connection never prompts for an API key. Account access is subject to the user's actual ChatGPT/Codex eligibility and limits; a displayed model list does not prove entitlement.
4. A connection is selectable only when authentication, supported provider/model/reasoning combination, compatible CompozyOS 0.3 runtime, and host prerequisites are all ready. Unknown or stale status fails closed for a new start. Catalog entries are candidates, not proof of account entitlement.
5. An eligible task with no saved flow and execution choice cannot start. Selection alone does not start an action. Each accepted attempt/run fixes all effective runtime-role bindings, checkout/worktree, and Loop definition/version; later actions require their own fresh validation and explicit confirmation.
6. Starting or retrying an action requires author permission, relevant approval, validated prerequisites, and an explicit action. Configuration never overrides these requirements. Legacy in-progress tasks retain their recorded route and packages.
7. Disconnecting a connection blocks new starts. Existing tasks and approved content remain readable; active attempts report their actual result rather than an assumed success.
8. Browser views, task metadata, events, errors, artifacts, and audit history expose no credential values, cached login files, repository tokens, or other secrets.
9. Changes to Compozy settings and connection state identify the acting administrator and time without recording sensitive values. Concurrent stale edits do not silently overwrite accepted state.
10. No setup failure or save operation may reset, truncate, or delete existing project/task data. This feature does not require a destructive database reset as an onboarding step.
11. The task picker derives model, reasoning, and Loop options from the pinned CompozyOS runtime and live capability checks; it never invents options from model names or the legacy local installation. `cy-create-spec` is a skill-driven session, not a bundled Loop.
12. A worktree must belong to the task's repository and be ready before binding. Creation, failure, disappearance, and cleanup never delete approved content or perform an automatic commit, push, pull request, or merge.
13. A new spec-driven task uses `_spec.md` as the canonical spec output. Existing approved `_prd.md`/`_techspec.md` packages remain immutable and readable under their legacy labels; no automatic conversion changes their review state.
14. A Flow Dev action invokes a bundled or workspace Loop only after reading its live declared inputs and validation result. A Loop version change between selection and start requires fresh review of that action; it is never silently substituted.

## User Experience

An administrator opens Software from global navigation and enters Compozy. A first-run checklist separates application settings, provider connections, runtime compatibility, and host prerequisites. The administrator saves valid non-secret settings, connects Codex through a browser-led ChatGPT flow or Claude through its supported Claude Code login, and sees each resulting account status. If machine preparation remains, the checklist names the missing capability and directs the host operator without presenting an unsafe one-click shortcut. The administrator can add or manage other supported connections and see non-secret change history.

On an eligible task, the author sees the available CompozyOS actions and Loops with their prerequisites, ready connections, supported models/reasoning levels, and eligible checkout/worktree options. The author chooses a flow and starts one action at a time. The unified spec and companion contracts are reviewed together; task creation and selected Loops are separate explicit actions. The task shows the confirmed runtime choice and provenance for each attempt and Loop run. Authorized readers see that metadata but no controls or credentials.

When a connection expires or a prerequisite fails, the task explains that Spec is blocked while preserving planning and earlier artifacts. Software shows the administrator/operator the related diagnostic. After repair, the author explicitly starts or retries; no hidden queue unexpectedly begins work. The UI uses the existing pt-BR language and Flow Dev visual patterns, with keyboard-accessible controls, readable status not dependent on color alone, and clear narrow-screen behavior.

## High-Level Technical Constraints

- Integrate with pinned CompozyOS 0.3 `cy-create-spec`, `cy-create-tasks`, Loop catalog/run, task ownership, artifact provenance, and pinned runtime compatibility. Replace the old environment-wide provider/model and separate-document route for new flows without destroying legacy state. The workspace-bound MCP projection cannot be treated as the full administrative control plane.
- Validate a browser-led ChatGPT subscription connection against the actual supported Codex/Compozy runtime and deployment environment before declaring it usable. Browser sign-in, provider authentication, and execution entitlement are separate states. No API-key fallback may be silently substituted for the user's subscription path.
- Keep account credentials server-side and scoped to authorized execution. Never mount the operator's entire personal Codex home or expose credentials to task authors or readers. The TechSpec determines safe storage, refresh, revocation, and container access.
- Authenticate Claude through a supported Claude Code subscription path, keep its account material isolated per connection, and never silently substitute an Anthropic API key or billing mode.
- Resolve model and reasoning choices from the pinned runtime's provider catalog and verify them during execution admission. Resolve existing or new worktrees through the runtime's workspace-bound worktree API and verify repository ownership and readiness.
- Distinguish application-managed values from host-managed prerequisites. Runtime image integrity, rootless isolation, outbound restrictions, workspace safety, and provider compatibility remain mandatory gates; diagnostics alone do not weaken them.
- Preserve existing PostgreSQL content and avoid destructive onboarding, implicit migrations, or environment rewrites. Any necessary persistence evolution belongs to the TechSpec and must be designed for the populated database.
- Define concurrency and recovery for simultaneous administrators, task starts, connection changes, restarts, and uncertain runtime outcomes without sacrificing existing approved content.

## Non-Goals (Out of Scope)

- Installing or reconfiguring Podman, provisioning privileged host resources, or replacing host-operator responsibilities through the browser; the user chose diagnostics and safe instructions for these dependencies.
- Automatic transition between spec, tasks, implementation, and review; every action requires an explicit author start. Implementation and review are available through selected CompozyOS Loops, with no automatic push or publication.
- A generic terminal, arbitrary agent command runner, or administration console for unrelated Compozy installations. Software manages the Flow Dev Spec integration only.
- Editing or publishing generated repository artifacts through Software. Review, approval, and repository publication retain their existing boundaries.
- Forcing API-key billing for the Codex ChatGPT connection. Other supported providers may use their own explicit authentication method when configured.
- Treating `cy-create-spec` as a bundled Loop or running an arbitrary Loop without checking its live contract, task eligibility, inputs, and permissions.
- Requiring an external MCP client connection for the Software interface. MCP remains an optional operator/agent surface for the bounded Host API subset.

## Architecture Decision Records

- [ADR-001: Configure Compozy from a global Software area](adrs/adr-001.md) — Global administrator setup, in-app connections, and host diagnostics.
- [ADR-002: Choose the execution profile per task before Spec begins](adrs/adr-002.md) — Superseded by ADR-006 for new flows; retained for historical context.
- [ADR-003: Connect Codex with ChatGPT in-app without exposing credentials](adrs/adr-003.md) — Subscription-backed connection and safe account lifecycle.
- [ADR-004: Use pinned CompozyOS control contracts and catalog](adrs/adr-004.md) — HTTP/UDS for administrative capabilities; workspace-bound MCP only where its projected methods fit.
- [ADR-005: Bind provider capabilities and worktree to each action](adrs/adr-005.md) — Per-action provider, model, reasoning, and worktree provenance.
- [ADR-006: Follow the CompozyOS unified spec and Loop lifecycle](adrs/adr-006.md) — Unified `_spec.md` and explicit runtime-catalog actions supersede the legacy split-stage assumption.

## Open Questions

No unresolved product choice remains from the user's answers. The following feasibility and implementation dependencies must be resolved by `cy-create-techspec` rather than assumed:

1. Verify the supported browser-led ChatGPT connection mechanism for this deployment, including authorization return, eligibility checks, token refresh/revocation, and a headless container. If the required experience is not supported, report that incompatibility instead of substituting API-key billing.
2. Define the exact non-secret Software fields and persistence contract, how validated changes reach web admission and dedicated workers, and how active attempts retain their original configuration.
3. Validate the exact supported Claude Code browser/terminal login ceremony and account isolation on the execution host before declaring Claude selectable. The pinned runtime catalog and live provider negotiation determine model/reasoning options; a catalog listing alone does not prove subscription entitlement.
4. Design durable task binding, historical attempt provenance, authorization, concurrent edits/starts, and recovery on the populated database without destructive migration.
5. Define trustworthy host diagnostics and real validation of the pinned runtime image, agent, rootless network policy, workspace, documentation proxy, and resource limits before readiness is shown.
6. Define the exact safe migration boundary for tasks that already started the legacy split-stage route; preserve their approved packages and statuses even when new tasks use `_spec.md`.
