# User Stories: Route-driven Spec Execution with Compozy

Canonical behavior catalog for Spec execution in Flow Dev. Companion to [_prd.md](_prd.md); consumed by the downstream TechSpec and test contract. PRD, Tech Spec, and Tasks describe stages inside one existing Flow Dev work item. Generated implementation tasks are children of the specification package, not new published Issues or new Flow Dev intentions.

## Personas

- **Author** — The immutable author of the published work item, with current project and personal repository access. Starts stages, responds to the agent, requests adjustments, cancels, retries, and approves.
- **Project reader** — Another authorized project member who follows the same progress and inspects saved artifacts without controlling the run.
- **Administrator** — Inspects an authorized project under existing administrative visibility rules; receives no authorship override or exemption from personal repository authorization.

## Story Index

| ID | Feature Area | Persona | Story |
| --- | --- | --- | --- |
| US-001 | Route and continuation | Author | See the next action for the approved selected route |
| US-002 | Stage execution | Author | Start a stage with its retained context |
| US-003 | Live Human View | Author | Follow understandable agent activity and lifecycle progress |
| US-004 | Clarifications | Author | Answer agent questions within the current stage |
| US-005 | Permissions | Author | Review and resolve scoped agent permission requests |
| US-006 | PRD review | Author | Understand the product specification and its companion stories |
| US-007 | Tech Spec review | Author | Understand technical decisions and the test contract |
| US-008 | Tasks review | Author | Inspect the proposed delivery breakdown and dependencies |
| US-009 | Adjustments | Author | Request changes and review the resulting revision |
| US-010 | Approval | Author | Approve an exact stage version and release the next action |
| US-011 | Cancellation | Author | Stop a stage without losing saved context |
| US-012 | Recovery | Author | Recover interrupted work and explicitly retry an eligible attempt |
| US-013 | Artifact continuity | Author | Inspect matching repository artifacts and saved review versions |
| US-014 | Shared observation | Project reader | Follow live work and read artifacts without mutation |
| US-015 | Administrative observation | Administrator | Inspect progress within existing access boundaries |

## Edge-Case Sweep Convention

Every story below was probed against all ten required classes. Within each story, EC-1 covers invalid input, EC-2 empty or missing information, EC-3 limits, EC-4 permissions, EC-5 concurrency, EC-6 interruption, EC-7 repetition, EC-8 ordering, EC-9 state transitions, and EC-10 scale. Each entry states the observable outcome for that story; classes are not presumed inapplicable. Operational limits must be specified in the TechSpec and exposed clearly where they affect a user action, without silently dropping content.

## Route and Stage Entry

### US-001: See the next action for the approved selected route

**As an** author, **I want** the next button to follow my approved planning choice, **so that** the interface guides me through the required specification work.

Acceptance criteria:

- AC-1: Given approved planning with selected route `prd`, opening the work item shows “Criar PRD” as the next eligible generation action and communicates PRD → Tech Spec → Tasks.
- AC-2: Given approved planning with selected route `tech_spec`, opening the work item shows “Criar Tech Spec” and communicates Tech Spec → Tasks without requiring or marking a PRD as completed.
- AC-3: Given a selected route different from the original recommendation, the button follows the selected route and the original recommendation remains inspectable.
- AC-4: Given approved `direct_execution`, the work item retains that choice and explains that direct execution is unavailable in this delivery, without an active execution action or an automatic Spec substitution.
- AC-5: Given an eligible historical approved decision, reopening it offers the same continuation as a newly approved decision; neither reopening nor planning approval automatically starts a stage.

Edge cases:

- EC-1: An unknown or inconsistent saved route → show an unavailable-state explanation and refresh/recovery action; do not choose a default.
- EC-2: Planning approval or its saved decision is missing → retain the applicable planning experience and do not expose an eligible Spec start.
- EC-3: A route explanation is long → keep the selected route and next action identifiable while allowing the complete explanation to be read.
- EC-4: A nonauthor or user without current access opens the action URL → read-only or access-denied behavior follows existing authorization; no start occurs.
- EC-5: A newer stage state arrives while an old start button remains visible → reconcile the action to the current stage without starting competing work.
- EC-6: Navigation or connection loss while loading the work item → reopening restores the saved route and stage; loading does not dispatch work.
- EC-7: Repeatedly reopening approved planning → show the same eligible action or current run, not additional specification packages.
- EC-8: A direct link attempts to open Tasks before prerequisites are approved → explain the missing prerequisite and show the actual current stage.
- EC-9: The GitHub Issue is later closed or its title changes → preserve the retained publication and approved route; current access and workspace availability still govern new actions.
- EC-10: The project contains many intentions → the selected work item's next action remains tied to its own route, with no cross-item state leakage.

### US-002: Start a stage with its retained context

**As an** author, **I want** an explicit start to provide the agent with the approved context, **so that** I do not have to reconstruct earlier decisions.

Acceptance criteria:

- AC-1: Given an eligible stage, activating its start button records accepted work and shows whether it is queued or running with Compozy attribution.
- AC-2: Given a new run, its context retains the published Issue snapshot, approved selected route, planning rationale and uncertainties, and applicable approved upstream documents.
- AC-3: Given the Tech Spec route without a PRD, the agent uses the Issue's settled product decisions and raises genuine missing decisions without inventing a PRD or silently changing the route.
- AC-4: Given successful generation, the stage enters review only when its complete required artifact package is saved and available for Human View inspection.
- AC-5: Given an unavailable or incompatible runtime, skill contract, or project checkout, the author sees the concrete blocking condition and an applicable recovery path instead of simulated activity or success.

Edge cases:

- EC-1: A start refers to another work item, unsupported stage, or malformed context → reject it without launching work in a different scope.
- EC-2: A required approved input or publication snapshot is absent → explain the missing prerequisite without substituting unrelated context.
- EC-3: Context or runtime capacity exceeds supported limits → explain the limit; do not silently truncate requirements or launch with incomplete inputs.
- EC-4: The author's access expires before acceptance → deny the start and allow access recovery without transferring authorship.
- EC-5: Two tabs start the same eligible stage → show one accepted logical attempt to both tabs.
- EC-6: The acceptance response is lost → show an uncertain submission and reconcile the existing request before permitting a competing start.
- EC-7: A repeated accepted start or a start after success → return the existing attempt or saved review outcome without another generation.
- EC-8: A start skips the required upstream approval → explain the gate and leave the requested stage unstarted.
- EC-9: The checkout binding becomes unavailable or no longer matches the project → block new work and preserve saved progress and artifacts.
- EC-10: Several projects generate documents concurrently → each run retains its own repository, work item, inputs, and progress; queueing is visible when necessary.

## Live Supervision and Interaction

### US-003: Follow understandable agent activity and lifecycle progress

**As an** author, **I want** a Human View while the agent works, **so that** I understand its activity and know when it needs me.

Acceptance criteria:

- AC-1: Given active generation or adjustment, the stage shows its identity, current state, responsible agent, real recorded activity, and any required author action while work is still happening.
- AC-2: Given user-visible agent messages or tool activity, the interface presents readable messages and understandable tool purpose, source, and outcome where recorded; it never requires raw logs to follow progress.
- AC-3: Given a waiting question, permission request, review, failure, or stopping state, the author can distinguish it from active generation through text and accessible announcements.
- AC-4: Given a long conversation, the current stage, pending interaction, and artifact entry points remain discoverable without searching the transcript.
- AC-5: Given refresh or reconnection, recorded activity and current state return without duplicating entries; lost live contact is distinguished from a confirmed execution failure.

Edge cases:

- EC-1: Hostile markup or an unsupported activity kind arrives → render safely and retain an understandable state without executing embedded content.
- EC-2: No activity has been reported yet → show accepted/queued/running status as known, without invented messages, sources, or progress percentages.
- EC-3: A message or trace is large → offer bounded presentation with access to available detail and an explicit indication of any provider-side omission.
- EC-4: Access is revoked during live viewing → stop further protected content delivery and present the existing access-recovery behavior.
- EC-5: Duplicated or late events arrive → preserve one coherent timeline without regressing completed work to running.
- EC-6: The browser disconnects while the agent continues → show loss of contact, preserve last known facts, and reconcile on return.
- EC-7: Replaying the same saved activity → retain one visible occurrence of each recorded event and no new run.
- EC-8: Completion notification arrives before the files are available → show result finalization, not an approvable artifact.
- EC-9: Cancellation or failure occurs after some visible activity → retain the activity under its actual attempt outcome rather than erasing or presenting it as completed Spec.
- EC-10: The attempt has a large activity history → progressive history inspection preserves the current status and pending author action, without requiring the entire history to remain expanded.

### US-004: Answer agent questions within the current stage

**As an** author, **I want** to answer clarification questions in Flow Dev, **so that** specification decisions remain connected to the work.

Acceptance criteria:

- AC-1: Given a pending clarification, the stage presents its full question, relevant context, and supported choices or free-text input, with an explicit response action.
- AC-2: Given a valid answer accepted for the current interaction, the interface records the answer and shows the agent's subsequent state without asking the author to switch tools.
- AC-3: Given no response, the interaction remains visibly pending; elapsed time, suggested choices, navigation, or a selected-but-unsent option does not count as an answer.
- AC-4: Given previously accepted decisions and planning uncertainties, the agent can resolve genuine outstanding questions while preserving settled requirements; answers remain available to later attempts and stages where relevant.
- AC-5: Given several recorded questions, resolved history is distinct from actionable pending questions, and the author can identify which stage and attempt each belongs to.

Edge cases:

- EC-1: A response does not match the current question's supported format → show a validation explanation and keep the interaction pending.
- EC-2: A required answer is blank or the question content cannot be recovered → prevent submission and expose the missing-information or recovery state.
- EC-3: An answer exceeds the supported limit or the runtime cannot accept it yet → explain the condition, retain locally entered text where safe, and do not mark it answered.
- EC-4: A reader, nonauthor administrator, or user with expired access submits an answer → deny the response without changing the question.
- EC-5: Two tabs answer the same question → retain one accepted resolution; the other sees the saved answer instead of overwriting it.
- EC-6: The agent turn disappears after restart → distinguish a recorded historical resolution from delivery to a live turn and offer recovery before claiming the agent continued.
- EC-7: Resending an already accepted answer → show its existing resolution without answering another question or creating duplicate work.
- EC-8: An answer targets an older attempt or a future question → reject the stale association and present the current pending interaction.
- EC-9: Cancellation settles while a question is pending → preserve the question as historical/inactive for that attempt; do not leave a working-looking answer action attached to a stopped run.
- EC-10: Many questions have accumulated → keep actionable questions visible and make resolved history inspectable without requiring a full transcript scan.

### US-005: Review and resolve scoped agent permission requests

**As an** author, **I want** to understand what the agent requests permission to do, **so that** I can allow or deny that action knowingly.

Acceptance criteria:

- AC-1: Given a pending permission request, the interface distinguishes it from a clarification and shows the requested operation, relevant target, reason when supplied, and available allow/deny choices.
- AC-2: Given an accepted choice, the interface records the resolution and shows whether execution continues, remains blocked, or fails as a result; denial does not imply artifact approval.
- AC-3: Given an operation outside the project's authorized Spec scope, permission controls do not bypass that boundary or grant code implementation, external publication, or access to another project's files.
- AC-4: Given no author response, the request remains pending until an explicit resolution or actual runtime transition; no timeout or suggested option implies permission.
- AC-5: Given a request containing runtime credentials or sensitive operational data, the author receives a safe description sufficient to decide without exposed secrets.

Edge cases:

- EC-1: The operation or target is malformed, ambiguous, or unsupported → prevent approval of an unidentified action and report the integration problem.
- EC-2: Required permission details are absent → keep the action blocked and provide a recovery explanation rather than a generic unlimited-approval button.
- EC-3: The runtime delays or rejects a resolution because of capacity → leave the request pending with a retryable response state.
- EC-4: A reader or nonauthor administrator attempts a resolution → deny it; administrative visibility does not confer execution control.
- EC-5: Conflicting allow and deny submissions race → retain and display the authoritative winning resolution once.
- EC-6: A request survives a runtime restart without its original live action → explain recovery status; resolving the record does not falsely imply the original action executed.
- EC-7: A previously granted permission is replayed or a new attempt asks for a different action → do not broaden or silently reuse the old grant.
- EC-8: A response targets a resolved or unrelated permission request → show its existing outcome or reject the association without applying it elsewhere.
- EC-9: The run is stopping, canceled, or failed → no new operation can be authorized through a stale live control.
- EC-10: A run produces many permission records → keep pending requests prominent and preserve an inspectable resolution history without collapsing them into a blanket grant.

## Artifact Human Views

### US-006: Understand the product specification and its companion stories

**As an** author, **I want** a structured PRD review, **so that** I can judge product scope and behavior without reading raw Markdown.

Acceptance criteria:

- AC-1: Given a saved PRD package, the main view exposes the problem, intended outcome, scope, non-goals, personas, features, business rules, user experience, and unresolved product decisions as readable, navigable sections.
- AC-2: Given companion user stories, the author can inspect their personas, acceptance criteria, and edge cases and relate them to the PRD's features.
- AC-3: Given relevant ADRs, sources, or settled planning decisions, the author can inspect their relationship to the PRD without unsupported provenance being fabricated.
- AC-4: Given a reviewable package, its stage, saved version, generation/adjustment origin, and approval state remain identifiable; source documents are available as secondary detail.
- AC-5: Given a keyboard, narrow viewport, or reduced-motion preference, the author can read substantive content, reach the review actions, and identify state without relying on color or animation.

Edge cases:

- EC-1: The generated document is malformed or contains hostile content → render safely; do not present an incomplete interpretation as a complete approvable PRD.
- EC-2: The PRD or required story catalog is missing or blank → explain the incomplete package and keep approval unavailable; genuinely empty optional sections have explicit empty states.
- EC-3: A section exceeds the primary panel's display size → make the complete saved text inspectable before approval without silent clipping.
- EC-4: The viewer lacks current project or repository access → deny protected artifact reads, including direct source-document links.
- EC-5: A newer revision arrives while the author reads → identify the change and require review of the current version before approval.
- EC-6: The connection is lost during review → do not infer approval; return to the saved version and reconcile its current status on reconnect.
- EC-7: Reopening or replaying the same package → show one revision and its existing approval state rather than duplicate artifacts.
- EC-8: A PRD view is requested for a Tech Spec-only route → show that PRD is not part of the approved path, without fabricating or automatically generating one.
- EC-9: A failed adjustment leaves an earlier saved PRD → keep that revision inspectable and distinguish it from the failed proposal and current review eligibility.
- EC-10: A PRD contains many features and stories → provide navigable structure and stable references while keeping the current stage and actions discoverable.

### US-007: Understand technical decisions and the test contract

**As an** author, **I want** a structured Tech Spec review, **so that** I can evaluate implementation decisions and validation coverage in human terms.

Acceptance criteria:

- AC-1: Given a saved Tech Spec package, its Human View exposes the proposed approach, responsibilities, relevant data and public contracts, integrations, lifecycle behavior, risks, and unresolved technical decisions where applicable.
- AC-2: Given substantive diagrams, tables, code examples, or additional sections, the author can inspect them with their explanations; a summary does not replace the full technical decision content.
- AC-3: Given `_tests.md`, the author can inspect the specified behaviors, expected outcomes, and coverage relationships to requirements and stories, without suggesting those tests have already run.
- AC-4: Given the PRD route, the Tech Spec identifies its approved product inputs; given the Tech Spec-only route, it identifies the approved Issue and planning inputs without requiring a nonexistent PRD.
- AC-5: Given conflicts with approved product scope or unresolved consequential choices, the view surfaces them for clarification instead of claiming the Tech Spec is ready based only on file existence.

Edge cases:

- EC-1: A diagram, contract, or embedded snippet is unsafe or cannot be interpreted → display safe readable content or an explicit rendering limitation; do not execute it or hide a material review gap.
- EC-2: The Tech Spec or test contract is absent → keep review approval unavailable and identify the missing required document.
- EC-3: Large tables, contracts, or diagrams exceed the viewport → support accessible inspection of their complete saved content.
- EC-4: An unauthorized user follows an artifact or source reference → enforce the same access rules as the work item.
- EC-5: The viewed technical revision is superseded → show that it is historical and prevent its stale approval as the current result.
- EC-6: Generation stops after writing only one companion → retain partial output as incomplete without claiming the package is review-ready.
- EC-7: The same completed package is reported twice → show a single saved result and preserve its actual approval state.
- EC-8: The PRD route attempts Tech Spec generation before PRD approval → show the prerequisite; the Tech Spec-only route is not incorrectly blocked by this gate.
- EC-9: An approved upstream file changes outside Flow Dev → surface the mismatch and retain the approved input version instead of silently changing the technical scope.
- EC-10: Many components and test cases are described → provide navigation and traceable relationships without implying that all items are active work or executed tests.

### US-008: Inspect the proposed delivery breakdown and dependencies

**As an** author, **I want** a Human View of Tasks, **so that** I can understand the planned deliveries and their sequence before any code is implemented.

Acceptance criteria:

- AC-1: Given a saved Tasks package, the main view lists identifiable tasks with titles, intended outcomes, and dependencies, and provides access to each task's full scope, acceptance, validation, and relevant references.
- AC-2: Given task metadata present in the documents, the view shows it faithfully and distinguishes planned implementation tasks from the containing Flow Dev work item and from Compozy execution attempts.
- AC-3: Given the task graph and test contract, the author can inspect dependency order and test ownership; an internally inconsistent package is flagged and cannot be approved as ready.
- AC-4: Given approved Tasks, the work item shows “Spec aprovado” with tasks prepared for later implementation; no generated task is presented as implemented, tested, or reviewed by this feature.
- AC-5: Given raw `_tasks.md` and individual task files, they remain secondary inspection surfaces linked to the same package shown in the Human View.

Edge cases:

- EC-1: Tasks have duplicate identities, missing dependency targets, cycles, or contradictory ownership → show the concrete inconsistency and withhold approval until corrected.
- EC-2: The task index is empty or references missing task files → explain the incomplete decomposition without claiming preparation is complete.
- EC-3: Task content exceeds supported inspection or generation limits → make the limit explicit and preserve the prior saved package without silent task omission.
- EC-4: A reader accesses a task's direct detail or tries to approve the package → permit only authorized reading and deny mutation.
- EC-5: A new Tasks revision changes task identities or dependencies during review → update the visible version and require reinspection before approval.
- EC-6: Generation fails after producing only some task files → retain them as partial results and keep the previous complete review version identifiable if one exists.
- EC-7: Repeated completion or approval events → retain one current package and one approval without duplicate implementation tasks.
- EC-8: Tasks generation is requested without an approved Tech Spec → show the unmet prerequisite and do not generate from an unreviewed technical draft.
- EC-9: External task files report implementation status inconsistent with this Spec-only run → identify that external state without claiming this feature performed implementation or overwriting the approved snapshot.
- EC-10: The package contains a large task graph → provide a usable list and dependency inspection with access to every task; do not require a giant diagram as the only view.

## Revision and Approval

### US-009: Request changes and review the resulting revision

**As an** author, **I want** to request adjustments from the agent in the current stage, **so that** the specification can improve before I approve it.

Acceptance criteria:

- AC-1: Given a complete current package awaiting review, the author can submit a clear adjustment request in that stage; Flow Dev does not require a direct document editor.
- AC-2: Given an accepted adjustment, the agent receives the reviewed version, the request, and applicable approved inputs, while the previous saved version remains inspectable.
- AC-3: Given a completed adjustment, the new package returns to review with an understandable account of changes grounded in the actual revision and access to the complete changed content.
- AC-4: Given generation or adjustment in progress, artifact approval and competing adjustments are unavailable; the author can follow activity, answer interactions, or cancel as appropriate.
- AC-5: Given an adjustment conflicting with an approved upstream decision, the conflict is surfaced explicitly and no approved artifact or route is silently rewritten.

Edge cases:

- EC-1: The request targets another stage/version or embeds instructions to access unrelated data → reject the wrong association and retain project and Spec boundaries.
- EC-2: The adjustment request is blank or no complete current package exists → explain why it cannot be submitted; use generation recovery for incomplete attempts.
- EC-3: The request exceeds supported limits → explain the limit before acceptance without silently shortening the requested change.
- EC-4: A nonauthor or user whose access expired submits an adjustment → deny it without creating a revision.
- EC-5: Two tabs request different changes from the same version → accept one current adjustment and require the other to reconcile before submitting against a new version.
- EC-6: Adjustment fails, is canceled, or loses contact → preserve the previous complete version and accepted request, visibly distinguish incomplete output, and offer eligible recovery.
- EC-7: The accepted adjustment request is resent → show the same attempt and do not apply the change twice.
- EC-8: An adjustment is submitted for an already approved stage or while a prior change is unresolved → explain that it is not an eligible current-review action.
- EC-9: A completed adjustment arrives after its attempt was superseded or cancellation confirmed → retain historical evidence without replacing the authoritative current revision.
- EC-10: Many revisions exist → keep the current revision and change account prominent, with older revisions inspectable without mixing their contents.

### US-010: Approve an exact stage version and release the next action

**As an** author, **I want** to approve each reviewed package explicitly, **so that** subsequent work uses decisions I actually accepted.

Acceptance criteria:

- AC-1: Given a complete eligible package in review, “Aprovar PRD”, “Aprovar Tech Spec”, or “Aprovar Tasks” approves the exact displayed saved revision together with its required companions and records the author and time.
- AC-2: Given PRD approval, “Criar Tech Spec” becomes eligible; given Tech Spec approval, “Criar Tasks” becomes eligible; neither approval starts that next generation automatically.
- AC-3: Given Tasks approval, Spec preparation becomes complete while the published Issue, planning, upstream approvals, and task package remain inspectable.
- AC-4: Given active work, pending interactions, an uncertain submission, incomplete artifacts, an unsent adjustment request, or an unresolved blocking specification decision, approval explains the blocker and cannot silently proceed.
- AC-5: Given an approved package, its approved version remains the stable input to later work; approval does not commit, push, create a PR, edit the Issue, or start implementation.

Edge cases:

- EC-1: Approval names an unsupported stage, unrelated package, or invalid revision → reject it without changing the saved approval state.
- EC-2: An expected companion or material review content is missing → expose the gap and withhold approval even if the agent reported success.
- EC-3: A large package requires section-by-section inspection → keep all material content accessible; approval still applies to the entire identified package without an invented per-page acknowledgement requirement.
- EC-4: A reader or nonauthor administrator attempts approval → deny it; only the current authorized author can approve.
- EC-5: The package changes after review or two tabs approve concurrently → reject stale approval and retain one authoritative approval of the exact winning version.
- EC-6: The approval response is lost → show uncertain status and reconcile the original action; do not automatically generate the next stage.
- EC-7: The same approval is repeated → preserve its original author, time, and version and do not create another milestone or downstream run.
- EC-8: A request tries to approve a future stage or bypass an upstream gate → show the actual required action and keep progression unchanged.
- EC-9: A permission expires or an external file conflict appears before approval → block the action and retain the last trustworthy saved package until resolved.
- EC-10: The work item has many revisions and tasks → make the approved package's identity and included documents unambiguous, without mixing previous versions into the approval.

## Interruption and Artifact Continuity

### US-011: Stop a stage without losing saved context

**As an** author, **I want** to cancel generation or adjustment, **so that** I can stop the current work while retaining useful decisions and artifacts.

Acceptance criteria:

- AC-1: Given an accepted active, queued, or interaction-waiting attempt, the author can request cancellation from its stage.
- AC-2: Given an accepted cancellation request, the interface shows stopping until the authoritative outcome is known; it does not claim that work stopped merely because the request was sent.
- AC-3: Given confirmed cancellation, the attempt is visibly canceled and retains accepted answers, requests, activity, and saved outputs with their completeness clearly identified.
- AC-4: Given a canceled attempt, an eligible explicit retry reuses applicable saved context; cancellation neither approves partial output nor alters earlier approvals or the published Issue.
- AC-5: Given an adjustment canceled with an earlier complete review version available, the author can return explicitly to that saved version after the stop is confirmed, or retry the adjustment; neither action silently approves it.

Edge cases:

- EC-1: Cancellation refers to another work item or an invalid attempt → reject it without stopping unrelated work.
- EC-2: No active attempt exists → show the current saved state without creating a cancellation operation.
- EC-3: Stop confirmation takes longer than normal or the runtime cannot process the request yet → keep a truthful stopping/uncertain state and an applicable status-recovery action.
- EC-4: A reader or unauthorized author requests cancellation → deny it without affecting the run.
- EC-5: Completion races with cancellation → show the authoritative settled result exactly once; a confirmed canceled attempt cannot later replace current artifacts with a late result.
- EC-6: Connectivity or the daemon fails during stopping → preserve the unresolved stop and reconcile before offering a competing run.
- EC-7: The cancellation is resent → preserve the existing stopping or settled outcome rather than creating another stop or retry.
- EC-8: The author requests retry before stopping is resolved → explain that the previous attempt must be reconciled first.
- EC-9: The run is already completed, failed, or canceled → show that result and its eligible actions; cancellation cannot retroactively relabel an approved artifact.
- EC-10: Many historical canceled attempts exist → keep the current attempt identifiable and previous activity inspectable without presenting multiple active cancellation controls.

### US-012: Recover interrupted work and explicitly retry an eligible attempt

**As an** author, **I want** to recover saved work and retry failed or canceled generation with its context, **so that** interruptions do not force me to repeat settled decisions.

Acceptance criteria:

- AC-1: Given refresh, navigation, or service restart, reopening the work item restores its saved stage, current attempt, interactions, and artifacts or explains the unresolved recovery condition.
- AC-2: Given a confirmed failed or canceled attempt with no competing active work, an explicit retry starts one new attempt retaining applicable approved inputs, accepted answers, requested changes, and saved outputs.
- AC-3: Given uncertain submission or runtime status, the interface offers reconciliation rather than assuming failure or encouraging a second run.
- AC-4: Given an earlier complete review version and a failed/canceled adjustment, the author can explicitly return to that version after settlement instead of being forced to approve partial output or repeat generation.
- AC-5: Given runtime/skill/workspace incompatibility, the user receives an honest blocker; recovery does not switch to deprecated Compozy, a different project, fabricated documents, or code execution.

Edge cases:

- EC-1: A retry references an unrelated or superseded failed attempt → reject the association and show the current recoverable state.
- EC-2: Some prior answers or outputs were never saved → disclose what is unavailable and recover from known inputs without fabricating remembered decisions.
- EC-3: Runtime capacity, provider limits, or context size prevent retry → show the limit and retain saved artifacts and the accepted recovery history.
- EC-4: Access is lost between failure and retry → allow no protected recovery action until access is restored; ownership remains unchanged.
- EC-5: Two retry requests race or an earlier attempt proves still active → preserve one current attempt and reconcile before any competing dispatch.
- EC-6: Recovery itself loses contact → retain its request identity and continue reconciliation on return instead of restarting the stage again.
- EC-7: A successful or already retried attempt receives another retry request → return the existing authoritative state without replacing completed artifacts.
- EC-8: Retry is used to bypass a prerequisite or change the approved route → reject that progression and retain the approved stage sequence.
- EC-9: The runtime changed version or the checkout contains conflicting files → explain the incompatibility/conflict and preserve approved versions without overwriting unrelated work.
- EC-10: Long histories of attempts and answers exist → show one current recovery path and reuse relevant context without blending different stages or work items.

### US-013: Inspect matching repository artifacts and saved review versions

**As an** author, **I want** reviewable documents saved in the project checkout and visible in Flow Dev, **so that** approved Spec work remains usable outside the current browser session.

Acceptance criteria:

- AC-1: Given successful generation, required files are saved under the work item's bound project checkout in `.compozy/tasks/<slug>/`, and Flow Dev displays the matching captured package.
- AC-2: Given a PRD stage, the package contains `_prd.md` and `_user_stories.md`; Tech Spec contains `_techspec.md` and `_tests.md`; Tasks contains `_tasks.md` and the referenced individual task documents. Applicable ADRs remain available with the package.
- AC-3: Given artifact inspection, the author can identify the stage, document role, saved version, producing attempt, approved input versions, and approval status without having to understand runtime internals.
- AC-4: Given a generation or approval action, no automatic commit, push, document PR, Issue edit, or planning comment occurs.
- AC-5: Given later local file changes, Flow Dev retains what was reviewed and approved and exposes a detected mismatch instead of silently replacing the approved content or consuming changed files as approved inputs.

Edge cases:

- EC-1: A generated path escapes the package, targets unrelated files, or contains unsafe content → reject unsafe output and explain the incomplete result without overwriting another scope.
- EC-2: A required document, referenced task file, or checkout is missing → identify the missing item and do not claim the package is fully available.
- EC-3: Storage, artifact-size, or supported document-count limits prevent capture → report the failure and preserve existing versions without silent omissions.
- EC-4: Someone accesses a document outside their authorized project/repository → deny it, including source-document and historical-revision access.
- EC-5: Another work item uses a colliding slug or an external edit races with generation → keep the packages isolated or show a conflict; never overwrite unrelated or approved work silently.
- EC-6: Files are partially written or application capture fails → show finalization failure/incomplete output, not a review-ready package, and retain recovery evidence.
- EC-7: The same captured result is imported or displayed again → reuse its saved version without duplicate artifacts or approvals.
- EC-8: Files exist on disk without belonging to the current accepted stage outcome → do not treat their existence as stage completion or human approval.
- EC-9: An approved file is subsequently replaced, removed, or made unavailable → retain the recorded approval snapshot and explain why further work cannot rely on the changed checkout yet.
- EC-10: Many documents and versions exist across projects → provide scoped navigation and references that remain bound to the correct package and revision.

## Shared and Administrative Visibility

### US-014: Follow live work and read artifacts without mutation

**As a** project reader, **I want** to see the ongoing Spec and its saved decisions, **so that** I can understand the change without taking over the author's work.

Acceptance criteria:

- AC-1: Given current project and repository access, a reader sees the same recorded current stage, live activity, questions, responses, artifacts, and approval facts as the author is authorized to share through the work item.
- AC-2: Given a pending human action, the reader sees the responsible author and a read-only explanation instead of start, response, adjustment, permission, cancellation, retry, or approval controls.
- AC-3: Given a saved package, the reader can use the same Human View and authorized secondary document inspection as the author.
- AC-4: Given navigation or reconnection, the reader returns to the current saved state without dispatching work or acknowledging interactions on the author's behalf.

Edge cases:

- EC-1: A reader changes a work item, interaction, or artifact identifier in a request → enforce resource scope and reject unauthorized associations.
- EC-2: Spec has not started or no artifact exists → show the actual pending stage and empty state without simulated documents.
- EC-3: Large history or document limits affect viewing → expose the same honest navigation and limit explanations without hiding the current pending action.
- EC-4: Membership or repository access is revoked during reading → stop further protected reads/live delivery and show access recovery or denial.
- EC-5: The author changes the stage while the reader views an older revision → identify the current state and distinguish historical documents.
- EC-6: The reader disconnects during a question or approval → reconnect to its authoritative resolution without changing it.
- EC-7: Repeated reader visits → create no executions, responses, approvals, or Git writes.
- EC-8: A reader directly opens a future-stage artifact → show missing/not-yet-produced status subject to access checks, without starting it.
- EC-9: The author cancels or a service fails → show the actual outcome and retained partial/complete artifacts with no reader takeover controls.
- EC-10: Many readers watch the same work item → all observe one authoritative run and approval history; read load cannot turn observations into mutations.

### US-015: Inspect progress within existing administrative access boundaries

**As an** administrator, **I want** to inspect authorized Spec work using the existing project visibility rules, **so that** administrative review does not bypass content or ownership boundaries.

Acceptance criteria:

- AC-1: Given administrative project visibility and current personal repository authorization, a nonauthor administrator can inspect live progress, Human Views, and retained approvals through the reader experience.
- AC-2: Given administrative project visibility without personal repository authorization, protected Spec content remains unavailable and the existing authorization flow explains the requirement.
- AC-3: Given a nonauthor administrator, no administrative permission grants start, response, adjustment, cancellation, retry, artifact approval, or permission-resolution authority over the author's work.
- AC-4: Given an administrator who is also the author, permitted actions derive from current authorship and access, and approvals identify that person normally.

Edge cases:

- EC-1: An administrative request supplies a foreign project/session/document association → reject it without leaking protected content.
- EC-2: A project has no Spec work → show its actual empty state without provisioning a run or checkout through inspection.
- EC-3: Large histories or operational failures affect inspection → show bounded useful state and safe failure descriptions without exposing runtime credentials.
- EC-4: Administrative visibility or personal repository access is withdrawn → stop protected inspection even if a prior administrative page remains open.
- EC-5: An administrator views an older state while the author acts → reconcile the shared current state without permitting an administrative overwrite.
- EC-6: An inspection session expires → return through the existing access flow and restore only currently authorized content.
- EC-7: Repeated administrative inspection → leaves runtime work, approval attribution, and artifact versions unchanged.
- EC-8: A direct administrative artifact link targets a stage that has not run → show the real unavailable state without bypassing prerequisites.
- EC-9: The author's access is removed while a run needs input → identify the unresolved author action; administration does not silently transfer ownership or answer it.
- EC-10: An administrator inspects many projects → every view retains its own repository authorization and content scope without aggregating protected data across projects implicitly.
