import type { ReadinessProjection } from "../../software/readiness";
import type { FlowAction, WorkspaceChoice } from "./flowContracts";
import type { LocalProjectAccess } from "./localProjectAccess";
import { TaskFlowError, type TaskFlowReason } from "./taskFlowErrors";

export type TaskScope = { projectId: string; taskId: string; actorId: string; sourceSnapshotId?: string; claimRevision?: number };

export type TaskEligibility = { canPlan: boolean; reason: TaskFlowReason | null };

export interface TaskFlowGate {
  eligibility(scope: TaskScope): Promise<TaskEligibility>;
  approvedSpec(taskId: string): Promise<boolean>;
  approvedTasks(taskId: string): Promise<boolean>;
}

export interface FreshReadiness {
  fresh(): Promise<ReadinessProjection>;
}

export type ResolvedWorkspace = { worktreeId: string | null; localTarget?: import("./localProjectAccess").LocalProjectInfo["target"] };

export interface WorkspaceAdmission {
  resolve(input: { taskId: string; projectId: string; actorId: string; workspace: WorkspaceChoice }): Promise<ResolvedWorkspace>;
}
export type { LocalProjectAccess };

export interface LoopAdmission {
  admit(input: { taskId: string; action: Extract<FlowAction, { kind: "loop" }> }): Promise<void>;
}

export const ISOLATED_ONLY: WorkspaceAdmission = {
  resolve: async ({ workspace }) => {
    if (workspace.kind !== "isolated") throw new TaskFlowError("worktree_not_ready");
    return { worktreeId: null };
  },
};
