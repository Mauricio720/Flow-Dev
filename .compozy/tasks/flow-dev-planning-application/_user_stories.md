# User Stories: Continue Published Issues into Planning

Canonical behavior catalog for Flow Dev planning after Issue publication. Companion to [_prd.md](_prd.md); consumed by `_techspec.md` for component mapping and `_tests.md` for coverage mapping. Story, acceptance-criterion, and edge-case IDs remain stable once written.

## Personas

- **Author** — The developer who created the intention. Needs to request analysis, understand the recommendation, choose a route, and approve it while retaining the published Issue and its context.
- **Project reader** — Another project member with personal repository access. Needs to follow the change and inspect the decision without changing another developer's work.
- **Administrator** — A user with the existing administrative project visibility. Needs to inspect planning under the same personal repository-access requirements and authorship restrictions as other users. An administrator who is the author uses the author stories.

## Story Index

| ID | Feature Area | Persona | Story |
| --- | --- | --- | --- |
| US-001 | Continuation | Author | Continue a confirmed published Issue in the same work item |
| US-002 | Analysis | Author | Explicitly request the next-step analysis |
| US-003 | Analysis | Author | Resume an accepted analysis after leaving the workspace |
| US-004 | Recovery | Author | Recover a failed planning attempt without duplicating work |
| US-005 | Human View | Author | Understand the saved PlanningDecision and its uncertainties |
| US-006 | Route selection | Author | Save a different route while preserving the recommendation |
| US-007 | Approval | Author | Approve the saved route and retain a read-only decision |
| US-008 | Lifecycle | Author | Follow publication and planning as distinct stages |
| US-009 | Artifacts and context | Author | Inspect the Issue and planning independently of the conversation |
| US-010 | Shared visibility | Project reader | Follow another author's planning in read-only mode |
| US-011 | Administrative visibility | Administrator | Inspect planning without bypassing repository access or authorship |

## Continuation

### US-001: Continue a confirmed published Issue

**As an** author, **I want** the published Issue to lead into planning in the same workspace, **so that** publication does not end the development intention.

Acceptance criteria:

- AC-1: Given confirmed publication, when the author opens the existing Issues entry, then the same selected intention shows the linked Issue and an awaiting-planning state instead of declaring the entire change complete.
- AC-2: Given a published Issue without a PlanningDecision or active analysis, when its workspace loads, then the author sees “Analisar próxima etapa” and an explanation that Dev Control can recommend the next development step.
- AC-3: Given a task published before this feature existed, when the author opens it, then it is eligible for the same planning journey without recreating the intention or republishing the Issue.
- AC-4: Given continuation into planning, when the author inspects the entry, then its existing author, project, repository, conversation, draft history, and publication identity remain associated with that change.

Edge cases:

- EC-1 (Invalid input): An invalid or mismatched task/project reference is opened → the workspace reports the item unavailable and does not display another project's content.
- EC-2 (Empty / missing): The publication link or confirmed Issue identity is missing → no planning can start; the workspace explains that a confirmed publication is required.
- EC-3 (Limits): A long title or repository label appears → the layout remains usable and the full identity remains inspectable rather than being silently changed.
- EC-4 (Permissions): A nonauthor opens the published item → they receive the reader experience and cannot start planning.
- EC-5 (Concurrency): Another tab has already started planning → a new start cannot create a second analysis; the current accepted state is shown.
- EC-6 (Interruption): The browser closes immediately after confirmed publication → returning restores the published Issue and planning eligibility without republishing.
- EC-7 (Repetition): The author repeatedly opens or refreshes the entry → no analysis starts until explicitly requested.
- EC-8 (Ordering): Publication is still in progress or uncertain → planning stays unavailable until the existing publication is confirmed.
- EC-9 (State transitions): A decision already exists or is approved → reopening shows review or approval, not a fresh awaiting-planning action.
- EC-10 (Scale): The project has zero, many, or many historical published items → existing history navigation remains usable, and only the selected item's actual planning state is shown.

## Analysis

### US-002: Explicitly request the next-step analysis

**As an** author, **I want** to request Dev Control analysis of my published Issue, **so that** I receive a grounded route recommendation for the same change.

Acceptance criteria:

- AC-1: Given an eligible published item, when the author selects “Analisar próxima etapa,” then an accepted request changes the visible stage to planning in progress with Dev Control attribution.
- AC-2: Given accepted analysis, when Dev Control processes the request, then it analyzes the retained approved Issue snapshot for that work item and produces a PlanningDecision associated with that Issue and change.
- AC-3: Given a valid completed analysis, when its decision is saved, then the item enters planning review and presents the saved result without requiring another click to retrieve it.
- AC-4: Given analysis in progress, when the author observes the screen, then progress describes the real accepted operation and does not invent tool activity, completion percentages, or successful results.
- AC-5: Given the request is rejected before acceptance, when the author sees the failure, then the item does not falsely appear to have a running or completed analysis.

Edge cases:

- EC-1 (Invalid input): A request refers to an unrelated Issue, unsupported command, or another project → it is rejected without changing the work item.
- EC-2 (Empty / missing): The approved Issue snapshot is absent or unusable → analysis does not proceed with invented content and the author sees an actionable failure.
- EC-3 (Limits): Dev Control is busy or an input exceeds its supported limits → the author sees waiting or an explicit limit failure as appropriate; source content is not silently truncated.
- EC-4 (Permissions): The author's session or project/repository access is no longer valid → the protected action is rejected and recovery guidance is shown without exposing credentials.
- EC-5 (Concurrency): Two start actions race from separate tabs → at most one analysis is accepted for the work item and both tabs converge on it.
- EC-6 (Interruption): The connection drops while starting → returning checks the accepted state before offering another start and does not assume the request failed.
- EC-7 (Repetition): The same accepted start is submitted again → the existing accepted outcome is returned without another authoritative analysis or decision.
- EC-8 (Ordering): The author requests planning before confirmed publication → the request is rejected with no planning transition.
- EC-9 (State transitions): A request targets an item already under review or approved → its current decision is retained and no replacement analysis starts.
- EC-10 (Scale): Several different work items are analyzed concurrently → each result and progress indicator remains attached to its own item, and queued work is not presented as completed.

### US-003: Resume an accepted analysis

**As an** author, **I want** planning to survive navigation and reconnection, **so that** I can leave the workspace without losing accepted work or triggering it again.

Acceptance criteria:

- AC-1: Given accepted analysis, when the author refreshes, navigates away and back, or signs in again with restored access, then the workspace displays the saved current state of that analysis.
- AC-2: Given analysis finishes while the author is away, when the author returns, then the saved PlanningDecision is available in review.
- AC-3: Given processing is interrupted, when recovery determines the accepted operation's outcome, then the workspace converges on running, review, or a recoverable failure; it does not remain falsely complete or indefinitely depend on the original browser tab.
- AC-4: Given the author selects another intention while analysis continues, when the original result arrives, then it does not replace the other intention's content or selection.

Edge cases:

- EC-1 (Invalid input): A malformed or stale navigation reference is restored → the workspace reports unavailability instead of loading a different item.
- EC-2 (Empty / missing): The decision is not yet saved → progress remains in analysis; an empty decision is not presented for approval.
- EC-3 (Limits): Progress checks are temporarily rate-limited → the last confirmed state stays identifiable, with a refresh/recovery path and no new analysis implied.
- EC-4 (Permissions): Access was revoked while the author was away → returning does not reveal protected content; restoration resumes the saved item under normal access checks.
- EC-5 (Concurrency): A second tab completes approval while the first is reconnecting → the first converges on the approved state and cannot replace it with stale progress.
- EC-6 (Interruption): The service restarts during analysis → accepted work remains discoverable and reaches a recoverable outcome without requiring the old tab to remain open.
- EC-7 (Repetition): Refreshing repeatedly during a slow run → the same logical analysis is resumed rather than restarted.
- EC-8 (Ordering): An older running-state response arrives after a completed-state response → the displayed state does not move backward.
- EC-9 (State transitions): An abandoned attempt completes after recovery has made it obsolete → it cannot replace the current saved decision or its state.
- EC-10 (Scale): The author navigates a long history while other items run → each item's state remains distinguishable and the selected workspace remains usable.

## Recovery

### US-004: Recover a failed planning attempt

**As an** author, **I want** an explanation and a safe retry after failed analysis, **so that** I can recover without losing the published Issue or creating duplicate planning.

Acceptance criteria:

- AC-1: Given a confirmed analysis failure, when its state is displayed, then the author sees a user-readable reason and the applicable recovery action while the Issue and prior conversation remain intact.
- AC-2: Given no active analysis or successful decision and valid access, when the author explicitly retries a failed attempt, then planning returns to in-progress and can produce one saved reviewable decision.
- AC-3: Given invalid or incomplete Dev Control output, when validation fails, then no fabricated or partial PlanningDecision becomes approvable; the author sees a recoverable failure.
- AC-4: Given a retry succeeds, when the author opens the result, then the saved decision is current, and retry controls no longer invite replacement of that result.
- AC-5: Given planning fails or is retried, when the author checks GitHub identity, then the original Issue remains linked and neither another Issue nor a planning comment has been created by recovery.

Edge cases:

- EC-1 (Invalid input): A retry references another task or a failure that is no longer current → it is rejected and the current state is shown.
- EC-2 (Empty / missing): Dev Control returns no decision, no usable rationale, or an unknown route → a failure is shown, never a default route presented as the agent's recommendation.
- EC-3 (Limits): Output is too large, processing times out, or a rate limit is reached → the failure distinguishes the recovery need without displaying unbounded raw output or silently truncating a decision into validity.
- EC-4 (Permissions): Retry requires restored sign-in or repository access → restoration alone does not restart analysis; the author takes the available explicit retry action.
- EC-5 (Concurrency): Retry races with another retry or a completed result → only the current valid outcome governs the item; no second current decision appears.
- EC-6 (Interruption): A retry's response is lost → the author can discover whether it was accepted before another attempt is offered.
- EC-7 (Repetition): The same retry is submitted more than once → the existing logical retry is returned and no extra result replaces it.
- EC-8 (Ordering): Retry is requested while the outcome is still running or unconfirmed → the current attempt is resolved first, with no competing accepted analysis.
- EC-9 (State transitions): Retry is requested after successful review or approval → it is rejected and the saved decision is preserved.
- EC-10 (Scale): Many items have failed → each item's recovery affects only that item and does not hide or overwrite another item's result.

## Human View

### US-005: Understand the PlanningDecision

**As an** author, **I want** a readable explanation of the recommended route, **so that** I can make an informed choice without interpreting technical output.

Acceptance criteria:

- AC-1: Given a saved decision, when review opens, then the primary view identifies Dev Control and displays complexity, summary, recommended route, selected route, reasons, uncertainties, and review status as understandable fields.
- AC-2: Given the decision recommends Direct execution, Tech Spec, or PRD, when that route is displayed, then its next activity is explained without suggesting the activity has already started or produced an artifact.
- AC-3: Given no uncertainties were reported, when the decision is displayed, then an explicit no-reported-pendencies state appears without inventing certainty about implementation.
- AC-4: Given reported uncertainties, when the author reviews or approves, then all uncertainties remain inspectable and do not require responses or a separate acknowledgement to permit approval.
- AC-5: Given keyboard, screen-reader, narrow-screen, or reduced-motion use, when the author reviews the decision, then content and controls remain reachable, named, and understandable without depending on color or animation.
- AC-6: Given technical detail is available, when review opens, then raw JSON, Markdown, and logs are not the primary decision interface.

Edge cases:

- EC-1 (Invalid input): Agent text contains markup, script-like content, or hostile links → it is presented safely without executing instructions or replacing trusted controls.
- EC-2 (Empty / missing): Required decision content is absent → the result is not shown as a valid review; a valid empty uncertainties collection receives its explicit empty state.
- EC-3 (Limits): Reasons or uncertainty descriptions are long → they wrap or expand accessibly and remain fully inspectable within supported limits.
- EC-4 (Permissions): Another authorized member opens this view → the same saved explanation is readable, but author-only actions remain unavailable.
- EC-5 (Concurrency): The selected route changes in another tab → the original rationale remains attached to the recommendation, while the current selected route updates distinctly.
- EC-6 (Interruption): Loading the saved decision fails → the workspace shows a loading/recovery state rather than presenting an empty or invented recommendation.
- EC-7 (Repetition): The same saved decision is reopened → its explanation and attribution remain stable; reopening does not request another recommendation.
- EC-8 (Ordering): A direct link is opened before analysis completes → the user sees the actual processing state and cannot approve a nonexistent decision.
- EC-9 (State transitions): The decision becomes approved → the explanation and unresolved uncertainties stay visible in a read-only view.
- EC-10 (Scale): Many reasons or uncertainties are present within supported limits → grouping and accessible scrolling preserve readability without hiding approval-critical content or mixing work items.

## Route Selection

### US-006: Choose a different route during review

**As an** author, **I want** to change the selected route while retaining the AI recommendation, **so that** human judgment can determine the next step with traceability.

Acceptance criteria:

- AC-1: Given a newly saved PlanningDecision, when review starts, then the selected route equals the recommendation and the selection source is `AI`.
- AC-2: Given review is still open, when the author uses “Alterar rota,” then the supported choices are exactly Direct execution, Tech Spec, and PRD, displayed in pt-BR.
- AC-3: Given the author saves a different route, when saving succeeds, then the new selected route is retained, its source is `HUMAN_OVERRIDE`, and the original recommendation, complexity, reasons, and uncertainties are unchanged.
- AC-4: Given an override exists, when the author saves the originally recommended route again, then the current selection source returns to `AI` and the displayed selection follows the recommendation.
- AC-5: Given a route change is saved, when the author returns to the item, then the saved choice remains under review; neither approval nor any downstream activity has occurred.
- AC-6: Given a route change is not saved or fails, when the author reviews the current outcome, then the last saved choice remains authoritative and the interface does not falsely claim the attempted change was saved.

Edge cases:

- EC-1 (Invalid input): An unsupported route is submitted, including through a direct request → it is rejected without modifying the saved selection.
- EC-2 (Empty / missing): The author attempts to save without selecting a route → a validation message appears and the previous saved selection remains.
- EC-3 (Limits): Repeated saves are temporarily limited → the author receives recovery guidance and the last confirmed selection remains distinguishable from unsaved intent.
- EC-4 (Permissions): A reader or nonauthor administrator submits an override → it is rejected; the recommendation and selection remain unchanged.
- EC-5 (Concurrency): Another tab changes or approves the selection before this save → the stale change does not silently overwrite it; the current state is presented for review.
- EC-6 (Interruption): Connectivity is lost while saving → returning retrieves the actual saved choice before presenting success or allowing approval of an uncertain selection.
- EC-7 (Repetition): The same route selection is saved again → the saved state remains equivalent and no new analysis or approval is created.
- EC-8 (Ordering): Override is requested before a valid PlanningDecision exists → it is rejected; a manually chosen route cannot bypass required analysis.
- EC-9 (State transitions): Override is requested after approval → it is rejected and the approved route stays read-only.
- EC-10 (Scale): Multiple work items have different recommendations and overrides → switching items shows each item's own choices and provenance with the same three-option selector.

## Approval

### US-007: Approve and retain a final route decision

**As an** author, **I want** to explicitly approve the saved route, **so that** the change has a stable, attributable planning outcome.

Acceptance criteria:

- AC-1: Given a valid saved decision under review, when the author selects “Aprovar planejamento,” then the displayed saved decision and selected route become approved and the human approver and approval time remain inspectable.
- AC-2: Given the selected route follows the recommendation or is a human override, when approval succeeds, then both routes and the selection source are retained; an `AI` selection still has explicit human approval.
- AC-3: Given unresolved uncertainties, when the author approves, then approval succeeds without answers or a separate acknowledgement, and the uncertainties remain visible and unresolved.
- AC-4: Given successful approval, when the author returns to the workspace, then the decision is read-only and cannot be reopened, overridden, or analyzed again in this delivery.
- AC-5: Given approval succeeds, when the author inspects the outcome, then it says planning is approved and identifies the chosen next route without creating a PRD, Tech Spec, tasks, execution, review, QA, PR, or GitHub planning comment.
- AC-6: Given unsaved route changes or a stale displayed selection, when approval is attempted, then the user must review the actual saved selection before that choice can be approved; a different route is never approved silently.

Edge cases:

- EC-1 (Invalid input): Approval refers to an unsupported route, unrelated decision, or wrong work item → it is rejected without an approval record or visible state transition.
- EC-2 (Empty / missing): No valid saved decision or selected route exists → approval is unavailable; no default or empty decision is approved.
- EC-3 (Limits): Approval cannot be saved because the service is unavailable or limited → the workspace preserves review and explains recovery rather than showing unconfirmed success.
- EC-4 (Permissions): The author has lost access, or a nonauthor attempts approval → approval is rejected even through a direct request.
- EC-5 (Concurrency): Approval races with a route change or another approval → one coherent saved outcome wins; stale requests cannot approve a different version or create conflicting approvals.
- EC-6 (Interruption): The approval response is lost → returning displays the saved outcome if it succeeded, or review if it did not, without starting downstream work.
- EC-7 (Repetition): An already successful approval is repeated → the existing approval, approver, and time remain unchanged and no new action is triggered.
- EC-8 (Ordering): Approval is attempted during analysis or after a failed run → it is rejected until a valid decision reaches review.
- EC-9 (State transitions): A stale browser tries to alter or reanalyze an approved decision → the mutation is rejected and the approved state remains authoritative.
- EC-10 (Scale): The project contains many approved decisions → opening one shows that decision's own approver, time, and route, without aggregating them into a misleading shared approval.

## Lifecycle

### US-008: Follow publication and planning as distinct stages

**As an** author, **I want** the existing timeline to show the change's real lifecycle, **so that** I understand what happened and what action is available next.

Acceptance criteria:

- AC-1: Given a published work item, when its timeline opens, then intention/Issue Author activity, confirmed GitHub publication, and planning are distinguishable in the same change.
- AC-2: Given planning is awaiting a request, in progress, awaiting review, failed, or approved, when the state changes, then the selected workspace and history status reflect that actual stage without losing the fact of successful publication.
- AC-3: Given planning completes analysis but is not approved, when the timeline is read, then it distinguishes produced recommendation from human-approved planning.
- AC-4: Given planning is approved, when the timeline is read, then Dev Control attribution, selected route, and human approval are distinguishable; no downstream stage appears as running or completed.
- AC-5: Given lifecycle changes, when the user relies on assistive technology or reduced motion, then state and action remain understandable through text and appropriate announcements, not only colored nodes or animation.

Edge cases:

- EC-1 (Invalid input): An unknown lifecycle value is encountered → the workspace does not falsely label the change complete or invent a known stage; it offers refresh/recovery.
- EC-2 (Empty / missing): No planning attempt exists → the timeline shows awaiting planning without inventing an agent execution.
- EC-3 (Limits): A conversation is long or partly paginated → the current lifecycle and pending human action remain discoverable without requiring all messages to load.
- EC-4 (Permissions): A reader views the timeline → they see real progress but no author-only action affordance.
- EC-5 (Concurrency): Progress responses arrive while another tab approves → older responses do not revert the timeline from approved to running or awaiting review.
- EC-6 (Interruption): Live updates stop → the last confirmed state is retained with recovery guidance and no fabricated completion.
- EC-7 (Repetition): The same progress or completion is delivered repeatedly → a logical stage is not duplicated as multiple planning completions.
- EC-8 (Ordering): The user navigates to conversation or publication details from planning → navigation does not reset lifecycle progress or restart earlier stages.
- EC-9 (State transitions): Planning fails → the Issue remains visibly published and planning alone is marked as needing recovery.
- EC-10 (Scale): Many intentions have different stages → the history list remains navigable and each entry exposes its own current stage without requiring all details to be loaded.

## Artifacts and Context

### US-009: Inspect artifacts separately from conversation

**As an** author, **I want** the published Issue and PlanningDecision to be distinguishable outputs of my intention, **so that** I can inspect what was produced without searching raw conversation or losing source context.

Acceptance criteria:

- AC-1: Given publication and planning exist, when the user inspects the work item, then the Issue artifact and PlanningDecision are individually identifiable and visibly belong to the same change.
- AC-2: Given the Issue artifact is opened, when its details are displayed, then the repository, Issue number, trusted link, publication state, and approved publication snapshot remain inspectable.
- AC-3: Given planning starts or completes, when the conversation is opened, then existing intention and authoring messages remain available; lifecycle state and the decision are not accessible only through a raw agent message.
- AC-4: Given the current GitHub Issue has changed since publication, when the retained content is displayed or used for planning, then it is identified as the approved publication snapshot and is not described as a live synchronized copy.
- AC-5: Given no repository lookup activity was recorded for a planning attempt, when sources are inspected, then no files, tool calls, durations, or citations are invented; the known publication snapshot remains the identified basis.

Edge cases:

- EC-1 (Invalid input): A retained Issue URL does not match the trusted repository/Issue identity → it is not offered as a trusted external link; the discrepancy is explained.
- EC-2 (Empty / missing): Planning has not produced an artifact yet → only existing artifacts are shown and processing/failure is not represented by a fake decision.
- EC-3 (Limits): The Issue body or conversation is long → supported content remains inspectable through accessible details or existing pagination without making raw text the primary planning experience.
- EC-4 (Permissions): Access to repository-derived content is revoked → artifact and conversation reads obey the existing access boundary, even through direct links.
- EC-5 (Concurrency): A route changes while the Issue artifact is open → the approved publication snapshot remains unchanged and the current planning choice remains attached to its own artifact.
- EC-6 (Interruption): An artifact detail cannot load → its error is distinguished from deletion or success, and another item's artifact is never substituted.
- EC-7 (Repetition): The same artifact is opened repeatedly → no external GitHub write, duplicate artifact, or new analysis occurs.
- EC-8 (Ordering): The user opens an artifact before loading the entire conversation → the artifact remains understandable and scoped to the correct work item.
- EC-9 (State transitions): The live GitHub Issue is edited or closed, or the repository becomes archived → the retained publication is not erased or silently rewritten; current repository-access checks still apply and no live synchronization is implied.
- EC-10 (Scale): A project has many conversations and artifacts → selecting an intention exposes only its related Issue and planning, with history controls remaining usable.

## Shared Visibility

### US-010: Read another author's planning

**As a** project reader, **I want** to inspect a teammate's planning and final route, **so that** I can follow the change without modifying their work.

Acceptance criteria:

- AC-1: Given current project membership and personal repository access, when a reader opens another author's work item, then they can read its publication, planning progress, saved decision, uncertainties, and approval outcome.
- AC-2: Given the reader is not the author, when planning controls would otherwise be available, then the interface identifies the author and explains read-only access without exposing active start, retry, override, or approval controls.
- AC-3: Given the author changes or approves a route, when the reader refreshes or receives a current update, then they see the same saved outcome and its recommendation/selection provenance.
- AC-4: Given a reader loses project or repository access, when they next perform a protected read or action, then access is denied and no further protected content is returned.

Edge cases:

- EC-1 (Invalid input): A reader changes a project or task identifier to another scope → the request does not reveal another project's existence or content beyond the existing unavailable response.
- EC-2 (Empty / missing): The author has not requested planning → the reader sees an honest awaiting-planning state and no fabricated recommendation.
- EC-3 (Limits): The reader encounters pagination or temporary read limits → existing navigation/recovery applies without granting editing rights or omitting the selected item's current state silently.
- EC-4 (Permissions): A reader directly submits start, retry, override, or approval → the action is rejected regardless of the interface's hidden controls.
- EC-5 (Concurrency): The author approves while the reader inspects review → the reader converges on the approved state without claiming their read caused approval.
- EC-6 (Interruption): The reader reconnects after a session expires → sign-in and access recovery are required before protected content resumes.
- EC-7 (Repetition): Repeated reads occur → no analysis, override, or approval is created by observation.
- EC-8 (Ordering): The reader deep-links directly to planning → the same access checks apply as through the Issues menu.
- EC-9 (State transitions): The item is approved or planning fails → read-only access persists; these states do not transfer ownership to the reader.
- EC-10 (Scale): The reader follows many authors' work items → author identity, route choice, and status remain item-specific throughout the shared history.

## Administrative Visibility

### US-011: Inspect planning under existing administrator boundaries

**As an** administrator, **I want** planning to respect the existing visibility and ownership rules, **so that** administrative access does not silently grant control of another developer's decisions.

Acceptance criteria:

- AC-1: Given existing administrative project visibility and personal repository access, when the administrator opens a work item, then its Issue and planning are readable under the existing project-access rules.
- AC-2: Given the administrator is not the author, when they attempt to start, retry, override, or approve planning, then the action is rejected just as for another reader.
- AC-3: Given the administrator is also the author, when they use planning, then the author flow applies without extra powers over finalized decisions.
- AC-4: Given the administrator lacks personal repository access, when they request repository-derived planning content, then administrative status does not substitute for that authorization.

Edge cases:

- EC-1 (Invalid input): An administrator submits a mismatched project, task, or decision identifier → the same scoping validation rejects the request.
- EC-2 (Empty / missing): No decision exists → administrative viewing does not synthesize or automatically request one.
- EC-3 (Limits): Large histories or temporary provider/read limits affect access → normal pagination and recovery remain available; administrative status does not bypass those limits.
- EC-4 (Permissions): Shared service credentials can reach a repository the administrator cannot → no protected content is returned on that basis alone.
- EC-5 (Concurrency): An author's approval races with a nonauthor administrator mutation → the unauthorized mutation cannot affect the author's saved outcome.
- EC-6 (Interruption): The administrator's session expires during inspection → protected access resumes only after normal authentication and authorization recovery.
- EC-7 (Repetition): The administrator retries a denied mutation → repetition does not transfer authorship or create planning activity.
- EC-8 (Ordering): An administrator opens a direct planning link outside normal navigation → project, personal repository, and authorship checks still apply.
- EC-9 (State transitions): Administrative status is removed, or an authored decision is approved → subsequent requests use current access and approved-decision immutability rules.
- EC-10 (Scale): The administrator inspects many projects → each work item's project, repository, author, and decision remain isolated and identifiable.

## Edge-Case Sweep Record

Every story was probed against all ten required classes. Within each story, EC-1 through EC-10 map respectively to Invalid input, Empty / missing, Limits, Permissions, Concurrency, Interruption, Repetition, Ordering, State transitions, and Scale. No class was skipped. Operational capacity, payload limits, and recovery timing belong to the TechSpec; these stories require explicit user-visible handling and prohibit silent truncation or invented success.
