# Test Specification: Assigned Issue Workspace and Local Project Execution

Canonical test contract. Companion to [_techspec.md](_techspec.md), derived from the complete [_user_stories.md](_user_stories.md) catalog and ADRs 001–005.

## Strategy

- API source unit tests: Vitest via `pnpm --dir packages/api test`; PostgreSQL integration via `pnpm --dir packages/api test:integration`; web components via `pnpm --dir apps/web test`; UI journeys via `pnpm --dir apps/web test:e2e`.
- Fake I/O only: GitHub/Dev Control/runtime HTTP, subprocess boundary, clock. Use real controllers/services/DAOs, actual isolated PostgreSQL fixtures, real temporary Git roots and journal files for integration. Public CLI cases spawn the CLI, not its private functions.
- Each case seeds independent state. Use accessible Playwright locators, pt-BR visible feedback and a dedicated test database/session/repository. Never intentionally validate against production accounts/services. Existing browser config is Chromium; release tours add only explicitly configured browsers.
- `task-required` cases prove focused implemented behavior. `feature-gate` cases run after cross-slice wiring; `qa-release` requires real hosted service/developer machines, GitHub sandbox or human accessibility verification. None are reported executed by this specification.
- Parameterized contract cases expand into one independent test per named procedure/route/command/fixture. Each expansion asserts the single documented success/error outcome; do not implement a single smoke test that skips remaining operations.
- For existing operations, bind the parameterized family to the actual registered router/HTTP/capture operations at implementation time; missing or new registrations fail the boundary guard. Existing narrower input/version/publication/package failure tests remain required and are preserved, not replaced by new family cases.
- Stable IDs are allocated now. Future task decomposition assigns each task-required ID exactly once and records later gates; do not renumber after tasks reference them.

### Canonical fixtures

Use isolated UUIDs: P1=`10000000-0000-4000-8000-000000000001`, T1=`20000000-0000-4000-8000-000000000001`, U1=`30000000-0000-4000-8000-000000000001`; U2/P2/T2 use suffix 2. Other uppercase symbols denote stable generated UUID fixture references. GitHub issue node I1=`I_fixture_41`, repo R1=`R_fixture_flow` with numeric ID `101`, board item B1=`PVTI_fixture_41`, repo `acme/flow`, issue #41. Default issue is OPEN, title `Implement CSV export`, body `Implement CSV export.`, assignees U1/U2 by stable GitHub IDs, board Status Ready with In Progress available. A completed claim instead has operator U1 and In Progress. Default current source S1, action A1, plan revision 3, link L1 revision 2, machine M1/U1, gate G1, run N1. K1 is a valid UUID request key. SHA1 means a full valid SHA-256 fixture digest, not the SHA-1 algorithm.

Freeze the clock per case. Error envelopes follow `_techspec.md`: safe transport code plus stable reason; provider rate-limit fixtures use Retry-After=30. An expected rejection implies no unauthorized new mutation/dispatch. Shared success shapes list required fields, not a requirement to leak other raw rows. CANARY strings are synthetic test secrets only.

## Coverage Matrix

Every story, AC and EC has its own row. Component/interface rows include policy successes and error paths. Boundary/API/CLI/message rows commit to observable wired contracts.

| Source | Behavior | Task-required | Feature-gate | QA/release |
| --- | --- | --- | --- | --- |
| US-001.EC-1 | TasksController.start: edge 1 | UT-001 | — | — |
| US-001.EC-2 | TaskPublicationController.publish: edge 2 | UT-002 | — | — |
| US-001.EC-3 | TaskPublicationController.publish: edge 3 | UT-003 | — | — |
| US-001.EC-4 | AuthoringAccessPolicy: edge 4 | UT-004 | — | — |
| US-001.EC-5 | TaskPublicationController.publish: edge 5 | UT-005 | — | — |
| US-001.EC-6 | TasksController.byId: edge 6 | UT-006 | — | — |
| US-001.EC-7 | TasksController.byId: edge 7 | UT-007 | — | — |
| US-001.EC-8 | taskPageRules: edge 8 | UT-008 | — | — |
| US-001 | Focused authoring | UT-001, UT-002, UT-003, UT-004, UT-005, UT-006, UT-007, UT-008 | E2E-001 | — |
| US-001.AC-1 | Canonical acceptance criterion exercised in full story journey | — | E2E-001 | — |
| US-001.AC-2 | Canonical acceptance criterion exercised in full story journey | — | E2E-001 | — |
| US-001.AC-3 | Canonical acceptance criterion exercised in full story journey | — | E2E-001 | — |
| US-002.EC-1 | protectedProcedure: edge 1 | UT-009 | — | — |
| US-002.EC-2 | AssignedWorkspace: edge 2 | UT-010 | — | — |
| US-002.EC-3 | AuthoringAccessPolicy: edge 3 | UT-011 | — | — |
| US-002.EC-4 | AuthoringAccessPolicy: edge 4 | UT-012 | — | — |
| US-002.EC-5 | IssueComposer: edge 5 | UT-013 | — | — |
| US-002.EC-6 | ProjectAccessService.listVisible: edge 6 | UT-014 | — | — |
| US-002 | Administrator-only creation | UT-009, UT-010, UT-011, UT-012, UT-013, UT-014 | E2E-002 | — |
| US-002.AC-1 | Canonical acceptance criterion exercised in full story journey | — | E2E-002 | — |
| US-002.AC-2 | Canonical acceptance criterion exercised in full story journey | — | E2E-002 | — |
| US-003.EC-1 | assignedIssueRules: edge 1 | UT-015 | — | — |
| US-003.EC-2 | assignedIssueRules: edge 2 | UT-016 | — | — |
| US-003.EC-3 | AssignedIssueGateway.list: edge 3 | UT-017 | — | — |
| US-003.EC-4 | WorkAuthorization.requireRead: edge 4 | UT-018 | — | — |
| US-003.EC-5 | AssignedIssueGateway.list: edge 5 | UT-019 | — | — |
| US-003.EC-6 | AssignedWorkspace queue append: edge 6 | UT-020 | — | — |
| US-003.EC-7 | IssueClaimService.claim: edge 7 | UT-021 | — | — |
| US-003 | Assigned Ready queue | UT-015, UT-016, UT-017, UT-018, UT-019, UT-020, UT-021 | E2E-003 | — |
| US-003.AC-1 | Canonical acceptance criterion exercised in full story journey | — | E2E-003 | — |
| US-003.AC-2 | Canonical acceptance criterion exercised in full story journey | — | E2E-003 | — |
| US-003.AC-3 | Canonical acceptance criterion exercised in full story journey | — | E2E-003 | — |
| US-004.EC-1 | IssueClaimService.claim: edge 1 | UT-022 | — | — |
| US-004.EC-2 | IssueClaimService.claim: edge 2 | UT-023 | — | — |
| US-004.EC-3 | IssueClaimService.claim: edge 3 | UT-024 | — | — |
| US-004.EC-4 | IssueClaimDao.reserve: edge 4 | IT-001 | — | — |
| US-004.EC-5 | IssueClaimService reconciliation: edge 5 | UT-025 | — | — |
| US-004.EC-6 | IssueClaimService.claim: edge 6 | UT-026 | — | — |
| US-004.EC-7 | IssueClaimService.claim: edge 7 | UT-027 | — | — |
| US-004.EC-8 | IssueClaimDao source binding: edge 8 | IT-002 | — | — |
| US-004 | Claim one issue | UT-022, UT-023, UT-024, IT-001, UT-025, UT-026, UT-027, IT-002 | E2E-004 | — |
| US-004.AC-1 | Canonical acceptance criterion exercised in full story journey | — | E2E-004 | — |
| US-004.AC-2 | Canonical acceptance criterion exercised in full story journey | — | E2E-004 | — |
| US-004.AC-3 | Canonical acceptance criterion exercised in full story journey | — | E2E-004 | — |
| US-004.AC-4 | Canonical acceptance criterion exercised in full story journey | — | E2E-004 | — |
| US-005.EC-1 | AssignedWorkspace active list: edge 1 | UT-028 | — | — |
| US-005.EC-2 | assignedIssues.byTask: edge 2 | UT-029 | — | — |
| US-005.EC-3 | WorkAuthorization.requireRead: edge 3 | UT-030 | — | — |
| US-005.EC-4 | TaskFlowAdmission.start: edge 4 | UT-031 | — | — |
| US-005.EC-5 | assignedIssues.byTask: edge 5 | UT-032 | — | — |
| US-005.EC-6 | IssueClaimDao.active: edge 6 | IT-003 | — | — |
| US-005 | Resume claimed work | UT-028, UT-029, UT-030, UT-031, UT-032, IT-003 | E2E-005 | — |
| US-005.AC-1 | Canonical acceptance criterion exercised in full story journey | — | E2E-005 | — |
| US-005.AC-2 | Canonical acceptance criterion exercised in full story journey | — | E2E-005 | — |
| US-006.EC-1 | IssueSourceService planning input: edge 1 | UT-033 | — | — |
| US-006.EC-2 | WorkAuthorization.requireOperate: edge 2 | UT-034 | — | — |
| US-006.EC-3 | WorkAuthorization.requireOperate: edge 3 | UT-035 | — | — |
| US-006.EC-4 | PlanningService.start: edge 4 | UT-036 | — | — |
| US-006.EC-5 | PlanningService.retry: edge 5 | UT-037 | — | — |
| US-006.EC-6 | IssueSourceService.assertCurrent: edge 6 | UT-038 | — | — |
| US-006.EC-7 | PlanningProjection current decision: edge 7 | UT-039 | — | — |
| US-006 | Plan after intake | UT-033, UT-034, UT-035, UT-036, UT-037, UT-038, UT-039 | E2E-006 | — |
| US-006.AC-1 | Canonical acceptance criterion exercised in full story journey | — | E2E-006 | — |
| US-006.AC-2 | Canonical acceptance criterion exercised in full story journey | — | E2E-006 | — |
| US-006.AC-3 | Canonical acceptance criterion exercised in full story journey | — | E2E-006 | — |
| US-007.EC-1 | TaskFlowOptions: edge 1 | UT-040 | — | — |
| US-007.EC-2 | TaskFlowAdmission.start: edge 2 | UT-041 | — | — |
| US-007.EC-3 | WorkAuthorization.requireOperate: edge 3 | UT-042 | — | — |
| US-007.EC-4 | TaskFlowAdmission.start: edge 4 | UT-043 | — | — |
| US-007.EC-5 | LocalActionExecutor.reconcile: edge 5 | UT-044 | — | — |
| US-007.EC-6 | TaskFlowPackageService.approve: edge 6 | UT-045 | — | — |
| US-007.EC-7 | TaskFlowReader.runs: edge 7 | UT-046 | — | — |
| US-007 | Existing downstream journey | UT-040, UT-041, UT-042, UT-043, UT-044, UT-045, UT-046 | E2E-007 | — |
| US-007.AC-1 | Canonical acceptance criterion exercised in full story journey | — | E2E-007 | — |
| US-007.AC-2 | Canonical acceptance criterion exercised in full story journey | — | E2E-007 | — |
| US-007.AC-3 | Canonical acceptance criterion exercised in full story journey | — | E2E-007 | — |
| US-008.EC-1 | AssignedWorkspace observer view: edge 1 | UT-047 | — | — |
| US-008.EC-2 | EvidenceSanitizer.sanitize: edge 2 | UT-048 | — | — |
| US-008.EC-3 | WorkAuthorization.requireRead: edge 3 | UT-049 | — | — |
| US-008.EC-4 | AssignedWorkspace observer permissions: edge 4 | UT-050 | — | — |
| US-008.EC-5 | TaskFlowReader.runs: edge 5 | UT-051 | — | — |
| US-008 | Read-only observation | UT-047, UT-048, UT-049, UT-050, UT-051 | E2E-008 | — |
| US-008.AC-1 | Canonical acceptance criterion exercised in full story journey | — | E2E-008 | — |
| US-008.AC-2 | Canonical acceptance criterion exercised in full story journey | — | E2E-008 | — |
| US-009.EC-1 | LocalCheckoutRegistry.link: edge 1 | UT-052 | — | — |
| US-009.EC-2 | TaskFlowOptions: edge 2 | UT-053 | — | — |
| US-009.EC-3 | LocalCheckoutRegistry.link: edge 3 | UT-054 | — | — |
| US-009.EC-4 | LocalLinkService.requireOwnLink: edge 4 | UT-055 | — | — |
| US-009.EC-5 | LocalLinkService.save: edge 5 | UT-056 | — | — |
| US-009.EC-6 | LocalLinkService readiness: edge 6 | UT-057 | — | — |
| US-009.EC-7 | LocalLinkService.mine: edge 7 | UT-058 | — | — |
| US-009 | Link a per-user checkout | UT-052, UT-053, UT-054, UT-055, UT-056, UT-057, UT-058 | — | E2E-009 |
| US-009.AC-1 | Canonical acceptance criterion exercised in full story journey | — | — | E2E-009 |
| US-009.AC-2 | Canonical acceptance criterion exercised in full story journey | — | — | E2E-009 |
| US-009.AC-3 | Canonical acceptance criterion exercised in full story journey | — | — | E2E-009 |
| US-009.AC-4 | Canonical acceptance criterion exercised in full story journey | — | — | E2E-009 |
| US-010.EC-1 | GatePolicyResolver.resolve: edge 1 | UT-059 | — | — |
| US-010.EC-2 | GateSettlement: edge 2 | UT-060 | — | — |
| US-010.EC-3 | GateRunner: edge 3 | UT-061 | — | — |
| US-010.EC-4 | WorkAuthorization.requireOperate: edge 4 | UT-062 | — | — |
| US-010.EC-5 | LocalCheckoutRegistry acquireWriteLock: edge 5 | UT-063 | — | — |
| US-010.EC-6 | LocalCommandJournal.recover: edge 6 | UT-064 | — | — |
| US-010.EC-7 | TaskFlowAdmission.start: edge 7 | UT-065 | — | — |
| US-010.EC-8 | EvidenceSanitizer shared budget: edge 8 | UT-066 | — | — |
| US-010 | Project-defined execution | UT-059, UT-060, UT-061, UT-062, UT-063, UT-064, UT-065, UT-066 | — | E2E-010 |
| US-010.AC-1 | Canonical acceptance criterion exercised in full story journey | — | — | E2E-010 |
| US-010.AC-2 | Canonical acceptance criterion exercised in full story journey | — | — | E2E-010 |
| US-010.AC-3 | Canonical acceptance criterion exercised in full story journey | — | — | E2E-010 |
| US-010.AC-4 | Canonical acceptance criterion exercised in full story journey | — | — | E2E-010 |
| US-011.EC-1 | GatePolicyResolver.resolve: edge 1 | UT-067 | — | — |
| US-011.EC-2 | GateRunner Playwright preflight: edge 2 | UT-068 | — | — |
| US-011.EC-3 | GateRunner Playwright preflight: edge 3 | UT-069 | — | — |
| US-011.EC-4 | EvidenceSanitizer.sanitize: edge 4 | UT-070 | — | — |
| US-011.EC-5 | GateSettlement: edge 5 | UT-071 | — | — |
| US-011.EC-6 | LocalCommandJournal.recover: edge 6 | UT-072 | — | — |
| US-011.EC-7 | taskFlow.gates: edge 7 | UT-073 | — | — |
| US-011 | Playwright gate evidence | UT-067, UT-068, UT-069, UT-070, UT-071, UT-072, UT-073 | — | E2E-011 |
| US-011.AC-1 | Canonical acceptance criterion exercised in full story journey | — | — | E2E-011 |
| US-011.AC-2 | Canonical acceptance criterion exercised in full story journey | — | — | E2E-011 |
| US-011.AC-3 | Canonical acceptance criterion exercised in full story journey | — | — | E2E-011 |
| US-012.EC-1 | WorkAuthorization.requireRead: edge 1 | UT-074 | — | — |
| US-012.EC-2 | WorkAuthorization.requireOperate: edge 2 | UT-075 | — | — |
| US-012.EC-3 | LocalActionExecutor terminal ingest: edge 3 | UT-076 | — | — |
| US-012.EC-4 | TaskFlowAdmission.retryAction: edge 4 | UT-077 | — | — |
| US-012.EC-5 | IssueClaimDao status: edge 5 | IT-004 | — | — |
| US-012.EC-6 | AssignedWorkspace block reasons: edge 6 | UT-078 | — | — |
| US-012 | Recover changed prerequisites | UT-074, UT-075, UT-076, UT-077, IT-004, UT-078 | — | E2E-012 |
| US-012.AC-1 | Canonical acceptance criterion exercised in full story journey | — | — | E2E-012 |
| US-012.AC-2 | Canonical acceptance criterion exercised in full story journey | — | — | E2E-012 |
| US-012.AC-3 | Canonical acceptance criterion exercised in full story journey | — | — | E2E-012 |
| US-013.EC-1 | MachineController.diagnostics: edge 1 | UT-079 | — | — |
| US-013.EC-2 | MachineController diagnostic parser: edge 2 | UT-080 | — | — |
| US-013.EC-3 | MachineController.diagnostics: edge 3 | UT-081 | — | — |
| US-013.EC-4 | MachineController.diagnostics: edge 4 | UT-082 | — | — |
| US-013.EC-5 | LocalLinkService readiness refresh: edge 5 | UT-083 | — | — |
| US-013.EC-6 | MachineController readiness: edge 6 | UT-084 | — | — |
| US-013 | Safe operational diagnostics | UT-079, UT-080, UT-081, UT-082, UT-083, UT-084 | — | E2E-013 |
| US-013.AC-1 | Canonical acceptance criterion exercised in full story journey | — | — | E2E-013 |
| US-013.AC-2 | Canonical acceptance criterion exercised in full story journey | — | — | E2E-013 |
| Component: AuthoringAccessPolicy | Happy-path and failure/state policy coverage | UT-001, UT-002, UT-003, UT-004, UT-005, UT-011, UT-012, UT-085 | — | — |
| Component: AssignedIssueGateway / assignedIssueRules | Happy-path and failure/state policy coverage | UT-015, UT-016, UT-017, UT-018, UT-019, UT-020, UT-021, UT-086, UT-087 | — | — |
| Component: IssueClaimService / IssueClaimDao / claim reconciler | Happy-path and failure/state policy coverage | UT-022, UT-023, UT-024, IT-001, UT-025, UT-026, UT-027, IT-002, UT-088, UT-089, UT-090 | — | — |
| Component: WorkAuthorization | Happy-path and failure/state policy coverage | UT-030, UT-034, UT-035, UT-092, UT-093 | — | — |
| Component: IssueSourceService / IssueSourceDao / VerifiedIssueSource | Happy-path and failure/state policy coverage | UT-033, UT-038, UT-094, UT-095, UT-096, UT-097, UT-098, UT-168 | — | — |
| Component: Existing planning/spec/task-flow controllers and workers | Happy-path and failure/state policy coverage | UT-033, UT-034, UT-035, UT-036, UT-037, UT-038, UT-039, UT-040, UT-041, UT-042, UT-043, UT-044, UT-045, UT-046 | — | — |
| Component: ConnectorPairingService / MachineController | Happy-path and failure/state policy coverage | UT-079, UT-080, UT-081, UT-082, UT-083, UT-084, UT-106, UT-107, UT-108, UT-109, UT-110, UT-162 | — | — |
| Component: LocalLinkService / LocalCheckoutRegistry | Happy-path and failure/state policy coverage | UT-052, UT-053, UT-054, UT-055, UT-056, UT-057, UT-058, UT-111, UT-112, UT-113, UT-114, UT-115 | — | — |
| Component: LocalCommandService / LocalActionExecutor / LocalCommandJournal | Happy-path and failure/state policy coverage | UT-062, UT-063, UT-064, UT-121, UT-122, UT-123, UT-124, UT-125, UT-126, UT-164, UT-165, UT-127, UT-128, UT-163, UT-167 | — | — |
| Component: GatePolicyResolver / GateRunner / GateSettlement / GateResult | Happy-path and failure/state policy coverage | UT-059, UT-060, UT-061, UT-067, UT-068, UT-069, UT-070, UT-071, UT-072, UT-073, UT-132, UT-133, UT-134, UT-135, UT-136, UT-137, UT-138, UT-139, UT-140, UT-141, UT-142, UT-143, UT-144, UT-145, UT-146, UT-147, UT-148, UT-149 | — | — |
| Component: EvidenceSanitizer / shared DTO mappers / SafeEvidence | Happy-path and failure/state policy coverage | UT-048, UT-070, UT-066, UT-150, UT-151, UT-152, UT-166, UT-153, UT-154 | — | — |
| Component: AssignedWorkspace / LocalProjectSettings / navigation | Happy-path and failure/state policy coverage | UT-010, UT-028, UT-047, UT-155, UT-156, UT-157, UT-158 | — | — |
| Interface: WorkScope / WorkAuthorization | Concrete success and error contracts | UT-092, UT-093 | — | — |
| Interface: VerifiedIssueSource / IssueSourceDao | Concrete success and error contracts | UT-094, UT-095, UT-096, UT-097, UT-098 | — | — |
| Interface: ClaimInput / ClaimResult / IssueClaimService / IssueClaimDao | Concrete success and error contracts | UT-088, UT-089, UT-090, UT-091 | — | — |
| Interface: LocalTarget / PreparedLocalAction / LocalLinkService | Concrete success and error contracts | UT-114, UT-115, UT-118, UT-119, UT-120 | — | — |
| Interface: LocalActionExecutor / ActionExecutor | Concrete success and error contracts | UT-127, UT-128, UT-129, UT-130 | — | — |
| Interface: LocalCommand / LocalEvent / LocalCommandJournal | Concrete success and error contracts | UT-121, UT-122, UT-123, UT-124, UT-125, UT-126, UT-164, UT-165 | — | — |
| Interface: GateManifest / GatePolicyResolver | Concrete success and error contracts | UT-132, UT-133, UT-134, UT-135 | — | — |
| Interface: GateResult / GateRunner / GateSettlement | Concrete success and error contracts | UT-136, UT-137, UT-138, UT-139, UT-140, UT-141, UT-142, UT-143, UT-144, UT-145, UT-146, UT-147, UT-148, UT-149 | — | — |
| Interface: SafeEvidence / EvidenceSanitizer | Concrete success and error contracts | UT-150, UT-151, UT-152, UT-166, UT-153, UT-154 | — | — |
| Rule: toDevControlRequest source adapter | Specific adapter, mapping, capacity or validation behavior | UT-099 | — | — |
| Rule: planning input hash adapter | Specific adapter, mapping, capacity or validation behavior | UT-100 | — | — |
| Rule: planning response validator | Specific adapter, mapping, capacity or validation behavior | UT-101 | — | — |
| Rule: SpecEligibilityGate | Specific adapter, mapping, capacity or validation behavior | UT-102, UT-103 | — | — |
| Rule: TaskFlowOptions | Specific adapter, mapping, capacity or validation behavior | UT-104 | — | — |
| Rule: RuntimeChoiceValidator | Specific adapter, mapping, capacity or validation behavior | UT-105 | — | — |
| Rule: localProjects.prepareAction | Specific adapter, mapping, capacity or validation behavior | UT-116, UT-117 | — | — |
| Rule: ApprovedArtifactInstaller local adapter | Specific adapter, mapping, capacity or validation behavior | UT-131 | — | — |
| Rule: projectRoutes return-path validator | Specific adapter, mapping, capacity or validation behavior | UT-159 | — | — |
| Rule: taskFlowMappers.toWorkspace | Specific adapter, mapping, capacity or validation behavior | UT-160 | — | — |
| Rule: taskFlowMappers.toRun | Specific adapter, mapping, capacity or validation behavior | UT-161 | — | — |
| Boundary: Migration/source identity | Real wiring and persistence/transport outcome | IT-005 | — | — |
| Boundary: Migration/legacy parity | Real wiring and persistence/transport outcome | IT-006 | — | — |
| Boundary: Migration/import | Real wiring and persistence/transport outcome | IT-007 | — | — |
| Boundary: Migration/conflict | Real wiring and persistence/transport outcome | IT-008 | — | — |
| Boundary: Publication/source race | Real wiring and persistence/transport outcome | IT-009 | — | — |
| Boundary: Claim concurrency | Real wiring and persistence/transport outcome | IT-010 | — | — |
| Boundary: Claim recovery | Real wiring and persistence/transport outcome | IT-011 | — | — |
| Boundary: Claim reservation | Real wiring and persistence/transport outcome | IT-012 | — | — |
| Boundary: Claim failure | Real wiring and persistence/transport outcome | IT-013 | — | — |
| Boundary: Claim explicit retry | Real wiring and persistence/transport outcome | IT-014 | — | — |
| Boundary: Claim races | Real wiring and persistence/transport outcome | IT-015 | — | — |
| Boundary: Claim no board item | Real wiring and persistence/transport outcome | IT-016 | — | — |
| Boundary: Discovery paging | Real wiring and persistence/transport outcome | IT-017 | — | — |
| Boundary: Discovery unavailable | Real wiring and persistence/transport outcome | IT-018 | — | — |
| Boundary: Role guards | Real wiring and persistence/transport outcome | IT-019 | — | — |
| Boundary: Publication repository authorization | Real wiring and persistence/transport outcome | IT-020 | — | — |
| Boundary: Observer guards | Real wiring and persistence/transport outcome | IT-021 | — | — |
| Boundary: DAO guard | Real wiring and persistence/transport outcome | IT-022 | — | — |
| Boundary: Worker actor | Real wiring and persistence/transport outcome | IT-023 | — | — |
| Boundary: Source protocol | Real wiring and persistence/transport outcome | IT-024 | — | — |
| Boundary: Source history | Real wiring and persistence/transport outcome | IT-025 | — | — |
| Boundary: Source stale approval | Real wiring and persistence/transport outcome | IT-026 | — | — |
| Boundary: Planning board status | Real wiring and persistence/transport outcome | IT-027 | — | — |
| Boundary: Planning failure recovery | Real wiring and persistence/transport outcome | IT-028 | — | — |
| Boundary: Planning no autostart | Real wiring and persistence/transport outcome | IT-029 | — | — |
| Boundary: Legacy journey | Real wiring and persistence/transport outcome | IT-030 | — | — |
| Boundary: Drain/cutover | Real wiring and persistence/transport outcome | — | IT-031 | — |
| Boundary: Pairing exchange | Real wiring and persistence/transport outcome | IT-032 | — | — |
| Boundary: Pairing competing exchange | Real wiring and persistence/transport outcome | IT-033 | — | — |
| Boundary: Machine credential | Real wiring and persistence/transport outcome | IT-034 | — | — |
| Boundary: Link Git identity | Real wiring and persistence/transport outcome | IT-035 | — | — |
| Boundary: Link aliases | Real wiring and persistence/transport outcome | IT-036 | — | — |
| Boundary: Link provenance | Real wiring and persistence/transport outcome | IT-037 | — | — |
| Boundary: Provider isolation | Real wiring and persistence/transport outcome | IT-038 | — | — |
| Boundary: Provider grants | Real wiring and persistence/transport outcome | IT-039 | — | — |
| Boundary: Preparation | Real wiring and persistence/transport outcome | IT-040 | — | — |
| Boundary: Preparation drift | Real wiring and persistence/transport outcome | IT-041 | — | — |
| Boundary: Workspace round-trip | Real wiring and persistence/transport outcome | IT-042 | — | — |
| Boundary: Native launcher | Real wiring and persistence/transport outcome | — | IT-043 | — |
| Boundary: Local artifacts | Real wiring and persistence/transport outcome | IT-044 | — | — |
| Boundary: Local event replay | Real wiring and persistence/transport outcome | IT-045 | — | — |
| Boundary: Local journal crash | Real wiring and persistence/transport outcome | IT-046 | — | — |
| Boundary: Local lock contention | Real wiring and persistence/transport outcome | IT-047 | — | — |
| Boundary: Lost lease | Real wiring and persistence/transport outcome | IT-048 | — | — |
| Boundary: Local cancellation | Real wiring and persistence/transport outcome | IT-049 | — | — |
| Boundary: Local questions | Real wiring and persistence/transport outcome | — | IT-050 | — |
| Boundary: Revoked access mid-run | Real wiring and persistence/transport outcome | IT-051 | — | — |
| Boundary: Gate policy | Real wiring and persistence/transport outcome | IT-052 | — | — |
| Boundary: Playwright passing | Real wiring and persistence/transport outcome | — | IT-053 | — |
| Boundary: Playwright assertion | Real wiring and persistence/transport outcome | — | IT-054 | — |
| Boundary: Playwright setup | Real wiring and persistence/transport outcome | — | IT-055 | — |
| Boundary: Playwright service | Real wiring and persistence/transport outcome | — | IT-056 | — |
| Boundary: Gate stale result | Real wiring and persistence/transport outcome | IT-057 | — | — |
| Boundary: Gate no requirements | Real wiring and persistence/transport outcome | IT-058 | — | — |
| Boundary: Gate unknown | Real wiring and persistence/transport outcome | IT-059 | — | — |
| Boundary: Gate missing instructions | Real wiring and persistence/transport outcome | IT-060 | — | — |
| Boundary: Evidence egress | Real wiring and persistence/transport outcome | IT-061 | — | — |
| Boundary: Evidence artifact | Real wiring and persistence/transport outcome | IT-062 | — | — |
| Boundary: Evidence budget | Real wiring and persistence/transport outcome | IT-063 | — | — |
| Boundary: Safe diagnostics | Real wiring and persistence/transport outcome | IT-064 | — | — |
| Boundary: Host choice preservation | Real wiring and persistence/transport outcome | — | IT-065 | — |
| Boundary: Local runtime incompatibility | Real wiring and persistence/transport outcome | IT-066 | — | — |
| Boundary: Package unsafe finalization | Real wiring and persistence/transport outcome | IT-067 | — | — |
| Boundary: Read access refresh | Real wiring and persistence/transport outcome | IT-068 | — | — |
| API: assignedIssues.list | Success and every domain failure shape | IT-069, IT-070, IT-071, IT-072, IT-073, IT-074, IT-075 | — | — |
| API: assignedIssues.byIssue | Success and every domain failure shape | IT-076, IT-077, IT-078, IT-079, IT-080, IT-081 | — | — |
| API: assignedIssues.claim | Success and every domain failure shape | IT-082, IT-083, IT-084, IT-085, IT-086, IT-087, IT-088, IT-089 | — | — |
| API: assignedIssues.claimStatus | Success and every domain failure shape | IT-090, IT-091 | — | — |
| API: assignedIssues.reconcileClaim | Success and every domain failure shape | IT-092, IT-093, IT-094, IT-095, IT-096, IT-097 | — | — |
| API: assignedIssues.active | Success and every domain failure shape | IT-098, IT-099 | — | — |
| API: assignedIssues.byTask | Success and every domain failure shape | IT-100, IT-101 | — | — |
| API: assignedIssues.reconfirmSource | Success and every domain failure shape | IT-102, IT-103, IT-104, IT-105, IT-106, IT-107, IT-108 | — | — |
| API: localMachines.confirmPairing | Success and every domain failure shape | IT-109, IT-110, IT-111, IT-112, IT-113 | — | — |
| API: localMachines.list | Success and every domain failure shape | IT-114, IT-115 | — | — |
| API: localMachines.revoke | Success and every domain failure shape | IT-116, IT-117, IT-118, IT-119 | — | — |
| API: localMachines.diagnostics | Success and every domain failure shape | IT-120, IT-121, IT-122 | — | — |
| API: localProjects.mine | Success and every domain failure shape | IT-123, IT-124 | — | — |
| API: localProjects.unlink | Success and every domain failure shape | IT-125, IT-126, IT-127, IT-128 | — | — |
| API: localProjects.prepareAction | Success and every domain failure shape | IT-129, IT-130, IT-131, IT-132, IT-133, IT-134, IT-135, IT-136, IT-137, IT-138 | — | — |
| API: localProjects.prepareStatus | Success and every domain failure shape | IT-139, IT-140 | — | — |
| API: taskFlow.gates | Success and every domain failure shape | IT-141, IT-142, IT-143 | — | — |
| API: taskFlow.evidence | Success and every domain failure shape | IT-144, IT-145 | — | — |
| API common: session_required | Separate execution for each protected query/mutation | IT-146 | — | — |
| API common: work_unavailable | Separate execution for each protected query/mutation | IT-147 | — | — |
| API common: invalid_input | Separate execution for each protected query/mutation | IT-148 | — | — |
| API common: internal_error | Separate execution for each protected query/mutation | IT-149 | — | — |
| API family: existing authoring mutations | Every registered existing affected operation | IT-150, IT-151 | — | — |
| API family: existing downstream mutations | Every registered existing affected operation | IT-152, IT-153 | — | — |
| API downstream common: claim_unresolved | Separate current-eligibility execution per mutation | IT-154 | — | — |
| API downstream common: issue_ineligible | Separate current-eligibility execution per mutation | IT-155 | — | — |
| API downstream common: board_status_changed | Separate current-eligibility execution per mutation | IT-156 | — | — |
| API downstream common: source_changed | Separate current-eligibility execution per mutation | IT-157 | — | — |
| API local-start common: preparation_expired | Each affected start/retry operation | IT-158 | — | — |
| API local-start common: preparation_changed | Each affected start/retry operation | IT-159 | — | — |
| API local-start common: checkout_busy | Each affected start/retry operation | IT-160 | — | — |
| API local-start common: gate_policy_unresolved | Each affected start/retry operation | IT-161 | — | — |
| API local-start common: runtime_incompatible | Each affected start/retry operation | IT-162 | — | — |
| HTTP: POST /api/local-connector/pairings | Success and every endpoint-specific failure | IT-163, IT-164, IT-165, IT-166 | — | — |
| HTTP: POST /api/local-connector/pairings/exchange | Success and every endpoint-specific failure | IT-167, IT-168, IT-169, IT-170 | — | — |
| HTTP: POST /api/local-connector/heartbeat | Success and every endpoint-specific failure | IT-171, IT-172, IT-173 | — | — |
| HTTP: POST /api/local-connector/links | Success and every endpoint-specific failure | IT-174, IT-175, IT-176, IT-177, IT-178 | — | — |
| HTTP: POST /api/local-connector/poll | Success and every endpoint-specific failure | IT-179, IT-180 | — | — |
| HTTP: POST /api/local-connector/events | Success and every endpoint-specific failure | IT-181, IT-182, IT-183, IT-184, IT-185, IT-186 | — | — |
| HTTP common: invalid_input | Per-route transport and safe error contract | IT-187 | — | — |
| HTTP common: payload_too_large | Per-route transport and safe error contract | IT-188 | — | — |
| HTTP common: rate_limited | Per-route transport and safe error contract | IT-189 | — | — |
| HTTP common: internal_error | Per-route transport and safe error contract | IT-190 | — | — |
| HTTP common: machine_unauthorized | Authenticated machine endpoints | IT-191 | — | — |
| HTTP pairing pending | Non-terminal exchange shape | IT-192 | — | — |
| HTTP poll empty | Empty queue shape | IT-193 | — | — |
| CLI: pair | Success and every declared failure | IT-194, IT-195, IT-196, IT-197, IT-198, IT-199 | — | — |
| CLI: link | Success and every declared failure | IT-200, IT-201, IT-202, IT-203, IT-204, IT-205, IT-206, IT-207 | — | — |
| CLI: run | Success and every declared failure | IT-208, IT-209, IT-210, IT-211, IT-212, IT-213 | — | — |
| CLI: status | Success and every declared failure | IT-214, IT-215, IT-216, IT-217, IT-218 | — | — |
| CLI: unpair | Success and every declared failure | IT-219, IT-220 | — | — |
| Message: LocalCommand prepare | Typed success and unsafe-payload rejection | IT-221, UT-169 | — | — |
| Message: LocalCommand start | Typed success and unsafe-payload rejection | IT-222, UT-170 | — | — |
| Message: LocalCommand inspect | Typed success and unsafe-payload rejection | IT-223, UT-171 | — | — |
| Message: LocalCommand cancel | Typed success and unsafe-payload rejection | IT-224, UT-172 | — | — |
| Message: LocalCommand answer | Typed success and unsafe-payload rejection | IT-225, UT-173 | — | — |
| Message: LocalEvent accepted | Typed success and unsafe-payload rejection | IT-226, UT-174 | — | — |
| Message: LocalEvent prepared | Typed success and unsafe-payload rejection | IT-227, UT-175 | — | — |
| Message: LocalEvent activity | Typed success and unsafe-payload rejection | IT-228, UT-176 | — | — |
| Message: LocalEvent gate | Typed success and unsafe-payload rejection | IT-229, UT-177 | — | — |
| Message: LocalEvent terminal | Typed success and unsafe-payload rejection | IT-230, UT-178 | — | — |
| Message common: protocol_incompatible | Command validation and dispatch uncertainty | UT-179 | — | — |
| Message common: invalid_input | Command validation and dispatch uncertainty | UT-180 | — | — |
| Message common: command_unavailable | Command validation and dispatch uncertainty | UT-181 | — | — |
| Message common: command_expired | Command validation and dispatch uncertainty | UT-182 | — | — |
| Message common: command_payload_changed | Command validation and dispatch uncertainty | UT-183 | — | — |
| Message common: runtime_failed | Command validation and dispatch uncertainty | UT-184 | — | — |
| Message common: outcome_unknown | Command validation and dispatch uncertainty | UT-185 | — | — |
| Release qualification: E2E-014 | Real external environment or accessibility journey | — | — | E2E-014 |
| Release qualification: E2E-015 | Real external environment or accessibility journey | — | — | E2E-015 |
| Release qualification: E2E-016 | Real external environment or accessibility journey | — | — | E2E-016 |
| Release qualification: E2E-017 | Real external environment or accessibility journey | — | — | E2E-017 |
| Release qualification: E2E-018 | Real external environment or accessibility journey | — | — | E2E-018 |
| Release qualification: E2E-019 | Real external environment or accessibility journey | — | — | E2E-019 |

## Unit Tests

### Policy, state, interfaces, DTOs and message validation

- **UT-001** (`task-required, error`): `TasksController.start` — given administrator U1 submits message="   ", expect BAD_REQUEST invalid_input; no task receipt.
- **UT-002** (`task-required, error`): `TaskPublicationController.publish` — given T1 has no current draft, expect PRECONDITION_FAILED draft_required.
- **UT-003** (`task-required, error`): `TaskPublicationController.publish` — given GitHub POST returns 429 Retry-After=30, expect TOO_MANY_REQUESTS with retryAfterSeconds=30; draft version remains 3.
- **UT-004** (`task-required, state`): `AuthoringAccessPolicy` — given non-admin U2 opens authored T1 with current project/repository access, expect readable history with viewerCanAuthor=false.
- **UT-005** (`task-required, idempotency`): `TaskPublicationController.publish` — given the original request key K1 has an uncertain publication receipt, expect the original unresolved receipt, with no fresh publication dispatch.
- **UT-006** (`task-required, state`): `TasksController.byId` — given publication is dispatching when a restarted controller reads T1, expect persisted publication state dispatching.
- **UT-007** (`task-required, state`): `TasksController.byId` — given T1 was published but GitHub issue is now closed, expect retained publication history with authoring controls unavailable.
- **UT-008** (`task-required, boundary`): `taskPageRules` — given 51 authored tasks exist with limit=50, expect 50 items and a non-null nextCursor.
- **UT-009** (`task-required, error`): `protectedProcedure` — given no principal on assignedIssues.list, expect UNAUTHORIZED session_required.
- **UT-010** (`task-required, state`): `AssignedWorkspace` — given U2 has zero accessible projects, expect pt-BR no-access state with no new-issue action.
- **UT-011** (`task-required, error`): `AuthoringAccessPolicy` — given U1 lost admin designation after loading the draft, expect FORBIDDEN admin_required on the next saveDraft.
- **UT-012** (`task-required, concurrency`): `AuthoringAccessPolicy` — given ten non-admin U2 start requests race, expect each admission denies admin_required before task creation.
- **UT-013** (`task-required, state`): `IssueComposer` — given U2 opens the old issues/T1 URL for published T1, expect authorized authoring history without downstream mutation controls.
- **UT-014** (`task-required, boundary`): `ProjectAccessService.listVisible` — given 51 visible projects and an inaccessible P2 exist, limit=50, expect 50 visible projects with a continuation excluding P2.
- **UT-015** (`task-required, state`): `assignedIssueRules` — given provider page contains DraftIssue, PullRequest, closed Issue and malformed Issue entries, expect no entry is eligible.
- **UT-016** (`task-required, state`): `assignedIssueRules` — given I1 assignees contain only U2 or are empty for U1, expect I1 is excluded.
- **UT-017** (`task-required, error`): `AssignedIssueGateway.list` — given P1 has no linked board, expect board_missing availability rather than empty queue.
- **UT-018** (`task-required, error`): `WorkAuthorization.requireRead` — given U1 personal GitHub authorization expired, expect repository_authorization_needed before private issue output.
- **UT-019** (`task-required, boundary`): `AssignedIssueGateway.list` — given two scanned pages contain no U1 issues but hasNextPage=true, expect scan-continuing availability with nextCursor.
- **UT-020** (`task-required, idempotency`): `AssignedWorkspace queue append` — given two pages repeat issue node I1, expect one visible I1 row.
- **UT-021** (`task-required, error`): `IssueClaimService.claim` — given I1 became CLOSED after its queue row loaded, expect PRECONDITION_FAILED issue_ineligible.
- **UT-022** (`task-required, error`): `IssueClaimService.claim` — given boardItemId refers to repository R2 instead of linked R1, expect PRECONDITION_FAILED repository_mismatch.
- **UT-023** (`task-required, error`): `IssueClaimService.claim` — given Status options contain Ready but no In Progress, expect PRECONDITION_FAILED in_progress_missing before reservation.
- **UT-024** (`task-required, error`): `IssueClaimService.claim` — given fresh I1 assignees exclude U1, expect PRECONDITION_FAILED issue_ineligible.
- **UT-025** (`task-required, state`): `IssueClaimService reconciliation` — given status mutation timed out after dispatch intent, expect uncertain state retaining candidate U1.
- **UT-026** (`task-required, idempotency`): `IssueClaimService.claim` — given U2 repeats a claim on I1 already claimed by U1, expect existing T1 with operatorId=U1 and U2 read-only permission.
- **UT-027** (`task-required, error`): `IssueClaimService.claim` — given fresh board item status is Backlog instead of Ready, expect PRECONDITION_FAILED issue_ineligible.
- **UT-028** (`task-required, state`): `AssignedWorkspace active list` — given U1 has no claimed work, expect pt-BR active-work empty state.
- **UT-029** (`task-required, state`): `assignedIssues.byTask` — given claimed I1 changes from In Progress to Done, expect retained history with viewerCanOperate=false and reason=board_status_changed.
- **UT-030** (`task-required, error`): `WorkAuthorization.requireRead` — given membership of U1 in P1 was removed, expect NOT_FOUND work_unavailable without T1 content.
- **UT-031** (`task-required, error`): `TaskFlowAdmission.start` — given expectedRevision=2 but stored plan revision=3, expect CONFLICT plan_version_changed without a new run.
- **UT-032** (`task-required, idempotency`): `assignedIssues.byTask` — given T1 is opened repeatedly after reconnect, expect the same taskId and stored current stage.
- **UT-033** (`task-required, boundary`): `IssueSourceService planning input` — given title contains 257 Unicode code points, expect PRECONDITION_FAILED planning_input_limit.
- **UT-034** (`task-required, error`): `WorkAuthorization.requireOperate` — given T1 source exists but claim state is pending, expect PRECONDITION_FAILED claim_unresolved.
- **UT-035** (`task-required, error`): `WorkAuthorization.requireOperate` — given observer U2 calls planning.start on U1-owned T1, expect FORBIDDEN operator_required.
- **UT-036** (`task-required, idempotency`): `PlanningService.start` — given same K1/payload is submitted twice at current version, expect the original operation receipt with replayed=true.
- **UT-037** (`task-required, state`): `PlanningService.retry` — given last assessment failed planning_timeout, expect explicit retry admission leaves prior attempt inspectable.
- **UT-038** (`task-required, error`): `IssueSourceService.assertCurrent` — given I1 body changes from CSV export to JSON export after snapshot S1, expect PRECONDITION_FAILED source_changed.
- **UT-039** (`task-required, ordering`): `PlanningProjection current decision` — given D1 and D2 are historical while D3 is current, expect current pointer D3 with bounded separate history.
- **UT-040** (`task-required, error`): `TaskFlowOptions` — given selected machine provider model is unavailable, expect action unavailable with reason=model_unavailable.
- **UT-041** (`task-required, error`): `TaskFlowAdmission.start` — given planning decision is review instead of approved, expect PRECONDITION_FAILED action_unavailable.
- **UT-042** (`task-required, error`): `WorkAuthorization.requireOperate` — given U3 from inaccessible P2 submits T1 startAction, expect NOT_FOUND work_unavailable.
- **UT-043** (`task-required, concurrency`): `TaskFlowAdmission.start` — given two fresh starts race for action A1 at revision=3, expect one accepted active write run.
- **UT-044** (`task-required, state`): `LocalActionExecutor.reconcile` — given companion heartbeat disappears while run N1 is running, expect reconciling state instead of failed or succeeded.
- **UT-045** (`task-required, idempotency`): `TaskFlowPackageService.approve` — given approved package PK1/version=2 is replayed with the same key, expect the same approval receipt.
- **UT-046** (`task-required, boundary`): `TaskFlowReader.runs` — given 51 runs exist with limit=50, expect 50 entries and nextCursor while current package stays identified.
- **UT-047** (`task-required, state`): `AssignedWorkspace observer view` — given U2 reads claimed T1 with no accepted action, expect work-not-started state without fabricated activity.
- **UT-048** (`task-required, error`): `EvidenceSanitizer.sanitize` — given activity contains the private root /home/u1/work and a known ENV_CANARY_123 value, expect safe output contains neither literal.
- **UT-049** (`task-required, error`): `WorkAuthorization.requireRead` — given U2 loses repository access after opening T1, expect next read denied before cached private content is returned.
- **UT-050** (`task-required, state`): `AssignedWorkspace observer permissions` — given a polled claim transitions pending to claimed by U1, expect U2 controls stay read-only.
- **UT-051** (`task-required, boundary`): `TaskFlowReader.runs` — given U2 follows a direct link to page 2 of authorized T1 history, expect bounded authorized history without local private link details.
- **UT-052** (`task-required, error`): `LocalCheckoutRegistry.link` — given path /tmp/not-a-git-dir exists but has no Git root, expect not_git_root before link upload.
- **UT-053** (`task-required, state`): `TaskFlowOptions` — given U1 has no local link but a compatible host isolated choice, expect the host choice remains available explicitly.
- **UT-054** (`task-required, boundary`): `LocalCheckoutRegistry.link` — given UTF-8 path length is 4097 bytes, expect path_limit.
- **UT-055** (`task-required, error`): `LocalLinkService.requireOwnLink` — given U2 requests U1 link L1, expect NOT_FOUND link_unavailable with no private descriptor.
- **UT-056** (`task-required, concurrency`): `LocalLinkService.save` — given two updates expect revision 2, expect one accepted revision 3; loser link_changed.
- **UT-057** (`task-required, state`): `LocalLinkService readiness` — given linked root moved after verification, expect path_invalid readiness with no checkout fallback.
- **UT-058** (`task-required, state`): `LocalLinkService.mine` — given U1 links P1/R1 and P2/R2, expect P1 selection contains only the P1 link.
- **UT-059** (`task-required, error`): `GatePolicyResolver.resolve` — given AGENTS.md references missing rules/mandatory.md, expect instructions_invalid.
- **UT-060** (`task-required, state`): `GateSettlement` — given manifest requiredGates=[], expect none_required summary rather than passed tests.
- **UT-061** (`task-required, error`): `GateRunner` — given declared service http://127.0.0.1:4317/health refuses connection, expect blocked/service_unavailable.
- **UT-062** (`task-required, error`): `WorkAuthorization.requireOperate` — given U2 starts a local action on U1-owned T1, expect FORBIDDEN operator_required.
- **UT-063** (`task-required, concurrency`): `LocalCheckoutRegistry acquireWriteLock` — given N1 already owns canonical checkout key C1 when N2 tries, expect checkout_busy without native dispatch.
- **UT-064** (`task-required, state`): `LocalCommandJournal.recover` — given N1 has fsynced dispatch intent but no recoverable terminal/runtime evidence, expect outcome_unknown without resubmitting start.
- **UT-065** (`task-required, error`): `TaskFlowAdmission.start` — given required prior gate G1 is unrun, expect PRECONDITION_FAILED action_unavailable.
- **UT-066** (`task-required, boundary`): `EvidenceSanitizer shared budget` — given 11 MiB of safe output is produced for a 10 MiB budget, expect evidence_truncated while decisive gate result remains retained.
- **UT-067** (`task-required, state`): `GatePolicyResolver.resolve` — given instructions require lint only; Playwright script merely exists, expect manifest excludes Playwright.
- **UT-068** (`task-required, error`): `GateRunner Playwright preflight` — given required Chromium executable is absent, expect blocked/browser_missing.
- **UT-069** (`task-required, error`): `GateRunner Playwright preflight` — given configured webServer endpoint is unavailable, expect blocked/service_unavailable rather than assertion_failed.
- **UT-070** (`task-required, error`): `EvidenceSanitizer.sanitize` — given Playwright trace embeds credential ENV_CANARY_123, expect no raw trace upload.
- **UT-071** (`task-required, ordering`): `GateSettlement` — given attempt 1 passed but required current attempt 2 timed out, expect attempt 2 unknown blocks successful completion.
- **UT-072** (`task-required, state`): `LocalCommandJournal.recover` — given gate G1 has durable exit=0 and valid reporter before restart, expect recovered G1 passed result with original execution identity.
- **UT-073** (`task-required, boundary`): `taskFlow.gates` — given 1000 test results exist, limit=50, expect 50 safe summary entries with continuation and failed count visible.
- **UT-074** (`task-required, error`): `WorkAuthorization.requireRead` — given GitHub repository R1 becomes inaccessible, expect repository_authorization_needed without private source disclosure.
- **UT-075** (`task-required, error`): `WorkAuthorization.requireOperate` — given In Progress option was renamed to Doing, expect PRECONDITION_FAILED board_status_changed.
- **UT-076** (`task-required, state`): `LocalActionExecutor terminal ingest` — given U1 lost assignment after N1 started; N1 actually exited 1, expect recorded failed outcome without permission to start another run.
- **UT-077** (`task-required, concurrency`): `TaskFlowAdmission.retryAction` — given two retries race after N1 is authoritatively failed, expect one accepted successor run.
- **UT-078** (`task-required, state`): `AssignedWorkspace block reasons` — given T1 is machine_unavailable and T2 is source_changed, expect each item displays its own unchanged reason.
- **UT-079** (`task-required, state`): `MachineController.diagnostics` — given no machines have paired, expect no_link capability rather than run failure.
- **UT-080** (`task-required, error`): `MachineController diagnostic parser` — given untrusted diagnostic payload exceeds 256 KiB, expect bounded invalid_input reason with no raw payload.
- **UT-081** (`task-required, error`): `MachineController.diagnostics` — given ordinary U2 requests cross-user restricted diagnostics, expect FORBIDDEN diagnostics_forbidden.
- **UT-082** (`task-required, state`): `MachineController.diagnostics` — given M1/U1 and M2/U2 are offline, expect correct safe machine/user/project attribution without folders.
- **UT-083** (`task-required, state`): `LocalLinkService readiness refresh` — given M1 reconnects while A1 is blocked, expect updated readiness with A1 still blocked until explicit start.
- **UT-084** (`task-required, state`): `MachineController readiness` — given host starts with persisted old ready heartbeat, expect unavailable until fresh authenticated capability check.
- **UT-085** (`task-required, happy`): `AuthoringAccessPolicy` — given current admin U1 owns draft T1 at version 3, expect authoring permission allowed.
- **UT-086** (`task-required, happy`): `assignedIssueRules` — given I1 is OPEN in R1, Ready and assigned by stable GitHub ID to U1, expect eligible=true.
- **UT-087** (`task-required, error`): `AssignedIssueGateway` — given provider GraphQL returns an errors array alongside partial data, expect provider_unavailable without claimable partial entries.
- **UT-088** (`task-required, happy`): `IssueClaimService` — given reserved C1 read-back shows the exact item B1 in In Progress, expect C1 becomes claimed with operatorId=U1.
- **UT-089** (`task-required, idempotency`): `IssueClaimService` — given operator U1 repeats claim after I1 left Ready, expect existing claimed T1 before new-reservation eligibility checks.
- **UT-090** (`task-required, error`): `IssueClaimService` — given C1 provider dispatch outcome is still uncertain when U2 tries, expect no reservation transfer to U2.
- **UT-091** (`task-required, error`): `issueClaimRules.assertFence` — given attempt fence=4 settles after stored fence advanced to 5, expect stale_fence without changing ownership.
- **UT-092** (`task-required, happy`): `WorkAuthorization.requireOperate` — given claimed operator U1 has current access, assignment and In Progress, expect WorkScope with actorId=U1 and snapshotId=S1.
- **UT-093** (`task-required, error`): `WorkAuthorization.requireOperate` — given admin author U2 is not T1 operator U1, expect operator_required.
- **UT-094** (`task-required, happy`): `IssueSourceService` — given published T1 has matching retained R1/I1 identity, expect existing task T1 binding rather than imported duplicate.
- **UT-095** (`task-required, error`): `IssueSourceService` — given I1 body is empty after whitespace trim, expect planning_input_limit.
- **UT-096** (`task-required, boundary`): `IssueSourceService` — given title is 256 code points and body is 65536 within encoded request limit, expect valid planning source input.
- **UT-097** (`task-required, boundary`): `IssueSourceService` — given encoded planning request is 262145 bytes, expect planning_input_limit.
- **UT-098** (`task-required, error`): `IssueSourceService.assertImmutableSnapshot` — given a new snapshot attempts to change existing S1 content in place, expect immutable snapshot rejection.
- **UT-099** (`task-required, happy`): `toDevControlRequest source adapter` — given imported S1 identifies acme/flow issue 41 with CSV body, expect v1 issueRevisionId=S1 with the exact verified issue fields.
- **UT-100** (`task-required, state`): `planning input hash adapter` — given historical v1 operation O1 has stored publication attempt PUBL1, expect the original inputHash byte-for-byte.
- **UT-101** (`task-required, error`): `planning response validator` — given response correlation inputHash differs from O1, expect planning_invalid_output.
- **UT-102** (`task-required, happy`): `SpecEligibilityGate` — given external T1 has completed claim and approved source-matching planning, expect spec eligibility without a publication attempt row.
- **UT-103** (`task-required, error`): `SpecEligibilityGate` — given approved planning points to S1 but current source is S2, expect source_changed.
- **UT-104** (`task-required, error`): `TaskFlowOptions` — given U1 selects machine M2 owned by U2, expect connection_unavailable without M2 model metadata.
- **UT-105** (`task-required, error`): `RuntimeChoiceValidator` — given host connection H1 is selected for a machine local target, expect connection_unavailable.
- **UT-106** (`task-required, happy`): `ConnectorPairingService` — given unexpired pairing code confirmed by current U1 session, expect pairing bound to ownerUserId=U1.
- **UT-107** (`task-required, error`): `ConnectorPairingService` — given pairing polling secret does not match its hash, expect pairing_secret_invalid.
- **UT-108** (`task-required, boundary`): `ConnectorPairingService` — given pairing exchange happens exactly at expiresAt, expect pairing_expired.
- **UT-109** (`task-required, idempotency`): `ConnectorPairingService` — given machine-token rotation R1 loses response then repeats identical request, expect same still-unacknowledged token generation.
- **UT-110** (`task-required, error`): `ConnectorPairingService` — given expired or revoked machine token sends heartbeat, expect machine_unauthorized.
- **UT-111** (`task-required, happy`): `LocalCheckoutRegistry` — given HTTPS and SSH origins both resolve to R1 canonical Git root, expect one opaque checkout key for the root.
- **UT-112** (`task-required, error`): `LocalCheckoutRegistry` — given symlink path resolves outside locally approved roots, expect path_not_allowed.
- **UT-113** (`task-required, error`): `LocalCheckoutRegistry` — given origin URL includes username/password credentials, expect repository_mismatch without storing the URL.
- **UT-114** (`task-required, error`): `LocalLinkService` — given actual verified GitHub IDs differ despite an old repo label match, expect repository_mismatch.
- **UT-115** (`task-required, idempotency`): `LocalLinkService` — given same link request key and payload are repeated, expect same link ID/revision.
- **UT-116** (`task-required, happy`): `localProjects.prepareAction` — given U1 has valid source/plan/link and reachable compatible M1, expect preparation descriptor without execution-run admission.
- **UT-117** (`task-required, error`): `localProjects.prepareAction` — given source/plan eligibility failed before preparation, expect action_unavailable without a prepare command.
- **UT-118** (`task-required, boundary`): `local prepared start validation` — given start occurs exactly five minutes after preparation issuance, expect preparation_expired.
- **UT-119** (`task-required, error`): `local prepared start validation` — given dirty checkout digest changed after preparation, expect preparation_changed.
- **UT-120** (`task-required, error`): `local prepared start validation` — given instruction hash changes after preparation, expect preparation_changed.
- **UT-121** (`task-required, happy`): `LocalCommandService` — given valid accepted local N1 snapshot is queued for owned M1, expect one start command bound to L1/revision=2.
- **UT-122** (`task-required, error`): `LocalCommandService` — given malformed command contains an arbitrary absolute path field, expect invalid_input before dispatch.
- **UT-123** (`task-required, idempotency`): `LocalCommandJournal` — given same command ID/payloadHash/fence is delivered twice, expect one native submission with stored replay acknowledgment.
- **UT-124** (`task-required, error`): `LocalCommandJournal` — given same command ID is delivered with a different payloadHash, expect command_payload_changed.
- **UT-125** (`task-required, ordering`): `LocalCommandJournal` — given event sequence 3 arrives before 2, expect event_gap requesting resend from 2.
- **UT-126** (`task-required, error`): `LocalCommandService event ingestion` — given event fence=2 differs from current fence=3, expect stale_fence.
- **UT-127** (`task-required, error`): `LocalActionExecutor` — given native runtime accepts submission but response is lost, expect unknown with reconciliation of the original runtime key.
- **UT-128** (`task-required, state`): `LocalActionExecutor` — given browser closes while companion/runtime are still healthy, expect run remains running.
- **UT-129** (`task-required, happy`): `native run launcher` — given linked canonical root C1 differs from /workspace, expect runtime session uses C1 as actual workspace root.
- **UT-130** (`task-required, error`): `native run launcher` — given capability report has incompatible COMPOZY_PIN/OpenAPI version, expect runtime_incompatible without submission.
- **UT-131** (`task-required, error`): `ApprovedArtifactInstaller local adapter` — given approved file conflicts with preexisting dirty local file, expect artifact_conflict without overwrite.
- **UT-132** (`task-required, happy`): `GatePolicyResolver` — given AGENTS.md explicitly requires pnpm lint for implementation, expect required lint gate with cited source/hash.
- **UT-133** (`task-required, error`): `GatePolicyResolver` — given mandatory command declaration is ambiguous, expect gate_policy_unresolved.
- **UT-134** (`task-required, state`): `GatePolicyResolver` — given no instruction file or mandatory project gate exists, expect empty required manifest.
- **UT-135** (`task-required, state`): `GatePolicyResolver` — given edit scope encounters a nested AGENTS.md requiring typecheck, expect typecheck obligation added before settlement.
- **UT-136** (`task-required, happy`): `GateRunner` — given current required Playwright reporter shows 2 passed tests and exit 0, expect passed with original command/execution digest.
- **UT-137** (`task-required, error`): `GateRunner` — given Playwright reporter shows one assertion failure with exit 1, expect failed/assertion_failed.
- **UT-138** (`task-required, error`): `GateRunner` — given Playwright gate exits 0 with zero executed tests, expect blocked/gate_not_run.
- **UT-139** (`task-required, error`): `GateRunner` — given required test config has invalid syntax, expect blocked/test_config_invalid.
- **UT-140** (`task-required, error`): `GateRunner` — given required environment variable is missing, expect blocked/environment_missing with no variable value.
- **UT-141** (`task-required, error`): `GateRunner` — given declared runner dependency is absent, expect blocked/dependency_missing.
- **UT-142** (`task-required, error`): `GateRunner` — given unclassified command exits 2, expect failed/command_failed rather than guessed setup failure.
- **UT-143** (`task-required, boundary`): `GateRunner` — given process has no terminal evidence at its declared timeout, expect unknown/gate_timeout.
- **UT-144** (`task-required, error`): `GateRunner` — given required test was unexpectedly skipped, expect blocked/gate_not_run.
- **UT-145** (`task-required, happy`): `GateSettlement` — given runtime succeeded, artifacts captured and all current required gates passed on final checked digest, expect succeeded.
- **UT-146** (`task-required, error`): `GateSettlement` — given runtime succeeded but one required gate is unrun, expect success refused with gate_not_run.
- **UT-147** (`task-required, error`): `GateSettlement` — given gate result points to a different manifest hash, expect success refused with gate_policy_changed.
- **UT-148** (`task-required, error`): `GateSettlement` — given manual edit changed tested checkout contents after gate pass, expect success refused with preparation_changed.
- **UT-149** (`task-required, state`): `GateSettlement` — given native action canceled before G1 ran, expect canceled with G1 unrun.
- **UT-150** (`task-required, happy`): `EvidenceSanitizer` — given safe reporter JSON contains 2 passed tests and relative path tests/export.spec.ts, expect typed safe summary accepted.
- **UT-151** (`task-required, error`): `EvidenceSanitizer` — given generated required Markdown embeds ENV_CANARY_123, expect unsafe document suppressed with artifact_unsafe.
- **UT-152** (`task-required, boundary`): `EvidenceSanitizer` — given shared preview is 16385 bytes, expect 16384-byte safe preview with detail continuation.
- **UT-153** (`task-required, error`): `shared DTO mappers` — given local runtime error includes path/token fields under unknown harmless keys, expect unknown fields excluded rather than serialized.
- **UT-154** (`task-required, happy`): `shared DTO mappers` — given owned local run N1 has immutable accepted machine/link provenance, expect safe IDs/version/timestamps without private root.
- **UT-155** (`task-required, happy`): `AssignedWorkspace` — given U1 receives claimed work and current source-matching planning, expect operator controls appear for eligible explicit actions.
- **UT-156** (`task-required, error`): `AssignedWorkspace` — given next refresh denies repository access, expect private cached work detail cleared.
- **UT-157** (`task-required, happy`): `LocalProjectSettings` — given own link L1 is ready on M1, expect safe label and explicit preparation entry displayed.
- **UT-158** (`task-required, error`): `LocalProjectSettings` — given link save receives link_changed, expect pt-BR refresh message with no silent link replacement.
- **UT-159** (`task-required, error`): `projectRoutes return-path validator` — given returnTo=https://attacker.invalid/work/T1, expect external redirect rejected.
- **UT-160** (`task-required, happy`): `taskFlowMappers.toWorkspace` — given stored local target contains L1/revision=2, expect the exact local discriminant/target rather than isolated.
- **UT-161** (`task-required, happy`): `taskFlowMappers.toRun` — given persisted requestedBy=U1 for N1, expect RunRecord.requestedBy=U1.
- **UT-162** (`task-required, boundary`): `MachineController readiness` — given heartbeat age reaches 30 seconds, expect machine unavailable.
- **UT-163** (`task-required, boundary`): `LocalCommandJournal admission` — given start lease equals current time, expect command_expired before local effect.
- **UT-164** (`task-required, idempotency`): `LocalCommandService event ingestion` — given same sequence/payload hash is repeated, expect same acknowledgment without duplicate evidence.
- **UT-165** (`task-required, error`): `LocalCommandService event ingestion` — given same sequence has a different payload hash, expect event_conflict.
- **UT-166** (`task-required, error`): `EvidenceSanitizer` — given evidence uses unknown binary kind, expect evidence_rejected.
- **UT-167** (`task-required, error`): `LocalCommandService capacity admission` — given configured maxActiveActions=1 already has active host N1, expect second local attempt remains capacity-blocked.
- **UT-168** (`task-required, happy`): `IssueSourceService publication binding` — given legacy PUBL1 has numeric issueId but missing issueNodeId, expect verified node resolution reuses T1 rather than importing.
- **UT-169** (`task-required, error`): `LocalCommand prepare` schema — payload includes unknown absolutePath field; expect invalid_input before local effect.
- **UT-170** (`task-required, error`): `LocalCommand start` schema — payload includes unknown absolutePath field; expect invalid_input before local effect.
- **UT-171** (`task-required, error`): `LocalCommand inspect` schema — payload includes unknown absolutePath field; expect invalid_input before local effect.
- **UT-172** (`task-required, error`): `LocalCommand cancel` schema — payload includes unknown absolutePath field; expect invalid_input before local effect.
- **UT-173** (`task-required, error`): `LocalCommand answer` schema — payload includes unknown absolutePath field; expect invalid_input before local effect.
- **UT-174** (`task-required, error`): `LocalEvent accepted` schema — payload includes unknown absolutePath field; expect invalid_input before local effect.
- **UT-175** (`task-required, error`): `LocalEvent prepared` schema — payload includes unknown absolutePath field; expect invalid_input before local effect.
- **UT-176** (`task-required, error`): `LocalEvent activity` schema — payload includes unknown absolutePath field; expect invalid_input before local effect.
- **UT-177** (`task-required, error`): `LocalEvent gate` schema — payload includes unknown absolutePath field; expect invalid_input before local effect.
- **UT-178** (`task-required, error`): `LocalEvent terminal` schema — payload includes unknown absolutePath field; expect invalid_input before local effect.
- **UT-179** (`task-required, error`): Every applicable local command kind (parameterized) — protocolVersion=99; expect safe rejection/result reason=protocol_incompatible without a replacement start.
- **UT-180** (`task-required, error`): Every applicable local command kind (parameterized) — missing target linkId; expect safe rejection/result reason=invalid_input without a replacement start.
- **UT-181** (`task-required, error`): Every applicable local command kind (parameterized) — foreign machine/run target; expect safe rejection/result reason=command_unavailable without a replacement start.
- **UT-182** (`task-required, error`): Every applicable local command kind (parameterized) — leaseExpiresAt equals current time; expect safe rejection/result reason=command_expired without a replacement start.
- **UT-183** (`task-required, error`): Every applicable local command kind (parameterized) — same commandId has a new payloadHash; expect safe rejection/result reason=command_payload_changed without a replacement start.
- **UT-184** (`task-required, error`): Every applicable local command kind (parameterized) — native launch definitively fails before dispatch; expect safe rejection/result reason=runtime_failed without a replacement start.
- **UT-185** (`task-required, error`): Every applicable local command kind (parameterized) — native dispatch may have occurred but acknowledgment is lost; expect safe rejection/result reason=outcome_unknown without a replacement start.

## Integration Tests

### Real persistence, provider boundaries, public procedure/HTTP/CLI contracts

- **IT-001** (`task-required`): `IssueClaimDao.reserve` — given eligible U1 and U2 reserve the same source concurrently, expect exactly one unresolved claimant reservation.
- **IT-002** (`task-required`): `IssueClaimDao source binding` — given 100 requests resolve the same P1/R1/I1 identity, expect one source binding and one task identity.
- **IT-003** (`task-required`): `IssueClaimDao.active` — given 51 claims exist with limit=50, expect 50 items with a nextCursor.
- **IT-004** (`task-required`): `IssueClaimDao status` — given host restarts while claim C1 is uncertain, expect persisted uncertain C1 before reconciliation.
- **IT-005** (`task-required`): `Migration/source identity` — load published T1 with PUBL1 and approved packages, run migration; expect source binds existing T1 without creating any claim.
- **IT-006** (`task-required`): `Migration/legacy parity` — backfill historical O1/D1/package PK1 then read them through the real projection; expect IDs/content/inputHash/approval provenance match the original fixture exactly.
- **IT-007** (`task-required`): `Migration/import` — claim external I1 through real controller/service/Postgres DAO; expect imported T1 has null author and no task_publication_attempts row.
- **IT-008** (`task-required`): `Migration/conflict` — seed contradictory T1/T2 publication identity for I1 then run backfill; expect safe binding conflict fails migration instead of discarding history.
- **IT-009** (`task-required`): `Publication/source race` — claim I1 while successful publication settlement for that identity is committing under the same identity lock; expect one task/source binding reusing retained publication history.
- **IT-010** (`task-required`): `Claim concurrency` — two authenticated callers U1/U2 claim I1 simultaneously using real transactions and mocked GitHub HTTP; expect one completed claim/operator after read-back.
- **IT-011** (`task-required`): `Claim recovery` — GitHub mutation succeeds but its HTTP response drops; restart claim worker and read item In Progress; expect original claimant U1 completes the existing T1.
- **IT-012** (`task-required`): `Claim reservation` — crash after dispatch intent before outcome; U2 claims during recovery; expect original unresolved reservation remains.
- **IT-013** (`task-required`): `Claim failure` — GitHub rejects write definitively and a fresh read proves Ready; expect failed attempt releases reservation with preserved audit history.
- **IT-014** (`task-required`): `Claim explicit retry` — settled failed attempt still has Ready eligibility; only perform background read reconciliation; expect no new status mutation is sent.
- **IT-015** (`task-required`): `Claim races` — Ready changes externally between checks and mutation; expect stored resulting board state reflects read-back without a claimed distributed-CAS guarantee.
- **IT-016** (`task-required`): `Claim no board item` — fresh GitHub issue is not in linked board; expect claim rejects board_item_invalid without addProjectV2ItemById.
- **IT-017** (`task-required`): `Discovery paging` — provider supplies 151 mixed items plus a user assignment after assignee page 1; expect all eligible issues can be reached using returned cursors.
- **IT-018** (`task-required`): `Discovery unavailable` — GitHub rate limits page 3; expect retry state retains cursor instead of reporting final empty.
- **IT-019** (`task-required`): `Role guards` — demote admin U1 between UI load and POST task-dictation/capture admission; expect admin_required with no draft side effect.
- **IT-020** (`task-required`): `Publication repository authorization` — admin author U1 lacks personal repository authorization while requesting publication; expect repository_authorization_needed with draft retained.
- **IT-021** (`task-required`): `Observer guards` — parameterize every planning/spec/taskFlow mutation through real tRPC with observer U2; expect FORBIDDEN operator_required before action acceptance.
- **IT-022** (`task-required`): `DAO guard` — invoke real planning acceptance with mismatched requester/claim inside transaction; expect operator_required without operation insertion.
- **IT-023** (`task-required`): `Worker actor` — authored T1 has author U2 and operator/requester U1; dispatch real planning worker; expect repository capability/session checks use U1.
- **IT-024** (`task-required`): `Source protocol` — real DevControlPlanningGateway receives imported source S1 through HTTP fixture; expect provider request v1 has issueRevisionId=S1 and exact source body.
- **IT-025** (`task-required`): `Source history` — reconfirm changed S2 through public API at expected S1; expect old approved D1 becomes historical without new analysis operation.
- **IT-026** (`task-required`): `Source stale approval` — source changes after a reviewed package loads, then submit its approval; expect source_changed without overwriting approved historical package.
- **IT-027** (`task-required`): `Planning board status` — approve a source-matching current decision through real router/controller/DAO; expect no moveToReady GitHub request.
- **IT-028** (`task-required`): `Planning failure recovery` — provider planning request times out; read saved attempts then explicitly retry; expect one new operation with old attempt preserved.
- **IT-029** (`task-required`): `Planning no autostart` — save/approve route tech_spec through public APIs; expect no task execution run exists until startAction.
- **IT-030** (`task-required`): `Legacy journey` — claim published T1 with matching legacy approved packages then read work detail; expect existing package IDs/approval history remain usable.
- **IT-031** (`feature-gate`): `Drain/cutover` — an active pre-cutover O1 loses dispatch eligibility during migration; expect retained original outcome or blocked recovery without unattended successor.
- **IT-032** (`task-required`): `Pairing exchange` — CLI begins pairing, browser U1 confirms, CLI exchanges private polling secret; expect credential belongs only to M1/U1.
- **IT-033** (`task-required`): `Pairing competing exchange` — two identical completes race on a confirmed pairing; expect one credential generation is consumed.
- **IT-034** (`task-required`): `Machine credential` — rotate M1 credential with dropped response and retry same key; expect idempotent renewal delivers the pending generation until acknowledgment.
- **IT-035** (`task-required`): `Link Git identity` — CLI links a temporary real Git root with SSH remote git@github.com:acme/flow.git; expect host stores only opaque handle with verified repository IDs.
- **IT-036** (`task-required`): `Link aliases` — link canonical root and symlink alias for two write attempts; expect local/server locks treat both as checkout key C1.
- **IT-037** (`task-required`): `Link provenance` — accept run N1 on L1/revision=2 then change/unlink current link; expect N1 snapshot remains L1/revision=2.
- **IT-038** (`task-required`): `Provider isolation` — register local provider metadata for M1/U1 then query choices as U2; expect M1 connection/models are absent.
- **IT-039** (`task-required`): `Provider grants` — dispatch machine-local N1 through real dispatcher; expect host CredentialBroker.grantForAttempt is never called.
- **IT-040** (`task-required`): `Preparation` — prepare A1 via HTTPS companion with real temporary dirty Git checkout; expect preparation pins actual checkout/instruction/gate digests without executing A1.
- **IT-041** (`task-required`): `Preparation drift` — edit AGENTS.md after preparation before startAction; expect preparation_changed prevents native dispatch.
- **IT-042** (`task-required`): `Workspace round-trip` — persist/reload local action L1/revision=2 through Drizzle plan store; expect local target remains exact.
- **IT-043** (`feature-gate`): `Native launcher` — start bundled spec skill through companion using compatible runtime and actual temp Git root; expect runtime observes project instructions in that root.
- **IT-044** (`task-required`): `Local artifacts` — install approved artifacts into a temporary dirty checkout with a conflicting file; expect artifact_conflict preserves original bytes.
- **IT-045** (`task-required`): `Local event replay` — deliver command/events twice after dropped acknowledgment; expect one native effect and one stored result per sequence.
- **IT-046** (`task-required`): `Local journal crash` — kill companion immediately after fsynced dispatch intent, restart it; expect recovery inspects original key rather than issuing a new start.
- **IT-047** (`task-required`): `Local lock contention` — T1/N1 and T2/N2 use the same local checkout; expect N2 is checkout_busy until N1 terminal reconciliation releases the lock.
- **IT-048** (`task-required`): `Lost lease` — disconnect companion longer than lease while process is active; expect host retains reconciling write lock until original runtime outcome is known.
- **IT-049** (`task-required`): `Local cancellation` — cancel local N1 through work UI while native runtime confirms stop; expect N1 becomes canceled with required unfinished gates unrun.
- **IT-050** (`feature-gate`): `Local questions` — answer a current question through taskFlow.answerQuestion via machine command; expect only original N1 interaction receives the accepted answer.
- **IT-051** (`task-required`): `Revoked access mid-run` — revoke U1 project membership after N1 starts; companion uploads a safe terminal result; expect real terminal result is retained without future U1 disclosure/new action.
- **IT-052** (`task-required`): `Gate policy` — AGENTS.md explicitly cites project skill and pnpm test:e2e; package contains unrelated scripts; expect only cited applicable required gates are pinned.
- **IT-053** (`feature-gate`): `Playwright passing` — companion runs a real two-test fixture against local dev service with required browser installed; expect current required gate passed with nonzero executed count.
- **IT-054** (`feature-gate`): `Playwright assertion` — fixture UI violates one expected assertion; expect failed/assertion_failed controls gated run result.
- **IT-055** (`feature-gate`): `Playwright setup` — remove required browser executable before gate command; expect blocked/browser_missing instead of success.
- **IT-056** (`feature-gate`): `Playwright service` — stop the fixture local dev service before preflight; expect blocked/service_unavailable rather than product assertion failure.
- **IT-057** (`task-required`): `Gate stale result` — N1 passes G1, N2 has G1 unrun; expect N1 evidence cannot satisfy N2 settlement.
- **IT-058** (`task-required`): `Gate no requirements` — project fixture has no declared gates; expect empty required ledger with none_required summary.
- **IT-059** (`task-required`): `Gate unknown` — kill gate process without a durable terminal record; expect unknown outcome prevents success until reconciliation.
- **IT-060** (`task-required`): `Gate missing instructions` — project instruction references a missing mandatory skill/rule file; expect instructions_invalid prevents execution admission.
- **IT-061** (`task-required`): `Evidence egress` — execute fixture that prints ENV_CANARY_123 and private root to multiple output fields; expect captured hosted network/storage has neither literal.
- **IT-062** (`task-required`): `Evidence artifact` — generated mandatory Markdown contains private secret canary; expect artifact_unsafe blocks capture instead of sharing the document.
- **IT-063** (`task-required`): `Evidence budget` — emit 11 MiB activity before terminal gate event; expect decisive gate outcome survives shared activity truncation.
- **IT-064** (`task-required`): `Safe diagnostics` — malformed machine capability body reaches real HTTP handler; expect bounded safe error without raw source in logs.
- **IT-065** (`feature-gate`): `Host choice preservation` — no local link exists but a host isolated target is configured; expect existing explicit isolated action still works.
- **IT-066** (`task-required`): `Local runtime incompatibility` — paired companion reports different OpenAPI pin; expect local action unavailable while eligible host choice stays explicit.
- **IT-067** (`task-required`): `Package unsafe finalization` — runtime reports completed while mandatory package capture fails safety inspection; expect run cannot settle succeeded.
- **IT-068** (`task-required`): `Read access refresh` — remove personal repository permission during browser polling; expect next public read returns no cached source/artifact payload.
- **IT-069** (`task-required`): `assignedIssues.list` via real tRPC caller/controller/DAO — submit P1, limit=20 as eligible U1; expect serialized success shape `{items,nextCursor,availability}`.
- **IT-070** (`task-required`): `assignedIssues.list` — set P1 boardNodeId=null; submit its otherwise valid request; expect `PRECONDITION_FAILED` with safe `reason=board_missing`.
- **IT-071** (`task-required`): `assignedIssues.list` — set board Status has no Ready option; submit its otherwise valid request; expect `PRECONDITION_FAILED` with safe `reason=ready_missing`.
- **IT-072** (`task-required`): `assignedIssues.list` — set personal OAuth credential expired; submit its otherwise valid request; expect `PRECONDITION_FAILED` with safe `reason=repository_authorization_needed`.
- **IT-073** (`task-required`): `assignedIssues.list` — set GitHub transport fails; submit its otherwise valid request; expect `SERVICE_UNAVAILABLE` with safe `reason=provider_unavailable`.
- **IT-074** (`task-required`): `assignedIssues.list` — set GitHub returns 429 with Retry-After=30; submit its otherwise valid request; expect `TOO_MANY_REQUESTS` with safe `reason=provider_rate_limited`.
- **IT-075** (`task-required`): `assignedIssues.list` — set cursor is bound to inaccessible P2; submit its otherwise valid request; expect `BAD_REQUEST` with safe `reason=invalid_cursor`.
- **IT-076** (`task-required`): `assignedIssues.byIssue` via real tRPC caller/controller/DAO — submit P1, issueNodeId=I1, boardItemId=B1 as eligible U1; expect serialized success shape `{issue,eligibility,taskId}`.
- **IT-077** (`task-required`): `assignedIssues.byIssue` — set GitHub node I1 does not exist; submit its otherwise valid request; expect `NOT_FOUND` with safe `reason=issue_unavailable`.
- **IT-078** (`task-required`): `assignedIssues.byIssue` — set fresh identity is R2 rather than R1; submit its otherwise valid request; expect `PRECONDITION_FAILED` with safe `reason=repository_mismatch`.
- **IT-079** (`task-required`): `assignedIssues.byIssue` — set B1 contains a PullRequest or belongs to another board; submit its otherwise valid request; expect `PRECONDITION_FAILED` with safe `reason=board_item_invalid`.
- **IT-080** (`task-required`): `assignedIssues.byIssue` — set GitHub transport fails; submit its otherwise valid request; expect `SERVICE_UNAVAILABLE` with safe `reason=provider_unavailable`.
- **IT-081** (`task-required`): `assignedIssues.byIssue` — set GitHub returns 429 with Retry-After=30; submit its otherwise valid request; expect `TOO_MANY_REQUESTS` with safe `reason=provider_rate_limited`.
- **IT-082** (`task-required`): `assignedIssues.claim` via real tRPC caller/controller/DAO — submit P1/I1/B1, requestKey=K1 as eligible U1; expect serialized success shape `{taskId:T1,state:claimed,operatorId:U1,reason:null,replayed:false}`.
- **IT-083** (`task-required`): `assignedIssues.claim` — set I1 is closed; submit its otherwise valid request; expect `PRECONDITION_FAILED` with safe `reason=issue_ineligible`.
- **IT-084** (`task-required`): `assignedIssues.claim` — set board has no In Progress option; submit its otherwise valid request; expect `PRECONDITION_FAILED` with safe `reason=in_progress_missing`.
- **IT-085** (`task-required`): `assignedIssues.claim` — set fresh identity is R2 rather than R1; submit its otherwise valid request; expect `PRECONDITION_FAILED` with safe `reason=repository_mismatch`.
- **IT-086** (`task-required`): `assignedIssues.claim` — set B1 contains a PullRequest or belongs to another board; submit its otherwise valid request; expect `PRECONDITION_FAILED` with safe `reason=board_item_invalid`.
- **IT-087** (`task-required`): `assignedIssues.claim` — set same key K1 already recorded with a different payload; submit its otherwise valid request; expect `CONFLICT` with safe `reason=request_key_reused`.
- **IT-088** (`task-required`): `assignedIssues.claim` — set GitHub transport fails; submit its otherwise valid request; expect `SERVICE_UNAVAILABLE` with safe `reason=provider_unavailable`.
- **IT-089** (`task-required`): `assignedIssues.claim` — set GitHub returns 429 with Retry-After=30; submit its otherwise valid request; expect `TOO_MANY_REQUESTS` with safe `reason=provider_rate_limited`.
- **IT-090** (`task-required`): `assignedIssues.claimStatus` via real tRPC caller/controller/DAO — submit P1/T1 as eligible U1; expect serialized success shape `{taskId:T1,state:claimed,operatorId:U1,reason:null}`.
- **IT-091** (`task-required`): `assignedIssues.claimStatus` — set T1 is inaccessible to the current actor; submit its otherwise valid request; expect `NOT_FOUND` with safe `reason=work_unavailable`.
- **IT-092** (`task-required`): `assignedIssues.reconcileClaim` via real tRPC caller/controller/DAO — submit P1/T1, requestKey=K1 as eligible U1; expect serialized success shape `{taskId:T1,state:claimed,operatorId:U1}`.
- **IT-093** (`task-required`): `assignedIssues.reconcileClaim` — set U2 attempts pending U1 claim reconciliation; submit its otherwise valid request; expect `FORBIDDEN` with safe `reason=claimant_required`.
- **IT-094** (`task-required`): `assignedIssues.reconcileClaim` — set claim is uncertain; submit its otherwise valid request; expect `PRECONDITION_FAILED` with safe `reason=claim_unresolved`.
- **IT-095** (`task-required`): `assignedIssues.reconcileClaim` — set GitHub transport fails; submit its otherwise valid request; expect `SERVICE_UNAVAILABLE` with safe `reason=provider_unavailable`.
- **IT-096** (`task-required`): `assignedIssues.reconcileClaim` — set GitHub returns 429 with Retry-After=30; submit its otherwise valid request; expect `TOO_MANY_REQUESTS` with safe `reason=provider_rate_limited`.
- **IT-097** (`task-required`): `assignedIssues.reconcileClaim` — set same key K1 already recorded with a different payload; submit its otherwise valid request; expect `CONFLICT` with safe `reason=request_key_reused`.
- **IT-098** (`task-required`): `assignedIssues.active` via real tRPC caller/controller/DAO — submit P1, filter=mine, limit=20 as eligible U1; expect serialized success shape `{items:[T1],nextCursor:null}`.
- **IT-099** (`task-required`): `assignedIssues.active` — set cursor is bound to inaccessible P2; submit its otherwise valid request; expect `BAD_REQUEST` with safe `reason=invalid_cursor`.
- **IT-100** (`task-required`): `assignedIssues.byTask` via real tRPC caller/controller/DAO — submit P1/T1 as eligible U1; expect serialized success shape `{sourceSnapshotId:S1,viewerCanOperate:true,taskId:T1}`.
- **IT-101** (`task-required`): `assignedIssues.byTask` — set T1 is inaccessible to the current actor; submit its otherwise valid request; expect `NOT_FOUND` with safe `reason=work_unavailable`.
- **IT-102** (`task-required`): `assignedIssues.reconfirmSource` via real tRPC caller/controller/DAO — submit P1/T1, expectedSnapshotId=S1, expectedVersion=3, requestKey=K1 as eligible U1; expect serialized success shape `{sourceSnapshotId:S2,needsReplanning:true}`.
- **IT-103** (`task-required`): `assignedIssues.reconfirmSource` — set U2 observes U1-owned T1; submit its otherwise valid request; expect `FORBIDDEN` with safe `reason=operator_required`.
- **IT-104** (`task-required`): `assignedIssues.reconfirmSource` — set fresh source differs from expected pinned S1; submit its otherwise valid request; expect `PRECONDITION_FAILED` with safe `reason=source_changed`.
- **IT-105** (`task-required`): `assignedIssues.reconfirmSource` — set stored revision=4 but expected=3; submit its otherwise valid request; expect `CONFLICT` with safe `reason=version_changed`.
- **IT-106** (`task-required`): `assignedIssues.reconfirmSource` — set I1 is closed; submit its otherwise valid request; expect `PRECONDITION_FAILED` with safe `reason=issue_ineligible`.
- **IT-107** (`task-required`): `assignedIssues.reconfirmSource` — set claim is uncertain; submit its otherwise valid request; expect `PRECONDITION_FAILED` with safe `reason=claim_unresolved`.
- **IT-108** (`task-required`): `assignedIssues.reconfirmSource` — set same key K1 already recorded with a different payload; submit its otherwise valid request; expect `CONFLICT` with safe `reason=request_key_reused`.
- **IT-109** (`task-required`): `localMachines.confirmPairing` via real tRPC caller/controller/DAO — submit publicCode=ABCD-EFGH-JK, label=Dev laptop, requestKey=K1 as eligible U1; expect serialized success shape `{pairingId:PAIR1,machine:{id:M1}}`.
- **IT-110** (`task-required`): `localMachines.confirmPairing` — set clock equals pairing expiry; submit its otherwise valid request; expect `PRECONDITION_FAILED` with safe `reason=pairing_expired`.
- **IT-111** (`task-required`): `localMachines.confirmPairing` — set pairing was already exchanged; submit its otherwise valid request; expect `CONFLICT` with safe `reason=pairing_consumed`.
- **IT-112** (`task-required`): `localMachines.confirmPairing` — set public code has no active pairing; submit its otherwise valid request; expect `NOT_FOUND` with safe `reason=pairing_not_found`.
- **IT-113** (`task-required`): `localMachines.confirmPairing` — set same key K1 already recorded with a different payload; submit its otherwise valid request; expect `CONFLICT` with safe `reason=request_key_reused`.
- **IT-114** (`task-required`): `localMachines.list` via real tRPC caller/controller/DAO — submit limit=20 as eligible U1; expect serialized success shape `{items:[M1],nextCursor:null}`.
- **IT-115** (`task-required`): `localMachines.list` — set cursor is bound to inaccessible P2; submit its otherwise valid request; expect `BAD_REQUEST` with safe `reason=invalid_cursor`.
- **IT-116** (`task-required`): `localMachines.revoke` via real tRPC caller/controller/DAO — submit machineId=M1, expectedRevision=2, requestKey=K1 as eligible U1; expect serialized success shape `{machineId:M1,revision:3,revoked:true}`.
- **IT-117** (`task-required`): `localMachines.revoke` — set M1 is foreign or unavailable; submit its otherwise valid request; expect `NOT_FOUND` with safe `reason=machine_unavailable`.
- **IT-118** (`task-required`): `localMachines.revoke` — set stored revision=4 but expected=3; submit its otherwise valid request; expect `CONFLICT` with safe `reason=version_changed`.
- **IT-119** (`task-required`): `localMachines.revoke` — set same key K1 already recorded with a different payload; submit its otherwise valid request; expect `CONFLICT` with safe `reason=request_key_reused`.
- **IT-120** (`task-required`): `localMachines.diagnostics` via real tRPC caller/controller/DAO — submit machineId=M1, projectId=P1, limit=20 as eligible U1; expect serialized success shape `{capabilities:[{layer:machine,reason:machine_unavailable}],nextCursor:null}`.
- **IT-121** (`task-required`): `localMachines.diagnostics` — set ordinary U2 requests restricted cross-user data; submit its otherwise valid request; expect `FORBIDDEN` with safe `reason=diagnostics_forbidden`.
- **IT-122** (`task-required`): `localMachines.diagnostics` — set cursor is bound to inaccessible P2; submit its otherwise valid request; expect `BAD_REQUEST` with safe `reason=invalid_cursor`.
- **IT-123** (`task-required`): `localProjects.mine` via real tRPC caller/controller/DAO — submit projectId=P1 as eligible U1; expect serialized success shape `{linkId:L1,revision:2,readiness:ready}`.
- **IT-124** (`task-required`): `localProjects.mine` — set T1 is inaccessible to the current actor; submit its otherwise valid request; expect `NOT_FOUND` with safe `reason=work_unavailable`.
- **IT-125** (`task-required`): `localProjects.unlink` via real tRPC caller/controller/DAO — submit P1/L1, expectedRevision=2, requestKey=K1 as eligible U1; expect serialized success shape `{revision:3,state:unlinked}`.
- **IT-126** (`task-required`): `localProjects.unlink` — set L1 belongs to U2; submit its otherwise valid request; expect `NOT_FOUND` with safe `reason=link_unavailable`.
- **IT-127** (`task-required`): `localProjects.unlink` — set stored link revision=3 but expected=2; submit its otherwise valid request; expect `CONFLICT` with safe `reason=link_changed`.
- **IT-128** (`task-required`): `localProjects.unlink` — set same key K1 already recorded with a different payload; submit its otherwise valid request; expect `CONFLICT` with safe `reason=request_key_reused`.
- **IT-129** (`task-required`): `localProjects.prepareAction` via real tRPC caller/controller/DAO — submit P1/T1/A1, expectedPlanRevision=3, L1/revision=2, requestKey=K1 as eligible U1; expect serialized success shape `{preparationId:PREP1,state:pending}`.
- **IT-130** (`task-required`): `localProjects.prepareAction` — set U2 observes U1-owned T1; submit its otherwise valid request; expect `FORBIDDEN` with safe `reason=operator_required`.
- **IT-131** (`task-required`): `localProjects.prepareAction` — set I1 is closed; submit its otherwise valid request; expect `PRECONDITION_FAILED` with safe `reason=issue_ineligible`.
- **IT-132** (`task-required`): `localProjects.prepareAction` — set fresh source differs from expected pinned S1; submit its otherwise valid request; expect `PRECONDITION_FAILED` with safe `reason=source_changed`.
- **IT-133** (`task-required`): `localProjects.prepareAction` — set claim is uncertain; submit its otherwise valid request; expect `PRECONDITION_FAILED` with safe `reason=claim_unresolved`.
- **IT-134** (`task-required`): `localProjects.prepareAction` — set L1 belongs to U2; submit its otherwise valid request; expect `NOT_FOUND` with safe `reason=link_unavailable`.
- **IT-135** (`task-required`): `localProjects.prepareAction` — set stored link revision=3 but expected=2; submit its otherwise valid request; expect `CONFLICT` with safe `reason=link_changed`.
- **IT-136** (`task-required`): `localProjects.prepareAction` — set M1 is foreign or unavailable; submit its otherwise valid request; expect `PRECONDITION_FAILED` with safe `reason=machine_unavailable`.
- **IT-137** (`task-required`): `localProjects.prepareAction` — set approved planning prerequisite is absent; submit its otherwise valid request; expect `PRECONDITION_FAILED` with safe `reason=action_unavailable`.
- **IT-138** (`task-required`): `localProjects.prepareAction` — set same key K1 already recorded with a different payload; submit its otherwise valid request; expect `CONFLICT` with safe `reason=request_key_reused`.
- **IT-139** (`task-required`): `localProjects.prepareStatus` via real tRPC caller/controller/DAO — submit P1/T1, preparationId=PREP1 as eligible U1; expect serialized success shape `{state:ready,preparation:{preparationId:PREP1,target:{linkId:L1,linkRevision:2}}}`.
- **IT-140** (`task-required`): `localProjects.prepareStatus` — set PREP1 is foreign or missing; submit its otherwise valid request; expect `NOT_FOUND` with safe `reason=preparation_unavailable`.
- **IT-141** (`task-required`): `taskFlow.gates` via real tRPC caller/controller/DAO — submit P1/T1, runId=N1, limit=20 as eligible U1; expect serialized success shape `{items:[{gateId:G1,state:passed}],summary:passed,nextCursor:null}`.
- **IT-142** (`task-required`): `taskFlow.gates` — set N1 is not in T1; submit its otherwise valid request; expect `NOT_FOUND` with safe `reason=run_unavailable`.
- **IT-143** (`task-required`): `taskFlow.gates` — set cursor is bound to inaccessible P2; submit its otherwise valid request; expect `BAD_REQUEST` with safe `reason=invalid_cursor`.
- **IT-144** (`task-required`): `taskFlow.evidence` via real tRPC caller/controller/DAO — submit P1/T1, runId=N1, evidenceId=EV1 as eligible U1; expect serialized success shape `{id:EV1,kind:test-summary,safeContentHash:SHA1}`.
- **IT-145** (`task-required`): `taskFlow.evidence` — set EV1 is not safe/shared or not in N1; submit its otherwise valid request; expect `NOT_FOUND` with safe `reason=evidence_unavailable`.
- **IT-146** (`task-required`): Every protected browser procedure in the TechSpec API table (parameterized per procedure) — null authenticated principal; expect `UNAUTHORIZED` with `reason=session_required` and no private canary.
- **IT-147** (`task-required`): Every protected browser procedure in the TechSpec API table (parameterized per procedure) — actor has no current project/resource access; expect `NOT_FOUND` with `reason=work_unavailable` and no private canary.
- **IT-148** (`task-required`): Every protected browser procedure in the TechSpec API table (parameterized per procedure) — request includes an unknown field or invalid UUID/limit=51; expect `BAD_REQUEST` with `reason=invalid_input` and no private canary.
- **IT-149** (`task-required`): Every protected browser procedure in the TechSpec API table (parameterized per procedure) — database/runtime boundary raises an unknown exception containing a private canary; expect `INTERNAL_SERVER_ERROR` with `reason=internal_error` and no private canary.
- **IT-150** (`task-required`): `existing authoring mutations` (parameterized registered operations: tasks.start/send/retryGeneration/saveDraft/resolveRefinement/publish/reconcilePublication plus dictation/capture admission) — valid eligible owner requests with existing fixtures; expect unchanged serialized receipt/review output and no implicit next-stage run.
- **IT-151** (`task-required`): `existing authoring mutations` (parameterized registered operations: tasks.start/send/retryGeneration/saveDraft/resolveRefinement/publish/reconcilePublication plus dictation/capture admission) — non-admin U2 is otherwise an authorized original author; expect `FORBIDDEN` with `reason=admin_required` before mutation.
- **IT-152** (`task-required`): `existing downstream mutations` (parameterized registered operations: tasks.planning.start/retry/selectRoute/approve, taskSpec.start/adjust/answer/permission/cancel/retry/returnToReview/approve, taskFlow.savePlan/startAction/retryAction/cancelRun/answerQuestion/approvePackage) — valid eligible owner requests with existing fixtures; expect unchanged serialized receipt/review output and no implicit next-stage run.
- **IT-153** (`task-required`): `existing downstream mutations` (parameterized registered operations: tasks.planning.start/retry/selectRoute/approve, taskSpec.start/adjust/answer/permission/cancel/retry/returnToReview/approve, taskFlow.savePlan/startAction/retryAction/cancelRun/answerQuestion/approvePackage) — observer U2 has project/repository read access; expect `FORBIDDEN` with `reason=operator_required` before mutation.
- **IT-154** (`task-required`): Every downstream mutation listed above — claim is uncertain; expect `PRECONDITION_FAILED` with `reason=claim_unresolved` before accepting a new effect.
- **IT-155** (`task-required`): Every downstream mutation listed above — claimed issue is now closed; expect `PRECONDITION_FAILED` with `reason=issue_ineligible` before accepting a new effect.
- **IT-156** (`task-required`): Every downstream mutation listed above — claimed board item is now Done; expect `PRECONDITION_FAILED` with `reason=board_status_changed` before accepting a new effect.
- **IT-157** (`task-required`): Every downstream mutation listed above — issue body differs from pinned S1; expect `PRECONDITION_FAILED` with `reason=source_changed` before accepting a new effect.
- **IT-158** (`task-required`): `taskFlow.startAction` and `taskFlow.retryAction` (parameterized separately) on machine-local target — PREP1 expires at the current clock; expect `PRECONDITION_FAILED` with `reason=preparation_expired` and no native submission.
- **IT-159** (`task-required`): `taskFlow.startAction` and `taskFlow.retryAction` (parameterized separately) on machine-local target — checkout digest differs from PREP1; expect `PRECONDITION_FAILED` with `reason=preparation_changed` and no native submission.
- **IT-160** (`task-required`): `taskFlow.startAction` and `taskFlow.retryAction` (parameterized separately) on machine-local target — another run owns canonical checkout C1; expect `PRECONDITION_FAILED` with `reason=checkout_busy` and no native submission.
- **IT-161** (`task-required`): `taskFlow.startAction` and `taskFlow.retryAction` (parameterized separately) on machine-local target — required command cannot be resolved; expect `PRECONDITION_FAILED` with `reason=gate_policy_unresolved` and no native submission.
- **IT-162** (`task-required`): `taskFlow.startAction` and `taskFlow.retryAction` (parameterized separately) on machine-local target — M1 runtime OpenAPI pin differs; expect `PRECONDITION_FAILED` with `reason=runtime_incompatible` and no native submission.
- **IT-163** (`task-required`): `POST /api/local-connector/pairings` through the actual Next Route Handler/controller — send protocolVersion=1,label=Dev laptop,pollingSecret=PRIVATE1 with appropriate pairing secret or M1 credential; expect `201 {pairingId:PAIR1,code,confirmationUrl,expiresAt}`.
- **IT-164** (`task-required`): `POST /api/local-connector/pairings` — unknown input field; expect HTTP 400 with bounded JSON `reason=invalid_input`.
- **IT-165** (`task-required`): `POST /api/local-connector/pairings` — protocolVersion=99; expect HTTP 409 with bounded JSON `reason=protocol_incompatible`.
- **IT-166** (`task-required`): `POST /api/local-connector/pairings` — sixth pairing request within a minute; expect HTTP 429 with bounded JSON `reason=rate_limited`.
- **IT-167** (`task-required`): `POST /api/local-connector/pairings/exchange` through the actual Next Route Handler/controller — send pairingId=PAIR1,pollingSecret=PRIVATE1,requestKey=K1 with appropriate pairing secret or M1 credential; expect `201 {machineId:M1,token,expiry}`.
- **IT-168** (`task-required`): `POST /api/local-connector/pairings/exchange` — pollingSecret=WRONG; expect HTTP 401 with bounded JSON `reason=pairing_secret_invalid`.
- **IT-169** (`task-required`): `POST /api/local-connector/pairings/exchange` — expired PAIR1; expect HTTP 410 with bounded JSON `reason=pairing_expired`.
- **IT-170** (`task-required`): `POST /api/local-connector/pairings/exchange` — PAIR1 already consumed; expect HTTP 409 with bounded JSON `reason=pairing_consumed`.
- **IT-171** (`task-required`): `POST /api/local-connector/heartbeat` through the actual Next Route Handler/controller — send M1 capability report, catalogRevision=2, requestKey=K1 with appropriate pairing secret or M1 credential; expect `200 {machineId:M1,status}`.
- **IT-172** (`task-required`): `POST /api/local-connector/heartbeat` — protocolVersion=99; expect HTTP 409 with bounded JSON `reason=protocol_incompatible`.
- **IT-173** (`task-required`): `POST /api/local-connector/heartbeat` — catalog revision conflicts; expect HTTP 409 with bounded JSON `reason=catalog_changed`.
- **IT-174** (`task-required`): `POST /api/local-connector/links` through the actual Next Route Handler/controller — send P1,checkoutHandle=CH1,checkoutKey=C1,repo=acme/flow,expectedRevision=2,requestKey=K1 with appropriate pairing secret or M1 credential; expect `200 {linkId:L1,revision:3}`.
- **IT-175** (`task-required`): `POST /api/local-connector/links` — P1 inaccessible; expect HTTP 404 with bounded JSON `reason=project_unavailable`.
- **IT-176** (`task-required`): `POST /api/local-connector/links` — repo resolves to R2; expect HTTP 412 with bounded JSON `reason=repository_mismatch`.
- **IT-177** (`task-required`): `POST /api/local-connector/links` — stored revision=3; expect HTTP 409 with bounded JSON `reason=link_changed`.
- **IT-178** (`task-required`): `POST /api/local-connector/links` — K1 payload differs; expect HTTP 409 with bounded JSON `reason=request_key_reused`.
- **IT-179** (`task-required`): `POST /api/local-connector/poll` through the actual Next Route Handler/controller — send protocolVersion=1,lastAcknowledgedCommand=CMD0 with appropriate pairing secret or M1 credential; expect `200 {commands:[CMD1]}`.
- **IT-180** (`task-required`): `POST /api/local-connector/poll` — protocolVersion=99; expect HTTP 409 with bounded JSON `reason=protocol_incompatible`.
- **IT-181** (`task-required`): `POST /api/local-connector/events` through the actual Next Route Handler/controller — send CMD1/N1,fence=3,sequence=1,kind=accepted with appropriate pairing secret or M1 credential; expect `200 {acknowledgedSequence:1}`.
- **IT-182** (`task-required`): `POST /api/local-connector/events` — CMD1 belongs to foreign M2; expect HTTP 404 with bounded JSON `reason=command_unavailable`.
- **IT-183** (`task-required`): `POST /api/local-connector/events` — fence=2; expect HTTP 409 with bounded JSON `reason=stale_fence`.
- **IT-184** (`task-required`): `POST /api/local-connector/events` — sequence=1 repeats different hash; expect HTTP 409 with bounded JSON `reason=event_conflict`.
- **IT-185** (`task-required`): `POST /api/local-connector/events` — sequence=3 before 2; expect HTTP 409 with bounded JSON `reason=event_gap`.
- **IT-186** (`task-required`): `POST /api/local-connector/events` — raw unknown binary payload; expect HTTP 412 with bounded JSON `reason=evidence_rejected`.
- **IT-187** (`task-required`): Every machine endpoint above (parameterized per route) — malformed JSON or unknown schema fields; expect HTTP 400 `reason=invalid_input` without the private raw input/exception.
- **IT-188** (`task-required`): Every machine endpoint above (parameterized per route) — 262145-byte JSON request; expect HTTP 413 `reason=payload_too_large` without the private raw input/exception.
- **IT-189** (`task-required`): Every machine endpoint above (parameterized per route) — endpoint-specific allowed request count exceeded; expect HTTP 429 `reason=rate_limited` without the private raw input/exception.
- **IT-190** (`task-required`): Every machine endpoint above (parameterized per route) — unknown internal exception containing ENV_CANARY_123; expect HTTP 500 `reason=internal_error` without the private raw input/exception.
- **IT-191** (`task-required`): POST heartbeat/links/poll/events (parameterized per route and missing/expired/revoked token fixture) — authenticate with an invalid machine credential; expect HTTP 401 reason=machine_unauthorized.
- **IT-192** (`task-required`): POST pairings/exchange for an unconfirmed valid PAIR1 — submit its private polling secret; expect HTTP 202 state=pending with no machine credential.
- **IT-193** (`task-required`): POST poll for owned M1 with no queued commands — expect HTTP 200 commands=[]; no run is created.
- **IT-194** (`task-required`): Public `localConnector.ts pair` CLI subprocess — input --server https://flow.test with isolated state/temp Git root; expect public code then paired machine ID after authenticated browser confirmation.
- **IT-195** (`task-required`): Public `localConnector.ts pair` — --server http://public.invalid; expect safe status `reason=invalid_server` without hosted path/credential disclosure.
- **IT-196** (`task-required`): Public `localConnector.ts pair` — confirmation after ten minutes; expect safe status `reason=pairing_expired` without hosted path/credential disclosure.
- **IT-197** (`task-required`): Public `localConnector.ts pair` — unconfirmed exchange; expect safe status `reason=pairing_pending` without hosted path/credential disclosure.
- **IT-198** (`task-required`): Public `localConnector.ts pair` — already exchanged code; expect safe status `reason=pairing_consumed` without hosted path/credential disclosure.
- **IT-199** (`task-required`): Public `localConnector.ts pair` — server connection refused; expect safe status `reason=connector_unavailable` without hosted path/credential disclosure.
- **IT-200** (`task-required`): Public `localConnector.ts link` CLI subprocess — input --project P1 --path TEMP_ROOT --expected-revision 2 with isolated state/temp Git root; expect linkId=L1/revision=3 for matching root.
- **IT-201** (`task-required`): Public `localConnector.ts link` — blank/nonexistent path; expect safe status `reason=path_invalid` without hosted path/credential disclosure.
- **IT-202** (`task-required`): Public `localConnector.ts link` — 4097-byte path; expect safe status `reason=path_limit` without hosted path/credential disclosure.
- **IT-203** (`task-required`): Public `localConnector.ts link` — realpath outside approved roots; expect safe status `reason=path_not_allowed` without hosted path/credential disclosure.
- **IT-204** (`task-required`): Public `localConnector.ts link` — non-Git directory; expect safe status `reason=not_git_root` without hosted path/credential disclosure.
- **IT-205** (`task-required`): Public `localConnector.ts link` — wrong repository origin; expect safe status `reason=repository_mismatch` without hosted path/credential disclosure.
- **IT-206** (`task-required`): Public `localConnector.ts link` — stale expected-revision=1; expect safe status `reason=link_changed` without hosted path/credential disclosure.
- **IT-207** (`task-required`): Public `localConnector.ts link` — revoked M1; expect safe status `reason=machine_revoked` without hosted path/credential disclosure.
- **IT-208** (`task-required`): Public `localConnector.ts run` CLI subprocess — input paired local registry with isolated state/temp Git root; expect accepted command processing with authenticated heartbeat.
- **IT-209** (`task-required`): Public `localConnector.ts run` — no pairing credential; expect safe status `reason=not_paired` without hosted path/credential disclosure.
- **IT-210** (`task-required`): Public `localConnector.ts run` — revoked credential; expect safe status `reason=machine_revoked` without hosted path/credential disclosure.
- **IT-211** (`task-required`): Public `localConnector.ts run` — server version 99; expect safe status `reason=protocol_incompatible` without hosted path/credential disclosure.
- **IT-212** (`task-required`): Public `localConnector.ts run` — incompatible native capability; expect safe status `reason=runtime_incompatible` without hosted path/credential disclosure.
- **IT-213** (`task-required`): Public `localConnector.ts run` — HTTPS service offline; expect safe status `reason=connector_unavailable` without hosted path/credential disclosure.
- **IT-214** (`task-required`): Public `localConnector.ts status` CLI subprocess — input paired local registry; --run N1 --details for an accepted owned run with isolated state/temp Git root; expect own safe readiness codes and private path displayed locally only with bounded retained evidence.
- **IT-215** (`task-required`): Public `localConnector.ts status` — no pairing credential; expect safe status `reason=not_paired` without hosted path/credential disclosure.
- **IT-216** (`task-required`): Public `localConnector.ts status` — broken referenced instructions; expect safe status `reason=instructions_invalid` without hosted path/credential disclosure.
- **IT-217** (`task-required`): Public `localConnector.ts status` — incompatible native capability; expect safe status `reason=runtime_incompatible` without hosted path/credential disclosure.
- **IT-218** (`task-required`): Public `localConnector.ts status` — local journal has no N1; expect safe status `reason=run_unavailable` without hosted path/credential disclosure.
- **IT-219** (`task-required`): Public `localConnector.ts unpair` CLI subprocess — input paired M1 with isolated state/temp Git root; expect local token invalidated with acknowledged hosted revocation.
- **IT-220** (`task-required`): Public `localConnector.ts unpair` — HTTPS connection refused; pending remote revocation explicitly shown; expect safe status `reason=connector_unavailable` without hosted path/credential disclosure.
- **IT-221** (`task-required`): `LocalCommand prepare` through real queue/journal/handler wiring — valid PREP1 descriptor targets owned L1/revision=2; expect prepared event with pinned manifest/checkpoint digests.
- **IT-222** (`task-required`): `LocalCommand start` through real queue/journal/handler wiring — valid N1 snapshot matches source/target/preparation; expect accepted acknowledgment with original runtime identity.
- **IT-223** (`task-required`): `LocalCommand inspect` through real queue/journal/handler wiring — N1 already has durable runtime IDs; expect same current run state with no new submission.
- **IT-224** (`task-required`): `LocalCommand cancel` through real queue/journal/handler wiring — N1 is active and runtime acknowledges stop; expect terminal canceled event.
- **IT-225** (`task-required`): `LocalCommand answer` through real queue/journal/handler wiring — current interaction Q1 belongs to N1; expect accepted current-answer acknowledgment.
- **IT-226** (`task-required`): `LocalEvent accepted` through real queue/journal/handler wiring — CMD1/fence=3/sequence=1 is fresh; expect stored acknowledgment.
- **IT-227** (`task-required`): `LocalEvent prepared` through real queue/journal/handler wiring — PREP1 source/target match; expect ready preparation descriptor.
- **IT-228** (`task-required`): `LocalEvent activity` through real queue/journal/handler wiring — safe bounded relative-file activity arrives; expect one scoped activity entry.
- **IT-229** (`task-required`): `LocalEvent gate` through real queue/journal/handler wiring — G1 current attempt reports passed with valid executed reporter; expect one gate ledger record.
- **IT-230** (`task-required`): `LocalEvent terminal` through real queue/journal/handler wiring — runtime success has valid current gates/artifacts; expect one settled run result.

## End-to-End Tests

### Full user journeys and release qualification

- **E2E-001** (`feature-gate`): Administrator U1 opens Create issue → submits "Implement CSV export" → edits draft → approves explicit publication → sees GitHub #41 with a work-area link → reopens the saved authoring history with draft/sources/publication retained; no planning/execution controls occupy the authoring chat.
- **E2E-002** (`feature-gate`): Non-admin U2 signs in → selects P1 → enters assigned work → opens an authorized old authoring URL → sees history without new/edit/publish controls.
- **E2E-003** (`feature-gate`): U1 opens assigned work → selects P1 → browses all Ready pages → finds externally created I1 with title/repository/number/assignees/status; a second inaccessible project never appears.
- **E2E-004** (`feature-gate`): Two eligible U1/U2 browser contexts open I1 → claim concurrently → one sees a completed operator assignment after In Progress read-back; the other opens the same T1 as an observer.
- **E2E-005** (`feature-gate`): U1 claims I1 → leaves the Ready queue → refreshes Active work → follows direct work/T1 URL → resumes the same saved stage.
- **E2E-006** (`feature-gate`): U1 opens imported T1 → explicitly starts assessment → inspects recommendation/reasons/uncertainties → saves tech_spec override → approves the exact route → sees the next action awaiting explicit start.
- **E2E-007** (`feature-gate`): U1 starts the selected spec action → answers its question → reviews separate documents → requests an adjustment → approves the exact current package → explicitly starts tasks → reviews/approves tasks → explicitly starts a compatible implementation loop.
- **E2E-008** (`feature-gate`): U2 opens U1-owned work/T1 → inspects source/current decision/safe activity/artifacts → sees no route, question-answer, start/cancel/retry or package-approval control.
- **E2E-009** (`qa-release`): U1 opens local-project settings → confirms the companion pairing code → links repository R1 through the CLI → sees own opaque checkout/readiness → changes link → past N1 still names the original accepted link revision.
- **E2E-010** (`qa-release`): U1 prepares a local action → reviews project/checkout/action/required gates → explicitly starts → companion executes against dirty checkout C1 with local env/service access → run-attributed changes appear locally → the next workflow stage still awaits explicit approval/start.
- **E2E-011** (`qa-release`): U1 starts an action whose rules require Playwright → companion runs the declared tests against the local test service → hosted view shows current required gate outcome. Parameterize independent passing (2 executed tests), assertion-failure (1 failure), missing-browser (blocked/browser_missing) and unrun fixtures; only the passing fixture can show successful gated completion.
- **E2E-012** (`qa-release`): U1 runs an action → machine disconnects → work detail shows reconciling → reconnect resolves the original run → restored readiness does not auto-start a retry → U1 explicitly retries after a proven terminal state.
- **E2E-013** (`qa-release`): Host admin opens diagnostics → identifies an offline user-machine capability separately from GitHub/project configuration → sees safe recovery hints → refreshes after reconnect → no local path/credential appears or blocked run auto-starts.
- **E2E-014** (`qa-release`): Dedicated GitHub sandbox: U1 OAuth reads assigned Ready pages → claims board item → GitHub UI confirms In Progress → Flow Dev repeats claim without creating a second issue/work item.
- **E2E-015** (`qa-release`): Hosted Flow Dev with two physically distinct developer machines: pair M1/U1 and M2/U2 → link the same repository locally → each user sees only their own local choice/credentials.
- **E2E-016** (`qa-release`): Required Playwright setup journey: missing browser → blocked/browser_missing → install through normal authorized project setup → prepare again → explicitly start → see real executed gate evidence.
- **E2E-017** (`qa-release`): Keyboard and 375px viewport journey: sign in → navigate Ready/active work → claim → inspect source/decision/documents → prepare/start → read gate failure via visible text and accessible focus/status announcements.
- **E2E-018** (`qa-release`): Local credential dogfooding: native provider login remains on M1 → run chosen local model → inspect hosted request/storage and confirm no credential homes, refresh tokens or private paths transferred.
- **E2E-019** (`qa-release`): Offline terminal journal journey: local action finishes while HTTPS is unavailable → restart companion → reconnect → upload original safe final evidence → no replacement run starts.

## Execution and Dependencies

Task-required cases use fake external transports and local temporary fixtures; no live provider credentials are needed. Native Compozy/Playwright contract cases use a pinned local test runtime and development service. Feature gates require completed source/operator/companion/UI wiring and run affected suites plus `pnpm lint`, `pnpm typecheck`, `pnpm build`. QA release uses sandbox GitHub OAuth accounts, a board with Ready/In Progress, two developer machines, local provider login and the project-declared browsers/services.

No input catalog is missing. All 13 stories and their AC/EC entries are accounted for. The ownership-transfer policy is deliberately parked by the PRD; denial of silent transfer is covered by WorkAuthorization/claim reservation cases. Browser matrix expansion is a later release harness concern, not an unverified claim that Firefox/WebKit already run.
