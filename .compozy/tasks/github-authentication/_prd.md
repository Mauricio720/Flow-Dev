# PRD: GitHub Authentication and Project Access

## Overview

Flow Dev currently shows a GitHub login screen, but its sign-in button only navigates to a public demo workspace. A visitor can also open the workspace and project procedures without a session. This feature makes GitHub sign-in real, establishes an application session, and limits project access according to administrator-managed assignments. It serves developers who work in a selected project and administrators who manage those assignments. Repository connection and issue publication remain separate product capabilities.

## Goals

- A person with any valid GitHub account can sign in to Flow Dev and sign out of its application session.
- Private screens and project operations require a valid session.
- A non-administrator sees only projects assigned to their GitHub identity and works in one active project at a time.
- An administrator can find users who have signed in, assign or remove access to existing projects, and use every existing project.
- A signed-in user without a project sees a clear no-project state and cannot read or change project data.
- Changes to assignments affect the next protected action, including actions from a previously open tab.

## User Stories

[Full user stories](_user_stories.md)

- `US-001`: GitHub identity and first sign-in.
- `US-002`–`US-003`: Session continuity, expiry, and sign-out.
- `US-004`–`US-006`: No-project state, active project selection, and project authorization.
- `US-007`–`US-010`: Administrator user directory, assignment management, and global project access.
- `US-011`: Explicit initial administrator provisioning.

## Core Features

### GitHub sign-in and session

- Replace the simulated login action with a real GitHub authorization flow. GitHub is the only sign-in method.
- Create or recognize the same application user from the verified GitHub identity. Optional missing profile fields do not block sign-in.
- Accept any valid GitHub account in this feature, regardless of project assignment. Admission control by an administrator is a later feature.
- Preserve a valid session through navigation and refresh. End it on explicit sign-out. Require sign-in when the session is invalid or expired.
- Show understandable Portuguese messages for denied consent, failed authorization, expired sessions, and retryable interruptions.
- Return a user to their requested private destination after sign-in only if they remain authorized for it; otherwise show project selection or the no-project state.

### Project choice and isolation

- Show non-administrators only existing projects assigned to them. Allow multiple assignments, but use one active project for each workspace action.
- Keep the selected project active across normal navigation and refresh while access remains valid. Allow switching among permitted projects.
- Require a permitted project for project-specific screens and actions. A user with no permitted project sees a no-project state explaining that an administrator must grant access.
- Enforce the same access rule on direct requests, deep links, and previously open tabs. Removing an assignment makes that project's data and actions unavailable on the next protected action.
- Do not use GitHub repository access as a substitute for application project permission. The project-creation feature will define repository connection.

### Administrator access management

- Show administrators a searchable or otherwise navigable directory of accounts that have completed GitHub sign-in at least once, with each account's current project assignments.
- Let administrators assign an existing project to a listed user and remove an existing assignment. Repeating the same action must leave one consistent effective assignment state.
- Show administrators every existing project and let them use any of them without assigning themselves.
- Prevent non-administrators from viewing the user directory or changing assignments, including through direct requests.
- Keep administrator role management out of the application UI for this feature.

### Initial administrator provisioning

- An internal script explicitly designates the initial administrator GitHub identities. The first account to sign in never receives the role automatically.
- A designated account receives its administrator role when it signs in, including if the script ran before its first sign-in.
- Changes to the designated set take effect on subsequent protected actions. Running the provisioning process again with the same set does not duplicate privileges.

## Business Rules

1. A successful GitHub sign-in identifies exactly one application account. A GitHub account's display name, handle, email, or avatar may change or be absent without transferring its access to another account.
2. A valid session proves the application user identity; it does not itself grant project access or GitHub repository permissions.
3. Any GitHub account may hold a session. An unassigned non-administrator has zero project visibility and zero project operations.
4. A non-administrator's visible projects are exactly their current assignments to existing projects. They cannot self-assign, inspect another user's assignments, or infer another project's private data through a direct request.
5. An administrator's visible projects are all existing projects. Administrator status does not depend on project assignments.
6. Every project-specific action has one explicit active project and checks current access to that project. Selection cannot bypass permission checks.
7. Assignments may be created only for accounts that have completed sign-in at least once and only for existing projects. A user may have multiple assignments; duplicate user-project assignments have one effective result.
8. Removing an assignment revokes that user's access to that project on the next protected action. If it was the active project, the user must select another permitted project or see the no-project state.
9. Only designated administrators may inspect users and change assignments. The internal script is the only administrator-role provisioning path in this feature.
10. Failed or canceled GitHub authorization opens no session. An invalid or expired session returns no private data. A completed sign-out ends the Flow Dev session; it does not imply that the user signed out of GitHub itself.
11. Existing project data operations must follow these rules even when called outside the normal UI. The current project creation demonstration must not be exposed as an unrestricted project operation.
12. No arbitrary product limit on the number of assigned projects or users is introduced by this feature. Long lists must remain navigable without silently hiding authorized entries.

## User Experience

### Developer journey

1. The visitor opens `/login` or a private destination that sends them to sign-in.
2. The visitor chooses “Continuar com GitHub,” reviews GitHub's identity authorization, and returns to Flow Dev.
3. If the account has projects, the user selects one from their permitted list; a valid previous selection can resume automatically. If none are assigned, the user sees an explanation that an administrator must grant access.
4. The selected project is visible in the workspace context. Switching projects changes the context for later actions.
5. “Sair” ends the application session. Returning to private content requires sign-in.

### Administrator journey

1. The operator runs the internal provisioning script for the intended administrator GitHub identities.
2. A designated administrator signs in and can see all existing projects and the access-management area.
3. A developer signs in for the first time and appears in the administrator's user directory, even if no project is assigned.
4. The administrator assigns one or more existing projects. The developer can select them on refresh or return.
5. The administrator can remove an assignment. The affected developer loses that project's access on the next protected action.

### UI and accessibility requirements

- Keep the existing Portuguese login screen and its clear GitHub action; replace simulation claims and behavior with accurate authorization copy.
- Show pending, denial, expiry, connection failure, empty-project, and revoked-access states in understandable language. Do not imply that a failed authorization succeeded.
- Make project selection, access management, errors, and sign-out keyboard operable with visible focus and readable status messages.
- Keep demo workspace content clearly marked as demonstration until its separate backend integrations exist. Do not present demo content as live repository data or let it reveal another project's private content.
- When a user loses the active project's permission, explain the change and guide them to another permitted project or the no-project state.

## High-Level Technical Constraints

- Integrate with GitHub for identity verification and obtain only the permissions required for this feature. Repository content access and issue-write permission belong to project creation and publication flows.
- Apply session and project authorization across the Next.js application and the existing tRPC project operations, including direct calls. A public health check may remain public if it exposes no private data.
- Use durable identity, role, and assignment records so sign-in, refresh, and process restarts preserve current access. The existing in-memory project catalog cannot be treated as a durable authorization source.
- Keep GitHub credentials and session secrets out of client-visible content and repository files. Give users a recoverable path after authorization denial, expiry, or revocation.
- The administrator script must identify the intended GitHub accounts unambiguously and must not embed credentials. Initial administrator account identifiers are supplied for deployment, not fixed in the PRD.
- Session and project checks must remain correct under concurrent sign-ins, assignment changes, and open tabs.

## Non-Goals (Out of Scope)

- Administrator approval or blocking of which GitHub accounts may sign in. The user explicitly deferred this control.
- Connecting GitHub repositories, choosing which repositories an application project can access, or creating projects. The user assigned repository control to the separate project-creation feature.
- Reading repository contents, searching live GitHub issues, publishing issues, or replacing the demonstrated Issue Author workflow with live integrations.
- Managing administrator roles through the Flow Dev UI. Initial and subsequent designation uses the internal script in this feature.
- Alternative identity providers or a Flow Dev password.

## Architecture Decision Records

- [ADR-001: GitHub identity and application session](adrs/adr-001.md) — Sign-in authenticates any GitHub account without repository access.
- [ADR-002: Project-scoped access with administrator assignments](adrs/adr-002.md) — Users choose among assigned projects; administrators manage assignments and access all projects.
- [ADR-003: Explicit initial administrator provisioning](adrs/adr-003.md) — An internal script designates administrators, avoiding first-sign-in privilege escalation.

## Open Questions

- Which GitHub identities should the operator provision as the initial administrators for each deployment? The feature behavior is decided; the account list is deployment input.
- Which existing projects will be available when this feature is first used, before the separate project-creation feature is delivered? Project creation is outside this PRD; authorization requires an existing catalog to assign from.
