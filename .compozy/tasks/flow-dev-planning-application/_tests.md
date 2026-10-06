# Test Specification: Continue Published Issues into Planning

Canonical test contract for the complete feature. Companion to [_techspec.md](_techspec.md).
Derived from [_user_stories.md](_user_stories.md), including all 110 edge cases, and the TechSpec's components and contracts. All cases below are **specified, not executed**. IDs are permanent once task files reference them.

## Strategy

- Frameworks: Vitest for API rules/HTTP adapters, Vitest + Testing Library for components/hooks, actual PostgreSQL for transactions/migrations, Playwright for public UI journeys.
- Unit fakes sit only at I/O boundaries: DAOs/database drivers, external fetch, time, browser transport/storage. Do not replace business services with mocks in controller tests. DAO unit cases exercise deterministic input/receipt/claim helpers; actual SQL behavior is proved by integration cases.
- Integration uses real router/controller/service/DAO wiring with disposable PostgreSQL and external HTTP fixtures. Use the real tRPC formatter for failure-shape cases; batching retains existing tRPC semantics.
- Task-required cases run with the task owning the behavior. Feature-gate covers assembled journeys and actual staging Dev Control contracts. QA/release covers browser matrices, accessibility tours, operational measurements, and provider retention.
- E2E operates through the UI with accessible locators. Seed isolated starting state; do not assert private React state, depend on another test, or use production accounts/services.
- Exact names in cases identify proposed implementation targets from the TechSpec. Named pure helpers belong to their listed component, not new layers. Parameterized cases use independent fixtures for each listed input, endpoint or actor.
- Run `pnpm --filter @flow-dev/api test`, `pnpm --filter @flow-dev/api test:integration`, `pnpm --filter web test`, and `pnpm --filter web test:e2e` with case-owning file filters during tasks. Feature completion also requires `pnpm lint`, `pnpm typecheck`, and `pnpm build`.
- Integration requires `TEST_DATABASE_URL` for disposable PostgreSQL with database-create permission. Register the generated migration in `packages/api/test/database.ts`; SQL constraints cannot be validated through only an in-memory DAO.
- E2E requires isolated `E2E_DATABASE_URL`, `E2E_AUTH_SECRET`, `E2E_BASE_URL`, app and worker processes, current auth fixtures and deterministic external HTTP boundaries. Chromium is configured today; configure extra browser projects before QA runs them.
- Real Dev Control gates use staging-only `PLANNING_BASE_URL`/`PLANNING_API_KEY`. Its owner must provide failure injection, observable deduplication and auditable absence of downstream writes. Missing deployment/fixtures leaves those gates **not run/blocked**, never satisfied by mocks.
- The canonical story catalog is present; no missing-story coverage gap exists. Coverage specifies required evidence, not a claim that implementation or external integration already exists.

### Concrete shared fixtures

| Alias | Value / meaning |
| --- | --- |
| P / P2 | Project UUIDs `10000000-0000-4000-8000-000000000001` / `10000000-0000-4000-8000-000000000002`. |
| T / Q | Task UUIDs `20000000-0000-4000-8000-000000000001` / `20000000-0000-4000-8000-000000000002`. T belongs to P; Q belongs to P unless a cross-project fixture explicitly assigns it P2. |
| A / B / C | Author, project reader and nonauthor administrator UUIDs with prefix `30000000-0000-4000-8000-` and twelve-digit suffixes 1, 2, 3. Independent active sessions and personal grants unless the case revokes them. |
| O / O2 | Operation UUIDs with prefix `40000000-0000-4000-8000-` and twelve-digit suffixes 1, 2. |
| D | Decision UUID `50000000-0000-4000-8000-000000000001`. |
| K | Request key `60000000-0000-4000-8000-000000000001`; distinct concurrent keys use subsequent padded suffixes. |
| Publication | Attempt `70000000-0000-4000-8000-000000000001`, created, repositoryId `42`, node ID `R_42`, retained label `team/flow`, Issue ID `501`, number 5, URL `https://github.com/team/flow/issues/5`. |
| Snapshot | Title `Adicionar filtro de tarefas`; body `## Objetivo\nFiltrar tarefas por autora.\n`, retained verbatim. Awaiting T starts at version 7. |
| Assessment | Recommendation tech_spec, complexity medium, summary `Adicionar filtro de tarefas`, reasons [`Altera o contrato de consulta`], uncertainties []. Nonempty variant: [`Definir paginação`]. |
| Review | D version 1, selectedRoute tech_spec, source AI, status review; current task version is read after settlement. |
| Time | Controlled UTC clock starts `2026-10-05T15:00:00.000Z`. Compare stored approval instants, not locale formatting. Execution IDs are valid UUIDs. |

Limit fixtures satisfy unrelated validation rules. Byte limits use UTF-8 serialization; character limits use Unicode code points, including a supplementary-plane character to distinguish them from UTF-16 length. SQL fault injection happens at the driver/connection boundary, not in a mocked PlanningService. Secrets are test-only sentinels.

## Coverage Matrix

Every story and edge case has its own row. C01–C12 correspond to the TechSpec component table.

| Source | Behavior | Task-required | Feature-gate | QA/release |
| --- | --- | --- | --- | --- |
| US-001 | Continuation in the same task | UT-005, IT-001, IT-002 | E2E-001, E2E-002 | — |
| US-001.EC-1 | Reject mismatched task/project | IT-054 | E2E-025 | — |
| US-001.EC-2 | Require complete confirmed publication | UT-006, IT-015 | — | — |
| US-001.EC-3 | Keep long identity inspectable | — | — | E2E-019 |
| US-001.EC-4 | Show reader without start controls | UT-064, IT-055 | — | — |
| US-001.EC-5 | Converge on active planning | IT-004, IT-012 | — | — |
| US-001.EC-6 | Restore after post-publication close | — | E2E-002 | — |
| US-001.EC-7 | Opening never starts analysis | IT-068 | E2E-001 | — |
| US-001.EC-8 | Wait for publication confirmation | UT-007, IT-015 | — | — |
| US-001.EC-9 | Reopen current review/approval | IT-013 | E2E-027 | — |
| US-001.EC-10 | Navigate zero/many/historical tasks | IT-052, IT-089 | E2E-018 | — |
| US-002 | Explicit snapshot analysis | UT-015, IT-003, IT-070 | E2E-003 | — |
| US-002.EC-1 | Reject unrelated scope/commands | IT-054, IT-061 | — | — |
| US-002.EC-2 | Reject absent or unusable snapshot | IT-015 | — | — |
| US-002.EC-3 | Bound queue/input without truncation | IT-010, IT-016 | E2E-026 | — |
| US-002.EC-4 | Require current session/project/repository access | IT-053, IT-056 | — | — |
| US-002.EC-5 | Accept at most one raced start | IT-004 | — | — |
| US-002.EC-6 | Resolve a lost start response | IT-008, IT-079 | — | — |
| US-002.EC-7 | Replay accepted start | IT-005 | — | — |
| US-002.EC-8 | Reject prepublication start | UT-007, IT-015 | — | — |
| US-002.EC-9 | Retain successful decision | IT-013 | — | — |
| US-002.EC-10 | Associate concurrent items correctly | IT-069 | IT-033 | — |
| US-003 | Durable resumption | IT-027 | IT-022, E2E-004, E2E-029 | — |
| US-003.EC-1 | Reject invalid navigation reference | IT-054 | E2E-025 | — |
| US-003.EC-2 | Never approve an unsaved decision | UT-081 | — | — |
| US-003.EC-3 | Back off limited progress reads | UT-056 | E2E-017 | — |
| US-003.EC-4 | Deny revoked returning reader | IT-057 | E2E-022 | — |
| US-003.EC-5 | Converge on another tab's approval | UT-051 | E2E-029 | — |
| US-003.EC-6 | Recover service restart | — | IT-022 | — |
| US-003.EC-7 | Refresh resumes same operation | IT-068 | — | — |
| US-003.EC-8 | Ignore older state responses | UT-051 | — | — |
| US-003.EC-9 | Fence obsolete completions | IT-023, IT-081 | — | — |
| US-003.EC-10 | Navigate history while other items run | — | E2E-004, E2E-018 | — |
| US-004 | Failed-analysis recovery | IT-017, IT-024, IT-025 | E2E-005 | — |
| US-004.EC-1 | Reject stale/wrong failure reference | IT-019 | — | — |
| US-004.EC-2 | Reject missing rationale or unknown route | UT-002, IT-028 | — | — |
| US-004.EC-3 | Bound output/timeout/rate-limit failure | UT-036, UT-037, IT-090 | — | — |
| US-004.EC-4 | Restored access requires explicit retry | IT-030 | E2E-016, E2E-005 | — |
| US-004.EC-5 | Serialize retries and completion | IT-018, IT-020 | — | — |
| US-004.EC-6 | Resolve lost retry response | IT-008, IT-079 | — | — |
| US-004.EC-7 | Replay same logical retry | IT-018 | — | — |
| US-004.EC-8 | Resolve active work before retry | IT-020, IT-080 | — | — |
| US-004.EC-9 | No retry after successful decision | IT-020 | — | — |
| US-004.EC-10 | Isolate recovery across failed tasks | IT-091 | — | — |
| US-005 | Human View and uncertainties | UT-057, UT-058, UT-060 | E2E-003, E2E-008 | E2E-019, E2E-020, E2E-031 |
| US-005.EC-1 | Render hostile content inertly | UT-059 | — | — |
| US-005.EC-2 | Reject required omissions; explain empty uncertainties | UT-002, UT-058, IT-028 | — | — |
| US-005.EC-3 | Keep long accepted text inspectable | UT-061 | — | E2E-019 |
| US-005.EC-4 | Give readers same explanation without actions | UT-064 | E2E-014 | — |
| US-005.EC-5 | Preserve original rationale across override | IT-034 | E2E-009 | — |
| US-005.EC-6 | Report failed decision load | — | E2E-017 | — |
| US-005.EC-7 | Reopening does not reanalyze | IT-068 | — | — |
| US-005.EC-8 | Deep link shows running, not empty approval | UT-078, UT-081 | — | — |
| US-005.EC-9 | Keep approved explanation/uncertainties | UT-060 | E2E-008 | — |
| US-005.EC-10 | Handle maximum collections readably | UT-061 | — | E2E-019 |
| US-006 | Saved route and provenance | UT-008, UT-009, IT-034, IT-035 | E2E-006, E2E-007 | — |
| US-006.EC-1 | Reject unsupported routes | IT-061 | — | — |
| US-006.EC-2 | Require selected choice | UT-063 | — | — |
| US-006.EC-3 | Preserve saved state under limits | IT-060, UT-047 | — | — |
| US-006.EC-4 | Deny reader/admin override | IT-055 | — | — |
| US-006.EC-5 | Reject stale competing selection | IT-037, IT-040 | — | — |
| US-006.EC-6 | Reconcile uncertain save before approval | — | E2E-010 | — |
| US-006.EC-7 | Saving same route is equivalent | IT-036 | — | — |
| US-006.EC-8 | Require real analysis before selection | IT-045 | — | — |
| US-006.EC-9 | Forbid post-approval override | IT-044 | — | — |
| US-006.EC-10 | Keep selections item-specific | IT-069 | E2E-018 | — |
| US-007 | Exact final human approval | UT-073, IT-038, IT-039, IT-042 | E2E-006, E2E-008, E2E-011 | — |
| US-007.EC-1 | Reject wrong route/decision/task | IT-046, IT-061, UT-011 | — | — |
| US-007.EC-2 | Require valid saved decision | IT-045 | — | — |
| US-007.EC-3 | Never show unsaved approval success | IT-060, IT-092 | E2E-030 | — |
| US-007.EC-4 | Deny revoked/nonauthor approval | IT-055, IT-056 | — | — |
| US-007.EC-5 | Serialize approval versus selection | IT-040, IT-041 | — | — |
| US-007.EC-6 | Recover lost approval response | — | E2E-011 | — |
| US-007.EC-7 | Preserve original approval identity/time | IT-042 | — | — |
| US-007.EC-8 | Reject approval during analysis/failure | IT-045 | — | — |
| US-007.EC-9 | Approved state defeats stale mutation | IT-013, IT-044 | — | — |
| US-007.EC-10 | Display each item's own approval | — | E2E-027 | — |
| US-008 | Truthful lifecycle | UT-065, UT-066, UT-067 | E2E-012 | — |
| US-008.EC-1 | Do not invent unknown lifecycle | UT-065 | — | — |
| US-008.EC-2 | Await without fake execution | UT-045 | — | — |
| US-008.EC-3 | Show current action independently of history | — | E2E-023 | — |
| US-008.EC-4 | Readers see no author action | UT-064 | E2E-014 | — |
| US-008.EC-5 | Reject regressing progress responses | UT-051 | E2E-029 | — |
| US-008.EC-6 | Retain last confirmed update honestly | UT-053 | E2E-017 | — |
| US-008.EC-7 | Do not duplicate milestones | UT-067 | — | — |
| US-008.EC-8 | Artifact/conversation navigation keeps state | — | E2E-013 | — |
| US-008.EC-9 | Failure preserves published milestone | UT-066 | E2E-005 | — |
| US-008.EC-10 | Expose per-entry lifecycle | IT-052 | E2E-018 | — |
| US-009 | Distinct artifacts and retained context | UT-068, UT-070, IT-065, IT-067 | E2E-013 | — |
| US-009.EC-1 | Suppress untrusted Issue URL | UT-069 | E2E-021 | — |
| US-009.EC-2 | Show only existing artifacts | UT-045, UT-081 | — | — |
| US-009.EC-3 | Keep long snapshot/history accessible | — | E2E-013 | E2E-019 |
| US-009.EC-4 | Protect direct artifact/conversation reads | IT-056 | E2E-022 | — |
| US-009.EC-5 | Route edits never rewrite Issue snapshot | IT-065 | — | — |
| US-009.EC-6 | Distinguish load failure without substitution | UT-052 | E2E-017 | — |
| US-009.EC-7 | Opening creates no external/local work | IT-065, IT-068 | — | — |
| US-009.EC-8 | Understand artifact before full conversation | — | E2E-013 | — |
| US-009.EC-9 | Retain snapshot across edits/closure/archive | IT-067 | — | — |
| US-009.EC-10 | Isolate artifacts across many tasks | — | E2E-013, E2E-018 | — |
| US-010 | Shared authorized read-only visibility | UT-064, IT-055, IT-056 | E2E-014, E2E-022 | — |
| US-010.EC-1 | Hide cross-scope existence/content | IT-054 | — | — |
| US-010.EC-2 | Await honestly without recommendation | UT-045, UT-064 | — | — |
| US-010.EC-3 | Preserve read-only navigation under limits | IT-052, IT-060 | — | — |
| US-010.EC-4 | Deny direct nonauthor mutations | IT-055 | — | — |
| US-010.EC-5 | Refresh to author's approved result | — | E2E-014 | — |
| US-010.EC-6 | Require session recovery | — | E2E-016 | — |
| US-010.EC-7 | Reads have no mutation effects | IT-068 | — | — |
| US-010.EC-8 | Deep links enforce same access | — | E2E-022 | — |
| US-010.EC-9 | Read-only ownership survives final/failure states | UT-064 | E2E-014 | — |
| US-010.EC-10 | Follow many authors without mixing state | — | E2E-018 | — |
| US-011 | Administrator visibility without bypass | IT-055, IT-056, IT-058, IT-093, IT-094 | IT-082, E2E-015 | — |
| US-011.EC-1 | Validate admin resource scope | IT-054, IT-046 | — | — |
| US-011.EC-2 | Admin reads create no decision | UT-045, UT-064 | — | — |
| US-011.EC-3 | Apply normal limits/navigation | IT-052, IT-060 | — | — |
| US-011.EC-4 | Service credentials never replace personal access | IT-056 | E2E-015 | — |
| US-011.EC-5 | Deny admin mutation racing author approval | IT-093 | — | — |
| US-011.EC-6 | Require expired admin session recovery | — | E2E-016 | — |
| US-011.EC-7 | Repeated denials transfer no ownership | IT-055 | — | — |
| US-011.EC-8 | Enforce direct-link checks | — | E2E-022 | — |
| US-011.EC-9 | Respect role removal/final approval | IT-058, IT-044 | IT-082 | — |
| US-011.EC-10 | Isolate multi-project admin inspection | IT-094 | — | — |

### Components, interfaces and public boundaries

| Source | Behavior | Task-required | Feature-gate | QA/release |
| --- | --- | --- | --- | --- |
| C01 / PlanningAssessment, PlanningCommand, PlanningSelection | Eligibility, limits, hashes, route/source and review invariants | UT-001, UT-002, UT-003, UT-004, UT-005, UT-006, UT-007, UT-008, UT-009, UT-010, UT-011, UT-012, UT-013, UT-014, IT-015, IT-016 | — | — |
| C02 / TaskPlanningController and PlanningService | Authorized transaction orchestration; exact approval; safe failures | UT-015, UT-016, UT-017, UT-018, UT-021, UT-022, UT-073, UT-074, UT-077, UT-078, UT-079, IT-003, IT-038, IT-055, IT-092 | — | — |
| C03 / TaskPlanningDao and PlanningReceipt | Canonical receipts, atomic locks, persisted state and immutability | UT-019, UT-020, UT-021, UT-022, IT-004, IT-005, IT-006, IT-007, IT-034, IT-040, IT-047, IT-048, IT-049 | — | — |
| C04 / TaskPlanningWorkerDao and PlanningClaim | Input construction, claim predicates, fenced settlement and deadlines | UT-012, UT-014, UT-023, UT-024, UT-025, UT-026, UT-076, IT-021, IT-023, IT-026, IT-027, IT-080, IT-081 | — | — |
| C05 / Worker controller, scheduler and tasks:worker | Durable orchestration, auth, fair shared pool, logs | UT-027, UT-028, UT-029, UT-030, UT-031, UT-075, IT-030, IT-031, IT-032, IT-086, IT-088 | IT-022, IT-033 | — |
| C06 / PlanningGateway, PlanningInput and PlanningEnvelope | Exact HTTP transport, bounded validation and provider replay | UT-032, UT-033, UT-034, UT-035, UT-036, UT-037, UT-038, UT-039, UT-080, IT-070, IT-029 | IT-071, IT-072, IT-073, IT-074, IT-075 | IT-076 |
| C07 / taskPlanning router, schemas and errors | Input/output/error contracts and protected transport | UT-040, UT-041, UT-042, IT-053, IT-054, IT-059, IT-060, IT-061, IT-062, IT-083 | — | — |
| C08 / Task read DAO and planningDtoMapper | Coherent detail, historical projection, compact history | UT-043, UT-044, UT-045, UT-081, IT-002, IT-051, IT-052, IT-063, IT-089 | — | — |
| C09 / usePlanningActions and planningCommandState | Explicit actions, uncertain recovery and approval gating | UT-046, UT-047, UT-048, UT-049, UT-050 | E2E-006, E2E-009, E2E-010, E2E-011 | — |
| C10 / Workspace/history reducers, taskReads and polling | Monotonic scoped reads, access clearing, independent conversation | UT-051, UT-052, UT-053, UT-054, UT-055, UT-056, UT-071, UT-072 | E2E-004, E2E-016, E2E-017, E2E-023, E2E-029 | — |
| C11 / PlanningStage, Human View, selector and timeline | Readable fields, three choices, real status and read-only finality | UT-057, UT-058, UT-059, UT-060, UT-061, UT-062, UT-063, UT-064, UT-065, UT-066, UT-067 | E2E-012 | E2E-019, E2E-020 |
| C12 / PublishedResult, SourcesPanel and publicationModel | Trusted Issue links, immutable snapshot and truthful sources | UT-068, UT-069, UT-070, IT-065, IT-067 | E2E-013, E2E-021 | — |
| Database schema / migration | SQL-only behavior; integration is the cheapest valid proof of actual constraints | IT-001, IT-047, IT-048, IT-049, IT-050, IT-078 | — | — |
| tasks.byId | Success and session/scope/repository/rate/corrupt/unknown failure shapes | IT-002, IT-051, IT-053, IT-054, IT-056, IT-059, IT-060, IT-062, IT-063 | — | — |
| tasks.list / messages / revisions | Existing query success/scoping retained; no effects on planning | IT-052, IT-053, IT-054, IT-056, IT-060, IT-068, IT-089 | E2E-013 | — |
| tasks.planning.start | Receipt and all admission/configuration/state/input/access/conflict failures | IT-003, IT-004, IT-005, IT-006, IT-007, IT-010, IT-011, IT-012, IT-013, IT-014, IT-015, IT-016, IT-053, IT-054, IT-055, IT-056, IT-059, IT-060, IT-061, IT-062, IT-064, IT-085 | — | — |
| tasks.planning.retry | Receipt and current-failure/active/finality/access/input/conflict failures | IT-017, IT-018, IT-019, IT-020, IT-015, IT-016, IT-053, IT-054, IT-055, IT-056, IT-060, IT-061, IT-062, IT-064, IT-085, IT-091 | — | — |
| tasks.planning.selectRoute | Receipt, no-op, stale/final/missing/wrong-decision and shared failures | IT-034, IT-035, IT-036, IT-037, IT-044, IT-045, IT-046, IT-053, IT-054, IT-055, IT-056, IT-060, IT-061, IT-062, IT-083 | — | — |
| tasks.planning.approve | Receipt, exact repetition, race, rollback and all rejection shapes | IT-038, IT-039, IT-040, IT-041, IT-042, IT-043, IT-045, IT-046, IT-053, IT-054, IT-055, IT-056, IT-060, IT-061, IT-062, IT-083, IT-092 | — | — |
| tasks.planning.submission | Accepted/not_accepted, input/scope/author/access failures and pending race | UT-017, IT-008, IT-009, IT-053, IT-054, IT-055, IT-056, IT-061, IT-079, IT-084 | — | — |
| POST /flow-dev/planning/v1 | Success envelope, every documented remote error, real replay and isolation | UT-032, UT-033, UT-034, UT-035, UT-036, UT-037, UT-038, UT-039, UT-080, IT-070, IT-090 | IT-071, IT-072, IT-073, IT-074, IT-075 | IT-076 |
| tasks:worker | Existing CLI restart, mixed work, claim isolation and exhaustion | UT-027, UT-028, UT-029, UT-030, UT-031, IT-024, IT-025, IT-026, IT-032, IT-087 | IT-022, IT-033 | — |
| Compatibility / deployment / operations | Published guards, real capacity, browser matrix and release behavior | IT-001, IT-010, IT-011, IT-032, IT-065, IT-066, IT-086, IT-088 | — | IT-077, E2E-024, E2E-028 |

## Unit Tests

### Domain, orchestration, contracts and workspace components

- **UT-001** (`task-required`, happy): **parsePlanningAssessment** — given recommendation `tech_spec`, complexity `medium`, summary `Adicionar filtro de tarefas`, reasons [`Altera o contrato de consulta`] and uncertainties [], returns that exact assessment.
- **UT-002** (`task-required`, error): **parsePlanningAssessment** — given each missing required field, extra `activity` field, route `tasks`, complexity `critical`, empty reasons, blank summary or blank reason, throws `planning_invalid_output` (table-driven invalid fixtures).
- **UT-003** (`task-required`, boundary): **parsePlanningAssessment** — given a 4,000-code-point summary, 20 reasons and 20 uncertainties of 2,000 code points each, accepts all text without truncation.
- **UT-004** (`task-required`, boundary): **parsePlanningAssessment** — given 4,001 summary code points, 21 reasons, 21 uncertainties, or a 2,001-code-point entry, throws `planning_invalid_output` for the exceeded field.
- **UT-005** (`task-required`, happy): **planningEligibility** — given T's created publication with complete stable identity and nonblank retained snapshot, returns `canStart=true` for both a historical and newly published task.
- **UT-006** (`task-required`, error): **planningEligibility** — given an absent created publication, missing Issue ID/URL, Issue number 0 or blank retained body, returns `canStart=false, reason=publication_required`.
- **UT-007** (`task-required`, state): **planningEligibility** — given task status `draft_ready`, `publishing` or `publication_uncertain`, returns `canStart=false, reason=publication_required`.
- **UT-008** (`task-required`, happy): **selectionSource** — given recommendation `tech_spec` and selection `prd`, returns `HUMAN_OVERRIDE`.
- **UT-009** (`task-required`, state): **selectionSource** — given recommendation and selection both `tech_spec`, returns `AI`.
- **UT-010** (`task-required`, error): **assertPlanningReview** — given decision D version 3 but expected version 2, throws `planning_conflict` even if both route strings are `tech_spec`.
- **UT-011** (`task-required`, error): **assertPlanningReview** — given the matching version but reviewed route `prd` while saved route is `tech_spec`, throws `planning_conflict`.
- **UT-012** (`task-required`, happy): **buildPlanningInput** — given T's created publication, returns only the specified correlation fields and exact publication snapshot; snapshot hash equals SHA-256 of the specified fixed-order UTF-8 JSON object.
- **UT-013** (`task-required`, boundary): **buildPlanningInput** — given an exactly 256-KiB serialized request satisfying field bounds, returns the full request.
- **UT-014** (`task-required`, error): **buildPlanningInput** — given a 256-KiB-plus-one-byte request, a 257-code-point title, or a 65,537-code-point body, throws `planning_input_limit` without shortening the source.
- **UT-015** (`task-required`, happy): **TaskPlanningController.start** — given authorized author A, eligible T version 7 and unused key K, returns a PlanningReceipt with T, accepted operation O and version 8.
- **UT-016** (`task-required`, error): **TaskPlanningController.start** — given reader B targeting T, throws `FORBIDDEN` with `author_required` before any planning write.
- **UT-017** (`task-required`, error): **TaskPlanningController.submission** — given task Q but a receipt associated with T, throws `NOT_FOUND` with `task_unavailable`.
- **UT-018** (`task-required`, error): **TaskPlanningController.start** — given missing PLANNING_BASE_URL or PLANNING_API_KEY, returns `INTERNAL_SERVER_ERROR / planning_unconfigured` before enqueue.
- **UT-019** (`task-required`, happy): **planningPayloadHash** — given the same complete command serialized from differently ordered input keys, returns the same canonical hash.
- **UT-020** (`task-required`, error): **parsePlanningReceipt** — given a persisted receipt missing taskId or containing version 0, throws `invalid_stored_content`.
- **UT-021** (`task-required`, idempotency): **PlanningService.selectRoute** — given the current route `tech_spec` and matching versions, returns the current selection version without a decision mutation.
- **UT-022** (`task-required`, error): **PlanningService.retry** — given failedOperationId O but T's latest failed operation is O2, throws `planning_not_failed`.
- **UT-023** (`task-required`, happy): **isCurrentPlanningClaim** — given matching active operation/execution/fence/owner with an unexpired lease, returns true.
- **UT-024** (`task-required`, ordering): **isCurrentPlanningClaim** — given fence 1 while the current fence is 2, an expired lease or a failed operation, returns false.
- **UT-025** (`task-required`, error): **planningRetryDelay** — given third dispatch already consumed, returns a terminal failure instead of another nextRunAt.
- **UT-026** (`task-required`, boundary): **planningRetryDelay** — given HTTP 429 Retry-After 600, returns a 60-second wait; Retry-After 1 returns 5 seconds.
- **UT-027** (`task-required`, happy): **TaskPlanningWorkerController.tick** — given an authorized current claim and valid gateway result, invokes complete with that claim and envelope.
- **UT-028** (`task-required`, error): **TaskPlanningWorkerController.tick** — given a predispatch expired session, records `planning_access_revoked` with zero provider calls.
- **UT-029** (`task-required`, error): **TaskPlanningWorkerController.tick** — given heartbeat failure while HTTP is pending, aborts the gateway request and never invokes successful settlement.
- **UT-030** (`task-required`, ordering): **TaskWorkerController.tick** — given all three kinds continuously eligible, successive scheduling turns visit generate, publish and plan before repeating a kind.
- **UT-031** (`task-required`, boundary): **TaskWorkerController.runPool** — given eight queued jobs and deferred gateways, observes at most two in-flight handlers in one process.
- **UT-032** (`task-required`, happy): **DevControlPlanningGateway.analyze** — given the valid fixture and HTTP 200, returns the assessment after checking all correlation fields.
- **UT-033** (`task-required`, error): **DevControlPlanningGateway.analyze** — given a response with wrong operationId, executionId, taskId or inputHash, throws `planning_execution_mismatch`.
- **UT-034** (`task-required`, error): **DevControlPlanningGateway.analyze** — given invalid JSON, empty body, unknown protocol version or unsupported route, throws `planning_invalid_output`.
- **UT-035** (`task-required`, boundary): **DevControlPlanningGateway.analyze** — given a valid response padded with JSON whitespace to exactly 256 KiB, accepts it.
- **UT-036** (`task-required`, error): **DevControlPlanningGateway.analyze** — given a streamed 256-KiB-plus-one-byte response, cancels its reader and throws `planning_invalid_output`.
- **UT-037** (`task-required`, boundary): **DevControlPlanningGateway.analyze** — given no completed response body at 240,000ms, aborts with `planning_timeout`.
- **UT-038** (`task-required`, error): **DevControlPlanningGateway.analyze** — given HTTP 409/422, 401/403, 429 or 408/500, maps respectively to `planning_invalid_output`, `planning_unconfigured`, `planning_rate_limited`, or `planning_provider_unavailable`, without copying response text.
- **UT-039** (`task-required`, error): **DevControlPlanningGateway.analyze** — given a 302 response, rejects it without following the redirect or forwarding the service key.
- **UT-040** (`task-required`, happy): **planning schemas** — given valid start/retry/selection/approval/submission fixtures, preserve only the documented fields with exact route/action enums.
- **UT-041** (`task-required`, error): **planning schemas** — given invalid UUIDs, version 0/fraction/unsafe integer, missing route or extra actor/publication/approval fields, rejects the request with Zod field issues.
- **UT-042** (`task-required`, error): **mapPlanningError** — given each domain reason in the TechSpec error table, returns its exact tRPC code and safe reason; an unknown database exception maps to `INTERNAL_SERVER_ERROR / service_unavailable`.
- **UT-043** (`task-required`, happy): **planningDtoMapper** — given a saved review D, returns ISO times and all named assessment/selection fields with no provider credentials or raw result.
- **UT-044** (`task-required`, error): **planningDtoMapper** — given status review but no saved decision, returns `invalid_stored_content` instead of an empty approvable decision.
- **UT-045** (`task-required`, state): **planningDtoMapper** — given published T with no plan, projects `awaiting`, decision null and no fabricated operation.
- **UT-046** (`task-required`, happy): **usePlanningActions** — given a successful route-save receipt, refreshes authoritative detail before showing the saved route.
- **UT-047** (`task-required`, error): **usePlanningActions** — given a lost mutation response, enters uncertain state and disables approval until submission/detail reconciliation.
- **UT-048** (`task-required`, idempotency): **planningCommandState** — given a pending key and submission `not_accepted`, retains the exact key/payload for a resend instead of minting a new key.
- **UT-049** (`task-required`, error): **planningCommandState** — given a route save conflict, clears any success claim and requires review of the refreshed saved selection.
- **UT-050** (`task-required`, state): **usePlanningActions** — given dirty route `prd` while saved route is `tech_spec`, exposes approval disabled.
- **UT-051** (`task-required`, ordering): **workspaceReducer** — given confirmed T version 12 then loaded T version 11, keeps version 12.
- **UT-052** (`task-required`, ordering): **useTaskWorkspace** — given navigation from T to Q before T's read completes, keeps Q selected and never renders T's returned artifact.
- **UT-053** (`task-required`, error): **workspaceReducer** — given a transient network failure with a confirmed review, retains that review labeled as the last confirmed state.
- **UT-054** (`task-required`, error): **workspaceReducer** — given session_required, access_revoked or repository_authorization_needed after a successful read, clears protected snapshot content and pauses reads.
- **UT-055** (`task-required`, boundary): **pollInterval** — given in_progress planning returns 2,000ms; given awaiting/review/failed/approved returns 15,000ms while visible.
- **UT-056** (`task-required`, error): **useTaskWorkspace** — given rate limit retryAfterSeconds 45, makes no next scheduled read before 45 seconds.
- **UT-057** (`task-required`, happy): **PlanningDecisionView** — given D, renders named pt-BR fields for complexity, recommendation, selection, reasons, uncertainties and Dev Control attribution.
- **UT-058** (`task-required`, happy): **PlanningDecisionView** — given uncertainties [], renders `Nenhuma pendência informada` without a readiness claim.
- **UT-059** (`task-required`, error): **PlanningDecisionView** — given summary `<script>alert(1)</script>` and reason `[link](javascript:alert(1))`, renders inert escaped text without a script or active hostile link.
- **UT-060** (`task-required`, state): **PlanningDecisionView** — given approved D with uncertainties [`Definir paginação`], keeps that exact uncertainty visible without an acknowledgement control.
- **UT-061** (`task-required`, boundary): **PlanningDecisionView** — given the maximum accepted assessment text, keeps every reason/uncertainty reachable in the accessible content.
- **UT-062** (`task-required`, happy): **PlanningRouteSelector** — given a review, exposes exactly the three supported radio choices and an explicit save action.
- **UT-063** (`task-required`, error): **PlanningRouteSelector** — given no selected radio value, displays validation feedback without a mutation.
- **UT-064** (`task-required`, state): **PlanningStage** — given reader B or nonauthor administrator C, renders author attribution and read-only explanation without enabled mutation controls.
- **UT-065** (`task-required`, error): **PlanningStage** — given unknown lifecycle value `implementing`, renders refresh-required feedback with approval unavailable.
- **UT-066** (`task-required`, state): **PlanningTimeline** — given a failed plan and confirmed publication, marks only planning as failed and retains published Issue status.
- **UT-067** (`task-required`, idempotency): **PlanningTimeline** — given the same review snapshot delivered twice, renders one produced-recommendation milestone.
- **UT-068** (`task-required`, happy): **PublishedResult** — given a trusted Issue URL and snapshot, exposes the Issue identity and rendered snapshot with raw Markdown inside optional labeled details.
- **UT-069** (`task-required`, error): **publishedIssueUrl** — given retained repo `team/flow`, Issue 5 and URL `https://evil.example/team/flow/issues/5` or mismatched Issue number, returns null.
- **UT-070** (`task-required`, state): **SourcesPanel** — given planning v1 with no lookup activity, labels the publication snapshot as the planning basis without adding tool calls, timings or citations.
- **UT-071** (`task-required`, error): **taskReads** — given a successful detail read but failed conversation fetch, leaves the correct decision usable with a conversation-specific recovery error.
- **UT-072** (`task-required`, ordering): **historyState.observe** — given history entry T version 12 and a later observation of version 11, keeps version 12's planning status.
- **UT-073** (`task-required`, state): **PlanningService.approve** — given current D with source AI or HUMAN_OVERRIDE and unresolved uncertainties, approves the saved route without changing assessment or uncertainties.
- **UT-074** (`task-required`, error): **PlanningService.selectRoute** — given approved D, throws `planning_approved` before a decision write.
- **UT-075** (`task-required`, error): **TaskPlanningWorkerController.tick** — given gateway success followed by a database settlement failure, does not emit `planning.saved` or claim that review was persisted.
- **UT-076** (`task-required`, boundary): **planningRetryDelay** — given 239,999ms remaining in the operation deadline before dispatch, returns terminal `planning_deadline` instead of starting HTTP.
- **UT-077** (`task-required`, error): **PlanningService.start** — given `review` or `approved`, throws `planning_exists`; given `failed`, throws `planning_retry_required`.
- **UT-078** (`task-required`, error): **PlanningService.approve** — given no decision while analysis is running or failed, throws `planning_not_ready`.
- **UT-079** (`task-required`, error): **PlanningService.selectRoute** — given no saved decision, throws `planning_not_ready` rather than creating a manually chosen decision.
- **UT-080** (`task-required`, error): **DevControlPlanningGateway.analyze** — given a network rejection before response headers, throws safe `planning_provider_unavailable` without exposing the cause to the browser.
- **UT-081** (`task-required`, state): **planningDtoMapper** — given an in_progress task with no saved decision, returns the actual queued/running operation with decision=null and canApprove=false.

## Integration Tests

### Persistence, protected transport, workers and external contracts

- **IT-001** (`task-required`): **Migration** — given prefeature historical T with a created publication, apply the generated migration; its task ID, author, repository IDs, publication snapshot and conversation remain byte-for-byte unchanged.
- **IT-002** (`task-required`): **tasks.byId** — given the migrated historical T with personal access, returns planning.status=awaiting and canStart=true without inserting an operation.
- **IT-003** (`task-required`): **tasks.planning.start → worker → tasks.byId** — given A and T version 7, submit K, run one real wired planning tick against the HTTP fixture and read T; one saved review decision is associated with T's publication attempt.
- **IT-004** (`task-required`): **tasks.planning.start** — given two concurrent keys at version 7 on T, returns one accepted receipt and one CONFLICT; PostgreSQL contains exactly one active plan for T.
- **IT-005** (`task-required`): **tasks.planning.start** — given two concurrent submissions with the same K and payload, returns identical receipts backed by one operation.
- **IT-006** (`task-required`): **tasks.planning.start** — given an accepted K, reuse K with another expectedVersion or task ID; returns CONFLICT / request_key_reused without another operation.
- **IT-007** (`task-required`): **tasks.planning.start** — given a database failure before receipt commit, rollback leaves T awaiting with no queued plan or accepted receipt.
- **IT-008** (`task-required`): **tasks.planning.submission** — given the response to an accepted start/retry/selectRoute/approve was lost, returns status=accepted with that action's exact stored receipt for A/T/K (independent fixtures per action).
- **IT-009** (`task-required`): **tasks.planning.submission** — given an unused K, returns status=not_accepted without writes.
- **IT-010** (`task-required`): **Planning admission** — given five active plans for A, another start returns TOO_MANY_REQUESTS / planning_capacity with retryAfterSeconds=30.
- **IT-011** (`task-required`): **Planning admission** — given 99 global active plans and two concurrent authors starting eligible tasks, only one is accepted; the active count is 100.
- **IT-012** (`task-required`): **tasks.planning.start** — given an active plan for T and a different key, returns CONFLICT / operation_active.
- **IT-013** (`task-required`): **tasks.planning.start** — given T in review or approved, returns CONFLICT / planning_exists while preserving D.
- **IT-014** (`task-required`): **tasks.planning.start** — given T failed, returns CONFLICT / planning_retry_required.
- **IT-015** (`task-required`): **tasks.planning.start / retry** — given an absent or unusable confirmed snapshot, returns PRECONDITION_FAILED / publication_required without provider traffic.
- **IT-016** (`task-required`): **tasks.planning.start / retry** — given retained content exceeding the specified input budget, returns BAD_REQUEST / planning_input_limit without modifying it.
- **IT-017** (`task-required`): **tasks.planning.retry** — given current failed operation O and matching versions, creates exactly one new O2, retaining O as failed and the original publication.
- **IT-018** (`task-required`): **tasks.planning.retry** — given repeated same-key retry requests, returns the same O2 receipt.
- **IT-019** (`task-required`): **tasks.planning.retry** — given O is not the latest failure, returns CONFLICT / planning_not_failed.
- **IT-020** (`task-required`): **tasks.planning.retry** — given an active plan or a successful decision, returns respectively operation_active or planning_exists without accepting another plan.
- **IT-021** (`task-required`): **Planning worker claim** — given two real workers and one queued plan, only one claim is returned with fence 1 and a 60-second lease.
- **IT-022** (`feature-gate`): **tasks:worker restart** — given a running plan whose worker terminates and lease expires, restart the CLI against the same DB/provider; reclaim uses the same operation ID and a fresh execution/fence, then saves one review.
- **IT-023** (`task-required`): **Planning settlement** — given a fence-1 response after fence-2 reclaim, completes neither the decision nor the current operation; T retains fence-2's state.
- **IT-024** (`task-required`): **Planning worker retry** — given two HTTP 500 replies then a valid response, one operation receives dispatches after the 5s/15s waits and yields one review.
- **IT-025** (`task-required`): **Planning worker exhaustion** — given three transient failures, persists failed status with cleared activeOperationId and no decision.
- **IT-026** (`task-required`): **Planning deadline sweep** — given queued or running plan accepted 900,000ms earlier, marks it failed with planning_deadline on the next worker sweep.
- **IT-027** (`task-required`): **Planning settlement rollback/recovery** — given a provider result followed by a simulated DB disconnect at commit, reclaim replays the provider key and eventually stores one decision with no partial review.
- **IT-028** (`task-required`): **Planning worker invalid output** — given fixture HTTP 200 missing reasons or with route tasks, saves planning_invalid_output and no decision; publication remains created.
- **IT-029** (`task-required`): **Planning worker correlation** — given HTTP 200 with another task's inputHash, saves planning_execution_mismatch without a decision.
- **IT-030** (`task-required`): **Planning worker authorization** — given project/repository access or initiating session revoked before dispatch, persists planning_access_revoked with no outbound planning HTTP request.
- **IT-031** (`task-required`): **Planning worker settlement after session expiry** — given authorized dispatch followed by session expiry, accepts the valid current-fence response into durable review; a subsequent expired-session read returns UNAUTHORIZED.
- **IT-032** (`task-required`): **Existing operation isolation** — given queued generate, publish and plan records, generation/publication DAOs never claim or settle the plan record.
- **IT-033** (`feature-gate`): **Existing worker pool** — given mixed eligible queues and slow fixture replies, all three operation kinds make progress without more than two concurrent handlers.
- **IT-034** (`task-required`): **tasks.planning.selectRoute** — given D recommends tech_spec at version 1, save prd with current task version; byId returns selection prd, source HUMAN_OVERRIDE, selection version 2 and unchanged assessment.
- **IT-035** (`task-required`): **tasks.planning.selectRoute** — given D overridden to prd, save tech_spec; returns source AI and increments selection version while remaining review.
- **IT-036** (`task-required`): **tasks.planning.selectRoute** — given identical already-saved route and current versions, stores a receipt without changing task/decision versions.
- **IT-037** (`task-required`): **tasks.planning.selectRoute** — given two competing selections from decision version 1, only one succeeds; the other returns CONFLICT / planning_conflict.
- **IT-038** (`task-required`): **tasks.planning.approve** — given D under review with an unresolved uncertainty and matching reviewed route/version, byId returns approved with author A and one stored approval time.
- **IT-039** (`task-required`): **tasks.planning.approve** — given a route changed after the displayed version, rejects approval with planning_conflict even when it changed back to the same route.
- **IT-040** (`task-required`): **Approval / route race** — given concurrent approval and route change with the same versions, produces exactly one coherent winner; no approval records a route other than its submitted reviewedRoute.
- **IT-041** (`task-required`): **tasks.planning.approve** — given two concurrent equal approvals, both resolve to the same approved outcome without different approver/time values.
- **IT-042** (`task-required`): **tasks.planning.approve** — given approved D, repeat using the old task version, same frozen selection version and route but a new key; returns the original approval without updating its time.
- **IT-043** (`task-required`): **tasks.planning.approve** — given approved D but a different reviewedRoute or selection version, returns CONFLICT / planning_conflict.
- **IT-044** (`task-required`): **tasks.planning.selectRoute** — given approved D, returns CONFLICT / planning_approved and retains the selected route.
- **IT-045** (`task-required`): **tasks.planning.selectRoute / approve** — given no decision during awaiting/running/failed, returns CONFLICT / planning_not_ready.
- **IT-046** (`task-required`): **tasks.planning.selectRoute / approve** — given D belongs to Q but input targets T, returns NOT_FOUND / decision_unavailable.
- **IT-047** (`task-required`): **Decision constraints** — given a second decision for T or a cross-task publication/operation FK, PostgreSQL rejects the insert.
- **IT-048** (`task-required`): **Decision immutability trigger** — given review D, a direct SQL update to original recommendation, reasons or producing execution is rejected.
- **IT-049** (`task-required`): **Decision immutability trigger** — given approved D, direct SQL selection/approval changes or delete are rejected.
- **IT-050** (`task-required`): **Planning schema checks** — given a nonpublished task with planning_status, invalid route/source combination or partially filled approval fields, PostgreSQL rejects the write.
- **IT-051** (`task-required`): **Atomic workspace read** — given a route transaction committing between internal reads, tasks.byId returns a coherent precommit or postcommit task/decision version pair.
- **IT-052** (`task-required`): **tasks.list** — given 61 historical published tasks with mixed planning states, existing cursor pagination returns each ID once with its own compact planning status.
- **IT-053** (`task-required`): **tasks.byId / list / messages / revisions / planning procedures** — given no valid session, each protected endpoint returns UNAUTHORIZED / session_required without protected content (one parameterized case per endpoint).
- **IT-054** (`task-required`): **tasks.byId / list / messages / revisions / planning procedures** — given an unknown project or a task from another project, each applicable endpoint returns NOT_FOUND with the existing unavailable shape and no cross-scope content.
- **IT-055** (`task-required`): **Planning mutation / submission authorization** — given B or nonauthor administrator C, repeated calls to each planning mutation and submission return FORBIDDEN / author_required without writes.
- **IT-056** (`task-required`): **Repository authorization boundary** — given A/B/C with project visibility but missing personal repository authorization, every protected read/planning command returns PRECONDITION_FAILED / repository_authorization_needed.
- **IT-057** (`task-required`): **Project access revocation** — given B's membership removed after a successful read, the next scoped read returns the existing unavailable response without content.
- **IT-058** (`task-required`): **Administrative role removal** — given C's admin role removed and no project membership, the next scoped read returns the existing project-unavailable response.
- **IT-059** (`task-required`): **Repository access failures** — given repository resolution reports destination_unavailable, identity_mismatch or issue_permission_denied, applicable reads/actions return PRECONDITION_FAILED with that safe reason.
- **IT-060** (`task-required`): **Repository rate limit** — given current access lookup returns retryAfterSeconds=45, reads/actions return TOO_MANY_REQUESTS / provider_rate_limited with 45.
- **IT-061** (`task-required`): **Planning request schemas through /api/trpc** — given each procedure's malformed UUID/version, unsupported action/route or forbidden extra field, returns BAD_REQUEST with Zod field issues and no write.
- **IT-062** (`task-required`): **Planning error boundary** — given an unknown database exception during each command/read, returns INTERNAL_SERVER_ERROR / service_unavailable without driver text.
- **IT-063** (`task-required`): **Corrupt persisted decision** — given review status with missing or invalid assessment content seeded outside supported writes, tasks.byId returns INTERNAL_SERVER_ERROR / invalid_stored_content.
- **IT-064** (`task-required`): **Planning configuration at acceptance** — given missing configuration, start/retry returns INTERNAL_SERVER_ERROR / planning_unconfigured without a new operation.
- **IT-065** (`task-required`): **Publication immutability** — given successful planning, route save and approval, the created publication row's snapshot/Issue identity remains identical and the GitHub write fixture records zero calls.
- **IT-066** (`task-required`): **Published authoring regression** — given T in each planning state, existing send/saveDraft/retryGeneration/publish paths cannot edit or republish its confirmed Issue.
- **IT-067** (`task-required`): **Archived repository / live Issue changes** — given personal read access and an archived repository whose live Issue is edited/closed, planning sends the original retained snapshot and preserves its association.
- **IT-068** (`task-required`): **Read-only observation** — given repeated tasks.byId, messages, revisions, list and submission reads, task/decision versions, operations and approvals do not change.
- **IT-069** (`task-required`): **Cross-item isolation** — given T and Q running with different snapshots and reordered provider replies, each saved decision is attached only to its own publication and operation.
- **IT-070** (`task-required`): **Planning HTTP request contract** — given a queued authorized plan, the HTTP fixture receives the documented path, bearer service key, idempotency key and snapshot-only JSON; no GitHub token, session ID or conversation is sent.
- **IT-071** (`feature-gate`): **Real Dev Control v1** — against dedicated staging, send a valid retained snapshot; receive the exact validated success envelope and save it through the real Flow Dev gateway/worker.
- **IT-072** (`feature-gate`): **Real Dev Control replay** — against staging, send concurrent same-operation/same-hash requests with distinct execution IDs; receive an identical assessment with each caller's own correlation.
- **IT-073** (`feature-gate`): **Real Dev Control conflicting key** — against staging, reuse operation ID with changed content/hash; receive HTTP 409 with no replacement assessment.
- **IT-074** (`feature-gate`): **Real Dev Control failures** — against staging's provider-owned failure fixture, exercise 401/403, 422, 429 Retry-After and 5xx; the real gateway yields the documented safe failure shape (separate parameterized fixtures).
- **IT-075** (`feature-gate`): **Real Dev Control isolation** — against a provider-owned auditable staging fixture, analyze a snapshot containing instructions to create a GitHub comment or execute a route; verify no downstream/GitHub write was dispatched.
- **IT-076** (`qa-release`): **Dev Control replay retention** — use a provider-controlled clock/retention environment to replay a completed operation after seven days; the stored assessment is still identical.
- **IT-077** (`qa-release`): **Read performance** — seed 10,000 tasks and run 20 concurrent authorized readers with deterministic external-access latency; record local projection p95 below 200ms without loading unselected decision bodies.
- **IT-078** (`task-required`): **Planning transaction guards** — given a publication whose outcome is uncertain or a producing operation of kind generate, application settlement rejects the decision association even when foreign keys exist.
- **IT-079** (`task-required`): **Pending receipt race** — hold a start transaction before commit, read submission=not_accepted, then resend the identical key/payload; after release, one accepted operation and one receipt exist.
- **IT-080** (`task-required`): **Expired-fence settlement** — given a valid response after its lease/deadline has expired but before another claim, settlement makes no decision or review transition.
- **IT-081** (`task-required`): **Obsolete failure isolation** — given O failed then O2 succeeded, a delayed failure from O cannot change O2's review status or lastError.
- **IT-082** (`feature-gate`): **Administrator-as-author journey** — given administrator A is also T's author, start planning, choose a route and approve through the public API; the approved artifact is readable but subsequent override is rejected.
- **IT-083** (`task-required`): **Planning reason transport** — given a controller rejection for every reason in the documented error table, /api/trpc returns data.reason/code and retryAfterSeconds where specified, using the real formatter.
- **IT-084** (`task-required`): **Scoped submission replay after revocation** — given an accepted K then removed repository authorization, submission is denied before returning the stored receipt.
- **IT-085** (`task-required`): **Planning acceptance version** — given T version 7 but expectedVersion 6, start/retry returns CONFLICT / planning_conflict without adding work.
- **IT-086** (`task-required`): **Planning audit logging** — given one approval transaction rolled back then one committed, captured logger output has exactly one planning.approved event.
- **IT-087** (`task-required`): **Planning configuration after acceptance** — given an already accepted plan whose provider configuration disappears before dispatch, the worker durably fails it with planning_unconfigured.
- **IT-088** (`task-required`): **Planning log redaction** — given provider/authentication failures containing sentinel snapshot and credential values, captured structured logs contain none of those sentinels.
- **IT-089** (`task-required`): **tasks.list empty history** — given an authorized project with zero tasks, returns items=[] and nextCursor=null without fabricated awaiting items.
- **IT-090** (`task-required`): **Worker failure shape propagation** — given invalid/oversize output, absolute HTTP timeout or repeated provider 429/5xx responses in separate HTTP fixtures, byId exposes only the documented terminal safe planning reason after the bounded retry policy.
- **IT-091** (`task-required`): **Per-item recovery isolation** — given failed T and Q, retry and complete T; Q's failed operation, reason and publication remain unchanged.
- **IT-092** (`task-required`): **Approval rollback** — given a DB failure after the proposed approval update but before receipt commit, rollback leaves D in review with null approval identity/time.
- **IT-093** (`task-required`): **Administrator / author race** — given A approves while nonauthor C attempts a route mutation, C is denied and D retains A's exact approved selection.
- **IT-094** (`task-required`): **Administrative multi-project reads** — given C can read P and P2 through personal access, list/open tasks in each project; every decision is associated with its own project/repository/author and no cross-project detail is returned.

## End-to-End Tests

### Complete user journeys and release checks

- **E2E-001** (`feature-gate`): **Historical continuation (US-001)** — open Issues and select historical T → see Issue #5 and `Analisar próxima etapa` → refresh and return → the same eligible task is present without automatic analysis.
- **E2E-002** (`feature-gate`): **New publication continuation (US-001)** — create/review/publish through the existing UI → close the page after confirmed publication → reopen the same intention → see its publication and planning action without a second Issue.
- **E2E-003** (`feature-gate`): **Analysis to review (US-002, US-005)** — open T → click `Analisar próxima etapa` → observe queued/running Dev Control state → the deterministic HTTP fixture completes → named Human View fields show the saved recommendation.
- **E2E-004** (`feature-gate`): **Navigation and resumption (US-003)** — start T's slow analysis → open Q → complete T remotely → Q stays selected → return to T and refresh → its saved review is available without another analysis.
- **E2E-005** (`feature-gate`): **Failure and retry (US-004)** — start T with invalid provider result → see planning-specific failure alongside Issue #5 → click explicit retry against a valid fixture → see one saved review and no retry control.
- **E2E-006** (`feature-gate`): **Override and approval (US-006, US-007)** — open review recommending Tech Spec → choose PRD through Alterar rota and save → review distinct recommendation/selection → approve → revisit and see read-only PRD, human approver/time and original rationale.
- **E2E-007** (`feature-gate`): **Return to recommendation (US-006)** — open an overridden PRD selection → save Tech Spec → revisit → selection follows the recommendation and source is AI while planning still awaits explicit approval.
- **E2E-008** (`feature-gate`): **Nonblocking uncertainties (US-005, US-007)** — open review with `Definir paginação` → approve without answering or acknowledging → the approved Human View retains that uncertainty.
- **E2E-009** (`feature-gate`): **Stale review (US-006, US-007)** — open T in two author tabs → save PRD in tab two → attempt approval from the old tab → see conflict/review guidance rather than approval of a different choice.
- **E2E-010** (`feature-gate`): **Lost route-save response (US-006)** — choose PRD → drop the save response after server commit → observe uncertain state with approval disabled → reconnect/refresh → inspect the actual saved PRD before approving.
- **E2E-011** (`feature-gate`): **Lost approval response (US-007)** — approve T → drop the response after commit → reopen T → the original approval/time is displayed without a second approval or downstream action.
- **E2E-012** (`feature-gate`): **Truthful lifecycle (US-008)** — open T awaiting planning → run analysis to review → approve → timeline distinguishes publication, recommendation and human approval without showing Tech Spec/PRD/implementation as running.
- **E2E-013** (`feature-gate`): **Separate artifacts and conversation (US-009)** — open approved T with more than one message page → inspect planning and Issue details before loading older messages → then open conversation and load more → all content stays associated with T.
- **E2E-014** (`feature-gate`): **Shared reader (US-010)** — as B open A's review → see author and read-only explanation → A approves in another browser context → refresh as B → see the same final selection and approval without mutation controls.
- **E2E-015** (`feature-gate`): **Administrator boundaries (US-011)** — as nonauthor administrator C open T with personal repository access → inspect planning read-only → remove that personal authorization → refresh → see access recovery with protected content removed.
- **E2E-016** (`feature-gate`): **Session restoration** — as A, B and C in separate parameterized fixtures open T → expire the session → trigger refresh → sign in and restore authorized access → return to T's saved state without automatically sending a planning command.
- **E2E-017** (`feature-gate`): **Transient read failure** — open T review → make its next detail read return 500 → see last-confirmed/recovery feedback → restore the read → see the same saved explanation, not an empty decision.
- **E2E-018** (`feature-gate`): **History isolation** — seed 61 mixed-author/state items → search, paginate and switch between T/Q → each selected view and history entry shows only its own author, route and lifecycle.
- **E2E-019** (`qa-release`): **Accessible Human View** — at 320px and 200% zoom, with maximum-length title/repository/assessment → navigate fields and optional details by keyboard → every accepted text and action remains reachable without page-level horizontal overflow.
- **E2E-020** (`qa-release`): **Assistive technology and reduced motion** — with reduced motion and a screen reader → start analysis, save route and approve by keyboard → each phase is announced intelligibly once per transition with visible focus and text-based status.
- **E2E-021** (`feature-gate`): **Untrusted Issue link** — open a seeded publication whose URL mismatches its Issue identity → inspect Issue details → see the discrepancy message and no trusted external link.
- **E2E-022** (`feature-gate`): **Direct-link authorization** — as B/C in separate fixtures deep-link to T → inspect artifacts → revoke current project visibility → refresh/deep-link again → receive the normal unavailable state without protected content.
- **E2E-023** (`feature-gate`): **Long conversation failure isolation** — open T with 201 authoring messages and fail the conversation fetch → planning/Issue artifacts and current action remain usable → recover conversation loading independently.
- **E2E-024** (`qa-release`): **Browser matrix** — run the approved-route and lost-response journeys using separately configured Chromium, Firefox and WebKit projects → each returns the same persisted approval and read-only controls.
- **E2E-025** (`feature-gate`): **Planning absent and malformed navigation** — open a published item without a plan → inspect its honest awaiting state → navigate to an unknown task UUID → see unavailable feedback without substituting the prior artifact.
- **E2E-026** (`feature-gate`): **Limits and recovery feedback** — start T while its valid admission request is limited → see waiting/retry guidance without a running claim → retry explicitly after capacity returns → observe the accepted operation.
- **E2E-027** (`feature-gate`): **Approved decisions across items** — open approved T then approved Q with a different author/time/route → each artifact displays its own approval attribution and remains read-only.
- **E2E-028** (`qa-release`): **No downstream execution after approval** — in dedicated staging approve each of the three route choices → inspect the provider audit and test GitHub repository → no new comment, artifact or downstream execution was created.
- **E2E-029** (`feature-gate`): **Reconnect after another tab approves** — open review in tab one → disconnect tab one → approve the same saved decision in tab two → reconnect tab one with an older running response delayed → tab one converges on approved and never regresses.
- **E2E-030** (`feature-gate`): **Rejected approval persistence** — open T in review → force the approval transaction to roll back → click Aprovar planejamento → see recoverable failure while the saved route remains under review.

- **E2E-031** (`qa-release`): **Grounded rationale review (US-005)** — request planning through the staging UI for the retained filter-by-author snapshot; a human reviewer confirms the displayed rationale explains why its chosen next activity addresses that change, contains no placeholder-only reason, and makes no unrecorded repository-inspection claim. Record the actual output and a pass/fail rationale in QA evidence.

## Execution and handoff rules

`cy-create-tasks` assigns each task-required ID to exactly one implementation task and records feature-gate/qa-release IDs at the appropriate gate. Keep IDs stable; withdraw obsolete cases in place rather than renumbering. A parameterized case has one owner and produces a result per fixture.

Real provider cases are external delivery dependencies of the complete feature. Local fixtures prove Flow Dev behavior; they do not prove Dev Control implements the contract. Retention QA may use a provider-controlled clock instead of waiting seven wall-clock days if it exercises the actual retention policy.

Implementation verification reports case counts, skips, environment gaps, exit codes and external gate evidence. Migration compatibility, all story journeys, failure shapes, concurrency and access revocation remain traceable through the matrix. This document creates no test implementation, provider deployment, production configuration or downstream execution.
