import { LegacyProjection } from "../application/services/task-flow/legacyProjection";
import { LoopAdmissionService } from "../application/services/task-flow/loopAdmissionService";
import { RuntimeWorkspaceAdmission } from "../application/services/task-flow/runtimeWorkspaceAdmission";
import { SpecEligibilityGate } from "../application/services/task-flow/specEligibilityGate";
import { TaskFlowService } from "../application/services/task-flow/taskFlowService";
import { UnifiedPackageGate } from "../application/services/task-flow/unifiedPackageGate";
import { TaskFlowController } from "../controllers/taskFlowController";
import { requireDatabase } from "./database/client";
import { DrizzleSoftwareDao } from "./database/dao/software/drizzleSoftwareDao";
import { DrizzleTaskSpecDao } from "./database/dao/spec/drizzleTaskSpecDao";
import { DrizzleFlowUnitOfWork } from "./database/dao/tasks/drizzleFlowUnitOfWork";
import { DrizzleLegacyFlowReader } from "./database/dao/tasks/drizzleLegacyFlowReader";
import { createWorkAuthorization } from "./assignedIssuesComposition";
import { DrizzleTaskFlowDao } from "./database/dao/tasks/drizzleTaskFlowDao";
import { LoopRunExecutor } from "./spec/compozy/loopRunExecutor";
import { RegisteredWorkspaceResolver } from "./spec/controlWorkspaceResolver";
import { RunCanceller } from "./spec/runCanceller";
import { CompozyRuntimeGateway } from "./spec/compozy/compozyRuntimeGateway";
import { DrizzleLocalConnectorDao } from "./database/dao/local-execution/drizzleLocalConnectorDao";
import { DrizzleLocalExecutionEvidenceDao } from "./database/dao/local-execution/drizzleLocalExecutionEvidenceDao";
import { PairedLocalProjectAccess } from "./pairedLocalProjectAccess";
import { LocalActionExecutor } from "./local-execution/localActionExecutor";
import { LocalRunQuestions } from "./local-execution/localRunQuestions";
import { PodmanRunLauncher } from "./spec/podmanRunLauncher";
import { createRepositoryAccessService } from "./repositoryAccessFactory";
import { createSoftwareRuntime } from "./softwareComposition";

const CONTROL_LEASE_MS = 60_000;

export function createProductionTaskFlowController(environment: NodeJS.ProcessEnv = process.env) {
  const database = requireDatabase();
  const runtime = createSoftwareRuntime(environment);
  const flow = new DrizzleTaskFlowDao(database);
  const repositories = createRepositoryAccessService(database);
  const localDao = new DrizzleLocalConnectorDao(database);
  const localProjects = new PairedLocalProjectAccess({ flow, local: localDao, repositories });
  const resolver = new RegisteredWorkspaceResolver({ flow, repositories, gateway: runtime.gateway, workspaceRoot: environment.SPEC_WORKSPACE_ROOT?.trim() ?? "" });
  const projectOf = async (taskId: string) => (await flow.taskContext(taskId))?.projectId ?? null;
  const loopExecutor = new LoopRunExecutor({ gateway: runtime.gateway, workspaceOf: async (request) => resolver.resolve({ taskId: request.run.taskId, projectId: (await projectOf(request.run.taskId)) ?? "", worktreeId: request.run.worktreeId }) });
  const fallbackCanceller = new RunCanceller(loopExecutor, new PodmanRunLauncher({ runtimeRoot: `${environment.SPEC_WORKSPACE_ROOT?.trim() ?? ""}/.runtime`, runtimeImage: "", docsProxyUrl: "" }, { prepare: async () => { throw new Error("workspace_provider_unavailable"); } }));
  const localExecution = new LocalActionExecutor({ local: localDao, flow, fallback: fallbackCanceller });
  const service = new TaskFlowService({
    unit: new DrizzleFlowUnitOfWork(database),
    flow,
    software: new DrizzleSoftwareDao(database),
    gateway: runtime.gateway,
    readiness: runtime.readiness,
    gate: new UnifiedPackageGate(new SpecEligibilityGate(new DrizzleTaskSpecDao(database)), flow),
    legacy: new LegacyProjection(new DrizzleLegacyFlowReader(database)),
    interactions: { gateway: new CompozyRuntimeGateway(), socketPathFor: (runId) => `${environment.SPEC_WORKSPACE_ROOT?.trim() ?? ""}/.runtime/runs/${runId}/daemon.sock`, local: new LocalRunQuestions({ local: localDao, flow }) },
    localProjects,
    localEvidence: new DrizzleLocalExecutionEvidenceDao(database),
    resolver,
    workspaces: new RuntimeWorkspaceAdmission({ flow, gateway: runtime.gateway, resolver, localProjects }),
    loops: new LoopAdmissionService({ gateway: runtime.gateway, resolver, projectOf, localProjects }),
    control: { executor: localExecution, releaseGrant: runtime.broker.releaseGrant.bind(runtime.broker), owner: "taskflow-api", clock: () => new Date(), leaseMs: CONTROL_LEASE_MS },
  });
  return new TaskFlowController(createWorkAuthorization(database), service);
}
