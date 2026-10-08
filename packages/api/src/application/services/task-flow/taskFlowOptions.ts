import type { ConnectionRecord, SoftwareDao } from "../../database/dao/softwareDao";
import type { TaskFlowDao } from "../../database/dao/taskFlowDao";
import type { CompozyControlGateway, LoopDefinition, WorktreeInfo } from "../../software/compozyControlGateway";
import { blockedLayer, type ExecutionTarget } from "./readinessGate";
import type { ControlWorkspaceResolver } from "./controlWorkspace";
import { localLoopCatalog, NO_LOOPS, toLoopOption, type LoopOption } from "./loopOptions";
import type { LocalProjectAccess } from "./localProjectAccess";
import type { FreshReadiness, TaskFlowGate, TaskScope } from "./taskFlowPorts";

const PAGE_SIZE = 50;
const NO_READY_CONNECTION = "no_ready_connection";
const WORKSPACE_UNREGISTERED = "workspace_unregistered";
const LOCAL_WORKSPACE = "local";

export type OptionsDependencies = { flow: TaskFlowDao; software: SoftwareDao; gateway: CompozyControlGateway; readiness: FreshReadiness; gate: TaskFlowGate; resolver?: ControlWorkspaceResolver; localProjects?: LocalProjectAccess };

async function allConnections(software: SoftwareDao, actorId: string) {
  const items: ConnectionRecord[] = [];
  let cursor: string | undefined;
  do {
    const page = await software.connections.list({ cursor, limit: PAGE_SIZE, visibleToOwnerId: actorId });
    items.push(...page.items);
    cursor = page.nextCursor ?? undefined;
  } while (cursor);
  return items.filter((connection) => !connection.disabledAt && connection.authState === "connected" && ((connection.executionTarget ?? "host") === "host" || (connection.executionTarget === "machine" && connection.ownerUserId === actorId)));
}

type WorktreeOption = { id: string; name: string; state: string; selectable: boolean; reason: string | null };
type ConnectionChoice = { id: string; label: string; providerKind: ConnectionRecord["providerKind"]; executionTarget: "host" | "machine"; machineId: string | null; ready: boolean; reason: string | null; models: Array<{ modelId: string; displayName: string; selectable: boolean; unselectableReason: string | null; reasoningChoices: (string | null)[] }> };

function toWorktreeOption(item: WorktreeInfo, workspaceId: string): WorktreeOption {
  const reason = item.state !== "ready" ? item.state : item.workspaceId !== workspaceId ? "foreign_repository" : item.dirty ? "dirty" : null;
  return { id: item.id, name: item.name, state: item.state, selectable: reason === null, reason };
}

function startBlock(choices: ConnectionChoice[], target: ExecutionTarget, blocked: string | null) {
  const candidates = target === "machine" ? choices.filter((choice) => choice.executionTarget === "machine") : choices;
  if (!candidates.some((choice) => choice.ready)) return NO_READY_CONNECTION;
  return blocked ? `${blocked}_not_ready` : null;
}

export class TaskFlowOptions {
  constructor(private readonly deps: OptionsDependencies) {}

  async options(scope: TaskScope) {
    const [eligibility, flow, projection, availableConnections, localProject] = await Promise.all([this.deps.gate.eligibility(scope), this.deps.flow.flowKind(scope.taskId), this.deps.readiness.fresh(), allConnections(this.deps.software, scope.actorId), this.deps.localProjects?.inspect(scope)]);
    const connections = availableConnections.filter((connection) => connection.executionTarget !== "machine" || connection.machineId === localProject?.target.machineId);
    const choices = await Promise.all(connections.map((connection) => this.connectionChoices(connection)));
    const planningReason = flow === "legacy" ? "legacy_flow_active" : eligibility.reason;
    const startReasonFor = (target: ExecutionTarget) => planningReason ?? startBlock(choices, target, blockedLayer(projection, target));
    const startReason = startReasonFor("host");
    const plan = await this.deps.flow.plans.find(scope.taskId);
    const localCatalog = plan?.actions.at(-1)?.workspace.kind === LOCAL_WORKSPACE ? { loops: localProject ? localProject.loops ?? [] : null } : null;
    return {
      taskId: scope.taskId, flow, planningAvailable: planningReason === null, planningReason, startReason, localStartReason: startReasonFor("machine"),
      actions: [{ kind: "create_spec", available: planningReason === null }, { kind: "create_tasks", available: planningReason === null && (await this.deps.gate.approvedSpec(scope.taskId)) }],
      connections: choices, workspaces: [{ kind: "isolated" as const }, ...(localProject ? [{ kind: "local" as const }] : [])], ...(await this.catalog(scope, localCatalog)),
    };
  }

  private async catalog(scope: TaskScope, local: { loops: LoopDefinition[] | null } | null) {
    const empty = { worktrees: [] as WorktreeOption[], loops: [] as LoopOption[], managedWorktreesAvailable: false, loopsReason: null as string | null };
    if (local) return { ...empty, ...localLoopCatalog(local.loops) };
    const context = await this.deps.resolver?.resolve({ taskId: scope.taskId, projectId: scope.projectId });
    if (!context) return { ...empty, loopsReason: WORKSPACE_UNREGISTERED };
    const [worktrees, loops] = await Promise.all([this.deps.gateway.listWorktrees(context.workspaceId), this.deps.gateway.listLoops(context.workspaceId)]);
    return {
      worktrees: worktrees.ok ? worktrees.value.map((item) => toWorktreeOption(item, context.workspaceId)) : empty.worktrees,
      loops: loops.ok ? loops.value.map(toLoopOption) : empty.loops,
      managedWorktreesAvailable: worktrees.ok,
      loopsReason: loops.ok ? (loops.value.length ? null : NO_LOOPS) : loops.code,
    };
  }

  private async connectionChoices(connection: ConnectionRecord): Promise<ConnectionChoice> {
    if (connection.executionTarget === "machine") {
      const models = connection.modelCatalog ?? [];
      const ready = models.some((model) => model.selectable);
      return { id: connection.id, label: connection.label, providerKind: connection.providerKind, executionTarget: "machine", machineId: connection.machineId ?? null, ready, reason: ready ? null : "catalog_stale", models };
    }
    const listed = await this.deps.gateway.listModels(connection.runtimeProviderId);
    const models = listed.ok ? listed.value : [];
    const reason = listed.ok ? null : listed.code;
    const ready = models.some((model) => model.selectable);
    return { id: connection.id, label: connection.label, providerKind: connection.providerKind, executionTarget: connection.executionTarget ?? "host", machineId: connection.machineId ?? null, ready, reason: ready ? null : reason ?? "catalog_stale", models: models.map((model) => ({ modelId: model.modelId, displayName: model.displayName, selectable: model.selectable, unselectableReason: model.unselectableReason, reasoningChoices: model.reasoningChoices })) };
  }
}
