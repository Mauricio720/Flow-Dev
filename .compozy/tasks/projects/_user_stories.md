# User Stories: GitHub-backed Projects

Canonical behavior catalog for the project catalog, project entry, and GitHub repository connection. Companion to `_prd.md`; consumed by `_techspec.md` and `_tests.md`.

## Personas

- **Developer** — a signed-in team member who chooses an assigned project before using its menus and needs trustworthy repository context.
- **Administrator** — a designated Flow Dev administrator who can see all projects, create them, maintain their details, and assign access through the separate authentication feature.
- **Unassigned developer** — a signed-in developer waiting for an administrator to grant access to a project.

## Story Index

| ID | Feature Area | Persona | Story |
| --- | --- | --- | --- |
| US-001 | Project catalog | Developer, administrator | See the projects available to me before entering menus |
| US-002 | Project entry | Developer, administrator | Enter and switch project context |
| US-003 | Repository selection | Administrator | Find and authorize a GitHub repository for a new project |
| US-004 | Project creation | Administrator | Create a project linked to one repository |
| US-005 | Project details | Administrator | Maintain project name and description without changing code identity |
| US-006 | Repository access | Developer, administrator | Use repository-dependent context only with both permissions |
| US-007 | Connection continuity | Administrator, developer | Understand and recover from repository changes or disconnection |

## Project catalog

### US-001: See available projects before menus

**As a** signed-in developer, **I want** a project catalog as my entry point, **so that** I know which project I am working in before opening its menus.

Acceptance criteria:

- AC-1: Given a signed-in developer with project assignments, when they enter Flow Dev without a valid active project destination, then they see only their assigned projects in a catalog before any project menu.
- AC-2: Given a signed-in administrator, when they open the catalog, then they see all existing projects and an action to create a project.
- AC-3: Given a project in the catalog, when its entry is shown, then its name, GitHub repository identity, and current connection or access state are understandable without opening it.
- AC-4: Given a signed-in developer with no assignments, when they open the catalog, then they see the no-project guidance defined by the authentication feature and no project data.
- AC-5: Given many available projects, when the user looks for one, then they can find it by project or repository name without entries silently disappearing.

Edge cases:

- EC-1: A project has no description → its entry remains complete and readable without placeholder content.
- EC-2: The catalog has zero visible projects → a developer sees assignment guidance; an administrator sees a create-project path.
- EC-3: The same project appears through repeated loading → it is shown once, with one destination.
- EC-4: The user's session expires while the catalog is open → private project details are no longer shown and sign-in is required.
- EC-5: An assignment is removed while the catalog is open → the removed project cannot be entered or read on the next action and disappears after the view updates.
- EC-6: The project list is interrupted or unavailable → the user sees a retryable error, not a misleading empty state.
- EC-7: A project name or repository label is unusually long or contains special characters → its identity remains distinguishable and cannot break the catalog layout.
- EC-8: The user has far more projects than fit on one screen → navigation or search reaches every authorized project without silently truncating the list.

## Project entry

### US-002: Enter and switch project context

**As a** developer, **I want** to choose an available project before its menus appear, **so that** subsequent work uses the right repository.

Acceptance criteria:

- AC-1: Given an available project, when the user selects it, then they enter that project's shell with the project name and GitHub repository visible in the context header.
- AC-2: Given the project shell, when the user opens an existing project menu, then that menu is scoped to the selected project.
- AC-3: Given access to more than one project, when the user switches projects, then later project actions use the newly selected project and the previous project's content is no longer presented as current.
- AC-4: Given a valid active project, when the user refreshes or returns to Flow Dev, then the selection remains active or is safely restored according to the authentication feature.
- AC-5: Given a direct link to a project menu, when the user follows it, then the same current project and repository permission rules apply before any project content appears.

Edge cases:

- EC-1: The project identifier in a direct link is malformed or unknown → the user sees a clear unavailable-project state without another project's data.
- EC-2: The selected project loses the user's Flow Dev assignment → project menus become unavailable on the next protected action and the user is guided to another permitted project or the no-project state.
- EC-3: The user repeats selection of the already active project → the project stays active without creating duplicate context or losing their place.
- EC-4: The user selects another project while the first is still loading → only the latest selected project becomes current.
- EC-5: A refresh or network interruption occurs during selection → the user resumes a valid project or returns to the catalog without displaying mixed project content.
- EC-6: The user opens an old tab for a project after access is revoked → that tab cannot reveal project content or perform project actions.
- EC-7: The repository is disconnected after project selection → the shell identifies the selected project but repository-dependent content shows its unavailable state.
- EC-8: The user navigates back from a project menu to the catalog → they can select another available project without signing in again.

## Repository selection

### US-003: Find an eligible GitHub repository

**As an** administrator, **I want** to choose a repository accessible to my GitHub identity, **so that** a new project is connected to real code.

Acceptance criteria:

- AC-1: Given administrator access, when the administrator starts project creation, then they can find and choose a GitHub repository they are authorized to access, including eligible private repositories.
- AC-2: Given that sign-in alone did not grant repository access, when repository authorization is needed, then the administrator sees a clear GitHub authorization path before selection.
- AC-3: Given a selected repository, when the administrator reviews the choice, then its owner and name are visible and Flow Dev confirms that the repository is accessible before project creation.
- AC-4: Given no accessible repositories, when selection opens, then the administrator sees an explanatory empty state rather than an empty unexplained control.
- AC-5: Given a repository already linked to a Flow Dev project, when it appears during selection, then the existing project relationship is clear and it cannot be selected for a duplicate project.

Edge cases:

- EC-1: An entered GitHub URL or search term is malformed → the administrator sees a validation message and no project is created.
- EC-2: The repository list is empty or a search has no matches → the state explains whether there are no accessible repositories or simply no matches.
- EC-3: The administrator searches across many repositories → all eligible matches remain reachable without silent truncation.
- EC-4: GitHub authorization is denied, expired, or blocked by organization policy → selection is blocked with a reason and a retry or access-request path.
- EC-5: Repository access is removed after the list loads but before selection → validation fails and the repository is not treated as connected.
- EC-6: Two creation tabs select the same repository → only one project can claim it; the other tab is directed to the existing project.
- EC-7: GitHub is unavailable or rate limits the request → the administrator sees a retryable state and any unsubmitted project details remain available in the form.
- EC-8: The administrator cancels authorization or leaves and returns → no connection is created merely by viewing or selecting a repository.
- EC-9: The repository is renamed while the picker is open → the final review shows the current identity before creation.

## Project creation

### US-004: Create a repository-backed project

**As an** administrator, **I want** to create a named project with one GitHub repository, **so that** developers have a stable place for future tasks and issues.

Acceptance criteria:

- AC-1: Given an accessible unlinked repository and a valid project name, when the administrator creates a project, then one durable project appears in the catalog with that repository as its sole code source.
- AC-2: Given an optional description, when the project is created, then the description appears in project details and may be absent without blocking creation.
- AC-3: Given a duplicate repository or duplicate project name, when creation is attempted, then no second project is created and the administrator receives a specific explanation.
- AC-4: Given a signed-in non-administrator, when they attempt creation through the interface or a direct request, then creation is denied and no project appears.
- AC-5: Given a successful creation, when an administrator later returns or the service restarts, then the project and repository relationship still exist.
- AC-6: Given a newly created project, when a developer without an assignment opens the catalog, then the new project is not visible to them until an administrator assigns access under the authentication feature.

Edge cases:

- EC-1: The name is blank, whitespace-only, too long, or otherwise invalid → submission is rejected with field guidance and no partial project.
- EC-2: The description is absent → creation succeeds; an overlong description is rejected with field guidance.
- EC-3: The repository is missing, inaccessible, or already linked → creation is blocked with a specific reason.
- EC-4: Two administrators submit the same name or repository concurrently → at most one project is created and the other receives a conflict message.
- EC-5: The administrator submits twice or retries after a slow response → only one project exists for that repository.
- EC-6: The session or administrator role expires before completion → the project is not created and the user is asked to reauthenticate or contact an administrator.
- EC-7: The connection fails during creation → the administrator sees whether creation completed and can retry without a duplicate.
- EC-8: A user follows the create-project destination before signing in → sign-in is required and the form does not disclose private repository data.
- EC-9: The catalog already contains many projects → creating one adds a reachable entry without hiding older projects.

## Project details

### US-005: Maintain descriptive project details

**As an** administrator, **I want** to update a project's name and description, **so that** the catalog stays understandable as the team evolves.

Acceptance criteria:

- AC-1: Given an existing project, when the administrator edits its name or description with valid values, then the new details appear in the catalog and project shell after saving.
- AC-2: Given an existing project, when the administrator opens its details, then its connected GitHub repository is visible and cannot be replaced by another repository through editing.
- AC-3: Given a non-administrator, when they open project details, then they can see permitted descriptive details but cannot edit them through the interface or a direct request.
- AC-4: Given a saved edit, when the user refreshes, then the details remain saved and the repository relationship remains the same.

Edge cases:

- EC-1: The new name is blank, too long, or duplicates another project's name ignoring case → the edit is rejected and the prior name remains visible.
- EC-2: The description is cleared → the project remains valid and the description becomes absent.
- EC-3: A non-administrator submits a forged edit request → it is denied without changing project details.
- EC-4: Two administrators edit the same project from stale views → the later editor is told that the details changed and can review them before overwriting.
- EC-5: The save is interrupted or the tab closes mid-request → reopening shows the last confirmed saved version, never a partial mixture of fields.
- EC-6: The administrator repeats an already completed save → the displayed result remains one consistent version.
- EC-7: An attempted repository replacement through a direct request → it is denied; the project keeps its original repository.
- EC-8: A long name or description is loaded in a compact catalog view → the project and repository identities remain distinguishable.

## Repository access

### US-006: Use repository context with both permissions

**As a** project member, **I want** repository-backed information to reflect my own GitHub access, **so that** Flow Dev does not expose code I cannot access on GitHub.

Acceptance criteria:

- AC-1: Given a current Flow Dev project assignment and GitHub access to its repository, when the user opens repository-dependent project content, then it is available in the selected project's context.
- AC-2: Given a Flow Dev assignment but no GitHub access, when the user opens that project, then they can identify the project and see what access is missing, but no private code content is shown.
- AC-3: Given GitHub repository access but no Flow Dev assignment, when a non-administrator requests that project directly, then project data and repository-dependent content are denied.
- AC-4: Given an administrator, when they use repository-dependent content in any project, then their own GitHub access is still required.
- AC-5: Given a project with public repository content, when an authorized Flow Dev user opens it, then ordinary public GitHub visibility is respected without implying private access.
- AC-6: Given a GitHub consent or organization approval requirement, when the user follows the access guidance and completes it, then repository-dependent content can become available without changing their Flow Dev assignment.

Edge cases:

- EC-1: The GitHub repository permission is revoked during an open session → the next repository-dependent action is denied and previously displayed private content is not served as current data.
- EC-2: The Flow Dev assignment is revoked while GitHub access remains → the next protected action denies project access.
- EC-3: The user's GitHub authorization expires → the project stays identifiable, but code actions pause until authorization is renewed.
- EC-4: GitHub returns a temporary error or rate limit → the UI distinguishes temporary unavailability from a definite permission denial and offers retry.
- EC-5: The user retries authorization repeatedly → each attempt is safe; no broader project assignment or duplicate project is created.
- EC-6: A stale tab or direct request asks for another project's repository → it cannot return that repository's private data.
- EC-7: The repository contains very large content → the user can navigate the project shell without waiting for full code retrieval.
- EC-8: An administrator assigns a project while the developer lacks GitHub access → the developer sees the project with an access-needed state, not a false claim of connection.

## Connection continuity

### US-007: Understand repository connection changes

**As an** administrator or project member, **I want** the project's repository state to remain accurate, **so that** I know whether it is safe to work from its code context.

Acceptance criteria:

- AC-1: Given a repository rename or transfer that preserves the same GitHub repository, when Flow Dev refreshes the connection, then the project keeps its identity and shows the current owner/name.
- AC-2: Given repository access loss, deletion, or unavailability, when a user opens the project, then the connection state is visible and repository-dependent actions do not claim to use current code.
- AC-3: Given a recoverable permission or authorization problem, when an administrator or affected user follows the guidance and access returns, then the same project becomes usable again without a duplicate project.
- AC-4: Given a permanently different replacement repository, when the administrator attempts to attach it to the existing project, then Flow Dev requires creation of a new project instead.
- AC-5: Given a temporary GitHub outage, when service returns and the connection is checked again, then the project resumes without requiring recreation.

Edge cases:

- EC-1: A renamed repository's old URL is used → Flow Dev resolves the existing project or presents the current identity; it does not create a duplicate.
- EC-2: A repository is transferred to an organization that blocks authorization → the project remains visible to permitted Flow Dev users but code actions show the access problem.
- EC-3: The repository is deleted or becomes unavailable → the project remains identifiable; no unrelated repository is substituted automatically.
- EC-4: Two users check the connection at the same time → they see a consistent project identity, even if their personal GitHub access states differ.
- EC-5: A permission repair is interrupted → the project keeps the unavailable state until a later successful check.
- EC-6: A user retries after a temporary outage → the connection can recover without changing project identity or creating another project.
- EC-7: A direct link reaches a disconnected project before the catalog loads → it shows the same connection state and enforces the same permissions.
- EC-8: Many projects have stale connection states → the catalog remains usable and each project reports its own state without hiding entries.
- EC-9: The repository is archived and remains readable → the project identifies the archive state; later write-dependent actions must not appear ready when GitHub disallows them.
