export type FlowActionKind = "create_spec" | "create_tasks" | "loop";
export type LocalWorkspaceTarget = { machineId: string; linkId: string; linkRevision: number; checkoutHandle: string };
export type FlowWorkspace = { kind: "isolated" } | { kind: "local"; target?: LocalWorkspaceTarget } | { kind: "existing"; worktreeId: string } | { kind: "new"; name: string };
export type FlowKind = "unified" | "legacy" | "none";
export type FlowPlanStatus = "planned" | "running" | "completed" | "canceled";

export type RuntimeBindingRecord = {
  role: string;
  connectionId: string;
  providerId: string;
  modelId: string;
  reasoningEffort: string | null;
};

export type PlannedAction = {
  position: number;
  kind: FlowActionKind;
  loopName: string | null;
  loopVersion: string | null;
  inputs: Record<string, unknown>;
  workspace: FlowWorkspace;
  bindings: RuntimeBindingRecord[];
};

export type ActionRecord = PlannedAction & { id: string; state: string };
export type ActionRelocation = { planId: string; actionId: string; revision: number; workspace: FlowWorkspace; bindings: RuntimeBindingRecord[] };

export type PlanRecord = {
  id: string;
  taskId: string;
  kind: "os_unified";
  revision: number;
  status: FlowPlanStatus;
  createdBy: string;
  updatedAt: Date;
  actions: ActionRecord[];
};

export type RunRuntime = { workspaceId: string | null; sessionId: string | null; turnId: string | null; runId: string | null };

export type RunActivity = {
  sequence: number;
  kind: "agent_message" | "tool_call" | "tool_result" | "interaction" | "lifecycle" | "warning";
  at: string;
  preview: string;
  tool: string | null;
  source: string | null;
  status: string | null;
};

export type RunRecord = {
  id: string;
  actionId: string;
  taskId: string;
  attemptNumber: number;
  state: string;
  snapshot: Record<string, unknown>;
  worktreeId: string | null;
  connectionIds: string[];
  isWrite: boolean;
  leaseFence: number;
  idempotencyKey: string;
  terminalCode: string | null;
  runtime: RunRuntime;
  runtimeEventSequence?: number;
  activity?: RunActivity | null;
  leaseOwner: string | null;
  requestedBy: string;
  createdAt: Date;
  finishedAt: Date | null;
};

export type NewRun = {
  actionId: string;
  taskId: string;
  snapshot: Record<string, unknown>;
  worktreeId: string | null;
  connectionIds: string[];
  isWrite: boolean;
  idempotencyKey: string;
  requestedBy: string;
};

export type PlanSaveReceipt = { requestHash: string; resultRevision: number };
export type FlowPage<T> = { items: T[]; nextCursor: string | null };
