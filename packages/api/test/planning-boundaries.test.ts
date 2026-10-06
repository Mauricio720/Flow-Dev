import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";
import { taskDraftRevisions, taskOperations, taskPublicationAttempts, tasks } from "../src/infra/database/schema";
import { closeTaskFixture, draft } from "./task-api-support";
import { boundaryCaller } from "./task-api-boundary-support";
import { githubResponse, repository } from "./fixture";
import { planningBase, planningCaller, publishedTask, rejection, seedPlanOperation, seedReview, type PlanningSetup } from "./planning-support";

beforeEach(() => vi.stubEnv("TASK_CURSOR_SECRET", "task-test-cursor-secret"));
afterEach(closeTaskFixture);

describe("planning with existing task flows", () => {
  const states: Array<[string, (setup: PlanningSetup) => Promise<void>]> = [
    ["awaiting", async () => {}],
    ["running", (setup) => seedPlanOperation(setup, "running")],
    ["failed", (setup) => seedPlanOperation(setup, "failed", undefined, "failed")],
    ["review", (setup) => seedReview(setup)],
  ];

  it.each(states)("IT-066 keeps the confirmed Issue frozen while planning is %s", async (_name, prepare) => {
    const setup = await publishedTask();
    await prepare(setup);
    const caller = boundaryCaller(setup, setup.ownerId);
    const base = { projectId: setup.project.id, taskId: setup.taskId, expectedVersion: 7 };
    const results = await Promise.allSettled([
      caller.send({ ...base, requestKey: crypto.randomUUID(), message: "Mudar" }),
      caller.saveDraft({ ...base, requestKey: crypto.randomUUID(), baseRevisionId: setup.revisionId, draft, evidenceBindings: [] }),
      caller.retryGeneration({ ...base, requestKey: crypto.randomUUID(), failedOperationId: crypto.randomUUID() }),
      caller.publish({ ...base, requestKey: crypto.randomUUID(), revisionId: setup.revisionId, repositoryId: "202", previewHash: "a".repeat(64) }),
    ]);
    expect(results.every((result) => result.status === "rejected")).toBe(true);
    expect(await setup.database.select().from(taskPublicationAttempts)).toHaveLength(1);
    expect(await setup.database.select().from(taskDraftRevisions)).toHaveLength(1);
    expect((await setup.database.select().from(tasks).where(eq(tasks.id, setup.taskId)))[0]).toMatchObject({ status: "published", title: "Corrigir total" });
  });

  it("IT-079 joins a pending start by replaying the identical key after commit", async () => {
    const setup = await publishedTask();
    await setup.database.execute(`CREATE FUNCTION slow_receipt() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN PERFORM pg_sleep(1); RETURN NEW; END; $$` as never);
    await setup.database.execute(`CREATE TRIGGER slow_receipt BEFORE INSERT ON task_command_receipts FOR EACH ROW EXECUTE FUNCTION slow_receipt()` as never);
    const caller = planningCaller(setup);
    const input = planningBase(setup);
    const first = caller.planning.start(input);
    await new Promise((resolve) => setTimeout(resolve, 300));
    const query = { projectId: input.projectId, taskId: input.taskId, requestKey: input.requestKey, action: "planning.start" as const };
    expect(await caller.planning.submission(query)).toEqual({ status: "not_accepted" });
    const [original, resent] = await Promise.all([first, caller.planning.start(input)]);
    expect(resent).toEqual(original);
    expect(await setup.database.select().from(taskOperations).where(eq(taskOperations.kind, "plan"))).toHaveLength(1);
  });

  it("IT-094 keeps administrator reads isolated per project", async () => {
    const setup = await publishedTask();
    await setup.authorize(setup.readerId);
    const second = await setup.createProject({ ...repository, githubId: "303", nodeId: "R_303", name: "second" }, "Second");
    const otherTaskId = crypto.randomUUID();
    await setup.database.insert(tasks).values({ id: otherTaskId, projectId: second.id, authorUserId: setup.ownerId, repositoryId: "303", repositoryNodeId: "R_303", status: "published", version: 3, title: "Outra" });
    const admin = planningCaller(setup, setup.readerId);
    const first = await admin.byId({ projectId: setup.project.id, taskId: setup.taskId });
    expect(first.task).toMatchObject({ projectId: setup.project.id, authorUserId: setup.ownerId });
    expect((await admin.list({ projectId: setup.project.id, limit: 30 })).items.map((item) => item.id)).toEqual([setup.taskId]);
    setup.githubFetcher.mockImplementation(async (url) => githubResponse(String(url), { ...repository, githubId: "303", nodeId: "R_303", name: "second" }));
    const other = await admin.byId({ projectId: second.id, taskId: otherTaskId });
    expect(other.task).toMatchObject({ projectId: second.id, title: "Outra" });
    expect(await rejection(admin.byId({ projectId: second.id, taskId: setup.taskId }))).toMatchObject({ reason: "task_unavailable" });
  });
});
