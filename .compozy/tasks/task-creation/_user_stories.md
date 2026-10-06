# User Stories: Task Creation Through GitHub Publication

Canonical behavior catalog for task creation. Companion to [_prd.md](_prd.md); consumed by `_techspec.md` for component mapping and `_tests.md` for coverage mapping. Story, acceptance criterion, and edge-case IDs are permanent. External references use `US-NNN.AC-N` and `US-NNN.EC-N`.

## Personas

- **Task author** — An authenticated developer with project and personal GitHub repository access who describes work, reviews a draft, and explicitly publishes it.
- **Project reader** — Another authorized project member who consults shared task history and sources but cannot change or publish someone else's task.
- **Project administrator** — A user with existing administrator-wide project visibility who remains subject to personal GitHub access and author-only mutation rules.

## Story Index

| ID | Feature Area | Persona | Story |
| --- | --- | --- | --- |
| US-001 | Shared task history | Author, reader, administrator | Discover and open tasks in the selected project |
| US-002 | Durable resumption | Author, reader | Resume the latest confirmed conversation and draft |
| US-003 | Text input | Author | Submit typed task messages reliably |
| US-004 | Microphone control | Author | Start, stop, and cancel microphone capture |
| US-005 | Editable dictation | Author | Combine dictated and typed text before manual Send |
| US-006 | Clarification | Author | Answer only necessary task-identification questions |
| US-007 | Generation | Author | Obtain a faithful draft from the existing Issue Author |
| US-008 | Provenance | Author, reader | Inspect real consulted sources and activity |
| US-009 | Manual review | Author | Edit and save the canonical Issue draft |
| US-010 | Conversational refinement | Author | Refine the current draft without losing unrelated edits |
| US-011 | Publication approval | Author | Explicitly create the Issue from the reviewed revision |
| US-012 | Publication recovery | Author | Resolve rejected or uncertain publication attempts safely |
| US-013 | Published result | Author, reader | Consult the publication snapshot and open the real Issue |
| US-014 | Ownership and access | Author, reader, administrator | Enforce project, repository, and author permissions |
| US-015 | GitHub authorization | Author, reader | Recover repository authorization without losing saved work |
| US-016 | Accessible interaction | Author, reader | Use authoring and shared viewing on desktop and mobile |

## Shared Task History

### US-001: Discover tasks in the selected project

**As a** project member, **I want** to browse shared task history, **so that** I can consult my team's work and start my own intention.

Acceptance criteria:

- AC-1: Given an authorized selected project, when I open its task workspace, then I see real saved tasks identifying their author, title, state, and repository context.
- AC-2: Given another member's task and my own repository access, when I open it, then I see its saved conversation, draft, sources, and result in a read-only view.
- AC-3: Given no saved tasks, when I open the workspace, then I see an empty state and a “Nova intenção” action rather than demonstration conversations.
- AC-4: Given tasks across multiple projects, when I switch projects or open a direct task link, then the task context stays bound to its actual project and authorized history never mixes projects.
- AC-5: Given more history than the initial view holds, when I browse or narrow the list by task title or author, then every authorized matching task remains reachable and no-match feedback differs from load failure.

Edge cases:

- EC-1 [Invalid input]: A malformed task link or invalid search value → show a safe invalid/not-found result without displaying another project's task.
- EC-2 [Empty / missing]: A project has zero tasks or no matching title/author → distinguish empty history from no search matches.
- EC-3 [Limits]: A list page is full or retrieval is rate-limited → keep later entries reachable or show retry guidance; never label truncation as complete history.
- EC-4 [Permissions]: Membership or personal repository access is missing → withhold protected task content and explain the applicable access requirement.
- EC-5 [Concurrency]: Another member creates a task while I browse → previously listed entries remain usable and refreshed history includes the new task without duplicates.
- EC-6 [Interruption]: Loading history loses connectivity → show load failure and retry while retaining the active project's identity.
- EC-7 [Repetition]: Reopening or refreshing the list → do not create tasks or repeat generation.
- EC-8 [Ordering]: I deep-link to a task before selecting its project → establish its authorized project context before showing content.
- EC-9 [State transitions]: A draft becomes published while listed → reopening shows the latest confirmed state, not active draft actions for a completed task.
- EC-10 [Scale]: History grows to 100 times typical volume → tasks remain identifiable, browsable, and reachable without a fixed task-count quota.

### US-002: Resume saved work

**As a** task author or project reader, **I want** the latest confirmed task state restored, **so that** navigation and interruptions do not erase accepted work.

Acceptance criteria:

- AC-1: Given accepted messages, a pending clarification, or saved draft edits, when I refresh, return after sign-in, or reopen the task after a service restart, then I see the same confirmed conversation and current draft.
- AC-2: Given an edit is being saved, when I inspect its status, then I can distinguish saving, saved, and failed; an unsaved change is not presented as confirmed.
- AC-3: Given generation or publication was interrupted, when I reopen the task, then I see its actual pending, failed, uncertain, or completed state without an implicit new attempt.
- AC-4: Given a reader opens saved work, when the state is restored, then the reader retains read-only access and sees the original author.

Edge cases:

- EC-1 [Invalid input]: Stored content cannot be rendered safely → show a recoverable content error without executing embedded markup or inventing missing text.
- EC-2 [Empty / missing]: A “Nova intenção” has no accepted message → it remains an unsaved blank input and is not listed as a saved task.
- EC-3 [Limits]: A long conversation exceeds one visible page → earlier accepted messages remain reachable; do not silently truncate history.
- EC-4 [Permissions]: Access was revoked while away → require renewed authorization before restoring protected content.
- EC-5 [Concurrency]: Another tab saved a later revision → restore the later confirmed revision and identify stale local edits before replacement.
- EC-6 [Interruption]: Refresh occurs before a browser-only input was saved → never claim that unsent text was durably stored; restore confirmed work and any explicitly retained recoverable input accurately.
- EC-7 [Repetition]: Repeated resumption of an interrupted task → do not append duplicate messages, generate additional drafts, or republish.
- EC-8 [Ordering]: A delayed older response arrives after restoration → it cannot replace a newer confirmed draft.
- EC-9 [State transitions]: A formerly publishing task has a confirmed Issue → restore its published snapshot and link, not a publish button.
- EC-10 [Scale]: The task has many revisions and messages → opening the current state remains usable and older conversation entries remain accessible.

## Message Input and Dictation

### US-003: Submit typed messages reliably

**As a** task author, **I want** to send typed intentions, clarification answers, and refinement requests, **so that** I can create and improve the task through one input.

Acceptance criteria:

- AC-1: Given a nonblank intention in a new task input, when I select Send, then one accepted message creates one saved task attributed to me and starts generation.
- AC-2: Given an existing task awaiting clarification or ready for refinement, when I submit a message, then it continues that task rather than creating another task.
- AC-3: Given a request has not been confirmed, when submission fails or remains uncertain, then I see that status and can recover my text without a duplicate accepted message.
- AC-4: Given generation or publication is active, when I use Send, then the task cannot start a conflicting authoring operation.
- AC-5: Given text exceeds a supported submission limit, when I try to submit it, then I receive an explicit validation message and keep the full editable text; nothing is silently truncated.

Edge cases:

- EC-1 [Invalid input]: Text contains hostile instructions, code, or markup → treat it as user content; it cannot override ownership, source boundaries, or publication approval.
- EC-2 [Empty / missing]: Input contains only whitespace → reject submission without creating a task or message.
- EC-3 [Limits]: Message or conversation limits would be exceeded → explain the limit before losing context; retain the input and do not silently discard accepted history.
- EC-4 [Permissions]: A reader or expired session submits directly → reject the change without creating a message or starting generation.
- EC-5 [Concurrency]: Double-click Send or submit from two tabs → accept one logical submission and surface conflicting distinct work rather than silently merging it.
- EC-6 [Interruption]: The connection drops after submission → preserve recoverable input and resolve whether the message was accepted before replaying it.
- EC-7 [Repetition]: Retry the same confirmed submission → show the existing accepted message without another generation.
- EC-8 [Ordering]: A clarification reply arrives before an earlier send settles → prevent out-of-order conversation advancement.
- EC-9 [State transitions]: Submit to a published task → explain that it is complete and direct the author to a new task or the GitHub Issue.
- EC-10 [Scale]: A task has a long conversation → the next accepted message remains in the correct order and earlier accepted intent is not silently lost.

### US-004: Control microphone capture explicitly

**As a** task author, **I want** explicit microphone controls, **so that** I know when audio is captured and can stop or cancel it.

Acceptance criteria:

- AC-1: Given I have not started dictation, when the input appears, then the microphone is idle and capture has not begun.
- AC-2: Given I select the microphone, when permission is needed, then the application requests it and explains any remote processing before first capture.
- AC-3: Given capture is active, when I inspect the input, then I see a visible and accessible listening state plus Stop and Cancel actions.
- AC-4: Given I select Stop, when recognition finishes, then capture ends and the completed text remains available for review; selecting Cancel instead restores the input before that capture and ignores late results.
- AC-5: Given permission, capture hardware, and connectivity are available, when I dictate in current desktop Chrome, Edge, Firefox, or Safari, Android Chrome, or iOS Safari, then voice input works in each required environment.
- AC-6: Given capture cannot start or complete, when it fails, then I see actionable feedback and can continue typing with my pre-existing input intact.

Edge cases:

- EC-1 [Invalid input]: The selected capture device fails or produces unusable audio → stop capture, explain the failure, and leave typing available.
- EC-2 [Empty / missing]: No microphone exists or speech is absent → show the relevant unavailable/no-speech state without adding an empty message.
- EC-3 [Limits]: Capture reaches an operational limit → stop visibly, explain the limit, and preserve recognized text for review without automatic submission.
- EC-4 [Permissions]: Browser microphone consent is denied or task-author permission is missing → capture does not start and the input explains the reason.
- EC-5 [Concurrency]: Start is selected twice while permission or capture is pending → only one capture starts and Stop/Cancel control that capture.
- EC-6 [Interruption]: Navigation, project/task switching, sign-out, background interruption, or access loss interrupts capture → stop recording and never resume it automatically.
- EC-7 [Repetition]: Stop or Cancel is selected repeatedly → capture remains stopped and text is not appended repeatedly.
- EC-8 [Ordering]: Cancel occurs while recognition results are still arriving → late results are ignored and cannot enter another input.
- EC-9 [State transitions]: Generation or publication starts, or the task is already published → no new capture may start for that task.
- EC-10 [Scale]: Many tasks exist or dictation is used repeatedly → only the active authorized input captures audio; no previous task remains listening.

### US-005: Review dictated text before Send

**As a** task author, **I want** speech to become editable input text, **so that** I can correct transcription mistakes and combine speech with typing.

Acceptance criteria:

- AC-1: Given I dictate in the message input, when speech is recognized, then I see text in that input using pt-BR by default.
- AC-2: Given I typed text before starting dictation, when recognized text arrives, then the typed text is preserved and speech extends it without duplicating previously recognized phrases.
- AC-3: Given dictation has stopped and final text is ready, when I correct names, code terms, or wording, then the editable text reflects my changes and Send uses that final text.
- AC-4: Given speech ends or capture stops, when transcription completes, then no message is sent and no Issue is published until I use the corresponding explicit action.
- AC-5: Given an initial intention, a clarification answer, or a refinement request, when I choose dictation, then each uses the same review-and-Send interaction.
- AC-6: Given a transcript is submitted, when I reopen history, then I see the accepted text rather than a raw audio attachment; raw audio is absent from the published Issue.

Edge cases:

- EC-1 [Invalid input]: Recognition produces incorrect words or punctuation → keep text editable and never treat it as confirmed user intent before Send.
- EC-2 [Empty / missing]: No usable transcript is produced → keep the prior typed text and explain that no speech was recognized.
- EC-3 [Limits]: Recognized text exceeds the message limit → keep the complete editable text and explain that it must be adjusted before submission.
- EC-4 [Permissions]: Permission is withdrawn mid-dictation → stop capture, preserve previous typing, identify any partial transcript, and keep manual submission blocked until capture settles.
- EC-5 [Concurrency]: I edit already finalized dictated text while additional results arrive → preserve my edits and avoid overwriting them with older recognition segments.
- EC-6 [Interruption]: Transcription fails after a partial result → distinguish partial text from completed dictation and let me review, edit, or retry without sending automatically.
- EC-7 [Repetition]: I dictate again into the same unsent input → extend its current text once, without replaying previous capture results.
- EC-8 [Ordering]: I attempt Send while capture or final recognition remains active → wait for the final editable text before allowing submission.
- EC-9 [State transitions]: I cancel, switch tasks, or open a published task → abandoned capture results do not change that task's input or history.
- EC-10 [Scale]: A long dictated intention includes many technical terms → review remains usable, text is not silently truncated, and corrections can be made before Send.

## Agent Generation and Evidence

### US-006: Clarify only an unidentifiable task

**As a** task author, **I want** a concise question only when my request cannot be identified, **so that** I can provide the missing intent without a product-discovery interview.

Acceptance criteria:

- AC-1: Given an intention such as “Corrigir pedido.” without an identifiable problem, when the agent responds, then I receive one minimal question rather than a speculative draft or a questionnaire.
- AC-2: Given a specific identifiable request, when the agent responds, then missing optional product decisions do not force a clarification step before drafting.
- AC-3: Given an outstanding question, when I respond by typing or editable dictation, then the answer is saved in the same task and generation resumes using the preceding intent.
- AC-4: Given the answer still does not identify the requested work, when the agent responds, then it asks the next necessary concise question without inventing scope.

Edge cases:

- EC-1 [Invalid input]: The reply is malformed or tries to authorize unrelated actions → preserve the conversation boundary and do not publish or invent a task.
- EC-2 [Empty / missing]: A blank reply is submitted → keep the question outstanding and request nonblank input.
- EC-3 [Limits]: Repeated clarification reaches an integration limit → preserve history and show explicit recovery guidance rather than silently dropping the original intention.
- EC-4 [Permissions]: A reader answers another author's question → reject the mutation and keep the author's task unchanged.
- EC-5 [Concurrency]: Two tabs answer the same outstanding question → accept the current ordered answer or surface a conflict before a second generation changes the task.
- EC-6 [Interruption]: I leave while a question is awaiting an answer → restore that same saved question on return without running the agent again.
- EC-7 [Repetition]: A confirmed answer is retried → show the accepted answer and its resulting state without duplication.
- EC-8 [Ordering]: An answer targets a question superseded by a later draft → explain the stale task state rather than applying the answer to the wrong step.
- EC-9 [State transitions]: Refinement requires clarification while an earlier draft exists → retain the earlier saved draft but require completion of the active clarification/refinement before approving the current result.
- EC-10 [Scale]: Many prior messages exist → the question remains tied to the actual requested work and relevant context is not silently discarded.

### US-007: Generate a faithful Issue draft

**As a** task author, **I want** Issue Author to produce a concise draft grounded in my project, **so that** I can review the requested work without writing the entire Issue myself.

Acceptance criteria:

- AC-1: Given an identifiable intention, when generation succeeds, then I receive title, context, objective, constraints, relevant context with sources, product considerations, and references from the existing agent.
- AC-2: Given optional content is unsupported, when the draft is returned, then optional collections are empty and no generic criteria, urgency, labels, or assumptions are invented; product considerations contain at most three entries.
- AC-3: Given code context is helpful, when files are consulted, then they belong to the task's GitHub repository and current author access; Dev_Control's own local code is not substituted.
- AC-4: Given the request refers to existing work, duplicates, or repository history, when GitHub Issues are consulted, then the consultation is confined to the task's repository and uses actual returned sources.
- AC-5: Given no optional lookup is necessary or requested evidence is temporarily unavailable, when the task remains identifiable, then the agent can draft from known intent while clearly omitting unsupported claims and reporting unavailable context.
- AC-6: Given the agent fails or returns an invalid result, when generation ends, then I see a recoverable error, retain confirmed input and any prior draft, and receive no fabricated draft success.

Edge cases:

- EC-1 [Invalid input]: Repository content contains hostile instructions or the agent returns an invalid draft → treat content as evidence and reject invalid output without bypassing scope or permissions.
- EC-2 [Empty / missing]: No relevant files or Issues are found → use the supplied intent where sufficient and leave unsupported references empty.
- EC-3 [Limits]: Provider, lookup, or conversation limits are reached → report the limit or unavailable context and preserve accepted input without hidden truncation.
- EC-4 [Permissions]: The author loses project or repository access during generation → do not expose newly protected output; restore saved work only after access recovery.
- EC-5 [Concurrency]: A later revision or operation supersedes an older generation result → the older result cannot overwrite current work.
- EC-6 [Interruption]: The agent becomes unavailable or a request disconnects → show the recoverable actual state and retain prior confirmed content.
- EC-7 [Repetition]: A confirmed successful generation is replayed → retain one result for that logical request rather than adding another draft.
- EC-8 [Ordering]: The author switches projects before the response arrives → the result stays attached to its original task and cannot populate the newly selected project.
- EC-9 [State transitions]: The repository is renamed, transferred, or archived but remains readable → retain repository identity and accurate availability; archived status does not imply publication is permitted.
- EC-10 [Scale]: The repository is large → retrieval stays relevant and bounded without claiming that unexamined files were checked or adding unrelated context.

### US-008: Inspect real sources and consultation activity

**As a** task author or project reader, **I want** to inspect retrieved evidence, **so that** I can distinguish project facts from user intent and unsupported assumptions.

Acceptance criteria:

- AC-1: Given project evidence appears in the draft, when I inspect it, then I see exact retrieved paths and available line information bound to the task repository.
- AC-2: Given a GitHub Issue is cited, when I inspect or open the reference, then its actual repository, Issue number, and URL are shown.
- AC-3: Given tools were used, when I view consultation activity, then I see genuine targets and outcomes, with empty results distinct from failed retrieval; any timing shown is real.
- AC-4: Given generation required no tool use, when I review the conversation, then no invented consultation rows or references appear.
- AC-5: Given a source-derived claim is manually changed, when I inspect the updated draft, then unsupported edited wording is not falsely presented as verified by the original source.

Edge cases:

- EC-1 [Invalid input]: A reference points outside the allowed repository or contains an unsafe URL → withhold the invalid reference and show a validation error rather than a trusted source link.
- EC-2 [Empty / missing]: Reference lists are empty → show the absence honestly without filler paths or Issue numbers.
- EC-3 [Limits]: Activity or source lists exceed the initial viewport → keep included references reachable; do not fabricate a complete-repository claim.
- EC-4 [Permissions]: A viewer lacks personal repository access → withhold protected conversation, draft, and source content rather than relying on another member's token.
- EC-5 [Concurrency]: A newer draft changes its references → show references for the corresponding revision, not a mixed source set.
- EC-6 [Interruption]: Opening a source fails due to network or remote unavailability → preserve its recorded provenance and explain that the source cannot currently be opened.
- EC-7 [Repetition]: Reopen a saved source trail → show the recorded activity without rerunning tools or inventing new timings.
- EC-8 [Ordering]: Tool results arrive after their task is no longer active → place activity in the originating task and correct generation order.
- EC-9 [State transitions]: A cited file or Issue changes or disappears later → retain its historical provenance and do not claim it verifies the current repository state.
- EC-10 [Scale]: Many genuine tool results exist → the reader can distinguish their sources and reach referenced evidence without losing the current draft.

## Draft Review and Refinement

### US-009: Edit and save the canonical draft

**As a** task author, **I want** to edit the draft manually, **so that** the saved content reflects the Issue I intend to approve.

Acceptance criteria:

- AC-1: Given a draft ready for review, when I edit its canonical content, then I can change title, context, objective, constraints, relevant context, product considerations, and included references within their validation rules.
- AC-2: Given I finish an edit, when saving succeeds, then the updated draft becomes the current confirmed revision and authorized readers see it on reopening.
- AC-3: Given title, context, or objective is blank or considerations exceed three entries, when I try to approve publication, then field-specific validation blocks approval and preserves editable content.
- AC-4: Given the current draft, when I inspect the publication preview, then I see the exact proposed title and Markdown body with optional empty sections omitted and the repository identified.
- AC-5: Given saving fails or a conflicting newer revision exists, when I try to continue, then I see the problem and retain my recoverable edits; they are not falsely labeled saved.

Edge cases:

- EC-1 [Invalid input]: Content or source references are invalid or unsafe → show validation feedback and do not render unsafe active content or verified badges for unsupported claims.
- EC-2 [Empty / missing]: Optional collections are empty → save them as empty and omit their empty sections from the publication preview.
- EC-3 [Limits]: A field or body exceeds a supported limit → retain its editable value and show an explicit error without truncating it.
- EC-4 [Permissions]: A reader or administrator who is not the author edits directly → reject the change and retain the author's saved revision.
- EC-5 [Concurrency]: Two author tabs save conflicting revisions → surface a conflict and preserve the newer confirmed draft rather than silently overwriting it.
- EC-6 [Interruption]: Connectivity fails while saving → distinguish failed/unconfirmed edits from the saved revision and offer recoverable retry.
- EC-7 [Repetition]: A confirmed save is retried → do not create duplicate visible revisions or change content again.
- EC-8 [Ordering]: Publish is selected before saving settles → block approval until the displayed content is confirmed and current.
- EC-9 [State transitions]: Generation, publishing, uncertain publication, or a published result is active → disallow edits that could change the pending or completed operation's content.
- EC-10 [Scale]: A draft includes many constraints or references → all included content remains editable and reachable on desktop and mobile.

### US-010: Refine the current draft through conversation

**As a** task author, **I want** to request changes through the conversation, **so that** the agent can revise the draft while preserving my unrelated edits and original intent.

Acceptance criteria:

- AC-1: Given a saved author-edited draft, when I send a refinement request by text or dictation, then the agent receives the relevant conversation and current saved content as its authoring context.
- AC-2: Given a focused change request, when refinement succeeds, then the new draft implements that request while retaining unrelated author changes and explicit user decisions.
- AC-3: Given refinement cannot identify the requested change, when the agent responds, then I receive a minimal clarification and retain the previous saved draft.
- AC-4: Given refinement fails or conflicts with newer edits, when its result is received, then previous confirmed work remains recoverable and conflicting changes require author resolution rather than automatic replacement.

Edge cases:

- EC-1 [Invalid input]: The refinement asks for unsupported or unauthorized actions → preserve the agent's Issue-authoring boundary and do not publish, access another repository, or implement code.
- EC-2 [Empty / missing]: The request is blank or no draft exists → reject blank input or use the initial task-identification flow; do not fabricate a prior draft.
- EC-3 [Limits]: Current content and history exceed agent input capacity → give explicit recovery feedback and never silently drop manual edits or original requirements.
- EC-4 [Permissions]: Someone other than the author asks for refinement → reject the request without changing conversation or draft.
- EC-5 [Concurrency]: An older refinement response conflicts with a newer revision → retain the newer revision and show a conflict before applying replacement.
- EC-6 [Interruption]: Refinement times out or disconnects → retain the prior saved draft and actual pending/failed state without treating it as a new approved revision.
- EC-7 [Repetition]: A confirmed refinement request is retried → show its existing response without duplicate messages or replacement drafts.
- EC-8 [Ordering]: A refinement is submitted while a save or prior generation is unfinished → prevent advancement until the current revision is settled.
- EC-9 [State transitions]: The task is publishing, publication-uncertain, or published → reject refinement and explain its current completion or verification state.
- EC-10 [Scale]: The task has many earlier refinements → the current draft remains the review source of truth and relevant explicit decisions remain preserved.

## GitHub Publication and Recovery

### US-011: Approve and publish the reviewed revision

**As a** task author, **I want** an explicit “Criar Issue” action, **so that** only the draft I reviewed is published in the correct repository.

Acceptance criteria:

- AC-1: Given a saved valid current draft and permission to create an Issue, when I inspect review, then I see the proposed title/body, target repository, and GitHub author identity before selecting “Criar Issue”.
- AC-2: Given I select “Criar Issue”, when publication executes, then it uses that reviewed revision and the task's stable repository identity under my authorized GitHub identity.
- AC-3: Given the revision or destination no longer matches review, when publication would execute, then it stops and requires a fresh review instead of sending different content.
- AC-4: Given publication is active, when I view the task, then its state is visibly publishing and conflicting edits, generation, microphone capture, and repeated publication are unavailable.
- AC-5: Given GitHub confirms creation, when Flow Dev records the result, then I see the actual Issue number and URL and the task retains the approved publication snapshot.
- AC-6: Given no explicit publication action occurred, when I dictate, stop capture, send messages, finish generation, save edits, or recover authorization, then no Issue is created.

Edge cases:

- EC-1 [Invalid input]: The draft violates required fields or provider content rules → reject before external creation where detectable and show a precise content error.
- EC-2 [Empty / missing]: No valid saved draft or repository binding exists → keep publication unavailable and explain the missing prerequisite.
- EC-3 [Limits]: GitHub rejects content size or rate-limits creation → retain the reviewed draft and show correction or retry guidance without false success.
- EC-4 [Permissions]: The caller is not the author, lost project access, or lacks Issue creation authorization → reject publication even through a direct request.
- EC-5 [Concurrency]: Double-click or two tabs approve the same revision → track one logical attempt and prevent a second Issue creation.
- EC-6 [Interruption]: Creation was sent but the response was lost → enter verification of the uncertain attempt rather than declaring failure or allowing blind resubmission.
- EC-7 [Repetition]: Approve again after confirmed success → show the already linked Issue and create no second Issue.
- EC-8 [Ordering]: Approval is attempted during a save, clarification, or generation → require a current saved draft ready for review.
- EC-9 [State transitions]: The repository becomes archived, disables Issues, is deleted, or changes access before creation → show the actual blocking condition and retain work without retargeting the task.
- EC-10 [Scale]: Several tasks are published independently → each result stays linked to its own author, draft revision, and repository; no results are mixed.

### US-012: Recover rejected or uncertain publication

**As a** task author, **I want** publication recovery to distinguish rejection from an unknown result, **so that** I can finish safely without duplicating an Issue.

Acceptance criteria:

- AC-1: Given GitHub confirms rejection without creation, when the attempt ends, then the saved draft returns to review with a specific reason and requires explicit approval after correction or recovery.
- AC-2: Given creation may have succeeded but its result is unknown, when I open the task, then I see “Verificando publicação” and a new creation remains blocked while the existing attempt is reconciled.
- AC-3: Given reconciliation confirms the Issue exists, when it finishes, then the task becomes published with that actual Issue link and snapshot without another creation request.
- AC-4: Given reconciliation establishes noncreation, when I return to review, then I can explicitly approve a new attempt; no retry publishes automatically.
- AC-5: Given reconciliation cannot establish the outcome, when I view recovery, then the uncertainty remains visible, publication remains blocked for that attempt, and I receive guidance to verify the destination without a false success or safe-retry claim.

Edge cases:

- EC-1 [Invalid input]: A proposed recovery reference is malformed or belongs to another repository/attempt → do not mark the task published from that evidence.
- EC-2 [Empty / missing]: No conclusive matching result is available → remain uncertain; an empty or delayed search alone does not prove noncreation.
- EC-3 [Limits]: GitHub throttles reconciliation → retain the uncertain state, explain the delay, and prohibit blind new creation.
- EC-4 [Permissions]: Author or GitHub access expires during verification → require recovery before further protected checks and keep the attempt uncertain.
- EC-5 [Concurrency]: Two tabs or recovery processes inspect the same attempt → converge on one confirmed result and do not trigger duplicate creation.
- EC-6 [Interruption]: A restart occurs after GitHub creates the Issue but before the link is saved → restore the uncertain attempt and reconcile that creation.
- EC-7 [Repetition]: Recovery is repeated after a result is confirmed → return the existing outcome without another publication or contradictory status.
- EC-8 [Ordering]: A late creation response arrives after reconciliation began → match it to the original attempt and reconcile before exposing another approval.
- EC-9 [State transitions]: A verified created Issue has already been closed or edited in GitHub → creation still counts as successful; do not recreate it because it is no longer open or unchanged.
- EC-10 [Scale]: Multiple tasks have uncertain attempts → verification remains attributable per task; similar titles in other tasks cannot be treated as matching proof.

### US-013: Consult the published result

**As a** task author or project reader, **I want** the actual Issue link and approved content retained, **so that** I can find the outcome and understand what was published.

Acceptance criteria:

- AC-1: Given publication succeeded, when I open the task, then I see the real repository, Issue number, GitHub URL, publisher, publication time, and approved snapshot.
- AC-2: Given I select “Abrir no GitHub”, when the destination opens, then it is the linked Issue rather than the GitHub homepage or a demonstration Issue.
- AC-3: Given a published task, when I inspect authoring controls, then further draft edits, refinements, and creation are unavailable; I can start a new task or open the Issue.
- AC-4: Given the Issue changes externally, when I revisit Flow Dev, then the retained content remains labeled as the publication snapshot and does not claim live synchronization.

Edge cases:

- EC-1 [Invalid input]: A stored publication URL is invalid or inconsistent with the linked repository → show a result error rather than directing users to an untrusted destination.
- EC-2 [Empty / missing]: An actual Issue identity or link is not confirmed → do not show a published success with a placeholder number or homepage link.
- EC-3 [Limits]: GitHub is rate-limited or unreachable → retain the known saved snapshot and link; lack of a live refresh does not erase confirmed publication.
- EC-4 [Permissions]: Flow Dev or personal repository access is lost → protect the saved result; opening a link never bypasses GitHub's own permissions.
- EC-5 [Concurrency]: A second tab learns publication succeeded → display the same linked result and remove stale publication controls.
- EC-6 [Interruption]: Navigating back from GitHub or reconnecting after a restart → restore the confirmed published state without creation side effects.
- EC-7 [Repetition]: Open the result or link repeatedly → no duplicate Issue is created.
- EC-8 [Ordering]: A direct result link is opened before project entry → authorize and establish its correct project context before showing the snapshot.
- EC-9 [State transitions]: The Issue is closed, deleted, or transferred externally → preserve the recorded historical creation and explain any observed link failure without recreating it.
- EC-10 [Scale]: Many tasks have published results → each number and link remains attributable to its project and task rather than using a shared global result.

## Access, Authorization, and Interface

### US-014: Enforce project, repository, and author boundaries

**As a** project member or administrator, **I want** viewing and changes to follow explicit permissions, **so that** shared history does not grant unauthorized access or control.

Acceptance criteria:

- AC-1: Given I am a member with my own repository access, when I open another author's task, then I can view saved content but cannot send messages, dictate, edit, refine, or publish it.
- AC-2: Given I am the task's author with current required permissions, when I perform a protected action, then authorship is checked together with project and repository access.
- AC-3: Given I am an administrator, when I consult projects, then my existing project-wide visibility applies, but another person's task remains read-only and personal repository access remains required.
- AC-4: Given access is removed while a task is open, when the next protected action occurs, then it is rejected, active capture ends, and the view no longer exposes newly requested protected content.
- AC-5: Given project, repository, author, or source identifiers are altered in a direct request, when it is processed, then it cannot access or mutate another project's task or change ownership/destination.

Edge cases:

- EC-1 [Invalid input]: A task/project identifier or claimed author is forged → reject without revealing protected task existence or content beyond existing access guidance.
- EC-2 [Empty / missing]: No authenticated user or authorized project exists → show sign-in or project access guidance before task content.
- EC-3 [Limits]: An access check cannot complete because its provider is limited or unavailable → block the affected protected action rather than treating failure as permission.
- EC-4 [Permissions]: GitHub access exists without Flow Dev assignment, or assignment exists without personal GitHub access → neither alone grants repository-dependent task viewing or actions.
- EC-5 [Concurrency]: Assignment is removed while generation or publication is being authorized → revalidate at the protected boundary and stop new access; external creation already accepted by GitHub must still be reconciled rather than duplicated.
- EC-6 [Interruption]: Session expiry occurs during dictation or saving → stop capture, preserve confirmed work, and require sign-in before continuation.
- EC-7 [Repetition]: A formerly authorized request is replayed after revocation → check current access and reject it when no longer authorized.
- EC-8 [Ordering]: A viewer uses an edit/publication deep link without visiting the reader screen → apply identical author-only checks.
- EC-9 [State transitions]: The author loses membership while other members retain it → the task remains consultable to authorized readers but they cannot take over editing or publication.
- EC-10 [Scale]: Many projects and shared tasks exist → permissions apply to every task and page; listing or filtering cannot leak cross-project content.

### US-015: Recover GitHub authorization

**As a** task author or project reader, **I want** clear repository authorization guidance, **so that** I can restore permitted access without losing the task or accidentally publishing it.

Acceptance criteria:

- AC-1: Given identity sign-in has not granted repository access, when I attempt repository-dependent work, then I see that repository authorization is separate from login and receive the appropriate recovery action.
- AC-2: Given I authorize access and return, when permissions are verified, then I resume the same saved task and repository without automatic generation or publication replay.
- AC-3: Given consent is denied, organization approval is needed, Issue creation permission is insufficient, or GitHub is temporarily unavailable, when the action fails, then each condition has distinct actionable feedback and saved work remains intact.
- AC-4: Given the repository is archived, missing, or has Issues disabled, when publication is evaluated, then I see that specific destination problem rather than an unrelated login request or alternative repository.

Edge cases:

- EC-1 [Invalid input]: An authorization return destination is malformed or points outside permitted Flow Dev routes → reject it and return to a safe authorized project/task destination.
- EC-2 [Empty / missing]: Repository authorization is absent → explain the missing authorization without exposing protected content.
- EC-3 [Limits]: GitHub authorization or permission lookup is rate-limited → offer retry guidance, retain work, and never report an empty repository as the result.
- EC-4 [Permissions]: A different GitHub identity grants access or organizational restrictions persist → reject mismatched authorization and explain the remaining requirement.
- EC-5 [Concurrency]: Authorization is completed in another tab → recheck current access before resuming and do not replace task ownership or content.
- EC-6 [Interruption]: The redirect or authorization flow is canceled → keep the saved task in its previous state and allow recovery later.
- EC-7 [Repetition]: Return from authorization repeatedly → do not duplicate messages, generation, or publication approvals.
- EC-8 [Ordering]: Permission recovery finishes after the user switched tasks/projects → resume only the original authorized destination or a safe project view; do not retarget pending work.
- EC-9 [State transitions]: Repository rename/transfer preserves its stable identity → recover access to that same repository; deletion cannot substitute another codebase.
- EC-10 [Scale]: The user can access many repositories → recovery remains bound to the task's repository rather than selecting another accessible repository automatically.

### US-016: Use accessible authoring and shared viewing

**As a** task author or project reader, **I want** clear Portuguese interaction on desktop and mobile, **so that** typing, dictation, review, and task consultation work with my device and accessibility needs.

Acceptance criteria:

- AC-1: Given keyboard or screen-reader interaction, when I navigate the task history, conversation, draft, sources, and actions, then controls have accessible labels, visible focus, and understandable status feedback in pt-BR.
- AC-2: Given a phone and its on-screen keyboard, when I type, dictate, review, or inspect sources, then the input and capture controls remain reachable and text review is usable without depending on desktop panels.
- AC-3: Given capture, generation, saving, publication, failure, or uncertain verification, when the state changes, then its meaning is visible and available to assistive technology without relying on color or sound alone.
- AC-4: Given reduced-motion preferences or no microphone permission, when I use the feature, then motion is reduced and the complete task-authoring journey remains possible through typing.
- AC-5: Given I view another author's task, when responsive layout changes, then its read-only status and author attribution remain clear and no mutation control becomes available.

Edge cases:

- EC-1 [Invalid input]: Validation fails in a draft or input → the message identifies the affected content accessibly and preserves editable values.
- EC-2 [Empty / missing]: Empty history, no evidence, or no draft exists → accessible empty-state guidance identifies the appropriate next action without fake content.
- EC-3 [Limits]: Large text, browser zoom, or a narrow viewport expands content → controls and source links remain reachable without clipping essential actions.
- EC-4 [Permissions]: A viewer cannot use an action → provide understandable read-only/access guidance rather than depending solely on a disabled unlabeled icon.
- EC-5 [Concurrency]: Background state updates occur while a user reads or edits → announce relevant changes without stealing focus or silently replacing active input.
- EC-6 [Interruption]: Mobile keyboard dismissal, orientation change, or temporary connection loss occurs → preserve confirmed work and expose current status when the user resumes.
- EC-7 [Repetition]: Repeated status updates occur → announcements do not duplicate messages or trigger repeated user actions.
- EC-8 [Ordering]: A user navigates from a source panel back to review → retain logical focus and access to the current draft before publication.
- EC-9 [State transitions]: Draft review becomes publishing or published → expose the new state and appropriate available actions to both visual and assistive users.
- EC-10 [Scale]: Long histories and source lists are viewed on mobile or with assistive technology → navigation and reading order remain usable and all included content stays reachable.

## Edge-Case Sweep Record

Every story was probed against all ten required classes. `EC-1` through `EC-10` consistently cover invalid input, empty/missing data, limits, permissions, concurrency, interruption, repetition, ordering, state transitions, and scale, respectively. No class was skipped. The entries above state the observable expected behavior rather than implementation details.
