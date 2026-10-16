# PRD: Issue Deletion

## Overview

Flow Dev currently keeps an issue's conversation, publication, planning, and work history but offers no way to remove an issue. A developer who needs to delete one must act in GitHub and still has a stale Flow Dev record. This feature gives the issue's author or a Flow Dev administrator a single, explicit deletion journey for both Flow Dev-created and imported issues. A published or imported issue is removed from GitHub and Flow Dev; a saved issue with no GitHub publication attempt, or with confirmed noncreation, is removed from Flow Dev alone.

Deletion is permanent. It can begin while generation, publication, planning, or execution is active, but active work must stop before deletion completes. Worktrees, branches, and Pull Requests remain. If GitHub deletion is denied, unavailable, or uncertain, the Flow Dev issue remains available for a safe retry.

### Research and confirmed decisions

- `apps/web/PRODUCT.md` and the existing task-creation PRD define a saved Flow Dev task from the first accepted message, followed by a reviewed GitHub Issue and retained publication history.
- The assigned-work PRD and current code allow a GitHub Issue created elsewhere to become a Flow Dev work item. A Flow Dev-created and an imported issue can therefore have the same downstream work lifecycle.
- `packages/api/src/routers/tasks.ts` and `assignedIssues.ts` have read, authoring, claim, and publication operations, but no issue deletion operation. The current frontend lists saved tasks and assigned work without a delete action.
- Task records have linked messages, revisions, publication attempts, claims, plans, runs, and other history; many references restrict record removal. Active work includes worker activity and local executions. These are TechSpec concerns that make confirmed stopping and coordinated cleanup necessary.
- [GitHub's deletion guidance](https://docs.github.com/en/issues/tracking-your-work-with-issues/administering-issues/deleting-an-issue) says deletion is permanent and limited to repository administrators or owners, with an organization setting that may disable it. [GitHub GraphQL](https://docs.github.com/en/graphql/reference/issues#deleteissue) exposes a deletion mutation addressed by Issue node ID. These provider facts set the permission and failure expectations; they do not prescribe the implementation.

The user confirmed deletion in both Flow Dev and GitHub, coverage for Flow Dev-created and imported issues, availability during active work with interruption, retention of the local issue when GitHub deletion fails, author-or-administrator initiation, and preservation of worktrees, branches, and Pull Requests. External market research was unnecessary because this feature changes an existing private workflow rather than product positioning; current GitHub documentation was checked for provider behavior.

## Goals

- An eligible person can permanently delete an unpublished Flow Dev issue without a GitHub action.
- An eligible person can permanently delete a linked GitHub Issue and its Flow Dev work item, regardless of where it was created.
- Deletion can start in any issue state; active Flow Dev work stops, and no later result recreates the deleted item.
- The user can see what will be removed, what code artifacts will remain, and whether deletion is pending, complete, or recoverable.
- A GitHub denial, outage, or uncertain result never silently removes the Flow Dev issue; a retry does not restart stopped work or target a different Issue.
- Unauthorized people cannot initiate deletion or read protected deletion details.

## User Stories

[Full user stories](_user_stories.md) is the canonical behavior catalog.

- `US-001`: Delete an unpublished Flow Dev issue.
- `US-002`: Delete a Flow Dev-created, published Issue in both systems.
- `US-003`: Delete an imported GitHub Issue in both systems.
- `US-004`: Delete while generation, publication, planning, or execution is active.
- `US-005`: Recover from denied, unavailable, or uncertain GitHub deletion.
- `US-006`: Enforce author, administrator, project, and GitHub permissions.
- `US-007`: Preserve worktrees, branches, and Pull Requests and clearly disclose them.

## Core Features

### 1. Discoverable, explicit deletion

Provide a delete action for eligible viewers of a saved issue in the authoring area or assigned-work area, and of a visible Ready queue Issue that has no Flow Dev work item yet. Identify the issue by title, repository, and GitHub number when one exists. Before committing to the action, show a confirmation that states the permanent loss of the Flow Dev issue and its history when present, the GitHub deletion for linked issues, and the worktrees, branches, and Pull Requests that will remain. An issue whose GitHub noncreation is established has no GitHub deletion step. Canceling the confirmation changes nothing.

During deletion, present progress and prevent a second competing action on the same issue. On confirmed success, remove the issue from saved history and assigned-work views, leave no usable detail route, and navigate the person to the corresponding project's safe list or empty state. Other viewers and tabs eventually see the same result. The interface must not claim success based only on a click or an unconfirmed provider response.

### 2. Both issue origins and active work

Flow Dev-created and imported issues use the same linked-Issue deletion rules. An eligible Ready queue Issue with no local work item can also be deleted from GitHub; it then disappears from discovery. An imported issue's GitHub author is its author for deletion access; a Flow Dev administrator may also initiate deletion. A linked Issue that is confirmed already absent in GitHub may have its remaining Flow Dev record removed. A missing or ambiguous provider response alone does not establish absence.

Accept deletion requests while generation, publication, planning, or execution is active. Prevent new issue work, stop active work, and establish the outcome of any GitHub publication already in flight before removing the Issue. If a publication did create an Issue, delete that confirmed Issue as part of this journey. If work cannot be confirmed stopped or the publication outcome cannot be established, retain the Flow Dev issue with a visible recoverable deletion state. An unsuccessful deletion never resumes previously stopped work automatically.

### 3. Permission and failure handling

An issue's author or a Flow Dev administrator may initiate deletion only with current access to the issue's project. A linked Issue additionally requires the initiating person's own GitHub authorization and GitHub's deletion permission for the repository. Authorship in Flow Dev does not grant GitHub administration. If the person lacks the GitHub permission, explain that the Issue remains in both places and how to seek or use authorized access; never offer a misleading success state.

If GitHub rejects deletion, is unavailable, rate-limits the request, or returns an uncertain result, preserve the Flow Dev issue and allow a later retry. Show whether work was stopped and whether the GitHub Issue is confirmed to remain, confirmed absent, or not yet known. Repeated requests and retries must not delete another Issue, restart work, or cause duplicate actions. Do not erase the local recovery context until the remote outcome is confirmed.

### 4. Preserve code and review artifacts

Stopping Flow Dev execution does not erase local worktrees or their contents. Git branches and Pull Requests remain in GitHub, including an already-open PR related to the deleted Issue. The confirmation and completion feedback distinguish these preserved artifacts from the Issue and Flow Dev history being removed. The user manages preserved code artifacts separately after deletion.

## Business Rules

1. A deletion is scoped to one verified project and issue identity. The target cannot change through a repository rename, stale page, retry, or second tab. A different issue with the same number in another repository is never affected.
2. A Flow Dev issue requires local-only deletion only when no GitHub publication was attempted or noncreation was confirmed. A confirmed published or imported Issue requires confirmed GitHub absence and removal of any local work item before the user sees success. A Ready queue Issue with no local work item requires confirmed GitHub absence.
3. Deletion permanently removes the Flow Dev issue and its issue-owned conversation, draft, publication, planning, claim, and execution history from product views. It is not a hide, archive, or close action.
4. Only the issue author or a Flow Dev administrator with current project access can initiate deletion. Imported-issue authorship is the GitHub author's identity. The person's current GitHub repository authorization and GitHub deletion permission are separately required for a linked Issue.
5. A local author or administrator who lacks GitHub administration cannot complete linked-Issue deletion. Organization-level GitHub policy can also prevent it. Neither Flow Dev role overrides GitHub's decision.
6. The destructive action requires a distinct explicit confirmation. It identifies the issue and both deletion destinations, warns that deletion is permanent, and names the worktree, branch, and PR categories that remain. Dismissing it causes no deletion or work interruption.
7. A deletion request can be accepted from any current issue state. After acceptance, no new generation, publication, planning, claim, or execution action may begin for that issue. Active Flow Dev work is stopped before completion.
8. A GitHub publication already in flight must be reconciled before deletion is marked complete. An uncertain publication or uncertain stop leaves the local issue available for recovery and prevents a false success claim.
9. If GitHub deletion fails or its outcome cannot be established, the Flow Dev issue stays available with truthful status and a retry path. Work already stopped remains stopped; a retry does not resume it automatically.
10. A GitHub Issue verified as already deleted satisfies the remote-removal requirement. A response that could mean either missing permission or missing Issue does not satisfy it without verification.
11. A confirmed local deletion makes the issue unavailable through history, assigned-work lists, search results, and direct routes. Other users and tabs must converge on the same absence without exposing its removed content.
12. A repeat of the same logical deletion cannot affect any other issue. Concurrent requests must settle into one visible outcome; an already completed deletion remains complete.
13. Existing local worktrees, their files, Git branches, and Pull Requests are preserved. Deletion does not automatically close a PR, delete a branch, or remove a checkout.
14. Error and progress messages disclose no credentials, private local paths, or protected issue content to a person who lacks current access.

## User Experience

### Primary journey

1. An eligible person opens a saved Flow Dev issue or an imported assigned-work item and chooses “Excluir issue”.
2. A confirmation identifies the title, project repository, and GitHub number if present. It explains permanent deletion in Flow Dev and GitHub, the interruption of active work, and the code artifacts that remain.
3. The person confirms or cancels. Cancel preserves the issue and any running work.
4. On confirmation, the interface shows deletion in progress. Work is stopped and the required GitHub outcome is established.
5. On success, the issue disappears from lists and detail routes, and the person returns to a safe project view. On failure or uncertainty, the issue stays visible with a specific status and retry action.

### Permission and recovery journey

An unauthorized viewer has no usable deletion action; a direct request is rejected. A Flow Dev author without GitHub deletion permission sees why a linked Issue cannot be deleted and keeps its local work. When permission or provider availability returns, an eligible person can retry the same issue deletion. If an Issue was already deleted in GitHub, verified absence lets the local cleanup finish.

### Interface and accessibility requirements

- Use Portuguese interface copy consistent with the existing issue and assigned-work areas.
- Make the destructive control and confirmation usable with keyboard, screen reader, and narrow screens. Place focus into the confirmation, return it on cancel, and announce pending, success, and failure states in text rather than color alone.
- Give the user a clear path back after success. A direct link to a deleted issue shows an unavailable state without revealing removed content.
- Distinguish “GitHub refused”, “GitHub unavailable”, and “outcome still unknown” when the product has that evidence. Do not imply deletion or retry safety until the status is known.

## High-Level Technical Constraints

- GitHub remains the authority for linked Issue identity and deletion permission. Use the initiating person's authorized GitHub access and the Issue's verified repository identity.
- External and local deletion cannot be one atomic action. The implementation must preserve enough recoverable state to avoid false success, duplicate operations, and orphaned in-flight publication.
- Existing Flow Dev task and assigned-work data has dependent records and active workers. The TechSpec must define coordinated stopping, cleanup, and recovery without deleting preserved worktrees or GitHub code artifacts.
- Existing project and repository access controls continue to apply to reads and mutations; no shared service credential may bypass the person's GitHub deletion rights.

## Non-Goals (Out of Scope)

- Closing or archiving an Issue as a substitute for deletion; the user requested permanent removal.
- Deleting worktrees, Git branches, or Pull Requests; the user explicitly chose to preserve all three.
- Removing the Flow Dev issue after a GitHub denial or uncertain result; the user explicitly chose retention and retry.
- Requiring an active issue to finish before deletion can begin; the user explicitly chose interruption and deletion.

## Architecture Decision Records

- [ADR-001: Delete linked issues from Flow Dev and GitHub](adrs/adr-001.md) — Both issue origins use one confirmed deletion journey.
- [ADR-002: Stop active issue work during deletion](adrs/adr-002.md) — Deletion can begin in any state and finishes only after work is stopped.
- [ADR-003: Require local authority and confirmed GitHub deletion](adrs/adr-003.md) — Author or administrator access is separate from GitHub permission; failures retain the local issue.
- [ADR-004: Preserve code artifacts associated with a deleted issue](adrs/adr-004.md) — Worktrees, branches, and PRs remain.

## Open Questions

None remain for the product behavior. The TechSpec must establish the local record lifecycle and retention boundaries, exact provider permission and absence checks, interruption and publication reconciliation, and recovery from partial or uncertain deletion.
