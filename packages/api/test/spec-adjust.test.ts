import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { rm } from "node:fs/promises";
import { closeTaskFixture } from "./task-api-support";
import { finalizationRoots } from "./spec-finalization-support";
import { httpProcedure } from "./spec-calls";
import { rejection, specCaller } from "./spec-support";
import { attempts, commandsOf, failAdjustment, reviewedStage, stageRow } from "./spec-recovery-support";

beforeEach(() => vi.stubEnv("TASK_CURSOR_SECRET", "spec-test-cursor-secret"));
afterEach(async () => { await closeTaskFixture(); await Promise.all(finalizationRoots.splice(0).map((root) => rm(root, { recursive: true, force: true }))); });

describe("taskSpec.adjust", () => {
  it("IT-159 accepts the change request for current V1 and queues one adjustment attempt", async () => {
    const context = await reviewedStage();
    const receipt = await context.caller.adjust(await context.adjust("Clarify retention"));
    expect(receipt).toMatchObject({ status: "accepted", packageId: context.saved.packageId });
    const [, adjusted] = await attempts(context.setup);
    expect(adjusted).toMatchObject({ id: receipt.attemptId, kind: "adjust", state: "queued", sourceAttemptId: context.started.attemptId });
    expect(adjusted!.input).toMatchObject({ adjustment: "Clarify retention", reviewedPackageId: context.saved.packageId });
    expect((await stageRow(context.setup)).currentPackageId).toBe(context.saved.packageId);
  });

  it("IT-081 conflicts when V1 belongs to another stage and IT-088 when the stage is already approved", async () => {
    const context = await reviewedStage();
    expect(await rejection(context.caller.adjust(await context.adjust("x", { stage: "tasks" })))).toMatchObject({ code: "PRECONDITION_FAILED", reason: "stage_prerequisite" });
    expect(await rejection(context.caller.adjust(await context.adjust("x", { manifestHash: "e".repeat(64) })))).toMatchObject({ code: "CONFLICT", reason: "spec_conflict" });
    await context.setup.database.execute(`UPDATE task_spec_packages SET stage = 'prd'` as never).catch(() => undefined);
    await context.setup.database.execute(`UPDATE task_spec_stages SET state = 'approved', approved_package_id = current_package_id WHERE stage = 'tech_spec'` as never);
    expect(await rejection(context.caller.adjust(await context.adjust("x")))).toMatchObject({ code: "CONFLICT", reason: "stage_approved" });
  });

  it("IT-082 and IT-083 reject blank and oversized text without shortening", async () => {
    const context = await reviewedStage();
    expect(await httpProcedure(context.setup, "adjust", await context.adjust("   "))).toEqual({ status: 400, reason: "invalid_input" });
    expect(await httpProcedure(context.setup, "adjust", await context.adjust("a".repeat(16_385)))).toEqual({ status: 400, reason: "invalid_input" });
    expect(await attempts(context.setup)).toHaveLength(1);
  });

  it("IT-084 reports revoked membership before acceptance", async () => {
    const context = await reviewedStage();
    const input = await context.adjust();
    await context.setup.database.execute(`DELETE FROM project_assignments` as never);
    await context.setup.database.execute(`DELETE FROM admin_designations WHERE github_user_id = '88'` as never);
    expect(await rejection(context.caller.adjust(input))).toMatchObject({ code: "FORBIDDEN", reason: "access_revoked" });
  });

  it("IT-085 admits one adjustment when two different changes race against V1", async () => {
    const context = await reviewedStage();
    const [first, second] = [await context.adjust("Primeira"), await context.adjust("Segunda")];
    const results = await Promise.allSettled([context.caller.adjust(first), context.caller.adjust(second)]);
    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    expect((await attempts(context.setup)).filter((attempt) => attempt.kind === "adjust")).toHaveLength(1);
  });

  it("IT-087 returns the same attempt for a resent accepted change", async () => {
    const context = await reviewedStage();
    const input = await context.adjust();
    const first = await context.caller.adjust(input);
    expect(await context.caller.adjust(input)).toEqual(first);
    expect((await attempts(context.setup)).filter((attempt) => attempt.kind === "adjust")).toHaveLength(1);
  });

  it("IT-184 and IT-183 refuse a second adjustment while one is active and a full queue", async () => {
    const context = await reviewedStage();
    await context.caller.adjust(await context.adjust());
    expect(await rejection(context.caller.adjust(await context.adjust("Outra")))).toMatchObject({ code: "CONFLICT" });
  });

  it("IT-086 keeps V1 intact as the previous complete version when the adjustment fails", async () => {
    const context = await reviewedStage();
    const { receipt } = await failAdjustment(context);
    expect(await context.caller.package({ ...context.scope, packageId: context.saved.packageId })).toMatchObject({ captureState: "review_ready", isCurrent: false });
    expect((await stageRow(context.setup)).currentPackageId).toBe(context.saved.packageId);
    expect((await commandsOf(context.setup, "spec.adjust"))[0]).toMatchObject({ status: "rejected", reason: "runtime_failed", attemptId: receipt.attemptId });
    expect(await specCaller(context.setup).submission({ ...context.scope, action: "spec.adjust", requestKey: (await commandsOf(context.setup, "spec.adjust"))[0]!.requestKey })).toMatchObject({ status: "known", receipt: { status: "rejected", reason: "runtime_failed" } });
  });
});
