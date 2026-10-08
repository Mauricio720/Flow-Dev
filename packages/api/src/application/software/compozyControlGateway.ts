import type { ControlErrorCode, ControlResult } from "./controlErrors";

export type AvailabilityState =
  | "available_live"
  | "available_stale"
  | "unavailable_live"
  | "unavailable_stale"
  | "unknown";

export type ProviderModel = {
  providerId: string;
  modelId: string;
  displayName: string;
  selectable: boolean;
  unselectableReason: ControlErrorCode | null;
  reasoningChoices: (string | null)[];
};

export type ProviderProbe = { providerId: string; authenticated: boolean };

export type ModelChoiceCheck = { modelId: string; reasoningEffort: string | null };

export type RuntimeIdentity = { release: string };
export type ProviderOverlayInput = { providerId: string; providerKind: "codex" | "claude"; label: string; homePath: string };

export type WorktreeInfo = { id: string; name: string; state: string; workspaceId: string; path: string | null; dirty: boolean; branch: string | null };
export type CreateWorktreeInput = { workspaceId: string; name: string; requestId: string };

export type LoopInputDefault = string | number | boolean | null;
export type LoopInputDeclaration = { name: string; kind: string; required: boolean; hasDefault: boolean; enumValues: string[] | null; defaultValue?: LoopInputDefault };
export type LoopDefinition = {
  name: string;
  version: string;
  source: string;
  enabled: boolean;
  description: string;
  inputs: LoopInputDeclaration[];
  runtimeRoles: string[];
  runtimeLocked: boolean;
  requires: string[];
};
// A Loop that declares no runtime input takes its model from the run's default worker runtime.
export const DEFAULT_RUNTIME_ROLE = "worker";
export type StartLoopInput = { workspaceId: string; name: string; version: string; inputs: Record<string, unknown>; requestId: string; worktreeId?: string | null; workerRuntime?: Record<string, unknown> | null };
export type ListLoopRunsInput = { workspaceId: string; name: string };
export type LoopRunRef = { workspaceId: string; name: string; runId: string };
export type LoopRunStatus = { runId: string; state: string; terminalReason: string | null; definitionVersion: number | null; createdAt: string; inputs: Record<string, unknown>; activity?: import("../database/dao/taskFlowTypes").RunActivity | null };

export interface CompozyControlGateway {
  registerWorkspace?(input: { rootDir: string; name: string }): Promise<ControlResult<string>>;
  checkRuntime(): Promise<ControlResult<RuntimeIdentity>>;
  probeProvider(providerId: string): Promise<ControlResult<ProviderProbe>>;
  provisionProviderOverlay(input: ProviderOverlayInput): Promise<ControlResult<void>>;
  revokeProviderOverlay(providerId: string): Promise<ControlResult<void>>;
  listModels(providerId: string): Promise<ControlResult<ProviderModel[]>>;
  validateChoice(providerId: string, choice: ModelChoiceCheck): Promise<ControlResult<ProviderModel>>;
  findWorkspace(rootDir: string): Promise<ControlResult<string | null>>;
  listWorktrees(workspaceId: string): Promise<ControlResult<WorktreeInfo[]>>;
  getWorktree(workspaceId: string, worktreeId: string): Promise<ControlResult<WorktreeInfo>>;
  createWorktree(input: CreateWorktreeInput): Promise<ControlResult<WorktreeInfo>>;
  listLoops(workspaceId: string): Promise<ControlResult<LoopDefinition[]>>;
  inspectLoop(workspaceId: string, name: string): Promise<ControlResult<LoopDefinition>>;
  startLoop(input: StartLoopInput): Promise<ControlResult<LoopRunStatus>>;
  getLoopRun(input: LoopRunRef): Promise<ControlResult<LoopRunStatus>>;
  listLoopRuns(input: ListLoopRunsInput): Promise<ControlResult<LoopRunStatus[]>>;
  cancelLoopRun(input: LoopRunRef): Promise<ControlResult<LoopRunStatus>>;
}
