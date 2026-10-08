import { afterEach, describe, expect, it } from "vitest";
import { RuntimeWorkspaceAdmission } from "../src/application/services/task-flow/runtimeWorkspaceAdmission";
import type { WorktreeInfo } from "../src/application/software/compozyControlGateway";
import { PinnedCompozyControlGateway } from "../src/infra/spec/compozy/compozyControlGateway";
import { failureOf } from "./software-support";
import { closeTaskFixture } from "./task-api-support";
import { flowFixture, flowKey, skillAction, type FlowFixture } from "./task-flow-fixture";

let current: FlowFixture | undefined;
afterEach(async () => { await closeTaskFixture(); current = undefined; });

const READY: WorktreeInfo = { id: "wt-1", name: "feature", state: "ready", workspaceId: "ws-1", path: "/wt/feature", dirty: false, branch: "feature" };

async function plannedWith(fixture: FlowFixture, workspace: unknown) {
  const connectionId = await fixture.connection();
  await fixture.author.savePlan({ ...fixture.scope, actions: [{ ...skillAction(connectionId), workspace }] as never, expectedRevision: 0, idempotencyKey: flowKey() });
  const plan = (await fixture.author.byTask(fixture.scope)).plan!;
  return { plan, start: (key = flowKey()) => fixture.author.startAction({ ...fixture.scope, actionId: plan.actions[0]!.id, expectedRevision: plan.revision, idempotencyKey: key }) };
}

describe("worktree selection", () => {
  it("IT-092 lists ready worktrees of the task repository with reasons for the others", async () => {
    current = await flowFixture({ runtimeControl: true });
    current.gateway.worktrees = [READY, { ...READY, id: "wt-2", workspaceId: "ws-other" }, { ...READY, id: "wt-3", state: "pending" }, { ...READY, id: "wt-4", dirty: true }];
    const options = await current.author.options(current.scope);
    expect(options.worktrees.map((item) => [item.id, item.selectable, item.reason])).toEqual([["wt-1", true, null], ["wt-2", false, "foreign_repository"], ["wt-3", false, "pending"], ["wt-4", false, "dirty"]]);
    expect(options.managedWorktreesAvailable).toBe(true);
  });

  it("IT-093, IT-096 and IT-097 bind the resolved worktree and block foreign, missing or dirty ones without using the root checkout", async () => {
    current = await flowFixture({ runtimeControl: true });
    current.gateway.worktrees = [READY];
    const { start, plan } = await plannedWith(current, { kind: "existing", worktreeId: "wt-1" });
    current.gateway.worktrees = [{ ...READY, workspaceId: "ws-other" }];
    expect(await failureOf(start())).toEqual({ code: "PRECONDITION_FAILED", reason: "worktree_not_ready" });
    current.gateway.worktrees = [];
    expect(await failureOf(start())).toEqual({ code: "PRECONDITION_FAILED", reason: "worktree_not_ready" });
    current.gateway.worktrees = [{ ...READY, dirty: true }];
    expect(await failureOf(start())).toEqual({ code: "PRECONDITION_FAILED", reason: "worktree_not_ready" });
    current.gateway.worktrees = [READY];
    const run = await start();
    const stored = await current.flow.runs.find(run.runId);
    expect(stored).toMatchObject({ worktreeId: "wt-1" });
    expect(stored?.snapshot).toMatchObject({ worktreeId: "wt-1", workspace: { kind: "existing", worktreeId: "wt-1" } });
    expect((await current.author.byTask(current.scope)).plan?.actions[0]?.state).toBe("queued");
    expect(plan.actions[0]?.workspace).toEqual({ kind: "existing", worktreeId: "wt-1" });
  });

  it("IT-094 and IT-095 create a managed worktree idempotently and block a second task on the same writable worktree", async () => {
    current = await flowFixture({ runtimeControl: true });
    const { start } = await plannedWith(current, { kind: "new", name: "feature-x" });
    const run = await start();
    expect((await current.flow.runs.find(run.runId))?.worktreeId).toBe("wt-feature-x");
    expect(current.gateway.createdWorktrees).toEqual(["feature-x"]);
    const admission = new RuntimeWorkspaceAdmission({ flow: current.flow, gateway: current.gateway, resolver: { resolve: async () => ({ workspaceId: "ws-1", repositoryId: "202" }) } });
    current.gateway.worktrees = [{ ...READY, id: "wt-feature-x", name: "feature-x" }];
    const other = "00000000-0000-4000-8000-0000000000aa";
    await expect(admission.resolve({ taskId: other, projectId: current.scope.projectId, workspace: { kind: "existing", worktreeId: "wt-feature-x" } })).rejects.toMatchObject({ reason: "worktree_not_ready", details: { cause: "busy" } });
  });

  it("IT-098 never exposes a worktree deletion operation to Flow Dev", () => {
    const methods = Object.getOwnPropertyNames(PinnedCompozyControlGateway.prototype);
    const instance = Object.keys(new PinnedCompozyControlGateway({ transport: async () => ({ status: 200, body: {} }), declaredOpenApiSha256: "x" }));
    expect([...methods, ...instance].filter((name) => /delete|remove|cleanup|prune/i.test(name))).toEqual([]);
  });
});
