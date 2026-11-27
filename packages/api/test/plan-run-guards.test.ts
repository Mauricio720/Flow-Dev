import { afterEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { taskArtifactVersions, taskArtifacts, taskIssueClaims, taskPlanningDecisions, taskSessionPlans, taskTerminalRequests, tasks } from "../src/infra/database/schema";
import { PlanRunGuards } from "../src/application/services/plan-run/planRunGuards";
import { PlanRunPauser } from "../src/application/services/plan-run/planRunPauser";
import { TaskSetLoader } from "../src/application/services/tasks-set/taskSetLoader";
import { DrizzleTaskSetReadDao } from "../src/infra/database/dao/artifacts/drizzleTaskSetReadDao";
import { DrizzleIssueClaimDao } from "../src/infra/database/dao/assigned-issues/drizzleIssueClaimDao";
import { DrizzleExecutionPlanDao } from "../src/infra/database/dao/plans/drizzleExecutionPlanDao";
import { DrizzlePlanRunDao } from "../src/infra/database/dao/plans/drizzlePlanRunDao";
import { DrizzlePlanRunWorkerDao } from "../src/infra/database/dao/plans/drizzlePlanRunWorkerDao";
import { DrizzleTerminalSessionDao } from "../src/infra/database/dao/terminal/drizzleTerminalSessionDao";
import { planRunWorld, seedTwoSessionPlan, silentLog, startInput } from "./plan-run-support";
import { closeTaskFixture } from "./task-api-support";
import { seedSession } from "./terminal-execution-support";
import { cleanupTerminalFolders } from "./terminal-support";

afterEach(async () => {
  await closeTaskFixture();
  await cleanupTerminalFolders();
});

async function guardWorld() {
  const world = await planRunWorld();
  await seedTwoSessionPlan(world);
  await world.service.start(startInput(world));
  const { database } = world.setup;
  const runs = new DrizzlePlanRunDao(database);
  const guards = new PlanRunGuards({ claims: new DrizzleIssueClaimDao(database), planning: new DrizzleTerminalSessionDao(database), plans: new DrizzleExecutionPlanDao(database), loader: new TaskSetLoader(new DrizzleTaskSetReadDao(database)), pauser: new PlanRunPauser({ runs, log: silentLog }) });
  const [plan] = await database.select().from(taskSessionPlans);
  const run = async () => (await runs.findByPlan(plan!.id))!;
  return { world, guards, run };
}

async function invalidateManifest(world: Awaited<ReturnType<typeof planRunWorld>>) {
  const [artifact] = await world.setup.database.select().from(taskArtifacts).where(eq(taskArtifacts.relativePath, "docs/specs/login/_tasks.md"));
  const version = artifact!.latestVersion + 1;
  const content = "manifesto ilegível";
  await world.setup.database.insert(taskArtifactVersions).values({ artifactId: artifact!.id, version, skill: "spec-to-tasks", content, sha256: String(version).padEnd(64, "0"), byteSize: content.length, trigger: "stop", capturedAt: new Date() });
  await world.setup.database.update(taskArtifacts).set({ latestVersion: version }).where(eq(taskArtifacts.id, artifact!.id));
}

async function pausedReason(context: Awaited<ReturnType<typeof guardWorld>>) {
  expect(await context.guards.check(await context.run())).toBeNull();
  const after = await context.run();
  return [after.state, after.pauseReason];
}

describe("PlanRunGuards", () => {
  it("V-06c pauses when the person who ran the plan is no longer the operator", async () => {
    const context = await guardWorld();
    await context.world.setup.database.delete(taskIssueClaims).where(eq(taskIssueClaims.taskId, context.world.setup.taskId));
    expect(await pausedReason(context)).toEqual(["paused", "A operadora da feature mudou."]);
  });

  it("V-06d pauses when a replan left the planning not approved", async () => {
    const context = await guardWorld();
    await context.world.setup.database.update(tasks).set({ planningStatus: "review" }).where(eq(tasks.id, context.world.setup.taskId));
    expect(await pausedReason(context)).toEqual(["paused", "O planejamento não está mais aprovado."]);
  });

  it("V-06e pauses when the task set cannot be read", async () => {
    const context = await guardWorld();
    await invalidateManifest(context.world);
    expect(await pausedReason(context)).toEqual(["paused", "O conjunto de tarefas não pode ser lido."]);
  });

  it("V-06f pauses when the tasks folder changed", async () => {
    const context = await guardWorld();
    await context.world.setup.database.update(taskSessionPlans).set({ tasksFolder: "docs/specs/antiga" });
    expect(await pausedReason(context)).toEqual(["paused", "A pasta das tarefas mudou. Revise o plano."]);
  });

  it("lets a healthy run go on with its plan and task set", async () => {
    const context = await guardWorld();
    expect(await context.guards.check(await context.run())).toMatchObject({ plan: { tasksFolder: "docs/specs/login" }, set: { problem: null } });
  });
});

describe("DrizzlePlanRunWorkerDao.agentWorking", () => {
  it("V-06g counts working sessions of any purpose of this feature and ignores idle ones and other features", async () => {
    const world = await planRunWorld();
    const { database } = world.setup;
    const [decision] = await database.select().from(taskPlanningDecisions);
    const dao = new DrizzlePlanRunWorkerDao(database);
    const seed = (overrides: Record<string, unknown>) => seedSession({ setup: world.setup, decisionId: decision!.id }, overrides);
    for (const status of ["waiting", "interrupted", "ended", "launch_failed"]) await seed({ status });
    expect(await dao.agentWorking(world.setup.taskId)).toBe(false);
    const waiting = await seed({ status: "waiting" });
    await database.insert(taskTerminalRequests).values({ sessionId: waiting.id, kind: "permission", toolUseId: "tool-1", payload: {} });
    expect(await dao.agentWorking(world.setup.taskId)).toBe(true);
    await database.update(taskTerminalRequests).set({ status: "answered" });
    expect(await dao.agentWorking(world.setup.taskId)).toBe(false);
    await seed({ status: "asking", purpose: "plan_item" });
    expect(await dao.agentWorking(world.setup.taskId)).toBe(true);
    expect(await dao.agentWorking(crypto.randomUUID())).toBe(false);
  });
});
