import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { rm } from "node:fs/promises";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { eq } from "drizzle-orm";
import { DrizzleTaskSpecFinalizationDao } from "../src/infra/database/dao/spec/drizzleTaskSpecFinalizationDao";
import { SpecFinalizationService } from "../src/application/services/spec/specFinalizationService";
import { revisedManifest } from "./spec-fixtures";
import { taskSpecAttempts, taskSpecEvents } from "../src/infra/database/schema";
import { closeTaskFixture } from "./task-api-support";
import { finalizationRoots } from "./spec-finalization-support";
import { rejection, specCaller } from "./spec-support";
import { attempts, commandsOf, reviewedStage, stageRow, type Reviewed } from "./spec-recovery-support";

beforeEach(() => vi.stubEnv("TASK_CURSOR_SECRET", "spec-test-cursor-secret"));
afterEach(async () => { await closeTaskFixture(); await Promise.all(finalizationRoots.splice(0).map((root) => rm(root, { recursive: true, force: true }))); });

async function runningAdjustment(context: Reviewed) {
  const receipt = await context.caller.adjust(await context.adjust());
  await context.setup.database.update(taskSpecAttempts).set({ state: "running", runtimeWorkspaceId: "w1", runtimeSessionId: "s1", runtimeTurnId: "t1" }).where(eq(taskSpecAttempts.id, receipt.attemptId!));
  return receipt.attemptId!;
}
const verifiedStop = { state: "stopped", verified: true, stopReason: "user_canceled", stopCause: null, turnId: null, attention: null, pendingInteractions: [] };

describe("taskSpec.cancel", () => {
  it("IT-162 and IT-107 return a stopping receipt for an active attempt and one stop for a repeated key", async () => {
    const context = await reviewedStage();
    const attemptId = await runningAdjustment(context);
    const input = await context.cancel(attemptId);
    const first = await context.caller.cancel(input);
    expect(first).toMatchObject({ status: "accepted", attemptId });
    expect(await context.caller.cancel(input)).toEqual(first);
    expect((await attempts(context.setup)).find((attempt) => attempt.id === attemptId)).toMatchObject({ state: "stopping" });
    expect(await commandsOf(context.setup, "spec.cancel")).toHaveLength(1);
    context.runtime.inspect.mockResolvedValue(verifiedStop as never);
    await context.controller.tick();
    expect((await attempts(context.setup)).find((attempt) => attempt.id === attemptId)).toMatchObject({ state: "canceled" });
    expect(await context.caller.cancel(await context.cancel(attemptId))).toMatchObject({ status: "applied" });
  });

  it("cancels a queued attempt transactionally without a runtime stop", async () => {
    const context = await reviewedStage();
    const receipt = await context.caller.adjust(await context.adjust());
    const canceled = await context.caller.cancel(await context.cancel(receipt.attemptId!));
    expect(canceled).toMatchObject({ status: "applied" });
    expect(context.runtime.stop).not.toHaveBeenCalled();
    expect((await attempts(context.setup)).find((attempt) => attempt.id === receipt.attemptId)).toMatchObject({ state: "canceled" });
    expect((await context.setup.database.select().from(taskSpecEvents)).filter((event) => event.kind === "attempt.canceled")).toHaveLength(1);
  });

  it("IT-102 and IT-109 return the existing terminal result for a settled attempt and leave the approval alone", async () => {
    const context = await reviewedStage();
    const receipt = await context.caller.cancel(await context.cancel(context.started.attemptId));
    expect(receipt).toMatchObject({ status: "applied", attemptId: context.started.attemptId });
    expect(context.runtime.stop).not.toHaveBeenCalled();
    expect((await stageRow(context.setup)).state).toBe("review");
  });

  it("IT-101 hides an attempt that belongs to another work item and IT-104 refuses a reader", async () => {
    const context = await reviewedStage();
    expect(await rejection(context.caller.cancel(await context.cancel(crypto.randomUUID())))).toMatchObject({ code: "NOT_FOUND", reason: "spec_unavailable" });
    await context.setup.authorize(context.setup.readerId);
    expect(await rejection(specCaller(context.setup, context.setup.readerId).cancel(await context.cancel(context.started.attemptId)))).toMatchObject({ code: "FORBIDDEN", reason: "author_required" });
  });

  it("IT-089 and IT-105 keep the current package pointer when a late capture arrives after a verified cancellation", async () => {
    const context = await reviewedStage();
    const attemptId = await runningAdjustment(context);
    await context.setup.database.update(taskSpecAttempts).set({ state: "finalizing" }).where(eq(taskSpecAttempts.id, attemptId));
    const late = (await context.deps.dao.claim({ owner: "w", now: new Date("2032-01-01"), maxActive: 2 }))!;
    const captured = await context.capture.capture({ workflowId: context.started.workflowId, attemptId, stage: "tech_spec", manifest: revisedManifest("tech-spec-route", "tech_spec", { "_techspec.md": "# Tardio\n" }), upstream: [], finalization: { workspaceId: context.workspaceId, commandId: null } });
    await context.setup.database.update(taskSpecAttempts).set({ state: "canceled", finishedAt: new Date() }).where(eq(taskSpecAttempts.id, attemptId));
    const service = new SpecFinalizationService(new DrizzleTaskSpecFinalizationDao(context.setup.database), context.gateway);
    await expect(service.finalize(late, captured.packageId)).rejects.toMatchObject({ reason: "stale_execution" });
    expect((await stageRow(context.setup)).currentPackageId).toBe(context.saved.packageId);
    expect(await readFile(join(context.canonical, "_techspec.md"), "utf8")).not.toContain("Tardio");
  });
});
