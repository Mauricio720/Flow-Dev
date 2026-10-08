import { operatorAuthorization } from "./operator-support";
import type { ActionExecutor, ExecutionRequest, ExecutionResult, ReconcileResult } from "../src/application/services/task-flow/actionExecutor";
import type { PackageCapture } from "../src/application/services/task-flow/packageCapture";
import { LoopAdmissionService } from "../src/application/services/task-flow/loopAdmissionService";
import { RuntimeWorkspaceAdmission } from "../src/application/services/task-flow/runtimeWorkspaceAdmission";
import { LoopRunExecutor } from "../src/infra/spec/compozy/loopRunExecutor";
import { RunCanceller } from "../src/infra/spec/runCanceller";
import { TaskFlowDispatcher } from "../src/application/services/task-flow/taskFlowDispatcher";
import { LegacyProjection } from "../src/application/services/task-flow/legacyProjection";
import { SpecEligibilityGate } from "../src/application/services/task-flow/specEligibilityGate";
import { TaskFlowService } from "../src/application/services/task-flow/taskFlowService";
import type { TaskFlowGate } from "../src/application/services/task-flow/taskFlowPorts";
import type { LocalProjectInfo } from "../src/application/services/task-flow/localProjectAccess";
import { projectReadiness } from "../src/application/software/readinessProjection";
import type { LayerInput } from "../src/application/software/readiness";
import { TaskFlowController } from "../src/controllers/taskFlowController";
import { DrizzleSoftwareDao } from "../src/infra/database/dao/software/drizzleSoftwareDao";
import { DrizzleTaskSpecDao } from "../src/infra/database/dao/spec/drizzleTaskSpecDao";
import { DrizzleFlowUnitOfWork } from "../src/infra/database/dao/tasks/drizzleFlowUnitOfWork";
import { DrizzleLegacyFlowReader } from "../src/infra/database/dao/tasks/drizzleLegacyFlowReader";
import { DrizzleTaskFlowDao } from "../src/infra/database/dao/tasks/drizzleTaskFlowDao";
import { createTaskFlowRouter } from "../src/routers/taskFlow";
import { FakeBroker, FakeGateway } from "./software-support";
import { fixtureConnection } from "./task-flow-support";
import { specTask } from "./spec-support";

type Setup = Awaited<ReturnType<typeof specTask>>;
const READY: LayerInput = { state: "ready" };
export const LEASE_MS = 30_000;

export async function flowFixture(options: { runtimeControl?: boolean; localProject?: LocalProjectInfo | null; localPrepare?: (input: Record<string, unknown>) => Promise<{ preparationId: string }> } = {}) {
  const setup = await specTask();
  await setup.authorize(setup.readerId);
  const gateway = new FakeGateway();
  const layers: Record<string, LayerInput> = { application: READY, account: READY, runtime: READY, host: READY };
  const approvals = { spec: false, tasks: false };
  const readiness = { fresh: async () => { const now = new Date(); return projectReadiness({ application: layers.application, account: layers.account, runtime: layers.runtime, host: layers.host, checkedAt: now, now }); } };
  const base = new SpecEligibilityGate(new DrizzleTaskSpecDao(setup.database));
  const gate: TaskFlowGate = { eligibility: (scope) => base.eligibility(scope), approvedSpec: async () => approvals.spec, approvedTasks: async () => approvals.tasks };
  const flow = new DrizzleTaskFlowDao(setup.database);
  const software = new DrizzleSoftwareDao(setup.database);
  const resolver = { resolve: async () => ({ workspaceId: "ws-1", repositoryId: "202" }) };
  const loopExecutor = new LoopRunExecutor({ gateway, workspaceOf: async (request) => ({ workspaceId: "ws-1", repositoryId: "202", ...(request.run.worktreeId ? { worktreePath: "/repo/worktree" } : {}) }) });
  const control = { executor: new RunCanceller(loopExecutor, { stop: async () => undefined }), releaseGrant: async () => undefined, owner: "api", clock: () => new Date(), leaseMs: LEASE_MS };
  const runtime = options.runtimeControl ? { resolver, workspaces: new RuntimeWorkspaceAdmission({ flow, gateway, resolver }), loops: new LoopAdmissionService({ gateway, resolver, projectOf: async () => setup.project.id }), control } : { control };
  const localProjects = options.localProject === undefined ? undefined : { inspect: async () => options.localProject ?? null, resolveTarget: async () => options.localProject ?? null, prepare: options.localPrepare ?? (async () => ({ preparationId: "unused" })) } as never;
  const service = new TaskFlowService({ unit: new DrizzleFlowUnitOfWork(setup.database), flow, software, gateway, readiness, gate, legacy: new LegacyProjection(new DrizzleLegacyFlowReader(setup.database)), localProjects, ...runtime });
  const router = createTaskFlowRouter(new TaskFlowController(operatorAuthorization(setup.database, setup.repositoryAccess, setup.world), service));
  const as = (userId: string | null) => router.createCaller({ principal: userId ? { userId, sessionId: setup.sessionId } : null, requestId: "task-flow" });
  const connection = () => fixtureConnection(setup.database, `Codex ${crypto.randomUUID().slice(0, 4)}`);
  return { setup, gateway, layers, approvals, flow, software, service, loopExecutor, author: as(setup.ownerId), reader: as(setup.readerId), anonymous: as(null), as, connection, scope: { projectId: setup.project.id, taskId: setup.taskId } };
}

export type FlowFixture = Awaited<ReturnType<typeof flowFixture>>;

export function skillAction(connectionId: string, overrides: Record<string, unknown> = {}) {
  return { kind: "create_spec" as const, runtime: { connectionId, providerId: "codex" as const, modelId: "gpt-5.6-sol", reasoningEffort: "high" as string | null, ...overrides }, workspace: { kind: "isolated" as const } };
}

export const flowKey = () => crypto.randomUUID();
export type { Setup };



export class ScriptedExecutor implements ActionExecutor {
  requests: ExecutionRequest[] = [];
  execution: ExecutionResult = { kind: "submitted", runtime: { workspaceId: "w1", sessionId: "s1", turnId: "t1" } };
  reconciliation: ReconcileResult = { state: "succeeded", code: null };
  async execute(request: ExecutionRequest) { this.requests.push(request); return this.execution; }
  async reconcile(request: ExecutionRequest) { this.requests.push(request); return this.reconciliation; }
}

export function dispatcherFor(fixture: FlowFixture, executor: ScriptedExecutor, clock: () => Date, owner = "worker-1", capture?: Pick<PackageCapture, "capture">) {
  return new TaskFlowDispatcher({ unit: new DrizzleFlowUnitOfWork(fixture.setup.database), broker: new FakeBroker(), executor, owner, clock, leaseMs: LEASE_MS, capture });
}
