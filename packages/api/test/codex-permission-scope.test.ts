import { afterEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { taskTerminalRequests } from "../src/infra/database/schema";
import { requestsOf } from "./session-interaction-support";
import { cycle, workerWorld } from "./session-worker-support";
import { closeTaskFixture } from "./task-api-support";
import { cleanupTerminalFolders } from "./terminal-support";

afterEach(async () => { await closeTaskFixture(); await cleanupTerminalFolders(); });

const SCRIPT = [{ kind: "permission" as const, toolName: "Bash", input: { command: "pnpm test" }, suggestions: [{ type: "command", command: "pnpm test" }] }];

describe("permission answer scope mapping", () => {
  it("returns an ephemeral allow_session decision without persistent permissions", async () => {
    const world = await workerWorld({ script: SCRIPT }, { permissions: undefined });
    const sessionId = await world.open({ permissionMode: "ask_all" });
    await cycle(world);
    const [request] = await pendingRequest(world, sessionId);
    await world.setup.database.update(taskTerminalRequests).set({ payload: { ...(request!.payload as object), offers: ["allow", "allow_session", "allow_always", "deny"] } }).where(eq(taskTerminalRequests.id, request!.id));
    await world.harness.caller.session.decidePermission({ projectId: world.setup.project.id, taskId: world.setup.taskId, requestId: request!.id, decision: "allow_session" });
    await cycle(world);
    expect(world.runtime.runnerOf(sessionId).outcomes).toEqual([{ behavior: "allow", decision: "allow_session" }]);
  });

  it("returns the unchanged Codex machine rule and keeps Claude project settings", async () => {
    const world = await workerWorld({ script: SCRIPT }, { permissions: undefined });
    const sessionId = await world.open({ permissionMode: "ask_all" });
    await cycle(world);
    const [request] = await pendingRequest(world, sessionId);
    await world.setup.database.update(taskTerminalRequests).set({ payload: { ...(request!.payload as object), suggestedRule: "Bash(pnpm test:*)", alwaysScope: "machine" } }).where(eq(taskTerminalRequests.id, request!.id));
    await world.harness.caller.session.decidePermission({ projectId: world.setup.project.id, taskId: world.setup.taskId, requestId: request!.id, decision: "allow_always" });
    await cycle(world);
    expect(world.runtime.runnerOf(sessionId).outcomes).toMatchObject([{ behavior: "allow", decision: "allow_always", scope: "machine", updatedPermissions: [{ type: "command", command: "pnpm test" }] }]);
  });

  it("continues to target local settings for Claude project approval", async () => {
    const world = await workerWorld({ script: SCRIPT }, { permissions: undefined });
    const sessionId = await world.open({ permissionMode: "ask_all" });
    await cycle(world);
    const [request] = await pendingRequest(world, sessionId);
    await world.setup.database.update(taskTerminalRequests).set({ payload: { ...(request!.payload as object), suggestedRule: "Bash(pnpm test:*)" } }).where(eq(taskTerminalRequests.id, request!.id));
    await world.harness.caller.session.decidePermission({ projectId: world.setup.project.id, taskId: world.setup.taskId, requestId: request!.id, decision: "allow_always" });
    await cycle(world);
    expect(world.runtime.runnerOf(sessionId).outcomes).toMatchObject([{ behavior: "allow", updatedPermissions: [{ destination: "localSettings" }] }]);
  });
});

async function pendingRequest(world: Awaited<ReturnType<typeof workerWorld>>, sessionId: string) {
  let rows = await requestsOf(world.setup, sessionId);
  for (let attempt = 0; rows.length === 0 && attempt < 20; attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, 5));
    rows = await requestsOf(world.setup, sessionId);
  }
  return rows;
}
