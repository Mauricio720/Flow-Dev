import { describe, expect, it, vi } from "vitest";
import { resolveSpecWorktree } from "./executionWorktree";

const input = { workspaceId: "workspace", name: "fd-spec", branch: "flow-dev/spec", baseRef: "main" };

describe("spec worktree resolution", () => {
  it("UT-013 reuses a worktree on the expected branch", async () => {
    const gateway = { findWorktree: vi.fn(async () => ({ worktreeId: "existing", name: input.name, branch: input.branch, path: "/tmp/spec" })), createWorktree: vi.fn() };
    await expect(resolveSpecWorktree(gateway, input)).resolves.toEqual({ worktreeId: "existing", path: "/tmp/spec" });
    expect(gateway.createWorktree).not.toHaveBeenCalled();
  });

  it("UT-013 refuses a same-name worktree on another branch", async () => {
    const gateway = { findWorktree: vi.fn(async () => ({ worktreeId: "existing", name: input.name, branch: "other", path: "/tmp/spec" })), createWorktree: vi.fn() };
    await expect(resolveSpecWorktree(gateway, input)).rejects.toMatchObject({ reason: "worktree_branch_conflict" });
    expect(gateway.createWorktree).not.toHaveBeenCalled();
  });
});
