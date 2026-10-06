# Test Specification: Route-driven Spec Execution with Compozy

Canonical test contract for this feature. Companion to [_techspec.md](_techspec.md), derived from [_user_stories.md](_user_stories.md) and the complete technical design. These are planned checks, not executed evidence.

## Strategy

- Vitest unit tests cover pure rules, adapters with fakes only at I/O boundaries, React components through Testing Library, and client reducers/hooks with deterministic clocks.
- Integration tests use real controller/service/DAO wiring, disposable PostgreSQL, temporary Git repositories/filesystems and pinned HTTP fixtures. Runtime fixture cases do not establish real provider compatibility.
- Playwright journeys use the public Issues UI, existing authentication fixtures, accessible locators and isolated records. No production database/account or mutable production API is used. Each journey creates its prerequisites independently.
- `task-required` cases belong to the one task implementing that behavior; `feature-gate` cases wait for integrated slices; `qa-release` cases require the real runner/provider, extended accessibility or operational environment. Runtime QA gates are mandatory before release, not optional because expensive.
- Run existing scripts `pnpm --dir packages/api test`, `pnpm --dir packages/api test:integration`, `pnpm --dir apps/web test`, `pnpm --dir apps/web test:e2e`, `pnpm lint`, `pnpm typecheck`, `pnpm build` as appropriate. Integration requires disposable `TEST_DATABASE_URL`. Add explicitly opt-in runtime harness configuration during implementation; missing prerequisites produce unverified gates, never passing mocks.
- Parameterized contract cases generate independent rows per procedure/input. Reuse existing sufficient assertions instead of duplicating suites; every listed ID must still have an owning check/evidence reference. IDs are stable and never renumbered after task assignment.

## Fixtures and exact outcomes

Use deterministic valid UUIDs for aliases: P1=`10000000-0000-4000-8000-000000000001`, P2 ends `002`; T1=`20000000-0000-4000-8000-000000000001`, T2 ends `002`; R1=`30000000-0000-4000-8000-000000000001`, later attempts increment the suffix; V1=`40000000-0000-4000-8000-000000000001`, later revisions increment it; Q1=`50000000-0000-4000-8000-000000000001`; request keys K1… use prefix `60000000`. A is T1's immutable author, B an authorized reader, C a nonauthor administrator. All have current personal repository authorization unless the case changes it. D1 identifies the first captured document; Pm1 a permission interaction; W1 the workflow. SHA1 and manifest hashes are computed from fixture bytes, not literal placeholder digests in requests.

Default T1 has confirmed retained Issue #42, approved planning, selected `prd`, specVersion=0 and healthy configured runtime. Review cases add complete indexed package V1 and its correct prerequisites. Choice Q1 offers exactly `["Thirty days", "Ninety days"]`. A named operation is invoked via its real public controller/router or wired worker boundary unless explicitly a unit/UI case. Failure notation is exact `tRPC code/reason`; asynchronous reasons belong to saved receipts/attempts. Race cases assert durable row counts and authoritative identity, not timing assumptions.

## Coverage Matrix

The existing UI entry is `/projects/{projectId}/issues/{taskId}`; optional `specStage`, `specPackage` and `specDocument` query parameters only select authorized review content. Every story and all ten edges per story have individual rows. Every component/interface has unit happy/error coverage, and public procedures have explicit success/failure rows. Story rows include start-to-finish journeys. Shared failure cases parameterize the named procedures independently.

| Source | Behavior | Task-required | Feature-gate | QA/release |
| --- | --- | --- | --- | --- |
| Spec API schemas | Contract and error path | UT-001, UT-002 | — | — |
| TaskSpecController | Contract and error path | UT-003, UT-004 | — | — |
| SpecLifecycleService / specEligibility | Contract and error path | UT-005, UT-006 | — | — |
| SpecLifecycleService / specTransition | Contract and error path | UT-007, UT-008 | — | — |
| SpecInteractionService | Contract and error path | UT-009, UT-010 | — | — |
| SpecCaptureService | Contract and error path | UT-011, UT-012 | — | — |
| TaskSpecDao contract | Contract and error path | UT-013, UT-014 | — | — |
| SpecWorkerController | Contract and error path | UT-015, UT-016 | — | — |
| SpecRuntimeGateway | Contract and error path | UT-017, UT-018 | — | — |
| SpecWorkspaceGateway | Contract and error path | UT-019, UT-020 | — | — |
| SpecDocumentModel / parseSpecDocuments | Contract and error path | UT-021, UT-022 | — | — |
| validateSpecGraph | Contract and error path | UT-023, UT-024 | — | — |
| validateTestOwnership | Contract and error path | UT-025, UT-026 | — | — |
| Managed skill bundle contract | Contract and error path | UT-027, UT-028 | — | — |
| SpecInput / SpecStage | Contract and error path | UT-029, UT-030 | — | — |
| SpecCommand / SpecReceipt and pending command state | Contract and error path | UT-031, UT-032 | — | — |
| ReviewBlock / source links | Contract and error path | UT-033, UT-034 | — | — |
| ReviewDiagnostic / specApprovalGate | Contract and error path | UT-035, UT-036 | — | — |
| normalizeSpecEvent | Contract and error path | UT-037, UT-038 | — | — |
| reduceSpecEvents | Contract and error path | UT-039, UT-040 | — | — |
| SpecStage / SpecProgress | Contract and error path | UT-041, UT-042 | — | — |
| SpecActivity | Contract and error path | UT-043, UT-044 | — | — |
| SpecInteraction | Contract and error path | UT-045, UT-046 | — | — |
| PrdReview | Contract and error path | UT-047, UT-048 | — | — |
| TechSpecReview | Contract and error path | UT-049, UT-050 | — | — |
| TasksReview | Contract and error path | UT-051, UT-052 | — | — |
| SpecChanges / specPackageDiff | Contract and error path | UT-053, UT-054 | — | — |
| SpecReviewActions | Contract and error path | UT-055, UT-056 | — | — |
| useSpecSnapshot | Contract and error path | UT-057, UT-058 | — | — |
| useSpecCommand | Contract and error path | UT-059, UT-060 | — | — |
| safeSpecLink | Contract and error path | UT-061, UT-062 | — | — |
| RuntimeResolution | Contract and error path | UT-063, UT-064 | — | — |
| RuntimeStop | Contract and error path | UT-065, UT-066 | — | — |
| CandidateManifest / InstalledManifest / PackageIdentity | Contract and error path | UT-067, UT-068 | — | — |
| Limits | Contract and error path | UT-069, UT-070 | — | — |
| Event/history cursor | Contract and error path | UT-071, UT-072 | — | — |
| Spec permission boundary | Contract and error path | UT-073, UT-074 | — | — |
| Retry context | Contract and error path | UT-075, UT-076 | — | — |
| Retention policy | Contract and error path | UT-077, UT-078 | — | — |
| SpecPackageIndex | Contract and error path | UT-079, UT-080 | — | — |
| Spec CLI configuration | Contract and error path | UT-081, UT-082 | — | — |
| US-001.EC-1 | taskSpec.byTask: saved selectedRoute="unknown" | IT-001 | — | — |
| US-001.EC-2 | taskSpec.byTask: planning approval is absent | IT-002 | — | — |
| US-001.EC-3 | SpecProgress: a 12,000-character planning rationale | IT-003 | — | — |
| US-001.EC-4 | taskSpec.start: reader B submits stage=prd for author A | IT-004 | — | — |
| US-001.EC-5 | taskSpec.start: tab 1 holds version 0 after tab 2 started attempt R1 | IT-005 | — | — |
| US-001.EC-6 | loadTaskWorkspace and taskSpec.byTask: browser disconnects before the initial read completes | IT-006 | — | — |
| US-001.EC-7 | taskSpec.byTask: ten reads of approved planning before start | IT-007 | — | — |
| US-001.EC-8 | taskSpec.start: stage=tasks while TechSpec is not approved | IT-008 | — | — |
| US-001.EC-9 | SpecInput assembly: remote Issue #42 is closed and renamed after publication | IT-009 | — | — |
| US-001.EC-10 | taskSpec.byTask: 1,000 task records with alternating routes; read task T1 | — | IT-010 | — |
| US-002.EC-1 | taskSpec.start: project P1 with task T2 belonging to P2 | IT-011 | — | — |
| US-002.EC-2 | taskSpec.start: confirmed publication row lacks its saved body | IT-012 | — | — |
| US-002.EC-3 | SpecWorkerController admission: two active attempts and twenty queued attempts; accept one more | IT-013 | — | — |
| US-002.EC-4 | taskSpec.start: author A repository authorization revoked before acceptance | IT-014 | — | — |
| US-002.EC-5 | taskSpec.start: two independent request keys race at specVersion=0 | IT-015 | — | — |
| US-002.EC-6 | taskSpec.submission: start K1 committed but HTTP response was dropped | IT-016 | — | — |
| US-002.EC-7 | taskSpec.start: repeat K1 and its exact payload after R1 becomes review-ready | IT-017 | — | — |
| US-002.EC-8 | taskSpec.start: route=prd and stage=tech_spec before PRD approval | IT-018 | — | — |
| US-002.EC-9 | SpecWorkspaceGateway.prepare: resolved remote stable ID differs from stored GitHub ID | IT-019 | — | — |
| US-002.EC-10 | SpecWorkerController dispatch: P1/T1 and P2/T2 execute concurrently | — | IT-020 | — |
| US-003.EC-1 | normalizeSpecEvent: agent_message containing `<img onerror=alert(1)>` and an unknown event kind | IT-021 | — | — |
| US-003.EC-2 | SpecActivity: queued R1 has zero saved events | IT-022 | — | — |
| US-003.EC-3 | SpecActivity: safe agent message has 20,000 bytes | IT-023 | — | — |
| US-003.EC-4 | taskSpec.events: membership revoked after the preceding successful page | IT-024 | — | — |
| US-003.EC-5 | reduceSpecEvents: sequence 9 completion followed by duplicate 9 and late running event 8 | IT-025 | — | — |
| US-003.EC-6 | useSpecSnapshot: network fails while runtime continues R1 | — | IT-026 | — |
| US-003.EC-7 | reduceSpecEvents: replay identical provider event E1 three times | IT-027 | — | — |
| US-003.EC-8 | SpecWorkerController reconcile: done arrives while required _tests.md is absent | IT-028 | — | — |
| US-003.EC-9 | taskSpec.events: R1 fails after events E1 and E2 | IT-029 | — | — |
| US-003.EC-10 | taskSpec.events: 10,000 events paged in batches of 100 | — | IT-030 | — |
| US-004.EC-1 | taskSpec.answer: question Q1 offers two choices and choiceIndex=2 is submitted | IT-031 | — | — |
| US-004.EC-2 | taskSpec.answer: Q1 receives whitespace-only text | IT-032 | — | — |
| US-004.EC-3 | taskSpec.answer: Q1 receives 16,385 UTF-8 bytes | IT-033 | — | — |
| US-004.EC-4 | taskSpec.answer: nonauthor administrator C answers Q1 | IT-034 | — | — |
| US-004.EC-5 | SpecInteractionService.resolve: two tabs submit different answers to Q1 concurrently | IT-035 | — | — |
| US-004.EC-6 | SpecRuntimeGateway.resolve: Q1 survives restart but its live provider turn is gone | IT-036 | — | — |
| US-004.EC-7 | taskSpec.answer: accepted answer command K2 is replayed | IT-037 | — | — |
| US-004.EC-8 | taskSpec.answer: Q1 belongs to superseded attempt R0 while R1 is current | IT-038 | — | — |
| US-004.EC-9 | SpecWorkerController settle: R1 cancellation confirms while Q1 is pending | IT-039 | — | — |
| US-004.EC-10 | taskSpec.byTask: 500 resolved questions and one pending Q501 | — | IT-040 | — |
| US-005.EC-1 | taskSpec.permission: permission Pm1 has target=null | IT-041 | — | — |
| US-005.EC-2 | SpecInteractionService: Pm1 omits its operation description | IT-042 | — | — |
| US-005.EC-3 | SpecRuntimeGateway.resolve: permission broker returns queue-full | IT-043 | — | — |
| US-005.EC-4 | taskSpec.permission: reader B sends allow_once for Pm1 | IT-044 | — | — |
| US-005.EC-5 | SpecInteractionService.resolve: allow_once and deny_once race for Pm1 | IT-045 | — | — |
| US-005.EC-6 | SpecRuntimeGateway.resolve: permission record is orphaned after daemon restart | IT-046 | — | — |
| US-005.EC-7 | SpecInteractionService: retry R2 receives a target different from R1 allowed target | IT-047 | — | — |
| US-005.EC-8 | taskSpec.permission: Pm2 belongs to another work item | IT-048 | — | — |
| US-005.EC-9 | taskSpec.permission: R1 state=stopping while an old permission control submits | IT-049 | — | — |
| US-005.EC-10 | taskSpec.byTask: 500 resolved permissions and two pending requests | — | IT-050 | — |
| US-006.EC-1 | PrdReview and validateSpecPackage: PRD includes active HTML and an unrepresented material block | IT-051 | — | — |
| US-006.EC-2 | validateSpecPackage: _prd.md exists but _user_stories.md is empty | IT-052 | — | — |
| US-006.EC-3 | PrdReview: one section contains 100,000 source bytes | — | IT-053 | — |
| US-006.EC-4 | taskSpec.document: reader lacks personal repository authorization | IT-054 | — | — |
| US-006.EC-5 | SpecReviewActions: viewed PRD V1 is replaced by current V2 | IT-055 | — | — |
| US-006.EC-6 | useSpecCommand: connection fails during review without an accepted approval receipt | IT-056 | — | — |
| US-006.EC-7 | taskSpec.package: same package V1 is fetched repeatedly | IT-057 | — | — |
| US-006.EC-8 | PrdReview: route=tech_spec with no PRD package | IT-058 | — | — |
| US-006.EC-9 | taskSpec.package: adjustment R2 failed while V1 is complete | IT-059 | — | — |
| US-006.EC-10 | PrdReview: 200 stories and 200 features in a valid package | — | IT-060 | — |
| US-007.EC-1 | TechSpecReview: Mermaid block contains an external link/script payload | IT-061 | — | — |
| US-007.EC-2 | validateSpecPackage: _techspec.md exists without _tests.md | IT-062 | — | — |
| US-007.EC-3 | TechSpecReview: a 50-column contract table in a 390px viewport | — | IT-063 | — |
| US-007.EC-4 | taskSpec.document: direct link names a package from unauthorized P2 | IT-064 | — | — |
| US-007.EC-5 | taskSpec.approve: TechSpec V1 hash submitted after V2 became current | IT-065 | — | — |
| US-007.EC-6 | SpecCaptureService: provider stops after writing only _techspec.md | IT-066 | — | — |
| US-007.EC-7 | SpecCaptureService: same R1 manifest delivered twice | IT-067 | — | — |
| US-007.EC-8 | specEligibility: route=prd without PRD approval versus route=tech_spec with approved planning | IT-068 | — | — |
| US-007.EC-9 | SpecWorkspaceGateway.verify: approved PRD bytes differ from their recorded hash | IT-069 | — | — |
| US-007.EC-10 | TechSpecReview: 4,096 planned test cases reference 100 components | — | IT-070 | — |
| US-008.EC-1 | validateSpecGraph: task_01 depends on task_02 and task_02 depends on task_01 | IT-071 | — | — |
| US-008.EC-2 | validateSpecPackage: _tasks.md references missing task_02.md | IT-072 | — | — |
| US-008.EC-3 | validateSpecPackage: 201 task files are generated | IT-073 | — | — |
| US-008.EC-4 | taskSpec.approve: reader B submits a Tasks package hash | IT-074 | — | — |
| US-008.EC-5 | TasksReview: current V2 changes task_02 dependency while V1 is displayed | IT-075 | — | — |
| US-008.EC-6 | SpecCaptureService: runtime fails after 2 of 5 indexed task files | IT-076 | — | — |
| US-008.EC-7 | SpecLifecycleService.approve: repeat the same approved Tasks command | IT-077 | — | — |
| US-008.EC-8 | taskSpec.start: Tasks requested while TechSpec is in review | IT-078 | — | — |
| US-008.EC-9 | SpecWorkspaceGateway.verify: external task_01.md changes status from pending to completed | IT-079 | — | — |
| US-008.EC-10 | TasksReview: 200-node valid dependency graph | — | IT-080 | — |
| US-009.EC-1 | taskSpec.adjust: package V1 belongs to a different stage than the requested current stage | IT-081 | — | — |
| US-009.EC-2 | taskSpec.adjust: text is blank for current V1 | IT-082 | — | — |
| US-009.EC-3 | taskSpec.adjust: text is exactly 16,385 UTF-8 bytes | IT-083 | — | — |
| US-009.EC-4 | taskSpec.adjust: author membership expires before acceptance | IT-084 | — | — |
| US-009.EC-5 | SpecLifecycleService.adjust: two different changes race against V1 | IT-085 | — | — |
| US-009.EC-6 | SpecCaptureService: adjustment R2 fails after partially modifying V1 candidate | IT-086 | — | — |
| US-009.EC-7 | taskSpec.adjust: resend accepted K3 with identical V1/text | IT-087 | — | — |
| US-009.EC-8 | taskSpec.adjust: target stage is already approved | IT-088 | — | — |
| US-009.EC-9 | SpecWorkerController settle: R2 result arrives after verified cancellation | IT-089 | — | — |
| US-009.EC-10 | SpecChanges: 50 captured revisions exist | — | IT-090 | — |
| US-010.EC-1 | taskSpec.approve: package ID belongs to another task | IT-091 | — | — |
| US-010.EC-2 | SpecLifecycleService.approve: required companion is absent despite runtime done | IT-092 | — | — |
| US-010.EC-3 | SpecReviewActions: all 256 documents are accessible but only page one is expanded | — | IT-093 | — |
| US-010.EC-4 | taskSpec.approve: nonauthor administrator C submits exact current hash | IT-094 | — | — |
| US-010.EC-5 | SpecLifecycleService.approve: two commands concurrently approve current V1 | IT-095 | — | — |
| US-010.EC-6 | taskSpec.submission: approval K4 committed but its response was lost | IT-096 | — | — |
| US-010.EC-7 | taskSpec.approve: replay K4 one hour later | IT-097 | — | — |
| US-010.EC-8 | taskSpec.approve: Tasks stage is unstarted and TechSpec unapproved | IT-098 | — | — |
| US-010.EC-9 | SpecWorkspaceGateway.verify: canonical companion changed before the approval job verifies disk | IT-099 | — | — |
| US-010.EC-10 | taskSpec.package: 200 tasks across 50 revisions | — | IT-100 | — |
| US-011.EC-1 | taskSpec.cancel: attempt belongs to T2 while request scope is T1 | IT-101 | — | — |
| US-011.EC-2 | taskSpec.cancel: named current attempt is already terminal | IT-102 | — | — |
| US-011.EC-3 | SpecWorkerController stop: runtime reports stopping with verified=false for 61 seconds | IT-103 | — | — |
| US-011.EC-4 | taskSpec.cancel: reader B requests cancel R1 | IT-104 | — | — |
| US-011.EC-5 | SpecWorkerController settle: verified cancellation and completed capture race | IT-105 | — | — |
| US-011.EC-6 | SpecWorkerController stop: daemon connection drops after stop acceptance | IT-106 | — | — |
| US-011.EC-7 | taskSpec.cancel: repeat accepted stop K5 | IT-107 | — | — |
| US-011.EC-8 | taskSpec.retry: R1 is still stopping | IT-108 | — | — |
| US-011.EC-9 | taskSpec.cancel: attempt already produced an approved package | IT-109 | — | — |
| US-011.EC-10 | SpecProgress: 100 canceled attempts precede active R101 | — | IT-110 | — |
| US-012.EC-1 | taskSpec.retry: failedAttemptId=R0 while R1 superseded it | IT-111 | — | — |
| US-012.EC-2 | SpecInput assembly: Q2 answer was never durably saved before crash | IT-112 | — | — |
| US-012.EC-3 | SpecWorkerController retry: retained required inline context is 262,145 bytes | IT-113 | — | — |
| US-012.EC-4 | taskSpec.retry: author GitHub credential revoked after failure | IT-114 | — | — |
| US-012.EC-5 | SpecLifecycleService.retry: two retries race for the same failed R1 | IT-115 | — | — |
| US-012.EC-6 | taskSpec.submission: retry K6 response is lost after acceptance | IT-116 | — | — |
| US-012.EC-7 | taskSpec.retry: repeat accepted K6 after R2 succeeded | IT-117 | — | — |
| US-012.EC-8 | taskSpec.retry: payload attempts stage=prd for a tech_spec route | IT-118 | — | — |
| US-012.EC-9 | SpecRuntimeGateway.preflight: configured binary/bundle digest changed from the accepted pin | IT-119 | — | — |
| US-012.EC-10 | SpecInput assembly: 100 attempts contain decisions for two stages | — | IT-120 | — |
| US-013.EC-1 | SpecWorkspaceGateway.freeze: generated output is ../../src/index.ts or a symlink outside the candidate | IT-121 | — | — |
| US-013.EC-2 | SpecWorkspaceGateway.verify: canonical _tests.md disappeared | IT-122 | — | — |
| US-013.EC-3 | SpecCaptureService: aggregate source size is 8 MiB plus 1 byte | IT-123 | — | — |
| US-013.EC-4 | taskSpec.document: reader changes documentId to a foreign historical revision | IT-124 | — | — |
| US-013.EC-5 | SpecWorkspaceGateway.promote: target file hash changes externally after candidate capture | IT-125 | — | — |
| US-013.EC-6 | SpecCaptureService: process dies after the first installed file but before installed journal commit | IT-126 | — | — |
| US-013.EC-7 | SpecCaptureService: repeat capture for identical attempt/manifest | IT-127 | — | — |
| US-013.EC-8 | SpecLifecycleService: unassociated files exist on disk without an accepted attempt | IT-128 | — | — |
| US-013.EC-9 | SpecWorkspaceGateway.verify: approved file is replaced externally | IT-129 | — | — |
| US-013.EC-10 | taskSpec.packages: 50 packages each in P1 and P2 | — | IT-130 | — |
| US-014.EC-1 | taskSpec.events: reader reuses T1 cursor against T2 | IT-131 | — | — |
| US-014.EC-2 | taskSpec.byTask: reader opens approved planning before Spec starts | IT-132 | — | — |
| US-014.EC-3 | taskSpec.events: reader pages through 1,001 events | IT-133 | — | — |
| US-014.EC-4 | taskSpec.document: membership revoked between document pages | IT-134 | — | — |
| US-014.EC-5 | useSpecSnapshot: author publishes V2 while reader inspects V1 | IT-135 | — | — |
| US-014.EC-6 | useSpecSnapshot: reader reconnects after author answered Q1 | IT-136 | — | — |
| US-014.EC-7 | taskSpec.byTask: reader visits task ten times | IT-137 | — | — |
| US-014.EC-8 | taskSpec.package: reader requests a not-yet-produced future-stage package | IT-138 | — | — |
| US-014.EC-9 | SpecStage: author cancels R1 with partial files | IT-139 | — | — |
| US-014.EC-10 | taskSpec.events: twenty authorized readers observe R1 concurrently | — | IT-140 | — |
| US-015.EC-1 | taskSpec.document: admin C supplies P1 scope with a P2 package | IT-141 | — | — |
| US-015.EC-2 | taskSpec.byTask: admin inspects a project task with no Spec workflow | IT-142 | — | — |
| US-015.EC-3 | TaskSpecController error mapping: runtime failure contains token=canary-secret and a host path | IT-143 | — | — |
| US-015.EC-4 | taskSpec.events: admin visibility is withdrawn between polls | IT-144 | — | — |
| US-015.EC-5 | SpecStage: admin views V1 while author approves V2 | IT-145 | — | — |
| US-015.EC-6 | taskSpec.byTask: admin session expired | IT-146 | — | — |
| US-015.EC-7 | taskSpec.byTask: repeat admin inspection after author approval | IT-147 | — | — |
| US-015.EC-8 | taskSpec.package: admin requests absent Tasks package before execution | IT-148 | — | — |
| US-015.EC-9 | SpecWorkerController entitlement check: author loses access while Q1 is pending | IT-149 | — | — |
| US-015.EC-10 | taskSpec.byTask: admin can access P1 repo but lacks personal authorization for P2 | — | IT-150 | — |
| US-001 | Complete user journey | IT-001 | E2E-001 | — |
| US-002 | Complete user journey | IT-011 | E2E-002, E2E-016 | — |
| US-003 | Complete user journey | IT-021 | E2E-003 | E2E-020 |
| US-004 | Complete user journey | IT-031 | E2E-004 | — |
| US-005 | Complete user journey | IT-041 | E2E-005, E2E-017 | — |
| US-006 | Complete user journey | IT-051 | E2E-006 | E2E-019, E2E-020 |
| US-007 | Complete user journey | IT-061 | E2E-007 | E2E-019 |
| US-008 | Complete user journey | IT-071 | E2E-008 | E2E-019 |
| US-009 | Complete user journey | IT-081 | E2E-009 | — |
| US-010 | Complete user journey | IT-091 | E2E-010, E2E-016 | — |
| US-011 | Complete user journey | IT-101 | E2E-011, E2E-018 | — |
| US-012 | Complete user journey | IT-111 | E2E-012, E2E-018 | — |
| US-013 | Complete user journey | IT-121 | E2E-013 | — |
| US-014 | Complete user journey | IT-131 | E2E-014, E2E-017 | — |
| US-015 | Complete user journey | IT-141 | E2E-015 | — |
| taskSpec.byTask | Success and every applicable shared/specific failure | IT-151, IT-166, IT-167, IT-168, IT-169, IT-170, IT-171 | — | — |
| taskSpec.events | Success and every applicable shared/specific failure | IT-152, IT-166, IT-167, IT-168, IT-169, IT-170, IT-171, IT-175 | — | — |
| taskSpec.packages | Success and every applicable shared/specific failure | IT-153, IT-166, IT-167, IT-168, IT-169, IT-170, IT-171, IT-175 | — | — |
| taskSpec.package | Success and every applicable shared/specific failure | IT-154, IT-166, IT-167, IT-168, IT-169, IT-170, IT-171 | — | — |
| taskSpec.document | Success and every applicable shared/specific failure | IT-155, IT-166, IT-167, IT-168, IT-169, IT-170, IT-171, IT-175 | — | — |
| taskSpec.submission | Success and every applicable shared/specific failure | IT-156, IT-166, IT-167, IT-168, IT-169, IT-170, IT-171, IT-172 | — | — |
| taskSpec.event | Success and every applicable shared/specific failure | IT-157, IT-166, IT-167, IT-168, IT-169, IT-170, IT-171 | — | — |
| taskSpec.start | Success and every applicable shared/specific failure | IT-158, IT-166, IT-167, IT-168, IT-169, IT-170, IT-171, IT-172, IT-173, IT-174, IT-176, IT-177, IT-178, IT-179, IT-180, IT-181, IT-182, IT-183, IT-184, IT-195 | — | — |
| taskSpec.adjust | Success and every applicable shared/specific failure | IT-159, IT-166, IT-167, IT-168, IT-169, IT-170, IT-171, IT-172, IT-173, IT-174, IT-183, IT-184, IT-186, IT-196 | — | — |
| taskSpec.answer | Success and every applicable shared/specific failure | IT-160, IT-166, IT-167, IT-168, IT-169, IT-170, IT-171, IT-172, IT-173, IT-174, IT-189, IT-192, IT-193, IT-194 | — | — |
| taskSpec.permission | Success and every applicable shared/specific failure | IT-161, IT-166, IT-167, IT-168, IT-169, IT-170, IT-171, IT-172, IT-173, IT-174, IT-190, IT-191, IT-192, IT-193, IT-194 | — | — |
| taskSpec.cancel | Success and every applicable shared/specific failure | IT-162, IT-166, IT-167, IT-168, IT-169, IT-170, IT-171, IT-172, IT-173, IT-174 | — | — |
| taskSpec.retry | Success and every applicable shared/specific failure | IT-163, IT-166, IT-167, IT-168, IT-169, IT-170, IT-171, IT-172, IT-173, IT-174, IT-180, IT-181, IT-182, IT-183, IT-185, IT-195 | — | — |
| taskSpec.returnToReview | Success and every applicable shared/specific failure | IT-164, IT-166, IT-167, IT-168, IT-169, IT-170, IT-171, IT-172, IT-173, IT-174, IT-185, IT-196 | — | — |
| taskSpec.approve | Success and every applicable shared/specific failure | IT-165, IT-166, IT-167, IT-168, IT-169, IT-170, IT-171, IT-172, IT-173, IT-174, IT-179, IT-186, IT-187, IT-188, IT-196 | — | — |
| DAO constraints | Cross-boundary proof | IT-197, IT-198, IT-199 | — | — |
| Command receipts | Cross-boundary proof | IT-200 | — | — |
| Session creation | Cross-boundary proof | IT-201, IT-202 | — | — |
| Prompt adapter | Cross-boundary proof | IT-203 | — | — |
| Event adapter | Cross-boundary proof | IT-204, IT-205, IT-206, IT-207 | — | — |
| Interaction adapter | Cross-boundary proof | IT-208, IT-209, IT-210 | — | — |
| Stop adapter | Cross-boundary proof | IT-211, IT-212, IT-213 | — | — |
| Filesystem capture | Cross-boundary proof | IT-214, IT-215, IT-216, IT-217, IT-218, IT-219, IT-220, IT-221 | — | — |
| Graph validation | Cross-boundary proof | IT-222, IT-223 | — | — |
| Test ownership | Cross-boundary proof | IT-224, IT-225 | — | — |
| Source fidelity | Cross-boundary proof | IT-226, IT-227 | — | — |
| Decision validation | Cross-boundary proof | IT-228 | — | — |
| Package limits | Cross-boundary proof | IT-229 | — | — |
| Input context | Cross-boundary proof | IT-230 | — | — |
| Runtime permission policy | Cross-boundary proof | IT-231 | — | — |
| Isolation plan | Cross-boundary proof | IT-232 | — | — |
| Authorization | Cross-boundary proof | IT-233, IT-234 | — | — |
| Approval | Cross-boundary proof | IT-235 | — | — |
| No external publication | Cross-boundary proof | IT-236 | — | — |
| Polling | Cross-boundary proof | IT-237 | — | — |
| Pending commands | Cross-boundary proof | IT-238 | — | — |
| CLI contract | Cross-boundary proof | IT-239 | — | — |
| Migration | Cross-boundary proof | — | IT-240 | — |
| Worker regression | Cross-boundary proof | — | IT-241 | — |
| Git provisioning | Cross-boundary proof | — | IT-242 | — |
| Scope isolation | Cross-boundary proof | — | IT-243 | — |
| Backup recovery | Cross-boundary proof | — | IT-244 | — |
| Package rendering | Cross-boundary proof | — | IT-245 | — |
| Performance | Cross-boundary proof | — | IT-246 | — |
| Pinned runtime | Cross-boundary proof | — | — | IT-247 |
| Managed bundle PRD route | Cross-boundary proof | — | — | IT-248 |
| Managed bundle TechSpec route | Cross-boundary proof | — | — | IT-249 |
| Live clarification | Cross-boundary proof | — | — | IT-250 |
| Live permission | Cross-boundary proof | — | — | IT-251 |
| Restart recovery | Cross-boundary proof | — | — | IT-252 |
| Verified cancellation | Cross-boundary proof | — | — | IT-253 |
| Host isolation | Cross-boundary proof | — | — | IT-254 |
| Network isolation | Cross-boundary proof | — | — | IT-255 |
| Capacity and retention | Cross-boundary proof | — | — | IT-256 |
| Compatibility drift | Cross-boundary proof | — | — | IT-257 |

## Unit Tests

- **UT-001** (`task-required, happy`): `Spec API schemas` — specInputSchema accepts start stage=prd, requestKey K1, expectedSpecVersion=0.

- **UT-002** (`task-required, error`): `Spec API schemas` — specInputSchema rejects stage=implement with invalid_input.

- **UT-003** (`task-required, happy`): `TaskSpecController` — author A plus valid project/repository credentials dispatches one lifecycle call.

- **UT-004** (`task-required, error`): `TaskSpecController` — unknown exception maps to INTERNAL_SERVER_ERROR/service_unavailable without its raw message.

- **UT-005** (`task-required, happy`): `SpecLifecycleService / specEligibility` — approved selectedRoute=prd overrides recommendation=tech_spec and returns firstStage=prd.

- **UT-006** (`task-required, error`): `SpecLifecycleService / specEligibility` — selectedRoute=direct_execution returns route_unsupported without a replacement stage.

- **UT-007** (`task-required, happy`): `SpecLifecycleService / specTransition` — TechSpec approval releases canStartTasks=true and dispatchCount=0.

- **UT-008** (`task-required, error`): `SpecLifecycleService / specTransition` — attempted approved-to-running transition returns stage_approved.

- **UT-009** (`task-required, happy`): `SpecInteractionService` — choiceIndex=0 selects exactly the first recorded Q1 choice after explicit submission.

- **UT-010** (`task-required, error`): `SpecInteractionService` — allow_once with actionDigest different from Pm1 returns invalid_permission.

- **UT-011** (`task-required, happy`): `SpecCaptureService` — complete PRD/story package with matching source index becomes a prepared candidate.

- **UT-012** (`task-required, error`): `SpecCaptureService` — missing required story companion returns artifact_invalid.

- **UT-013** (`task-required, happy`): `TaskSpecDao contract` — scoped byTask(P1,T1) maps saved rows into one workflow snapshot.

- **UT-014** (`task-required, error`): `TaskSpecDao contract` — missing nested resource returns spec_unavailable instead of an unscoped lookup.

- **UT-015** (`task-required, happy`): `SpecWorkerController` — claim fence=7 can apply the result produced under fence=7.

- **UT-016** (`task-required, error`): `SpecWorkerController` — result fence=6 is rejected as stale and cannot update current package.

- **UT-017** (`task-required, happy`): `SpecRuntimeGateway` — tagged prompt 202 queued response maps to accepted runtime submission with saved message ID.

- **UT-018** (`task-required, error`): `SpecRuntimeGateway` — malformed permission response maps to outcome_unknown rather than applied.

- **UT-019** (`task-required, happy`): `SpecWorkspaceGateway` — verified repository R1/default branch SHA1 maps to a deterministic T1 checkout plan.

- **UT-020** (`task-required, error`): `SpecWorkspaceGateway` — remote identity R2 returns workspace_unavailable before container launch.

- **UT-021** (`task-required, happy`): `SpecDocumentModel / parseSpecDocuments` — GFM heading/table/code input retains complete ordered source spans.

- **UT-022** (`task-required, error`): `SpecDocumentModel / parseSpecDocuments` — invalid UTF-8 or uncovered material source span produces a blocking diagnostic.

- **UT-023** (`task-required, happy`): `validateSpecGraph` — task_02 depends on task_01 and both files exist: graph validates.

- **UT-024** (`task-required, error`): `validateSpecGraph` — duplicate task_01 IDs produce duplicate_task diagnostic.

- **UT-025** (`task-required, happy`): `validateTestOwnership` — UT-001 task-required assigned once to task_01 validates.

- **UT-026** (`task-required, error`): `validateTestOwnership` — UT-001 assigned to both task_01 and task_02 produces contradictory_test_owner.

- **UT-027** (`task-required, happy`): `Managed skill bundle contract` — flow-spec-techspec declares Issue/planning input allowed without a PRD.

- **UT-028** (`task-required, error`): `Managed skill bundle contract` — bundle declaring _spec.md as required output fails runtime_incompatible.

- **UT-029** (`task-required, happy`): `SpecInput` — same retained Issue/route/SHA/upstream IDs yields the same canonical context hash.

- **UT-030** (`task-required, error`): `SpecInput` — missing approved upstream package for route=prd returns stage_prerequisite.

- **UT-031** (`task-required, happy`): `SpecReceipt and pending command state` — matching K1/action/payload identifies one saved accepted receipt.

- **UT-032** (`task-required, error`): `SpecReceipt and pending command state` — same K1 with changed text returns request_key_reused.

- **UT-033** (`task-required, happy`): `ReviewBlock / source links` — UTF-8 accented source block slices exactly the original bytes using startByte/endByte.

- **UT-034** (`task-required, error`): `ReviewBlock / source links` — out-of-range or overlapping unexplained source span produces interpretation_gap.

- **UT-035** (`task-required, happy`): `ReviewDiagnostic / specApprovalGate` — nonblocking observation plus complete V1 permits approval.

- **UT-036** (`task-required, error`): `ReviewDiagnostic / specApprovalGate` — blocking unresolved decision D1 produces decision_blocked.

- **UT-037** (`task-required, happy`): `normalizeSpecEvent` — tool_result joins its matching tool_call_id and retains safe relative source.

- **UT-038** (`task-required, error`): `normalizeSpecEvent` — thought event produces no public projection.

- **UT-039** (`task-required, happy`): `reduceSpecEvents` — ordered events 1,2,3 produce cursor=3 and three entries.

- **UT-040** (`task-required, error`): `reduceSpecEvents` — out-of-order snapshot version 2 cannot replace current snapshot version 3.

- **UT-041** (`task-required, happy`): `SpecStage / SpecProgress` — tech_spec route displays only TechSpec and Tasks as required stages.

- **UT-042** (`task-required, error`): `SpecStage / SpecProgress` — unknown lifecycle displays unavailable-state recovery without a guessed progress label.

- **UT-043** (`task-required, happy`): `SpecActivity` — saved tool outcome failed is rendered with its recorded reason.

- **UT-044** (`task-required, error`): `SpecActivity` — missing duration is omitted instead of displayed as a fabricated number.

- **UT-045** (`task-required, happy`): `SpecInteraction` — choosing a suggested option does not submit until Enviar is activated.

- **UT-046** (`task-required, error`): `SpecInteraction` — missing permission target removes allow action and shows integration error.

- **UT-047** (`task-required, happy`): `PrdReview` — US-001 links to its full acceptance criteria and EC-1 source content.

- **UT-048** (`task-required, error`): `PrdReview` — missing _user_stories.md displays incomplete-package state.

- **UT-049** (`task-required, happy`): `TechSpecReview` — UT-001 is rendered as planned validation linked to its source component.

- **UT-050** (`task-required, error`): `TechSpecReview` — unsupported material diagram produces visible interpretation_gap.

- **UT-051** (`task-required, happy`): `TasksReview` — pending task_01 displays full scope and validation ownership.

- **UT-052** (`task-required, error`): `TasksReview` — missing dependency task_99 displays missing_dependency instead of a valid graph.

- **UT-053** (`task-required, happy`): `SpecChanges / specPackageDiff` — V2 adds paragraph P and removes Q: diff reports those actual changes.

- **UT-054** (`task-required, error`): `SpecChanges / specPackageDiff` — parent package hash mismatch rejects comparison instead of fabricating a summary.

- **UT-055** (`task-required, happy`): `SpecReviewActions` — current complete V1 exposes Aprovar PRD to author A.

- **UT-056** (`task-required, error`): `SpecReviewActions` — nonblank unsent adjustment text disables approval.

- **UT-057** (`task-required, happy`): `useSpecSnapshot` — visible running view selects 1000ms polling with no overlapping read.

- **UT-058** (`task-required, error`): `useSpecSnapshot` — access denial stops polling and clears protected cached content.

- **UT-059** (`task-required, happy`): `useSpecCommand` — accepted approval command stays pending until applied receipt is observed.

- **UT-060** (`task-required, error`): `useSpecCommand` — lost response records uncertain state with the same request key.

- **UT-061** (`task-required, happy`): `safeSpecLink` — package-relative _tests.md resolves to its captured authorized document ID.

- **UT-062** (`task-required, error`): `safeSpecLink` — javascript:alert(1) is inert and cannot become href.

- **UT-063** (`task-required, happy`): `RuntimeResolution` — resolved-after-restart maps to orphaned historical resolution.

- **UT-064** (`task-required, error`): `RuntimeResolution` — unknown outcome string never maps to delivered=true.

- **UT-065** (`task-required, happy`): `RuntimeStop` — stopped,verified=true,user_canceled maps to confirmed canceled.

- **UT-066** (`task-required, error`): `RuntimeStop` — stopping,verified=false stays nonterminal.

- **UT-067** (`task-required, happy`): `InstalledManifest / PackageIdentity` — sorted path-role-hash entries yield a stable stage manifest hash.

- **UT-068** (`task-required, error`): `InstalledManifest / PackageIdentity` — one changed companion byte yields a different manifest hash.

- **UT-069** (`task-required, happy`): `Limits` — 16,384 UTF-8 bytes passes the answer size validator.

- **UT-070** (`task-required, error`): `Limits` — 16,385 UTF-8 bytes fails the same validator.

- **UT-071** (`task-required, happy`): `Event/history cursor` — P1/T1 after cursor decodes with matching signature/scope.

- **UT-072** (`task-required, error`): `Event/history cursor` — tampered signature returns invalid_cursor.

- **UT-073** (`task-required, happy`): `Spec permission boundary` — write to current stage _techspec.md is classified as in-scope.

- **UT-074** (`task-required, error`): `Spec permission boundary` — git push and writes to src/index.ts are classified permission_out_of_scope.

- **UT-075** (`task-required, happy`): `Retry context` — saved Q1 answer and V1 inputs are retained in R2 input.

- **UT-076** (`task-required, error`): `Retry context` — R1 permission grant is excluded from R2 executable permission context.

- **UT-077** (`task-required, happy`): `Retention policy` — complete captured package remains retained after 31 days.

- **UT-078** (`task-required, error`): `Retention policy` — runtime diagnostics cannot be deleted when application capture is incomplete.

- **UT-079** (`task-required, happy`): `SpecPackageIndex` — schemaVersion=1 source-linked documents/stories/tests/tasks/decisions validate against captured bytes.

- **UT-080** (`task-required, error`): `SpecPackageIndex` — unknown schemaVersion=2 or mismatched task title returns artifact_invalid.

- **UT-081** (`task-required, happy`): `Spec CLI configuration` — specWorker with valid runner configuration accepts only its supported mode.

- **UT-082** (`task-required, error`): `Spec CLI configuration` — specWorker missing workspace root exits nonzero before claiming work.


## Integration Tests

- **IT-001** (`task-required`): `taskSpec.byTask` — given saved selectedRoute="unknown"; perform the named operation with the real component wiring; expect route_unsupported blocker and no eligible stage.

- **IT-002** (`task-required`): `taskSpec.byTask` — given planning approval is absent; perform the named operation with the real component wiring; expect planning_required blocker and no Spec start.

- **IT-003** (`task-required`): `SpecProgress` — given a 12,000-character planning rationale; perform the named operation with the real component wiring; expect selected route stays named and the full rationale is inspectable.

- **IT-004** (`task-required`): `taskSpec.start` — given reader B submits stage=prd for author A; perform the named operation with the real component wiring; expect FORBIDDEN/author_required without dispatch.

- **IT-005** (`task-required`): `taskSpec.start` — given tab 1 holds version 0 after tab 2 started attempt R1; perform the named operation with the real component wiring; expect CONFLICT/spec_conflict and current attempt R1.

- **IT-006** (`task-required`): `loadTaskWorkspace and taskSpec.byTask` — given browser disconnects before the initial read completes; perform the named operation with the real component wiring; expect reopening returns the saved route without a command receipt.

- **IT-007** (`task-required`): `taskSpec.byTask` — given ten reads of approved planning before start; perform the named operation with the real component wiring; expect zero Spec attempts.

- **IT-008** (`task-required`): `taskSpec.start` — given stage=tasks while TechSpec is not approved; perform the named operation with the real component wiring; expect PRECONDITION_FAILED/stage_prerequisite.

- **IT-009** (`task-required`): `SpecInput assembly` — given remote Issue #42 is closed and renamed after publication; perform the named operation with the real component wiring; expect original published snapshot is retained in the new input.

- **IT-010** (`feature-gate`): `taskSpec.byTask` — given 1,000 task records with alternating routes; read task T1; perform the named operation with the real component wiring; expect only T1 route and stage are returned.

- **IT-011** (`task-required`): `taskSpec.start` — given project P1 with task T2 belonging to P2; perform the named operation with the real component wiring; expect NOT_FOUND/spec_unavailable.

- **IT-012** (`task-required`): `taskSpec.start` — given confirmed publication row lacks its saved body; perform the named operation with the real component wiring; expect PRECONDITION_FAILED/publication_required.

- **IT-013** (`task-required`): `SpecWorkerController admission` — given two active attempts and twenty queued attempts; accept one more; perform the named operation with the real component wiring; expect TOO_MANY_REQUESTS/spec_capacity.

- **IT-014** (`task-required`): `taskSpec.start` — given author A repository authorization revoked before acceptance; perform the named operation with the real component wiring; expect PRECONDITION_FAILED/repository_authorization_needed.

- **IT-015** (`task-required`): `taskSpec.start` — given two independent request keys race at specVersion=0; perform the named operation with the real component wiring; expect one queued attempt and one conflict.

- **IT-016** (`task-required`): `taskSpec.submission` — given start K1 committed but HTTP response was dropped; perform the named operation with the real component wiring; expect accepted receipt for K1 identifies the original attempt.

- **IT-017** (`task-required`): `taskSpec.start` — given repeat K1 and its exact payload after R1 becomes review-ready; perform the named operation with the real component wiring; expect original receipt returned without another runtime prompt.

- **IT-018** (`task-required`): `taskSpec.start` — given route=prd and stage=tech_spec before PRD approval; perform the named operation with the real component wiring; expect PRECONDITION_FAILED/stage_prerequisite.

- **IT-019** (`task-required`): `SpecWorkspaceGateway.prepare` — given resolved remote stable ID differs from stored GitHub ID; perform the named operation with the real component wiring; expect workspace_unavailable blocks dispatch.

- **IT-020** (`feature-gate`): `SpecWorkerController dispatch` — given P1/T1 and P2/T2 execute concurrently; perform the named operation with the real component wiring; expect each runtime receives only its own pinned input and checkout.

- **IT-021** (`task-required`): `normalizeSpecEvent` — given agent_message containing `<img onerror=alert(1)>` and an unknown event kind; perform the named operation with the real component wiring; expect safe inert content plus an unsupported-event notice.

- **IT-022** (`task-required`): `SpecActivity` — given queued R1 has zero saved events; perform the named operation with the real component wiring; expect queued text without fabricated activity or percentages.

- **IT-023** (`task-required`): `SpecActivity` — given safe agent message has 20,000 bytes; perform the named operation with the real component wiring; expect 16 KiB preview with access to all 20,000 saved bytes.

- **IT-024** (`task-required`): `taskSpec.events` — given membership revoked after the preceding successful page; perform the named operation with the real component wiring; expect next protected page denied and no new event bytes returned.

- **IT-025** (`task-required`): `reduceSpecEvents` — given sequence 9 completion followed by duplicate 9 and late running event 8; perform the named operation with the real component wiring; expect one completion entry and no lifecycle regression.

- **IT-026** (`feature-gate`): `useSpecSnapshot` — given network fails while runtime continues R1; perform the named operation with the real component wiring; expect connection warning retains the last known running state.

- **IT-027** (`task-required`): `reduceSpecEvents` — given replay identical provider event E1 three times; perform the named operation with the real component wiring; expect one visible E1.

- **IT-028** (`task-required`): `SpecWorkerController reconcile` — given done arrives while required _tests.md is absent; perform the named operation with the real component wiring; expect finalizing then artifact_invalid; no review-ready package.

- **IT-029** (`task-required`): `taskSpec.events` — given R1 fails after events E1 and E2; perform the named operation with the real component wiring; expect both events remain associated with failed R1.

- **IT-030** (`feature-gate`): `taskSpec.events` — given 10,000 events paged in batches of 100; perform the named operation with the real component wiring; expect all event identities remain reachable without hiding the current pending action.

- **IT-031** (`task-required`): `taskSpec.answer` — given question Q1 offers two choices and choiceIndex=2 is submitted; perform the named operation with the real component wiring; expect BAD_REQUEST/invalid_answer; Q1 stays pending.

- **IT-032** (`task-required`): `taskSpec.answer` — given Q1 receives whitespace-only text; perform the named operation with the real component wiring; expect BAD_REQUEST/invalid_answer.

- **IT-033** (`task-required`): `taskSpec.answer` — given Q1 receives 16,385 UTF-8 bytes; perform the named operation with the real component wiring; expect BAD_REQUEST/invalid_input without resolution.

- **IT-034** (`task-required`): `taskSpec.answer` — given nonauthor administrator C answers Q1; perform the named operation with the real component wiring; expect FORBIDDEN/author_required.

- **IT-035** (`task-required`): `SpecInteractionService.resolve` — given two tabs submit different answers to Q1 concurrently; perform the named operation with the real component wiring; expect one immutable winning answer.

- **IT-036** (`task-required`): `SpecRuntimeGateway.resolve` — given Q1 survives restart but its live provider turn is gone; perform the named operation with the real component wiring; expect orphaned delivery, not a continued-running claim.

- **IT-037** (`task-required`): `taskSpec.answer` — given accepted answer command K2 is replayed; perform the named operation with the real component wiring; expect same resolution; Q2 is unchanged.

- **IT-038** (`task-required`): `taskSpec.answer` — given Q1 belongs to superseded attempt R0 while R1 is current; perform the named operation with the real component wiring; expect CONFLICT/interaction_stale.

- **IT-039** (`task-required`): `SpecWorkerController settle` — given R1 cancellation confirms while Q1 is pending; perform the named operation with the real component wiring; expect Q1 becomes historical/inactive.

- **IT-040** (`feature-gate`): `taskSpec.byTask` — given 500 resolved questions and one pending Q501; perform the named operation with the real component wiring; expect Q501 is present in current pending state independent of history paging.

- **IT-041** (`task-required`): `taskSpec.permission` — given permission Pm1 has target=null; perform the named operation with the real component wiring; expect BAD_REQUEST/invalid_permission and no allow dispatch.

- **IT-042** (`task-required`): `SpecInteractionService` — given Pm1 omits its operation description; perform the named operation with the real component wiring; expect blocking integration diagnostic; no unlimited allow option.

- **IT-043** (`task-required`): `SpecRuntimeGateway.resolve` — given permission broker returns queue-full; perform the named operation with the real component wiring; expect Pm1 remains pending with interaction_queue_full.

- **IT-044** (`task-required`): `taskSpec.permission` — given reader B sends allow_once for Pm1; perform the named operation with the real component wiring; expect FORBIDDEN/author_required.

- **IT-045** (`task-required`): `SpecInteractionService.resolve` — given allow_once and deny_once race for Pm1; perform the named operation with the real component wiring; expect one saved authoritative decision.

- **IT-046** (`task-required`): `SpecRuntimeGateway.resolve` — given permission record is orphaned after daemon restart; perform the named operation with the real component wiring; expect historical resolution is distinguished from live action execution.

- **IT-047** (`task-required`): `SpecInteractionService` — given retry R2 receives a target different from R1 allowed target; perform the named operation with the real component wiring; expect new unresolved permission; previous grant is not reused.

- **IT-048** (`task-required`): `taskSpec.permission` — given Pm2 belongs to another work item; perform the named operation with the real component wiring; expect NOT_FOUND/spec_unavailable.

- **IT-049** (`task-required`): `taskSpec.permission` — given R1 state=stopping while an old permission control submits; perform the named operation with the real component wiring; expect CONFLICT/interaction_stale.

- **IT-050** (`feature-gate`): `taskSpec.byTask` — given 500 resolved permissions and two pending requests; perform the named operation with the real component wiring; expect both pending requests remain individually actionable without a blanket grant.

- **IT-051** (`task-required`): `PrdReview and validateSpecPackage` — given PRD includes active HTML and an unrepresented material block; perform the named operation with the real component wiring; expect inert rendering with blocking interpretation diagnostic.

- **IT-052** (`task-required`): `validateSpecPackage` — given _prd.md exists but _user_stories.md is empty; perform the named operation with the real component wiring; expect artifact_invalid; approval unavailable.

- **IT-053** (`feature-gate`): `PrdReview` — given one section contains 100,000 source bytes; perform the named operation with the real component wiring; expect all saved text remains available through bounded navigation.

- **IT-054** (`task-required`): `taskSpec.document` — given reader lacks personal repository authorization; perform the named operation with the real component wiring; expect PRECONDITION_FAILED/repository_authorization_needed.

- **IT-055** (`task-required`): `SpecReviewActions` — given viewed PRD V1 is replaced by current V2; perform the named operation with the real component wiring; expect V1 labeled historical and its approval disabled.

- **IT-056** (`task-required`): `useSpecCommand` — given connection fails during review without an accepted approval receipt; perform the named operation with the real component wiring; expect no local approval milestone is created.

- **IT-057** (`task-required`): `taskSpec.package` — given same package V1 is fetched repeatedly; perform the named operation with the real component wiring; expect same revision ID and approval facts.

- **IT-058** (`task-required`): `PrdReview` — given route=tech_spec with no PRD package; perform the named operation with the real component wiring; expect PRD displayed as unnecessary for this route.

- **IT-059** (`task-required`): `taskSpec.package` — given adjustment R2 failed while V1 is complete; perform the named operation with the real component wiring; expect V1 remains readable but is not automatically current/approved.

- **IT-060** (`feature-gate`): `PrdReview` — given 200 stories and 200 features in a valid package; perform the named operation with the real component wiring; expect stable section/story navigation reaches the final story.

- **IT-061** (`task-required`): `TechSpecReview` — given Mermaid block contains an external link/script payload; perform the named operation with the real component wiring; expect sanitized inert diagram or a visible blocking render gap.

- **IT-062** (`task-required`): `validateSpecPackage` — given _techspec.md exists without _tests.md; perform the named operation with the real component wiring; expect artifact_invalid; review readiness withheld.

- **IT-063** (`feature-gate`): `TechSpecReview` — given a 50-column contract table in a 390px viewport; perform the named operation with the real component wiring; expect full table remains accessible with labeled horizontal overflow.

- **IT-064** (`task-required`): `taskSpec.document` — given direct link names a package from unauthorized P2; perform the named operation with the real component wiring; expect NOT_FOUND/spec_unavailable.

- **IT-065** (`task-required`): `taskSpec.approve` — given TechSpec V1 hash submitted after V2 became current; perform the named operation with the real component wiring; expect CONFLICT/spec_conflict.

- **IT-066** (`task-required`): `SpecCaptureService` — given provider stops after writing only _techspec.md; perform the named operation with the real component wiring; expect partial package retained without review readiness.

- **IT-067** (`task-required`): `SpecCaptureService` — given same R1 manifest delivered twice; perform the named operation with the real component wiring; expect one package ID.

- **IT-068** (`task-required`): `specEligibility` — given route=prd without PRD approval versus route=tech_spec with approved planning; perform the named operation with the real component wiring; expect only the tech_spec route can start TechSpec.

- **IT-069** (`task-required`): `SpecWorkspaceGateway.verify` — given approved PRD bytes differ from their recorded hash; perform the named operation with the real component wiring; expect artifact_conflict blocks the next TechSpec dispatch.

- **IT-070** (`feature-gate`): `TechSpecReview` — given 4,096 planned test cases reference 100 components; perform the named operation with the real component wiring; expect all tests navigable and labeled planned, not executed.

- **IT-071** (`task-required`): `validateSpecGraph` — given task_01 depends on task_02 and task_02 depends on task_01; perform the named operation with the real component wiring; expect cycle diagnostic identifies both tasks.

- **IT-072** (`task-required`): `validateSpecPackage` — given _tasks.md references missing task_02.md; perform the named operation with the real component wiring; expect artifact_invalid identifies task_02.md.

- **IT-073** (`task-required`): `validateSpecPackage` — given 201 task files are generated; perform the named operation with the real component wiring; expect package_limit without dropping task 201.

- **IT-074** (`task-required`): `taskSpec.approve` — given reader B submits a Tasks package hash; perform the named operation with the real component wiring; expect FORBIDDEN/author_required.

- **IT-075** (`task-required`): `TasksReview` — given current V2 changes task_02 dependency while V1 is displayed; perform the named operation with the real component wiring; expect V1 is historical and requires current-version review.

- **IT-076** (`task-required`): `SpecCaptureService` — given runtime fails after 2 of 5 indexed task files; perform the named operation with the real component wiring; expect partial capture retains 2 files without review readiness.

- **IT-077** (`task-required`): `SpecLifecycleService.approve` — given repeat the same approved Tasks command; perform the named operation with the real component wiring; expect one approval and no generated implementation work.

- **IT-078** (`task-required`): `taskSpec.start` — given Tasks requested while TechSpec is in review; perform the named operation with the real component wiring; expect PRECONDITION_FAILED/stage_prerequisite.

- **IT-079** (`task-required`): `SpecWorkspaceGateway.verify` — given external task_01.md changes status from pending to completed; perform the named operation with the real component wiring; expect artifact_conflict; no implementation claim.

- **IT-080** (`feature-gate`): `TasksReview` — given 200-node valid dependency graph; perform the named operation with the real component wiring; expect pageable list reaches each task without requiring graph-only navigation.

- **IT-081** (`task-required`): `taskSpec.adjust` — given package V1 belongs to a different stage than the requested current stage; perform the named operation with the real component wiring; expect CONFLICT/spec_conflict.

- **IT-082** (`task-required`): `taskSpec.adjust` — given text is blank for current V1; perform the named operation with the real component wiring; expect BAD_REQUEST/invalid_input.

- **IT-083** (`task-required`): `taskSpec.adjust` — given text is exactly 16,385 UTF-8 bytes; perform the named operation with the real component wiring; expect BAD_REQUEST/invalid_input without shortening.

- **IT-084** (`task-required`): `taskSpec.adjust` — given author membership expires before acceptance; perform the named operation with the real component wiring; expect FORBIDDEN/access_revoked.

- **IT-085** (`task-required`): `SpecLifecycleService.adjust` — given two different changes race against V1; perform the named operation with the real component wiring; expect one active adjustment attempt.

- **IT-086** (`task-required`): `SpecCaptureService` — given adjustment R2 fails after partially modifying V1 candidate; perform the named operation with the real component wiring; expect V1 remains intact as the previous complete version.

- **IT-087** (`task-required`): `taskSpec.adjust` — given resend accepted K3 with identical V1/text; perform the named operation with the real component wiring; expect same attempt ID.

- **IT-088** (`task-required`): `taskSpec.adjust` — given target stage is already approved; perform the named operation with the real component wiring; expect CONFLICT/stage_approved.

- **IT-089** (`task-required`): `SpecWorkerController settle` — given R2 result arrives after verified cancellation; perform the named operation with the real component wiring; expect current package pointer stays unchanged.

- **IT-090** (`feature-gate`): `SpecChanges` — given 50 captured revisions exist; perform the named operation with the real component wiring; expect current diff uses only its parent/current pair and history remains navigable.

- **IT-091** (`task-required`): `taskSpec.approve` — given package ID belongs to another task; perform the named operation with the real component wiring; expect NOT_FOUND/spec_unavailable.

- **IT-092** (`task-required`): `SpecLifecycleService.approve` — given required companion is absent despite runtime done; perform the named operation with the real component wiring; expect PRECONDITION_FAILED/package_incomplete.

- **IT-093** (`feature-gate`): `SpecReviewActions` — given all 256 documents are accessible but only page one is expanded; perform the named operation with the real component wiring; expect no invented per-page acknowledgement requirement.

- **IT-094** (`task-required`): `taskSpec.approve` — given nonauthor administrator C submits exact current hash; perform the named operation with the real component wiring; expect FORBIDDEN/author_required.

- **IT-095** (`task-required`): `SpecLifecycleService.approve` — given two commands concurrently approve current V1; perform the named operation with the real component wiring; expect one immutable approval row.

- **IT-096** (`task-required`): `taskSpec.submission` — given approval K4 committed but its response was lost; perform the named operation with the real component wiring; expect original approval found without dispatching the next stage.

- **IT-097** (`task-required`): `taskSpec.approve` — given replay K4 one hour later; perform the named operation with the real component wiring; expect original approver/time/hash unchanged.

- **IT-098** (`task-required`): `taskSpec.approve` — given Tasks stage is unstarted and TechSpec unapproved; perform the named operation with the real component wiring; expect PRECONDITION_FAILED/stage_prerequisite.

- **IT-099** (`task-required`): `SpecWorkspaceGateway.verify` — given canonical companion changed before the approval job verifies disk; perform the named operation with the real component wiring; expect artifact_conflict rejects pending approval.

- **IT-100** (`feature-gate`): `taskSpec.package` — given 200 tasks across 50 revisions; perform the named operation with the real component wiring; expect approval manifest lists exactly the current package documents.

- **IT-101** (`task-required`): `taskSpec.cancel` — given attempt belongs to T2 while request scope is T1; perform the named operation with the real component wiring; expect NOT_FOUND/spec_unavailable.

- **IT-102** (`task-required`): `taskSpec.cancel` — given named current attempt is already terminal; perform the named operation with the real component wiring; expect existing terminal receipt/result without a new stop operation.

- **IT-103** (`task-required`): `SpecWorkerController stop` — given runtime reports stopping with verified=false for 61 seconds; perform the named operation with the real component wiring; expect stopping plus attention warning; no canceled claim.

- **IT-104** (`task-required`): `taskSpec.cancel` — given reader B requests cancel R1; perform the named operation with the real component wiring; expect FORBIDDEN/author_required.

- **IT-105** (`task-required`): `SpecWorkerController settle` — given verified cancellation and completed capture race; perform the named operation with the real component wiring; expect one terminal winner; canceled R1 never promotes a late package.

- **IT-106** (`task-required`): `SpecWorkerController stop` — given daemon connection drops after stop acceptance; perform the named operation with the real component wiring; expect outcome_unknown retained and retry blocked.

- **IT-107** (`task-required`): `taskSpec.cancel` — given repeat accepted stop K5; perform the named operation with the real component wiring; expect one stop command and the same settlement.

- **IT-108** (`task-required`): `taskSpec.retry` — given R1 is still stopping; perform the named operation with the real component wiring; expect CONFLICT/outcome_unknown.

- **IT-109** (`task-required`): `taskSpec.cancel` — given attempt already produced an approved package; perform the named operation with the real component wiring; expect approval remains unchanged.

- **IT-110** (`feature-gate`): `SpecProgress` — given 100 canceled attempts precede active R101; perform the named operation with the real component wiring; expect one current cancellation control for R101.

- **IT-111** (`task-required`): `taskSpec.retry` — given failedAttemptId=R0 while R1 superseded it; perform the named operation with the real component wiring; expect CONFLICT/spec_conflict.

- **IT-112** (`task-required`): `SpecInput assembly` — given Q2 answer was never durably saved before crash; perform the named operation with the real component wiring; expect retry context discloses unavailable answer instead of inventing it.

- **IT-113** (`task-required`): `SpecWorkerController retry` — given retained required inline context is 262,145 bytes; perform the named operation with the real component wiring; expect context_limit with saved package/context preserved.

- **IT-114** (`task-required`): `taskSpec.retry` — given author GitHub credential revoked after failure; perform the named operation with the real component wiring; expect PRECONDITION_FAILED/repository_authorization_needed.

- **IT-115** (`task-required`): `SpecLifecycleService.retry` — given two retries race for the same failed R1; perform the named operation with the real component wiring; expect one R2 and one conflict.

- **IT-116** (`task-required`): `taskSpec.submission` — given retry K6 response is lost after acceptance; perform the named operation with the real component wiring; expect original R2 returned on reconciliation.

- **IT-117** (`task-required`): `taskSpec.retry` — given repeat accepted K6 after R2 succeeded; perform the named operation with the real component wiring; expect original receipt; no R3.

- **IT-118** (`task-required`): `taskSpec.retry` — given payload attempts stage=prd for a tech_spec route; perform the named operation with the real component wiring; expect BAD_REQUEST/invalid_input; route remains tech_spec.

- **IT-119** (`task-required`): `SpecRuntimeGateway.preflight` — given configured binary/bundle digest changed from the accepted pin; perform the named operation with the real component wiring; expect runtime_incompatible blocks dispatch.

- **IT-120** (`feature-gate`): `SpecInput assembly` — given 100 attempts contain decisions for two stages; perform the named operation with the real component wiring; expect only relevant saved decisions and approved inputs enter the current stage context.

- **IT-121** (`task-required`): `SpecWorkspaceGateway.freeze` — given generated output is ../../src/index.ts or a symlink outside the candidate; perform the named operation with the real component wiring; expect artifact_invalid without copying unsafe bytes.

- **IT-122** (`task-required`): `SpecWorkspaceGateway.verify` — given canonical _tests.md disappeared; perform the named operation with the real component wiring; expect artifact_conflict blocks continuation while captured V1 remains readable.

- **IT-123** (`task-required`): `SpecCaptureService` — given aggregate source size is 8 MiB plus 1 byte; perform the named operation with the real component wiring; expect package_limit; prior complete package unchanged.

- **IT-124** (`task-required`): `taskSpec.document` — given reader changes documentId to a foreign historical revision; perform the named operation with the real component wiring; expect NOT_FOUND/spec_unavailable.

- **IT-125** (`task-required`): `SpecWorkspaceGateway.promote` — given target file hash changes externally after candidate capture; perform the named operation with the real component wiring; expect artifact_conflict without overwriting external bytes.

- **IT-126** (`task-required`): `SpecCaptureService` — given process dies after the first installed file but before installed journal commit; perform the named operation with the real component wiring; expect recovery reconciles old/new hashes without premature review.

- **IT-127** (`task-required`): `SpecCaptureService` — given repeat capture for identical attempt/manifest; perform the named operation with the real component wiring; expect same package ID.

- **IT-128** (`task-required`): `SpecLifecycleService` — given unassociated files exist on disk without an accepted attempt; perform the named operation with the real component wiring; expect no stage completion or approval is inferred.

- **IT-129** (`task-required`): `SpecWorkspaceGateway.verify` — given approved file is replaced externally; perform the named operation with the real component wiring; expect approved snapshot remains immutable and conflict is visible.

- **IT-130** (`feature-gate`): `taskSpec.packages` — given 50 packages each in P1 and P2; perform the named operation with the real component wiring; expect cursor pages contain only the requested authorized work item.

- **IT-131** (`task-required`): `taskSpec.events` — given reader reuses T1 cursor against T2; perform the named operation with the real component wiring; expect BAD_REQUEST/invalid_cursor.

- **IT-132** (`task-required`): `taskSpec.byTask` — given reader opens approved planning before Spec starts; perform the named operation with the real component wiring; expect not-started state without provisioning.

- **IT-133** (`task-required`): `taskSpec.events` — given reader pages through 1,001 events; perform the named operation with the real component wiring; expect last event remains reachable with the same limit notice as author.

- **IT-134** (`task-required`): `taskSpec.document` — given membership revoked between document pages; perform the named operation with the real component wiring; expect next page is denied.

- **IT-135** (`task-required`): `useSpecSnapshot` — given author publishes V2 while reader inspects V1; perform the named operation with the real component wiring; expect reader sees current V2 notice and historical V1 identity.

- **IT-136** (`task-required`): `useSpecSnapshot` — given reader reconnects after author answered Q1; perform the named operation with the real component wiring; expect saved Q1 answer shown without response dispatch.

- **IT-137** (`task-required`): `taskSpec.byTask` — given reader visits task ten times; perform the named operation with the real component wiring; expect zero new commands/attempts/approvals.

- **IT-138** (`task-required`): `taskSpec.package` — given reader requests a not-yet-produced future-stage package; perform the named operation with the real component wiring; expect NOT_FOUND/spec_unavailable without starting work.

- **IT-139** (`task-required`): `SpecStage` — given author cancels R1 with partial files; perform the named operation with the real component wiring; expect reader sees canceled/partial labels without takeover controls.

- **IT-140** (`feature-gate`): `taskSpec.events` — given twenty authorized readers observe R1 concurrently; perform the named operation with the real component wiring; expect all read one authoritative event/approval history.

- **IT-141** (`task-required`): `taskSpec.document` — given admin C supplies P1 scope with a P2 package; perform the named operation with the real component wiring; expect NOT_FOUND/spec_unavailable.

- **IT-142** (`task-required`): `taskSpec.byTask` — given admin inspects a project task with no Spec workflow; perform the named operation with the real component wiring; expect not-started result and no checkout creation.

- **IT-143** (`task-required`): `TaskSpecController error mapping` — given runtime failure contains token=canary-secret and a host path; perform the named operation with the real component wiring; expect response excludes both sensitive values.

- **IT-144** (`task-required`): `taskSpec.events` — given admin visibility is withdrawn between polls; perform the named operation with the real component wiring; expect next protected read denied.

- **IT-145** (`task-required`): `SpecStage` — given admin views V1 while author approves V2; perform the named operation with the real component wiring; expect current approval is V2 and no mutation control appears.

- **IT-146** (`task-required`): `taskSpec.byTask` — given admin session expired; perform the named operation with the real component wiring; expect UNAUTHORIZED/session_required.

- **IT-147** (`task-required`): `taskSpec.byTask` — given repeat admin inspection after author approval; perform the named operation with the real component wiring; expect original approval attribution/version unchanged.

- **IT-148** (`task-required`): `taskSpec.package` — given admin requests absent Tasks package before execution; perform the named operation with the real component wiring; expect NOT_FOUND/spec_unavailable.

- **IT-149** (`task-required`): `SpecWorkerController entitlement check` — given author loses access while Q1 is pending; perform the named operation with the real component wiring; expect system stop requested; no admin answer or ownership transfer.

- **IT-150** (`feature-gate`): `taskSpec.byTask` — given admin can access P1 repo but lacks personal authorization for P2; perform the named operation with the real component wiring; expect P2 protected content remains unavailable despite P1 access.

- **IT-151** (`task-required`): Public tRPC `taskSpec.byTask` with valid authorized fixture input returns selected route, current state, permissions, pending Q1, specVersion and cursor without full history.

- **IT-152** (`task-required`): Public tRPC `taskSpec.events` with valid authorized fixture input returns events in ascending order with next cursor and hasMore for a 51-event fixture at limit=50.

- **IT-153** (`task-required`): Public tRPC `taskSpec.packages` with valid authorized fixture input returns twenty revision metadata rows and a continuation cursor for 21 saved packages.

- **IT-154** (`task-required`): Public tRPC `taskSpec.package` with valid authorized fixture input returns the exact V1 manifest, document identities, source-linked index and diagnostics.

- **IT-155** (`task-required`): Public tRPC `taskSpec.document` with valid authorized fixture input returns source bytes and SHA-256 matching captured D1; block mode pages through all 101 blocks at limit=100.

- **IT-156** (`task-required`): Public tRPC `taskSpec.submission` with valid authorized fixture input returns unknown for unused K9 and the original immutable receipt for accepted K1 in separate table rows.

- **IT-157** (`task-required`): Public tRPC `taskSpec.event` with valid authorized fixture input returns all 20,000 safe saved bytes for E1 with omission metadata and no raw provider envelope.

- **IT-158** (`task-required`): Public tRPC `taskSpec.start` with valid authorized fixture input returns accepted receipt with R1 after valid stage=prd input.

- **IT-159** (`task-required`): Public tRPC `taskSpec.adjust` with valid authorized fixture input returns accepted receipt with R2 for current V1 and text="Clarify retention".

- **IT-160** (`task-required`): Public tRPC `taskSpec.answer` with valid authorized fixture input returns accepted receipt with delivery pending for current Q1 text="Thirty days".

- **IT-161** (`task-required`): Public tRPC `taskSpec.permission` with valid authorized fixture input returns accepted receipt for current Pm1/action digest and decision=deny_once.

- **IT-162** (`task-required`): Public tRPC `taskSpec.cancel` with valid authorized fixture input returns the original stopping receipt for active R1.

- **IT-163** (`task-required`): Public tRPC `taskSpec.retry` with valid authorized fixture input returns accepted receipt for new R2 when R1 is confirmed failed.

- **IT-164** (`task-required`): Public tRPC `taskSpec.returnToReview` with valid authorized fixture input returns accepted restore receipt for previous complete V1 after failed adjustment R2.

- **IT-165** (`task-required`): Public tRPC `taskSpec.approve` with valid authorized fixture input returns accepted receipt for exact current V1/hash; applying it records author A and explicit timestamp.

- **IT-166** (`task-required`): Parameterized public tRPC cases for `taskSpec.byTask`, `taskSpec.events`, `taskSpec.packages`, `taskSpec.package`, `taskSpec.document`, `taskSpec.submission`, `taskSpec.event`, `taskSpec.start`, `taskSpec.adjust`, `taskSpec.answer`, `taskSpec.permission`, `taskSpec.cancel`, `taskSpec.retry`, `taskSpec.returnToReview`, `taskSpec.approve` — given no authenticated session, expect UNAUTHORIZED/session_required (401).

- **IT-167** (`task-required`): Parameterized public tRPC cases for `taskSpec.byTask`, `taskSpec.events`, `taskSpec.packages`, `taskSpec.package`, `taskSpec.document`, `taskSpec.submission`, `taskSpec.event`, `taskSpec.start`, `taskSpec.adjust`, `taskSpec.answer`, `taskSpec.permission`, `taskSpec.cancel`, `taskSpec.retry`, `taskSpec.returnToReview`, `taskSpec.approve` — given foreign hidden task T2 requested under P1, expect NOT_FOUND/spec_unavailable (404).

- **IT-168** (`task-required`): Parameterized public tRPC cases for `taskSpec.byTask`, `taskSpec.events`, `taskSpec.packages`, `taskSpec.package`, `taskSpec.document`, `taskSpec.submission`, `taskSpec.event`, `taskSpec.start`, `taskSpec.adjust`, `taskSpec.answer`, `taskSpec.permission`, `taskSpec.cancel`, `taskSpec.retry`, `taskSpec.returnToReview`, `taskSpec.approve` — given personal repository authorization absent, including a public repository, expect PRECONDITION_FAILED/repository_authorization_needed (412).

- **IT-169** (`task-required`): Parameterized public tRPC cases for `taskSpec.byTask`, `taskSpec.events`, `taskSpec.packages`, `taskSpec.package`, `taskSpec.document`, `taskSpec.submission`, `taskSpec.event`, `taskSpec.start`, `taskSpec.adjust`, `taskSpec.answer`, `taskSpec.permission`, `taskSpec.cancel`, `taskSpec.retry`, `taskSpec.returnToReview`, `taskSpec.approve` — given previously visible project access revoked, expect FORBIDDEN/access_revoked (403).

- **IT-170** (`task-required`): Parameterized public tRPC cases for `taskSpec.byTask`, `taskSpec.events`, `taskSpec.packages`, `taskSpec.package`, `taskSpec.document`, `taskSpec.submission`, `taskSpec.event`, `taskSpec.start`, `taskSpec.adjust`, `taskSpec.answer`, `taskSpec.permission`, `taskSpec.cancel`, `taskSpec.retry`, `taskSpec.returnToReview`, `taskSpec.approve` — given malformed UUID input, expect BAD_REQUEST/invalid_input (400).

- **IT-171** (`task-required`): Parameterized public tRPC cases for `taskSpec.byTask`, `taskSpec.events`, `taskSpec.packages`, `taskSpec.package`, `taskSpec.document`, `taskSpec.submission`, `taskSpec.event`, `taskSpec.start`, `taskSpec.adjust`, `taskSpec.answer`, `taskSpec.permission`, `taskSpec.cancel`, `taskSpec.retry`, `taskSpec.returnToReview`, `taskSpec.approve` — given database I/O throws an unexpected exception containing a canary secret, expect INTERNAL_SERVER_ERROR/service_unavailable (500) with no canary.

- **IT-172** (`task-required`): Parameterized public tRPC cases for `taskSpec.start`, `taskSpec.adjust`, `taskSpec.answer`, `taskSpec.permission`, `taskSpec.cancel`, `taskSpec.retry`, `taskSpec.returnToReview`, `taskSpec.approve`, `taskSpec.submission` — given actor is reader B or nonauthor admin C, expect FORBIDDEN/author_required (403).

- **IT-173** (`task-required`): Parameterized public tRPC cases for `taskSpec.start`, `taskSpec.adjust`, `taskSpec.answer`, `taskSpec.permission`, `taskSpec.cancel`, `taskSpec.retry`, `taskSpec.returnToReview`, `taskSpec.approve` — given existing requestKey reused with a changed action or payload, expect CONFLICT/request_key_reused (409).

- **IT-174** (`task-required`): Parameterized public tRPC cases for `taskSpec.start`, `taskSpec.adjust`, `taskSpec.answer`, `taskSpec.permission`, `taskSpec.cancel`, `taskSpec.retry`, `taskSpec.returnToReview`, `taskSpec.approve` — given expectedSpecVersion is older than the locked current version and no matching receipt exists, expect CONFLICT/spec_conflict (409).

- **IT-175** (`task-required`): Parameterized public tRPC cases for `taskSpec.events`, `taskSpec.packages`, `taskSpec.document` — given cursor scope/direction/signature is invalid, expect BAD_REQUEST/invalid_cursor (400).

- **IT-176** (`task-required`): Parameterized public tRPC cases for `taskSpec.start` — given publication is unconfirmed, expect PRECONDITION_FAILED/publication_required (412).

- **IT-177** (`task-required`): Parameterized public tRPC cases for `taskSpec.start` — given planning is not approved, expect PRECONDITION_FAILED/planning_required (412).

- **IT-178** (`task-required`): Parameterized public tRPC cases for `taskSpec.start` — given selected route is direct_execution or unknown, expect PRECONDITION_FAILED/route_unsupported (412).

- **IT-179** (`task-required`): Parameterized public tRPC cases for `taskSpec.start`, `taskSpec.approve` — given required upstream stage is not approved, expect PRECONDITION_FAILED/stage_prerequisite (412).

- **IT-180** (`task-required`): Parameterized public tRPC cases for `taskSpec.start`, `taskSpec.retry` — given runner is unconfigured, expect PRECONDITION_FAILED/runtime_unconfigured (412).

- **IT-181** (`task-required`): Parameterized public tRPC cases for `taskSpec.start`, `taskSpec.retry` — given pinned runtime/provider/bundle capability check fails, expect PRECONDITION_FAILED/runtime_incompatible (412).

- **IT-182** (`task-required`): Parameterized public tRPC cases for `taskSpec.start`, `taskSpec.retry` — given workspace binding is missing or mismatched, expect PRECONDITION_FAILED/workspace_unavailable (412).

- **IT-183** (`task-required`): Parameterized public tRPC cases for `taskSpec.start`, `taskSpec.adjust`, `taskSpec.retry` — given runner queue already has twenty entries and both slots are occupied, expect TOO_MANY_REQUESTS/spec_capacity (429).

- **IT-184** (`task-required`): Parameterized public tRPC cases for `taskSpec.start`, `taskSpec.adjust` — given another current attempt is active, expect CONFLICT/attempt_active (409).

- **IT-185** (`task-required`): Parameterized public tRPC cases for `taskSpec.retry`, `taskSpec.returnToReview` — given preceding stop/dispatch outcome is unknown, expect CONFLICT/outcome_unknown (409).

- **IT-186** (`task-required`): Parameterized public tRPC cases for `taskSpec.adjust`, `taskSpec.approve` — given stage is already approved and requestKey is new, expect CONFLICT/stage_approved (409).

- **IT-187** (`task-required`): Parameterized public tRPC cases for `taskSpec.approve` — given current package lacks a required companion or faithful material representation, expect PRECONDITION_FAILED/package_incomplete (412).

- **IT-188** (`task-required`): Parameterized public tRPC cases for `taskSpec.approve` — given decision D1 remains explicitly blocking, expect PRECONDITION_FAILED/decision_blocked (412).

- **IT-189** (`task-required`): Parameterized public tRPC cases for `taskSpec.answer` — given response format does not match Q1 choices, expect BAD_REQUEST/invalid_answer (400).

- **IT-190** (`task-required`): Parameterized public tRPC cases for `taskSpec.permission` — given target/action digest is missing or mismatched, expect BAD_REQUEST/invalid_permission (400).

- **IT-191** (`task-required`): Parameterized public tRPC cases for `taskSpec.permission` — given allow_once would permit git push or another repository, expect PRECONDITION_FAILED/permission_out_of_scope (412).

- **IT-192** (`task-required`): Parameterized public tRPC cases for `taskSpec.answer`, `taskSpec.permission` — given interaction belongs to a stale turn in the same workflow, expect CONFLICT/interaction_stale (409).

- **IT-193** (`task-required`): Parameterized public tRPC cases for `taskSpec.answer`, `taskSpec.permission` — given a different value already won resolution, expect CONFLICT/interaction_resolved (409).

- **IT-194** (`task-required`): Parameterized public tRPC cases for `taskSpec.answer`, `taskSpec.permission` — given runtime rejects delivery with queue-full, expect saved interaction_queue_full receipt with pending delivery; no applied outcome.

- **IT-195** (`task-required`): Parameterized public tRPC cases for `taskSpec.start`, `taskSpec.retry` — given GitHub/provider returns rate limit during pre-acceptance validation, expect TOO_MANY_REQUESTS/provider_rate_limited (429) with safe retryAfterSeconds.

- **IT-196** (`task-required`): Parameterized public tRPC cases for `taskSpec.adjust`, `taskSpec.approve`, `taskSpec.returnToReview` — given worker verifies a changed canonical companion, expect saved rejected receipt reason=artifact_conflict; approval unchanged.

- **IT-197** (`task-required`): Real PostgreSQL: insert a second nonterminal attempt for workflow W1; partial unique index rejects it.

- **IT-198** (`task-required`): Real PostgreSQL: change author/hash/time on an existing Spec approval; immutable trigger rejects it.

- **IT-199** (`task-required`): Real PostgreSQL: attempt to update approved planning through Spec wiring; existing immutable trigger rejects it.

- **IT-200** (`task-required`): Kill worker after receipt commit before prompt dispatch; restart returns the same command and sends one logical prompt using its stored IDs.

- **IT-201** (`task-required`): Drop session-create HTTP response after creation; reconcile exact attempt name/workspace and bind its one session before any prompt.

- **IT-202** (`task-required`): Make catalog reconciliation ambiguous with two matching sessions; keep outcome_unknown and dispatch zero prompts.

- **IT-203** (`task-required`): Return 409 indeterminate for submitted prompt IDs; worker retains those IDs and admits no competing attempt.

- **IT-204** (`task-required`): Raw SSE emits sequences 1,2,2,3 then reconnect from 3; saved public projection contains each accepted identity once.

- **IT-205** (`task-required`): Raw stream skips sequence 2 and newest-N query cannot recover it; worker marks reconciling without claiming complete history.

- **IT-206** (`task-required`): Database transaction A allocates event sequence 10 then stalls while B appends; B cannot expose 11 before A commits/rolls back.

- **IT-207** (`task-required`): Provider emits thought and Authorization: canary-secret payloads; application event rows contain neither private thought text nor the canary.

- **IT-208** (`task-required`): Tagged clarification response is {choice:0,fallback:false,text:"A"}; adapter queries the recorded interaction before claiming live delivery.

- **IT-209** (`task-required`): Runtime returns already-resolved with winner deny_once after allow_once was sent; persisted projection shows the runtime winner without broadening the grant.

- **IT-210** (`task-required`): Malformed/empty Q1 title after provider redaction; response is blocked as incomplete rather than answering hidden question content.

- **IT-211** (`task-required`): POST stop returns 202, then inspect reports verified=false; attempt remains stopping.

- **IT-212** (`task-required`): Inspect returns stopped/verified=true/user_canceled; one canceled terminal event is committed.

- **IT-213** (`task-required`): Inspect returns 404 after accepted stop; worker retains outcome_unknown rather than assuming termination.

- **IT-214** (`task-required`): Inject failure before prepared transaction commits; no review-ready row or canonical promotion exists.

- **IT-215** (`task-required`): Inject failure after prepared commit before first rename; recovery installs the captured immutable bytes once.

- **IT-216** (`task-required`): Inject failure after all renames before review-ready commit; recovery verifies manifest and exposes one review version.

- **IT-217** (`task-required`): Inject disk-full while writing a temp file; previous complete canonical package stays intact and capture_failed is visible.

- **IT-218** (`task-required`): Candidate modifies an approved upstream ADR; validation rejects it before promotion.

- **IT-219** (`task-required`): Candidate contains two case-colliding paths or a hardlinked file; validation returns artifact_invalid.

- **IT-220** (`task-required`): Restore previous V1 after failed adjustment using returnToReview; canonical current-stage hashes become V1 hashes without an approval row.

- **IT-221** (`task-required`): Restore V1 after external canonical edit; preserve external bytes and return artifact_conflict.

- **IT-222** (`task-required`): Tasks index contains duplicate task_01 identity; validation reports duplicate_task and withholds readiness.

- **IT-223** (`task-required`): task_01 references absent task_99; validation reports missing_dependency and names task_99.

- **IT-224** (`task-required`): Required UT-001 is unassigned; validateTestOwnership reports unassigned_test.

- **IT-225** (`task-required`): feature-gate IT-001 has no named gate owner/reference; validation reports unassigned_gate.

- **IT-226** (`task-required`): Package index references a material section with the wrong source hash; validation reports interpretation_gap.

- **IT-227** (`task-required`): Unknown safe heading "Additional constraints" contains a requirement; parser preserves the whole section in Human View.

- **IT-228** (`task-required`): Adjustment index proposes changing an approved upstream constraint; decision remains blocking and upstream bytes unchanged.

- **IT-229** (`task-required`): Run independently at document bytes 1 MiB/1 MiB+1, package bytes 8 MiB/8 MiB+1, files 256/257, tasks 200/201 and tests 4096/4097; boundary accepted and excess returns package_limit.

- **IT-230** (`task-required`): Large approved documents exceed inline budget but are complete read-only references; runtime prompt points to the full saved inputs without truncation.

- **IT-231** (`task-required`): Preflight sees managed agent permission mode approve-all; reject runtime_incompatible before accepting execution.

- **IT-232** (`task-required`): Provision private repository with supervisor credential helper; process argv, saved Git config, runtime environment and public events contain no GitHub canary token.

- **IT-233** (`task-required`): Account authorization changes between accepted command and worker dispatch; worker does not invoke the runtime and records access_revoked.

- **IT-234** (`task-required`): Author browser session expires while project/repository entitlement remains valid; execution is not automatically canceled solely for browser expiry.

- **IT-235** (`task-required`): Pending Q1, undelivered response or unresolved capture independently prevents approval; each table row returns its specific blocker.

- **IT-236** (`task-required`): Execute all Spec command handlers through real services with recording GitHub I/O boundary; no Issue edit/comment, PR, commit, push or board-placement method is invoked.

- **IT-237** (`task-required`): Visibility becomes hidden during active R1; hook stops periodic reads, then refreshes exactly on return without dispatching work.

- **IT-238** (`task-required`): User A logs out while K1 is uncertain; user B cannot load/resend A pending payload.

- **IT-239** (`task-required`): Start proposed specWorker CLI with invalid/missing runtime root; exit nonzero with safe configuration reason before claiming database work.

- **IT-240** (`feature-gate`): Apply all migrations to a database containing approved published/planning fixtures; Spec tables are available and earlier immutable facts are unchanged.

- **IT-241** (`feature-gate`): Two Spec attempts wait for input while ordinary generate/publish/plan jobs are queued; the existing tasks worker continues processing its own slots.

- **IT-242** (`feature-gate`): Clone a disposable private test repository using the author token; stored base SHA remains unchanged after the remote default branch advances.

- **IT-243** (`feature-gate`): Run two real temporary candidate workspaces for different projects; generated artifacts/events retain the correct task/project binding.

- **IT-244** (`feature-gate`): Restore captured database and checkout journal from a consistent backup with one prepared package; admission remains disabled until manifest/runtime reconciliation completes.

- **IT-245** (`feature-gate`): Backend parse and real React views render GFM/code/story/test/task fixture set with every source block represented or explicitly blocked.

- **IT-246** (`feature-gate`): Run two active fixtures with twenty readers; record p95 command acceptance, persisted-event visibility and maximum-package metadata latency against TechSpec budgets.

- **IT-247** (`qa-release`): Start checksum-verified beta.29 in rootless container with operator provider credentials; record a real session and observed sanitized prompt/event contract.

- **IT-248** (`qa-release`): Execute flow-spec-prd → explicit approval → flow-spec-techspec → explicit approval → flow-spec-tasks; actual outputs contain all separate companions and task ownership validates.

- **IT-249** (`qa-release`): Execute flow-spec-techspec with Issue/planning and no PRD → approve → flow-spec-tasks; actual outputs complete without generating a fake PRD or _spec.md prerequisite.

- **IT-250** (`qa-release`): Real authenticated provider asks Q1 through Compozy; Flow Dev answer is applied to that live turn and its next user-visible event is captured.

- **IT-251** (`qa-release`): Real provider raises a bounded write permission; deny_once is observed with actual runtime outcome and no document approval.

- **IT-252** (`qa-release`): Restart isolated daemon while a real question is pending; record actual orphan outcome and explicitly retry with saved answer after verified prior settlement.

- **IT-253** (`qa-release`): Cancel a real running provider; inspect confirms process termination before a competing attempt is admitted.

- **IT-254** (`qa-release`): Attempt source-code write, upstream ADR write, another-project read, Git push and host/container-socket access inside the real candidate container; each operation is denied.

- **IT-255** (`qa-release`): Attempt provider call through allowlisted endpoint versus arbitrary HTTP POST, GitHub Issue write and host-local access; only the configured provider operation succeeds.

- **IT-256** (`qa-release`): Exercise configured CPU/memory/disk exhaustion and diagnostic cleanup after thirty days; failures stay explicit and captured package/approval history is retained.

- **IT-257** (`qa-release`): Change binary/provider/bundle identity on a configured runner; capability gate disables new work until the full compatibility report is renewed.


## End-to-End Tests

- **E2E-001** (`feature-gate`): Author opens historical T1 with selected prd despite recommended tech_spec → sees Criar PRD → reopens → still sees the same eligible action without an attempt.

- **E2E-002** (`feature-gate`): Author starts TechSpec-only T1 → sees queued/running attribution → runtime fixture writes _techspec.md and _tests.md → sees review for one captured version without a PRD requirement.

- **E2E-003** (`feature-gate`): Author starts R1 → observes saved agent message and tool result before generation finishes → disconnects/reconnects → sees one coherent timeline and current state.

- **E2E-004** (`feature-gate`): Author sees Q1 → selects a choice without sending → reloads and Q1 stays pending → sends explicit answer → sees confirmed saved answer and actual resumed state.

- **E2E-005** (`feature-gate`): Author sees bounded Pm1 → denies it → sees actual blocked/continued runtime result → package remains unapproved.

- **E2E-006** (`feature-gate`): Author opens PRD Human View → navigates scope, stories, acceptance/edges and ADR → inspects companion source → returns to the exact V1 review.

- **E2E-007** (`feature-gate`): Author opens TechSpec Human View → reads contract/table/diagram and linked planned tests → sees upstream input identity and unresolved decision blocker.

- **E2E-008** (`feature-gate`): Author opens Tasks Human View → follows dependency from task_02 to task_01 → reads full acceptance and test ownership → sees all tasks as prepared rather than implemented.

- **E2E-009** (`feature-gate`): Author requests adjustment to V1 → sees running R2 → receives V2 → inspects actual changes and previous V1 → sees V2 awaiting approval.

- **E2E-010** (`feature-gate`): Author follows PRD → approves exact PRD → explicitly starts TechSpec → approves exact TechSpec → explicitly starts Tasks → approves exact Tasks → sees Spec aprovado with no implementation run.

- **E2E-011** (`feature-gate`): Author starts R1 and waits at Q1 → requests cancel → sees stopping until verified → sees canceled history and retained partial outputs.

- **E2E-012** (`feature-gate`): Author adjustment R2 fails → returns explicitly to previous complete V1 → V1 is reviewable without automatic approval → new explicit adjustment reuses saved decisions.

- **E2E-013** (`feature-gate`): Author inspects captured V1 and source hash → operator fixture changes canonical file → next protected transition shows conflict → V1 remains inspectable as the reviewed bytes.

- **E2E-014** (`feature-gate`): Reader B watches author A answer Q1 and approve V1 → sees shared progress and artifacts → has no controls to mutate any stage.

- **E2E-015** (`feature-gate`): Nonauthor admin C opens T1 with personal repository authorization → reads history → loses authorization → sees access recovery and cannot read the next document.

- **E2E-016** (`feature-gate`): Author completes TechSpec-only route → explicitly starts and approves Tasks → sees Spec aprovado without a fabricated approved PRD.

- **E2E-017** (`feature-gate`): Reader B calls permission action through the public API while its UI is read-only → receives author_required → author still sees the original pending permission.

- **E2E-018** (`feature-gate`): Author cancels R1 → connection drops before stop confirmation → retry stays unavailable → reconnect settles canceled → explicit retry creates exactly one R2.

- **E2E-019** (`qa-release`): At 390px viewport with keyboard and reduced motion, author navigates each Human View → reaches full wide-table/task content and approval controls with visible focus.

- **E2E-020** (`qa-release`): With dark/light themes and a screen reader, author follows live state updates → receives state announcements without repeated text-chunk announcements or focus loss.

## Coverage and release interpretation

All 15 stories and 150 edge cases are represented. No story-catalog gap was found. The integration cases for each story's scale edge supplement its UI journey; they do not require a multi-browser run during every implementation task. Unit happy/error pairs also cover the shared contracts that several story cases exercise.

The real beta.29/provider/bundle, isolation, replay, interaction and stop gates remain unexecuted until implementation supplies their named environment and evidence. Passing fixture tests alone cannot enable this feature. Generated `_tests.md` content in runtime fixtures remains planned validation; only actual harness results count as execution evidence.
