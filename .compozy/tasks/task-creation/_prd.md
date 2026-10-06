# PRD: Task Creation Through GitHub Publication

## Overview

Flow Dev helps team developers turn a development intention into a reviewed GitHub Issue. This feature delivers the complete journey within a selected project: describe the task by typing or dictating, receive clarification only when necessary, generate an evidence-grounded draft with the existing Issue Author agent, refine or edit the content, and explicitly publish it to the project's GitHub repository. Project members share visibility of task history, while the task's author alone controls its content and publication.

The current issue workspace is a demonstration. Its agent conversation, code lookups, and publication result are scripted. The sibling `../Dev_Control` application contains the real Issue Author, but its existing context tools target its own local files and globally configured GitHub access. This feature connects authoring to the actual selected project, persists the user's work, and replaces the simulated publication with a real Issue and a durable link.

### Research and confirmed decisions

- `apps/web/PRODUCT.md` defines developer review, explicit approval, and visible provenance. Its statement that the entire application is frontend-only is outdated: authentication, project assignments, and a durable catalog now have backend code. The task-generation and publication flow itself remains simulated.
- `apps/web/src/features/issues/issue-composer/hooks/useWorkspace.ts` scripts tool calls and draft generation, keeps sessions in browser memory, and returns the fixed publication number `148`. The current draft UI also uses prototype criteria and labels that the real agent does not return.
- `../Dev_Control/src/mastra/agents/issue-author.ts`, its authoring skill, and its result schema define `needs_clarification` and `draft_ready`, selective evidence retrieval, and an Issue draft with no publication responsibility.
- `../Dev_Control/src/mastra/server/issue-author-route.ts` provides an authenticated final-result route. Its current request accepts up to 20 alternating messages of up to 10,000 characters each; it does not accept a project-bound context or expose a tool trace. These are current integration constraints, not automatically adopted product quotas.
- `packages/api/src/routers/index.ts` currently exposes health, project, and access operations, not task operations. GitHub sign-in requests `read:user`; the existing repository-authorization records alone do not prove that repository access or Issue publication is operational.

External research matters because this journey publishes an external artifact and introduces voice expectations. [GitHub's creation documentation](https://docs.github.com/en/issues/tracking-your-work-with-issues/using-issues/creating-an-issue) supports natural-language authoring as an existing product pattern and distinguishes Issue creation from maintainer metadata actions. [GitHub's Issue API documentation](https://docs.github.com/en/rest/issues/issues#create-an-issue) confirms that repository Issue availability and authorization affect creation. [MDN](https://developer.mozilla.org/en-US/docs/Web/API/SpeechRecognition) documents limited native recognition availability and possible remote audio processing. These findings inform authorization, recovery, browser coverage, and disclosure requirements; they do not mandate an implementation provider.

The user confirmed four decisions: editable dictation followed by manual Send; shared project history with author-only editing and publication; only the real agent's content with manual and conversational refinement; and microphone support on computers and phones in the main browsers.

## Goals

- A developer can create a real task in an authorized project using typed or dictated intent.
- The author can resume saved conversations and draft revisions after refresh, navigation, reauthentication, or service restart.
- Authorized project members can consult task history; only the author can change content or publish it.
- An identifiable request produces a faithful draft without a compulsory discovery questionnaire or fabricated evidence.
- The author can inspect sources, edit the draft, request refinements, and publish the reviewed revision to the selected project's repository.
- Successful publication shows the real Issue number and URL and remains linked to the originating task.
- Permission failures, unavailable context, generation failure, transcription failure, and uncertain publication outcomes have distinct recoverable behavior.
- Double submission and recovery do not create duplicate conversations, draft revisions, or GitHub Issues from the same logical action.

## User Stories

[Full user stories](_user_stories.md)

- `US-001`–`US-002`: Shared project task history, ownership, and durable resumption.
- `US-003`: Typed messages and reliable submission.
- `US-004`–`US-005`: Explicit microphone capture and editable dictation across desktop and mobile.
- `US-006`–`US-007`: Minimal clarification and evidence-grounded draft generation.
- `US-008`: Real source provenance and consultation activity for authors and readers.
- `US-009`–`US-010`: Manual edits and conversational refinements without losing author changes.
- `US-011`–`US-012`: Explicit publication of the reviewed revision and recovery of uncertain outcomes.
- `US-013`: Durable published Issue identity and the completion boundary.
- `US-014`–`US-015`: Member, author, administrator, and GitHub authorization boundaries.
- `US-016`: Accessible Portuguese authoring and shared viewing on desktop and mobile.

## Core Features

### 1. Project task workspace and durable history

The selected project's task workspace shows saved tasks and allows a member to start their own task. Each task identifies its author, title, current state, and project repository. Other authorized members can open its conversation, current draft, provenance, and publication result in a read-only view.

Create a durable task on the first accepted nonblank message. A blank “Nova intenção” input is not itself a saved task. Each task remains bound to its original project and author. Opening another task or changing projects does not retarget existing work.

Persist accepted messages, agent responses, draft changes, and publication results. Restore the latest confirmed work on return, including an outstanding clarification. Show saving and failure feedback; do not imply that unsaved browser text or an in-flight operation is confirmed. Keep all saved tasks reachable as history grows, and distinguish loading, empty history, no search matches, and load failure.

### 2. Typed and dictated input

The author uses the same input for an initial intention, clarification replies, and refinement requests. Voice supplements typing. An explicit microphone action requests permission and begins capture; speech becomes editable input text. The author stops capture, reviews the final text, corrects terms, and selects Send. Ending capture never submits a message or approves publication.

Capture controls expose permission, listening, processing, stopped, canceled, and failed states. Cancel restores the text that existed before that capture session and ignores late results. Stopping preserves the completed dictation. Starting another dictation extends the current input without duplicating earlier text. Never replace pre-existing typed text silently.

Use pt-BR as the default recognition language. Support current desktop Chrome, Edge, Firefox, and Safari; Android Chrome; and iOS Safari. Voice must work in those supported contexts when capture permission and connectivity are available. Typing remains available for denied permission, missing hardware, transcription failure, and unsupported environments. A fallback message alone does not satisfy voice compatibility in the required browser matrix.

### 3. Real Issue Author generation and clarification

Use the existing Issue Author in `../Dev_Control` for generation and conversational refinements. Preserve its responsibility: identify the requested development work and write a concise Issue, without expanding into PRD discovery, technical design, implementation, or publication.

Return either one minimal clarification question when the task cannot be identified, or a structured draft when it can. A clear intention can go directly to draft review. Additional user detail continues the same task and uses its relevant conversation and current author-edited draft.

All code and Issue lookups use the task's GitHub repository and authorized user context. Project code retrieval is selective; GitHub Issue retrieval follows references to existing work, duplicate investigation, or repository history. Context is optional when the task is already identifiable. Show when requested context was unavailable, and omit unsupported claims instead of fabricating them.

### 4. Canonical draft, provenance, and review

Present title, context, objective, constraints, relevant context with sources, product considerations, and references. Title, context, and objective must contain meaningful nonblank content for publication. Optional collections may be empty; product considerations contain at most three entries, matching the existing agent contract. Empty optional sections add no invented filler.

Allow the author to edit draft content manually and request changes through the conversation. Keep the current saved author-edited revision as the review source of truth. Refinement must preserve changes unrelated to the request; when a result would replace conflicting newer work, show the conflict and let the author resolve it before applying or publishing.

Show genuine retrieved file paths and line information and actual Issue numbers and URLs. Source information remains distinguishable from user-authored statements. Edited source-dependent claims must not continue to appear as automatically verified facts without valid matching evidence. Provide a preview of the title and Markdown body that will be sent to GitHub, including the publication destination. Publish only the displayed Issue content, not the entire conversation or diagnostic activity.

Show actual consultation activity through the existing source-oriented interface when available, including no matches or failure as distinct outcomes. Do not synthesize tool calls or timing to mimic the demo. A generation requiring no lookup has no invented consultation trail. Progressive delivery and final delivery are both compatible with this requirement as long as displayed activity is real.

### 5. Explicit publication and recovery

Only the author may select “Criar Issue” from a valid, saved draft. This action authorizes creation of one Issue from the current reviewed revision in the task's repository. Show the author identity and destination before approval. Revalidate application access, repository authorization, and publication availability at the protected action.

While publishing, prevent further edits, generation, and repeated publication of that task. On confirmed success, save and display the returned Issue identity, number, URL, publisher, and publication time. Retain the approved content as the publication snapshot.

When GitHub confirms rejection without creation, preserve the draft, explain the cause, and allow author correction or authorization recovery followed by explicit retry. When the result is uncertain, show “Verificando publicação” and reconcile the existing attempt before allowing another creation. Refresh, a second tab, or reconnection cannot turn an uncertain attempt into a new blind submission. If automatic reconciliation cannot establish the outcome, keep publication blocked for that attempt and provide guidance to verify the destination; never claim success or safe retry without evidence.

The journey ends at confirmed creation. A published task displays its retained snapshot and link; it does not accept further draft edits or messages that imply a GitHub update. The developer starts a new task for another intention or opens the existing Issue in GitHub.

### 6. Authorization and shared visibility

Reuse the existing authenticated session, administrator designation, and project assignment rules. Project members can view shared task history only while authorized for that project. Reading repository-derived conversation or draft content additionally requires the viewer's own access to that repository. Project administrators have project-wide visibility but no authorship override and no exemption from personal GitHub access.

Only a task's author may change any authoring state or publish, including through direct requests. A reader sees author identification and a read-only explanation instead of active edit, message, or publication controls. Losing project or repository access stops further protected actions and microphone capture; restore the saved task after access returns without changing its author or destination.

Explain GitHub repository authorization separately from identity sign-in. Denied consent, organization restrictions, insufficient Issue creation authorization, archived repository, disabled Issues, missing repository, and temporary outage produce distinct actionable states. Authorization recovery preserves the draft and never publishes automatically.

## Business Rules

1. A saved task has exactly one immutable project, one immutable author, and at most one linked Issue created by this workflow. A logical publication attempt must not result in additional Issue creation on repeat submission or recovery.
2. The selected project's stable GitHub repository is the source of code truth and the publication destination. Renames and transfers preserve repository identity; a different repository cannot replace the destination of an existing task.
3. Flow Dev membership and the current person's own GitHub repository access govern repository-dependent viewing and actions. Shared service credentials never grant otherwise missing user access.
4. All authorized project members may view shared tasks subject to repository access. Only the author may submit messages, edit the draft, request refinement, or publish. Administrators receive no authorship override.
5. Blank messages are rejected without creating a task or advancing its state. Failed or uncertain submission retains recoverable input and distinguishes unconfirmed text from accepted conversation history. Repeat submission of the same logical message does not add a duplicate message.
6. A task follows `generating → awaiting_clarification` or `generating → draft_ready`; a reply returns an awaiting task to generation. A refinement starts from `draft_ready` and returns to clarification or draft review. A prior valid draft remains recoverable during an incomplete or failed refinement.
7. Only a saved, valid `draft_ready` revision can enter `publishing`. Confirmed success enters `published`; confirmed failure without creation returns to `draft_ready` with an error; an ambiguous outcome enters `publication_uncertain` until reconciled. A confirmed existing Issue enters `published`; established noncreation returns to review and requires a new explicit approval to retry.
8. Generation, storage, permission, and connection failures are recoverable conditions, never fake draft or publication successes. Returning to a task must show the actual pending or completed operation, not trigger it again implicitly.
9. Only one authoring or publishing operation for the same task may be active at a time. Older responses may not overwrite a newer draft or another task. Multiple tabs must surface stale revisions before replacement or approval.
10. Publication approval applies to the displayed saved revision and repository. If either differs at execution, stop publication and request a fresh review. Unsaved edits must be saved before approval can be used.
11. The draft's canonical fields match Issue Author: title, context, objective, constraints, relevant context with sources, product considerations, and references. Optional collections default to empty, not invented content; product considerations have a maximum of three.
12. Title, context, and objective cannot be blank at publication. Validate provider limits and show field-specific errors before external creation. Do not silently truncate user text, conversation, generated content, or rendered Issue body.
13. Do not turn assumptions into verified facts, invent tool activity, cite unretrieved sources, or automatically add criteria, urgency, labels, or assignees. Preserve explicit user requirements without expanding the requested work.
14. Dictation uses pt-BR by default and requires an explicit author action and microphone permission. Only one capture may be active within the authoring view. Stop and cancel are distinct: Stop keeps recognized text; Cancel restores the input before capture.
15. Speech must be reviewed as editable text and manually sent. Sending is unavailable until capture and final transcription settle. Permission denial or failure does not erase previously typed input; an interrupted partial transcript must be clearly identified rather than automatically submitted.
16. Microphone capture stops on task or project switching, navigation away, sign-out, and access loss. Late results from canceled or abandoned captures cannot enter another task. An interruption does not resume recording automatically.
17. Raw audio is transient input, not a saved task attachment or published Issue content. Disclose remote transcription before first capture when used. Do not expose audio, tokens, or private repository data in diagnostic messages or to unauthorized people.
18. The published title and body match the approved preview. Optional empty sections are omitted; included constraints, considerations, and source references retain their meaning. The conversation and tool diagnostics are not appended to the Issue.
19. The published task retains its approved snapshot and Issue link. Subsequent external edits or closure do not rewrite this historical snapshot or imply synchronization. Opening the link does not grant GitHub access the viewer lacks.
20. No new fixed quota is imposed on task count. Keep all authorized history reachable without silent truncation. The TechSpec must define explicit compatible input and dictation limits; the current agent route's message limits must not cause silent context loss.

## User Experience

### Author journey

1. Sign in and enter an authorized project; the header identifies the project and repository.
2. Open the task workspace and choose “Nova intenção”. Type the intention or choose the microphone, speak, stop, and edit the transcript.
3. Select Send. The first accepted message creates a saved task attributed to the author. The UI shows generation progress and genuine context activity.
4. Answer a minimal clarification if needed, using typing or dictation. Otherwise proceed directly to the draft.
5. Review the structured content and exact sources. Edit manually or request a conversational refinement. Inspect the latest saved revision and publication preview.
6. Resolve GitHub authorization if required. Select “Criar Issue” to approve that saved revision and repository.
7. See a confirmed Issue number and “Abrir no GitHub”, or a distinct recoverable failure or verification state. Return later to the same saved task and result.

### Project member journey

1. Open an authorized project and browse saved tasks with author and state.
2. Open another member's task and consult its conversation, draft, sources, and publication result when personally authorized for repository content.
3. See a read-only explanation. Start a separate task to author another intention; no action can edit or publish the viewed member's task.

### Interface and accessibility requirements

- Keep interface copy and default generated Issue content in pt-BR; preserve code identifiers, paths, repository names, and user-requested content language accurately.
- Adapt the existing session rail, conversation, source lanes, draft review, and publication presentation to real data under `apps/web/DESIGN.md`. Preserve its source-color meanings and publication emphasis without inventing visual activity.
- Make the voice action discoverable alongside Send, with distinct accessible labels for Start, Stop, and Cancel. Show visible recording and processing state; do not rely on color, animation, or sound alone.
- Support keyboard navigation, visible focus, screen-reader labels and status announcements, reduced motion, and touch operation. No voice-only step is required to author a task.
- On phones, keep the input and capture controls usable with the on-screen keyboard and show shared task history and sources through accessible navigation. Moving between these views within the same task must not lose saved work.
- Explain first-use microphone permission and remote audio processing where applicable. Never capture in the background without a clear active state.
- Distinguish empty history, missing authorization, expired session, no evidence found, unavailable evidence, generation failure, save failure, invalid draft, publication rejection, and uncertain publication.

## High-Level Technical Constraints

- Integrate the existing Issue Author in the sibling Dev_Control application. Its current local code search, global GitHub access, message-only route, provenance checks, and final response must be evaluated against project-bound, per-user access requirements; do not assume they already satisfy them.
- Depend on the [projects PRD](../projects/_prd.md) and [authentication PRD](../github-authentication/_prd.md) for identity, repository binding, and project access. Read the delivered implementation because those PRDs include capabilities beyond what current production wiring proves.
- Enforce authorization on protected actions and direct access, not solely through disabled frontend controls. Never expose service credentials or GitHub tokens in the browser or user-visible history.
- Require durable accepted messages, draft revisions, provenance, and publication identity across restarts. Do not use demonstration data as production task history.
- Require real voice operation across the stated desktop and mobile browser matrix. The TechSpec chooses transcription technology and must address microphone capture, processing disclosure, temporary audio cleanup, and provider retention without silently narrowing browser coverage.
- Do not store raw audio in task history. Retain only confirmed text and necessary task records under existing access boundaries. Define operational limits and any external transcription retention precisely in the TechSpec and disclose material processing behavior to users.
- Show actionable progress during slow operations and retain recoverable content after interruptions. Do not report publication success without a verified GitHub Issue.
- GitHub creates an external artifact. Recovery must reconcile ambiguous creation outcomes before another attempt; generation and authorization redirects cannot independently approve publication.
- This PRD defines behavior, not transport, persistence schemas, integration libraries, polling or streaming choices, or deployment design. Those decisions belong to the TechSpec.

## Non-Goals (Out of Scope)

- Audio messages as retained conversation attachments and spoken agent responses: the user selected editable dictation followed by manual Send.
- Collaborative edits, ownership transfer, or publication of another member's task: the user selected shared viewing with author-only mutation and publication.
- Label and assignee selection and automatic additional acceptance criteria: the user selected only the agent's canonical content with manual and conversational edits.
- Continuing this workflow into code implementation or automatic synchronization of an already published Issue: the requested journey ends at GitHub publication; use the retained result and GitHub link for the completed task.

## Architecture Decision Records

- [ADR-001: Create one reviewed GitHub Issue from each task](adrs/adr-001.md) — Use canonical agent content and explicit author approval for one repository-bound Issue.
- [ADR-002: Share task history while reserving changes to the author](adrs/adr-002.md) — Persist shared project history with author-only changes and publication.
- [ADR-003: Provide editable dictation on desktop and mobile](adrs/adr-003.md) — Require editable voice input, manual Send, and broad desktop/mobile coverage.
- [ADR-004: Ground generation in the selected project's GitHub repository](adrs/adr-004.md) — Bind evidence and real consultation activity to the authorized task repository.

## Open Questions

None remain for the product decisions in this PRD. The TechSpec must resolve the real integration gaps, GitHub authorization and attribution, transcription provider and retention, explicit input limits, durable operation recovery, source validation after edits, and reconciliation of ambiguous external publication outcomes.
