import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { link, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { eq } from "drizzle-orm";
import { taskSpecPackages, taskSpecStages } from "../src/infra/database/schema";
import { GitSpecWorkspaceGateway } from "../src/infra/spec/workspace/gitWorkspaceGateway";
import { closeTaskFixture } from "./task-api-support";
import { finalizationRoots, harness } from "./spec-finalization-support";
import { rejection, specCaller, specScope, specTask, startInput } from "./spec-support";
import { startWorkflow } from "./spec-seed";

beforeEach(() => vi.stubEnv("TASK_CURSOR_SECRET", "spec-test-cursor-secret"));
afterEach(async () => { await closeTaskFixture(); await Promise.all(finalizationRoots.splice(0).map((root) => rm(root, { recursive: true, force: true }))); });

describe("remaining package and route contracts", () => {
  it("IT-187 blocks approval when the current package is incomplete", async () => {
    const { setup, claim, prepare, finalization } = await harness();
    const good = await prepare();
    await finalization().finalize(claim, good.packageId);
    await setup.database.update(taskSpecPackages).set({ captureState: "partial" }).where(eq(taskSpecPackages.id, good.packageId));
    const caller = specCaller(setup);
    const request = { ...specScope(setup), requestKey: crypto.randomUUID(), expectedSpecVersion: (await caller.byTask(specScope(setup))).specVersion, stage: "tech_spec" as const, packageId: good.packageId, manifestHash: good.manifestHash };
    expect(await rejection(caller.approve(request))).toMatchObject({ code: "PRECONDITION_FAILED", reason: "package_incomplete" });
  });

  it("IT-078 and IT-068 allow only the selected route to start its stage, and never Tasks before TechSpec approval", async () => {
    const tech = await specTask("tech_spec");
    const caller = specCaller(tech);
    expect(await rejection(caller.start(startInput(tech, { stage: "prd" })))).toMatchObject({ reason: "stage_prerequisite" });
    expect((await caller.start(startInput(tech, { stage: "tech_spec" }))).status).toBe("accepted");
    await tech.database.update(taskSpecStages).set({ state: "review" }).where(eq(taskSpecStages.stage, "tech_spec"));
    const version = (await caller.byTask(specScope(tech))).specVersion;
    expect(await rejection(caller.start(startInput(tech, { stage: "tasks", expectedSpecVersion: version })))).toMatchObject({ code: "PRECONDITION_FAILED", reason: "stage_prerequisite" });
  });

  it("IT-219 rejects a hardlinked output as artifact_invalid", async () => {
    const root = await mkdtemp(join(tmpdir(), "spec-link-"));
    finalizationRoots.push(root);
    const workspace = new GitSpecWorkspaceGateway({ root, remoteBase: "http://unused", git: async () => ({ stdout: "" }), resolveIdentity: async () => ({ githubId: "202" }), maxCheckoutBytes: 1e9, fetchTimeoutMs: 1000 });
    const attempt = { taskId: "20000000-0000-4000-8000-000000000001", repositoryGithubId: "202", attemptId: "30000000-0000-4000-8000-000000000001", stage: "tech_spec" as const };
    const paths = await workspace.candidate({ ...attempt, upstream: [], previous: [] });
    await writeFile(join(root, "outside.md"), "x");
    await link(join(root, "outside.md"), join(paths.candidatePath, "_tests.md"));
    expect(await workspace.freeze(attempt).then(() => null, (error: { reason: string }) => error.reason)).toBe("artifact_invalid");
  });
});
