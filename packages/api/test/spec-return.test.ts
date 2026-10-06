import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { taskSpecApprovals } from "../src/infra/database/schema";
import { SpecFinalizationService } from "../src/application/services/spec/specFinalizationService";
import { TaskError } from "../src/application/services/tasks/taskErrors";
import { DrizzleTaskSpecFinalizationDao } from "../src/infra/database/dao/spec/drizzleTaskSpecFinalizationDao";
import { closeTaskFixture } from "./task-api-support";
import { finalizationRoots } from "./spec-finalization-support";
import { rejection } from "./spec-support";
import { attempts, commandsOf, failAdjustment, reviewedStage, stageRow, type Reviewed } from "./spec-recovery-support";
import { fakeDeps } from "./spec-worker-support";

beforeEach(() => vi.stubEnv("TASK_CURSOR_SECRET", "spec-test-cursor-secret"));
afterEach(async () => { await closeTaskFixture(); await Promise.all(finalizationRoots.splice(0).map((root) => rm(root, { recursive: true, force: true }))); });

const realWorker = (context: Reviewed) => fakeDeps(context.setup, { finalization: new SpecFinalizationService(new DrizzleTaskSpecFinalizationDao(context.setup.database), context.gateway) });
async function failedAdjustment() {
  const context = await reviewedStage();
  const { receipt } = await failAdjustment(context);
  return { context, failedId: receipt.attemptId! };
}

describe("taskSpec.returnToReview", () => {
  it("IT-164 accepts the restore, reinstalls V1 after verification and never approves it", async () => {
    const { context, failedId } = await failedAdjustment();
    const receipt = await context.caller.returnToReview(await context.restore(failedId));
    expect(receipt).toMatchObject({ status: "accepted", packageId: context.saved.packageId });
    await realWorker(context).controller.tick();
    expect((await commandsOf(context.setup, "spec.returnToReview"))[0]).toMatchObject({ status: "applied" });
    expect(await stageRow(context.setup)).toMatchObject({ state: "review", currentPackageId: context.saved.packageId });
    expect(await context.setup.database.select().from(taskSpecApprovals)).toHaveLength(0);
    expect((await context.caller.byTask(context.scope)).state).toBe("review");
  });

  it("IT-196 saves a rejected receipt with artifact_conflict when the canonical bytes drifted", async () => {
    const { context, failedId } = await failedAdjustment();
    await context.caller.returnToReview(await context.restore(failedId));
    await writeFile(join(context.canonical, "_techspec.md"), "edição externa");
    await realWorker(context).controller.tick();
    expect((await commandsOf(context.setup, "spec.returnToReview"))[0]).toMatchObject({ status: "rejected", reason: "artifact_conflict" });
    expect(await readFile(join(context.canonical, "_techspec.md"), "utf8")).toBe("edição externa");
    expect(await stageRow(context.setup)).toMatchObject({ state: "failed" });
  });

  it("IT-196 saves a rejected receipt when an adjustment finds a changed canonical companion before running", async () => {
    const context = await reviewedStage();
    const receipt = await context.caller.adjust(await context.adjust());
    context.workspaces.candidate.mockRejectedValue(new TaskError("artifact_conflict"));
    await context.controller.tick();
    expect((await commandsOf(context.setup, "spec.adjust"))[0]).toMatchObject({ status: "rejected", reason: "artifact_conflict", attemptId: receipt.attemptId });
    expect((await attempts(context.setup)).at(-1)).toMatchObject({ state: "failed", terminalReason: "artifact_conflict" });
  });

  it("IT-185 reports outcome_unknown for a restore while the preceding stop is unsettled", async () => {
    const { context, failedId } = await failedAdjustment();
    await context.setup.database.execute(`UPDATE task_spec_attempts SET state = 'reconciling' WHERE id = '${failedId}'` as never);
    expect(await rejection(context.caller.returnToReview(await context.restore(failedId)))).toMatchObject({ code: "CONFLICT", reason: "outcome_unknown" });
  });

  it("IT-122 and IT-129 report artifact_conflict for a vanished or replaced canonical file while captured V1 stays readable", async () => {
    const context = await reviewedStage();
    const expected = (await context.caller.package({ ...context.scope, packageId: context.saved.packageId })).documents.map((document) => ({ path: document.path, role: document.role, sha256: document.sha256, bytes: document.byteCount }));
    await rm(join(context.canonical, "_tests.md"));
    const verify = () => context.gateway.verify({ taskId: context.setup.taskId, repositoryGithubId: "202", expected }).then(() => null, (error: { reason: string }) => error.reason);
    expect(await verify()).toBe("artifact_conflict");
    await writeFile(join(context.canonical, "_tests.md"), "substituído");
    expect(await verify()).toBe("artifact_conflict");
    expect(await context.caller.package({ ...context.scope, packageId: context.saved.packageId })).toMatchObject({ captureState: "review_ready" });
  });
});
