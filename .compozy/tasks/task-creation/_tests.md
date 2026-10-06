# Test Specification: Task Creation Through GitHub Publication

Canonical test contract for task-creation. Companion to `_techspec.md`; derived from `_user_stories.md` and the accepted ADRs. IDs are permanent once task files reference them. No behavior or browser compatibility is declared implemented by this document.

## Strategy

- Unit: existing Vitest in API/web, React Testing Library for components, fake only HTTP, clock, database and browser/media/process I/O boundaries. Pure rules and actual service orchestration remain real. Do not mock the behavior under test.
- Integration: real routers/controllers/services/Drizzle DAOs on disposable PostgreSQL; controlled HTTP GitHub/Groq/model endpoints; actual ffprobe and actual Dev_Control v1 handler/tools where relevant. Apply migrations from the current journal and isolate fixtures per case.
- E2E: independent Playwright UI journeys with accessible locators and pt-BR feedback. Deterministic feature-gate journeys use an authenticated sandbox server and controlled provider HTTP. Browser tests do not assert React internals, CSS classes or private functions.
- Tiers: task-required runs in its owning implementation task; feature-gate runs after dependent slices; qa-release includes real devices/providers, accessibility tours and scale.
- Commands: `pnpm --dir packages/api test`, `pnpm --dir apps/web test`, `pnpm --dir apps/web test:e2e`; required package gates are `pnpm lint`, `pnpm typecheck`, `pnpm build`. Add the documented `tasks:worker` script and a narrowly scoped Dev_Control v1 route/tool test script during implementation; sibling build/regression use its existing npm scripts.
- Missing credentials/database/device access make the relevant gate unavailable, never passed. Tests never target production. Use environment-provided sandbox credentials and cleanup created fixtures/artifacts.
- Table-driven API failure cases enumerate concrete procedures and inputs below; each variant has one expected failure reason. Reuse fixtures without hiding endpoint coverage behind a generic smoke test.

### Shared concrete fixtures

Use UUID v4 fixtures: P=`00000000-0000-4000-8000-000000000001`, P2 ends `000002`; T ends `000011`, U ends `000012`; A ends `000021`, B ends `000022`; R6/R7/R8 end `000036`/`000037`/`000038`; O ends `000041`, E ends `000051`, E2 ends `000052`, Q ends `000061`, K ends `000071`, C ends `000081`. When a case uses P/T symbols in an input, substitute these UUID strings; they are not arbitrary invalid identifiers. B is a member/reader or designated administrator as specified; T belongs to P/A/repository 202, U to P2/B/repository 303. A GitHub identity is 501, B is 502.

Repository 202 is `acme/cart`, node ID REPO202, default commit c1; its actual fixture SHA is 40 hexadecimal characters. D is the minimal valid canonical draft: title="Corrigir total", context="Ao remover item o total permanece antigo", objective="Recalcular total", all four optional collections empty. R7 is current at version=7. H7 is the actual renderer SHA-256 preview hash for R7/repository 202/current label/publisher 501, not a magic accepted hash. File F1 is retrieved `src/cart.ts` at c1, lines 8–12, including cited line 10. Controlled Issue #41 has real fixture ID/node ID, repository 202, publisher 501 and URL `https://github.com/acme/cart/issues/41`.

Every API case gets the state required by its procedure: awaiting clarification for replies, draft_ready/R7 for saves/preview/approval, failed O for retry, unresolved proposal O for resolution, uncertain Q for reconciliation. These are independent fixtures; no case depends on another running first. Use real authorization wiring with owned test session records. Assertions on row/HTTP counts prove observable persistence/side effects, not private implementation state.

## Coverage Matrix

### Stories, acceptance criteria and edge cases

| Source | Behavior | Task-required | Feature-gate | QA/release |
| --- | --- | --- | --- | --- |
| US-001 | Discover tasks in the selected project | IT-136, IT-137, IT-138, IT-139, UT-109, IT-141, IT-143 | IT-140, IT-142, E2E-004 | IT-144, E2E-027 |
| US-001.AC-1 | Given an authorized selected project, when I open its task workspace, then I see real saved tasks identifying their author, title, state, an… | IT-139 | E2E-004 | — |
| US-001.AC-2 | Given another member's task and my own repository access, when I open it, then I see its saved conversation, draft, sources, and result in a… | IT-139 | E2E-004 | — |
| US-001.AC-3 | Given no saved tasks, when I open the workspace, then I see an empty state and a “Nova intenção” action rather than demonstration conversati… | IT-137 | E2E-004 | — |
| US-001.AC-4 | Given tasks across multiple projects, when I switch projects or open a direct task link, then the task context stays bound to its actual pro… | IT-136, IT-139 | E2E-004, IT-142 | — |
| US-001.AC-5 | Given more history than the initial view holds, when I browse or narrow the list by task title or author, then every authorized matching tas… | IT-137, IT-138 | E2E-004 | IT-144 |
| US-001.EC-1 | Invalid input — A malformed task link or invalid search value | IT-136 | — | — |
| US-001.EC-2 | Empty / missing — A project has zero tasks or no matching title/author | IT-137 | — | — |
| US-001.EC-3 | Limits — A list page is full or retrieval is rate-limited | IT-138 | — | — |
| US-001.EC-4 | Permissions — Membership or personal repository access is missing | IT-139 | — | — |
| US-001.EC-5 | Concurrency — Another member creates a task while I browse | — | IT-140 | — |
| US-001.EC-6 | Interruption — Loading history loses connectivity | UT-109 | — | — |
| US-001.EC-7 | Repetition — Reopening or refreshing the list | IT-141 | — | — |
| US-001.EC-8 | Ordering — I deep-link to a task before selecting its project | — | IT-142 | — |
| US-001.EC-9 | State transitions — A draft becomes published while listed | IT-143 | — | — |
| US-001.EC-10 | Scale — History grows to 100 times typical volume | — | — | IT-144 |
| US-002 | Resume saved work | IT-145, IT-146, IT-147, IT-148, UT-110, IT-150, IT-152 | IT-149, IT-151, IT-153, E2E-005 | — |
| US-002.AC-1 | Given accepted messages, a pending clarification, or saved draft edits, when I refresh, return after sign-in, or reopen the task after a ser… | IT-152 | E2E-005, IT-149, IT-153 | — |
| US-002.AC-2 | Given an edit is being saved, when I inspect its status, then I can distinguish saving, saved, and failed; an unsaved change is not presente… | UT-110 | E2E-005 | — |
| US-002.AC-3 | Given generation or publication was interrupted, when I reopen the task, then I see its actual pending, failed, uncertain, or completed stat… | IT-150, IT-152 | E2E-005, IT-151 | — |
| US-002.AC-4 | Given a reader opens saved work, when the state is restored, then the reader retains read-only access and sees the original author. | IT-148 | E2E-005 | — |
| US-002.EC-1 | Invalid input — Stored content cannot be rendered safely | IT-145 | — | — |
| US-002.EC-2 | Empty / missing — A “Nova intenção” has no accepted message | IT-146 | — | — |
| US-002.EC-3 | Limits — A long conversation exceeds one visible page | IT-147 | — | — |
| US-002.EC-4 | Permissions — Access was revoked while away | IT-148 | — | — |
| US-002.EC-5 | Concurrency — Another tab saved a later revision | — | IT-149 | — |
| US-002.EC-6 | Interruption — Refresh occurs before a browser-only input was saved | UT-110 | — | — |
| US-002.EC-7 | Repetition — Repeated resumption of an interrupted task | IT-150 | — | — |
| US-002.EC-8 | Ordering — A delayed older response arrives after restoration | — | IT-151 | — |
| US-002.EC-9 | State transitions — A formerly publishing task has a confirmed Issue | IT-152 | — | — |
| US-002.EC-10 | Scale — The task has many revisions and messages | — | IT-153 | — |
| US-003 | Submit typed messages reliably | IT-154, IT-155, IT-156, IT-157, IT-160, IT-162 | IT-158, IT-159, IT-161, IT-163, E2E-006 | — |
| US-003.AC-1 | Given a nonblank intention in a new task input, when I select Send, then one accepted message creates one saved task attributed to me and st… | IT-160 | E2E-006, IT-158 | — |
| US-003.AC-2 | Given an existing task awaiting clarification or ready for refinement, when I submit a message, then it continues that task rather than crea… | — | E2E-006, IT-161, IT-163 | — |
| US-003.AC-3 | Given a request has not been confirmed, when submission fails or remains uncertain, then I see that status and can recover my text without a… | IT-160 | E2E-006, IT-159 | — |
| US-003.AC-4 | Given generation or publication is active, when I use Send, then the task cannot start a conflicting authoring operation. | — | E2E-006, IT-161 | — |
| US-003.AC-5 | Given text exceeds a supported submission limit, when I try to submit it, then I receive an explicit validation message and keep the full ed… | IT-156 | E2E-006 | — |
| US-003.EC-1 | Invalid input — Text contains hostile instructions, code, or markup | IT-154 | — | — |
| US-003.EC-2 | Empty / missing — Input contains only whitespace | IT-155 | — | — |
| US-003.EC-3 | Limits — Message or conversation limits would be exceeded | IT-156 | — | — |
| US-003.EC-4 | Permissions — A reader or expired session submits directly | IT-157 | — | — |
| US-003.EC-5 | Concurrency — Double-click Send or submit from two tabs | — | IT-158 | — |
| US-003.EC-6 | Interruption — The connection drops after submission | — | IT-159 | — |
| US-003.EC-7 | Repetition — Retry the same confirmed submission | IT-160 | — | — |
| US-003.EC-8 | Ordering — A clarification reply arrives before an earlier send settles | — | IT-161 | — |
| US-003.EC-9 | State transitions — Submit to a published task | IT-162 | — | — |
| US-003.EC-10 | Scale — A task has a long conversation | — | IT-163 | — |
| US-004 | Control microphone capture explicitly | UT-111, UT-112, UT-113, UT-114, UT-115, UT-116, UT-117, UT-118, UT-119, UT-120 | E2E-007 | E2E-020, E2E-021, E2E-022 |
| US-004.AC-1 | Given I have not started dictation, when the input appears, then the microphone is idle and capture has not begun. | UT-115 | E2E-007 | — |
| US-004.AC-2 | Given I select the microphone, when permission is needed, then the application requests it and explains any remote processing before first c… | UT-114 | E2E-007 | — |
| US-004.AC-3 | Given capture is active, when I inspect the input, then I see a visible and accessible listening state plus Stop and Cancel actions. | UT-115 | E2E-007 | — |
| US-004.AC-4 | Given I select Stop, when recognition finishes, then capture ends and the completed text remains available for review; selecting Cancel inst… | UT-117, UT-118 | E2E-007 | — |
| US-004.AC-5 | Given permission, capture hardware, and connectivity are available, when I dictate in current desktop Chrome, Edge, Firefox, or Safari, Andr… | — | — | E2E-020 |
| US-004.AC-6 | Given capture cannot start or complete, when it fails, then I see actionable feedback and can continue typing with my pre-existing input int… | UT-111, UT-112, UT-114 | E2E-007 | — |
| US-004.EC-1 | Invalid input — The selected capture device fails or produces unusable audio | UT-111 | — | — |
| US-004.EC-2 | Empty / missing — No microphone exists or speech is absent | UT-112 | — | — |
| US-004.EC-3 | Limits — Capture reaches an operational limit | UT-113 | — | — |
| US-004.EC-4 | Permissions — Browser microphone consent is denied or task-author permission is missing | UT-114 | — | — |
| US-004.EC-5 | Concurrency — Start is selected twice while permission or capture is pending | UT-115 | — | — |
| US-004.EC-6 | Interruption — Navigation, project/task switching, sign-out, background interruption, or access loss interrupts cap | UT-116 | — | — |
| US-004.EC-7 | Repetition — Stop or Cancel is selected repeatedly | UT-117 | — | — |
| US-004.EC-8 | Ordering — Cancel occurs while recognition results are still arriving | UT-118 | — | — |
| US-004.EC-9 | State transitions — Generation or publication starts, or the task is already published | UT-119 | — | — |
| US-004.EC-10 | Scale — Many tasks exist or dictation is used repeatedly | UT-120 | — | — |
| US-005 | Review dictated text before Send | UT-121, UT-122, UT-123, UT-124, UT-125, UT-126, UT-127, UT-128, UT-129, UT-130 | E2E-008 | E2E-020, E2E-021, E2E-022 |
| US-005.AC-1 | Given I dictate in the message input, when speech is recognized, then I see text in that input using pt-BR by default. | — | E2E-008 | E2E-022 |
| US-005.AC-2 | Given I typed text before starting dictation, when recognized text arrives, then the typed text is preserved and speech extends it without d… | UT-125, UT-127 | E2E-008 | — |
| US-005.AC-3 | Given dictation has stopped and final text is ready, when I correct names, code terms, or wording, then the editable text reflects my change… | UT-121 | E2E-008 | — |
| US-005.AC-4 | Given speech ends or capture stops, when transcription completes, then no message is sent and no Issue is published until I use the correspo… | UT-128, UT-129 | E2E-008 | — |
| US-005.AC-5 | Given an initial intention, a clarification answer, or a refinement request, when I choose dictation, then each uses the same review-and-Sen… | UT-127 | E2E-008 | — |
| US-005.AC-6 | Given a transcript is submitted, when I reopen history, then I see the accepted text rather than a raw audio attachment; raw audio is absent… | UT-129 | E2E-008 | E2E-023 |
| US-005.EC-1 | Invalid input — Recognition produces incorrect words or punctuation | UT-121 | — | — |
| US-005.EC-2 | Empty / missing — No usable transcript is produced | UT-122 | — | — |
| US-005.EC-3 | Limits — Recognized text exceeds the message limit | UT-123 | — | — |
| US-005.EC-4 | Permissions — Permission is withdrawn mid-dictation | UT-124 | — | — |
| US-005.EC-5 | Concurrency — I edit already finalized dictated text while additional results arrive | UT-125 | — | — |
| US-005.EC-6 | Interruption — Transcription fails after a partial result | UT-126 | — | — |
| US-005.EC-7 | Repetition — I dictate again into the same unsent input | UT-127 | — | — |
| US-005.EC-8 | Ordering — I attempt Send while capture or final recognition remains active | UT-128 | — | — |
| US-005.EC-9 | State transitions — I cancel, switch tasks, or open a published task | UT-129 | — | — |
| US-005.EC-10 | Scale — A long dictated intention includes many technical terms | UT-130 | — | — |
| US-006 | Clarify only an unidentifiable task | IT-164, IT-165, IT-166, IT-167, IT-170, IT-172 | IT-168, IT-169, IT-171, IT-173, E2E-009 | — |
| US-006.AC-1 | Given an intention such as “Corrigir pedido.” without an identifiable problem, when the agent responds, then I receive one minimal question … | IT-164 | E2E-009 | — |
| US-006.AC-2 | Given a specific identifiable request, when the agent responds, then missing optional product decisions do not force a clarification step be… | — | E2E-009, E2E-010 | — |
| US-006.AC-3 | Given an outstanding question, when I respond by typing or editable dictation, then the answer is saved in the same task and generation resu… | IT-170 | E2E-009, IT-169 | — |
| US-006.AC-4 | Given the answer still does not identify the requested work, when the agent responds, then it asks the next necessary concise question witho… | — | E2E-009, IT-173 | — |
| US-006.EC-1 | Invalid input — The reply is malformed or tries to authorize unrelated actions | IT-164 | — | — |
| US-006.EC-2 | Empty / missing — A blank reply is submitted | IT-165 | — | — |
| US-006.EC-3 | Limits — Repeated clarification reaches an integration limit | IT-166 | — | — |
| US-006.EC-4 | Permissions — A reader answers another author's question | IT-167 | — | — |
| US-006.EC-5 | Concurrency — Two tabs answer the same outstanding question | — | IT-168 | — |
| US-006.EC-6 | Interruption — I leave while a question is awaiting an answer | — | IT-169 | — |
| US-006.EC-7 | Repetition — A confirmed answer is retried | IT-170 | — | — |
| US-006.EC-8 | Ordering — An answer targets a question superseded by a later draft | — | IT-171 | — |
| US-006.EC-9 | State transitions — Refinement requires clarification while an earlier draft exists | IT-172 | — | — |
| US-006.EC-10 | Scale — Many prior messages exist | — | IT-173 | — |
| US-007 | Generate a faithful Issue draft | UT-131 | IT-174, IT-175, IT-176, IT-177, IT-178, IT-179, IT-180, IT-181, IT-182, E2E-010 | E2E-027 |
| US-007.AC-1 | Given an identifiable intention, when generation succeeds, then I receive title, context, objective, constraints, relevant context with sour… | — | E2E-010, IT-175 | — |
| US-007.AC-2 | Given optional content is unsupported, when the draft is returned, then optional collections are empty and no generic criteria, urgency, lab… | — | E2E-010, IT-174 | — |
| US-007.AC-3 | Given code context is helpful, when files are consulted, then they belong to the task's GitHub repository and current author access; Dev_Con… | UT-131 | E2E-010, IT-181 | — |
| US-007.AC-4 | Given the request refers to existing work, duplicates, or repository history, when GitHub Issues are consulted, then the consultation is con… | — | E2E-010, IT-182 | — |
| US-007.AC-5 | Given no optional lookup is necessary or requested evidence is temporarily unavailable, when the task remains identifiable, then the agent c… | — | E2E-010, IT-175 | — |
| US-007.AC-6 | Given the agent fails or returns an invalid result, when generation ends, then I see a recoverable error, retain confirmed input and any pri… | — | E2E-010, IT-174, IT-179 | — |
| US-007.EC-1 | Invalid input — Repository content contains hostile instructions or the agent returns an invalid draft | — | IT-174 | — |
| US-007.EC-2 | Empty / missing — No relevant files or Issues are found | — | IT-175 | — |
| US-007.EC-3 | Limits — Provider, lookup, or conversation limits are reached | — | IT-176 | — |
| US-007.EC-4 | Permissions — The author loses project or repository access during generation | — | IT-177 | — |
| US-007.EC-5 | Concurrency — A later revision or operation supersedes an older generation result | — | IT-178 | — |
| US-007.EC-6 | Interruption — The agent becomes unavailable or a request disconnects | — | IT-179 | — |
| US-007.EC-7 | Repetition — A confirmed successful generation is replayed | — | IT-180 | — |
| US-007.EC-8 | Ordering — The author switches projects before the response arrives | UT-131 | — | — |
| US-007.EC-9 | State transitions — The repository is renamed, transferred, or archived but remains readable | — | IT-181 | — |
| US-007.EC-10 | Scale — The repository is large | — | IT-182 | — |
| US-008 | Inspect real sources and consultation activity | IT-183, UT-132, UT-133, IT-184, UT-134, IT-186, IT-188 | IT-185, IT-187, IT-189, E2E-011 | — |
| US-008.AC-1 | Given project evidence appears in the draft, when I inspect it, then I see exact retrieved paths and available line information bound to the… | IT-183, IT-188 | E2E-011 | — |
| US-008.AC-2 | Given a GitHub Issue is cited, when I inspect or open the reference, then its actual repository, Issue number, and URL are shown. | IT-183 | E2E-011 | — |
| US-008.AC-3 | Given tools were used, when I view consultation activity, then I see genuine targets and outcomes, with empty results distinct from failed r… | IT-186 | E2E-011, IT-187 | — |
| US-008.AC-4 | Given generation required no tool use, when I review the conversation, then no invented consultation rows or references appear. | UT-132 | E2E-011 | — |
| US-008.AC-5 | Given a source-derived claim is manually changed, when I inspect the updated draft, then unsupported edited wording is not falsely presented… | IT-188 | E2E-011, IT-185 | — |
| US-008.EC-1 | Invalid input — A reference points outside the allowed repository or contains an unsafe URL | IT-183 | — | — |
| US-008.EC-2 | Empty / missing — Reference lists are empty | UT-132 | — | — |
| US-008.EC-3 | Limits — Activity or source lists exceed the initial viewport | UT-133 | — | — |
| US-008.EC-4 | Permissions — A viewer lacks personal repository access | IT-184 | — | — |
| US-008.EC-5 | Concurrency — A newer draft changes its references | — | IT-185 | — |
| US-008.EC-6 | Interruption — Opening a source fails due to network or remote unavailability | UT-134 | — | — |
| US-008.EC-7 | Repetition — Reopen a saved source trail | IT-186 | — | — |
| US-008.EC-8 | Ordering — Tool results arrive after their task is no longer active | — | IT-187 | — |
| US-008.EC-9 | State transitions — A cited file or Issue changes or disappears later | IT-188 | — | — |
| US-008.EC-10 | Scale — Many genuine tool results exist | — | IT-189 | — |
| US-009 | Edit and save the canonical draft | IT-190, IT-191, IT-192, IT-193, UT-135, IT-195, UT-136, IT-196, UT-137 | IT-194, E2E-012 | — |
| US-009.AC-1 | Given a draft ready for review, when I edit its canonical content, then I can change title, context, objective, constraints, relevant contex… | IT-190, UT-137 | E2E-012 | — |
| US-009.AC-2 | Given I finish an edit, when saving succeeds, then the updated draft becomes the current confirmed revision and authorized readers see it on… | IT-195 | E2E-012, IT-194 | — |
| US-009.AC-3 | Given title, context, or objective is blank or considerations exceed three entries, when I try to approve publication, then field-specific v… | IT-190 | E2E-012 | — |
| US-009.AC-4 | Given the current draft, when I inspect the publication preview, then I see the exact proposed title and Markdown body with optional empty s… | IT-191 | E2E-012 | — |
| US-009.AC-5 | Given saving fails or a conflicting newer revision exists, when I try to continue, then I see the problem and retain my recoverable edits; t… | UT-135 | E2E-012, IT-194 | — |
| US-009.EC-1 | Invalid input — Content or source references are invalid or unsafe | IT-190 | — | — |
| US-009.EC-2 | Empty / missing — Optional collections are empty | IT-191 | — | — |
| US-009.EC-3 | Limits — A field or body exceeds a supported limit | IT-192 | — | — |
| US-009.EC-4 | Permissions — A reader or administrator who is not the author edits directly | IT-193 | — | — |
| US-009.EC-5 | Concurrency — Two author tabs save conflicting revisions | — | IT-194 | — |
| US-009.EC-6 | Interruption — Connectivity fails while saving | UT-135 | — | — |
| US-009.EC-7 | Repetition — A confirmed save is retried | IT-195 | — | — |
| US-009.EC-8 | Ordering — Publish is selected before saving settles | UT-136 | — | — |
| US-009.EC-9 | State transitions — Generation, publishing, uncertain publication, or a published result is active | IT-196 | — | — |
| US-009.EC-10 | Scale — A draft includes many constraints or references | UT-137 | — | — |
| US-010 | Refine the current draft through conversation | IT-197, IT-198, IT-199, IT-200, IT-203, IT-205 | IT-201, IT-202, IT-204, IT-206, E2E-013 | — |
| US-010.AC-1 | Given a saved author-edited draft, when I send a refinement request by text or dictation, then the agent receives the relevant conversation … | IT-199 | E2E-013, IT-206 | — |
| US-010.AC-2 | Given a focused change request, when refinement succeeds, then the new draft implements that request while retaining unrelated author change… | — | E2E-013, IT-201, IT-206 | — |
| US-010.AC-3 | Given refinement cannot identify the requested change, when the agent responds, then I receive a minimal clarification and retain the previo… | — | E2E-013, IT-202 | — |
| US-010.AC-4 | Given refinement fails or conflicts with newer edits, when its result is received, then previous confirmed work remains recoverable and conf… | — | E2E-013, IT-201, IT-202 | — |
| US-010.EC-1 | Invalid input — The refinement asks for unsupported or unauthorized actions | IT-197 | — | — |
| US-010.EC-2 | Empty / missing — The request is blank or no draft exists | IT-198 | — | — |
| US-010.EC-3 | Limits — Current content and history exceed agent input capacity | IT-199 | — | — |
| US-010.EC-4 | Permissions — Someone other than the author asks for refinement | IT-200 | — | — |
| US-010.EC-5 | Concurrency — An older refinement response conflicts with a newer revision | — | IT-201 | — |
| US-010.EC-6 | Interruption — Refinement times out or disconnects | — | IT-202 | — |
| US-010.EC-7 | Repetition — A confirmed refinement request is retried | IT-203 | — | — |
| US-010.EC-8 | Ordering — A refinement is submitted while a save or prior generation is unfinished | — | IT-204 | — |
| US-010.EC-9 | State transitions — The task is publishing, publication-uncertain, or published | IT-205 | — | — |
| US-010.EC-10 | Scale — The task has many earlier refinements | — | IT-206 | — |
| US-011 | Approve and publish the reviewed revision | IT-207, IT-208, IT-209, IT-210, IT-213, IT-215 | IT-211, IT-212, IT-214, IT-216, E2E-014 | — |
| US-011.AC-1 | Given a saved valid current draft and permission to create an Issue, when I inspect review, then I see the proposed title/body, target repos… | IT-207, IT-208 | E2E-014 | — |
| US-011.AC-2 | Given I select “Criar Issue”, when publication executes, then it uses that reviewed revision and the task's stable repository identity under… | IT-210 | E2E-014, IT-216 | — |
| US-011.AC-3 | Given the revision or destination no longer matches review, when publication would execute, then it stops and requires a fresh review instea… | IT-215 | E2E-014, IT-214 | — |
| US-011.AC-4 | Given publication is active, when I view the task, then its state is visibly publishing and conflicting edits, generation, microphone captur… | — | E2E-014, IT-211, IT-214 | — |
| US-011.AC-5 | Given GitHub confirms creation, when Flow Dev records the result, then I see the actual Issue number and URL and the task retains the approv… | IT-213 | E2E-014 | — |
| US-011.AC-6 | Given no explicit publication action occurred, when I dictate, stop capture, send messages, finish generation, save edits, or recover author… | — | E2E-014, E2E-008, E2E-018 | — |
| US-011.EC-1 | Invalid input — The draft violates required fields or provider content rules | IT-207 | — | — |
| US-011.EC-2 | Empty / missing — No valid saved draft or repository binding exists | IT-208 | — | — |
| US-011.EC-3 | Limits — GitHub rejects content size or rate-limits creation | IT-209 | — | — |
| US-011.EC-4 | Permissions — The caller is not the author, lost project access, or lacks Issue creation authorization | IT-210 | — | — |
| US-011.EC-5 | Concurrency — Double-click or two tabs approve the same revision | — | IT-211 | — |
| US-011.EC-6 | Interruption — Creation was sent but the response was lost | — | IT-212 | — |
| US-011.EC-7 | Repetition — Approve again after confirmed success | IT-213 | — | — |
| US-011.EC-8 | Ordering — Approval is attempted during a save, clarification, or generation | — | IT-214 | — |
| US-011.EC-9 | State transitions — The repository becomes archived, disables Issues, is deleted, or changes access before creation | IT-215 | — | — |
| US-011.EC-10 | Scale — Several tasks are published independently | — | IT-216 | — |
| US-012 | Recover rejected or uncertain publication | — | IT-217, IT-218, IT-219, IT-220, IT-221, IT-222, IT-223, IT-224, IT-225, IT-226, E2E-015 | — |
| US-012.AC-1 | Given GitHub confirms rejection without creation, when the attempt ends, then the saved draft returns to review with a specific reason and r… | — | E2E-015, IT-224, IT-098 | — |
| US-012.AC-2 | Given creation may have succeeded but its result is unknown, when I open the task, then I see “Verificando publicação” and a new creation re… | — | E2E-015, IT-218, IT-219, IT-220 | — |
| US-012.AC-3 | Given reconciliation confirms the Issue exists, when it finishes, then the task becomes published with that actual Issue link and snapshot w… | — | E2E-015, IT-223, IT-224 | — |
| US-012.AC-4 | Given reconciliation establishes noncreation, when I return to review, then I can explicitly approve a new attempt; no retry publishes autom… | — | E2E-015, IT-224, IT-098 | — |
| US-012.AC-5 | Given reconciliation cannot establish the outcome, when I view recovery, then the uncertainty remains visible, publication remains blocked f… | — | E2E-015, IT-217, IT-218, IT-226 | — |
| US-012.EC-1 | Invalid input — A proposed recovery reference is malformed or belongs to another repository/attempt | — | IT-217 | — |
| US-012.EC-2 | Empty / missing — No conclusive matching result is available | — | IT-218 | — |
| US-012.EC-3 | Limits — GitHub throttles reconciliation | — | IT-219 | — |
| US-012.EC-4 | Permissions — Author or GitHub access expires during verification | — | IT-220 | — |
| US-012.EC-5 | Concurrency — Two tabs or recovery processes inspect the same attempt | — | IT-221 | — |
| US-012.EC-6 | Interruption — A restart occurs after GitHub creates the Issue but before the link is saved | — | IT-222 | — |
| US-012.EC-7 | Repetition — Recovery is repeated after a result is confirmed | — | IT-223 | — |
| US-012.EC-8 | Ordering — A late creation response arrives after reconciliation began | — | IT-224 | — |
| US-012.EC-9 | State transitions — A verified created Issue has already been closed or edited in GitHub | — | IT-225 | — |
| US-012.EC-10 | Scale — Multiple tasks have uncertain attempts | — | IT-226 | — |
| US-013 | Consult the published result | IT-227, IT-228, IT-229, IT-230, UT-138, IT-232, IT-234 | IT-231, IT-233, IT-235, E2E-016 | — |
| US-013.AC-1 | Given publication succeeded, when I open the task, then I see the real repository, Issue number, GitHub URL, publisher, publication time, an… | — | E2E-016, IT-235 | — |
| US-013.AC-2 | Given I select “Abrir no GitHub”, when the destination opens, then it is the linked Issue rather than the GitHub homepage or a demonstration… | IT-227 | E2E-016 | — |
| US-013.AC-3 | Given a published task, when I inspect authoring controls, then further draft edits, refinements, and creation are unavailable; I can start … | UT-138 | E2E-016 | — |
| US-013.AC-4 | Given the Issue changes externally, when I revisit Flow Dev, then the retained content remains labeled as the publication snapshot and does … | IT-234 | E2E-016 | — |
| US-013.EC-1 | Invalid input — A stored publication URL is invalid or inconsistent with the linked repository | IT-227 | — | — |
| US-013.EC-2 | Empty / missing — An actual Issue identity or link is not confirmed | IT-228 | — | — |
| US-013.EC-3 | Limits — GitHub is rate-limited or unreachable | IT-229 | — | — |
| US-013.EC-4 | Permissions — Flow Dev or personal repository access is lost | IT-230 | — | — |
| US-013.EC-5 | Concurrency — A second tab learns publication succeeded | UT-138 | — | — |
| US-013.EC-6 | Interruption — Navigating back from GitHub or reconnecting after a restart | — | IT-231 | — |
| US-013.EC-7 | Repetition — Open the result or link repeatedly | IT-232 | — | — |
| US-013.EC-8 | Ordering — A direct result link is opened before project entry | — | IT-233 | — |
| US-013.EC-9 | State transitions — The Issue is closed, deleted, or transferred externally | IT-234 | — | — |
| US-013.EC-10 | Scale — Many tasks have published results | — | IT-235 | — |
| US-014 | Enforce project, repository, and author boundaries | UT-139 | IT-236, IT-237, IT-238, IT-239, IT-240, IT-241, IT-242, IT-243, IT-244, E2E-017 | — |
| US-014.AC-1 | Given I am a member with my own repository access, when I open another author's task, then I can view saved content but cannot send messages… | — | E2E-017, IT-242 | — |
| US-014.AC-2 | Given I am the task's author with current required permissions, when I perform a protected action, then authorship is checked together with … | — | E2E-017, IT-241 | — |
| US-014.AC-3 | Given I am an administrator, when I consult projects, then my existing project-wide visibility applies, but another person's task remains re… | — | E2E-017, IT-242 | — |
| US-014.AC-4 | Given access is removed while a task is open, when the next protected action occurs, then it is rejected, active capture ends, and the view … | UT-139 | E2E-017, IT-240 | — |
| US-014.AC-5 | Given project, repository, author, or source identifiers are altered in a direct request, when it is processed, then it cannot access or mut… | — | E2E-017, IT-236 | — |
| US-014.EC-1 | Invalid input — A task/project identifier or claimed author is forged | — | IT-236 | — |
| US-014.EC-2 | Empty / missing — No authenticated user or authorized project exists | — | IT-237 | — |
| US-014.EC-3 | Limits — An access check cannot complete because its provider is limited or unavailable | — | IT-238 | — |
| US-014.EC-4 | Permissions — GitHub access exists without Flow Dev assignment, or assignment exists without personal GitHub acces | — | IT-239 | — |
| US-014.EC-5 | Concurrency — Assignment is removed while generation or publication is being authorized | — | IT-240 | — |
| US-014.EC-6 | Interruption — Session expiry occurs during dictation or saving | UT-139 | — | — |
| US-014.EC-7 | Repetition — A formerly authorized request is replayed after revocation | — | IT-241 | — |
| US-014.EC-8 | Ordering — A viewer uses an edit/publication deep link without visiting the reader screen | — | IT-242 | — |
| US-014.EC-9 | State transitions — The author loses membership while other members retain it | — | IT-243 | — |
| US-014.EC-10 | Scale — Many projects and shared tasks exist | — | IT-244 | — |
| US-015 | Recover GitHub authorization | — | IT-245, IT-246, IT-247, IT-248, IT-249, IT-250, IT-251, IT-252, IT-253, IT-254, E2E-018 | E2E-023, E2E-024 |
| US-015.AC-1 | Given identity sign-in has not granted repository access, when I attempt repository-dependent work, then I see that repository authorization… | — | E2E-018, IT-246 | — |
| US-015.AC-2 | Given I authorize access and return, when permissions are verified, then I resume the same saved task and repository without automatic gener… | — | E2E-018, IT-249, IT-251 | — |
| US-015.AC-3 | Given consent is denied, organization approval is needed, Issue creation permission is insufficient, or GitHub is temporarily unavailable, w… | — | E2E-018, IT-247, IT-248, IT-250 | — |
| US-015.AC-4 | Given the repository is archived, missing, or has Issues disabled, when publication is evaluated, then I see that specific destination probl… | — | E2E-018, IT-253 | — |
| US-015.EC-1 | Invalid input — An authorization return destination is malformed or points outside permitted Flow Dev routes | — | IT-245 | — |
| US-015.EC-2 | Empty / missing — Repository authorization is absent | — | IT-246 | — |
| US-015.EC-3 | Limits — GitHub authorization or permission lookup is rate-limited | — | IT-247 | — |
| US-015.EC-4 | Permissions — A different GitHub identity grants access or organizational restrictions persist | — | IT-248 | — |
| US-015.EC-5 | Concurrency — Authorization is completed in another tab | — | IT-249 | — |
| US-015.EC-6 | Interruption — The redirect or authorization flow is canceled | — | IT-250 | — |
| US-015.EC-7 | Repetition — Return from authorization repeatedly | — | IT-251 | — |
| US-015.EC-8 | Ordering — Permission recovery finishes after the user switched tasks/projects | — | IT-252 | — |
| US-015.EC-9 | State transitions — Repository rename/transfer preserves its stable identity | — | IT-253 | — |
| US-015.EC-10 | Scale — The user can access many repositories | — | IT-254 | — |
| US-016 | Use accessible authoring and shared viewing | UT-140, UT-141, UT-142, UT-143, UT-144, UT-145, UT-146 | E2E-019 | E2E-001, E2E-002, E2E-003, E2E-025 |
| US-016.AC-1 | Given keyboard or screen-reader interaction, when I navigate the task history, conversation, draft, sources, and actions, then controls have… | UT-142, UT-145 | E2E-019 | E2E-025 |
| US-016.AC-2 | Given a phone and its on-screen keyboard, when I type, dictate, review, or inspect sources, then the input and capture controls remain reach… | — | E2E-019 | E2E-001, E2E-002, E2E-003, E2E-025 |
| US-016.AC-3 | Given capture, generation, saving, publication, failure, or uncertain verification, when the state changes, then its meaning is visible and … | UT-144, UT-146 | E2E-019 | E2E-025 |
| US-016.AC-4 | Given reduced-motion preferences or no microphone permission, when I use the feature, then motion is reduced and the complete task-authoring… | — | E2E-019 | E2E-001, E2E-025 |
| US-016.AC-5 | Given I view another author's task, when responsive layout changes, then its read-only status and author attribution remain clear and no mut… | UT-142, UT-143 | E2E-019 | E2E-025 |
| US-016.EC-1 | Invalid input — Validation fails in a draft or input | UT-140 | — | — |
| US-016.EC-2 | Empty / missing — Empty history, no evidence, or no draft exists | UT-141 | — | — |
| US-016.EC-3 | Limits — Large text, browser zoom, or a narrow viewport expands content | — | — | E2E-001 |
| US-016.EC-4 | Permissions — A viewer cannot use an action | UT-142 | — | — |
| US-016.EC-5 | Concurrency — Background state updates occur while a user reads or edits | UT-143 | — | — |
| US-016.EC-6 | Interruption — Mobile keyboard dismissal, orientation change, or temporary connection loss occurs | — | — | E2E-002 |
| US-016.EC-7 | Repetition — Repeated status updates occur | UT-144 | — | — |
| US-016.EC-8 | Ordering — A user navigates from a source panel back to review | UT-145 | — | — |
| US-016.EC-9 | State transitions — Draft review becomes publishing or published | UT-146 | — | — |
| US-016.EC-10 | Scale — Long histories and source lists are viewed on mobile or with assistive technology | — | — | E2E-003 |

### Components and interfaces

| Source | Behavior | Task-required | Feature-gate | QA/release |
| --- | --- | --- | --- | --- |
| Tasks transport / schemas | Happy and error contracts; boundary/state cases where listed | UT-001, UT-002, UT-071, UT-072 | IT-084, IT-085, IT-086, IT-087, IT-088, IT-089, IT-090, IT-091 | — |
| TasksController / DTO mapper | Happy and error contracts; boundary/state cases where listed | UT-003, UT-004, UT-102 | — | — |
| TaskAccessService | Happy and error contracts; boundary/state cases where listed | UT-005, UT-006 | — | — |
| TaskLifecycleService | Happy and error contracts; boundary/state cases where listed | UT-007, UT-008, UT-090, UT-091 | — | — |
| TaskDao | Happy and error contracts; boundary/state cases where listed | UT-009, UT-010 | IT-084, IT-085, IT-086, IT-087, IT-088, IT-089, IT-090, IT-091 | — |
| TaskOperationDao | Happy and error contracts; boundary/state cases where listed | UT-011, UT-012 | IT-084, IT-085, IT-086, IT-087, IT-088, IT-089, IT-090, IT-091, IT-092, IT-093, IT-094, IT-095, IT-096, IT-097, IT-098, IT-099, IT-100, IT-101 | — |
| GenerationService | Happy and error contracts; boundary/state cases where listed | UT-013, UT-014, UT-073, UT-074, UT-089 | IT-092, IT-093, IT-094, IT-095, IT-096, IT-097, IT-098, IT-099, IT-100, IT-101 | — |
| IssueAuthorGateway / Dev_Control HTTP adapter | Happy and error contracts; boundary/state cases where listed | UT-015, UT-016 | IT-102, IT-103, IT-104, IT-105, IT-106, IT-107, IT-108, IT-109, IT-110, IT-111, IT-112, IT-113 | — |
| IssueContextController / IssueContextService | Happy and error contracts; boundary/state cases where listed | UT-017, UT-018, UT-097 | IT-102, IT-103, IT-104, IT-105, IT-106, IT-107, IT-108, IT-109, IT-110, IT-111, IT-112, IT-113 | — |
| GitHubContextGateway / scoped tools | Happy and error contracts; boundary/state cases where listed | UT-019, UT-020, UT-098, UT-099, UT-100 | IT-102, IT-103, IT-104, IT-105, IT-106, IT-107, IT-108, IT-109, IT-110, IT-111, IT-112, IT-113 | — |
| DraftRules | Happy and error contracts; boundary/state cases where listed | UT-021, UT-022, UT-075, UT-076, UT-077, UT-078 | — | — |
| DraftRenderer | Happy and error contracts; boundary/state cases where listed | UT-023, UT-024 | — | — |
| DraftMerge / refinement review | Happy and error contracts; boundary/state cases where listed | UT-025, UT-026 | — | — |
| SourceRules / evidence bindings | Happy and error contracts; boundary/state cases where listed | UT-027, UT-028, UT-079, UT-080, UT-081 | IT-102, IT-103, IT-104, IT-105, IT-106, IT-107, IT-108, IT-109, IT-110, IT-111, IT-112, IT-113 | — |
| PublicationController / PublicationService | Happy and error contracts; boundary/state cases where listed | UT-029, UT-030, UT-108 | IT-092, IT-093, IT-094, IT-095, IT-096, IT-097, IT-098, IT-099, IT-100, IT-101 | — |
| PublicationRecoveryService | Happy and error contracts; boundary/state cases where listed | UT-031, UT-032 | IT-092, IT-093, IT-094, IT-095, IT-096, IT-097, IT-098, IT-099, IT-100, IT-101 | — |
| GitHubIssueGateway | Happy and error contracts; boundary/state cases where listed | UT-033, UT-034, UT-082, UT-083, UT-084, UT-085, UT-086, UT-087, UT-088 | — | — |
| TaskWorkerController / worker CLI | Happy and error contracts; boundary/state cases where listed | UT-035, UT-036 | IT-092, IT-093, IT-094, IT-095, IT-096, IT-097, IT-098, IT-099, IT-100, IT-101 | — |
| TranscriptionController / preflight | Happy and error contracts; boundary/state cases where listed | UT-037, UT-038 | IT-120, IT-121, IT-122, IT-123, IT-124, IT-125, IT-126 | — |
| TranscriptionGateway / Groq adapter | Happy and error contracts; boundary/state cases where listed | UT-039, UT-040, UT-095, UT-096, UT-107 | IT-120, IT-121, IT-122, IT-123, IT-124, IT-125, IT-126 | — |
| AudioValidator | Happy and error contracts; boundary/state cases where listed | UT-041, UT-042, UT-092, UT-093, UT-094 | IT-120, IT-121, IT-122, IT-123, IT-124, IT-125, IT-126 | — |
| Repository authorization refresh extension | Happy and error contracts; boundary/state cases where listed | UT-043, UT-044 | IT-114, IT-115, IT-116, IT-117, IT-118, IT-119 | — |
| Production composition / server exports | Happy and error contracts; boundary/state cases where listed | UT-045, UT-046 | — | — |
| Workspace data hooks / loader | Happy and error contracts; boundary/state cases where listed | UT-047, UT-048 | — | — |
| Task history / SessionRail | Happy and error contracts; boundary/state cases where listed | UT-049, UT-050, UT-101 | — | — |
| Task actions / confirmed input | Happy and error contracts; boundary/state cases where listed | UT-051, UT-052 | — | — |
| Canonical editor / DraftFooter | Happy and error contracts; boundary/state cases where listed | UT-053, UT-054, UT-104 | — | — |
| SourcesPanel / ToolRun / safe display | Happy and error contracts; boundary/state cases where listed | UT-055, UT-056 | — | — |
| DictationState / useDictation / controls | Happy and error contracts; boundary/state cases where listed | UT-057, UT-058, UT-103 | — | — |
| Navigation / session and OAuth destinations | Happy and error contracts; boundary/state cases where listed | UT-059, UT-060 | — | — |
| Access propagation / reader workspace | Happy and error contracts; boundary/state cases where listed | UT-061, UT-062 | — | — |
| Dev_Control v1 route / canonical parser | Happy and error contracts; boundary/state cases where listed | UT-063, UT-064, UT-105, UT-106 | — | — |
| Dev_Control RequestContext / broker tool client | Happy and error contracts; boundary/state cases where listed | UT-065, UT-066 | IT-102, IT-103, IT-104, IT-105, IT-106, IT-107, IT-108, IT-109, IT-110, IT-111, IT-112, IT-113 | — |
| Task schema / immutable records | Happy and error contracts; boundary/state cases where listed | UT-067, UT-068 | IT-084, IT-085, IT-086, IT-087, IT-088, IT-089, IT-090, IT-091 | — |
| HTTP policy / private responses | Happy and error contracts; boundary/state cases where listed | UT-069, UT-070 | — | — |

### API / CLI / message contracts

| Source | Behavior | Task-required | Feature-gate | QA/release |
| --- | --- | --- | --- | --- |
| tasks.list | Success DTO and every documented common/procedure-specific failure | IT-001, IT-014, IT-015, IT-016, IT-017, IT-019, IT-021, IT-022, IT-046 | — | — |
| tasks.byId | Success DTO and every documented common/procedure-specific failure | IT-002, IT-014, IT-015, IT-016, IT-017, IT-019, IT-020, IT-045, IT-046 | — | — |
| tasks.messages | Success DTO and every documented common/procedure-specific failure | IT-003, IT-014, IT-015, IT-016, IT-017, IT-019, IT-020, IT-021, IT-046 | — | — |
| tasks.revisions | Success DTO and every documented common/procedure-specific failure | IT-004, IT-014, IT-015, IT-016, IT-017, IT-019, IT-020, IT-021, IT-046 | — | — |
| tasks.start | Success DTO and every documented common/procedure-specific failure | IT-005, IT-014, IT-015, IT-016, IT-017, IT-019, IT-022, IT-023, IT-024, IT-025, IT-026, IT-046 | — | — |
| tasks.send | Success DTO and every documented common/procedure-specific failure | IT-006, IT-014, IT-015, IT-016, IT-017, IT-018, IT-019, IT-020, IT-022, IT-023, IT-024, IT-025, IT-026, IT-027, IT-028, IT-029, IT-030, IT-046 | — | — |
| tasks.submission | Success DTO and every documented common/procedure-specific failure | IT-007, IT-014, IT-015, IT-016, IT-017, IT-019, IT-044, IT-046 | — | — |
| tasks.retryGeneration | Success DTO and every documented common/procedure-specific failure | IT-008, IT-014, IT-015, IT-016, IT-017, IT-018, IT-019, IT-020, IT-026, IT-027, IT-028, IT-029, IT-031, IT-046 | — | — |
| tasks.saveDraft | Success DTO and every documented common/procedure-specific failure | IT-009, IT-014, IT-015, IT-016, IT-017, IT-018, IT-019, IT-020, IT-022, IT-026, IT-027, IT-028, IT-029, IT-030, IT-032, IT-033, IT-046 | — | — |
| tasks.resolveRefinement | Success DTO and every documented common/procedure-specific failure | IT-010, IT-014, IT-015, IT-016, IT-017, IT-018, IT-019, IT-020, IT-026, IT-027, IT-028, IT-029, IT-032, IT-034, IT-035, IT-046 | — | — |
| tasks.preview | Success DTO and every documented common/procedure-specific failure | IT-011, IT-014, IT-015, IT-016, IT-017, IT-019, IT-020, IT-027, IT-032, IT-036, IT-038, IT-039, IT-040, IT-041, IT-046 | — | — |
| tasks.publish | Success DTO and every documented common/procedure-specific failure | IT-012, IT-014, IT-015, IT-016, IT-017, IT-018, IT-019, IT-020, IT-025, IT-026, IT-027, IT-028, IT-029, IT-032, IT-036, IT-037, IT-038, IT-039, IT-040, IT-041, IT-046 | — | — |
| tasks.reconcilePublication | Success DTO and every documented common/procedure-specific failure | IT-013, IT-014, IT-015, IT-016, IT-017, IT-018, IT-019, IT-020, IT-026, IT-027, IT-042, IT-043, IT-046 | — | — |
| dictation preflight | Success and each documented HTTP failure status/reason | IT-047, IT-048, IT-049, IT-050, IT-051, IT-052, IT-053, IT-054, IT-055 | — | — |
| dictation upload | Success and each documented HTTP failure status/reason | IT-056, IT-057, IT-058, IT-059, IT-060, IT-061, IT-062, IT-063, IT-064, IT-065, IT-066, IT-067, IT-068 | — | — |
| context broker | Success and each documented HTTP failure status/reason | IT-069, IT-070, IT-071, IT-072, IT-073, IT-074, IT-075 | — | — |
| Issue Author v1 | Success and each documented HTTP failure status/reason | — | IT-076, IT-077, IT-078, IT-079, IT-080, IT-081, IT-082, IT-083 | — |
| tasks:worker CLI / durable job contract | Startup, claims, lease recovery, fences and single publication dispatch | UT-035, UT-036 | IT-092, IT-093, IT-094, IT-095, IT-096, IT-097, IT-098, IT-099, IT-100, IT-101 | — |
| GenerationInput / GenerationEnvelope | Complete history, canonical result, execution identity and actual evidence/activity | UT-013, UT-014, UT-073, UT-074, UT-089, UT-063, UT-064, UT-105, UT-106 | IT-076, IT-077, IT-078, IT-079, IT-080, IT-081, IT-082, IT-083 | — |
| ToolRequest / ToolOutcome / EvidenceBinding | Scoped tools, exact provenance, retained historical claims and safe errors | UT-017, UT-018, UT-097, UT-027, UT-028, UT-079, UT-080, UT-081, IT-069, IT-070, IT-071, IT-072, IT-073, IT-074, IT-075 | — | — |
| ReviewedPublication / CreationOutcome / IssueReceipt | Exact snapshot, rejection versus uncertainty and real verified identity | UT-029, UT-030, UT-108, UT-033, UT-034, UT-082, UT-083, UT-084, UT-085, UT-086, UT-087, UT-088, UT-031, UT-032 | IT-092, IT-093, IT-094, IT-095, IT-096, IT-097, IT-098, IT-099, IT-100, IT-101 | — |
| TranscriptionInput / capture token contract | Actual audio bounds, final editable transcript and cleanup | UT-041, UT-042, UT-092, UT-093, UT-094, UT-039, UT-040, UT-095, UT-096, UT-107, IT-047, IT-048, IT-049, IT-050, IT-051, IT-052, IT-053, IT-054, IT-055, IT-056, IT-057, IT-058, IT-059, IT-060, IT-061, IT-062, IT-063, IT-064, IT-065, IT-066, IT-067, IT-068 | — | E2E-020, E2E-021, E2E-022, E2E-026 |
| HTTP policy, secret redaction and GitHub response classification | Body/batch bounds, safe logs, redirects, rejection reasons and trusted URLs | — | IT-127, IT-128, IT-129, IT-130, IT-131, IT-132, IT-133, IT-134, IT-135 | — |
| Cross-cutting session, privacy and lifecycle contracts | Absence receipts, retained turns, capture cleanup and verified sessions | — | IT-255, IT-256, IT-257, IT-258, IT-259, IT-260, IT-261, IT-262, IT-263, IT-264, IT-265, IT-266 | — |

## Unit Tests


### Tasks transport / schemas

- **UT-001** (`task-required, happy`): tasks.start input schema — project P, request key K and message "Corrigir total do carrinho ao remover item" parse without author or repository input fields.
- **UT-002** (`task-required, error`): tasks.start input schema — message "   " returns blank_message before any controller call.

### TasksController / DTO mapper

- **UT-003** (`task-required, happy`): TasksController.byId(A, T) maps revision R7 and createdAt 2026-10-01T12:00:00Z to the explicit JSON DTO with ISO timestamps.
- **UT-004** (`task-required, error`): TasksController.byId — a DAO storage exception becomes INTERNAL_SERVER_ERROR with reason=service_unavailable and no driver message.

### TaskAccessService

- **UT-005** (`task-required, happy`): TaskAccessService.requireRead — member B with personal read access to repository 202 receives scoped task T authored by A.
- **UT-006** (`task-required, error`): TaskAccessService.requireAuthor — administrator B tries to mutate A's task T and receives author_required.

### TaskLifecycleService

- **UT-007** (`task-required, happy`): TaskLifecycleService.start — nonblank first intention and unused K produce one accepted start command for author A.
- **UT-008** (`task-required, error`): TaskLifecycleService.send — T is published and message "Ajustar também o desconto" returns task_complete.

### TaskDao

- **UT-009** (`task-required, happy`): TaskDao page input — P, anchor (2026-10-01T12:00:00Z,T) and limit=30 produce a bound page contract with nextCursor only when a later item exists.
- **UT-010** (`task-required, error`): TaskDao boundary — malformed page cursor "!!!" returns invalid_cursor before the database query.

### TaskOperationDao

- **UT-011** (`task-required, happy`): TaskOperationDao.claim — queued O at clock 12:00 yields execution E and fence=1 with leaseUntil=12:01.
- **UT-012** (`task-required, error`): TaskOperationDao.complete — execution E/fence=1 is superseded by fence=2 and returns stale_execution without applying its result.

### GenerationService

- **UT-013** (`task-required, happy`): GenerationService.acceptResult — first validated draft_ready for O creates one canonical saved draft.
- **UT-014** (`task-required, error`): GenerationService.acceptResult — productConsiderations has four entries and returns invalid_agent_output while retaining R7.

### IssueAuthorGateway / Dev_Control HTTP adapter

- **UT-015** (`task-required, happy`): DevControlIssueAuthorGateway.generate — v1 envelope echoes O/E and canonical question "Qual erro acontece ao fechar o pedido?" returns needs_clarification.
- **UT-016** (`task-required, error`): DevControlIssueAuthorGateway.generate — HTTP 200 echoes another execution E2 and returns execution_mismatch.

### IssueContextController / IssueContextService

- **UT-017** (`task-required, happy`): IssueContextService.lookup — active E with valid capability and readProjectFile src/cart.ts:8-12 returns persisted evidence F1.
- **UT-018** (`task-required, error`): IssueContextController.lookup — capability for expired execution E0 returns HTTP 401 capability_invalid before GitHub.

### GitHubContextGateway / scoped tools

- **UT-019** (`task-required, happy`): GitHubContextGateway.readProjectFile — src/cart.ts at commit c1 and lines 8-12 returns that path/commit/range.
- **UT-020** (`task-required, error`): GitHubContextGateway.readProjectFile — ../private.env returns invalid_path before network access.

### DraftRules

- **UT-021** (`task-required, happy`): validatePublicationDraft — title "Corrigir total", context "Ao remover item o total permanece antigo", objective "Recalcular total", optional arrays [] passes.
- **UT-022** (`task-required, error`): validatePublicationDraft — objective="   " returns fieldErrors.objective=required.

### DraftRenderer

- **UT-023** (`task-required, happy`): renderIssueBody — the minimal valid draft produces exactly "## Contexto\n\nAo remover item o total permanece antigo\n\n## Objetivo\n\nRecalcular total".
- **UT-024** (`task-required, error`): renderIssueBody — a source URL javascript:alert(1) returns unsafe_source rather than a clickable reference.

### DraftMerge / refinement review

- **UT-025** (`task-required, happy`): applySelectedFields — R7 has manually edited context "Preservar regra fiscal" and proposal changes title/context; selectedPaths=["title"] retains context byte-for-byte.
- **UT-026** (`task-required, error`): applySelectedFields — selectedPaths=["authorUserId"] returns invalid_field_path.

### SourceRules / evidence bindings

- **UT-027** (`task-required, happy`): validateSource — source src/cart.ts:10, repository 202 and commit c1 matches F1 for that same path/commit/range.
- **UT-028** (`task-required, error`): validateSource — src/payment.ts:10 paired with evidence src/cart.ts:8-12 returns invalid_agent_source.

### PublicationController / PublicationService

- **UT-029** (`task-required, happy`): PublicationService.approve — current R7/version=7/repository=202 and matching previewHash create one publishing command.
- **UT-030** (`task-required, error`): PublicationService.approve — supplied R6 while current revision is R7 returns revision_conflict before dispatch.

### PublicationRecoveryService

- **UT-031** (`task-required, happy`): PublicationRecoveryService.reconcile — verified original attempt Q receipt for Issue 41 resolves Q to published.
- **UT-032** (`task-required, error`): PublicationRecoveryService.reconcile — repository search returns zero candidates after timeout and leaves Q publication_uncertain.

### GitHubIssueGateway

- **UT-033** (`task-required, happy`): GitHubIssueGateway.create — HTTP 201 with repository 202, publisher GitHub ID 501 and Issue #41 returns created with real receipt.
- **UT-034** (`task-required, error`): GitHubIssueGateway.create — connection resets after POST begins and returns uncertain; fetch is called once.

### TaskWorkerController / worker CLI

- **UT-035** (`task-required, happy`): TaskWorkerController.tick — queued generation O invokes the gateway with claimed E/fence and settles one operation.
- **UT-036** (`task-required, error`): TaskWorkerController.start — missing DATABASE_URL yields nonzero CLI exit without constructing an in-memory queue.

### TranscriptionController / preflight

- **UT-037** (`task-required, happy`): TranscriptionController.preflight — A in P with no task and no capture lease returns capture C without saving a task.
- **UT-038** (`task-required, error`): TranscriptionController.preflight — B requests task T authored by A and returns HTTP 403 author_required.

### TranscriptionGateway / Groq adapter

- **UT-039** (`task-required, happy`): GroqTranscriptionGateway.transcribe — valid WebM bytes send whisper-large-v3-turbo, language=pt and response_format=json to the transcription endpoint.
- **UT-040** (`task-required, error`): GroqTranscriptionGateway.transcribe — HTTP 429 with Retry-After=30 becomes provider_rate_limited with retryAfterSeconds=30.

### AudioValidator

- **UT-041** (`task-required, happy`): AudioValidator.inspect — ffprobe reports one WebM audio stream and duration=60 seconds, yielding valid WebM duration metadata.
- **UT-042** (`task-required, error`): AudioValidator.inspect — ffprobe exceeds five seconds and returns invalid_audio without uploading to Groq.

### Repository authorization refresh extension

- **UT-043** (`task-required, happy`): RepositoryAuthorizationService refresh — expired credential for A is renewed only after acquiring the per-user database lock and re-reading it.
- **UT-044** (`task-required, error`): RepositoryAuthorizationService refresh — GET /user returns GitHub ID 999 for stored ID 501 and returns identity_mismatch without storing the token.

### Production composition / server exports

- **UT-045** (`task-required, happy`): createProductionTasksController — configured database/gateways assemble the class with transaction-scoped DAO factory.
- **UT-046** (`task-required, error`): task composition — missing ISSUE_AUTHOR_BASE_URL returns service_unavailable; it cannot select the demo implementation.

### Workspace data hooks / loader

- **UT-047** (`task-required, happy`): loadTaskWorkspace — authorized P/T loads confirmed R7 and pending O through the existing server caller.
- **UT-048** (`task-required, error`): useTaskWorkspace — delayed response for T arrives after selecting U and cannot replace U's visible state.

### Task history / SessionRail

- **UT-049** (`task-required, happy`): useTaskHistory — refreshing a page containing T plus duplicate T/new U renders T and U once each.
- **UT-050** (`task-required, error`): SessionRail — failed list fetch displays load failure instead of empty history.

### Task actions / confirmed input

- **UT-051** (`task-required, happy`): useTaskActions.send — accepted receipt for K clears the matching input only after acceptance.
- **UT-052** (`task-required, error`): useTaskActions.send — request reset without receipt leaves "Corrigir total" editable and unconfirmed.

### Canonical editor / DraftFooter

- **UT-053** (`task-required, happy`): IssueDraftBlock — saved R7 displays all seven canonical fields and title/body preview for repository acme/cart.
- **UT-054** (`task-required, error`): DraftFooter — dirty objective disables Criar Issue and exposes pending-save explanation.

### SourcesPanel / ToolRun / safe display

- **UT-055** (`task-required, happy`): ToolRun — stored searchProject status=empty with measured durationMs=12 displays empty lookup, not a fake found file.
- **UT-056** (`task-required, error`): SourcesPanel — stored unsafe source URL displays a source validation error without an active unsafe link.

### DictationState / useDictation / controls

- **UT-057** (`task-required, happy`): dictationState — input "Corrigir checkout", completed C transcript "ao remover item" appends once after Stop, with no Send callback.
- **UT-058** (`task-required, error`): useDictation — microphone NotAllowedError leaves "Corrigir checkout" unchanged and returns permission_denied.

### Navigation / session and OAuth destinations

- **UT-059** (`task-required, happy`): normalizeDestination — /projects/P/issues/T with valid UUIDs returns that exact task path and destinationProjectId=P.
- **UT-060** (`task-required, error`): normalizeDestination — https://evil.example/task returns /projects; it cannot become an OAuth return target.

### Access propagation / reader workspace

- **UT-061** (`task-required, happy`): Workspace — member B opening T shows author A and the read-only explanation without mutation controls.
- **UT-062** (`task-required, error`): Workspace — current authorization becomes revoked during capture C and stops every microphone track.

### Dev_Control v1 route / canonical parser

- **UT-063** (`task-required, happy`): flow-dev-issue-author v1 handler — valid request O/E and provider project_file tag normalize to canonical project-file.
- **UT-064** (`task-required, error`): flow-dev-issue-author v1 handler — missing service key returns HTTP 401 before agent invocation.

### Dev_Control RequestContext / broker tool client

- **UT-065** (`task-required, happy`): flowDevContextTools — readProjectFile uses the configured broker origin and RequestContext capability rather than model-provided repository.
- **UT-066** (`task-required, error`): flowDevContextTools — absent trusted Flow Dev context returns context_required; no local/global fallback executes.

### Task schema / immutable records

- **UT-067** (`task-required, happy`): taskRecord validator — task T bound to P/A/202 and revision R7 accepts its valid same-task pointer.
- **UT-068** (`task-required, error`): taskRecord validator — revision from task U attached to T returns invalid_revision_binding.

### HTTP policy / private responses

- **UT-069** (`task-required, happy`): task HTTP wrapper — configured Origin and valid body produce Cache-Control=no-store while preserving auth response cookies.
- **UT-070** (`task-required, error`): task HTTP wrapper — cookie-authenticated POST from https://evil.example returns HTTP 403 origin_denied before the controller.

### Tasks transport / schemas

- **UT-071** (`task-required, boundary`): validateUserMessage — exactly 10,000 Unicode code points is accepted.
- **UT-072** (`task-required, boundary`): validateUserMessage — 10,001 Unicode code points returns input_limit with the full local value retained.

### GenerationService

- **UT-073** (`task-required, boundary`): buildGenerationInput — complete serialized input at 100,000 UTF-8 bytes is accepted.
- **UT-074** (`task-required, boundary`): buildGenerationInput — 100,001 UTF-8 bytes returns input_capacity without slicing original messages.

### DraftRules

- **UT-075** (`task-required, boundary`): DraftRules — title of 257 code points returns title input_limit.
- **UT-076** (`task-required, boundary`): DraftRules — rendered body of 60,001 UTF-8 bytes returns body input_limit.
- **UT-077** (`task-required, boundary`): DraftRules — fourth product consideration returns productConsiderations input_limit.
- **UT-078** (`task-required, boundary`): DraftRules — 101 constraint entries returns constraints input_limit.

### SourceRules / evidence bindings

- **UT-079** (`task-required, state`): SourceRules — changing the statement of F1 marks the new binding author-edited instead of retrieved.
- **UT-080** (`task-required, state`): SourceRules — unchanged prior claimHash/F1 during refinement remains historical evidence.
- **UT-081** (`task-required, error`): SourceRules — a newly generated reference to unretrieved src/missing.ts returns invalid_agent_source.

### GitHubIssueGateway

- **UT-082** (`task-required, state`): GitHubIssueGateway.eligibility — permissions.pull=true and permissions.push=false with personal valid token and has_issues=true is eligible for content-only Issue creation.
- **UT-083** (`task-required, error`): GitHubIssueGateway.eligibility — public repository readable anonymously but no personal publication token returns repository_authorization_needed.
- **UT-084** (`task-required, error`): GitHubIssueGateway.create — received 503 returns uncertain rather than rejected.
- **UT-085** (`task-required, error`): GitHubIssueGateway.create — received malformed 201 with no Issue identity returns uncertain.
- **UT-086** (`task-required, state`): GitHubIssueGateway.create — fully received 422 with invalid body returns rejected/content_rejected.
- **UT-087** (`task-required, state`): GitHubIssueGateway.create — fully received 410 returns rejected/issues_disabled.
- **UT-088** (`task-required, error`): GitHubIssueGateway.resolve — 404 without independent deletion evidence returns destination_unavailable rather than repository_deleted.

### GenerationService

- **UT-089** (`task-required, ordering`): GenerationService.acceptResult — older fence=1 after fence=2 result returns stale_execution without changing R8.

### TaskLifecycleService

- **UT-090** (`task-required, idempotency`): TaskLifecycleService command receipt — same K and payload hash yields its original accepted message ID.
- **UT-091** (`task-required, error`): TaskLifecycleService command receipt — same K with different message returns request_key_reused.

### AudioValidator

- **UT-092** (`task-required, boundary`): AudioValidator — actual duration=180 seconds and 10 MiB encoded bytes passes application bounds.
- **UT-093** (`task-required, boundary`): AudioValidator — actual duration=180.1 seconds returns invalid_audio regardless of submitted duration=1.
- **UT-094** (`task-required, error`): AudioValidator — MIME audio/webm with detected MP4 returns invalid_audio.

### TranscriptionGateway / Groq adapter

- **UT-095** (`task-required, error`): GroqTranscriptionGateway — success body {"unexpected":true} returns invalid_provider_response.
- **UT-096** (`task-required, state`): GroqTranscriptionGateway — success body {"text":""} returns no_speech without adding a message.

### IssueContextController / IssueContextService

- **UT-097** (`task-required, boundary`): issueContext budgets — the thirteenth lookup returns unavailable/context_limit with no further GitHub read.

### GitHubContextGateway / scoped tools

- **UT-098** (`task-required, error`): GitHubContextGateway — binary blob or submodule returns unavailable/unsupported_context.
- **UT-099** (`task-required, boundary`): GitHubContextGateway — file exceeds 1 MiB returns unavailable/context_limit rather than a silently truncated source.
- **UT-100** (`task-required, error`): GitHubContextGateway — query "repo:evil/other checkout" returns invalid_query before GitHub.

### Task history / SessionRail

- **UT-101** (`task-required, boundary`): Task history search — 201 code points returns input_limit before querying.

### TasksController / DTO mapper

- **UT-102** (`task-required, error`): TasksController mapper — invalid stored canonicalDraft JSON returns invalid_stored_content without invented values.

### DictationState / useDictation / controls

- **UT-103** (`task-required, state`): dictationState — visibilitychange while listening ends capture with incomplete_capture and no automatic restart.

### Canonical editor / DraftFooter

- **UT-104** (`task-required, state`): DraftFooter — pending refinement proposal blocks publication until apply/discard is confirmed.

### Dev_Control v1 route / canonical parser

- **UT-105** (`task-required, error`): flow-dev-issue-author v1 parser — question and draft both nonnull returns invalid_agent_output.
- **UT-106** (`task-required, error`): flow-dev-issue-author envelope — invented toolCallId absent from broker outcomes returns invalid_agent_activity.

### TranscriptionGateway / Groq adapter

- **UT-107** (`task-required, error`): GroqTranscriptionGateway — missing GROQ_API_KEY returns transcription_unconfigured without a provider call.

### PublicationController / PublicationService

- **UT-108** (`task-required, error`): PublicationService.approve — previewHash computed for old owner/name returns preview_changed after verified rename.

### US-001 edge cases

- **UT-109** (`task-required, state`): useTaskHistory — given network disconnect during list load; perform the story action through real component/browser-media boundary wiring; expect load failure retains P identity and offers Retry.

### US-002 edge cases

- **UT-110** (`task-required, state`): useTaskWorkspace — given refresh before browser-only unsent "Corrigir total" is accepted; perform the story action through real component/browser-media boundary wiring; expect only confirmed messages are labeled restored.

### US-004 edge cases

- **UT-111** (`task-required, error`): useDictation — given getUserMedia fails with NotReadableError; perform the story action through real component/browser-media boundary wiring; expect capture stops with device_error and typed input remains.
- **UT-112** (`task-required, state`): useDictation — given getUserMedia fails with NotFoundError; perform the story action through real component/browser-media boundary wiring; expect no_microphone is visible and no message is added.
- **UT-113** (`task-required, boundary`): useDictation — given listening reaches exactly 180 seconds; perform the story action through real component/browser-media boundary wiring; expect capture stops with a visible limit reason without Send.
- **UT-114** (`task-required, error`): useDictation — given getUserMedia rejects NotAllowedError; perform the story action through real component/browser-media boundary wiring; expect permission_denied leaves pre-existing typing unchanged.
- **UT-115** (`task-required, concurrency`): useDictation — given click Start twice while permission is pending; perform the story action through real component/browser-media boundary wiring; expect one getUserMedia/capture session starts.
- **UT-116** (`task-required, state`): useDictation — given each of navigation, task switch, project switch, sign-out, pagehide or access loss during C; perform the story action through real component/browser-media boundary wiring; expect all tracks stop and no automatic recording restart occurs.
- **UT-117** (`task-required, idempotency`): dictationState — given repeat Stop twice on C; perform the story action through real component/browser-media boundary wiring; expect one final transcript append occurs.
- **UT-118** (`task-required, ordering`): dictationState — given Cancel C while upload response is pending; perform the story action through real component/browser-media boundary wiring; expect late C transcript is ignored and original input is restored.
- **UT-119** (`task-required, state`): DictationControls — given task enters generating, publishing or published; perform the story action through real component/browser-media boundary wiring; expect Start remains unavailable for that task.
- **UT-120** (`task-required, boundary`): useDictation — given switch through ten tasks after repeated captures; perform the story action through real component/browser-media boundary wiring; expect only the current authorized input can own active tracks.

### US-005 edge cases

- **UT-121** (`task-required, error`): Composer — given final transcript misspells "Drizzle" as "drizel"; perform the story action through real component/browser-media boundary wiring; expect manual correction is editable before Send.
- **UT-122** (`task-required, state`): dictationState — given Groq returns empty text for C with existing "Corrigir checkout"; perform the story action through real component/browser-media boundary wiring; expect input remains unchanged with no_speech feedback.
- **UT-123** (`task-required, boundary`): Composer — given completed transcript yields 10,001 code points; perform the story action through real component/browser-media boundary wiring; expect full text remains editable and Send exposes input_limit.
- **UT-124** (`task-required, error`): useDictation — given microphone track ends unexpectedly mid-capture; perform the story action through real component/browser-media boundary wiring; expect incomplete_capture retains typing and Send waits until cleanup settles.
- **UT-125** (`task-required, concurrency`): dictationState — given user types "Preservar IVA" while C is processing; perform the story action through real component/browser-media boundary wiring; expect completed speech appends without replacing that typed edit.
- **UT-126** (`task-required, state`): dictationState — given upload fails after recording is interrupted; perform the story action through real component/browser-media boundary wiring; expect failure cannot present any partial audio as completed transcript.
- **UT-127** (`task-required, idempotency`): dictationState — given capture C2 follows completed C1 in same unsent input; perform the story action through real component/browser-media boundary wiring; expect C2 text extends current input exactly once.
- **UT-128** (`task-required, ordering`): Composer — given Send is clicked while listening or processing; perform the story action through real component/browser-media boundary wiring; expect no task message is submitted.
- **UT-129** (`task-required, state`): dictationState — given C is abandoned then task U becomes active; perform the story action through real component/browser-media boundary wiring; expect late C transcript changes neither U input nor history.
- **UT-130** (`task-required, boundary`): Composer — given a long editable transcript includes technical identifiers cartTotal and Drizzle; perform the story action through real component/browser-media boundary wiring; expect all text/corrections remain reachable before manual Send.

### US-007 edge cases

- **UT-131** (`task-required, ordering`): useTaskWorkspace — given P/T generation finishes after switching to P2/U; perform the story action through real component/browser-media boundary wiring; expect result cannot populate U.

### US-008 edge cases

- **UT-132** (`task-required, state`): SourcesPanel — given current revision references=[] and activity=[]; perform the story action through real component/browser-media boundary wiring; expect no filler path/Issue/timing appears.
- **UT-133** (`task-required, boundary`): SourcesPanel — given 100 valid references exceed initial viewport; perform the story action through real component/browser-media boundary wiring; expect every included source remains reachable.
- **UT-134** (`task-required, state`): SourcesPanel — given historical source GitHub URL fails to load; perform the story action through real component/browser-media boundary wiring; expect recorded provenance remains labeled historical with opening guidance.

### US-009 edge cases

- **UT-135** (`task-required, state`): useTaskActions.save — given connection fails before acceptance is confirmed; perform the story action through real component/browser-media boundary wiring; expect editor shows unconfirmed/failed save without discarding local content.
- **UT-136** (`task-required, ordering`): DraftFooter — given publish clicked while Save is pending; perform the story action through real component/browser-media boundary wiring; expect approval is unavailable until confirmed current content exists.
- **UT-137** (`task-required, boundary`): IssueDraftBlock — given draft contains 100 constraints and 100 source entries within budgets; perform the story action through real component/browser-media boundary wiring; expect included values stay editable/reachable on narrow layout.

### US-013 edge cases

- **UT-138** (`task-required, concurrency`): useTaskWorkspace — given second tab polls after T becomes published; perform the story action through real component/browser-media boundary wiring; expect same #41 result replaces stale publication controls.

### US-014 edge cases

- **UT-139** (`task-required, state`): Workspace — given session expires while C capture or draft Save is active; perform the story action through real component/browser-media boundary wiring; expect capture stops and continuation requires sign-in with saved work intact.

### US-016 edge cases

- **UT-140** (`task-required, error`): IssueDraftBlock — given objective becomes blank and publication validation fails; perform the story action through real component/browser-media boundary wiring; expect accessible field alert identifies objective while preserving value.
- **UT-141** (`task-required, state`): Workspace — given no history/evidence/draft fixture; perform the story action through real component/browser-media boundary wiring; expect accessible empty guidance has no fake content.
- **UT-142** (`task-required, error`): Workspace — given reader B opens T; perform the story action through real component/browser-media boundary wiring; expect visible read-only/author explanation accompanies unavailable actions.
- **UT-143** (`task-required, concurrency`): useTaskWorkspace — given background poll announces R8 while editor focuses dirty R7; perform the story action through real component/browser-media boundary wiring; expect focus/local input stay intact with relevant update feedback.
- **UT-144** (`task-required, idempotency`): Workspace status announcements — given same polling status/version returns repeatedly; perform the story action through real component/browser-media boundary wiring; expect one status change announcement occurs rather than repeated live-region spam.
- **UT-145** (`task-required, ordering`): SourcesPanel — given open and close source drawer from current draft; perform the story action through real component/browser-media boundary wiring; expect focus returns to the source trigger in logical review order.
- **UT-146** (`task-required, state`): Workspace — given draft_ready transitions publishing then published; perform the story action through real component/browser-media boundary wiring; expect visual/assistive status exposes the new state and available actions.


## Integration Tests


### Protected tRPC contracts

- **IT-001** (`task-required`): tRPC tasks.list — use the query with {projectId:P,limit:30} against real router/controller/DAO wiring and the valid state fixture for this procedure; expect one TaskSummary for T with author A and nextCursor=null.
- **IT-002** (`task-required`): tRPC tasks.byId — use the query with {projectId:P,taskId:T} against real router/controller/DAO wiring and the valid state fixture for this procedure; expect currentRevision.id=R7 and permissions.canEdit=true for A.
- **IT-003** (`task-required`): tRPC tasks.messages — use the query with {projectId:P,taskId:T,limit:30} against real router/controller/DAO wiring and the valid state fixture for this procedure; expect the accepted intention and clarification ordered by sequence.
- **IT-004** (`task-required`): tRPC tasks.revisions — use the query with {projectId:P,taskId:T,limit:30} against real router/controller/DAO wiring and the valid state fixture for this procedure; expect immutable R7 and its parent R6 with a usable page cursor.
- **IT-005** (`task-required`): tRPC tasks.start — use the mutation with {projectId:P,requestKey:K,message:"Corrigir total do carrinho"} against real router/controller/DAO wiring and the valid state fixture for this procedure; expect one accepted receipt with taskId, operationId and acceptedMessageId.
- **IT-006** (`task-required`): tRPC tasks.send — use the mutation with {projectId:P,taskId:T,requestKey:K,expectedVersion:7,message:"Preservar regra fiscal"} against real router/controller/DAO wiring and the valid state fixture for this procedure; expect one accepted refinement receipt for T.
- **IT-007** (`task-required`): tRPC tasks.submission — use the query with {projectId:P,action:"send",requestKey:K} against real router/controller/DAO wiring and the valid state fixture for this procedure; expect the existing accepted receipt; an unused K returns not_accepted in the separate absence variant.
- **IT-008** (`task-required`): tRPC tasks.retryGeneration — use the mutation with {projectId:P,taskId:T,requestKey:K,expectedVersion:7,failedOperationId:O} against real router/controller/DAO wiring and the valid state fixture for this procedure; expect a queued retry receipt reusing the previously accepted user turn.
- **IT-009** (`task-required`): tRPC tasks.saveDraft — use the mutation with {projectId:P,taskId:T,requestKey:K,expectedVersion:7,baseRevisionId:R7,draft:D,evidenceBindings:[]} against real router/controller/DAO wiring and the valid state fixture for this procedure; expect one current saved revision R8/version=8.
- **IT-010** (`task-required`): tRPC tasks.resolveRefinement — use the mutation with {projectId:P,taskId:T,requestKey:K,expectedVersion:7,proposalOperationId:O,decision:"apply",selectedPaths:["title"]} against real router/controller/DAO wiring and the valid state fixture for this procedure; expect R8 with selected proposal title and unchanged unselected fields.
- **IT-011** (`task-required`): tRPC tasks.preview — use the query with {projectId:P,taskId:T,revisionId:R7} against real router/controller/DAO wiring and the valid state fixture for this procedure; expect exact title/bodyMarkdown, repository 202, publisher 501 and previewHash H7.
- **IT-012** (`task-required`): tRPC tasks.publish — use the mutation with {projectId:P,taskId:T,requestKey:K,expectedVersion:7,revisionId:R7,repositoryId:"202",previewHash:H7} against real router/controller/DAO wiring and the valid state fixture for this procedure; expect one durable publishing attempt Q for the reviewed snapshot.
- **IT-013** (`task-required`): tRPC tasks.reconcilePublication — use the mutation with {projectId:P,taskId:T,requestKey:K,expectedVersion:7,attemptId:Q} against real router/controller/DAO wiring and the valid state fixture for this procedure; expect the unchanged uncertain attempt when no attributable receipt exists.

### Protected tRPC failures

- **IT-014** (`task-required`): tRPC failure table [tasks.list, tasks.byId, tasks.messages, tasks.revisions, tasks.start, tasks.send, tasks.submission, tasks.retryGeneration, tasks.saveDraft, tasks.resolveRefinement, tasks.preview, tasks.publish, tasks.reconcilePublication] — use each listed valid procedure input, remove the authenticated session; expect UNAUTHORIZED/session_required with no protected DTO or accepted mutation.
- **IT-015** (`task-required`): tRPC failure table [tasks.list, tasks.byId, tasks.messages, tasks.revisions, tasks.start, tasks.send, tasks.submission, tasks.retryGeneration, tasks.saveDraft, tasks.resolveRefinement, tasks.preview, tasks.publish, tasks.reconcilePublication] — use each listed valid procedure input, use project P without assignment for nonadministrator A; expect NOT_FOUND/project_unavailable with no protected DTO or accepted mutation.
- **IT-016** (`task-required`): tRPC failure table [tasks.list, tasks.byId, tasks.messages, tasks.revisions, tasks.start, tasks.send, tasks.submission, tasks.retryGeneration, tasks.saveDraft, tasks.resolveRefinement, tasks.preview, tasks.publish, tasks.reconcilePublication] — use each listed valid procedure input, use private repository 202 without A's personal repository credential; expect PRECONDITION_FAILED/repository_authorization_needed with no protected DTO or accepted mutation.
- **IT-017** (`task-required`): tRPC failure table [tasks.list, tasks.byId, tasks.messages, tasks.revisions, tasks.start, tasks.send, tasks.submission, tasks.retryGeneration, tasks.saveDraft, tasks.resolveRefinement, tasks.preview, tasks.publish, tasks.reconcilePublication] — use each listed valid procedure input, interrupt the scoped PostgreSQL read/write before acceptance; expect INTERNAL_SERVER_ERROR/service_unavailable with no protected DTO or accepted mutation.
- **IT-018** (`task-required`): tRPC failure table [tasks.send, tasks.retryGeneration, tasks.saveDraft, tasks.resolveRefinement, tasks.publish, tasks.reconcilePublication] — use each listed valid procedure input, call as reader B on A's T; expect FORBIDDEN/author_required with no protected DTO or accepted mutation.
- **IT-019** (`task-required`): tRPC failure table [tasks.list, tasks.byId, tasks.messages, tasks.revisions, tasks.start, tasks.send, tasks.submission, tasks.retryGeneration, tasks.saveDraft, tasks.resolveRefinement, tasks.preview, tasks.publish, tasks.reconcilePublication] — use each listed valid procedure input, replace projectId with "not-a-uuid"; expect BAD_REQUEST/invalid_input with no protected DTO or accepted mutation.
- **IT-020** (`task-required`): tRPC failure table [tasks.byId, tasks.messages, tasks.revisions, tasks.send, tasks.retryGeneration, tasks.saveDraft, tasks.resolveRefinement, tasks.preview, tasks.publish, tasks.reconcilePublication] — use each listed valid procedure input, set taskId to U which belongs to P2; expect NOT_FOUND/task_unavailable with no protected DTO or accepted mutation.
- **IT-021** (`task-required`): tRPC failure table [tasks.list, tasks.messages, tasks.revisions] — cursor="!!!"; expect BAD_REQUEST with data.reason=invalid_cursor.
- **IT-022** (`task-required`): tRPC failure table [tasks.list, tasks.start, tasks.send, tasks.saveDraft] — list search=201 characters; start/send message=10,001 code points; saveDraft title=257 code points; expect BAD_REQUEST with data.reason=input_limit.
- **IT-023** (`task-required`): tRPC failure table [tasks.start, tasks.send] — message="   "; expect BAD_REQUEST with data.reason=blank_message.
- **IT-024** (`task-required`): tRPC failure table [tasks.start, tasks.send] — complete serialized generation input=100,001 bytes; expect BAD_REQUEST with data.reason=input_capacity.
- **IT-025** (`task-required`): tRPC failure table [tasks.start, tasks.send, tasks.publish] — A has a valid active capture lease C; expect CONFLICT with data.reason=capture_active.
- **IT-026** (`task-required`): tRPC failure table [tasks.start, tasks.send, tasks.retryGeneration, tasks.saveDraft, tasks.resolveRefinement, tasks.publish, tasks.reconcilePublication] — K already records another payload hash; expect CONFLICT with data.reason=request_key_reused.
- **IT-027** (`task-required`): tRPC failure table [tasks.send, tasks.retryGeneration, tasks.saveDraft, tasks.resolveRefinement, tasks.preview, tasks.publish, tasks.reconcilePublication] — expectedVersion=6 while T.version=7; preview requests R6 while R7 is current; expect CONFLICT with data.reason=revision_conflict.
- **IT-028** (`task-required`): tRPC failure table [tasks.send, tasks.retryGeneration, tasks.saveDraft, tasks.resolveRefinement, tasks.publish] — T has an active generation or publishing operation; expect CONFLICT with data.reason=operation_active.
- **IT-029** (`task-required`): tRPC failure table [tasks.send, tasks.retryGeneration, tasks.saveDraft, tasks.resolveRefinement, tasks.publish] — T.status=published with receipt Issue #41; expect CONFLICT with data.reason=task_complete.
- **IT-030** (`task-required`): tRPC failure table [tasks.send, tasks.saveDraft] — T has unresolved proposal O; expect CONFLICT with data.reason=refinement_pending.
- **IT-031** (`task-required`): tRPC failure table [tasks.retryGeneration] — failedOperationId=O points to a successful generation; expect CONFLICT with data.reason=generation_not_failed.
- **IT-032** (`task-required`): tRPC failure table [tasks.saveDraft, tasks.resolveRefinement, tasks.preview, tasks.publish] — save/apply uses four product considerations; preview/publish uses blank objective; expect BAD_REQUEST with data.reason=invalid_draft.
- **IT-033** (`task-required`): tRPC failure table [tasks.saveDraft] — draft reference URL=javascript:alert(1); expect BAD_REQUEST with data.reason=unsafe_source.
- **IT-034** (`task-required`): tRPC failure table [tasks.resolveRefinement] — selectedPaths=["authorUserId"]; expect BAD_REQUEST with data.reason=invalid_field_path.
- **IT-035** (`task-required`): tRPC failure table [tasks.resolveRefinement] — proposalOperationId=O was already discarded; expect CONFLICT with data.reason=stale_proposal.
- **IT-036** (`task-required`): tRPC failure table [tasks.preview, tasks.publish] — T.status=awaiting_clarification with prior R7, or no saved revision exists; expect PRECONDITION_FAILED with data.reason=preview_not_ready.
- **IT-037** (`task-required`): tRPC failure table [tasks.publish] — H7 belongs to saved owner acme/cart but current verified destination is acme/cart-renamed; expect CONFLICT with data.reason=preview_changed.
- **IT-038** (`task-required`): tRPC failure table [tasks.preview, tasks.publish] — GitHub confirms repository 202 archived=true; expect PRECONDITION_FAILED with data.reason=repository_archived.
- **IT-039** (`task-required`): tRPC failure table [tasks.preview, tasks.publish] — GitHub confirms has_issues=false; expect PRECONDITION_FAILED with data.reason=issues_disabled.
- **IT-040** (`task-required`): tRPC failure table [tasks.preview, tasks.publish] — personal token GET /user=999 while A.githubId=501; expect PRECONDITION_FAILED with data.reason=identity_mismatch.
- **IT-041** (`task-required`): tRPC failure table [tasks.preview, tasks.publish] — GitHub provides a conclusive applicable Issue policy denial for A; expect PRECONDITION_FAILED with data.reason=issue_permission_denied.
- **IT-042** (`task-required`): tRPC failure table [tasks.reconcilePublication] — Q is queued and has never reached dispatch; expect CONFLICT with data.reason=attempt_not_uncertain.
- **IT-043** (`task-required`): tRPC failure table [tasks.reconcilePublication] — attemptId names an attempt belonging to U; expect BAD_REQUEST with data.reason=wrong_attempt.
- **IT-044** (`task-required`): tRPC failure table [tasks.submission] — requestKey="not-a-uuid"; expect BAD_REQUEST with data.reason=invalid_request_key.
- **IT-045** (`task-required`): tRPC failure table [tasks.byId] — stored R7 canonicalDraft has malformed JSON shape; expect INTERNAL_SERVER_ERROR with data.reason=invalid_stored_content.
- **IT-046** (`task-required`): tRPC failure table [tasks.list, tasks.byId, tasks.messages, tasks.revisions, tasks.start, tasks.send, tasks.submission, tasks.retryGeneration, tasks.saveDraft, tasks.resolveRefinement, tasks.preview, tasks.publish, tasks.reconcilePublication] — required GitHub access preflight returns 429 with Retry-After=60; expect TOO_MANY_REQUESTS with data.reason=provider_rate_limited.

### HTTP contracts

- **IT-047** (`task-required`): POST /api/task-dictation/preflight — {action:"start",projectId:P,taskId:T,expectedVersion:7}; real HTTP/controller wiring returns HTTP 200 with capture C/token/limits.
- **IT-048** (`task-required`): POST /api/task-dictation/preflight — begin with {action:"start",projectId:P,taskId:T,expectedVersion:7}; projectId="bad"; expect HTTP 400 and error.reason=invalid_input.
- **IT-049** (`task-required`): POST /api/task-dictation/preflight — begin with {action:"start",projectId:P,taskId:T,expectedVersion:7}; no session; expect HTTP 401 and error.reason=session_required.
- **IT-050** (`task-required`): POST /api/task-dictation/preflight — begin with {action:"start",projectId:P,taskId:T,expectedVersion:7}; reader B; expect HTTP 403 and error.reason=author_required.
- **IT-051** (`task-required`): POST /api/task-dictation/preflight — begin with {action:"start",projectId:P,taskId:T,expectedVersion:7}; T belongs to P2; expect HTTP 404 and error.reason=task_unavailable.
- **IT-052** (`task-required`): POST /api/task-dictation/preflight — begin with {action:"start",projectId:P,taskId:T,expectedVersion:7}; valid C already leased; expect HTTP 409 and error.reason=capture_active.
- **IT-053** (`task-required`): POST /api/task-dictation/preflight — begin with {action:"start",projectId:P,taskId:T,expectedVersion:7}; private repo without token; expect HTTP 412 and error.reason=repository_authorization_needed.
- **IT-054** (`task-required`): POST /api/task-dictation/preflight — begin with {action:"start",projectId:P,taskId:T,expectedVersion:7}; all provider slots occupied; expect HTTP 429 and error.reason=transcription_capacity.
- **IT-055** (`task-required`): POST /api/task-dictation/preflight — begin with {action:"start",projectId:P,taskId:T,expectedVersion:7}; missing provider configuration; expect HTTP 503 and error.reason=service_unavailable.
- **IT-056** (`task-required`): POST /api/task-dictation — multipart captureToken=C-token,file=60-second WebM fixture; real HTTP/controller wiring returns HTTP 200 with text="Corrigir total do carrinho",captureId=C.
- **IT-057** (`task-required`): POST /api/task-dictation — begin with multipart captureToken=C-token,file=60-second WebM fixture; MIME/container mismatch; expect HTTP 400 and error.reason=invalid_audio.
- **IT-058** (`task-required`): POST /api/task-dictation — begin with multipart captureToken=C-token,file=60-second WebM fixture; no session; expect HTTP 401 and error.reason=session_required.
- **IT-059** (`task-required`): POST /api/task-dictation — begin with multipart captureToken=C-token,file=60-second WebM fixture; foreign Origin; expect HTTP 403 and error.reason=origin_denied.
- **IT-060** (`task-required`): POST /api/task-dictation — begin with multipart captureToken=C-token,file=60-second WebM fixture; capture scope mismatches task project; expect HTTP 404 and error.reason=task_unavailable.
- **IT-061** (`task-required`): POST /api/task-dictation — begin with multipart captureToken=C-token,file=60-second WebM fixture; C lease expired; expect HTTP 409 and error.reason=capture_expired.
- **IT-062** (`task-required`): POST /api/task-dictation — begin with multipart captureToken=C-token,file=60-second WebM fixture; access revoked after preflight; expect HTTP 412 and error.reason=repository_authorization_needed.
- **IT-063** (`task-required`): POST /api/task-dictation — begin with multipart captureToken=C-token,file=60-second WebM fixture; encoded file is 10 MiB + 1 byte; expect HTTP 413 and error.reason=audio_too_large.
- **IT-064** (`task-required`): POST /api/task-dictation — begin with multipart captureToken=C-token,file=60-second WebM fixture; application/pdf; expect HTTP 415 and error.reason=unsupported_audio_type.
- **IT-065** (`task-required`): POST /api/task-dictation — begin with multipart captureToken=C-token,file=60-second WebM fixture; Groq returns 429; expect HTTP 429 and error.reason=provider_rate_limited.
- **IT-066** (`task-required`): POST /api/task-dictation — begin with multipart captureToken=C-token,file=60-second WebM fixture; HTTP 200 lacks text; expect HTTP 502 and error.reason=invalid_provider_response.
- **IT-067** (`task-required`): POST /api/task-dictation — begin with multipart captureToken=C-token,file=60-second WebM fixture; Groq connection refused; expect HTTP 503 and error.reason=provider_unavailable.
- **IT-068** (`task-required`): POST /api/task-dictation — begin with multipart captureToken=C-token,file=60-second WebM fixture; Groq exceeds 60 seconds; expect HTTP 504 and error.reason=transcription_timeout.
- **IT-069** (`task-required`): POST /api/internal/issue-context — service key plus Ctx-capability; {executionId:E,toolCallId:"tc1",request:{tool:"readProjectFile",path:"src/cart.ts",fromLine:8,toLine:12}}; real HTTP/controller wiring returns HTTP 200 with done with persisted F1 and measured activity.
- **IT-070** (`task-required`): POST /api/internal/issue-context — begin with service key plus Ctx-capability; {executionId:E,toolCallId:"tc1",request:{tool:"readProjectFile",path:"src/cart.ts",fromLine:8,toLine:12}}; request path=../private.env; expect HTTP 400 and error.reason=invalid_path.
- **IT-071** (`task-required`): POST /api/internal/issue-context — begin with service key plus Ctx-capability; {executionId:E,toolCallId:"tc1",request:{tool:"readProjectFile",path:"src/cart.ts",fromLine:8,toLine:12}}; wrong capability; expect HTTP 401 and error.reason=capability_invalid.
- **IT-072** (`task-required`): POST /api/internal/issue-context — begin with service key plus Ctx-capability; {executionId:E,toolCallId:"tc1",request:{tool:"readProjectFile",path:"src/cart.ts",fromLine:8,toLine:12}}; A assignment removed; expect HTTP 403 and error.reason=access_revoked.
- **IT-073** (`task-required`): POST /api/internal/issue-context — begin with service key plus Ctx-capability; {executionId:E,toolCallId:"tc1",request:{tool:"readProjectFile",path:"src/cart.ts",fromLine:8,toLine:12}}; E fence superseded; expect HTTP 409 and error.reason=stale_execution.
- **IT-074** (`task-required`): POST /api/internal/issue-context — begin with service key plus Ctx-capability; {executionId:E,toolCallId:"tc1",request:{tool:"readProjectFile",path:"src/cart.ts",fromLine:8,toLine:12}}; request body exceeds 16 KiB; expect HTTP 413 and error.reason=input_limit.
- **IT-075** (`task-required`): POST /api/internal/issue-context — begin with service key plus Ctx-capability; {executionId:E,toolCallId:"tc1",request:{tool:"readProjectFile",path:"src/cart.ts",fromLine:8,toLine:12}}; evidence write fails; expect HTTP 503 and error.reason=service_unavailable.
- **IT-076** (`feature-gate`): POST /flow-dev/issue-author/v1 — service key and complete valid GenerationInput O/E; real HTTP/controller wiring returns HTTP 200 with canonical draft_ready envelope bound to O/E.
- **IT-077** (`feature-gate`): POST /flow-dev/issue-author/v1 — begin with service key and complete valid GenerationInput O/E; final message role=assistant; expect HTTP 400 and error.reason=invalid_input.
- **IT-078** (`feature-gate`): POST /flow-dev/issue-author/v1 — begin with service key and complete valid GenerationInput O/E; wrong service key; expect HTTP 401 and error.reason=service_unauthorized.
- **IT-079** (`feature-gate`): POST /flow-dev/issue-author/v1 — begin with service key and complete valid GenerationInput O/E; requested E contradicts active broker execution; expect HTTP 409 and error.reason=execution_mismatch.
- **IT-080** (`feature-gate`): POST /flow-dev/issue-author/v1 — begin with service key and complete valid GenerationInput O/E; serialized authoring context=100,001 bytes; expect HTTP 413 and error.reason=input_capacity.
- **IT-081** (`feature-gate`): POST /flow-dev/issue-author/v1 — begin with service key and complete valid GenerationInput O/E; src/payment.ts cited from src/cart.ts evidence; expect HTTP 502 and error.reason=invalid_agent_source.
- **IT-082** (`feature-gate`): POST /flow-dev/issue-author/v1 — begin with service key and complete valid GenerationInput O/E; missing model configuration; expect HTTP 503 and error.reason=service_unavailable.
- **IT-083** (`feature-gate`): POST /flow-dev/issue-author/v1 — begin with service key and complete valid GenerationInput O/E; deadline=240 seconds exceeded; expect HTTP 504 and error.reason=generation_timeout.

### Task persistence and migrations

- **IT-084** (`feature-gate`): apply all migrations to an empty test database; real TaskDao stores task T/messages/R7 and reloads them through a new connection.
- **IT-085** (`feature-gate`): upgrade a database containing the current authentication/project migrations and an assigned project P; the same project/assignment IDs survive task migration.
- **IT-086** (`feature-gate`): direct database UPDATE attempts to retarget T from repository 202 to 303; immutable-binding enforcement rejects the write.
- **IT-087** (`feature-gate`): two database transactions insert active operations for T; the second fails the active-operation constraint.
- **IT-088** (`feature-gate`): append duplicate message sequence=1 to T; the unique sequence constraint rejects it.
- **IT-089** (`feature-gate`): delete author A or project P while retained task T exists; restrictive foreign keys prevent history removal.
- **IT-090** (`feature-gate`): attempt to attach revision R-U from U to T; same-task revision constraint rejects it.
- **IT-091** (`feature-gate`): insert two confirmed links for repository 202/Issue 41; the unique confirmed Issue linkage rejects the second.

### Durable worker and restart

- **IT-092** (`feature-gate`): kill a worker during generation O; after lease expiry another worker completes O once under fence=2.
- **IT-093** (`feature-gate`): return an old E/fence=1 result after fence=2 completed; the actual database current revision remains the fence=2 revision.
- **IT-094** (`feature-gate`): kill a worker after publication Q dispatchStartedAt is committed; a successor records publication_uncertain and sends zero additional POSTs.
- **IT-095** (`feature-gate`): GitHub returns a verified 201 then the first database receipt write fails once; retry stores the receipt without another GitHub POST.
- **IT-096** (`feature-gate`): restart after Q receipt is durable but task completion is not; recovery restores published Issue #41 from Q.
- **IT-097** (`feature-gate`): original authenticated Q HTTP response arrives after Q became uncertain; matching 201 receipt resolves Q without a new dispatch.
- **IT-098** (`feature-gate`): original Q response arrives with definitive 422; Q returns to draft_ready and no new creation occurs until explicit approval.
- **IT-099** (`feature-gate`): database transaction completes before provider HTTP begins; a separate task transaction can run while the generation response is delayed.
- **IT-100** (`feature-gate`): three generation executions fail with gateway unavailable; O ends failed and reopening does not enqueue a fourth execution.
- **IT-101** (`feature-gate`): original session expires while O is queued; worker records access failure and performs no new context lookup.

### Scoped evidence and agent

- **IT-102** (`feature-gate`): real Dev_Control v1/scoped tools invoke the Flow Dev broker for P/T; the recorded GitHub request targets repository 202, never Dev_Control files.
- **IT-103** (`feature-gate`): run P/T and P2/U generations concurrently; each returned evidence record stays bound to its own repository/execution.
- **IT-104** (`feature-gate`): broker readProjectFile repeats identical toolCallId tc1; its recorded outcome is returned without another evidence row.
- **IT-105** (`feature-gate`): same tc1 is repeated with src/payment.ts instead of src/cart.ts; broker returns 409/tool_key_reused.
- **IT-106** (`feature-gate`): GitHub lookup returns 429; broker persists unavailable/rate_limited and identifiable agent output omits unsupported claims.
- **IT-107** (`feature-gate`): generation requires no tools; actual v1 result has activity=[] and no evidence records.
- **IT-108** (`feature-gate`): GitHub search returns a pull_request object; Issue search output excludes that item.
- **IT-109** (`feature-gate`): GitHub tree/search is incomplete or has more than 20 matches; output signals hasMore/unavailable and never claims full repository coverage.
- **IT-110** (`feature-gate`): source URL points to another repository with the same path/line; final v1 provenance validation returns invalid_agent_source.
- **IT-111** (`feature-gate`): repo default branch changes after execution resolves c1; file retrieval continues using c1 and historical URL.
- **IT-112** (`feature-gate`): source assertion is edited during saveDraft; new R8 exposes author-edited binding while retained R7 evidence stays immutable.
- **IT-113** (`feature-gate`): focused refinement proposal contains new context despite manually edited R7; applying only title preserves R7 context exactly.

### Repository OAuth and identity

- **IT-114** (`feature-gate`): two API/worker instances see A's expired rotating token simultaneously; database refresh serialization permits one rotation and both use the verified replacement.
- **IT-115** (`feature-gate`): refresh returns a token for GitHub identity 999 rather than stored 501; no credential update is committed.
- **IT-116** (`feature-gate`): OAuth complete lacks stored expected GitHub identity; completion fails closed and stores no credential.
- **IT-117** (`feature-gate`): GET /user matches 501, repo scope exists, has_issues=true and pull=true/push=false; real preflight allows content-only Issue approval.
- **IT-118** (`feature-gate`): repository 202 renames acme/cart to acme/cart-renamed; saved task retains repositoryId=202 and old previewHash becomes invalid.
- **IT-119** (`feature-gate`): old owner/name now resolves database ID 303; no context/read/publication retargets T to 303.

### Groq and actual audio fixtures

- **IT-120** (`feature-gate`): upload real WebM/Opus fixture through the route and ffprobe; Groq HTTP stub receives one valid completed file, not timeslice fragments.
- **IT-121** (`feature-gate`): upload real MP4/AAC fixture through the route and ffprobe; Groq HTTP stub receives the correct supported container.
- **IT-122** (`feature-gate`): cancel own C via preflight action=cancel; lease is released and any later C upload returns capture_expired.
- **IT-123** (`feature-gate`): two tabs/API instances request A capture simultaneously; one preflight lease wins and the other returns capture_active.
- **IT-124** (`feature-gate`): a valid C upload completes while task publication starts in another tab; state/version precondition stops stale transcript delivery as a confirmed authoring action.
- **IT-125** (`feature-gate`): invalid recording advertises duration=1 but actual ffprobe duration=181; upload returns invalid_audio before Groq.
- **IT-126** (`feature-gate`): provider body contains transcription text longer than 10,000 code points; UI retains the complete editable text and blocks Send with input_limit.

### Transport and security

- **IT-127** (`feature-gate`): send a streamed tRPC body exceeding 512 KiB without trustworthy Content-Length; HTTP wrapper rejects it with 413 before controller dispatch.
- **IT-128** (`feature-gate`): batch six tRPC operations; wrapper rejects batch capacity instead of bypassing per-request bounds.
- **IT-129** (`feature-gate`): capture audio request exceeds 11 MiB HTTP body; the route rejects before fully buffering it.
- **IT-130** (`feature-gate`): inspect application and Mastra test logs after tokens, capability, private snippets and audio are exercised; none of the fixture secrets/content appears.
- **IT-131** (`feature-gate`): known original receipt names an Issue now closed in repository 202; verification still confirms creation and retains the approved snapshot.
- **IT-132** (`feature-gate`): unexpected 307 follows creation POST; no redirect/retry creates a second request and Q becomes uncertain.
- **IT-133** (`feature-gate`): fully received 403 includes organization-policy denial; Q is rejected with organization_approval_needed rather than a generic login failure.
- **IT-134** (`feature-gate`): fully received 403 includes rate-limit headers; Q returns rejected/provider_rate_limited with retry guidance.
- **IT-135** (`feature-gate`): received 201 contains URL https://evil.example/41; Q remains uncertain, never published with that URL.

### US-001 edge cases

- **IT-136** (`task-required`): tasks.byId — given malformed taskId="bad"; perform the story action through real router/controller/database or authenticated HTTP wiring; expect BAD_REQUEST/invalid_input with no foreign task content.
- **IT-137** (`task-required`): tasks.list — given P has zero tasks, then search="inexistente" on a populated P; perform the story action through real router/controller/database or authenticated HTTP wiring; expect empty-history and no-matches are distinct list states.
- **IT-138** (`task-required`): tasks.list — given 31 tasks with page limit=30; perform the story action through real router/controller/database or authenticated HTTP wiring; expect nextCursor reaches the thirty-first task.
- **IT-139** (`task-required`): tasks.list — given member B lacks personal access to private repository 202; perform the story action through real router/controller/database or authenticated HTTP wiring; expect protected titles/conversation are withheld with repository_authorization_needed.
- **IT-140** (`feature-gate`): tasks.list — given U is created after the first stable page was loaded; perform the story action through real router/controller/database or authenticated HTTP wiring; expect refresh includes U without duplicating T.
- **IT-141** (`task-required`): tasks.list — given perform the same authorized read twice; perform the story action through real router/controller/database or authenticated HTTP wiring; expect no task or generation operation is created.
- **IT-142** (`feature-gate`): loadTaskWorkspace — given deep link P/T without a last-project preference; perform the story action through real router/controller/database or authenticated HTTP wiring; expect P membership is established before T content is returned.
- **IT-143** (`task-required`): tasks.byId — given listed draft T is published before reopening; perform the story action through real router/controller/database or authenticated HTTP wiring; expect published snapshot replaces stale draft actions.
- **IT-144** (`qa-release`): TaskDao.page — given 100,000 seeded tasks, enumerate all pages; perform the story action through real router/controller/database or authenticated HTTP wiring; expect all matching authorized IDs remain reachable without a count quota.

### US-002 edge cases

- **IT-145** (`task-required`): tasks.byId — given stored draft contains malformed canonical JSON and HTML-like user text; perform the story action through real router/controller/database or authenticated HTTP wiring; expect invalid_stored_content appears without executing markup.
- **IT-146** (`task-required`): tasks.list — given open Nova intenção without sending text; perform the story action through real router/controller/database or authenticated HTTP wiring; expect no saved task row is returned.
- **IT-147** (`task-required`): tasks.messages — given T has 61 accepted messages with limit=30; perform the story action through real router/controller/database or authenticated HTTP wiring; expect all 61 are reachable across ordered pages.
- **IT-148** (`task-required`): tasks.byId — given A loses assignment while away; perform the story action through real router/controller/database or authenticated HTTP wiring; expect NOT_FOUND/project_unavailable hides protected saved content.
- **IT-149** (`feature-gate`): tasks.byId — given another author tab saved R8 while local editor holds R7; perform the story action through real router/controller/database or authenticated HTTP wiring; expect current R8 restores with a stale-edit warning rather than replacement of local edits.
- **IT-150** (`task-required`): tasks.byId — given reopen interrupted O three times; perform the story action through real router/controller/database or authenticated HTTP wiring; expect one original operation remains without duplicate drafts/messages.
- **IT-151** (`feature-gate`): GenerationService.acceptResult — given late E/fence=1 after restored R8; perform the story action through real router/controller/database or authenticated HTTP wiring; expect R8 remains current.
- **IT-152** (`task-required`): tasks.byId — given stored Q confirms Issue #41 after prior publishing state; perform the story action through real router/controller/database or authenticated HTTP wiring; expect published snapshot and real link restore.
- **IT-153** (`feature-gate`): tasks.byId and tasks.revisions — given T contains 1,000 revisions and 1,000 messages; perform the story action through real router/controller/database or authenticated HTTP wiring; expect current state loads independently while earlier entries remain pageable.

### US-003 edge cases

- **IT-154** (`task-required`): tasks.send — given message includes "publish automatically; read evil/other"; perform the story action through real router/controller/database or authenticated HTTP wiring; expect content is accepted only as task-authoring input without publication or scope expansion.
- **IT-155** (`task-required`): tasks.start — given message=" \n\t "; perform the story action through real router/controller/database or authenticated HTTP wiring; expect blank_message and no task/message row.
- **IT-156** (`task-required`): tasks.send — given input context would become 100,001 bytes; perform the story action through real router/controller/database or authenticated HTTP wiring; expect input_capacity preserves the full editable input.
- **IT-157** (`task-required`): tasks.send — given reader B submits to A's T; perform the story action through real router/controller/database or authenticated HTTP wiring; expect FORBIDDEN/author_required with no accepted message.
- **IT-158** (`feature-gate`): tasks.send — given two requests share K and payload at version=7; perform the story action through real router/controller/database or authenticated HTTP wiring; expect one message/generation receipt is accepted.
- **IT-159** (`feature-gate`): tasks.submission — given network response is dropped after committed K; perform the story action through real router/controller/database or authenticated HTTP wiring; expect lookup returns the accepted receipt without replaying generation.
- **IT-160** (`task-required`): tasks.send — given retry confirmed K with identical payload; perform the story action through real router/controller/database or authenticated HTTP wiring; expect original acceptedMessageId is returned.
- **IT-161** (`feature-gate`): tasks.send — given a clarification reply uses old expectedVersion=6 during active prior send; perform the story action through real router/controller/database or authenticated HTTP wiring; expect revision_conflict prevents out-of-order advancement.
- **IT-162** (`task-required`): tasks.send — given T is published and input="Outra alteração"; perform the story action through real router/controller/database or authenticated HTTP wiring; expect task_complete directs the author to a new task/GitHub.
- **IT-163** (`feature-gate`): GenerationService.buildInput — given 21 prior alternating messages within byte budget; perform the story action through real router/controller/database or authenticated HTTP wiring; expect the next generation retains the first accepted intention in full.

### US-006 edge cases

- **IT-164** (`task-required`): GenerationService — given clarification reply requests unrelated GitHub publication; perform the story action through real router/controller/database or authenticated HTTP wiring; expect agent output stays within clarification/draft responsibility without creation.
- **IT-165** (`task-required`): tasks.send — given blank reply to question in T; perform the story action through real router/controller/database or authenticated HTTP wiring; expect blank_message leaves the original question outstanding.
- **IT-166** (`task-required`): tasks.send — given clarification history would exceed input budget; perform the story action through real router/controller/database or authenticated HTTP wiring; expect input_capacity retains original intention and question.
- **IT-167** (`task-required`): tasks.send — given reader B answers A's question; perform the story action through real router/controller/database or authenticated HTTP wiring; expect author_required preserves T.
- **IT-168** (`feature-gate`): tasks.send — given two tabs answer same question with different keys/version=7; perform the story action through real router/controller/database or authenticated HTTP wiring; expect one current answer succeeds and the second conflicts.
- **IT-169** (`feature-gate`): tasks.byId — given leave and reopen awaiting_clarification T; perform the story action through real router/controller/database or authenticated HTTP wiring; expect same saved question restores with no agent invocation.
- **IT-170** (`task-required`): tasks.send — given retry identical accepted answer K; perform the story action through real router/controller/database or authenticated HTTP wiring; expect original accepted answer/result is reused.
- **IT-171** (`feature-gate`): tasks.send — given answer targets expectedVersion=6 after R7 draft superseded the question; perform the story action through real router/controller/database or authenticated HTTP wiring; expect revision_conflict rejects stale advancement.
- **IT-172** (`task-required`): GenerationService — given refinement from R7 returns needs_clarification; perform the story action through real router/controller/database or authenticated HTTP wiring; expect R7 stays recoverable and preview remains unavailable during clarification.
- **IT-173** (`feature-gate`): GenerationService.buildInput — given many accepted clarification turns remain within 100,000-byte budget; perform the story action through real router/controller/database or authenticated HTTP wiring; expect first intention and latest question/reply are retained.

### US-007 edge cases

- **IT-174** (`feature-gate`): Dev_Control v1 route — given provider cites src/payment.ts with evidence only for src/cart.ts; perform the story action through real router/controller/database or authenticated HTTP wiring; expect invalid_agent_source returns no fabricated draft success.
- **IT-175** (`feature-gate`): IssueContextService — given search returns no files/Issues for identifiable intent; perform the story action through real router/controller/database or authenticated HTTP wiring; expect draft has empty unsupported references and genuine empty activity.
- **IT-176** (`feature-gate`): GenerationService — given provider rejects a below-budget input for context capacity; perform the story action through real router/controller/database or authenticated HTTP wiring; expect provider_capacity preserves the accepted intention and prior R7.
- **IT-177** (`feature-gate`): IssueContextService — given A loses project assignment after generation starts; perform the story action through real router/controller/database or authenticated HTTP wiring; expect new protected lookup/output exposure is blocked.
- **IT-178** (`feature-gate`): GenerationService.acceptResult — given superseded E/fence=1 returns after current E2; perform the story action through real router/controller/database or authenticated HTTP wiring; expect current saved draft remains unchanged.
- **IT-179** (`feature-gate`): TaskWorkerController — given Dev_Control connection fails during generation; perform the story action through real router/controller/database or authenticated HTTP wiring; expect actual retry/failure state retains accepted text and prior R7.
- **IT-180** (`feature-gate`): GenerationService.acceptResult — given repeat the same validated O result; perform the story action through real router/controller/database or authenticated HTTP wiring; expect one saved response/revision exists.
- **IT-181** (`feature-gate`): GitHubContextGateway — given repository 202 is renamed/archived but readable; perform the story action through real router/controller/database or authenticated HTTP wiring; expect evidence retains stable identity while publication stays blocked if archived.
- **IT-182** (`feature-gate`): GitHubContextGateway — given large repository has oversized/binary files and many results; perform the story action through real router/controller/database or authenticated HTTP wiring; expect bounded outcomes disclose unavailable/hasMore without fake full coverage.

### US-008 edge cases

- **IT-183** (`task-required`): SourceRules — given reference URL=https://github.com/evil/other/issues/41 on task repo 202; perform the story action through real router/controller/database or authenticated HTTP wiring; expect unsafe_source/invalid_agent_source prevents trusted source link.
- **IT-184** (`task-required`): tasks.byId — given viewer B lacks own private repository read access; perform the story action through real router/controller/database or authenticated HTTP wiring; expect protected conversation/draft/source content is withheld.
- **IT-185** (`feature-gate`): tasks.byId — given R8 uses F2 while R7 used F1; perform the story action through real router/controller/database or authenticated HTTP wiring; expect current draft is paired only with its corresponding evidence bindings.
- **IT-186** (`task-required`): tasks.byId — given reopen a saved ToolRun three times; perform the story action through real router/controller/database or authenticated HTTP wiring; expect recorded outcomes/timings remain unchanged without rerunning tools.
- **IT-187** (`feature-gate`): IssueContextService — given old task T tool response completes while U is active; perform the story action through real router/controller/database or authenticated HTTP wiring; expect activity is persisted under T/O/E only.
- **IT-188** (`task-required`): SourceRules — given source file at c1 is later deleted from current branch; perform the story action through real router/controller/database or authenticated HTTP wiring; expect c1 provenance remains historical rather than current verification.
- **IT-189** (`feature-gate`): tasks.byId and SourcesPanel — given task has 100 recorded source entries across genuine tools; perform the story action through real router/controller/database or authenticated HTTP wiring; expect all included sources remain attributable and reachable from review.

### US-009 edge cases

- **IT-190** (`task-required`): tasks.saveDraft — given draft includes an unsafe reference URL; perform the story action through real router/controller/database or authenticated HTTP wiring; expect unsafe_source preserves current R7 and local editable values.
- **IT-191** (`task-required`): tasks.saveDraft and tasks.preview — given optional collections are []; perform the story action through real router/controller/database or authenticated HTTP wiring; expect saved/preview content omits empty optional headings.
- **IT-192** (`task-required`): tasks.saveDraft — given rendered body would exceed 60,000 UTF-8 bytes; perform the story action through real router/controller/database or authenticated HTTP wiring; expect input_limit preserves full editor value.
- **IT-193** (`task-required`): tasks.saveDraft — given administrator B tries to change A's T; perform the story action through real router/controller/database or authenticated HTTP wiring; expect author_required keeps R7 current.
- **IT-194** (`feature-gate`): tasks.saveDraft — given two tabs save from R7/version=7 with different content; perform the story action through real router/controller/database or authenticated HTTP wiring; expect one R8 wins and second returns revision_conflict.
- **IT-195** (`task-required`): tasks.saveDraft — given repeat confirmed save K with same draft; perform the story action through real router/controller/database or authenticated HTTP wiring; expect original saved revision is returned without R9 duplication.
- **IT-196** (`task-required`): tasks.saveDraft — given T is generating/publishing/uncertain/published; perform the story action through real router/controller/database or authenticated HTTP wiring; expect state precondition prevents pending/completed content replacement.

### US-010 edge cases

- **IT-197** (`task-required`): Dev_Control v1 scoped tools — given refinement requests implementing code or accessing evil/other; perform the story action through real router/controller/database or authenticated HTTP wiring; expect no implementation/publication/cross-repository tool is available.
- **IT-198** (`task-required`): tasks.send — given refinement message="   "; perform the story action through real router/controller/database or authenticated HTTP wiring; expect blank_message preserves saved R7.
- **IT-199** (`task-required`): tasks.send — given full history plus manually edited R7 would exceed budget; perform the story action through real router/controller/database or authenticated HTTP wiring; expect input_capacity rejects before acceptance without dropping R7 edits.
- **IT-200** (`task-required`): tasks.send — given reader B asks to refine T; perform the story action through real router/controller/database or authenticated HTTP wiring; expect author_required prevents generation.
- **IT-201** (`feature-gate`): tasks.resolveRefinement — given proposal base R7 arrives after current revision R8; perform the story action through real router/controller/database or authenticated HTTP wiring; expect revision_conflict retains R8 and the recoverable proposal.
- **IT-202** (`feature-gate`): GenerationService — given refinement timeout from saved R7; perform the story action through real router/controller/database or authenticated HTTP wiring; expect R7 remains the confirmed review source with actual failure state.
- **IT-203** (`task-required`): tasks.send — given repeat confirmed refinement K; perform the story action through real router/controller/database or authenticated HTTP wiring; expect one accepted request/response exists.
- **IT-204** (`feature-gate`): tasks.send — given refinement requested before prior Save settles with stale version; perform the story action through real router/controller/database or authenticated HTTP wiring; expect revision_conflict prevents generation from stale content.
- **IT-205** (`task-required`): tasks.send — given T is publishing/uncertain/published; perform the story action through real router/controller/database or authenticated HTTP wiring; expect operation_active/task_complete blocks refinement.
- **IT-206** (`feature-gate`): GenerationService.buildInput — given T has many refinements and current manually edited R7; perform the story action through real router/controller/database or authenticated HTTP wiring; expect full accepted context and current R7 are included within budget.

### US-011 edge cases

- **IT-207** (`task-required`): tasks.publish — given required objective is blank; perform the story action through real router/controller/database or authenticated HTTP wiring; expect invalid_draft blocks GitHub POST with objective field error.
- **IT-208** (`task-required`): tasks.publish — given T has no saved current revision; perform the story action through real router/controller/database or authenticated HTTP wiring; expect preview_not_ready keeps publication unavailable.
- **IT-209** (`task-required`): GitHubIssueGateway.create — given fully received 422 body rejection or 429 throttling; perform the story action through real router/controller/database or authenticated HTTP wiring; expect Q returns to review with specific rejected reason and saved snapshot.
- **IT-210** (`task-required`): tasks.publish — given caller B is reader or A lost assignment; perform the story action through real router/controller/database or authenticated HTTP wiring; expect author_required/project_unavailable prevents dispatch.
- **IT-211** (`feature-gate`): tasks.publish — given two tabs approve same R7/version=7 with same K; perform the story action through real router/controller/database or authenticated HTTP wiring; expect one logical attempt and at most one creation POST.
- **IT-212** (`feature-gate`): GitHubIssueGateway.create — given request reaches GitHub but response resets; perform the story action through real router/controller/database or authenticated HTTP wiring; expect Q becomes publication_uncertain without blind replay.
- **IT-213** (`task-required`): tasks.publish — given repeat approved K after confirmed #41; perform the story action through real router/controller/database or authenticated HTTP wiring; expect existing receipt returns and no second Issue is created.
- **IT-214** (`feature-gate`): tasks.publish — given active Save/generation/clarification exists; perform the story action through real router/controller/database or authenticated HTTP wiring; expect fresh ready revision precondition blocks approval.
- **IT-215** (`task-required`): GitHubIssueGateway.eligibility — given repository becomes archived, disabled, unavailable or access-restricted before dispatch; perform the story action through real router/controller/database or authenticated HTTP wiring; expect specific destination/access blocking reason preserves T without retargeting.
- **IT-216** (`feature-gate`): PublicationService — given publish T in P and U in P2 concurrently; perform the story action through real router/controller/database or authenticated HTTP wiring; expect each receipt remains linked to its own author/revision/repository.

### US-012 edge cases

- **IT-217** (`feature-gate`): PublicationRecoveryService — given known receipt for Q names repository 303 rather than 202; perform the story action through real router/controller/database or authenticated HTTP wiring; expect Q remains uncertain rather than linking that Issue.
- **IT-218** (`feature-gate`): PublicationRecoveryService — given empty/delayed repository listing after response loss; perform the story action through real router/controller/database or authenticated HTTP wiring; expect Q stays uncertain; no assertion of noncreation.
- **IT-219** (`feature-gate`): tasks.reconcilePublication — given GitHub verification returns 429; perform the story action through real router/controller/database or authenticated HTTP wiring; expect uncertainty remains with delay/retry guidance and no creation POST.
- **IT-220** (`feature-gate`): tasks.reconcilePublication — given A personal token expires/revokes before protected check; perform the story action through real router/controller/database or authenticated HTTP wiring; expect repository_authorization_needed retains Q uncertainty.
- **IT-221** (`feature-gate`): PublicationRecoveryService — given two workers/tabs check same Q receipt; perform the story action through real router/controller/database or authenticated HTTP wiring; expect one confirmed result converges without creation.
- **IT-222** (`feature-gate`): TaskWorkerController — given restart after remote creation but before any response is durable; perform the story action through real router/controller/database or authenticated HTTP wiring; expect Q restores uncertainty rather than dispatching again.
- **IT-223** (`feature-gate`): tasks.reconcilePublication — given Q already has a durable confirmed receipt; perform the story action through real router/controller/database or authenticated HTTP wiring; expect existing published outcome is returned idempotently.
- **IT-224** (`feature-gate`): PublicationRecoveryService — given matching original 201 response arrives after verification begins; perform the story action through real router/controller/database or authenticated HTTP wiring; expect same Q resolves to published with no replacement attempt.
- **IT-225** (`feature-gate`): GitHubIssueGateway.verify — given original Q receipt identifies #41 now closed/edited; perform the story action through real router/controller/database or authenticated HTTP wiring; expect creation still counts and original approved snapshot remains.
- **IT-226** (`feature-gate`): PublicationRecoveryService — given two uncertain tasks have identical titles/body and candidate #41; perform the story action through real router/controller/database or authenticated HTTP wiring; expect title similarity does not attribute #41 to either attempt.

### US-013 edge cases

- **IT-227** (`task-required`): tasks.byId — given stored receipt URL points to evil.example rather than GitHub repo 202; perform the story action through real router/controller/database or authenticated HTTP wiring; expect result validation error replaces unsafe outbound link.
- **IT-228** (`task-required`): tasks.byId — given Q has no verified Issue identity/URL; perform the story action through real router/controller/database or authenticated HTTP wiring; expect no published success or placeholder Issue appears.
- **IT-229** (`task-required`): tasks.byId — given published #41 exists locally and Issue live-refresh is unavailable while current repository read access is verified; perform the story action through real router/controller/database or authenticated HTTP wiring; expect confirmed snapshot/link remain available without a live Issue fetch.
- **IT-230** (`task-required`): tasks.byId — given current member loses personal private repository access; perform the story action through real router/controller/database or authenticated HTTP wiring; expect saved published content is protected.
- **IT-231** (`feature-gate`): tasks.byId — given return from GitHub after app/service restart; perform the story action through real router/controller/database or authenticated HTTP wiring; expect confirmed #41 restores with no creation side effect.
- **IT-232** (`task-required`): tasks.byId — given open saved result repeatedly; perform the story action through real router/controller/database or authenticated HTTP wiring; expect no additional GitHub creation occurs.
- **IT-233** (`feature-gate`): loadTaskWorkspace — given open direct P/T result link before project entry; perform the story action through real router/controller/database or authenticated HTTP wiring; expect project/repository authorization precedes snapshot display.
- **IT-234** (`task-required`): tasks.byId — given external #41 is closed/deleted/transferred after known creation; perform the story action through real router/controller/database or authenticated HTTP wiring; expect historical snapshot is retained without recreation.
- **IT-235** (`feature-gate`): tasks.list and tasks.byId — given many published tasks across P and P2; perform the story action through real router/controller/database or authenticated HTTP wiring; expect each actual number/URL remains scoped to its task/project.

### US-014 edge cases

- **IT-236** (`feature-gate`): tasks.byId and tasks.send — given forged project/task pairing P/U or supplied authorUserId=B; perform the story action through real router/controller/database or authenticated HTTP wiring; expect scope/schema rejection returns no unauthorized content.
- **IT-237** (`feature-gate`): tasks.byId — given no authenticated user or P assignment; perform the story action through real router/controller/database or authenticated HTTP wiring; expect session/project access guidance appears before protected content.
- **IT-238** (`feature-gate`): TaskAccessService — given GitHub authorization check is rate-limited/unavailable; perform the story action through real router/controller/database or authenticated HTTP wiring; expect affected protected action fails closed.
- **IT-239** (`feature-gate`): tasks.byId — given GitHub access without Flow Dev assignment, then assignment without private GitHub access; perform the story action through real router/controller/database or authenticated HTTP wiring; expect neither state returns protected T content.
- **IT-240** (`feature-gate`): PublicationService — given membership removed between preflight and dispatch gate; perform the story action through real router/controller/database or authenticated HTTP wiring; expect new dispatch is blocked; a separately confirmed existing creation still records its receipt.
- **IT-241** (`feature-gate`): tasks.send — given replay previously valid K after assignment revocation; perform the story action through real router/controller/database or authenticated HTTP wiring; expect current access check rejects receipt replay.
- **IT-242** (`feature-gate`): tasks.publish — given reader B calls direct mutation without viewing reader screen; perform the story action through real router/controller/database or authenticated HTTP wiring; expect author_required blocks it identically.
- **IT-243** (`feature-gate`): tasks.byId and tasks.send — given A loses membership but B retains access to T; perform the story action through real router/controller/database or authenticated HTTP wiring; expect B can consult read-only and cannot take over authorship.
- **IT-244** (`feature-gate`): tasks.list — given seed tasks in ten projects and query each as assigned/unassigned users; perform the story action through real router/controller/database or authenticated HTTP wiring; expect lists/filters return only currently authorized project content.

### US-015 edge cases

- **IT-245** (`feature-gate`): normalizeDestination and OAuth callback — given returnTo=https://evil.example or malformed P/T path; perform the story action through real router/controller/database or authenticated HTTP wiring; expect safe /projects return without external redirect.
- **IT-246** (`feature-gate`): tasks.preview — given identity login exists but repository credential is absent; perform the story action through real router/controller/database or authenticated HTTP wiring; expect repository_authorization_needed explains separate consent.
- **IT-247** (`feature-gate`): RepositoryAuthorizationService — given GitHub refresh/access lookup is rate-limited; perform the story action through real router/controller/database or authenticated HTTP wiring; expect retry guidance retains task/draft and never reports empty repository.
- **IT-248** (`feature-gate`): RepositoryAuthorizationService — given OAuth response profile=999 while signed-in GitHub ID=501; perform the story action through real router/controller/database or authenticated HTTP wiring; expect identity_mismatch rejects mismatched authorization.
- **IT-249** (`feature-gate`): tasks.byId — given authorization completed in another tab for A; perform the story action through real router/controller/database or authenticated HTTP wiring; expect current access recheck restores same T/R7 without author change.
- **IT-250** (`feature-gate`): RepositoryOAuthController.cancel — given authorization consent flow is canceled; perform the story action through real router/controller/database or authenticated HTTP wiring; expect task remains in its prior saved state.
- **IT-251** (`feature-gate`): OAuth return to P/T — given same completed callback/return is revisited; perform the story action through real router/controller/database or authenticated HTTP wiring; expect no message/generation/approval replay occurs.
- **IT-252** (`feature-gate`): OAuth task return — given consent returns for P/T after browser switched to P2/U; perform the story action through real router/controller/database or authenticated HTTP wiring; expect only original authorized P/T or safe catalog destination is used.
- **IT-253** (`feature-gate`): RepositoryAccessService — given repository 202 renames/transfers and old path is reused by 303; perform the story action through real router/controller/database or authenticated HTTP wiring; expect stable 202 is resolved and no substitute repository is accepted.
- **IT-254** (`feature-gate`): RepositoryOAuthController — given A can access hundreds of repositories; perform the story action through real router/controller/database or authenticated HTTP wiring; expect recovery remains bound to T repository 202 without auto-selection.

### Additional state, privacy and session boundaries

- **IT-255** (`feature-gate`): tasks.submission — K is unused and current authorization succeeds; returns exactly {status:"not_accepted"} without saving a command.
- **IT-256** (`feature-gate`): Dev_Control v1 conversation — one earlier accepted user turn failed generation, then another accepted user turn follows it; both texts remain ordered in the v1 request without an invented assistant message.
- **IT-257** (`feature-gate`): tasks.resolveRefinement — A discards pending proposal O at current R7; R7 remains current and proposal no longer blocks review.
- **IT-258** (`feature-gate`): TranscriptionController — a provider timeout releases capture C and drops all server audio buffers; no audio is present in database/task history.
- **IT-259** (`feature-gate`): TranscriptionController — provider success persists no raw audio on database/filesystem; only submitted transcript text later becomes a task message.
- **IT-260** (`feature-gate`): TranscriptionController — caller cancels C while request is processing; no late text is applied after cancellation and provider input is never logged.
- **IT-261** (`feature-gate`): POST /api/task-dictation/preflight — action=cancel for own C returns {released:true}; a repeated cancel returns the same harmless released result.
- **IT-262** (`feature-gate`): POST /api/task-dictation/preflight — action=cancel for another user B capture returns author_required without releasing B lease.
- **IT-263** (`feature-gate`): TaskAccessService — task creation/capture reads actual sessionId from the verified Better Auth response; a client-supplied sessionId field is rejected by schema.
- **IT-264** (`feature-gate`): tasks.reconcilePublication — original approval session expired, but A now has a new valid session and current repository access; the attributable original Q receipt resolves without reapproving or redispatching.
- **IT-265** (`feature-gate`): TaskWorkerController — shutdown releases/ceases generation lease heartbeat while leaving fenced Q publication recovery-only; successor never sends Q again.
- **IT-266** (`feature-gate`): Task HTTP and transcription route — after required read access fails temporarily, a new protected response exposes no private content; already displayed confirmed snapshot is not relabeled as absent publication.


## End-to-End Tests


### US-016 edge cases

- **E2E-001** (`qa-release`): Workspace — given viewport=320px with zoom=200% and long title/source path; perform the story action through real public browser UI wiring; expect essential controls/links remain reachable without clipping.
- **E2E-002** (`qa-release`): Workspace — given mobile orientation/keyboard dismissal/reconnect after accepted message; perform the story action through real public browser UI wiring; expect confirmed work and current operation status remain visible.
- **E2E-003** (`qa-release`): Workspace — given long task/source lists on narrow viewport with keyboard traversal; perform the story action through real public browser UI wiring; expect all included content is reachable in logical reading order.

### US-001 complete journey

- **E2E-004** (`feature-gate`): B signs in, opens P history, filters by A, pages to T, and opens it; the real saved task displays A with read-only conversation/draft.

### US-002 complete journey

- **E2E-005** (`feature-gate`): A submits intention, receives clarification, answers, saves manual R7 and refreshes after service restart; the same confirmed messages/current revision restore.

### US-003 complete journey

- **E2E-006** (`feature-gate`): A types intention, clicks Enviar, loses only the acceptance response, and uses recovery; one saved intention appears in the same task.

### US-004 complete journey

- **E2E-007** (`feature-gate`): A opens Nova intenção, explicitly starts the microphone, stops and cancels distinct capture sessions; visible controls reflect recording and typing remains usable.

### US-005 complete journey

- **E2E-008** (`feature-gate`): A types "Corrigir checkout", dictates "ao remover item", stops, corrects transcript and clicks Enviar; accepted history contains only the final edited text.

### US-006 complete journey

- **E2E-009** (`feature-gate`): A sends "Corrigir pedido.", receives one minimal question, answers with the identifiable failure, and reaches draft review in the same task.

### US-007 complete journey

- **E2E-010** (`feature-gate`): A sends an identifiable cart bug in P; real Issue Author v1 with bounded GitHub fixture evidence returns a canonical draft referencing only P repository.

### US-008 complete journey

- **E2E-011** (`feature-gate`): A opens retrieved src/cart.ts:10 and Issue #41 provenance in the sources view, edits its statement and saves; the changed claim is visibly author-edited.

### US-009 complete journey

- **E2E-012** (`feature-gate`): A edits objective and clears optional collections, saves, and opens preview; displayed title/body exactly reflect the confirmed revision with no empty optional headings.

### US-010 complete journey

- **E2E-013** (`feature-gate`): A saves context "Preservar regra fiscal", sends a focused title refinement, reviews the proposal and applies only title; current saved context remains unchanged.

### US-011 complete journey

- **E2E-014** (`feature-gate`): A reviews current preview/destination/GitHub identity and explicitly clicks Criar Issue; real publication wiring with controlled GitHub returns actual #41/link.

### US-012 complete journey

- **E2E-015** (`feature-gate`): A approves, the GitHub stub accepts but loses the response, and A refreshes; Verificando publicação blocks a second creation until a matching original receipt resolves it.

### US-013 complete journey

- **E2E-016** (`feature-gate`): B opens published T, views its approved snapshot and follows Abrir no GitHub; the destination is the saved actual Issue URL and no authoring controls appear.

### US-014 complete journey

- **E2E-017** (`feature-gate`): B/admin opens A's task, views read-only content, then assignment is revoked; protected content/actions become unavailable and B cannot publish.

### US-015 complete journey

- **E2E-018** (`feature-gate`): A opens saved T without repository consent, follows separate OAuth, returns to same T/R7; recovery does not generate or publish automatically.

### US-016 complete journey

- **E2E-019** (`feature-gate`): A uses keyboard on a narrow viewport to type, review, open sources and publish; labeled controls, focus return and status announcements stay usable.

### Real microphone browser matrix

- **E2E-020** (`qa-release`): on actual current desktop Chrome, Edge, Firefox, Safari, Android Chrome and iOS Safari, use explicit permission → pt-BR capture → Stop → editable correction → manual Send; every environment accepts the final text.

### Real microphone interruption matrix

- **E2E-021** (`qa-release`): on actual Android Chrome/iOS Safari, interrupt capture with backgrounding/orientation/navigation and return; recording remains stopped and no abandoned transcript enters another task.

### pt-BR transcription quality

- **E2E-022** (`qa-release`): dictate the fixed fixture phrase "Corrigir o total do carrinho no checkout usando Drizzle" with a real microphone, correct any terms and send; reviewed text is accepted and raw audio is absent from history.

### Live provider publication and OAuth

- **E2E-023** (`qa-release`): dedicated sandbox user authorizes the repository OAuth App, uses live Issue Author/context and creates one explicitly reviewed sandbox Issue; returned number/URL match the real GitHub artifact.

### Live provider recovery rejection

- **E2E-024** (`qa-release`): dedicated sandbox repository has Issues disabled or author consent is revoked; Criar Issue shows specific recovery guidance and preserves the saved draft without creation.

### Accessibility release tour

- **E2E-025** (`qa-release`): use keyboard and screen reader with reduced motion, desktop zoom=200% and phone keyboard; history, source/diff drawers, capture state and published result have logical focus/announcements.

### Groq retention deployment

- **E2E-026** (`qa-release`): inspect configured Groq organization Data Controls for transcription ZDR and application/proxy/trace configuration; the actual settings match first-use remote-processing disclosure and do not retain raw audio.

### Repository scale release gate

- **E2E-027** (`qa-release`): browse/search a dedicated 100,000-task dataset and a large repository under provider limits; all pages remain reachable and measured DB list/detail p95 stays below 500 ms.

## Coverage Demands Audit

- PRD and full `_user_stories.md` were present; no journey had to be inferred from an absent catalog.
- Every story and every individual EC has its own populated matrix row; AC rows provide additional traceability.
- Every TechSpec component/interface has happy and error unit coverage. All public procedures, HTTP paths, the worker command and cross-service message contracts have explicit matrix entries.
- Final-only dictation does not emit partial streaming transcripts; interruption cases prove incomplete capture/processing stays unconfirmed. Full device support is proven only by the release microphone matrix.
- Publication verification intentionally cannot infer noncreation from empty search or force-retry an uncertain attempt. Cases preserve that limitation and separately cover attributable original/late receipts.
- Task-required coverage remains narrowly assignable. Broad races, coordinated sibling/provider wiring, browser/device checks, live credentials and full user journeys are later gates.
- cy-create-tasks assigns each task-required ID exactly once and records feature-gate/qa-release IDs as workflow gates. Keep IDs stable on subsequent updates; mark withdrawals in place.

## Architecture Decision Records

- [ADR-001: Create one reviewed GitHub Issue from each task](adrs/adr-001.md)
- [ADR-002: Share task history while reserving changes to the author](adrs/adr-002.md)
- [ADR-003: Provide editable dictation on desktop and mobile](adrs/adr-003.md)
- [ADR-004: Ground generation in the selected project's GitHub repository](adrs/adr-004.md)
- [ADR-005: Use Groq Whisper V3 Turbo for reviewed dictation](adrs/adr-005.md)
- [ADR-006: Persist task revisions and execute durable operations in PostgreSQL](adrs/adr-006.md)
- [ADR-007: Bind the existing Issue Author to an operation-scoped context broker](adrs/adr-007.md)
- [ADR-008: Dispatch publication once and preserve unresolved uncertainty](adrs/adr-008.md)
