# PRD: GitHub-backed Projects

## Overview

Flow Dev currently opens a simulated issue workspace directly, while its small project catalog lives only on a development page and stores names and descriptions in memory. Developers need to choose the project whose code gives meaning to their work before entering project menus. This feature makes a project catalog the entry point after sign-in and connects every project to one real GitHub repository as its source of truth. Administrators create and maintain projects; assigned developers select one and use its repository context subject to their own GitHub access. The catalog takes its project-first hierarchy from Supabase while keeping Flow Dev's identity and Portuguese interface.

## Goals

- A signed-in user without a valid active project encounters their permitted project catalog before project menus and can enter one active project at a time.
- An administrator can create a durable project by choosing one GitHub repository they can access and giving the project a name.
- Every project has exactly one stable GitHub repository identity; a repository cannot silently become a different codebase or belong to duplicate projects.
- A user can tell which project and repository are active, whether the connection is usable, and what to do when access is missing.
- Repository-dependent content requires both Flow Dev project permission and the user's own GitHub access.
- Project identity and connection survive refreshes, sign-ins, and service restarts.

## User Stories

[Full user stories](_user_stories.md)

- `US-001`: Project catalog, visibility, discovery, and empty states.
- `US-002`: Project entry, active context, switching, and direct links.
- `US-003`–`US-004`: Repository selection and administrator project creation.
- `US-005`: Administrator maintenance of descriptive project details.
- `US-006`–`US-007`: Per-user repository access and connection continuity.

## Core Features

### Project catalog and entry

- After sign-in without a valid active selection, present a project catalog before project-specific menus. A valid previous selection may resume automatically under the authentication PRD. A non-administrator sees only projects assigned under that feature; an administrator sees all projects.
- Each project entry identifies the project, its GitHub owner/repository, and whether repository access or connection needs attention. Users can find a project by name or repository identity as the catalog grows.
- Selecting a project opens a project-specific shell. Its header shows the active project and repository, offers a route back to the catalog or another permitted project, and places existing menus within that project context.
- Preserve a valid active project through normal navigation and refresh, consistent with the authentication PRD. A direct link to a project or menu observes the same permissions and context as catalog selection.
- A signed-in person without any permitted project sees the no-project state already defined by the authentication feature. An administrator with an empty catalog sees a clear create-project action.

### GitHub repository selection

- An administrator can find and select an accessible GitHub repository when creating a project. Public and private repositories may be selected when the administrator has the necessary GitHub access.
- If identity sign-in has not granted repository access, explain the separate GitHub authorization or organization approval needed before selection. Denial and temporary GitHub failure produce distinct, recoverable states.
- Confirm the selected repository's current owner and name and verify access before creating the project. The selection is a real repository connection, not an unchecked text URL.
- A repository already linked to a project is identified as such and cannot create a duplicate project.

### Project creation and details

- Only administrators may create projects. A project requires a name and exactly one verified GitHub repository; its description is optional.
- A successful creation persists the project and repository relationship. Administrators see it immediately. Non-administrators see it only after assignment through the access-management feature.
- Administrators may update a project's name and description. They cannot replace its repository with a different one. A renamed or transferred GitHub repository remains the same project when GitHub still identifies it as the same repository.
- A different codebase requires a new Flow Dev project. Existing or future project work must not be retargeted by editing a repository URL.

### Repository access and connection state

- Flow Dev project membership controls who may see and enter a project. GitHub permission through the current user's identity additionally controls access to that project's repository content and repository-dependent actions. Administrator-wide Flow Dev access does not waive the GitHub requirement.
- An assigned user without GitHub repository access may see the project and an explanation of the missing access, but may not receive private code content or use repository-dependent actions. A user with GitHub access but no Flow Dev assignment may not use the project.
- Show an accurate project connection state when the repository is available, authorization is missing, GitHub is temporarily unavailable, or the repository is gone. Distinguish personal access problems from a project-wide connection problem where possible.
- Recover the same project after a repository rename, transfer, restored permission, or temporary GitHub outage. Never substitute a different repository automatically.
- When a repository is archived but readable, show its archive state and avoid presenting write-dependent actions as available if GitHub disallows them.

## Business Rules

1. Each project has exactly one GitHub repository as its sole source of code truth. Local folder paths are not project sources.
2. Each GitHub repository may be linked to at most one Flow Dev project. Repository identity follows the repository itself across rename or transfer, rather than relying only on its current URL or owner/name.
3. A different repository requires a different project. The project creation and edit flows must not let an administrator silently repoint a project to an unrelated repository.
4. Project names contain 2–60 characters after trimming and are unique without regard to case. Descriptions are optional and contain at most 280 characters after trimming. Blank or invalid fields are rejected without creating or partially changing a project. These limits retain the existing catalog's accepted input rules.
5. A project is created only after the chosen GitHub repository has been verified as accessible to the administrator. If validation or persistence fails, the user sees a recoverable outcome and no partial project.
6. Only administrators can create projects or change descriptive details, including through direct requests. They can see every project without assigning themselves. The authentication PRD remains the source of truth for administrator designation and user-project assignments.
7. A non-administrator can see only currently assigned projects. An assignment grants Flow Dev project visibility, not GitHub repository rights. Removing an assignment revokes project access on the next protected action.
8. Reading repository-dependent content or performing a repository-dependent action requires current Flow Dev access to the selected project and current GitHub access for that same user and repository. A valid Flow Dev session by itself is insufficient.
9. Each project-specific screen and action uses one explicit active project. Switching projects changes later context. Direct links, open tabs, and direct requests cannot bypass current project or repository permission.
10. A project remains identifiable when its repository is renamed, transferred, inaccessible, deleted, archived, or temporarily unavailable. Connection problems do not automatically erase the project or move it to another repository.
11. Duplicate and concurrent creation requests for the same repository or case-insensitive project name leave at most one successful project. Retrying after an uncertain response must not make duplicates.
12. No fixed product limit is introduced for the number of projects or accessible repositories. Catalog and repository selection must keep all eligible entries reachable without silent truncation.

## User Experience

### Administrator journey

1. The administrator signs in with GitHub and arrives at the project catalog.
2. They choose to create a project, grant repository access if required, and find the desired GitHub repository.
3. They review the repository identity, enter a project name and optional description, and create the project.
4. The new project appears in the catalog. The administrator can enter it, see its GitHub identity and connection state, and edit its descriptive details later.
5. The administrator assigns access to team members through the separate authentication feature. A new project does not become visible to every signed-in user merely because it exists.

### Developer journey

1. The developer signs in and sees their assigned projects before any project menu. If none are assigned, they see guidance to contact an administrator.
2. They select a project. The project header makes the current project and GitHub repository visible while they use its menus.
3. If their GitHub identity lacks repository access, they see why repository-dependent work is unavailable and how to seek or renew access. Flow Dev does not display private code through someone else's permission.
4. They can return to the catalog and select another assigned project. Returning to a valid active project after refresh remains possible.

### Interface requirements

- Use the project-first hierarchy and scan-friendly catalog behavior of Supabase as a visual reference: a clear project heading, prominent create action for administrators, individually identifiable project entries, and project navigation that appears after selection. Adapt those patterns to Flow Dev's typography, colors, density, and existing design rules. Do not copy Supabase organization, billing, or database concepts into the product.
- Keep user-facing language in pt-BR. Show repository names and paths exactly as GitHub identifies them; distinguish project name from repository identity.
- Make catalog entries, search, project switching, creation, authorization guidance, and errors usable by keyboard with visible focus and readable status messages.
- Explain empty catalog, no assignment, no repository matches, denied GitHub access, expired authorization, temporary failure, and disconnected repository as different states. Do not label an error as an empty list or claim that demo code is live repository data.
- Existing simulated issue-workspace content may remain clearly marked as demonstration until its own live integration exists, but it must appear under an explicit selected project and may not claim to have read that project's code.

## High-Level Technical Constraints

- This feature depends on the GitHub identity, application session, administrator role, and project-assignment rules defined in the [GitHub authentication PRD](../github-authentication/_prd.md). The current implementation is still simulated, so the integration must be checked against the delivered authentication behavior rather than assumed complete.
- Use GitHub as the live authority for repository identity, availability, and the current user's repository permission. Ask for repository access separately from identity sign-in when needed, and explain GitHub or organization approval requirements.
- Persist projects and repository relationships durably. The existing in-memory project catalog is a prototype and cannot meet refresh, restart, or concurrent-creation behavior.
- Protect project data and repository-dependent actions across page navigation and direct backend requests. Do not expose one user's repository content to another through shared application access or stale data.
- Do not place GitHub credentials or private repository data in client-visible configuration or source files. Repository permission and authorization changes must have a recoverable user experience.
- The project shell must make the selected repository available as context for later tasks and issue workflows, while this PRD does not define those workflows or their internal integrations.

## Non-Goals (Out of Scope)

- Registering or reading a local code folder. The user changed the initial local-or-GitHub idea to GitHub as the sole source of truth.
- Linking both a local checkout and GitHub to the same project. The user chose one GitHub repository per project.
- Replacing an existing project's repository with a different codebase. The user chose a new project for a different repository.
- Creating or managing tasks within projects. The user explicitly reserved tasks for a separate PRD; this feature establishes the project boundary they will use.
- Live Issue Author code search, GitHub issue publication, and GitHub issue history. They remain separate capabilities; any existing demonstration must be labeled accurately.
- Supabase-style organizations, billing, or database resources. Supabase is a visual reference for project entry, not a feature model for Flow Dev.

## Architecture Decision Records

- [ADR-001: One GitHub repository is the project source of truth](adrs/adr-001.md) — Each project has one stable GitHub repository; a different repository needs a new project.
- [ADR-002: Project membership and GitHub access both govern code use](adrs/adr-002.md) — Repository-dependent work requires application and GitHub permission for the user.
- [ADR-003: Project catalog is the gateway to project menus](adrs/adr-003.md) — Users select a project before its menus; administrators create and maintain projects.

## Open Questions

- None for the product behavior in this PRD. The TechSpec must resolve GitHub permission mechanisms, connection checks, durable storage, routing, and integration with the authentication feature.
