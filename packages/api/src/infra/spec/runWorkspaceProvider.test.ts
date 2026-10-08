import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ExecutionRequest } from "../../application/services/task-flow/actionExecutor";
import { GitRunWorkspaceProvider } from "./runWorkspaceProvider";

let runtimeRoot: string;
afterEach(async () => { if (runtimeRoot) await rm(runtimeRoot, { recursive: true, force: true }); });

function request(worktreeId: string | null): ExecutionRequest {
  const workspace = worktreeId ? { kind: "existing" as const, worktreeId } : { kind: "isolated" as const };
  const snapshot = { kind: "create_spec", runtime: {}, workspace, worktreeId, connectionRevisions: {}, connectionLabels: {}, accountFingerprints: {}, runtimeProviderIds: {}, compozyVersion: "v", };
  return { run: { id: "run-1", taskId: "task-1", worktreeId, snapshot, runtime: {} } as never, snapshot: snapshot as never, grants: [] };
}

describe("run workspace binding", () => {
  it("mounts the exact admitted worktree path", async () => {
    runtimeRoot = await mkdtemp(join(tmpdir(), "flow-runtime-"));
    const prepare = vi.fn();
    const provider = new GitRunWorkspaceProvider({
      flow: { taskContext: async () => ({ projectId: "project-1", authorUserId: "user-1" }) } as never,
      repositories: {} as never,
      workspaces: { prepare } as never,
      resolver: { resolve: async (input: { worktreeId?: string | null }) => input.worktreeId === "wt-1" ? { workspaceId: "ws-1", repositoryId: "202", worktreePath: "/repo/worktrees/feature" } : null },
      runtimeRoot,
    });
    await expect(provider.prepare(request("wt-1"))).resolves.toMatchObject({ repositoryPath: "/repo/worktrees/feature" });
    expect(prepare).not.toHaveBeenCalled();
  });

  it("fails closed when the admitted worktree is no longer ready", async () => {
    runtimeRoot = await mkdtemp(join(tmpdir(), "flow-runtime-"));
    const provider = new GitRunWorkspaceProvider({
      flow: { taskContext: async () => ({ projectId: "project-1", authorUserId: "user-1" }) } as never,
      repositories: {} as never,
      workspaces: { prepare: vi.fn() } as never,
      resolver: { resolve: async () => null },
      runtimeRoot,
    });
    await expect(provider.prepare(request("wt-1"))).rejects.toMatchObject({ reason: "workspace_unavailable" });
  });

  it("refuses to mount a machine checkout into the hosted provider", async () => {
    runtimeRoot = await mkdtemp(join(tmpdir(), "flow-runtime-"));
    const key = `local:${"a".repeat(64)}`;
    const prepare = vi.fn();
    const provider = new GitRunWorkspaceProvider({
      flow: { taskContext: async () => ({ projectId: "project-1", authorUserId: "user-1" }) } as never,
      repositories: {} as never, workspaces: { prepare } as never,
      resolver: { resolve: vi.fn() }, runtimeRoot,
    });
    const snapshot = { ...request(null).snapshot, workspace: { kind: "local" }, worktreeId: key };
    const bound: ExecutionRequest = { run: { ...request(null).run, worktreeId: key, snapshot } as never, snapshot: snapshot as never, grants: [] };
    await expect(provider.prepare(bound)).rejects.toMatchObject({ reason: "workspace_unavailable" });
    expect(prepare).not.toHaveBeenCalled();
  });
});
