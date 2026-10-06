import { afterEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { eq } from "drizzle-orm";
import { taskCaptureLeases, tasks } from "../src/infra/database/schema";
import { DrizzleTaskCaptureDao } from "../src/infra/database/dao/tasks/drizzleTaskCaptureDao";
import { AudioValidator } from "../src/infra/transcription/audioValidator";
import { TranscriptionController } from "../src/controllers/transcriptionController";
import { closeTaskFixture, seedTask, taskFixture } from "./task-api-support";

afterEach(async () => { vi.unstubAllEnvs(); await closeTaskFixture(); });

describe("capture and publication race with PostgreSQL", () => {
  it("IT-124 withholds a transcript when publication changes the task during upload", async () => {
    vi.stubEnv("GROQ_API_KEY", "configured");
    const setup = await taskFixture();
    await seedTask(setup);
    const started = deferred();
    const finish = deferred();
    const controller = createController(setup, started.resolve, finish.promise);
    const actor = { userId: setup.ownerId, sessionId: setup.sessionId };
    const lease = await controller.preflight(actor, { action: "start", projectId: setup.project.id, taskId: setup.taskId, expectedVersion: 7 });
    if (!("captureToken" in lease)) throw new Error("Capture did not start");
    const audio = readFileSync(new URL("./fixtures/audio/silence-1s.webm", import.meta.url));
    const upload = controller.transcribe(actor, { captureToken: lease.captureToken, audio: new Uint8Array(audio), mimeType: "audio/webm", signal: new AbortController().signal });
    await started.promise;
    await setup.database.update(tasks).set({ status: "publishing", version: 8 }).where(eq(tasks.id, setup.taskId));
    finish.resolve();
    await expect(upload).rejects.toMatchObject({ reason: "revision_conflict" });
    expect(await setup.database.select().from(taskCaptureLeases)).toHaveLength(0);
  });
});

function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>((done) => { resolve = done; });
  return { promise, resolve };
}

function createController(setup: Awaited<ReturnType<typeof taskFixture>>, signal: () => void, waiting: Promise<void>) {
  const captures = new DrizzleTaskCaptureDao(setup.database);
  return new TranscriptionController(setup.taskDao, captures, setup.repositoryAccess, new AudioValidator(), {
    transcribe: async () => { signal(); await waiting; return { text: "texto não deve ser entregue" }; },
  });
}
