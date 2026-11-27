export type WorktreeTarget = { checkoutRoot: string; path: string; branch: string };
export type WorktreeFolder = { kind: "ready"; path: string; branch: string | null; detachedSha: string | null; dirty: boolean };
export type WorktreeConflict = { kind: "conflict" };
export type WorktreeBranchBusy = { kind: "branch_busy"; busyPath: string };
export type WorktreeMissing = { kind: "missing"; branchExists: boolean };
export type WorktreeFailure = { kind: "failed" };
export type WorktreeInspection = WorktreeFolder | WorktreeConflict | WorktreeBranchBusy | WorktreeMissing;
export type WorktreeEnsureResult = WorktreeFolder | WorktreeConflict | WorktreeBranchBusy | WorktreeFailure;

export interface WorktreeManager {
  inspect(target: WorktreeTarget): Promise<WorktreeInspection>;
  ensure(target: WorktreeTarget): Promise<WorktreeEnsureResult>;
}
