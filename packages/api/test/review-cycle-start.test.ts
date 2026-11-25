import { afterEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { projectLocalCheckouts, taskReviewCycles } from "../src/infra/database/schema";
import { DrizzleReviewCycleDao } from "../src/infra/database/dao/review/drizzleReviewCycleDao";
import { closeTaskFixture } from "./task-api-support";
import { CODEX, NO_CODEX_LOGIN, REVIEW_TASK_IDS, reviewCycleRows, reviewCycleWorld, reviewInput, seedActiveReviewSessions, seedReviewTasks } from "./review-cycle-support";
import { seedTaskSet } from "./plan-support";

afterEach(closeTaskFixture);

describe("review cycle get", () => {
  it("V-04a returns default choices and the task counts when no cycle exists", async () => {
    const world = await reviewCycleWorld();
    const ids = Array.from({ length: 7 }, (_value, index) => `task_${String(index + 1).padStart(2, "0")}`);
    await seedTaskSet(world, { ids, statuses: Object.fromEntries(ids.map((id) => [id, "completed"])) });
    const view = await world.service.get({ taskId: world.setup.taskId });
    expect(view).toMatchObject({ cycle: null, defaults: { reviewer: { agent: "claude", model: "opus", effort: "max" }, executor: { agent: "claude", model: "opus", effort: "max" } }, tasks: { total: 7, completed: 7 }, activeSessions: 0 });
  });

  it("V-04b defaults to the reviewer and executor choices from the latest cycle", async () => {
    const world = await reviewCycleWorld();
    const ids = ["task_01"];
    await seedTaskSet(world, { ids, statuses: { task_01: "completed" } });
    const cycles = new DrizzleReviewCycleDao(world.setup.database);
    const cycle = await cycles.create({ taskId: world.setup.taskId, projectId: world.setup.project.id, hostId: "host-test", startedBy: world.setup.ownerId, requestKey: crypto.randomUUID(), reviewer: { agent: "claude", model: "sonnet", effort: "high" }, executor: { agent: "codex", model: "gpt-5", effort: "medium" }, tasksFolder: "docs/specs/login", partial: false });
    await world.setup.database.update(taskReviewCycles).set({ state: "approved" }).where(eq(taskReviewCycles.id, cycle.id));
    const view = await world.service.get({ taskId: world.setup.taskId });
    expect(view.defaults).toEqual({ reviewer: { agent: "claude", model: "sonnet", effort: "high" }, executor: { agent: "codex", model: "gpt-5", effort: "medium" } });
  });

  it("V-04c rejects incomplete tasks unless partial review is selected", async () => {
    const world = await reviewCycleWorld();
    await seedReviewTasks(world, [REVIEW_TASK_IDS[4]!, REVIEW_TASK_IDS[5]!]);
    await expect(world.service.start(reviewInput(world))).rejects.toMatchObject({ reason: "review_tasks_incomplete", fieldErrors: { count: "2", total: "7" } });
    expect(await reviewCycleRows(world)).toHaveLength(0);
    const cycle = await world.service.start(reviewInput(world, { partial: true }));
    expect(cycle).toMatchObject({ state: "reviewing", round: 1, partial: true });
    expect(await reviewCycleRows(world)).toHaveLength(1);
  });

  it("V-04d refuses Codex when this machine has no Codex login", async () => {
    const world = await reviewCycleWorld({ codexProbe: NO_CODEX_LOGIN });
    await seedReviewTasks(world);
    await expect(world.service.start(reviewInput(world, { executor: CODEX }))).rejects.toMatchObject({ reason: "agent_unavailable" });
    expect(await reviewCycleRows(world)).toHaveLength(0);
  });

  it("V-04d refuses when the session service is stopped", async () => {
    const world = await reviewCycleWorld({ serviceRunning: false });
    await seedReviewTasks(world);
    await expect(world.service.start(reviewInput(world))).rejects.toMatchObject({ reason: "session_service_offline" });
    expect(await reviewCycleRows(world)).toHaveLength(0);
  });

  it("V-04d refuses when the project checkout is missing", async () => {
    const world = await reviewCycleWorld();
    await seedReviewTasks(world);
    await world.setup.database.delete(projectLocalCheckouts).where(eq(projectLocalCheckouts.projectId, world.setup.project.id));
    await expect(world.service.start(reviewInput(world))).rejects.toMatchObject({ reason: "checkout_missing" });
    expect(await reviewCycleRows(world)).toHaveLength(0);
  });

  it("V-04d refuses when a required skill is missing", async () => {
    const world = await reviewCycleWorld({ missingSkills: ["spec-writer"] });
    await seedReviewTasks(world);
    await expect(world.service.start(reviewInput(world))).rejects.toMatchObject({ reason: "skill_missing" });
    expect(await reviewCycleRows(world)).toHaveLength(0);
  });

  it("V-04e returns the original cycle for a repeated request key", async () => {
    const world = await reviewCycleWorld();
    await seedReviewTasks(world);
    const input = reviewInput(world);
    const first = await world.service.start(input);
    const second = await world.service.start(input);
    expect(second.id).toBe(first.id);
    expect(await reviewCycleRows(world)).toHaveLength(1);
  });

  it("V-04f rejects a new start while an active cycle exists", async () => {
    const world = await reviewCycleWorld();
    await seedReviewTasks(world);
    const first = await world.service.start(reviewInput(world));
    await world.setup.database.update(taskReviewCycles).set({ state: "executing" }).where(eq(taskReviewCycles.id, first.id));
    await expect(world.service.start(reviewInput(world, { requestKey: "30000000-0000-4000-8000-000000000002" }))).rejects.toMatchObject({ reason: "review_cycle_active" });
    expect(await reviewCycleRows(world)).toHaveLength(1);
  });

  it("V-04f requires confirmation before starting with open sessions", async () => {
    const world = await reviewCycleWorld();
    await seedReviewTasks(world);
    await seedActiveReviewSessions(world, 2);
    await expect(world.service.start(reviewInput(world))).rejects.toMatchObject({ reason: "review_sessions_open", fieldErrors: { count: "2" } });
    expect(await reviewCycleRows(world)).toHaveLength(0);
    const cycle = await world.service.start(reviewInput(world, { allowOpenSessions: true }));
    expect(cycle.state).toBe("reviewing");
    expect(await reviewCycleRows(world)).toHaveLength(1);
  });
});
