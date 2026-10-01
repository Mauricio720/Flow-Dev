# User Stories: GitHub Authentication and Project Access

Canonical behavior catalog for GitHub sign-in, application sessions, project authorization, and administrator assignment. Companion to `_prd.md`; consumed by `_techspec.md` and `_tests.md`.

## Personas

- **Developer** — a person with a GitHub account who uses Flow Dev in one active project at a time.
- **Unassigned developer** — a signed-in developer awaiting a project assignment.
- **Application administrator** — a designated account that manages user-to-project access and can use every existing project.
- **Operator** — the trusted person who provisions the initial administrator accounts through an internal script.

## Story Index

| ID | Feature Area | Persona | Story |
| --- | --- | --- | --- |
| US-001 | Identity | Developer | Sign in with GitHub |
| US-002 | Session | Developer | Resume an authorized session |
| US-003 | Session | Developer | Sign out |
| US-004 | Project access | Unassigned developer | See the no-project state |
| US-005 | Project access | Developer | Select an assigned project |
| US-006 | Project access | Developer | Keep project data within the authorized boundary |
| US-007 | Administration | Application administrator | Find signed-in users and their assignments |
| US-008 | Administration | Application administrator | Assign an existing project to a user |
| US-009 | Administration | Application administrator | Remove a user's project assignment |
| US-010 | Administration | Application administrator | Access every existing project |
| US-011 | Administration | Operator | Provision an initial administrator |

## Identity

### US-001: Sign in with GitHub

**As a** developer, **I want** to sign in with my GitHub account, **so that** Flow Dev knows who I am without a separate password.

Acceptance criteria:

- AC-1: Given a visitor on `/login`, when GitHub authorization succeeds, then Flow Dev opens an authenticated session for the same GitHub account.
- AC-2: Given a visitor who denies, cancels, or fails authorization, when the flow returns, then Flow Dev shows a clear Portuguese error and offers another attempt without opening a session.
- AC-3: Given any valid GitHub account, when sign-in succeeds, then that account may enter Flow Dev even if no project is assigned.
- AC-4: Given a signed-in user, when they revisit `/login`, then they reach their permitted application state without starting a second sign-in.

Edge cases:

- EC-1: A malformed, expired, or mismatched authorization response arrives → sign-in fails with a retry path and no session.
- EC-2: GitHub does not provide an optional profile field such as email or avatar → sign-in still succeeds with a recognizable GitHub identity.
- EC-3: Sign-in is attempted repeatedly or too rapidly → excess attempts are rejected or slowed with a retry message; no duplicate account is created.
- EC-4: The user declines GitHub consent → the user stays signed out and sees an actionable message.
- EC-5: Two sign-in attempts complete for the same browser → only a valid completed attempt establishes the current session.
- EC-6: The browser closes or connectivity fails during GitHub authorization → no partial session remains; the user can retry.
- EC-7: The same authorization result is submitted again → it does not create another session or account.
- EC-8: A protected deep link starts sign-in → after success, the user returns to the requested permitted destination, or to the project choice/no-project state if access is missing.
- EC-9: GitHub marks the account unavailable or authorization cannot be confirmed → the user remains signed out and sees a retry or account-recovery message.
- EC-10: Many users sign in concurrently → each receives only their own identity and session.

## Session

### US-002: Resume an authorized session

**As a** developer, **I want** my session to survive normal navigation and refreshes, **so that** I can continue work without signing in on every page.

Acceptance criteria:

- AC-1: Given a valid session, when the user refreshes or opens another private screen, then they remain signed in as the same GitHub account.
- AC-2: Given an expired or invalid session, when the user opens a private screen or action, then Flow Dev requires sign-in and does not reveal private data.
- AC-3: Given a user who signs in again after expiry, when their requested destination and project remain authorized, then Flow Dev returns them there.

Edge cases:

- EC-1: A damaged or forged session value is sent → private data is withheld and sign-in is required.
- EC-2: No session is present → private screens ask for sign-in without showing another user's data.
- EC-3: A session reaches its validity limit → the next protected action requires reauthentication and explains that the session expired.
- EC-4: A session belongs to another account or lacks current project access → the requested project data is withheld.
- EC-5: Two tabs make requests while a session expires → neither obtains project data after expiry; both can recover through sign-in.
- EC-6: Connectivity fails during session validation → the user sees a retry state without an unauthorized result being treated as success.
- EC-7: Repeated refreshes during a valid session → the same account remains active without duplicate identities.
- EC-8: A deep link is opened before sign-in → its destination is restored only if still permitted after authentication.
- EC-9: GitHub authorization is revoked and Flow Dev detects it → further protected use requires reauthentication.
- EC-10: Many simultaneous private requests arrive → each request is evaluated against its own current session and permission state.

### US-003: Sign out

**As a** developer, **I want** to end my Flow Dev session, **so that** the browser no longer grants access to my projects.

Acceptance criteria:

- AC-1: Given a signed-in user, when they choose “Sair”, then their application session ends and they reach the login screen.
- AC-2: Given a completed sign-out, when the user revisits a private screen or repeats a prior private action, then sign-in is required.
- AC-3: Given the user signs in again, when authorization succeeds, then only their current permitted projects are available.

Edge cases:

- EC-1: An invalid sign-out request arrives → it does not end another user's session.
- EC-2: Sign-out is requested without a current session → the visitor reaches login without an error or access to private data.
- EC-3: Sign-out is requested rapidly many times → the session ends once and later requests stay safe.
- EC-4: A user attempts to sign out a different account → that other account's session remains unaffected.
- EC-5: Two tabs request sign-out together → both end in the signed-out state.
- EC-6: A sign-out request is interrupted → the UI does not claim success until the session is ended; retry remains available.
- EC-7: Sign-out is submitted twice → the second request remains safe and the user stays signed out.
- EC-8: A cached private page is revisited after sign-out → protected data and actions are not usable.
- EC-9: GitHub authorization still exists after local sign-out → the user is signed out of Flow Dev; a new Flow Dev session requires a fresh sign-in flow.
- EC-10: Many simultaneous requests follow sign-out → none can use the ended session to read project data.

## Project access

### US-004: See the no-project state

**As an** unassigned developer, **I want** to understand why no project is available, **so that** I know an administrator must grant access.

Acceptance criteria:

- AC-1: Given successful sign-in and no project assignment, when the app opens, then the user sees a Portuguese no-project state instead of a workspace or another user's data.
- AC-2: Given no assignment, when the user tries a project deep link or private project action, then access is denied and the no-project state remains available.
- AC-3: Given an administrator later assigns a project, when the user refreshes or returns, then the assigned project appears without a new GitHub account registration.

Edge cases:

- EC-1: A malformed project URL is opened → the user sees a safe unavailable-project state.
- EC-2: The project list is empty or all assignments were removed → the no-project state is shown without a broken selector.
- EC-3: An unassigned user has no quota of projects to display → the empty state remains usable without an artificial retry loop.
- EC-4: An unassigned user guesses a project identifier → project existence and content are not disclosed.
- EC-5: An assignment is added while the empty state is open → refreshing reveals the permitted project; no unrelated project appears.
- EC-6: Connectivity fails while checking assignments → the user sees a retryable loading error, not an incorrect permission grant.
- EC-7: Repeated visits to the empty state → it remains consistent and does not create assignments.
- EC-8: A bookmarked workspace URL is opened before assignment → the user lands in the no-project state.
- EC-9: The user's last assignment is removed → the next protected action leaves the workspace and shows the no-project state.
- EC-10: Many unassigned users open the app → each sees only their own no-project state.

### US-005: Select an assigned project

**As a** developer, **I want** to choose and switch among my assigned projects, **so that** I can work in the right context.

Acceptance criteria:

- AC-1: Given one or more assignments, when the user opens project selection, then only their assigned existing projects appear.
- AC-2: Given multiple permitted projects, when the user selects one, then it becomes the active project and the workspace reflects that project.
- AC-3: Given a still-permitted active project, when the user refreshes or returns in the same session, then that selection is retained.
- AC-4: Given the active project is no longer permitted, when the user next acts, then they must choose another permitted project or see the no-project state.

Edge cases:

- EC-1: An invalid project identifier is submitted → it is rejected and the active project is unchanged.
- EC-2: No project is assigned → the no-project state replaces the selector.
- EC-3: A user has more projects than fit on one screen → all permitted projects remain reachable through the selector.
- EC-4: A user selects a project not assigned to them → selection is denied without revealing that project's content.
- EC-5: Two tabs select different permitted projects → each action remains bound to the project explicitly selected for that action; no data crosses contexts.
- EC-6: Switching is interrupted → the prior authorized context remains until a new selection is confirmed.
- EC-7: Selecting the already active project again → the same project remains active without duplicate state.
- EC-8: A deep link names an assigned project → that project opens; an unassigned target is denied.
- EC-9: The selected project is deleted or assignment is removed → it cannot remain usable and another permitted project must be selected.
- EC-10: A large set of assignments exists → the selector remains usable and does not silently omit permitted projects.

### US-006: Keep project data within the authorized boundary

**As a** developer, **I want** every project operation to respect my current access, **so that** one account cannot inspect or change another project's data.

Acceptance criteria:

- AC-1: Given a selected permitted project, when the user reads or changes that project's private data, then the operation is evaluated for that project and succeeds only within its allowed capabilities.
- AC-2: Given a project that is not assigned to a non-administrator, when the user opens a route or submits a direct request for it, then data and mutations are denied.
- AC-3: Given no valid session, when any private project operation is attempted, then it is denied before private data is returned or changed.
- AC-4: Given assignment removal, when a previously permitted user retries an operation, then current permission is enforced even if a page or tab still shows old content.

Edge cases:

- EC-1: A malformed or manipulated project identifier is supplied → the operation fails safely without touching another project.
- EC-2: A required project context is missing → the action asks for a permitted project instead of using an implicit unrelated project.
- EC-3: The user makes many project requests → each request is checked; volume does not relax authorization.
- EC-4: The user sends a valid-looking request for another project → the operation is denied without exposing its data.
- EC-5: Access is revoked during an in-flight mutation → the operation does not commit under a permission that has already been revoked.
- EC-6: A request is interrupted or retried → it does not resume with a different project's context.
- EC-7: A denied mutation is repeated → it remains denied and causes no project change.
- EC-8: A direct API request skips the project picker → the same authorization rule applies.
- EC-9: The project is removed or the user's session expires → further project operations are denied.
- EC-10: Project data grows substantially → access checks still apply to every page, search, and result.

## Administration

### US-007: Find signed-in users and their assignments

**As an** application administrator, **I want** to see users who have signed in and their current project assignments, **so that** I can decide whom to grant access to.

Acceptance criteria:

- AC-1: Given an administrator, when they open access management, then they can find accounts that have completed GitHub sign-in at least once.
- AC-2: Given a listed account, when the administrator inspects it, then its recognizable GitHub identity and current project assignments are shown.
- AC-3: Given a non-administrator, when they attempt the same screen or direct action, then the user directory and assignments are not revealed.

Edge cases:

- EC-1: A malformed search term is entered → the view shows a safe no-match or validation state.
- EC-2: No user has signed in → the administrator sees an empty directory with no assignment action.
- EC-3: Many users exist → the administrator can reach every account through search or pagination.
- EC-4: A developer requests the directory directly → access is denied.
- EC-5: A user signs in while the directory is open → refresh reveals the new account without duplicate rows.
- EC-6: Loading fails → the administrator sees a retryable error and no false empty-state conclusion.
- EC-7: Repeated refreshes → each account appears once with current assignments.
- EC-8: The administrator searches before any users exist → the empty result is clear and does not create an account.
- EC-9: An account is no longer available at GitHub → its assignment record remains identifiable for administration until explicitly changed.
- EC-10: The directory grows substantially → account lookup remains usable and does not silently truncate results.

### US-008: Assign an existing project to a user

**As an** application administrator, **I want** to assign an existing project to a signed-in user, **so that** they can select it in Flow Dev.

Acceptance criteria:

- AC-1: Given an administrator and a user who has signed in, when the administrator assigns an existing project, then that project appears in the user's permitted list.
- AC-2: Given an assignment is complete, when the user opens or refreshes the app, then they can select the new project.
- AC-3: Given a non-administrator, when they attempt to assign any project, then the operation is denied without changing access.
- AC-4: Given a GitHub account that has never signed in, when an administrator looks for it, then it is not eligible for assignment in this flow.

Edge cases:

- EC-1: An invalid user or project is submitted → no assignment is created and the administrator sees an error.
- EC-2: No user or project exists → the assignment action is unavailable with a clear empty state.
- EC-3: Many existing projects are available → the administrator can find a target without a silent list cutoff.
- EC-4: A non-administrator submits the action directly → the assignment is denied.
- EC-5: Two administrators assign the same project to the same user together → one effective assignment exists.
- EC-6: The action is interrupted before confirmation → the administrator can refresh to see whether it succeeded before retrying.
- EC-7: The same assignment is submitted again → it remains one effective assignment.
- EC-8: The administrator tries to assign before the user has signed in → the action is rejected with guidance to wait for first sign-in.
- EC-9: The target project is removed during assignment → no unusable assignment is created.
- EC-10: Many user-project assignments exist → adding one does not alter unrelated assignments.

### US-009: Remove a user's project assignment

**As an** application administrator, **I want** to remove a project assignment, **so that** a user can no longer access that project.

Acceptance criteria:

- AC-1: Given an existing assignment, when the administrator removes it, then it disappears from the user's permitted list.
- AC-2: Given removal of a user's active project, when the user next acts or refreshes, then that project's data and actions are unavailable; they choose another permitted project or see the no-project state.
- AC-3: Given a non-administrator, when they attempt removal, then no assignment changes.

Edge cases:

- EC-1: An invalid assignment identifier is submitted → no other assignment changes.
- EC-2: The user has no assignments → removal is unavailable and the empty state remains clear.
- EC-3: The user has many assignments → only the chosen project is removed.
- EC-4: A non-administrator submits removal directly → it is denied.
- EC-5: Two administrators remove the same assignment together → the final state is removed once.
- EC-6: Removal is interrupted → the administrator can refresh to verify the current state before retrying.
- EC-7: Removal is repeated → it remains removed without affecting other projects.
- EC-8: Removal happens before the user's next page load → any later protected request uses the new permission state.
- EC-9: The target project or user record is already gone → no other access is changed.
- EC-10: Many users share a project → removing one user's assignment does not remove anyone else's.

### US-010: Access every existing project as administrator

**As an** application administrator, **I want** to choose any existing project, **so that** I can perform my administrative and development work without assigning myself.

Acceptance criteria:

- AC-1: Given an administrator, when they open project selection, then every existing project is available regardless of personal assignments.
- AC-2: Given an administrator selects an existing project, when they use its workspace, then they receive the same project context as an assigned developer.
- AC-3: Given an account that is not an administrator, when it requests an unassigned project, then administrator privileges are not inferred from sign-in or project selection.

Edge cases:

- EC-1: An invalid project is requested → the administrator sees an unavailable-project state.
- EC-2: No projects exist → the administrator sees an empty project state, without fabricated access.
- EC-3: Many projects exist → every existing project remains reachable.
- EC-4: A normal user imitates an administrator request → access remains limited to their assignments.
- EC-5: An administrator switches projects in two tabs → actions remain bound to their explicitly selected project.
- EC-6: A switch is interrupted → no action silently targets another project.
- EC-7: Selecting the same project again → no duplicate project state is created.
- EC-8: The administrator follows a direct link to an existing project → it opens after session validation.
- EC-9: The project is deleted → its workspace is no longer usable.
- EC-10: The catalog grows substantially → the administrator can still find any project.

### US-011: Provision an initial administrator

**As an** operator, **I want** to designate the intended initial GitHub accounts as administrators through an internal script, **so that** project access can be managed without first-user privilege escalation.

Acceptance criteria:

- AC-1: Given an explicitly designated GitHub identity, when the operator provisions it, then that identity has administrator privileges on sign-in.
- AC-2: Given a non-designated account signs in first, when it opens Flow Dev, then it remains a normal user.
- AC-3: Given an operator updates the designated set through the internal process, when affected accounts next perform protected actions, then current administrator status applies.
- AC-4: Given a normal administrator in the UI, when they manage assignments, then they cannot silently promote another account to administrator through that workflow.

Edge cases:

- EC-1: The script names an ambiguous or invalid GitHub identity → provisioning stops without granting privileges.
- EC-2: No administrator is designated → sign-in still works, but access management is unavailable until the operator provisions one.
- EC-3: More administrators are designated than a single screen shows → all designated identities retain the same role; none is silently omitted.
- EC-4: An unauthenticated or unauthorized person tries to trigger provisioning → no role changes.
- EC-5: Provisioning runs concurrently with an administrator action → each protected action uses the current recorded role state.
- EC-6: Provisioning is interrupted → the operator can verify which identities hold the role before rerunning it.
- EC-7: The script is run again with the same designated identities → no duplicate administrator records appear.
- EC-8: A designated account has not signed in yet → its role becomes active when the same GitHub identity signs in.
- EC-9: A designation is removed → that identity no longer has administrator privileges on its next protected action.
- EC-10: Many user accounts exist → only explicitly designated identities gain the role.

## Edge-case sweep

Each story was probed against invalid input, empty or missing state, limits, permissions, concurrency, interruption, repetition, ordering, state transitions, and scale. The ten numbered edge cases under each story follow that order. Some entries cover more than one class, and the expected observable outcome is stated in each entry.
