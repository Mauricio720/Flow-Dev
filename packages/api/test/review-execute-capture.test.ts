import { afterEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { taskReviewCycles, taskTerminalSessions } from "../src/infra/database/schema";
import { closeTaskFixture } from "./task-api-support";
import { captured, versionsByPath, writeFileIn } from "./artifact-capture-support";
import { FOLDER } from "./plan-support";
import { editOf, openAnotherSession, openedSession } from "./terminal-event-support";
import { cleanupTerminalFolders } from "./terminal-support";

afterEach(async () => { await closeTaskFixture(); await cleanupTerminalFolders(); });

const MANIFEST_PATH = `${FOLDER}/_tasks.md`;
const TASK_PATH = `${FOLDER}/task_02.md`;
const REPORT_PATH = `${FOLDER}/reviews/review-004.md`;
const SOURCE_PATH = "src/a.md";

async function cycleFor(world: Awaited<ReturnType<typeof openedSession>>) {
  const [cycle] = await world.setup.database.insert(taskReviewCycles).values({ taskId: world.setup.taskId, projectId: world.setup.project.id, hostId: "review-host", startedBy: world.setup.ownerId, requestKey: crypto.randomUUID(), reviewerAgent: "claude", reviewerModel: "opus", reviewerEffort: "max", executorAgent: "claude", executorModel: "opus", executorEffort: "max", tasksFolder: FOLDER, partial: false }).returning();
  const review = await openAnotherSession(world);
  const execute = { sessionId: world.sessionId, send: world.send };
  for (const session of [review, execute]) await world.setup.database.update(taskTerminalSessions).set({ purpose: session.sessionId === review.sessionId ? "review" : "review_execute", reviewCycleId: cycle!.id, runtime: "flow_dev" }).where(eq(taskTerminalSessions.id, session.sessionId));
  return { review, execute };
}

describe("review session artifact capture", () => {
  it("V-05f captures Markdown from the cycle folder for execution and review reports, excluding unrelated files", async () => {
    const world = await openedSession();
    const { review, execute } = await cycleFor(world);
    await writeFileIn(world.clone, MANIFEST_PATH, "manifest");
    await writeFileIn(world.clone, TASK_PATH, "task");
    await writeFileIn(world.clone, REPORT_PATH, "report");
    await writeFileIn(world.clone, SOURCE_PATH, "source");
    await review.send(editOf(world.clone, REPORT_PATH));
    await execute.send(editOf(world.clone, MANIFEST_PATH));
    await execute.send(editOf(world.clone, TASK_PATH));
    await execute.send(editOf(world.clone, SOURCE_PATH));
    expect(await captured(world, execute.sessionId)).toEqual({ files: 2, created: 2, failures: 0 });
    expect(await captured(world, review.sessionId)).toEqual({ files: 1, created: 1, failures: 0 });
    expect(await versionsByPath(world)).toEqual({
      [MANIFEST_PATH]: [{ version: 1, skill: "plano-de-execucao", content: "manifest", sessionId: execute.sessionId, trigger: "stop" }],
      [REPORT_PATH]: [{ version: 1, skill: "plano-de-execucao", content: "report", sessionId: review.sessionId, trigger: "stop" }],
      [TASK_PATH]: [{ version: 1, skill: "plano-de-execucao", content: "task", sessionId: execute.sessionId, trigger: "stop" }],
    });
  });
});
