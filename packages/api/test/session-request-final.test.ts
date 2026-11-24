import { afterEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { taskTerminalSessions } from "../src/infra/database/schema";
import { requestsOf } from "./session-interaction-support";
import { rejection } from "./planning-support";
import { cycle, workerWorld } from "./session-worker-support";
import { closeTaskFixture } from "./task-api-support";
import { cleanupTerminalFolders } from "./terminal-support";

afterEach(async () => { await closeTaskFixture(); await cleanupTerminalFolders(); });

const QUESTION = [{ question: "Qual?", header: "Q", multiSelect: false, options: [{ label: "A", description: "" }] }];

describe("final session request responses", () => {
  it("rejects an answer when the parent session ends and preserves the pending request", async () => {
    const world = await workerWorld({ script: [{ kind: "ask", questions: QUESTION }] }, { permissions: undefined });
    const sessionId = await world.open();
    await cycle(world);
    const [request] = await requestsOf(world.setup, sessionId);
    await world.setup.database.update(taskTerminalSessions).set({ status: "ended" }).where(eq(taskTerminalSessions.id, sessionId));
    const scope = { projectId: world.setup.project.id, taskId: world.setup.taskId };
    const answered = world.harness.caller.session.answerQuestion({ ...scope, requestId: request!.id, answers: { [QUESTION[0]!.question]: { labels: ["A"] } } });
    expect(await rejection(answered)).toMatchObject({ reason: "session_not_active" });
    expect(await requestsOf(world.setup, sessionId)).toMatchObject([{ id: request!.id, status: "pending", answer: null }]);
  });
});
