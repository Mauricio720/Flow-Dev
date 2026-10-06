# Test Specification: CompozyOS Software Configuration and Task Flow Choice

Canonical contract for [_techspec.md](_techspec.md), [_dx.md](_dx.md), and [_uiux.md](_uiux.md). The `_spec.md` mentioned in cases below is the future application-generated artifact. IDs are stable. Each case owns one observable result; the coverage matrix includes every story and edge case.

## Strategy

- Vitest unit tests fake only external I/O; Drizzle integration tests use a migrated populated PostgreSQL fixture and real service/controller/router wiring. Pinned CompozyOS contract fixtures exercise HTTP/UDS adapters.
- `task-required` covers one changed boundary; `feature-gate` covers cross-component behavior; `qa-release` covers browser, account, Podman, and live provider journeys.
- Tests retain all legacy Spec fixtures and approved packages. No destructive reset or provider token is part of automated test data.

## Coverage Matrix

| Source | Behavior | Owner ID | Tier |
| --- | --- | --- | --- |
| US-001 | Find and enter global Compozy settings | IT-001 | feature-gate |
| US-001.EC-1 | A malformed or outdated direct link | IT-002 | task-required |
| US-001.EC-2 | Missing or expired session | IT-003 | task-required |
| US-001.EC-3 | Administrator role is removed while the page is open | IT-004 | task-required |
| US-001.EC-4 | Two browser tabs enter Software concurrently | IT-005 | task-required |
| US-001.EC-5 | Page load is interrupted or retried | IT-006 | task-required |
| US-001.EC-6 | Many projects or connections exist | IT-007 | task-required |
| US-002 | See actionable readiness and host prerequisites | IT-008 | feature-gate |
| US-002.EC-1 | A check returns malformed or contradictory information | IT-009 | task-required |
| US-002.EC-2 | No runtime image, host, or connection exists | IT-010 | task-required |
| US-002.EC-3 | A check times out or the page disconnects | IT-011 | task-required |
| US-002.EC-4 | Readiness changes during two simultaneous views | IT-012 | task-required |
| US-002.EC-5 | A previously ready dependency disappears or changes version | IT-013 | task-required |
| US-002.EC-6 | Many connections share one failed host prerequisite | IT-014 | task-required |
| US-003 | Save and validate application-level settings | IT-015 | feature-gate |
| US-003.EC-1 | Blank, malformed, overly long, or hostile input | IT-016 | task-required |
| US-003.EC-2 | First-run state has no required values | IT-017 | task-required |
| US-003.EC-3 | Non-administrator or expired session submits a saved form | IT-018 | task-required |
| US-003.EC-4 | Two administrators save different versions concurrently | IT-019 | task-required |
| US-003.EC-5 | Save is retried after a lost response | IT-020 | task-required |
| US-003.EC-6 | A dependency changes after a successful save | IT-021 | task-required |
| US-004 | Connect Codex with a ChatGPT subscription in-app | IT-022 | feature-gate |
| US-004.EC-1 | Invalid, expired, or mismatched authorization response | IT-023 | feature-gate |
| US-004.EC-2 | User closes the browser flow, declines consent, or loses connection | IT-024 | feature-gate |
| US-004.EC-3 | A non-administrator initiates or follows a connection link | IT-025 | feature-gate |
| US-004.EC-4 | Two connection attempts overlap | IT-026 | feature-gate |
| US-004.EC-5 | A successful callback is delivered twice | IT-027 | feature-gate |
| US-004.EC-6 | Login succeeds while the runtime remains unavailable | IT-028 | feature-gate |
| US-005 | Reconnect or disconnect an account safely | IT-029 | feature-gate |
| US-005.EC-1 | Reconnect with an ineligible or different account | IT-030 | task-required |
| US-005.EC-2 | No connection exists | IT-031 | task-required |
| US-005.EC-3 | Non-administrator or expired session requests disconnect | IT-032 | task-required |
| US-005.EC-4 | Disconnect and task start race | IT-033 | task-required |
| US-005.EC-5 | Disconnect response is interrupted or repeated | IT-034 | task-required |
| US-005.EC-6 | A previously chosen task references a disconnected profile | IT-035 | task-required |
| US-006 | Maintain multiple supported execution connections | IT-036 | feature-gate |
| US-006.EC-1 | Empty or duplicate label, unknown provider, or invalid model | IT-037 | task-required |
| US-006.EC-2 | Zero connections | IT-038 | task-required |
| US-006.EC-3 | Non-administrator or cross-account actor attempts catalog changes | IT-039 | task-required |
| US-006.EC-4 | Two administrators add the same label simultaneously | IT-040 | task-required |
| US-006.EC-5 | A connection is removed and recreated with the same label | IT-041 | task-required |
| US-006.EC-6 | The catalog grows substantially | IT-042 | task-required |
| US-007 | Choose a ready runtime before an action starts | IT-043 | feature-gate |
| US-007.EC-1 | Unknown profile, wrong provider/model pair, or stale selection request | IT-044 | task-required |
| US-007.EC-2 | No ready connections or models | IT-045 | task-required |
| US-007.EC-3 | Reader, administrator who is not the author, or expired session attempts selection | IT-046 | task-required |
| US-007.EC-4 | Two tabs save different choices for the same task | IT-047 | task-required |
| US-007.EC-5 | Save is repeated after a lost response | IT-048 | task-required |
| US-007.EC-6 | Task is archived, action-ineligible, or its run has already started | IT-049 | task-required |
| US-008 | Keep each accepted run's choice stable and attributable | IT-050 | feature-gate |
| US-008.EC-1 | Author requests a model switch on an active attempt | IT-051 | task-required |
| US-008.EC-2 | No attempt has started but the chosen option becomes unavailable | IT-052 | task-required |
| US-008.EC-3 | Duplicate action-start requests or concurrent retries | IT-053 | task-required |
| US-008.EC-4 | Worker disconnects or restarts mid-attempt | IT-054 | task-required |
| US-008.EC-5 | A later action is requested out of order | IT-055 | task-required |
| US-008.EC-6 | Very long task history | IT-056 | task-required |
| US-009 | Recover from unavailable configuration without losing work | IT-057 | feature-gate |
| US-009.EC-1 | Check yields invalid or incomplete data | IT-058 | task-required |
| US-009.EC-2 | No prior Spec work exists | IT-059 | task-required |
| US-009.EC-3 | Unauthorized reader follows a diagnostic link | IT-060 | task-required |
| US-009.EC-4 | Prerequisite fails after the button is shown but before start | IT-061 | task-required |
| US-009.EC-5 | Recovery is retried or interrupted | IT-062 | task-required |
| US-009.EC-6 | A shared host outage affects many tasks | IT-063 | task-required |
| US-010 | Understand execution choice without credential access | IT-064 | feature-gate |
| US-010.EC-1 | Historical profile was renamed or removed | IT-065 | task-required |
| US-010.EC-2 | No choice or attempt exists | IT-066 | task-required |
| US-010.EC-3 | Task access is revoked mid-view | IT-067 | task-required |
| US-010.EC-4 | Metadata changes while a reader is viewing | IT-068 | task-required |
| US-010.EC-5 | Replayed, malformed, or long activity content | IT-069 | task-required |
| US-010.EC-6 | Large attempt history | IT-070 | task-required |
| US-011 | See who changed configuration and when | IT-071 | feature-gate |
| US-011.EC-1 | Malformed change request | IT-072 | task-required |
| US-011.EC-2 | No history exists | IT-073 | task-required |
| US-011.EC-3 | Non-administrator requests history | IT-074 | task-required |
| US-011.EC-4 | Two administrators make concurrent changes | IT-075 | task-required |
| US-011.EC-5 | Repeated or interrupted save | IT-076 | task-required |
| US-011.EC-6 | History grows substantially | IT-077 | task-required |
| US-012 | Connect Claude Code as another execution provider | IT-078 | feature-gate |
| US-012.EC-1 | Claude login needs an interactive terminal or unavailable callback | IT-079 | feature-gate |
| US-012.EC-2 | Claude subscription is not eligible for the selected model | IT-080 | feature-gate |
| US-012.EC-3 | Codex and Claude auth are both present | IT-081 | feature-gate |
| US-012.EC-4 | Two Claude login attempts overlap or a completion repeats | IT-082 | feature-gate |
| US-012.EC-5 | An active Claude attempt loses authentication | IT-083 | feature-gate |
| US-012.EC-6 | An unauthorized actor requests Claude status or login | IT-084 | feature-gate |
| US-013 | Choose a model and reasoning level from CompozyOS | IT-085 | feature-gate |
| US-013.EC-1 | Catalog is stale, empty, or unavailable | IT-086 | task-required |
| US-013.EC-2 | Model advertises no explicit reasoning controls | IT-087 | task-required |
| US-013.EC-3 | Advertised model is rejected by live provider negotiation or account entitlement | IT-088 | task-required |
| US-013.EC-4 | Catalog changes after a choice is saved but before first start | IT-089 | task-required |
| US-013.EC-5 | Model or reasoning becomes unavailable after one run | IT-090 | task-required |
| US-013.EC-6 | Replayed or malformed model/reasoning identifiers | IT-091 | task-required |
| US-014 | Choose a checkout or CompozyOS worktree | IT-092 | feature-gate |
| US-014.EC-1 | Worktree belongs to another repository or is not ready | IT-093 | feature-gate |
| US-014.EC-2 | Managed worktree creation fails or is interrupted | IT-094 | feature-gate |
| US-014.EC-3 | Two tasks select the same writable worktree | IT-095 | feature-gate |
| US-014.EC-4 | Worktree is removed, moved, or dirtied after selection | IT-096 | feature-gate |
| US-014.EC-5 | Worker restarts during an action | IT-097 | feature-gate |
| US-014.EC-6 | User-owned worktree is no longer needed | IT-098 | feature-gate |
| US-015 | Choose a CompozyOS spec-driven flow and run each action explicitly | IT-099 | feature-gate |
| US-015.EC-1 | The CompozyOS Loop catalog is unavailable, disabled, or changes version | IT-100 | task-required |
| US-015.EC-2 | A workspace Loop needs undeclared, unsafe, or unavailable inputs | IT-101 | task-required |
| US-015.EC-3 | Author selects implementation before tasks are approved | IT-102 | task-required |
| US-015.EC-4 | A Loop run fails, stalls, exhausts its limits, or is canceled | IT-103 | task-required |
| US-015.EC-5 | A task already has legacy split-stage attempts | IT-104 | task-required |
| US-015.EC-6 | Two tabs start the same action or a response is lost | IT-105 | task-required |
| SoftwareService/admin | Authorization and CAS | UT-001–UT-004 | task-required |
| CredentialBroker | Login safety | UT-005–UT-007 | task-required |
| CapabilityGateway | Catalog/reasoning errors | UT-008–UT-010 | task-required |
| WorktreePolicy | Repository and concurrency | UT-011–UT-012 | task-required |
| LoopPlanValidator | Definition/input/runtime-role errors | UT-013–UT-014, UT-021 | task-required |
| TaskFlowService | Progression/idempotency | UT-015–UT-016 | task-required |
| ArtifactValidator/LegacyProjection | New and old packages | UT-017–UT-018 | task-required |
| RuntimeErrorMapper/WorkerReconciler | Failure and uncertainty | UT-019–UT-020 | task-required |
| `taskFlow.approvePackage` | Exact-version success/conflict | IT-106–IT-107 | feature-gate |
| `taskFlow.cancelRun` | Cancellation and unknown run | IT-108–IT-109 | feature-gate |
| `taskFlow.retryAction` | Fresh run and active conflict | IT-110–IT-111 | feature-gate |
| Software settings fields | Valid and invalid values | UT-022, IT-112–IT-113 | task-required/feature-gate |
| Loop runtime inputs | Multi-role binding and invalid role | UT-021, IT-114–IT-115 | task-required/feature-gate |

## Unit Tests

Each test uses a real service/policy with only I/O boundaries faked. Classes are shown in parentheses.

- **UT-001** (`task-required`, happy): SoftwareService.requireAdmin accepts an active administrator principal and returns safe settings.
- **UT-002** (`task-required`, error): SoftwareService.requireAdmin receives an authenticated non-admin principal and returns FORBIDDEN before loading connection rows.
- **UT-003** (`task-required`, concurrency): settings CAS receives expectedRevision=4 after revision 5 was committed and returns plan_version_changed without writing.
- **UT-004** (`task-required`, idempotency): replayed saveSettings idempotencyKey returns the first accepted revision and writes one audit row.
- **UT-005** (`task-required`, error): CredentialBroker receives an expired Codex login operation and leaves the prior connection revision active.
- **UT-006** (`task-required`, state): CredentialBroker receives a duplicate confirmed device-code completion and returns the existing connection revision.
- **UT-007** (`task-required`, error): Claude login status reports API billing when subscription was requested and returns auth_ineligible without switching modes.
- **UT-008** (`task-required`, boundary): CapabilityGateway receives available_stale for gpt-5.6-sol and marks it unselectable.
- **UT-009** (`task-required`, happy): CapabilityGateway receives available_live with reasoning_efforts=[low,high] and returns exactly low, high, and provider default.
- **UT-010** (`task-required`, error): CapabilityGateway receives reasoning_effort=medium outside [low,high] and returns reasoning_effort_unsupported.
- **UT-011** (`task-required`, error): WorktreePolicy receives a worktree whose repository ID differs from the task repository and returns worktree_not_ready.
- **UT-012** (`task-required`, concurrency): WorktreePolicy sees an active write run on worktree wt-1 and denies a second task's write start.
- **UT-013** (`task-required`, error): LoopPlanValidator sees selected version 2 while the live definition is version 3 and returns loop_version_changed.
- **UT-014** (`task-required`, error): LoopPlanValidator sees an undeclared required input and returns loop_input_invalid before dispatch.
- **UT-015** (`task-required`, state): TaskFlowService receives an approved unified spec and makes create_tasks startable without starting it.
- **UT-016** (`task-required`, idempotency): TaskFlowService receives the same startAction key twice and resolves to one run ID.
- **UT-017** (`task-required`, error): ArtifactValidator sees _spec.md without a Technical part and returns package_invalid without creating a review package.
- **UT-018** (`task-required`, state): LegacyProjection reads an approved PRD/Tech Spec workflow and returns its existing labels and package IDs unchanged.
- **UT-019** (`task-required`, error): RuntimeErrorMapper receives a provider 422 model_unavailable response and returns a safe PRECONDITION_FAILED code without upstream body.
- **UT-020** (`task-required`, state): WorkerReconciler sees an unknown Loop start result and keeps the run reconciling until the authoritative runtime status arrives.
- **UT-021** (`task-required`, error): LoopPlanValidator receives `implement-tasks` with declared `backend_runtime` and `frontend_runtime` but only a `backend_runtime` binding, and returns `loop_runtime_binding_missing` before admission.
- **UT-022** (`task-required`, boundary): Software settings validation accepts `maxActiveActions=4` and rejects `5` with `max_active_actions_out_of_range`.

## Integration Tests

Each case runs the named public route/procedure through authorization, application service, and persisted state. CompozyOS responses are served by a contract fixture unless the tier explicitly requires live QA.

- **IT-001** (`feature-gate`): GET /admin/software/compozy and software.compozy.get — Given an authenticated administrator, when they navigate the global application, then Software and its Compozy section are discoverable without entering a project.
- **IT-002** (`task-required`): GET /admin/software/compozy and software.compozy.get — given a malformed or outdated direct link, expect a safe unavailable/not-found state, never a configuration dump.
- **IT-003** (`task-required`): GET /admin/software/compozy and software.compozy.get — given missing or expired session, expect sign-in recovery; no sensitive settings are rendered before authentication.
- **IT-004** (`task-required`): GET /admin/software/compozy and software.compozy.get — given administrator role is removed while the page is open, expect subsequent reads and writes are denied.
- **IT-005** (`task-required`): GET /admin/software/compozy and software.compozy.get — given two browser tabs enter Software concurrently, expect each sees saved state; navigation itself makes no change.
- **IT-006** (`task-required`): GET /admin/software/compozy and software.compozy.get — given page load is interrupted or retried, expect the same saved configuration is shown without duplication.
- **IT-007** (`task-required`): GET /admin/software/compozy and software.compozy.get — given many projects or connections exist, expect Software remains global and discoverable rather than repeated in each project.
- **IT-008** (`feature-gate`): software.compozy.readiness — Given any setup state, when the administrator opens Compozy settings, then application settings, account connection, runtime compatibility, and host isolation each have a separate current status.
- **IT-009** (`task-required`): software.compozy.readiness — given a check returns malformed or contradictory information, expect status is unknown/incompatible, never ready by default.
- **IT-010** (`task-required`): software.compozy.readiness — given no runtime image, host, or connection exists, expect each absence is identified separately with a first-run explanation.
- **IT-011** (`task-required`): software.compozy.readiness — given a check times out or the page disconnects, expect last-known status is labeled stale and refreshed before a new start.
- **IT-012** (`task-required`): software.compozy.readiness — given readiness changes during two simultaneous views, expect a later start uses a fresh check; old green indicators cannot authorize it.
- **IT-013** (`task-required`): software.compozy.readiness — given a previously ready dependency disappears or changes version, expect affected connections become unavailable for new starts; saved task content remains.
- **IT-014** (`task-required`): software.compozy.readiness — given many connections share one failed host prerequisite, expect the common issue is visible once and each affected option is marked unavailable.
- **IT-015** (`feature-gate`): software.compozy.saveSettings — Given a supported setting, when the administrator saves a valid value, then the saved value and resulting readiness state are shown.
- **IT-016** (`task-required`): software.compozy.saveSettings — given blank, malformed, overly long, or hostile input, expect rejected with a field-specific message and no partial activation.
- **IT-017** (`task-required`): software.compozy.saveSettings — given first-run state has no required values, expect save is blocked until required values are present; unrelated existing app data remains intact.
- **IT-018** (`task-required`): software.compozy.saveSettings — given non-administrator or expired session submits a saved form, expect denied without changing settings.
- **IT-019** (`task-required`): software.compozy.saveSettings — given two administrators save different versions concurrently, expect stale save is rejected or explicitly reconciled; neither silently overwrites the other.
- **IT-020** (`task-required`): software.compozy.saveSettings — given save is retried after a lost response, expect the visible result reflects one effective change, not duplicate configuration.
- **IT-021** (`task-required`): software.compozy.saveSettings — given a dependency changes after a successful save, expect readiness becomes unavailable for new starts until revalidated.
- **IT-022** (`feature-gate`): software.compozy.beginCodexLogin/pollLogin/confirmAccount — Given an unconnected Codex option, when the administrator starts connection, then the application guides them through ChatGPT authorization and returns a clear connected or failed state.
- **IT-023** (`feature-gate`): software.compozy.beginCodexLogin/pollLogin/confirmAccount — given invalid, expired, or mismatched authorization response, expect connection fails safely without replacing a previously working account.
- **IT-024** (`feature-gate`): software.compozy.beginCodexLogin/pollLogin/confirmAccount — given user closes the browser flow, declines consent, or loses connection, expect the menu returns to an honest unconnected/pending state with retry.
- **IT-025** (`feature-gate`): software.compozy.beginCodexLogin/pollLogin/confirmAccount — given a non-administrator initiates or follows a connection link, expect denied without exposing authorization material.
- **IT-026** (`feature-gate`): software.compozy.beginCodexLogin/pollLogin/confirmAccount — given two connection attempts overlap, expect only the intended confirmed attempt can change the connection; stale callbacks are rejected.
- **IT-027** (`feature-gate`): software.compozy.beginCodexLogin/pollLogin/confirmAccount — given a successful callback is delivered twice, expect one connected state, not two profiles or a second account swap.
- **IT-028** (`feature-gate`): software.compozy.beginCodexLogin/pollLogin/confirmAccount — given login succeeds while the runtime remains unavailable, expect account status is connected but execution remains blocked with its separate reason.
- **IT-029** (`feature-gate`): software.compozy.disconnect/confirmAccount — Given an expired, revoked, or failed login, when the administrator opens Software, then the problem and a reconnect action are visible.
- **IT-030** (`task-required`): software.compozy.disconnect/confirmAccount — given reconnect with an ineligible or different account, expect no silent account substitution; the administrator sees the identity and must confirm the intended change.
- **IT-031** (`task-required`): software.compozy.disconnect/confirmAccount — given no connection exists, expect reconnect is presented as connect; disconnect is unavailable.
- **IT-032** (`task-required`): software.compozy.disconnect/confirmAccount — given non-administrator or expired session requests disconnect, expect denied; current connection remains unchanged.
- **IT-033** (`task-required`): software.compozy.disconnect/confirmAccount — given disconnect and task start race, expect start is accepted only if the connection is valid at execution admission; otherwise the task remains unchanged.
- **IT-034** (`task-required`): software.compozy.disconnect/confirmAccount — given disconnect response is interrupted or repeated, expect eventual status is clear and the operation does not delete content twice.
- **IT-035** (`task-required`): software.compozy.disconnect/confirmAccount — given a previously chosen task references a disconnected profile, expect it retains the choice and history; a later action requires reconnection or a newly confirmed ready connection.
- **IT-036** (`feature-gate`): software.compozy.connections/renameConnection — Given more than one supported connection, then Software lists each with a distinct label, provider, authentication status, readiness, and available models.
- **IT-037** (`task-required`): software.compozy.connections/renameConnection — given empty or duplicate label, unknown provider, or invalid model, expect rejected with a specific explanation.
- **IT-038** (`task-required`): software.compozy.connections/renameConnection — given zero connections, expect useful empty state; no task receives a guessed default.
- **IT-039** (`task-required`): software.compozy.connections/renameConnection — given non-administrator or cross-account actor attempts catalog changes, expect denied and no secret metadata leaked.
- **IT-040** (`task-required`): software.compozy.connections/renameConnection — given two administrators add the same label simultaneously, expect one effective profile or an explicit conflict, never indistinguishable duplicates.
- **IT-041** (`task-required`): software.compozy.connections/renameConnection — given a connection is removed and recreated with the same label, expect historical tasks still identify the original connection, not the replacement.
- **IT-042** (`task-required`): software.compozy.connections/renameConnection — given the catalog grows substantially, expect administrators can find a connection and task authors can still identify ready choices without truncation or arbitrary omission.
- **IT-043** (`feature-gate`): taskFlow.options/savePlan — Given an eligible action, the author sees ready connections and their models before that action starts.
- **IT-044** (`task-required`): taskFlow.options/savePlan — given unknown profile, wrong provider/model pair, or stale selection request, expect rejected with the current available choices.
- **IT-045** (`task-required`): taskFlow.options/savePlan — given no ready connections or models, expect start disabled with an actionable explanation; approved planning remains available.
- **IT-046** (`task-required`): taskFlow.options/savePlan — given reader, administrator who is not the author, or expired session attempts selection, expect denied under existing task ownership rules.
- **IT-047** (`task-required`): taskFlow.options/savePlan — given two tabs save different choices for the same task, expect stale write conflicts; the author sees the saved current choice before starting.
- **IT-048** (`task-required`): taskFlow.options/savePlan — given save is repeated after a lost response, expect one saved choice and no Spec attempt starts as a side effect.
- **IT-049** (`task-required`): taskFlow.options/savePlan — given task is archived, action-ineligible, or its run has already started, expect that run's selection is unavailable rather than silently changed.
- **IT-050** (`feature-gate`): taskFlow.startAction/runs — Before an action starts, the author can change its proposed selection among currently ready options.
- **IT-051** (`task-required`): taskFlow.startAction/runs — given author requests a model switch on an active attempt, expect refused for that attempt; a future action may be configured separately.
- **IT-052** (`task-required`): taskFlow.startAction/runs — given no attempt has started but the chosen option becomes unavailable, expect author may select another ready option before starting.
- **IT-053** (`task-required`): taskFlow.startAction/runs — given duplicate action-start requests or concurrent retries, expect at most one valid run starts under the confirmed choice.
- **IT-054** (`task-required`): taskFlow.startAction/runs — given worker disconnects or restarts mid-attempt, expect bound choice and attempt provenance survive recovery.
- **IT-055** (`task-required`): taskFlow.startAction/runs — given a later action is requested out of order, expect its prerequisites still apply; runtime selection does not bypass approval.
- **IT-056** (`task-required`): taskFlow.startAction/runs — given very long task history, expect every package and attempt retains its attributable choice without hiding older versions.
- **IT-057** (`feature-gate`): taskFlow.startAction/readiness — Given a missing login, incompatible runtime, or unavailable host prerequisite, a new Spec start is blocked with a reason that distinguishes the affected layer.
- **IT-058** (`task-required`): taskFlow.startAction/readiness — given check yields invalid or incomplete data, expect report unknown/unavailable, not ready.
- **IT-059** (`task-required`): taskFlow.startAction/readiness — given no prior Spec work exists, expect planning and task remain readable; no empty artifact is fabricated.
- **IT-060** (`task-required`): taskFlow.startAction/readiness — given unauthorized reader follows a diagnostic link, expect only non-sensitive task status is visible; Software details remain restricted.
- **IT-061** (`task-required`): taskFlow.startAction/readiness — given prerequisite fails after the button is shown but before start, expect start is rejected safely; no partial success is displayed.
- **IT-062** (`task-required`): taskFlow.startAction/readiness — given recovery is retried or interrupted, expect current state can be refreshed; task content is neither reset nor duplicated.
- **IT-063** (`task-required`): taskFlow.startAction/readiness — given a shared host outage affects many tasks, expect each task reports its blocked start while previously approved packages stay available.
- **IT-064** (`feature-gate`): taskFlow.byTask/runs — Given access to a task, the reader sees the selected provider/model and attempt provenance as non-secret metadata.
- **IT-065** (`task-required`): taskFlow.byTask/runs — given historical profile was renamed or removed, expect reader sees stable historical identity and an unavailable marker when appropriate.
- **IT-066** (`task-required`): taskFlow.byTask/runs — given no choice or attempt exists, expect reader sees an honest not-selected state.
- **IT-067** (`task-required`): taskFlow.byTask/runs — given task access is revoked mid-view, expect subsequent reads stop under existing access rules.
- **IT-068** (`task-required`): taskFlow.byTask/runs — given metadata changes while a reader is viewing, expect refresh shows the current saved selection without granting actions.
- **IT-069** (`task-required`): taskFlow.byTask/runs — given replayed, malformed, or long activity content, expect no secret is revealed or interpreted as configuration authority.
- **IT-070** (`task-required`): taskFlow.byTask/runs — given large attempt history, expect provenance remains navigable and older decisions are not silently dropped.
- **IT-071** (`feature-gate`): software.compozy.history — Successful settings, connection, reconnection, disconnection, and profile-catalog changes identify the acting administrator and time.
- **IT-072** (`task-required`): software.compozy.history — given malformed change request, expect rejected and not recorded as a completed change.
- **IT-073** (`task-required`): software.compozy.history — given no history exists, expect clear empty state, not a fabricated initial actor.
- **IT-074** (`task-required`): software.compozy.history — given non-administrator requests history, expect denied.
- **IT-075** (`task-required`): software.compozy.history — given two administrators make concurrent changes, expect history preserves the accepted order and any visible conflict.
- **IT-076** (`task-required`): software.compozy.history — given repeated or interrupted save, expect no misleading duplicate success entries.
- **IT-077** (`task-required`): software.compozy.history — given history grows substantially, expect authorized administrators can find older entries without truncation; secrets remain absent.
- **IT-078** (`feature-gate`): software.compozy.beginClaudeLogin/pollLogin — Software offers a Claude Code connection path supported by the pinned CompozyOS runtime and identifies whether it uses a Claude subscription or an explicitly chosen API billing path.
- **IT-079** (`feature-gate`): software.compozy.beginClaudeLogin/pollLogin — given claude login needs an interactive terminal or unavailable callback, expect Software provides a safe completion path or reports the exact operator action; it never claims a connection was made.
- **IT-080** (`feature-gate`): software.compozy.beginClaudeLogin/pollLogin — given claude subscription is not eligible for the selected model, expect option is unavailable with an account/model reason, without silently switching to API billing.
- **IT-081** (`feature-gate`): software.compozy.beginClaudeLogin/pollLogin — given codex and Claude auth are both present, expect one connection's refresh or disconnect does not overwrite the other's credentials or labels.
- **IT-082** (`feature-gate`): software.compozy.beginClaudeLogin/pollLogin — given two Claude login attempts overlap or a completion repeats, expect only the current, verified attempt changes that connection once.
- **IT-083** (`feature-gate`): software.compozy.beginClaudeLogin/pollLogin — given an active Claude attempt loses authentication, expect it reports its actual result; approved content and future selection remain intact.
- **IT-084** (`feature-gate`): software.compozy.beginClaudeLogin/pollLogin — given an unauthorized actor requests Claude status or login, expect no account details, credentials, or mutable state are disclosed.
- **IT-085** (`feature-gate`): taskFlow.options/startAction — For a ready connection, the task picker shows only models advertised by the pinned CompozyOS catalog and their supported reasoning choices, including provider default when applicable.
- **IT-086** (`task-required`): taskFlow.options/startAction — given catalog is stale, empty, or unavailable, expect no guessed models or reasoning options appear as ready.
- **IT-087** (`task-required`): taskFlow.options/startAction — given model advertises no explicit reasoning controls, expect only provider default is offered, without inventing levels from the model name.
- **IT-088** (`task-required`): taskFlow.options/startAction — given advertised model is rejected by live provider negotiation or account entitlement, expect start fails safely and prompts revalidation or connection repair.
- **IT-089** (`task-required`): taskFlow.options/startAction — given catalog changes after a choice is saved but before first start, expect author may update the unbound choice; the stale choice cannot start.
- **IT-090** (`task-required`): taskFlow.options/startAction — given model or reasoning becomes unavailable after one run, expect its provenance remains; the next action blocks or requests a newly confirmed ready choice.
- **IT-091** (`task-required`): taskFlow.options/startAction — given replayed or malformed model/reasoning identifiers, expect rejected before attempt creation without modifying approved planning.
- **IT-092** (`feature-gate`): taskFlow.options/startAction — Before the first attempt, the picker offers the existing isolated checkout, ready worktrees belonging to the task's project repository, and managed worktree creation when supported.
- **IT-093** (`feature-gate`): taskFlow.options/startAction — given worktree belongs to another repository or is not ready, expect it is not selectable and the start is blocked if it becomes invalid later.
- **IT-094** (`feature-gate`): taskFlow.options/startAction — given managed worktree creation fails or is interrupted, expect task remains unstarted with a retryable diagnostic; no partial success appears.
- **IT-095** (`feature-gate`): taskFlow.options/startAction — given two tasks select the same writable worktree, expect the second start is blocked unless the runtime proves exclusive ownership.
- **IT-096** (`feature-gate`): taskFlow.options/startAction — given worktree is removed, moved, or dirtied after selection, expect a fresh start check blocks or requests an explicit safe recovery; it never silently uses the root checkout.
- **IT-097** (`feature-gate`): taskFlow.options/startAction — given worker restarts during an action, expect it resumes against the same bound worktree or reports a blocked/failed attempt with the original identity retained.
- **IT-098** (`feature-gate`): taskFlow.options/startAction — given user-owned worktree is no longer needed, expect Flow Dev never deletes it automatically; managed worktree cleanup requires an explicit safe lifecycle rule.
- **IT-099** (`feature-gate`): taskFlow.savePlan/startAction/runs — The author sees `cy-create-spec` as a skill-driven unified `_spec.md` action, `cy-create-tasks` after approved spec, and eligible bundled or workspace Loops from the live catalog with their declared inputs.
- **IT-100** (`task-required`): taskFlow.savePlan/startAction/runs — given the CompozyOS Loop catalog is unavailable, disabled, or changes version, expect affected actions are unavailable or require renewed confirmation; no stale definition runs silently.
- **IT-101** (`task-required`): taskFlow.savePlan/startAction/runs — given a workspace Loop needs undeclared, unsafe, or unavailable inputs, expect it is excluded with a reason; Flow Dev never invents values to make it runnable.
- **IT-102** (`task-required`): taskFlow.savePlan/startAction/runs — given author selects implementation before tasks are approved, expect start is blocked with the missing prerequisite, leaving earlier artifacts intact.
- **IT-103** (`task-required`): taskFlow.savePlan/startAction/runs — given a Loop run fails, stalls, exhausts its limits, or is canceled, expect its actual terminal outcome and evidence are shown; no next action starts.
- **IT-104** (`task-required`): taskFlow.savePlan/startAction/runs — given a task already has legacy split-stage attempts, expect its route and approved packages remain unchanged; no automatic conversion or duplicate spec is created.
- **IT-105** (`task-required`): taskFlow.savePlan/startAction/runs — given two tabs start the same action or a response is lost, expect one accepted run and a recoverable status view, not duplicate execution.
- **IT-106** (`feature-gate`): `taskFlow.approvePackage` with an exact unified package version changes that package to approved.
- **IT-107** (`feature-gate`): `taskFlow.approvePackage` with a stale version returns `CONFLICT` without a state change.
- **IT-108** (`feature-gate`): `taskFlow.cancelRun` on a live Loop returns the authoritative CompozyOS terminal cancellation outcome.
- **IT-109** (`feature-gate`): `taskFlow.cancelRun` with an unknown run ID returns `PRECONDITION_FAILED`.
- **IT-110** (`feature-gate`): `taskFlow.retryAction` after a failed attempt creates a new run ID with a freshly confirmed runtime snapshot.
- **IT-111** (`feature-gate`): `taskFlow.retryAction` on an active action returns `CONFLICT`.
- **IT-112** (`feature-gate`): `software.compozy.saveSettings` with `enabled=true`, an HTTPS docs URL, and `maxActiveActions=2` commits revision 1.
- **IT-113** (`feature-gate`): `software.compozy.saveSettings` with an HTTP docs URL returns `docs_proxy_https_required` without changing revision.
- **IT-114** (`feature-gate`): Starting `implement-tasks` with `backend_runtime=codex/gpt-5.6-sol@high` and `frontend_runtime=claude/sonnet@medium` passes both declared runtime inputs to the pinned Loop.
- **IT-115** (`feature-gate`): Starting `implement-tasks` with an undeclared runtime role returns `loop_runtime_binding_invalid` before creating a run.

## End-to-End Tests

- **E2E-001** (`qa-release`): Administrator opens Software from global navigation, connects Codex with a test ChatGPT account through device authorization, and sees a safe account identity plus separate runtime readiness.
- **E2E-002** (`qa-release`): Administrator connects Claude Code in an isolated profile, then sees Codex and Claude as distinct connection rows with no token in browser traffic.
- **E2E-003** (`feature-gate`): Author saves create_spec with a live model and isolated checkout, explicitly starts it, reviews _spec.md Product/Technical and companions, and approves the exact package version.
- **E2E-004** (`feature-gate`): Author starts create_tasks only after approved spec, then selects implement-tasks and sees the actual Loop terminal outcome without an automatic next run.
- **E2E-005** (`qa-release`): Author creates a CompozyOS worktree, restarts the worker between actions, and sees the same worktree ID and repository binding on the next run.
- **E2E-006** (`feature-gate`): A legacy PRD/Tech Spec task remains readable and its approved package IDs do not change after new Software settings are saved.
- **E2E-007** (`qa-release`): A reader visits a task with Codex and Claude run history, sees safe provider/model/reasoning/worktree provenance, and cannot invoke author/admin controls.

## Contract Gates

- Pinned OpenAPI fixtures must cover success and each documented CompozyOS error shape for auth probe, model status/list, worktree list/create/status, Loop inspect/run/status, and session prompt. Wire mismatches block release.
- A populated PostgreSQL migration fixture proves legacy tables/packages remain byte-identical after additive schema migration.
- Live QA proves Codex device login, Claude subscription login, CompozyOS first-prompt model/reasoning negotiation, rootless Podman isolation, durable worktree state, and Loop cancellation/reconciliation. A failing provider proof leaves that option unavailable; it does not silently switch billing or runtime.
