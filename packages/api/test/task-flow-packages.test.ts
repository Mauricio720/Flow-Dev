import { afterEach, describe, expect, it } from "vitest";
import { sql } from "drizzle-orm";
import type { PackageFile } from "../src/application/services/task-flow/artifactValidator";
import { PackageCapture } from "../src/application/services/task-flow/packageCapture";
import { UnifiedPackageGate } from "../src/application/services/task-flow/unifiedPackageGate";
import { DrizzleFlowUnitOfWork } from "../src/infra/database/dao/tasks/drizzleFlowUnitOfWork";
import { failureOf } from "./software-support";
import { closeTaskFixture } from "./task-api-support";
import { seedReviewPackage, startWorkflow } from "./spec-seed";
import { LEASE_MS, ScriptedExecutor, dispatcherFor, flowFixture, flowKey, skillAction, type FlowFixture } from "./task-flow-fixture";

let current: FlowFixture | undefined;
afterEach(async () => { await closeTaskFixture(); current = undefined; });

const SPEC = "# Spec\n\n## Executive Summary\n\nResumo.\n\n## Product\n\nQuem usa.\n\n## Technical\n\nComo funciona.\n";
const VALID_FILES: PackageFile[] = [{ path: "_spec.md", content: SPEC }, ...["_user_stories.md", "_dx.md", "_tests.md"].map((path) => ({ path, content: `# ${path}\n\nconteúdo` }))];

async function completedSpecRun(fixture: FlowFixture, files: PackageFile[]) {
  const connectionId = await fixture.connection();
  await fixture.author.savePlan({ ...fixture.scope, actions: [skillAction(connectionId)], expectedRevision: 0, idempotencyKey: flowKey() });
  const plan = (await fixture.author.byTask(fixture.scope)).plan!;
  await fixture.author.startAction({ ...fixture.scope, actionId: plan.actions[0]!.id, expectedRevision: plan.revision, idempotencyKey: flowKey() });
  const capture = new PackageCapture(new DrizzleFlowUnitOfWork(fixture.setup.database), { read: async () => files });
  let now = new Date();
  await dispatcherFor(fixture, new ScriptedExecutor(), () => now, "w1", capture).runOnce();
  now = new Date(now.getTime() + LEASE_MS + 1000);
  await dispatcherFor(fixture, new ScriptedExecutor(), () => now, "w2", capture).runOnce();
  return plan;
}

describe("unified spec packages", () => {
  it("captures one immutable package version per successful create_spec run", async () => {
    current = await flowFixture();
    await completedSpecRun(current, VALID_FILES);
    const view = await current.reader.byTask(current.scope);
    expect(view.packages).toHaveLength(1);
    expect(view.packages[0]).toMatchObject({ version: 1, status: "review_ready", format: "os_spec_v1", files: [{ path: "_dx.md" }, { path: "_spec.md", role: "spec", required: true }, { path: "_tests.md" }, { path: "_user_stories.md" }] });
    const documents = await current.reader.package({ ...current.scope, packageId: view.packages[0]!.id });
    expect(documents.documents.find((file) => file.role === "spec")?.sourceText).toBe(SPEC);
    await expect(current.setup.database.execute(sql`UPDATE task_unified_package_files SET source_text='x'`)).rejects.toThrow();
  });

  it("UT-017 settles an invalid package as failed package_invalid without creating a review package", async () => {
    current = await flowFixture();
    await completedSpecRun(current, [{ path: "_spec.md", content: "# Spec\n\n## Product\n\nSó produto.\n" }, ...VALID_FILES.slice(1)]);
    expect((await current.reader.byTask(current.scope)).packages).toEqual([]);
    expect((await current.reader.runs(current.scope)).items[0]).toMatchObject({ state: "failed", terminalCode: "package_invalid" });
  });

  it("IT-106, IT-107 and UT-015 approve only the exact current version and then enable create_tasks", async () => {
    current = await flowFixture();
    await completedSpecRun(current, VALID_FILES);
    const [pkg] = (await current.reader.byTask(current.scope)).packages;
    const approve = (version: number, key = flowKey()) => current!.author.approvePackage({ ...current!.scope, packageId: pkg!.id, version, idempotencyKey: key });
    expect(await failureOf(approve(2))).toEqual({ code: "CONFLICT", reason: "package_version_changed" });
    expect((await current.author.byTask(current.scope)).packages[0]?.status).toBe("review_ready");
    expect(await failureOf(current.reader.approvePackage({ ...current.scope, packageId: pkg!.id, version: 1, idempotencyKey: flowKey() }))).toMatchObject({ code: "FORBIDDEN" });
    const key = flowKey();
    const approved = await approve(1, key);
    expect(approved).toMatchObject({ packageId: pkg!.id, version: 1, status: "approved" });
    expect(await approve(1, key)).toEqual(approved);
    expect((await current.author.runs(current.scope)).items).toHaveLength(1);
  });

  it("supersedes older versions and refuses to approve a stale one", async () => {
    current = await flowFixture();
    const capture = new PackageCapture(new DrizzleFlowUnitOfWork(current.setup.database), { read: async () => VALID_FILES });
    await completedSpecRun(current, VALID_FILES);
    const [first] = (await current.reader.byTask(current.scope)).packages;
    await current.setup.database.execute(sql`UPDATE task_execution_runs SET state='failed'`);
    const run = (await current.flow.runs.list({ taskId: current.scope.taskId, limit: 1 })).items[0]!;
    await capture.capture(run);
    const packages = (await current.reader.byTask(current.scope)).packages;
    expect(packages.map((item) => [item.version, item.status])).toEqual([[2, "review_ready"], [1, "superseded"]]);
    expect(await failureOf(current.author.approvePackage({ ...current.scope, packageId: first!.id, version: 1, idempotencyKey: flowKey() }))).toEqual({ code: "CONFLICT", reason: "package_version_changed" });
  });

  it("IT-106 keeps create_tasks success separate from explicit approval of the captured package", async () => {
    current = await flowFixture();
    await completedSpecRun(current, VALID_FILES);
    const run = (await current.flow.runs.list({ taskId: current.scope.taskId, limit: 1 })).items[0]!;
    const taskFiles: PackageFile[] = [{ path: "_tasks.md", content: "# Tasks\n\n## Ordering\n" }, { path: "task_01.md", content: "# Task 01\n\nImplementa." }];
    const capture = new PackageCapture(new DrizzleFlowUnitOfWork(current.setup.database), { read: async () => taskFiles });
    const taskRun = { ...run, snapshot: { ...run.snapshot, kind: "create_tasks" } } as never;
    await capture.capture(taskRun);
    const gate = new UnifiedPackageGate({ eligibility: async () => ({ canPlan: true, reason: null }) }, current.flow);
    const [latest] = (await current.reader.byTask(current.scope)).packages;
    expect(latest).toMatchObject({ format: "os_tasks_v1", status: "review_ready", files: [{ path: "_tasks.md", role: "tasks_manifest" }, { path: "task_01.md", role: "task" }] });
    expect(await gate.approvedTasks(current.scope.taskId)).toBe(false);
    await current.author.approvePackage({ ...current.scope, packageId: latest!.id, version: latest!.version, idempotencyKey: flowKey() });
    expect(await gate.approvedTasks(current.scope.taskId)).toBe(true);
  });

  it("IT-104 keeps a legacy split-stage task on its route with its package IDs and creates no unified spec", async () => {
    current = await flowFixture();
    const started = await startWorkflow(current.setup);
    const legacyPackage = await seedReviewPackage(current.setup, started);
    const connectionId = await current.connection();
    const view = await current.author.byTask(current.scope);
    expect(view).toMatchObject({ flow: "legacy", plan: null, packages: [], legacy: { workflowId: started.workflowId, stages: expect.arrayContaining([expect.objectContaining({ stage: "prd", currentPackageId: legacyPackage.id })]) } });
    expect(await failureOf(current.author.savePlan({ ...current.scope, actions: [skillAction(connectionId)], expectedRevision: 0, idempotencyKey: flowKey() }))).toEqual({ code: "PRECONDITION_FAILED", reason: "legacy_flow_active" });
    expect(await current.author.options(current.scope)).toMatchObject({ flow: "legacy", planningAvailable: false, planningReason: "legacy_flow_active" });
    expect((await current.setup.database.execute(sql`SELECT count(*)::int AS count FROM task_execution_plans`))[0]).toMatchObject({ count: 0 });
  });
});
