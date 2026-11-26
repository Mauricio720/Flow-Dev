import { afterEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { DrizzleTerminalSessionDao } from "../src/infra/database/dao/terminal/drizzleTerminalSessionDao";
import { FileSessionContextBuilder } from "../src/infra/terminal/fileSessionContextBuilder";
import { taskIssueSnapshots, taskIssueSources, taskPlanningDecisions, taskRouteSwitches, taskTerminalSessions, tasks } from "../src/infra/database/schema";
import { currentTask, planningBase, planningCaller, publishedTask, seedReview } from "./planning-support";
import { plannerFor } from "./planning-provider-fixture";
import { terminalHarness } from "./terminal-harness";
import { closeTaskFixture } from "./task-api-support";
import { cleanupTerminalFolders, gitClone, linkClone, openInput } from "./terminal-support";
import { sessionValues } from "./terminal-tracking-support";

afterEach(async () => { await closeTaskFixture(); await cleanupTerminalFolders(); });

describe("effective route in new session prompts", () => {
  it("V-07d opens with direct execution and the original route, then a replan takes effect", async () => {
    const setup = await publishedTask();
    await seedReview(setup, { recommendedRoute: "prd", selectedRoute: "prd", complexity: "low" });
    const [planning] = await setup.database.select().from(taskPlanningDecisions);
    await setup.database.update(taskPlanningDecisions).set({ status: "approved", approvedByUserId: setup.ownerId, approvedAt: new Date("2026-11-25T09:00:00Z") }).where(eq(taskPlanningDecisions.id, planning!.id));
    await setup.database.update(tasks).set({ planningStatus: "approved", planningDecisionId: planning!.id }).where(eq(tasks.id, setup.taskId));
    const clone = await gitClone();
    await linkClone(setup, clone);
    const world = { setup, harness: await terminalHarness(setup) };
    const [task] = await setup.database.select().from(tasks).where(eq(tasks.id, setup.taskId));
    const decisionId = task!.planningDecisionId!;
    const [sourceSession] = await setup.database.insert(taskTerminalSessions).values(sessionValues(setup, decisionId, { status: "ended", route: "prd", runtime: "flow_dev" })).returning();
    await setup.database.insert(taskRouteSwitches).values({ taskId: setup.taskId, planningDecisionId: decisionId, sessionId: sourceSession!.id, fromRoute: "prd", toRoute: "direct_execution", summary: "Mudança simples.", reasons: ["Escopo definido."], status: "confirmed", decidedByUserId: setup.ownerId, decidedAt: new Date("2026-11-25T10:06:00Z"), decisionRequestKey: crypto.randomUUID() });
    const approved = await new DrizzleTerminalSessionDao(setup.database).approvedPlanning(setup.taskId);
    expect(approved).toMatchObject({ route: "direct_execution", switchedFrom: "prd" });
    const preflight = await world.harness.caller.terminal.preflight({ projectId: setup.project.id, taskId: setup.taskId });
    const opened = await world.harness.caller.terminal.open(openInput(setup, { prompt: preflight.defaultPrompt }));
    const [session] = await setup.database.select().from(taskTerminalSessions).where(eq(taskTerminalSessions.id, opened.sessionId));
    const prompt = await new FileSessionContextBuilder(world.harness.env).readPrompt(opened.sessionId);
    expect(session!.route).toBe("direct_execution");
    expect(prompt!.startsWith("/flow-dev:direct-executor")).toBe(true);
    expect(prompt).toContain("Rota aprovada: PRD · trocada para Execução direta · Complexidade: Baixa");
    await changeIssueSource(setup);
    const caller = planningCaller(setup);
    await caller.planning.replan(planningBase(setup, (await currentTask(setup)).version));
    await plannerFor(setup, undefined).worker.tick();
    let detail = await caller.byId({ projectId: setup.project.id, taskId: setup.taskId });
    const selection = await caller.planning.selectRoute({ ...planningBase(setup, detail.task.version), decisionId: detail.planning.decision!.id, expectedDecisionVersion: detail.planning.decision!.version, selectedRoute: "prd" });
    await caller.planning.approve({ ...planningBase(setup, selection.version), decisionId: selection.decisionId!, expectedDecisionVersion: selection.decisionVersion!, reviewedRoute: "prd" });
    detail = await caller.byId({ projectId: setup.project.id, taskId: setup.taskId });
    expect(await new DrizzleTerminalSessionDao(setup.database).approvedPlanning(setup.taskId)).toMatchObject({ decisionId: detail.planning.decision!.id, route: "prd", switchedFrom: null });
  });
});

async function changeIssueSource(setup: Awaited<ReturnType<typeof publishedTask>>) {
  const [source] = await setup.database.select().from(taskIssueSources).where(eq(taskIssueSources.taskId, setup.taskId));
  const [current] = await setup.database.select().from(taskIssueSnapshots).where(eq(taskIssueSnapshots.id, source!.currentSnapshotId!));
  const { id: _id, ...rest } = current!;
  const [next] = await setup.database.insert(taskIssueSnapshots).values({ ...rest, revision: current!.revision + 1, publicationAttemptId: null }).returning();
  await setup.database.update(taskIssueSources).set({ currentSnapshotId: next!.id }).where(eq(taskIssueSources.id, source!.id));
}
