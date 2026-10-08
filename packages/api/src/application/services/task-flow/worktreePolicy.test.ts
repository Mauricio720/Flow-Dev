import { describe, expect, it } from "vitest";
import type { WorktreeInfo } from "../../software/compozyControlGateway";
import { TaskFlowError } from "./taskFlowErrors";
import { WorktreePolicy } from "./worktreePolicy";

const READY: WorktreeInfo = { id: "wt-1", name: "feature", state: "ready", workspaceId: "ws-1", path: "/wt/feature", dirty: false, branch: "feature" };
const policy = new WorktreePolicy();
const failure = (check: Parameters<WorktreePolicy["assertUsable"]>[0]) => {
  try { policy.assertUsable(check); } catch (error) { return error instanceof TaskFlowError ? { reason: error.reason, cause: error.details?.cause } : null; }
  return null;
};
const base = { worktree: READY, taskWorkspaceId: "ws-1", otherActiveWriteRuns: 0, writable: true };

describe("worktree policy", () => {
  it("UT-011 refuses a worktree registered under another workspace", () => {
    expect(failure({ ...base, worktree: { ...READY, workspaceId: "ws-other" } })).toEqual({ reason: "worktree_not_ready", cause: "foreign_repository" });
  });

  it("UT-012 denies a second task's write start on a worktree with an active write run", () => {
    expect(failure({ ...base, otherActiveWriteRuns: 1 })).toEqual({ reason: "worktree_not_ready", cause: "busy" });
    expect(failure({ ...base, otherActiveWriteRuns: 1, writable: false })).toBeNull();
  });

  it("admits only ready, clean and registered worktrees and reports each cause", () => {
    expect(failure(base)).toBeNull();
    expect(failure({ ...base, worktree: null })).toEqual({ reason: "worktree_not_ready", cause: "missing" });
    expect(failure({ ...base, worktree: { ...READY, state: "pending" } })).toEqual({ reason: "worktree_not_ready", cause: "pending" });
    expect(failure({ ...base, worktree: { ...READY, state: "missing" } })).toEqual({ reason: "worktree_not_ready", cause: "missing" });
    expect(failure({ ...base, worktree: { ...READY, dirty: true } })).toEqual({ reason: "worktree_not_ready", cause: "dirty" });
  });
});
