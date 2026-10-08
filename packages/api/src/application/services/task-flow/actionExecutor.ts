import type { RunRecord, RunRuntime } from "../../database/dao/taskFlowDao";
import type { AttemptGrant } from "../../software/credentialBroker";
import type { RunActivity } from "../../database/dao/taskFlowTypes";
import type { ActionSnapshot } from "./flowContracts";

export type ExecutionRequest = { run: RunRecord; snapshot: ActionSnapshot; grants: AttemptGrant[] };

export type ExecutionResult =
  | { kind: "submitted"; runtime: Partial<RunRuntime> }
  | { kind: "blocked"; code: string; detail?: string }
  | { kind: "failed"; code: string; detail?: string }
  | { kind: "unknown"; runtime?: Partial<RunRuntime> };

export type ReconcileState = "running" | "succeeded" | "failed" | "canceled" | "stalled" | "exhausted" | "blocked" | "unknown";
export type ReconcileResult = { state: ReconcileState; code: string | null; runtime?: Partial<RunRuntime>; runtimeEventSequence?: number; activity?: RunActivity | null };

export interface ActionExecutor {
  execute(request: ExecutionRequest): Promise<ExecutionResult>;
  reconcile(request: ExecutionRequest): Promise<ReconcileResult>;
  cancel?(request: ExecutionRequest): Promise<ReconcileResult>;
}
