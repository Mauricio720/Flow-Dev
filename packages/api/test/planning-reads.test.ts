import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { TaskPlanningDao } from "../src/application/database/dao/taskPlanningDao";
import { eq } from "drizzle-orm";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { githubRepositoryAuthorizations, taskOperations, tasks, taskPublicationAttempts, taskPlanningDecisions, adminDesignations } from "../src/infra/database/schema";
import { TaskError, type TaskErrorReason } from "../src/application/services/tasks/taskErrors";
import { createTasksRouter } from "../src/routers/tasks";
import { closeTaskFixture } from "./task-api-support";
import { githubResponse, repository } from "./fixture";
import { currentTask, planningBase, planningCaller, publishedTask, rejection, reviewState, seedReview, type PlanningSetup } from "./planning-support";

beforeEach(() => vi.stubEnv("TASK_CURSOR_SECRET", "task-test-cursor-secret"));
afterEach(closeTaskFixture);

const scope = (setup: PlanningSetup) => ({ projectId: setup.project.id, taskId: setup.taskId });

describe("planning workspace reads", () => {
  it("IT-002 projects historical published tasks as awaiting without writes", async () => {
    const setup = await publishedTask();
    const detail = await planningCaller(setup).byId(scope(setup));
    expect(detail.planning).toMatchObject({ status: "awaiting", eligibility: { canStart: true, reason: null }, operation: null, decision: null, permissions: { canStart: false } });
    expect(await setup.database.select().from(taskOperations).where(eq(taskOperations.kind, "plan"))).toHaveLength(0);
  });

  it("IT-051 returns coherent task and decision versions while routes change", async () => {
    const setup = await publishedTask();
    await seedReview(setup);
    const caller = planningCaller(setup);
    const routes = ["prd", "direct_execution", "tech_spec", "prd", "tech_spec", "prd"] as const;
    const writer = (async () => { for (const route of routes) { const state = await reviewState(setup); await caller.planning.selectRoute({ ...planningBase(setup, state.version), decisionId: state.decision.id, expectedDecisionVersion: state.decision.version, selectedRoute: route }); } })();
    const reads = await Promise.all(Array.from({ length: 24 }, () => caller.byId(scope(setup))));
    await writer;
    for (const read of reads) expect(read.task.version - 6).toBe(read.planning.decision!.version);
  });

  it("IT-052 and IT-089 paginate compact planning statuses and empty history", async () => {
    const setup = await publishedTask();
    const empty = await setup.createProject({ ...repository, githubId: "404", nodeId: "R_404", name: "empty" }, "Empty");
    await setup.permissions.assign(setup.ownerId, empty.id, setup.readerId);
    const states = [null, "in_progress", "failed", "review", "approved"];
    const rows = Array.from({ length: 61 }, (_, index) => ({ id: crypto.randomUUID(), projectId: setup.project.id, authorUserId: setup.ownerId, repositoryId: "202", repositoryNodeId: "R_202", status: "published", version: 3, title: `Histórica ${index}`, planningStatus: states[index % 5]! }));
    await setup.database.insert(tasks).values(rows);
    const caller = planningCaller(setup);
    const seen = new Map<string, string | null>();
    let cursor: string | undefined;
    do {
      const page = await caller.list({ projectId: setup.project.id, limit: 30, cursor });
      for (const item of page.items) { expect(seen.has(item.id)).toBe(false); seen.set(item.id, item.planningStatus); }
      cursor = page.nextCursor ?? undefined;
    } while (cursor);
    expect(seen.size).toBe(62);
    expect(rows.every((row) => seen.get(row.id) === (row.planningStatus ?? "awaiting"))).toBe(true);
    setup.githubFetcher.mockImplementation(async (url) => githubResponse(String(url), { ...repository, githubId: "404", nodeId: "R_404", name: "empty" }));
    expect(await caller.list({ projectId: empty.id, limit: 30 })).toMatchObject({ items: [], nextCursor: null });
  });

  it("IT-063 reports corrupt stored decisions instead of an empty review", async () => {
    const setup = await publishedTask();
    await setup.database.execute(`ALTER TABLE task_planning_decisions DROP CONSTRAINT task_planning_decisions_content_check` as never);
    await seedReview(setup, { reasons: [] });
    expect(await rejection(planningCaller(setup).byId(scope(setup)))).toMatchObject({ code: "INTERNAL_SERVER_ERROR", reason: "invalid_stored_content" });
  });

  it("IT-068 does not change planning state through repeated observation", async () => {
    const setup = await publishedTask();
    await seedReview(setup);
    const before = { task: await currentTask(setup), decision: await setup.database.select().from(taskPlanningDecisions), operations: await setup.database.select().from(taskOperations) };
    const caller = planningCaller(setup);
    for (let index = 0; index < 3; index++) await Promise.all([caller.byId(scope(setup)), caller.list({ projectId: setup.project.id, limit: 30 }), caller.messages({ ...scope(setup), limit: 30 }), caller.revisions({ ...scope(setup), limit: 30 }), caller.planning.submission({ ...scope(setup), requestKey: crypto.randomUUID(), action: "planning.approve" })]);
    expect({ task: await currentTask(setup), decision: await setup.database.select().from(taskPlanningDecisions), operations: await setup.database.select().from(taskOperations) }).toEqual(before);
  });

  it("IT-065 and IT-067 keep the publication and use the retained snapshot for an archived repository", async () => {
    const setup = await publishedTask();
    const before = await setup.database.select().from(taskPublicationAttempts);
    setup.githubFetcher.mockImplementation(async (url) => githubResponse(String(url), { ...repository, archived: true }));
    const caller = planningCaller(setup);
    expect(await rejection(caller.planning.start(planningBase(setup)))).toMatchObject({ code: "PRECONDITION_FAILED", reason: "issue_ineligible" });
    expect(await setup.database.select().from(taskPublicationAttempts)).toEqual(before);
    expect(setup.githubFetcher.mock.calls.some((call) => String(call[0]).includes("/issues"))).toBe(false);
  });
});

describe("planning authorization and error boundaries", () => {
  it("IT-053 requires a session on every planning procedure", async () => {
    const setup = await publishedTask();
    const results = await Promise.allSettled(allPlanningCalls(setup, planningCaller(setup, null)));
    expectAll(results, "UNAUTHORIZED", "session_required");
  });

  it("IT-054 scopes planning procedures to project and task", async () => {
    const setup = await publishedTask();
    const caller = planningCaller(setup);
    const unknownProject = await Promise.allSettled(allPlanningCalls({ ...setup, project: { ...setup.project, id: crypto.randomUUID() } } as PlanningSetup, caller));
    expectSplit(unknownProject, ["NOT_FOUND", "project_unavailable"], ["NOT_FOUND", "work_unavailable"]);
    const unknownTask = await Promise.allSettled(allPlanningCalls({ ...setup, taskId: crypto.randomUUID() } as PlanningSetup, caller));
    expectSplit(unknownTask, ["NOT_FOUND", "task_unavailable"], ["NOT_FOUND", "work_unavailable"]);
  });

  it("IT-055 and IT-056 deny nonauthors and missing personal authorization", async () => {
    const setup = await publishedTask();
    await setup.authorize(setup.readerId);
    const mutations = (await Promise.allSettled(allPlanningCalls(setup, planningCaller(setup, setup.readerId)).slice(1)));
    expect(mutations.map((result) => result.status === "rejected" ? [result.reason.code, result.reason.cause?.reason] : "resolved")).toEqual([...Array(mutations.length - 1).fill(["FORBIDDEN", "operator_required"]), "resolved"]);
    expect(await setup.database.select().from(taskOperations).where(eq(taskOperations.kind, "plan"))).toHaveLength(0);
    await setup.database.delete(githubRepositoryAuthorizations).where(eq(githubRepositoryAuthorizations.userId, setup.readerId));
    expectAll(await Promise.allSettled(allPlanningCalls(setup, planningCaller(setup, setup.readerId))), "PRECONDITION_FAILED", "repository_authorization_needed");
  });

  it("IT-057 and IT-058 hide tasks after membership or administrator revocation", async () => {
    const setup = await publishedTask();
    await setup.permissions.assign(setup.readerId, setup.project.id, setup.ownerId);
    await setup.authorize(setup.readerId);
    await planningCaller(setup, setup.readerId).byId(scope(setup));
    await setup.permissions.remove(setup.readerId, setup.project.id);
    await setup.database.delete(adminDesignations);
    expect(await rejection(planningCaller(setup, setup.readerId).byId(scope(setup)))).toMatchObject({ code: "NOT_FOUND", reason: "project_unavailable" });
  });

  it("IT-059 and IT-060 preserve safe repository access failures and rate limits", async () => {
    const setup = await publishedTask();
    setup.githubFetcher.mockImplementation(async () => new Response("", { status: 404 }));
    expectSplit(await Promise.allSettled(allPlanningCalls(setup, planningCaller(setup))), ["PRECONDITION_FAILED", "destination_unavailable"], ["NOT_FOUND", "work_unavailable"]);
    setup.githubFetcher.mockImplementation(async () => new Response("", { status: 429, headers: { "retry-after": "45" } }));
    const limited = await Promise.allSettled(allPlanningCalls(setup, planningCaller(setup)));
    expectAll(limited, "TOO_MANY_REQUESTS", "provider_rate_limited");
    expect(limited.every((result) => result.status === "rejected" && result.reason.cause.retryAfterSeconds === 45)).toBe(true);
  });

  it("IT-062 translates unknown database failures into service_unavailable", async () => {
    const setup = await publishedTask();
    const broken = { ...setup, taskDao: new Proxy(setup.taskDao, { get: (_target, key) => key === "findScoped" ? async () => ({ authorUserId: setup.ownerId }) : async () => { throw new Error("connection reset"); } }) } as PlanningSetup;
    const brokenPlanning = new Proxy({}, { get: () => async () => { throw new Error("connection reset"); } }) as TaskPlanningDao;
    const results = await Promise.allSettled(allPlanningCalls(broken, planningCaller(broken, setup.ownerId, true, brokenPlanning)));
    expectAll(results, "INTERNAL_SERVER_ERROR", "service_unavailable");
  });

  it("IT-061 rejects malformed planning input through /api/trpc with field issues", async () => {
    const setup = await publishedTask();
    const handler = httpHandler(planningCaller(setup) && createTasksRouter(undefined, undefined, undefined), setup);
    const responses = await Promise.all([{ ...planningBase(setup), taskId: "bad" }, { ...planningBase(setup), expectedVersion: 0 }, { ...planningBase(setup), actorUserId: crypto.randomUUID() }].map((body) => handler("planning.start", body)));
    for (const response of responses) expect(response).toMatchObject({ status: 400, body: { error: { data: { code: "BAD_REQUEST" } } } });
    expect(responses[0]!.body.error.data.zodError.fieldErrors).toBeDefined();
  });
});

describe("planning reason transport", () => {
  const table: Array<[TaskErrorReason, number, number?]> = [["task_unavailable", 404], ["project_unavailable", 404], ["invalid_input", 400], ["invalid_request_key", 400], ["author_required", 403], ["access_revoked", 403], ["repository_authorization_needed", 412], ["destination_unavailable", 412], ["identity_mismatch", 412], ["issue_permission_denied", 412], ["provider_rate_limited", 429, 45], ["planning_capacity", 429, 30], ["publication_required", 412], ["planning_input_limit", 400], ["planning_conflict", 409], ["request_key_reused", 409], ["operation_active", 409], ["planning_exists", 409], ["planning_retry_required", 409], ["planning_not_failed", 409], ["planning_not_ready", 409], ["planning_approved", 409], ["decision_unavailable", 404], ["invalid_stored_content", 500], ["planning_unconfigured", 500], ["service_unavailable", 500]];
  it.each(table)("IT-083 and UT-042 map %s", async (reason, status, retryAfterSeconds) => {
    const stub = { start: async () => { throw new TaskError(reason, undefined, undefined, retryAfterSeconds); } } as never;
    const setup = { project: { id: crypto.randomUUID() }, taskId: crypto.randomUUID(), ownerId: "owner", sessionId: "s" } as PlanningSetup;
    const response = await httpHandler(createTasksRouter(undefined, undefined, stub), setup)("planning.start", planningBase(setup));
    expect(response.status).toBe(status);
    expect(response.body.error.data).toMatchObject({ reason, ...(retryAfterSeconds ? { retryAfterSeconds } : {}) });
  });
});

function httpHandler(router: ReturnType<typeof createTasksRouter>, setup: PlanningSetup) {
  return async (path: string, body: unknown) => {
    const response = await fetchRequestHandler({ endpoint: "/api/trpc", req: new Request(`http://localhost/api/trpc/${path}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }), router, createContext: () => ({ principal: { userId: setup.ownerId, sessionId: setup.sessionId }, requestId: "http" }) });
    return { status: response.status, body: await response.json() };
  };
}

function allPlanningCalls(setup: PlanningSetup, caller: ReturnType<typeof planningCaller>) {
  const base = { projectId: setup.project.id, taskId: setup.taskId };
  const command = () => ({ ...base, requestKey: crypto.randomUUID(), expectedVersion: 7 });
  const review = { decisionId: crypto.randomUUID(), expectedDecisionVersion: 1 };
  return [caller.byId(base), caller.planning.start(command()), caller.planning.retry({ ...command(), failedOperationId: crypto.randomUUID() }), caller.planning.selectRoute({ ...command(), ...review, selectedRoute: "prd" }), caller.planning.approve({ ...command(), ...review, reviewedRoute: "prd" }), caller.planning.submission({ ...base, requestKey: crypto.randomUUID(), action: "planning.start" })];
}

function expectSplit(results: PromiseSettledResult<unknown>[], first: [string, string], rest: [string, string]) {
  expect(results.map((result) => result.status === "rejected" ? [result.reason.code, result.reason.cause?.reason] : "resolved")).toEqual([first, ...Array(results.length - 1).fill(rest)]);
}

function expectAll(results: PromiseSettledResult<unknown>[], code: string, reason: string) {
  expect(results.map((result) => result.status === "rejected" ? [result.reason.code, result.reason.cause?.reason] : "resolved")).toEqual(Array(results.length).fill([code, reason]));
}
