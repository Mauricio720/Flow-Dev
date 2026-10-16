# User Stories: Issue Deletion

Canonical behavior catalog for deleting Flow Dev and GitHub issues. Companion to `_prd.md`; consumed by `_techspec.md` and `_tests.md`.

## Personas

- **Flow Dev issue author** — Created a saved intention and may need to remove its draft or published Issue.
- **Imported Issue author** — Created an Issue in GitHub that appears in Flow Dev's assigned-work area.
- **Flow Dev administrator** — Manages an accessible project's issues, including items without a Flow Dev author.
- **Project member or operator** — Can read or work on an assigned issue but may lack deletion authority.

## Story Index

| ID | Feature Area | Persona | Story |
| --- | --- | --- | --- |
| US-001 | Unpublished issue | Flow Dev issue author or administrator | Delete an unpublished saved issue. |
| US-002 | Published issue | Flow Dev issue author or administrator | Delete a published Flow Dev Issue in both systems. |
| US-003 | Imported issue | Imported Issue author or administrator | Delete an externally created Issue before or after it becomes a Flow Dev work item. |
| US-004 | Active work | Eligible deleter | Interrupt ongoing work and delete the issue. |
| US-005 | Recovery | Eligible deleter | Understand a failed or uncertain deletion and retry safely. |
| US-006 | Authorization | Author, administrator, or project member | Respect Flow Dev and GitHub deletion permissions. |
| US-007 | Artifact preservation | Eligible deleter or operator | Preserve worktrees, branches, and PRs and know what remains. |

## Unpublished issue

### US-001: Delete an unpublished saved issue

**As an** issue author or administrator, **I want** to delete a saved issue before publication, **so that** its draft and conversation no longer remain in Flow Dev.

Acceptance criteria:

- AC-1: Given a saved issue with no GitHub publication attempt or with confirmed noncreation, when an eligible person opens it, then “Excluir issue” is available and the confirmation says only Flow Dev content will be deleted.
- AC-2: Given the confirmation, when the person cancels, then the issue, its history, and active work are unchanged.
- AC-3: Given confirmation and successful deletion, when any authorized viewer refreshes a list or direct route, then the issue and its conversation, drafts, and related local history are unavailable.
- AC-4: Given confirmed deletion, when the person returns to the project, then a safe issue list or empty state is shown without the deleted item.

Edge cases:

- EC-1 [Invalid input]: A direct request names a malformed or wrong-project issue ID → reject it without changing any issue.
- EC-2 [Empty / missing]: The issue never advanced beyond its first accepted message → its minimal saved record can still be deleted; an unsaved blank “Nova intenção” has no delete action.
- EC-3 [Limits]: The issue has a long conversation and many revisions → deletion covers the whole issue-owned history without leaving partial entries visible.
- EC-4 [Permissions]: A reader who is neither author nor administrator attempts deletion → no destructive action is available, and a direct request is rejected.
- EC-5 [Concurrency]: Another tab edits the draft while deletion begins → the user sees one final deletion outcome, and no edit reappears afterward.
- EC-6 [Interruption]: The browser closes after confirmation → reopening the issue reveals the actual pending, failed, or completed state, not an invented success.
- EC-7 [Repetition]: The user submits the same confirmation twice → one issue is deleted once; no other issue is affected.
- EC-8 [Ordering]: The user opens a stale detail URL after deletion → it shows an unavailable state and a safe return path.
- EC-9 [State transitions]: Publication becomes confirmed between opening the dialog and confirming → the action re-evaluates the issue and requires the GitHub deletion path rather than silently deleting only locally.
- EC-10 [Scale]: The project has many saved issues → other issues remain reachable, and the deleted issue leaves search and paginated history.

## Published issue

### US-002: Delete a published Flow Dev Issue

**As an** issue author or administrator, **I want** one confirmed action to remove the published Issue and its Flow Dev work item, **so that** neither system still presents it as active work.

Acceptance criteria:

- AC-1: Given a Flow Dev-created published Issue, when an eligible person opens its confirmation, then it identifies the repository and Issue number and states that GitHub and Flow Dev deletion is permanent.
- AC-2: Given the person's GitHub deletion permission and confirmation, when both destinations confirm removal, then the Issue is absent from GitHub and Flow Dev issue history, work lists, and direct routes.
- AC-3: Given the linked GitHub Issue is verified already absent, when an eligible person confirms deletion, then Flow Dev removes the remaining local work item.
- AC-4: Given a linked issue, when GitHub deletion is not confirmed, then Flow Dev retains the work item and does not report success.

Edge cases:

- EC-1 [Invalid input]: A stale or forged Issue number points to another repository → the linked identity is checked and no unrelated Issue is deleted.
- EC-2 [Empty / missing]: The saved publication link lacks a usable Issue identity → deletion does not guess a target; it keeps the local item and explains the block.
- EC-3 [Limits]: A published issue has extensive planning and execution history → all issue-owned Flow Dev views disappear after success without truncating the confirmation or leaving partial history.
- EC-4 [Permissions]: A Flow Dev author lacks repository administration → GitHub refusal keeps the Issue in both places with an actionable explanation.
- EC-5 [Concurrency]: A second eligible person requests deletion at the same time → both see the same target and eventual result; the Issue is not targeted twice as different work.
- EC-6 [Interruption]: The client disconnects after GitHub accepts deletion → returning to the issue shows the known or recoverable outcome and completes local cleanup only after remote absence is established.
- EC-7 [Repetition]: A user retries after confirmed completion → the completed deletion cannot affect another Issue or recreate the deleted record.
- EC-8 [Ordering]: The Issue is deleted directly on GitHub before Flow Dev deletion → verified absence permits local cleanup.
- EC-9 [State transitions]: The Issue is transferred or its repository is renamed before confirmation → verify stable identity and do not delete a different repository's Issue.
- EC-10 [Scale]: Many project members have the detail open → their lists and direct views converge on the deleted state without exposing removed content.

## Imported issue

### US-003: Delete an externally created Issue

**As an** imported Issue author or Flow Dev administrator, **I want** to delete an Issue created outside Flow Dev, **so that** it disappears from GitHub and the assigned-work area.

Acceptance criteria:

- AC-1: Given an eligible GitHub Issue in the Ready queue with no Flow Dev work item, when an authorized person confirms deletion, then GitHub confirms removal and the Issue disappears from discovery.
- AC-2: Given a claimed imported Issue with a Flow Dev work item, when deletion completes, then its GitHub Issue and Flow Dev claim, planning, and work views are unavailable.
- AC-3: Given an imported Issue, when its GitHub author or a Flow Dev administrator has current project access and GitHub deletion permission, then the same deletion journey is available as for a Flow Dev-created Issue.
- AC-4: Given a deletion failure or uncertainty, when the person returns, then the imported work item remains available for retry; an unclaimed queue Issue remains discoverable if GitHub confirms it still exists.

Edge cases:

- EC-1 [Invalid input]: A queue item is a draft or pull request rather than an Issue → no Issue deletion is offered and a direct request is rejected.
- EC-2 [Empty / missing]: No Flow Dev work item exists yet → confirmed GitHub deletion finishes without inventing a local record.
- EC-3 [Limits]: A Ready queue spans many pages → eligible deletion works for an item on any page, and the removed Issue does not reappear on later pages.
- EC-4 [Permissions]: An assignee or operator is neither the GitHub Issue author nor a Flow Dev administrator → work access alone does not grant deletion.
- EC-5 [Concurrency]: One user claims the Issue while another deletes it → there is one consistent outcome; a claim cannot revive a deleted Issue.
- EC-6 [Interruption]: The board view stops responding during deletion → the user sees a recoverable state and no claim of confirmed deletion based only on a stale queue.
- EC-7 [Repetition]: A deleted Issue appears briefly in a cached queue and receives another delete request → no other Issue is affected, and refreshed discovery removes it.
- EC-8 [Ordering]: The Issue is claimed after a confirmation dialog opened → deletion applies to the same Issue and includes the newly created Flow Dev work item.
- EC-9 [State transitions]: The Issue closes, leaves Ready, or is assigned elsewhere before confirmation → verify the same Issue identity; it remains deletable by an authorized author or administrator without treating old queue eligibility as permission.
- EC-10 [Scale]: The Issue has multiple assignees and observers → all see its confirmed absence, without creating duplicate imported work items.

## Active work

### US-004: Delete while work is running

**As an** eligible deleter, **I want** to delete an issue even while Flow Dev works on it, **so that** I do not have to wait for or manually unwind every stage.

Acceptance criteria:

- AC-1: Given active generation, publication, planning, or execution, when an eligible person confirms deletion, then new issue work is blocked and the active work is interrupted.
- AC-2: Given work is stopping, when the person views the issue, then deletion remains visibly in progress until stopping and destination outcomes are known.
- AC-3: Given publication was already sent to GitHub, when its outcome is confirmed as created, then that Issue is deleted before deletion is reported complete.
- AC-4: Given work cannot be confirmed stopped or publication remains uncertain, then the Flow Dev issue remains with a recoverable status and no false deletion success.

Edge cases:

- EC-1 [Invalid input]: A stop signal refers to an old run rather than the active issue work → the current work is not incorrectly considered stopped.
- EC-2 [Empty / missing]: The issue's visible status says active but the worker has already ended → reconcile the current state and continue deletion without waiting forever.
- EC-3 [Limits]: Multiple historical runs exist → only current work is interrupted; history is removed with the issue after success.
- EC-4 [Permissions]: An operator may cancel a run but cannot delete the Issue → run-control permission does not become deletion permission.
- EC-5 [Concurrency]: A new action starts as deletion is accepted → it is rejected or stopped before deletion completes.
- EC-6 [Interruption]: Flow Dev restarts during stopping → the user can resume or retry from the persisted deletion state without orphaned active work.
- EC-7 [Repetition]: Multiple delete confirmations arrive during cancellation → they converge on one deletion journey and do not send conflicting stop commands.
- EC-8 [Ordering]: Publication response arrives after the stop request → determine whether GitHub created the Issue before deciding what to delete.
- EC-9 [State transitions]: A run changes from running to completed while deletion starts → its final state does not restore the issue or start the next stage.
- EC-10 [Scale]: Several different issues execute at once → deleting one interrupts only that issue's work.

## Recovery

### US-005: Recover from GitHub failure or uncertainty

**As an** eligible deleter, **I want** clear failure information and a safe retry, **so that** I can finish deletion without losing track of an Issue that may still exist.

Acceptance criteria:

- AC-1: Given GitHub denies deletion, when the attempt settles, then the Flow Dev issue remains and the user sees that GitHub permission is missing.
- AC-2: Given GitHub is unavailable or rate-limits deletion, when the attempt settles, then the Flow Dev issue remains with a retry path and no claim of remote removal.
- AC-3: Given the GitHub outcome is uncertain, when the person returns, then the product distinguishes unknown from confirmed present or absent and reconciles before final local removal.
- AC-4: Given a later confirmed remote absence, when the eligible person retries or recovery completes, then Flow Dev finishes local removal without restarting stopped work.

Edge cases:

- EC-1 [Invalid input]: A retry refers to another issue or repository → it is rejected without changing either target.
- EC-2 [Empty / missing]: A provider error has no safe detail → show a generic actionable message without exposing internal or credential data.
- EC-3 [Limits]: GitHub imposes a rate limit → show a wait or retry state appropriate to the provider response, without retry storms.
- EC-4 [Permissions]: Authorization expires between attempts → require current authorization and leave the local issue intact.
- EC-5 [Concurrency]: A second tab retries while the first attempt is unresolved → one reconciled deletion outcome is shown, not competing provider mutations.
- EC-6 [Interruption]: The server restarts after the provider accepted deletion but before local cleanup → recovery checks remote absence and completes or retains the issue truthfully.
- EC-7 [Repetition]: The same retry is submitted several times → it never deletes a different Issue or restarts canceled work.
- EC-8 [Ordering]: A person retries before a prior uncertain response is reconciled → reconcile that response first and do not assume a fresh delete is safe.
- EC-9 [State transitions]: GitHub confirms the Issue was already deleted externally → local cleanup may finish; a masked 404 without verified absence keeps the local issue.
- EC-10 [Scale]: Many independent deletions are pending → each person sees the status of the correct Issue without one failure blocking unrelated issues.

## Authorization

### US-006: Respect both permission systems

**As a** project member, author, or administrator, **I want** the delete action to reflect my actual authority, **so that** another person's Issue cannot be removed through my project access alone.

Acceptance criteria:

- AC-1: Given current project access and authorship or Flow Dev administration, when a person opens an issue, then the Flow Dev deletion action is available subject to the linked Issue's GitHub permission.
- AC-2: Given a linked Issue, when the person lacks GitHub deletion permission, then the Issue stays in GitHub and Flow Dev and the failure explains the permission boundary.
- AC-3: Given a member who is neither author nor administrator, when they view an issue or call the deletion operation directly, then deletion is unavailable or rejected.
- AC-4: Given lost project or repository access, when a previously eligible person confirms a stale dialog, then the action is rejected without disclosing new protected content.

Edge cases:

- EC-1 [Invalid input]: A client supplies another user's identity or author ID → the server uses verified session and provider identity instead.
- EC-2 [Empty / missing]: An imported Issue has no confirmed author identity → author access is not guessed; only a Flow Dev administrator can initiate after identity checks.
- EC-3 [Limits]: A person has access to many projects → authorization is evaluated for the issue's actual project and repository, not a previous selection.
- EC-4 [Permissions]: A Flow Dev administrator lacks GitHub administration → the role does not override GitHub's refusal.
- EC-5 [Concurrency]: Membership or GitHub permission is revoked while confirmation is open → the protected action rechecks current authority.
- EC-6 [Interruption]: A session expires during deletion → the user reauthenticates to resume recovery; the issue is not reported deleted without confirmation.
- EC-7 [Repetition]: A rejected user repeats the direct request → the result stays rejected and no partial deletion occurs.
- EC-8 [Ordering]: A user obtains project access after opening a forbidden link → they may use the action only after current authority is established.
- EC-9 [State transitions]: Authorship remains tied to the original GitHub Issue despite assignment or operator changes → a new operator does not inherit delete authority.
- EC-10 [Scale]: Many project members can read an issue → deletion controls are shown only to eligible members, and protected responses do not expose credentials.

## Artifact preservation

### US-007: Keep code and review artifacts

**As an** eligible deleter or operator, **I want** worktrees, branches, and PRs to survive Issue deletion, **so that** code and review work are not lost unexpectedly.

Acceptance criteria:

- AC-1: Given an issue with code artifacts, when the confirmation opens, then it states that worktrees, branches, and PRs remain after Issue deletion.
- AC-2: Given confirmed Issue deletion, when the user checks those artifacts, then their existing files, branches, and PRs remain available under their original access rules.
- AC-3: Given active execution, when deletion starts, then execution is stopped without erasing the worktree or automatically closing its PR.

Edge cases:

- EC-1 [Invalid input]: A stored artifact reference is malformed → deletion does not use it as a path or GitHub target; the confirmation still states the preservation rule.
- EC-2 [Empty / missing]: The issue has no worktree, branch, or PR → confirmation remains accurate and deletion needs no artifact cleanup.
- EC-3 [Limits]: A worktree contains many changed files → no automatic deletion or truncation of those files occurs.
- EC-4 [Permissions]: The deleter cannot open another operator's local worktree → preserving it does not grant them new access or reveal its private path.
- EC-5 [Concurrency]: A PR is opened while Issue deletion starts → the PR remains, and deletion does not close it.
- EC-6 [Interruption]: The local machine disconnects during deletion → the worktree stays intact; the deletion state truthfully reflects any unconfirmed stop.
- EC-7 [Repetition]: The deletion is retried → artifacts remain across every attempt.
- EC-8 [Ordering]: A worktree was created before the Issue was published → its preservation does not depend on the publication state.
- EC-9 [State transitions]: A branch is merged or a PR closes independently → Issue deletion does not reverse or change that GitHub state.
- EC-10 [Scale]: Several Issues have separate worktrees or PRs → deleting one leaves artifacts for all issues intact.
