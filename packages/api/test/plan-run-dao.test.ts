import { afterEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { taskSessionPlanRuns, taskSessionPlans } from "../src/infra/database/schema";
import { DrizzlePlanRunDao } from "../src/infra/database/dao/plans/drizzlePlanRunDao";
import { seedStoredPlan, seedTaskSet } from "./plan-support";
import { closeTaskFixture } from "./task-api-support";
import { taskSetWorld } from "./task-set-support";
import { cleanupTerminalFolders } from "./terminal-support";

afterEach(async () => {
  await closeTaskFixture();
  await cleanupTerminalFolders();
});

async function runWorld() {
  const world = await taskSetWorld();
  await seedTaskSet(world, { ids: ["task_01"] });
  const { plan } = await seedStoredPlan(world, { items: [{ taskIds: ["task_01"] }] });
  const runs = new DrizzlePlanRunDao(world.setup.database);
  const input = { planId: plan.id, hostId: "host-test", startedBy: world.setup.ownerId, requestKey: crypto.randomUUID() };
  return { world, plan, runs, input };
}

async function violated(operation: Promise<unknown>) {
  return operation.then(() => null, (error: { cause?: { constraint_name?: string } }) => error.cause?.constraint_name ?? "other");
}

describe("DrizzlePlanRunDao", () => {
  it("V-04a moves the run only with the current revision, and returns null with an old one", async () => {
    const { world, runs, input } = await runWorld();
    const created = await runs.create(input);
    expect(created).toMatchObject({ state: "running", revision: 1, resumeCount: 0, taskId: world.setup.taskId, projectId: world.setup.project.id, pausedByName: null });
    const paused = await runs.transition({ runId: created.id, revision: 1, next: { state: "paused", pausedBy: world.setup.ownerId } });
    expect(paused).toMatchObject({ state: "paused", revision: 2, pausedBy: world.setup.ownerId });
    expect(paused!.pausedByName).not.toBeNull();
    expect(await runs.transition({ runId: created.id, revision: 1, next: { state: "running" } })).toBeNull();
    expect(await runs.findByPlan(input.planId)).toMatchObject({ state: "paused", revision: 2 });
    const restarted = await runs.restart({ runId: created.id, revision: 2, hostId: "host-2", startedBy: world.setup.ownerId, requestKey: crypto.randomUUID() });
    expect(restarted).toMatchObject({ state: "running", revision: 3, resumeCount: 1, hostId: "host-2", pausedBy: null, pauseReason: null });
  });

  it("V-04b keeps one run per plan and deletes it with the plan", async () => {
    const { world, plan, runs, input } = await runWorld();
    await runs.create(input);
    expect(await violated(runs.create({ ...input, requestKey: crypto.randomUUID() }))).toBe("task_session_plan_runs_plan_id_unique");
    expect(await runs.findByRequestKey(world.setup.ownerId, input.requestKey)).toMatchObject({ planId: plan.id });
    await world.setup.database.delete(taskSessionPlans).where(eq(taskSessionPlans.id, plan.id));
    expect(await world.setup.database.select().from(taskSessionPlanRuns)).toEqual([]);
  });
});
