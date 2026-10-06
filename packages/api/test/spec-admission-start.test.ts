import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SpecLifecycleService } from "../src/application/services/spec/specLifecycleService";
import { DrizzleTaskSpecDao } from "../src/infra/database/dao/spec/drizzleTaskSpecDao";
import { EnvironmentSpecAdmission } from "../src/infra/spec/environmentAdmission";
import { COMPOZY_PIN } from "../src/application/spec/specPins";
import { TaskSpecController } from "../src/controllers/taskSpecController";
import { createTaskSpecRouter } from "../src/routers/taskSpec";
import { closeTaskFixture } from "./task-api-support";
import { rejection, specTask, startInput } from "./spec-support";
import { reviewedStage } from "./spec-recovery-support";
import { finalizationRoots } from "./spec-finalization-support";
import { rm } from "node:fs/promises";

beforeEach(() => vi.stubEnv("TASK_CURSOR_SECRET", "spec-test-cursor-secret"));
afterEach(async () => { await closeTaskFixture(); await Promise.all(finalizationRoots.splice(0).map((root) => rm(root, { recursive: true, force: true }))); });

const withAdmission = (setup: Awaited<ReturnType<typeof specTask>>, admission: { assertReady(): Promise<void> }) => {
  const dao = new DrizzleTaskSpecDao(setup.database);
  return createTaskSpecRouter(new TaskSpecController(setup.taskDao, dao, new SpecLifecycleService(dao, admission), setup.repositoryAccess)).createCaller({ principal: { userId: setup.ownerId, sessionId: setup.sessionId }, requestId: "admission" });
};
const complete = { SPEC_ENABLED: "true", SPEC_RUNNER_ID: "r", SPEC_WORKSPACE_ROOT: "/srv", SPEC_RUNTIME_IMAGE: "img", SPEC_PROVIDER: "p", SPEC_MODEL: "m", SPEC_PROVIDER_ACCOUNT_REF: "a", SPEC_DOCS_PROXY_URL: "https://d", SPEC_COMPOZY_BINARY_SHA256: COMPOZY_PIN.binarySha256, SPEC_COMPOZY_OPENAPI_SHA256: COMPOZY_PIN.openApiSha256, SPEC_BUNDLE_SHA256: "b".repeat(64) };

describe("start admission", () => {
  it("IT-180 and IT-181 block start for an unconfigured runner and failed capability pins", async () => {
    const setup = await specTask();
    const unconfigured = withAdmission(setup, new EnvironmentSpecAdmission({}, async () => "b".repeat(64)));
    expect(await rejection(unconfigured.start(startInput(setup)))).toMatchObject({ code: "PRECONDITION_FAILED", reason: "runtime_unconfigured" });
    const drifted = withAdmission(setup, new EnvironmentSpecAdmission({ ...complete, SPEC_COMPOZY_BINARY_SHA256: "d".repeat(64) }, async () => "b".repeat(64)));
    expect(await rejection(drifted.start(startInput(setup)))).toMatchObject({ code: "PRECONDITION_FAILED", reason: "runtime_incompatible" });
    const bundle = withAdmission(setup, new EnvironmentSpecAdmission(complete, async () => "c".repeat(64)));
    expect(await rejection(bundle.start(startInput(setup)))).toMatchObject({ reason: "runtime_incompatible" });
    const ready = withAdmission(setup, new EnvironmentSpecAdmission(complete, async () => "b".repeat(64)));
    expect((await ready.start(startInput(setup))).status).toBe("accepted");
  });

  it("IT-182 blocks the next stage when the stored workspace belongs to another repository", async () => {
    const context = await reviewedStage();
    await context.caller.approve({ ...context.scope, requestKey: crypto.randomUUID(), expectedSpecVersion: await context.version(), stage: "tech_spec", packageId: context.saved.packageId, manifestHash: context.saved.manifestHash });
    await context.controller.tick();
    await context.setup.database.execute(`UPDATE task_spec_workspaces SET repository_github_id = '999'` as never);
    const next = { ...context.scope, requestKey: crypto.randomUUID(), expectedSpecVersion: await context.version(), stage: "tasks" as const };
    expect(await rejection(context.caller.start(next))).toMatchObject({ code: "PRECONDITION_FAILED", reason: "workspace_unavailable" });
  });
});
