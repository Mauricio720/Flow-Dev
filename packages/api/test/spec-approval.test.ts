import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { rm } from "node:fs/promises";
import { eq } from "drizzle-orm";
import { taskSpecApprovals, taskSpecAttempts, taskSpecCommands, taskSpecStages } from "../src/infra/database/schema";
import { TaskError } from "../src/application/services/tasks/taskErrors";
import { closeTaskFixture } from "./task-api-support";
import { finalizationRoots, harness } from "./spec-finalization-support";
import { rejection, specCaller, specScope } from "./spec-support";
import { fakeDeps } from "./spec-worker-support";
import { seedInteraction } from "./spec-seed";

beforeEach(() => vi.stubEnv("TASK_CURSOR_SECRET", "spec-test-cursor-secret"));
afterEach(async () => { await closeTaskFixture(); await Promise.all(finalizationRoots.splice(0).map((root) => rm(root, { recursive: true, force: true }))); });

async function reviewed() {
  const base = await harness();
  const saved = await base.prepare();
  await base.finalization().finalize(base.claim, saved.packageId);
  const caller = specCaller(base.setup);
  const input = async (overrides: Record<string, unknown> = {}) => ({ ...specScope(base.setup), requestKey: crypto.randomUUID(), expectedSpecVersion: (await caller.byTask(specScope(base.setup))).specVersion, stage: "tech_spec" as const, packageId: saved.packageId, manifestHash: saved.manifestHash, ...overrides });
  const harnessDeps = fakeDeps(base.setup);
  return { ...base, saved, caller, input, ...harnessDeps };
}
const approvals = async (setup: Awaited<ReturnType<typeof reviewed>>["setup"]) => setup.database.select().from(taskSpecApprovals);

describe("taskSpec.approve", () => {
  it("IT-165 accepts the exact current package and the worker records author and time without dispatching a next stage", async () => {
    const { setup, caller, input, controller } = await reviewed();
    const receipt = await caller.approve(await input());
    expect(receipt).toMatchObject({ status: "accepted" });
    expect(await approvals(setup)).toHaveLength(0);
    await controller.tick();
    const [approval] = await approvals(setup);
    expect(approval).toMatchObject({ approverUserId: setup.ownerId, stage: "tech_spec" });
    expect(approval!.approvedAt).toBeInstanceOf(Date);
    const detail = await caller.byTask(specScope(setup));
    expect(detail.stages.find((stage) => stage.stage === "tech_spec")).toMatchObject({ state: "approved", approval: { approverUserId: setup.ownerId } });
    expect(detail).toMatchObject({ state: "approved", permissions: { nextStartableStage: "tasks" } });
    expect((await setup.database.select().from(taskSpecAttempts)).filter((attempt) => attempt.state === "queued")).toHaveLength(0);
    expect((await setup.database.select().from(taskSpecCommands)).find((command) => command.action === "spec.approve")).toMatchObject({ status: "applied", deliveryStatus: "delivered" });
  });
  it("IT-077 and IT-186 keep one approval for a repeated command and reject a new key for an approved stage", async () => {
    const { setup, caller, input, controller } = await reviewed();
    const request = await input();
    const first = await caller.approve(request);
    await controller.tick();
    expect(await caller.approve(request)).toMatchObject({ commandId: first.commandId });
    await controller.tick();
    expect(await approvals(setup)).toHaveLength(1);
    expect(await rejection(caller.approve(await input()))).toMatchObject({ code: "CONFLICT", reason: "stage_approved" });
  });
  it("IT-065 rejects a hash from a superseded package with spec_conflict", async () => {
    const { caller, input } = await reviewed();
    expect(await rejection(caller.approve(await input({ manifestHash: "e".repeat(64) })))).toMatchObject({ code: "CONFLICT", reason: "spec_conflict" });
  });
  it("IT-074 and IT-172 refuse a reader", async () => {
    const { setup, input } = await reviewed();
    await setup.authorize(setup.readerId);
    expect(await rejection(specCaller(setup, setup.readerId).approve(await input()))).toMatchObject({ code: "FORBIDDEN", reason: "operator_required" });
  });
  it("rejects the approval when the installed bytes drifted or the author lost access", async () => {
    const drifted = await reviewed();
    await drifted.caller.approve(await drifted.input());
    drifted.workspaces.verify.mockRejectedValue(new TaskError("artifact_conflict"));
    await drifted.controller.tick();
    expect(await approvals(drifted.setup)).toHaveLength(0);
    expect((await drifted.setup.database.select().from(taskSpecCommands)).find((command) => command.action === "spec.approve")).toMatchObject({ status: "rejected", reason: "artifact_conflict" });
    const revoked = await reviewed();
    await revoked.caller.approve(await revoked.input());
    revoked.access.check.mockResolvedValue("revoked" as never);
    await revoked.controller.tick();
    expect((await revoked.setup.database.select().from(taskSpecCommands)).find((command) => command.action === "spec.approve")).toMatchObject({ status: "rejected", reason: "access_revoked" });
  });
  it("IT-235 returns the specific blocker for a pending question, an undelivered response and an unresolved capture", async () => {
    const pending = await reviewed();
    const attemptId = (await pending.setup.database.select().from(taskSpecAttempts))[0]!.id;
    await pending.setup.database.update(taskSpecStages).set({ currentAttemptId: attemptId }).where(eq(taskSpecStages.stage, "tech_spec"));
    await seedInteraction(pending.setup, { workflowId: pending.started.workflowId, attemptId });
    expect(await rejection(pending.caller.approve(await pending.input()))).toMatchObject({ code: "CONFLICT", reason: "attempt_active" });
    await pending.setup.database.execute(`UPDATE task_spec_interactions SET status = 'resolved', delivery = 'pending'` as never);
    await pending.setup.database.execute(`UPDATE task_spec_attempts SET state = 'completed'` as never);
    expect(await rejection(pending.caller.approve(await pending.input()))).toMatchObject({ code: "CONFLICT", reason: "outcome_unknown" });
    await pending.setup.database.execute(`UPDATE task_spec_interactions SET delivery = 'delivered'` as never);
    await pending.setup.database.execute(`UPDATE task_spec_packages SET capture_state = 'prepared'` as never);
    expect(await rejection(pending.caller.approve(await pending.input()))).toMatchObject({ code: "PRECONDITION_FAILED", reason: "package_incomplete" });
  });
  it("IT-188 blocks approval while an explicit blocking decision stays open", async () => {
    const base = await harness();
    const saved = await base.prepare({}, (index) => { const source = (index.tests as { source: unknown }[])[0]!.source; index.decisions = [{ id: "D1", severity: "blocking", status: "open", source }]; });
    await base.finalization().finalize(base.claim, saved.packageId);
    const caller = specCaller(base.setup);
    const version = (await caller.byTask(specScope(base.setup))).specVersion;
    const request = { ...specScope(base.setup), requestKey: crypto.randomUUID(), expectedSpecVersion: version, stage: "tech_spec" as const, packageId: saved.packageId, manifestHash: saved.manifestHash };
    expect(await rejection(caller.approve(request))).toMatchObject({ code: "PRECONDITION_FAILED", reason: "decision_blocked" });
  });
});
