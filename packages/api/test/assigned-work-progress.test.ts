import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { taskExecutionActions, taskExecutionPlans, taskExecutionRuns, taskUnifiedPackageApprovals, taskUnifiedPackages } from "../src/infra/database/schema";
import { assignedFixture, closeAssigned, resetAssigned, type AssignedFixture } from "./assigned-support";

let f: AssignedFixture;
beforeAll(async () => { f = await assignedFixture(); });
beforeEach(() => resetAssigned(f));
afterAll(closeAssigned);

const PREVIEW_LIMIT = 280;
const firstProgress = async () => (await f.caller(f.u1.id).active({ projectId: f.project.id, filter: "mine", limit: 20 })).items[0]!.progress;
const activity = { sequence: 1, kind: "tool_call" as const, at: "2026-10-15T10:00:00.000Z", preview: "x".repeat(PREVIEW_LIMIT * 2), tool: "edit_file", source: "src/app.ts", status: null };

async function seedRunningFlow(taskId: string) {
  const [planId, actionId, runId] = [crypto.randomUUID(), crypto.randomUUID(), crypto.randomUUID()];
  await f.database.insert(taskExecutionPlans).values({ id: planId, taskId, createdBy: f.u1.id });
  await f.database.insert(taskExecutionActions).values({ id: actionId, planId, taskId, position: 0, kind: "loop", loopName: "implement-tasks", loopVersion: "1.0.0", state: "running" });
  await f.database.insert(taskExecutionRuns).values({ id: runId, actionId, taskId, attemptNumber: 1, state: "running", snapshot: { kind: "loop", loopName: "implement-tasks" }, idempotencyKey: crypto.randomUUID(), requestedBy: f.u1.id, activity });
  const [spec] = await f.database.insert(taskUnifiedPackages).values({ taskId, sourceRunId: runId, snapshotId: crypto.randomUUID(), format: "os_spec_v1", version: 1, status: "approved", manifest: {} }).returning();
  await f.database.insert(taskUnifiedPackageApprovals).values({ packageId: spec!.id, taskId, version: 1, approverUserId: f.u1.id, idempotencyKey: crypto.randomUUID() });
}

describe("assignedIssues.active progress", () => {
  it("reports an empty flow for claimed work that has not started", async () => {
    await f.caller(f.u1.id).claim(f.claimInput());
    expect(await firstProgress()).toEqual({ route: null, flow: "none", actions: [], packages: [], activeRun: null });
  });

  it("summarizes the plan, the packages and the live run with a bounded activity preview", async () => {
    const { taskId } = await f.caller(f.u1.id).claim(f.claimInput());
    await seedRunningFlow(taskId);
    const progress = await firstProgress();
    expect(progress).toMatchObject({
      flow: "unified",
      actions: [{ kind: "loop", loopName: "implement-tasks", state: "running", concludedAt: null }],
      packages: [{ format: "os_spec_v1", version: 1, status: "approved", approvedAt: expect.any(String) }],
      activeRun: { kind: "loop", loopName: "implement-tasks", state: "running", activity: { kind: "tool_call", tool: "edit_file", source: "src/app.ts" } },
    });
    expect(progress.activeRun!.activity!.preview).toHaveLength(PREVIEW_LIMIT);
  });
});
