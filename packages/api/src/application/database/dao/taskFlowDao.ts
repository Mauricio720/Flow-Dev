import type { PackageStore } from "./unifiedPackageDao";
import type { TaskScope } from "../../services/task-flow/taskFlowPorts";
import type { ActionRelocation, FlowKind, FlowPage, FlowPlanStatus, NewRun, PlanRecord, PlanSaveReceipt, PlannedAction, RunActivity, RunRecord, RunRuntime } from "./taskFlowTypes";

export type * from "./taskFlowTypes";

export interface PlanStore {
  find(taskId: string): Promise<PlanRecord | null>;
  lock(taskId: string): Promise<PlanRecord | null>;
  insert(input: { taskId: string; actorId: string; revision: number }): Promise<PlanRecord>;
  setActionState(actionId: string, state: string): Promise<void>;
  setStatus(planId: string, status: FlowPlanStatus): Promise<void>;
  replacePlanned(input: { planId: string; revision: number; actions: PlannedAction[] }): Promise<PlanRecord>;
  relocateAction(input: ActionRelocation): Promise<void>;
  findSave(taskId: string, idempotencyKey: string): Promise<PlanSaveReceipt | null>;
  recordSave(input: { taskId: string; idempotencyKey: string } & PlanSaveReceipt): Promise<void>;
}

export interface RunStore {
  insert(input: NewRun): Promise<RunRecord>;
  find(runId: string): Promise<RunRecord | null>;
  findByKey(taskId: string, idempotencyKey: string): Promise<RunRecord | null>;
  list(input: { taskId: string; cursor?: string; limit: number }): Promise<FlowPage<RunRecord>>;
  activeWrite(taskId: string): Promise<RunRecord | null>;
  countActiveTotal(): Promise<number>;
  lockAdmission(): Promise<void>;
  countActiveForConnection(connectionId: string): Promise<number>;
  countActiveWriteOnWorktree(worktreeId: string, excludingTaskId: string): Promise<number>;
  requestStop(runId: string): Promise<RunRecord | null>;
  takeover(input: { runId: string; owner: string; now: Date; leaseMs: number }): Promise<RunRecord | null>;
  claimNext(input: { owner: string; now: Date; leaseMs: number }): Promise<RunRecord | null>;
  bindRuntime(input: { runId: string; fence: number; runtime: Partial<RunRuntime> }): Promise<boolean>;
  advance(input: { runId: string; fence: number; state: string; leaseMs: number; now: Date }): Promise<boolean>;
  settle(input: { runId: string; fence: number; state: string; terminalCode: string | null; now: Date; activity?: RunActivity }): Promise<boolean>;
  recordActivity?(input: { runId: string; fence: number; runtimeEventSequence: number; activity: RunActivity | null; now: Date }): Promise<boolean>;
}

export interface TaskFlowDao {
  plans: PlanStore;
  runs: RunStore;
  packages: PackageStore;
  flowKind(taskId: string): Promise<FlowKind>;
  lockTask(taskId: string): Promise<void>;
  assertWorkScope?(scope: TaskScope): Promise<void>;
  taskContext(taskId: string): Promise<{ projectId: string; operatorUserId: string | null; source?: { issueNumber: number; title: string; bodyMarkdown: string } | null } | null>;
  transaction<T>(callback: (dao: TaskFlowDao) => Promise<T>): Promise<T>;
}
