# Test Specification: Issue Deletion

Canonical test contract for issue deletion. Companion to _techspec.md.
Derived from _user_stories.md and the architecture in _techspec.md.

## Strategy

- Frameworks and harnesses: Vitest for service, gateway, DAO, router, and React components; real ephemeral PostgreSQL for API integration; mocked GitHub HTTP and local connector at I/O boundaries; Playwright with isolated development fixtures for user journeys.
- Execution: task-required unit and narrow integration cases run with the owning implementation task; feature-gate cases run after dependent slices; qa-release cases run in isolated QA. Run package test and test:integration at the project-required completion point, with only affected Playwright specs.
- Conventions: deterministic UUIDs, fake clock, exact node/repository identities, table fixtures spanning every dependent row, accessible locators, and independent E2E setup/cleanup. No production credentials or mutable production endpoints.

## Coverage Matrix

| Source | Behavior | Task-required | Feature-gate | QA/release |
| --- | --- | --- | --- | --- |
| DeletionTarget | task or queue identity validation | UT-003, UT-008–UT-010 | IT-001, IT-010 | — |
| DeletionStatus | safe state and error DTO | UT-020, UT-023, UT-025 | IT-006, IT-034 | — |
| US-001 | delete unpublished task | UT-001, UT-022, IT-002 | E2E-001 | — |
| US-001.EC-1 | malformed or wrong-project task | IT-001 | — | — |
| US-001.EC-2 | minimal saved task; blank composer | IT-002 | E2E-001 | — |
| US-001.EC-3 | many revisions and messages | IT-003 | — | — |
| US-001.EC-4 | unauthorized reader | UT-002, IT-004 | — | — |
| US-001.EC-5 | edit races deletion | — | IT-005 | — |
| US-001.EC-6 | browser closes after start | — | IT-006 | — |
| US-001.EC-7 | double confirmation | UT-004 | IT-007 | — |
| US-001.EC-8 | stale detail URL | — | E2E-001 | — |
| US-001.EC-9 | publication changes destination | UT-003 | IT-008 | — |
| US-001.EC-10 | pagination and search | — | IT-009 | — |
| US-002 | delete published Flow Dev Issue | UT-029, IT-012 | E2E-002 | — |
| US-002.EC-1 | forged number or repo | UT-009 | IT-010 | — |
| US-002.EC-2 | missing linked node identity | — | IT-011 | — |
| US-002.EC-3 | extensive local work history | IT-003 | — | — |
| US-002.EC-4 | author lacks GitHub admin | UT-011 | IT-012 | — |
| US-002.EC-5 | two deleters race | — | IT-013 | — |
| US-002.EC-6 | disconnect after remote accept | UT-016 | IT-014 | — |
| US-002.EC-7 | retry completed task | UT-004 | IT-007 | — |
| US-002.EC-8 | already deleted remotely | UT-017 | IT-015 | — |
| US-002.EC-9 | transfer or rename | UT-010, UT-019 | IT-016 | — |
| US-002.EC-10 | many open tabs | — | E2E-002 | — |
| US-003 | delete imported queue or claimed issue | UT-006, IT-017 | E2E-003 | — |
| US-003.EC-1 | PR or draft queue item | UT-008 | — | — |
| US-003.EC-2 | no local work item | — | IT-017 | — |
| US-003.EC-3 | paginated Ready queue | — | E2E-003 | — |
| US-003.EC-4 | operator not author/admin | UT-002 | IT-018 | — |
| US-003.EC-5 | claim races deletion | UT-027 | IT-019 | — |
| US-003.EC-6 | board failure during deletion | — | IT-020 | — |
| US-003.EC-7 | stale queue cache | — | IT-020 | — |
| US-003.EC-8 | claim after preview | — | IT-021 | — |
| US-003.EC-9 | Ready/assignee state changes | — | IT-022 | — |
| US-003.EC-10 | multiple observers | — | IT-023 | — |
| US-004 | stop active work and delete | UT-013, IT-024 | E2E-004 | — |
| US-004.EC-1 | old stop signal | UT-013 | — | — |
| US-004.EC-2 | worker already ended | UT-014 | IT-024 | — |
| US-004.EC-3 | historical runs untouched until purge | — | IT-025 | — |
| US-004.EC-4 | run operator lacks deletion role | — | IT-026 | — |
| US-004.EC-5 | new action at deletion fence | — | IT-027 | — |
| US-004.EC-6 | restart during stop | UT-028 | IT-028 | — |
| US-004.EC-7 | duplicate stop confirmations | — | IT-029 | — |
| US-004.EC-8 | late publication response | UT-015 | IT-030 | — |
| US-004.EC-9 | run completes during stop | — | IT-031 | — |
| US-004.EC-10 | other issues keep running | — | IT-032 | — |
| US-005 | recover from denial or uncertainty | UT-016, IT-033 | E2E-005 | — |
| US-005.EC-1 | retry targets another identity | UT-005 | IT-033 | — |
| US-005.EC-2 | provider message unsafe or blank | UT-023 | — | — |
| US-005.EC-3 | rate limit | UT-020 | IT-034 | — |
| US-005.EC-4 | OAuth expires | — | IT-035 | — |
| US-005.EC-5 | second tab retries unresolved | — | IT-036 | — |
| US-005.EC-6 | restart after remote accepted | — | IT-037 | — |
| US-005.EC-7 | repeat retry | UT-026 | IT-038 | — |
| US-005.EC-8 | retry before prior outcome | UT-016 | IT-039 | — |
| US-005.EC-9 | verified 410 vs masked 404 | UT-017, UT-018 | IT-040 | — |
| US-005.EC-10 | independent pending issues | — | IT-041 | — |
| US-006 | current local and GitHub authority | UT-001, UT-011 | E2E-006 | — |
| US-006.EC-1 | forged author ID | UT-006 | IT-042 | — |
| US-006.EC-2 | unknown imported author | UT-007 | — | — |
| US-006.EC-3 | wrong project selection | — | IT-043 | — |
| US-006.EC-4 | admin lacks GitHub permission | UT-011 | IT-012 | — |
| US-006.EC-5 | membership revoked before confirm | — | IT-044 | — |
| US-006.EC-6 | session expires | — | IT-045 | — |
| US-006.EC-7 | repeated unauthorized request | — | IT-042 | — |
| US-006.EC-8 | new project access | — | IT-046 | — |
| US-006.EC-9 | operator changes | UT-006 | — | — |
| US-006.EC-10 | many readers; no secret leak | UT-025 | E2E-006 | — |
| US-007 | preserve code artifacts | UT-021, IT-047 | E2E-007 | — |
| US-007.EC-1 | malformed artifact reference | UT-021 | — | — |
| US-007.EC-2 | no artifacts | UT-021 | — | — |
| US-007.EC-3 | large dirty worktree | — | IT-047 | — |
| US-007.EC-4 | private worktree path | UT-021, UT-025 | — | — |
| US-007.EC-5 | PR opens during deletion | — | IT-048 | — |
| US-007.EC-6 | connector disconnects | — | IT-049 | — |
| US-007.EC-7 | retry preserves artifacts | — | IT-050 | — |
| US-007.EC-8 | worktree before publication | — | IT-051 | — |
| US-007.EC-9 | branch/PR changes independently | — | IT-052 | — |
| US-007.EC-10 | other issue artifacts | — | IT-053 | — |
| IssueDeletionService | preview/start/status/retry and authorization | UT-001–UT-007, UT-025–UT-026, UT-029–UT-030 | IT-042–IT-046 | — |
| IssueDeletionDao | identity lock, fence, lease, purge | UT-004–UT-005, UT-024, UT-027–UT-028 | IT-003, IT-005, IT-019 | — |
| IssueDeletionWorker | stop, publication reconcile, recovery | UT-013–UT-016, UT-026, UT-028–UT-030 | IT-024, IT-028, IT-030, IT-037 | — |
| GitHubIssueDeletionGateway | inspect, remove, absence errors | UT-008–UT-012, UT-017–UT-020 | IT-010, IT-012, IT-014–IT-016, IT-034 | — |
| Web deletion feature | confirmation, focus, status, navigation | UT-021–UT-023, UT-025 | E2E-001–E2E-007 | — |
| issueDeletion.preview | success and protected failures | UT-001–UT-002, UT-006–UT-011 | IT-001, IT-018, IT-043 | — |
| issueDeletion.start | success and stale/concurrent failures | UT-003–UT-005 | IT-007–IT-008, IT-013, IT-044 | — |
| issueDeletion.status | progress and protected failures | UT-025 | IT-006, IT-045 | — |
| issueDeletion.retry | resume and identity/provider failures | UT-005, UT-016, UT-026 | IT-033–IT-040 | — |

## Unit Tests

### IssueDeletionService and authorization

- **UT-001** (task-required, happy): IssueDeletionService.preview with saved task author u1 and project p1 returns canDelete=true and Flow Dev destination.
- **UT-002** (task-required, error): IssueDeletionService.preview with reader u2 who is neither author nor admin returns canDelete=false; start returns FORBIDDEN.
- **UT-003** (task-required, ordering): IssueDeletionService.start given a draft preview fingerprint then a confirmed published Issue returns PRECONDITION_FAILED before persisting a fence.
- **UT-004** (task-required, idempotency): Reserve twice with the same u1/requestKey UUID and same target returns the same operation ID.
- **UT-005** (task-required, error): Retry operation op1 with a request key already bound to op2 or a different target returns CONFLICT without changing either operation.
- **UT-006** (task-required, happy): For imported Issue author GitHub ID 1001 and current actor GitHub ID 1001, local authority is granted regardless of assignee/operator ID.
- **UT-007** (task-required, boundary): For imported Issue with null author ID, a nonadmin is denied and a Flow Dev admin with project access is eligible.

### GitHubIssueDeletionGateway

- **UT-008** (task-required, error): GitHub Issue inspection of a PullRequest node or draft board item returns invalid_target; remove is not called.
- **UT-009** (task-required, error): Inspection with frozen repository database ID 101 and provider repository ID 202 returns identity_conflict without remove.
- **UT-010** (task-required, state): Inspection with renamed repository label but matching database and node IDs retains the same target and updates display only.
- **UT-011** (task-required, error): Inspection with viewerCanDelete=false returns github_permission_denied; remove is not called.
- **UT-012** (task-required, error): GraphQL deleteIssue FORBIDDEN or organization policy denial maps to github_permission_denied and leaves remotePresence=present.
- **UT-017** (task-required, happy): REST Get issue returns 410 after same-repository read access was confirmed; gateway returns absent.
- **UT-018** (task-required, error): REST Get issue returns 404 or GraphQL node null; gateway returns unknown, never absent.
- **UT-019** (task-required, error): REST Get issue returns 301 or inspected node is transferred; gateway returns identity_conflict and does not retarget.
- **UT-020** (task-required, boundary): GitHub returns 429 with Retry-After 60; operation persists retryAt at least 60 seconds later and worker does not immediately retry.

### IssueDeletionWorker and IssueDeletionDao

- **UT-013** (task-required, concurrency): Stop coordinator given old run ID r1 and current run r2 does not mark r2 stopped when r1 acknowledges cancellation.
- **UT-014** (task-required, state): Stop coordinator sees current run r2 already terminal canceled and proceeds without another cancel call.
- **UT-015** (task-required, ordering): A publication attempt in dispatching or uncertain state prevents local-only cleanup until its creation outcome is resolved.
- **UT-016** (task-required, ordering): After deleteIssue times out, worker moves to verifying_remote and calls absence before any second remove.
- **UT-024** (task-required, state): Cleanup planner enumerates every task-owned dependent table in the schema fixture before deleting the root task.
- **UT-026** (task-required, idempotency): Retry of a recoverable operation preserves stopped run state and schedules no generation, planning, or execution restart.
- **UT-027** (task-required, concurrency): Identity lock for project p1/repository 101/node I_41 admits either queue claim or deletion reservation, never both as independent work.
- **UT-028** (task-required, concurrency): A worker with stale lease fence 2 cannot settle operation after fence 3 was acquired.
- **UT-029** (task-required, state): A linked operation with remotePresence=unknown cannot enter cleaning_local or completed.
- **UT-030** (task-required, state): A task with any publication attempt and no confirmed noncreation is not classified as local-only.

### Web deletion feature and safe DTOs

- **UT-021** (task-required, boundary): Confirmation with zero or malformed artifact references still names worktrees, branches, and PRs as preserved and renders no local path.
- **UT-022** (task-required, happy): Opening dialog focuses its heading/first control; Escape/cancel closes it, restores trigger focus, and sends no start mutation.
- **UT-023** (task-required, error): Blank or credential-bearing provider error maps to safe Portuguese copy and no raw error text.
- **UT-025** (task-required, error): Status requested by actor without current project access returns NOT_FOUND and exposes no title, token, path, or prior reason.

## Integration Tests

### Real database, tRPC boundary, provider transport, and local stop wiring

- **IT-001** (task-required): issueDeletion.start with malformed UUID or task from p2 under p1 returns BAD_REQUEST or NOT_FOUND; neither task changes.
- **IT-002** (task-required): Delete a task with only its first accepted message and no publication attempt; task and message rows disappear, no GitHub call occurs.
- **IT-003** (task-required): Populate task with 100 messages, revisions, publication, claim, plan, spec, runs, local command evidence, and receipts; one successful cleanup leaves zero issue-owned rows and preserves unrelated project rows.
- **IT-004** (task-required): Reader u2 calls start for u1 task; tRPC returns FORBIDDEN and no operation, stop, or provider call is persisted.
- **IT-005** (feature-gate): Commit an edit transaction racing a start transaction on the same task lock; the edit is rejected or precedes the fence, and no postdelete message exists.
- **IT-006** (feature-gate): Start deletion, close client before worker settles, then query status in a new session; response reflects persisted stopping/recoverable/completed state.
- **IT-007** (task-required): Two start calls with the same request key and task, then status after completion, return one operation receipt; a stale repeat cannot target a second task.
- **IT-008** (task-required): Preview local-only draft, publish it before start, then submit old fingerprint; PRECONDITION_FAILED and no local-only deletion.
- **IT-009** (feature-gate): Delete page-two task among 120 saved tasks; history/search omit only that task and pagination still reaches the other 119.
- **IT-010** (task-required): Stored node I_41 belongs to repository 101 but provider returns repository 202 or Issue 42; start/reconcile retains task and never calls remove.
- **IT-011** (task-required): Published task has null issueNodeId; operation becomes recoverable with missing_identity, and local task remains.
- **IT-012** (task-required): GitHub deleteIssue rejects with FORBIDDEN; remote Issue and local task remain, status reason is github_permission_denied.
- **IT-013** (feature-gate): Two eligible actors submit deletion of the same node concurrently; unique identity produces one operation and one provider mutation.
- **IT-014** (task-required): GraphQL remove accepts then response is lost; REST 410 read-back marks remote absent and cleanup completes without a second remove.
- **IT-015** (task-required): Existing linked Issue returns REST 410 with confirmed repository read access; cleanup removes the local task without deleteIssue.
- **IT-016** (task-required): Repository rename with same IDs continues; transfer returning 301 or changed repository ID leaves recoverable identity_conflict.
- **IT-017** (task-required): Delete unclaimed Ready Issue I_41; REST 410 marks operation complete, no task row is created, and queue filtering omits I_41.
- **IT-018** (task-required): Assignee u2 who is not GitHub author or Flow Dev admin calls queue start for I_41; FORBIDDEN and no provider call.
- **IT-019** (feature-gate): Claim and deletion transactions race for I_41; if claim wins, task attaches to deletion and is removed; if deletion wins, claim is rejected.
- **IT-020** (feature-gate): Board read fails after queue deletion starts or stale board page still lists I_41; status remains recoverable/complete from operation and claim is blocked.
- **IT-021** (task-required): Queue preview for I_41, then claim creates task t1; start binds t1 to the same frozen identity and cleans it after GitHub absence.
- **IT-022** (task-required): Ready issue I_41 becomes closed or changes assignee after preview; verified same node remains deletable for author/admin; a different node is rejected.
- **IT-023** (feature-gate): Two assignees refresh after I_41 deletion; neither sees it in queue or as duplicate imported work.
- **IT-024** (task-required): Generation or planning operation already ended before stop command; coordinator records workStopped=true after reconciling terminal state.
- **IT-025** (task-required): Task has historical run r1 and active r2; only r2 receives cancel, then successful cleanup removes both run records.
- **IT-026** (task-required): Operator authorized to cancel r2 but not issue author/admin calls start; FORBIDDEN and r2 remains running.
- **IT-027** (task-required): After start transaction fences task t1, send/publish/plan/spec/claim/execute admissions for t1 reject without new work.
- **IT-028** (feature-gate): Restart API worker during stop with lease fence 2; new worker fence 3 resumes exact run and no late fence-2 result is stored.
- **IT-029** (task-required): Two confirmations while r2 is stopping produce one stop request key and one deletion operation.
- **IT-030** (task-required): Publication dispatch returns created I_41 after stop requested; operation adopts I_41 and deletes it before local cleanup.
- **IT-031** (task-required): Run r2 settles succeeded while deletion starts; no follow-up action is admitted and later cleanup removes r2.
- **IT-032** (feature-gate): Tasks t1 and t2 execute concurrently; deletion of t1 cancels only its run, while t2 completes normally.
- **IT-033** (task-required): Retry op1 with an operation ID for another repository or target returns NOT_FOUND/CONFLICT and neither Issue receives a mutation.
- **IT-034** (task-required): Provider returns 429 with Retry-After 60; task remains, retryAt persists, and worker makes no second call before due time.
- **IT-035** (task-required): Revoke actor OAuth between attempts; retry returns authorization_needed, leaves local task, and makes no provider mutation.
- **IT-036** (feature-gate): Two tabs retry one unresolved operation; lease and state yield one verification/mutation sequence and equal final status.
- **IT-037** (feature-gate): Restart server after provider accepted deletion but before cleanup; worker reads REST 410 and completes local purge from persisted operation.
- **IT-038** (task-required): Submit same retry key three times for recoverable op1; one lease/resume occurs, stopped work stays stopped, and target ID is unchanged.
- **IT-039** (task-required): Retry while previous remove result is unknown calls absence first; if REST returns present, only then may a fresh authorized remove occur.
- **IT-040** (task-required): REST 410 after proven repository read yields completion; REST 404 or missing repository access leaves local task recoverable.
- **IT-041** (feature-gate): Seed 20 pending deletions with one rate-limited; other 19 progress independently and status queries stay scoped to each ID.
- **IT-042** (task-required): Submit forged authorUserId or githubUserId in request, then repeat; schemas ignore/reject fields and server derives identity from session/provider.
- **IT-043** (task-required): Actor with p1 access submits p2 task under p1; preview/start return NOT_FOUND without p2 title or status.
- **IT-044** (task-required): Revoke p1 membership after preview; start returns NOT_FOUND/FORBIDDEN before fence, stop, or GitHub call.
- **IT-045** (task-required): Expire session before status/retry; UNAUTHORIZED, no new provider mutation, and operation remains queryable after reauthentication.
- **IT-046** (task-required): Grant p1 access after initial forbidden view; a new preview computes current authority and allows only an otherwise eligible author/admin.
- **IT-047** (task-required): Delete task with dirty worktree files, branch b1, and open PR 7; local path contents and GitHub branch/PR fixtures are unchanged.
- **IT-048** (feature-gate): Open PR 7 while issue stop begins; subsequent Issue deletion does not call PR close/delete and PR 7 remains.
- **IT-049** (task-required): Disconnect local connector during cancellation; operation stays recoverable with workStopped=false and worktree files remain.
- **IT-050** (task-required): Retry recoverable deletion twice; filesystem spy records zero remove calls and branch/PR gateway records zero destructive calls.
- **IT-051** (task-required): Worktree created before any publication attempt remains after successful local-only task deletion.
- **IT-052** (feature-gate): Branch b1 merges or PR 7 closes independently during deletion; issue deletion does not restore or further change either state.
- **IT-053** (feature-gate): Delete t1 with worktree w1 and PR 7 while t2 has w2 and PR 8; all four artifacts remain and t2 work continues.

## End-to-End Tests

### Public issue deletion journeys

- **E2E-001** (feature-gate): Open saved draft, cancel Excluir issue, confirm on second opening, then visit history and stale detail URL; draft disappears and unavailable state links to project list.
- **E2E-002** (feature-gate): Open published Flow Dev Issue with authorized test GitHub fixture, confirm deletion, watch pending then success, and refresh another tab; both tabs lose the Issue.
- **E2E-003** (feature-gate): Open a Ready queue page containing unclaimed imported I_41, confirm Excluir issue, then paginate/refresh; I_41 is absent and no Flow Dev work item appears.
- **E2E-004** (qa-release): Start a local execution in an isolated development workspace, confirm deletion, observe stopping then completion or truthful recoverable state, and inspect preserved worktree.
- **E2E-005** (feature-gate): Cause GitHub refusal and then allow an authorized retry; UI shows refused/present state, retains detail, then shows confirmed completion without restarting work.
- **E2E-006** (feature-gate): As a reader neither author nor admin, open issue and use direct mutation; no delete control appears and server rejects, then repeat after loss of project access without content leak.
- **E2E-007** (qa-release): Using keyboard and screen reader, open confirmation on narrow viewport, hear permanent deletion and preserved artifact categories, cancel with focus return, then complete deletion and navigate safely.

