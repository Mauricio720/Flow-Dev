import { afterEach, describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";
import { taskIssueClaims, taskSessionPlans } from "../src/infra/database/schema";
import { SONNET_HIGH, THREE, draft, rejection, seedItemSession, seedStoredPlan, seedTaskSet, storedItems } from "./plan-support";
import { closeTaskFixture } from "./task-api-support";
import { seedVersions, taskSetWorld } from "./task-set-support";
import { cleanupTerminalFolders } from "./terminal-support";

afterEach(async () => {
  vi.restoreAllMocks();
  await closeTaskFixture();
  await cleanupTerminalFolders();
});

describe("tasks.plan.save rules", () => {
  it("V-36f refuses to change the model of an item whose session started, and changes nothing", async () => {
    const world = await taskSetWorld();
    await seedTaskSet(world, THREE);
    const { items } = await seedStoredPlan(world, { items: [{ taskIds: ["task_01"] }, { taskIds: ["task_02", "task_03"] }] });
    await seedItemSession(world, { itemId: items[0]!.id, status: "running" });
    const outcome = await rejection(world.harness.caller.plan.save({ ...world.scope, version: 1, items: [draft(["task_01"], { id: items[0]!.id, choice: SONNET_HIGH }), draft(["task_02", "task_03"], { id: items[1]!.id })] }));
    expect(outcome).toMatchObject({ code: "CONFLICT", reason: "plan_item_started" });
    expect(await storedItems(world)).toEqual([[1, ["task_01"], "opus", "max"], [2, ["task_02", "task_03"], "opus", "max"]]);
  });

  it("V-36g refuses a model of another agent and an effort outside the catalog", async () => {
    const world = await taskSetWorld();
    await seedTaskSet(world, THREE);
    const save = (choice: Record<string, string>) => rejection(world.harness.caller.plan.save({ ...world.scope, version: 0, items: [draft(["task_01"], { choice })] }));
    expect(await save({ agent: "claude", model: "gpt-6.1-sol", effort: "high" })).toMatchObject({ code: "BAD_REQUEST", reason: "choice_invalid" });
    expect(await save({ agent: "claude", model: "opus", effort: "turbo" })).toMatchObject({ code: "BAD_REQUEST", reason: "choice_invalid" });
    expect(await world.setup.database.select().from(taskSessionPlans)).toEqual([]);
  });

  it("V-44d refuses the Codex while only the Claude is registered, saving nothing", async () => {
    const world = await taskSetWorld();
    await seedTaskSet(world, THREE);
    const outcome = await rejection(world.harness.caller.plan.save({ ...world.scope, version: 0, items: [draft(["task_01"], { choice: { agent: "codex", model: "gpt-6.1-sol", effort: "high" } })] }));
    expect(outcome).toMatchObject({ code: "PRECONDITION_FAILED", reason: "agent_unavailable" });
    expect(await world.setup.database.select().from(taskSessionPlans)).toEqual([]);
  });

  it("V-36h refuses a member, refuses the previous operator after the swap, and lets the new operator save", async () => {
    const world = await taskSetWorld();
    await seedTaskSet(world, THREE);
    const { setup, scope } = world;
    await setup.authorize(setup.readerId);
    const asMember = world.harness.callerFor(setup.readerId);
    const attempt = { ...scope, version: 0, items: [draft(["task_01"])] };
    expect(await rejection(asMember.plan.save(attempt))).toMatchObject({ code: "FORBIDDEN", reason: "plan_control_denied" });
    const [claim] = await setup.database.select().from(taskIssueClaims).where(eq(taskIssueClaims.taskId, setup.taskId));
    await setup.database.delete(taskIssueClaims).where(eq(taskIssueClaims.taskId, setup.taskId));
    await setup.database.insert(taskIssueClaims).values({ ...claim!, id: crypto.randomUUID(), candidateUserId: setup.readerId, operatorUserId: setup.readerId });
    expect(await rejection(world.harness.caller.plan.save(attempt))).toMatchObject({ code: "FORBIDDEN", reason: "plan_control_denied" });
    expect(await world.harness.caller.plan.get(scope)).toMatchObject({ canEdit: false });
    expect(await asMember.plan.get(scope)).toMatchObject({ canEdit: true });
    expect(await asMember.plan.save(attempt)).toEqual({ version: 1 });
  });

  it("V-36i refuses to save without a task set, and with a manifest without a graph", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const world = await taskSetWorld();
    const attempt = { ...world.scope, version: 0, items: [draft(["task_01"])] };
    expect(await rejection(world.harness.caller.plan.save(attempt))).toMatchObject({ code: "PRECONDITION_FAILED", reason: "task_set_unavailable" });
    const withoutGraph = '---\nschema_version: "compozy.tasks/v2"\nworkflow: demo\n---\n';
    await seedVersions(world.setup, { path: "docs/specs/login/_tasks.md", versions: [{ skill: "spec-to-tasks", content: withoutGraph, at: "2026-11-23T10:00:00Z" }] });
    expect(await rejection(world.harness.caller.plan.save(attempt))).toMatchObject({ reason: "task_set_unavailable" });
  });

  it("refuses an order that puts a task before its dependency, with the message the screen shows", async () => {
    const world = await taskSetWorld();
    await seedTaskSet(world, THREE);
    const outcome = await rejection(world.harness.caller.plan.save({ ...world.scope, version: 0, items: [draft(["task_02"]), draft(["task_01"])] }));
    expect(outcome).toEqual({ code: "BAD_REQUEST", message: "A tarefa 02 depende da 01, que está numa sessão posterior.", reason: "plan_invalid_order" });
  });
});
