# User Stories: Compozy Software Configuration and Task-Level Selection

Canonical behavior catalog for the Compozy configuration complement. Companion to `_prd.md`; consumed by `_techspec.md` and `_tests.md`.

## Personas

- **Flow Dev administrator** — manages the global Software area, supported connections, and application-level Compozy settings without exposing credentials.
- **Execution host operator** — prepares host prerequisites outside the application and uses its diagnostics to identify what remains unavailable.
- **Task author** — selects one ready provider connection, model, reasoning level, and checkout/worktree on an eligible task before starting its Spec workflow.
- **Authorized reader** — observes task configuration and Spec results without changing them or seeing credentials.

## Story Index

| ID | Feature Area | Persona | Story |
| --- | --- | --- | --- |
| US-001 | Software access | Administrator | Find and enter global Compozy settings |
| US-002 | Runtime readiness | Administrator/operator | See actionable readiness and host prerequisites |
| US-003 | Runtime settings | Administrator | Save and validate application-level settings |
| US-004 | Account connection | Administrator | Connect Codex with a ChatGPT subscription in-app |
| US-005 | Account lifecycle | Administrator | Reconnect or disconnect an account safely |
| US-006 | Connection catalog | Administrator | Maintain multiple supported execution connections |
| US-007 | Task choice | Task author | Choose a ready runtime before each action starts |
| US-008 | Task continuity | Task author | Keep each accepted run's choice stable and attributable |
| US-009 | Blocked execution | Task author/operator | Recover from unavailable configuration without losing work |
| US-010 | Shared visibility | Authorized reader | Understand execution choice without credential access |
| US-011 | Change accountability | Administrator | See who changed configuration and when |
| US-012 | Claude connection | Administrator | Connect Claude Code without confusing subscription and API billing |
| US-013 | Runtime capability choice | Task author | Choose CompozyOS-advertised model and reasoning |
| US-014 | Worktree choice | Task author | Choose a ready checkout or CompozyOS worktree |
| US-015 | Flow choice | Task author | Choose a CompozyOS spec-driven flow and run each action explicitly |

## Software Access

### US-001: Find and enter global Compozy settings

**As a** Flow Dev administrator, **I want** a global Software area, **so that** I can configure Compozy once for the environment rather than per project.

Acceptance criteria:

- AC-1: Given an authenticated administrator, when they navigate the global application, then Software and its Compozy section are discoverable without entering a project.
- AC-2: Given an authenticated non-administrator, when they use the application or a direct link, then they cannot view or change Software configuration.
- AC-3: Given no Compozy configuration, when an administrator opens Software, then a first-run state explains what can be configured and what remains unavailable.

Edge cases:

- EC-1: A malformed or outdated direct link → a safe unavailable/not-found state, never a configuration dump.
- EC-2: Missing or expired session → sign-in recovery; no sensitive settings are rendered before authentication.
- EC-3: Administrator role is removed while the page is open → subsequent reads and writes are denied.
- EC-4: Two browser tabs enter Software concurrently → each sees saved state; navigation itself makes no change.
- EC-5: Page load is interrupted or retried → the same saved configuration is shown without duplication.
- EC-6: Many projects or connections exist → Software remains global and discoverable rather than repeated in each project.

## Runtime Readiness

### US-002: See actionable readiness and host prerequisites

**As an** administrator or execution host operator, **I want** a truthful Compozy readiness view, **so that** I know whether an author can start Spec and what must be fixed first.

Acceptance criteria:

- AC-1: Given any setup state, when the administrator opens Compozy settings, then application settings, account connection, runtime compatibility, and host isolation each have a separate current status.
- AC-2: Given a failed prerequisite, when it is inspected, then the view identifies the affected capability and the next safe action, including when host operator work is required.
- AC-3: Given all required checks pass for a connection, then it is marked ready for task selection; account login alone never marks the whole runtime ready.
- AC-4: Given a host prerequisite that needs machine administration, then the UI diagnoses and explains it without claiming to install or bypass it.

Edge cases:

- EC-1: A check returns malformed or contradictory information → status is unknown/incompatible, never ready by default.
- EC-2: No runtime image, host, or connection exists → each absence is identified separately with a first-run explanation.
- EC-3: A check times out or the page disconnects → last-known status is labeled stale and refreshed before a new start.
- EC-4: Readiness changes during two simultaneous views → a later start uses a fresh check; old green indicators cannot authorize it.
- EC-5: A previously ready dependency disappears or changes version → affected connections become unavailable for new starts; saved task content remains.
- EC-6: Many connections share one failed host prerequisite → the common issue is visible once and each affected option is marked unavailable.

## Runtime Settings

### US-003: Save and validate application-level settings

**As a** Flow Dev administrator, **I want** to provide Compozy's required non-secret settings in Software, **so that** the worker can use an explicit, reviewable configuration.

Acceptance criteria:

- AC-1: Given a supported setting, when the administrator saves a valid value, then the saved value and resulting readiness state are shown.
- AC-2: Given a missing, invalid, or incompatible value, then it is rejected with a specific explanation; the previous valid configuration remains effective.
- AC-3: Given a change that would affect execution, then new starts use the newly validated configuration while already saved Spec packages remain attributable to their original settings.
- AC-4: Secret values and raw login material are never editable as ordinary text settings or returned in the page.

Edge cases:

- EC-1: Blank, malformed, overly long, or hostile input → rejected with a field-specific message and no partial activation.
- EC-2: First-run state has no required values → save is blocked until required values are present; unrelated existing app data remains intact.
- EC-3: Non-administrator or expired session submits a saved form → denied without changing settings.
- EC-4: Two administrators save different versions concurrently → stale save is rejected or explicitly reconciled; neither silently overwrites the other.
- EC-5: Save is retried after a lost response → the visible result reflects one effective change, not duplicate configuration.
- EC-6: A dependency changes after a successful save → readiness becomes unavailable for new starts until revalidated.

## Account Connection

### US-004: Connect Codex with a ChatGPT subscription in-app

**As a** Flow Dev administrator, **I want** to connect Codex through my ChatGPT account in Software, **so that** Spec can use my eligible subscription without an OpenAI API key or terminal login.

Acceptance criteria:

- AC-1: Given an unconnected Codex option, when the administrator starts connection, then the application guides them through ChatGPT authorization and returns a clear connected or failed state.
- AC-2: Given a successful authorization, then the menu shows the connected account's non-secret identity and authentication status; it does not display tokens or login files.
- AC-3: Given an account that is authenticated but lacks eligible Codex access, then the menu shows unavailable access rather than connected-and-ready.
- AC-4: Codex's ChatGPT subscription path never requires an OpenAI API key or API billing setup.

Edge cases:

- EC-1: Invalid, expired, or mismatched authorization response → connection fails safely without replacing a previously working account.
- EC-2: User closes the browser flow, declines consent, or loses connection → the menu returns to an honest unconnected/pending state with retry.
- EC-3: A non-administrator initiates or follows a connection link → denied without exposing authorization material.
- EC-4: Two connection attempts overlap → only the intended confirmed attempt can change the connection; stale callbacks are rejected.
- EC-5: A successful callback is delivered twice → one connected state, not two profiles or a second account swap.
- EC-6: Login succeeds while the runtime remains unavailable → account status is connected but execution remains blocked with its separate reason.

### US-005: Reconnect or disconnect an account safely

**As a** Flow Dev administrator, **I want** to repair or remove a Codex connection in Software, **so that** an expired or unwanted account is not silently used.

Acceptance criteria:

- AC-1: Given an expired, revoked, or failed login, when the administrator opens Software, then the problem and a reconnect action are visible.
- AC-2: Given a reconnection, then future task starts use only the verified new connection state; existing task choices and artifacts remain intact.
- AC-3: Given a deliberate disconnect, then the connection becomes unavailable for new starts immediately, without deleting tasks or approved Spec packages.
- AC-4: If an attempt is active during disconnect, then the administrator sees its presence and the product reports its eventual outcome honestly rather than marking it successful by assumption.

Edge cases:

- EC-1: Reconnect with an ineligible or different account → no silent account substitution; the administrator sees the identity and must confirm the intended change.
- EC-2: No connection exists → reconnect is presented as connect; disconnect is unavailable.
- EC-3: Non-administrator or expired session requests disconnect → denied; current connection remains unchanged.
- EC-4: Disconnect and task start race → start is accepted only if the connection is valid at execution admission; otherwise the task remains unchanged.
- EC-5: Disconnect response is interrupted or repeated → eventual status is clear and the operation does not delete content twice.
- EC-6: A previously chosen task references a disconnected profile → it retains the choice and history; a later action requires reconnection or a newly confirmed ready connection.

## Connection Catalog

### US-006: Maintain multiple supported execution connections

**As a** Flow Dev administrator, **I want** to register and distinguish multiple supported provider connections, **so that** different tasks can use different options without changing one global active provider.

Acceptance criteria:

- AC-1: Given more than one supported connection, then Software lists each with a distinct label, provider, authentication status, readiness, and available models.
- AC-2: Given a newly supported provider, its connection can be added without replacing an existing Codex connection.
- AC-3: Given an unsupported provider or model, it cannot be marked ready or offered to task authors as if executable.
- AC-4: Changing a connection's visible label does not rewrite historical task choices or artifact provenance.

Edge cases:

- EC-1: Empty or duplicate label, unknown provider, or invalid model → rejected with a specific explanation.
- EC-2: Zero connections → useful empty state; no task receives a guessed default.
- EC-3: Non-administrator or cross-account actor attempts catalog changes → denied and no secret metadata leaked.
- EC-4: Two administrators add the same label simultaneously → one effective profile or an explicit conflict, never indistinguishable duplicates.
- EC-5: A connection is removed and recreated with the same label → historical tasks still identify the original connection, not the replacement.
- EC-6: The catalog grows substantially → administrators can find a connection and task authors can still identify ready choices without truncation or arbitrary omission.

## Task Choice and Continuity

### US-007: Choose a ready runtime before an action starts

**As a** task author, **I want** to select a ready provider connection and model for each selected action, **so that** each Spec skill or Loop run uses the runtime I intend.

Acceptance criteria:

- AC-1: Given an eligible action, the author sees ready connections and their models before that action starts.
- AC-2: Given a valid selection, the task shows the provider, connection label, model, and reasoning level and requires a separate explicit start.
- AC-3: Given no selection or an unavailable choice, that action cannot start and the author sees why.
- AC-4: Different tasks may save different choices concurrently without changing each other or the global connection catalog.

Edge cases:

- EC-1: Unknown profile, wrong provider/model pair, or stale selection request → rejected with the current available choices.
- EC-2: No ready connections or models → start disabled with an actionable explanation; approved planning remains available.
- EC-3: Reader, administrator who is not the author, or expired session attempts selection → denied under existing task ownership rules.
- EC-4: Two tabs save different choices for the same task → stale write conflicts; the author sees the saved current choice before starting.
- EC-5: Save is repeated after a lost response → one saved choice and no Spec attempt starts as a side effect.
- EC-6: Task is archived, action-ineligible, or its run has already started → that run's selection is unavailable rather than silently changed.

### US-008: Keep each accepted run's choice stable and attributable

**As a** task author, **I want** each accepted action to retain its effective execution choice, **so that** reviews and retries have understandable provenance even when later actions use another model or provider.

Acceptance criteria:

- AC-1: Before an action starts, the author can change its proposed selection among currently ready options.
- AC-2: Once an action starts, its provider, model, reasoning, and workspace choice are fixed for that attempt/run; a later action may use a separately confirmed choice.
- AC-3: Approving the unified spec or task list does not auto-start the next action or silently reuse an unconfirmed runtime.
- AC-4: Historical review packages and Loop runs show the option and definition version that produced them after connection or Loop changes.

Edge cases:

- EC-1: Author requests a model switch on an active attempt → refused for that attempt; a future action may be configured separately.
- EC-2: No attempt has started but the chosen option becomes unavailable → author may select another ready option before starting.
- EC-3: Duplicate action-start requests or concurrent retries → at most one valid run starts under the confirmed choice.
- EC-4: Worker disconnects or restarts mid-attempt → bound choice and attempt provenance survive recovery.
- EC-5: A later action is requested out of order → its prerequisites still apply; runtime selection does not bypass approval.
- EC-6: Very long task history → every package and attempt retains its attributable choice without hiding older versions.

## Blocked Execution and Visibility

### US-009: Recover from unavailable configuration without losing work

**As a** task author or execution host operator, **I want** a blocked Spec start to explain the configuration problem without losing task content, **so that** the correct person can resolve it safely.

Acceptance criteria:

- AC-1: Given a missing login, incompatible runtime, or unavailable host prerequisite, a new Spec start is blocked with a reason that distinguishes the affected layer.
- AC-2: The author sees a safe explanation and who can resolve it; administrators see the corresponding Software diagnostic.
- AC-3: Repairing the same connection or host prerequisite permits a fresh explicit start after revalidation; no queued attempt auto-runs unexpectedly.
- AC-4: Existing projects, tasks, messages, approved planning, and Spec artifacts remain intact after any setup failure or change.

Edge cases:

- EC-1: Check yields invalid or incomplete data → report unknown/unavailable, not ready.
- EC-2: No prior Spec work exists → planning and task remain readable; no empty artifact is fabricated.
- EC-3: Unauthorized reader follows a diagnostic link → only non-sensitive task status is visible; Software details remain restricted.
- EC-4: Prerequisite fails after the button is shown but before start → start is rejected safely; no partial success is displayed.
- EC-5: Recovery is retried or interrupted → current state can be refreshed; task content is neither reset nor duplicated.
- EC-6: A shared host outage affects many tasks → each task reports its blocked start while previously approved packages stay available.

### US-010: Understand execution choice without credential access

**As an** authorized task reader, **I want** to see which provider and model a Spec attempt used, **so that** I can interpret its artifacts without being able to change execution or inspect credentials.

Acceptance criteria:

- AC-1: Given access to a task, the reader sees the selected provider/model and attempt provenance as non-secret metadata.
- AC-2: The reader cannot select, change, connect, disconnect, or start execution unless existing ownership rules explicitly grant the action.
- AC-3: No task view, activity event, artifact, error, or downloadable response contains authentication tokens or raw login files.

Edge cases:

- EC-1: Historical profile was renamed or removed → reader sees stable historical identity and an unavailable marker when appropriate.
- EC-2: No choice or attempt exists → reader sees an honest not-selected state.
- EC-3: Task access is revoked mid-view → subsequent reads stop under existing access rules.
- EC-4: Metadata changes while a reader is viewing → refresh shows the current saved selection without granting actions.
- EC-5: Replayed, malformed, or long activity content → no secret is revealed or interpreted as configuration authority.
- EC-6: Large attempt history → provenance remains navigable and older decisions are not silently dropped.

## Change Accountability

### US-011: See who changed configuration and when

**As a** Flow Dev administrator, **I want** a non-secret history of Compozy configuration and connection state changes, **so that** I can understand why readiness or task options changed.

Acceptance criteria:

- AC-1: Successful settings, connection, reconnection, disconnection, and profile-catalog changes identify the acting administrator and time.
- AC-2: Failed or rejected changes do not appear as successful changes; sensitive values are never present in the history.
- AC-3: Task attempt provenance remains independent of later Software changes.

Edge cases:

- EC-1: Malformed change request → rejected and not recorded as a completed change.
- EC-2: No history exists → clear empty state, not a fabricated initial actor.
- EC-3: Non-administrator requests history → denied.
- EC-4: Two administrators make concurrent changes → history preserves the accepted order and any visible conflict.
- EC-5: Repeated or interrupted save → no misleading duplicate success entries.
- EC-6: History grows substantially → authorized administrators can find older entries without truncation; secrets remain absent.

## Additional Provider and Runtime Options

### US-012: Connect Claude Code as another execution provider

**As a** Flow Dev administrator, **I want** to connect Claude Code alongside Codex, **so that** task authors can choose either eligible account without replacing the global provider.

Acceptance criteria:

- AC-1: Software offers a Claude Code connection path supported by the pinned CompozyOS runtime and identifies whether it uses a Claude subscription or an explicitly chosen API billing path.
- AC-2: Successful Claude authentication shows only safe account identity, current auth state, and separate runtime readiness; Codex connections remain intact.
- AC-3: A Claude connection can be revalidated, reconnected, or disconnected with the same task-history and active-attempt safeguards as Codex.
- AC-4: Claude is offered to authors only when CompozyOS can execute the selected model with the verified connection; an auth success alone does not imply readiness.

Edge cases:

- EC-1: Claude login needs an interactive terminal or unavailable callback → Software provides a safe completion path or reports the exact operator action; it never claims a connection was made.
- EC-2: Claude subscription is not eligible for the selected model → option is unavailable with an account/model reason, without silently switching to API billing.
- EC-3: Codex and Claude auth are both present → one connection's refresh or disconnect does not overwrite the other's credentials or labels.
- EC-4: Two Claude login attempts overlap or a completion repeats → only the current, verified attempt changes that connection once.
- EC-5: An active Claude attempt loses authentication → it reports its actual result; approved content and future selection remain intact.
- EC-6: An unauthorized actor requests Claude status or login → no account details, credentials, or mutable state are disclosed.

### US-013: Choose a model and reasoning level from CompozyOS

**As a** task author, **I want** to see the models and reasoning levels CompozyOS actually supports for my connection, **so that** I can choose the intended execution behavior before Spec begins.

Acceptance criteria:

- AC-1: For a ready connection, the task picker shows only models advertised by the pinned CompozyOS catalog and their supported reasoning choices, including provider default when applicable.
- AC-2: Saving the choice displays the exact provider, model identifier, and reasoning setting; it does not start an action.
- AC-3: A new start revalidates the chosen combination through CompozyOS; unsupported or unavailable combinations block with a specific explanation.
- AC-4: Each accepted attempt/run fixes and records its own model and reasoning choice; a later action requires fresh confirmation.

Edge cases:

- EC-1: Catalog is stale, empty, or unavailable → no guessed models or reasoning options appear as ready.
- EC-2: Model advertises no explicit reasoning controls → only provider default is offered, without inventing levels from the model name.
- EC-3: Advertised model is rejected by live provider negotiation or account entitlement → start fails safely and prompts revalidation or connection repair.
- EC-4: Catalog changes after a choice is saved but before first start → author may update the unbound choice; the stale choice cannot start.
- EC-5: Model or reasoning becomes unavailable after one run → its provenance remains; the next action blocks or requests a newly confirmed ready choice.
- EC-6: Replayed or malformed model/reasoning identifiers → rejected before attempt creation without modifying approved planning.

### US-014: Choose a checkout or CompozyOS worktree

**As a** task author, **I want** to choose an isolated checkout or a worktree for the Spec task, **so that** the execution uses the intended repository context without touching another task's working files.

Acceptance criteria:

- AC-1: Before the first attempt, the picker offers the existing isolated checkout, ready worktrees belonging to the task's project repository, and managed worktree creation when supported.
- AC-2: The task shows the chosen workspace mode and safe worktree identity or creation state before start; choosing it alone does not run Spec.
- AC-3: Each accepted action binds a resolved checkout/worktree and records it on that run and its packages; the next action may use a separately confirmed context.
- AC-4: Worktree creation, reuse, and cleanup never commit, push, merge, or delete approved task artifacts automatically.

Edge cases:

- EC-1: Worktree belongs to another repository or is not ready → it is not selectable and the start is blocked if it becomes invalid later.
- EC-2: Managed worktree creation fails or is interrupted → task remains unstarted with a retryable diagnostic; no partial success appears.
- EC-3: Two tasks select the same writable worktree → the second start is blocked unless the runtime proves exclusive ownership.
- EC-4: Worktree is removed, moved, or dirtied after selection → a fresh start check blocks or requests an explicit safe recovery; it never silently uses the root checkout.
- EC-5: Worker restarts during an action → it resumes against the same bound worktree or reports a blocked/failed attempt with the original identity retained.
- EC-6: User-owned worktree is no longer needed → Flow Dev never deletes it automatically; managed worktree cleanup requires an explicit safe lifecycle rule.

## CompozyOS Flow

### US-015: Choose a CompozyOS spec-driven flow and run each action explicitly

**As a** task author, **I want** to determine which CompozyOS-supported steps my task uses, **so that** I can create a spec, decompose tasks, and optionally implement or review without a hidden workflow transition.

Acceptance criteria:

- AC-1: The author sees `cy-create-spec` as a skill-driven unified `_spec.md` action, `cy-create-tasks` after approved spec, and eligible bundled or workspace Loops from the live catalog with their declared inputs.
- AC-2: The author can save a compatible flow choice and inspect its order, approval gates, effective runtime selections, Loop versions, and stop conditions before starting any action.
- AC-3: Each action starts only after its own explicit author command, current permission and prerequisite checks, and live CompozyOS validation; success of one action never starts the next.
- AC-4: New spec runs produce `_spec.md` with Product and Technical parts plus applicable companion contracts; older approved PRD/Tech Spec packages remain readable under their original labels.
- AC-5: A selected `implement-tasks` or `review-and-fix` Loop exposes its actual run state and terminal outcome; no successful-looking state is inferred from a timed-out request.

Edge cases:

- EC-1: The CompozyOS Loop catalog is unavailable, disabled, or changes version → affected actions are unavailable or require renewed confirmation; no stale definition runs silently.
- EC-2: A workspace Loop needs undeclared, unsafe, or unavailable inputs → it is excluded with a reason; Flow Dev never invents values to make it runnable.
- EC-3: Author selects implementation before tasks are approved → start is blocked with the missing prerequisite, leaving earlier artifacts intact.
- EC-4: A Loop run fails, stalls, exhausts its limits, or is canceled → its actual terminal outcome and evidence are shown; no next action starts.
- EC-5: A task already has legacy split-stage attempts → its route and approved packages remain unchanged; no automatic conversion or duplicate spec is created.
- EC-6: Two tabs start the same action or a response is lost → one accepted run and a recoverable status view, not duplicate execution.
