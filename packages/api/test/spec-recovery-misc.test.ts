import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { taskSpecApprovals, taskSpecPackages } from "../src/infra/database/schema";
import { closeTaskFixture } from "./task-api-support";
import { finalizationRoots } from "./spec-finalization-support";
import { revisedManifest } from "./spec-fixtures";
import { rejection, specCaller, specScope, specTask, startInput } from "./spec-support";
import { attempts, failAdjustment, reviewedStage, stageRow, type Reviewed } from "./spec-recovery-support";
import { planCheckout } from "../src/infra/spec/workspace/checkoutPlan";

beforeEach(() => vi.stubEnv("TASK_CURSOR_SECRET", "spec-test-cursor-secret"));
afterEach(async () => { await closeTaskFixture(); await Promise.all(finalizationRoots.splice(0).map((root) => rm(root, { recursive: true, force: true }))); });

const approve = async (context: Reviewed, overrides: Record<string, unknown> = {}) => ({ ...context.scope, requestKey: crypto.randomUUID(), expectedSpecVersion: await context.version(), stage: "tech_spec" as const, packageId: context.saved.packageId, manifestHash: context.saved.manifestHash, ...overrides });

describe("approval and recovery contracts", () => {
  it("IT-091 and IT-098 hide a foreign package and block Tasks before TechSpec approval", async () => {
    const context = await reviewedStage();
    expect(await rejection(context.caller.approve(await approve(context, { packageId: crypto.randomUUID() })))).toMatchObject({ code: "NOT_FOUND", reason: "spec_unavailable" });
    expect(await rejection(context.caller.approve(await approve(context, { stage: "tasks" })))).toMatchObject({ code: "PRECONDITION_FAILED", reason: "stage_prerequisite" });
  });

  it("IT-092 withholds approval of a captured package whose required companion is absent", async () => {
    const context = await reviewedStage();
    const partial = await context.capture.capture({ workflowId: context.started.workflowId, attemptId: context.started.attemptId, stage: "tech_spec", manifest: { stage: "tech_spec", entries: [], files: [], complete: false, missing: ["_tests.md"] }, upstream: [] });
    expect(await rejection(context.caller.approve(await approve(context, { packageId: partial.packageId, manifestHash: partial.manifestHash })))).toMatchObject({ code: "PRECONDITION_FAILED", reason: "package_incomplete" });
  });

  it("IT-095, IT-096 and IT-097 keep one immutable approval for concurrent, lost-response and later replays", async () => {
    const context = await reviewedStage();
    const first = await approve(context);
    const results = await Promise.allSettled([context.caller.approve(first), context.caller.approve({ ...first, requestKey: crypto.randomUUID() })]);
    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    await context.controller.tick();
    const [approval] = await context.setup.database.select().from(taskSpecApprovals);
    expect(await context.setup.database.select().from(taskSpecApprovals)).toHaveLength(1);
    expect(await context.caller.submission({ ...context.scope, action: "spec.approve", requestKey: first.requestKey })).toMatchObject({ status: "known" });
    const replayed = await context.caller.approve(first).catch(() => null);
    await context.controller.tick();
    expect((await context.setup.database.select().from(taskSpecApprovals))[0]).toEqual(approval);
    expect(replayed === null || replayed.status !== undefined).toBe(true);
    expect((await attempts(context.setup)).filter((attempt) => attempt.state === "queued")).toHaveLength(0);
  });

  it("IT-123 returns package_limit above 8 MiB and leaves the prior complete package unchanged", async () => {
    const context = await reviewedStage();
    const extra = Object.fromEntries(Array.from({ length: 9 }, (_, index) => [`adrs/adr-${String(index + 1).padStart(3, "0")}.md`, `# ADR\n\n${"a".repeat(1024 * 1024 - 8)}`]));
    const result = await context.capture.capture({ workflowId: context.started.workflowId, attemptId: context.started.attemptId, stage: "tech_spec", manifest: revisedManifest("tech-spec-route", "tech_spec", extra), upstream: [] });
    expect(result).toMatchObject({ valid: false, reason: "package_limit", captureState: "partial" });
    expect((await stageRow(context.setup)).currentPackageId).toBe(context.saved.packageId);
    expect((await context.setup.database.select().from(taskSpecPackages)).find((pkg) => pkg.id === context.saved.packageId)).toMatchObject({ captureState: "review_ready" });
  });

  it("IT-124 refuses a document identity that belongs to another revision", async () => {
    const context = await reviewedStage();
    const other = await context.capture.capture({ workflowId: context.started.workflowId, attemptId: context.started.attemptId, stage: "tech_spec", manifest: revisedManifest("tech-spec-route", "tech_spec", { "_techspec.md": "# Outra revisão\n" }), upstream: [] });
    const foreign = (await context.caller.package({ ...context.scope, packageId: other.packageId })).documents[0]!;
    expect(await rejection(context.caller.document({ ...context.scope, packageId: context.saved.packageId, documentId: foreign.id, limit: 10 }))).toMatchObject({ code: "NOT_FOUND", reason: "spec_unavailable" });
  });

  it("IT-128 infers no completion or approval from unassociated files on disk", async () => {
    const setup = await specTask("tech_spec");
    const plan = planCheckout({ root: finalizationRootFor(), repositoryGithubId: "202", taskId: setup.taskId });
    await mkdir(dirname(join(plan.canonicalPath, "_techspec.md")), { recursive: true });
    await writeFile(join(plan.canonicalPath, "_techspec.md"), "# Solto\n");
    expect(await specCaller(setup).byTask(specScope(setup))).toMatchObject({ state: "not_started", stages: [] });
    expect(await setup.database.select().from(taskSpecApprovals)).toHaveLength(0);
  });

  it("IT-195 maps a GitHub rate limit during pre-acceptance validation to provider_rate_limited with retryAfterSeconds", async () => {
    const context = await reviewedStage();
    const { receipt } = await failAdjustment(context);
    const retryInput = await context.retry(receipt.attemptId!);
    const startRequest = startInput(context.setup);
    context.setup.githubFetcher.mockImplementation(async () => new Response(JSON.stringify({ message: "rate limit" }), { status: 429, headers: { "retry-after": "30" } }));
    const retry = await rejection(context.caller.retry(retryInput));
    expect(retry).toMatchObject({ code: "TOO_MANY_REQUESTS", reason: "provider_rate_limited" });
    expect(retry?.retryAfterSeconds).toBe(30);
    expect(await rejection(context.caller.start(startRequest))).toMatchObject({ code: "TOO_MANY_REQUESTS", reason: "provider_rate_limited" });
  });
});

function finalizationRootFor() {
  return finalizationRoots[0] ?? "/tmp/spec-none";
}
