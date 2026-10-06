import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";
import { taskSpecDocuments, taskSpecPackages, taskSpecWorkflows } from "../src/infra/database/schema";
import { DrizzleTaskSpecCaptureDao } from "../src/infra/database/dao/spec/drizzleTaskSpecCaptureDao";
import { SpecCaptureService } from "../src/application/services/spec/specCaptureService";
import type { CandidateManifest } from "../src/application/spec/specWorkspaceGateway";
import { sha256Of } from "../src/infra/spec/workspace/fileHash";
import { closeTaskFixture } from "./task-api-support";
import { fixtureFiles, fixtureManifest, manifestOf } from "./spec-fixtures";
import { specTask } from "./spec-support";
import { startWorkflow } from "./spec-seed";

beforeEach(() => vi.stubEnv("TASK_CURSOR_SECRET", "spec-test-cursor-secret"));
afterEach(closeTaskFixture);

function candidate(files: Record<string, string>, complete: boolean): CandidateManifest {
  const entries = Object.entries(files).map(([path, content]) => ({ path, role: "doc", sha256: sha256Of(content), bytes: Buffer.byteLength(content) }));
  return { stage: "tech_spec", entries, files: Object.entries(files).map(([path, content]) => ({ path, content })), complete, missing: complete ? [] : ["_tests.md"] };
}

describe("spec capture persistence", () => {
  it("IT-066 retains a partial package without review readiness", async () => {
    const setup = await specTask("tech_spec");
    const started = await startWorkflow(setup, "tech_spec");
    const service = new SpecCaptureService(new DrizzleTaskSpecCaptureDao(setup.database));
    const result = await service.capture({ workflowId: started.workflowId, attemptId: started.attemptId, stage: "tech_spec", manifest: candidate({ "_techspec.md": "# Spec" }, false), upstream: [] });
    expect(result).toMatchObject({ captureState: "partial", reviewReady: false, revision: 1 });
    const [pkg] = await setup.database.select().from(taskSpecPackages);
    expect(pkg?.diagnostics).toEqual(expect.arrayContaining([expect.objectContaining({ code: "missing_required_document", severity: "blocking" })]));
    expect((await setup.database.select().from(taskSpecWorkflows))[0]?.state).toBe("queued");
  });

  it("IT-067 and IT-127 return one package for the same attempt and manifest", async () => {
    const setup = await specTask("tech_spec");
    const started = await startWorkflow(setup, "tech_spec");
    const service = new SpecCaptureService(new DrizzleTaskSpecCaptureDao(setup.database));
    const input = { workflowId: started.workflowId, attemptId: started.attemptId, stage: "tech_spec" as const, manifest: fixtureManifest("tech-spec-route", "tech_spec"), upstream: [] };
    const results = await Promise.all([service.capture(input), service.capture(input), service.capture(input)]);
    expect(new Set(results.map((result) => result.packageId)).size).toBe(1);
    expect(results.filter((result) => result.created)).toHaveLength(1);
    expect(await setup.database.select().from(taskSpecPackages)).toHaveLength(1);
    expect(await setup.database.select().from(taskSpecDocuments)).toHaveLength(3);
    expect((await setup.database.select().from(taskSpecPackages).where(eq(taskSpecPackages.id, results[0]!.packageId)))[0]?.captureState).toBe("prepared");
  });

  it("assigns increasing revisions to different manifests of the same stage", async () => {
    const setup = await specTask("tech_spec");
    const started = await startWorkflow(setup, "tech_spec");
    const service = new SpecCaptureService(new DrizzleTaskSpecCaptureDao(setup.database));
    const base = { workflowId: started.workflowId, attemptId: started.attemptId, stage: "tech_spec" as const, upstream: [] };
    const first = await service.capture({ ...base, manifest: candidate({ "_techspec.md": "v1" }, false) });
    const second = await service.capture({ ...base, manifest: candidate({ "_techspec.md": "v2" }, false), parentPackageId: first.packageId });
    expect([first.revision, second.revision]).toEqual([1, 2]);
  });

  it("UT-011 turns a complete package with a matching source index into a prepared candidate", async () => {
    const setup = await specTask("prd");
    const started = await startWorkflow(setup);
    const service = new SpecCaptureService(new DrizzleTaskSpecCaptureDao(setup.database));
    const result = await service.capture({ workflowId: started.workflowId, attemptId: started.attemptId, stage: "prd", manifest: fixtureManifest("prd-route", "prd"), upstream: [] });
    expect(result).toMatchObject({ captureState: "prepared", valid: true, reason: null, reviewReady: false });
  });

  it("UT-012 returns artifact_invalid when a required story companion is missing", async () => {
    const setup = await specTask("prd");
    const started = await startWorkflow(setup);
    const files = fixtureFiles("prd-route", "prd");
    delete files["_user_stories.md"];
    const service = new SpecCaptureService(new DrizzleTaskSpecCaptureDao(setup.database));
    const result = await service.capture({ workflowId: started.workflowId, attemptId: started.attemptId, stage: "prd", manifest: manifestOf(files, "prd"), upstream: [] });
    expect(result).toMatchObject({ captureState: "partial", valid: false, reason: "artifact_invalid" });
  });

  it("IT-076 retains the two files written before a failure without review readiness", async () => {
    const setup = await specTask("tech_spec");
    const started = await startWorkflow(setup, "tech_spec");
    const files = fixtureFiles("tech-spec-route", "tasks");
    const tasks = { "_tasks.md": files["_tasks.md"]!, "task_01.md": files["task_01.md"]! };
    const service = new SpecCaptureService(new DrizzleTaskSpecCaptureDao(setup.database));
    const result = await service.capture({ workflowId: started.workflowId, attemptId: started.attemptId, stage: "tasks", manifest: manifestOf(tasks, "tasks"), upstream: [] });
    expect(result).toMatchObject({ captureState: "partial", reviewReady: false });
    expect(await setup.database.select().from(taskSpecDocuments)).toHaveLength(2);
  });
});
