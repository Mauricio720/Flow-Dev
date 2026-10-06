import { afterEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { taskCaptureLeases, taskMessages } from "../src/infra/database/schema";
import { TaskError } from "../src/application/services/tasks/taskErrors";
import { DrizzleTaskCaptureDao } from "../src/infra/database/dao/tasks/drizzleTaskCaptureDao";
import { AudioValidator } from "../src/infra/transcription/audioValidator";
import { TranscriptionController } from "../src/controllers/transcriptionController";
import { closeTaskFixture, seedTask, taskFixture } from "./task-api-support";

afterEach(async () => { vi.unstubAllEnvs(); await closeTaskFixture(); });

describe("durable capture cancellation with PostgreSQL", () => {
  it("IT-262 denies another account cancellation without releasing its lease", async () => {
    const setup = await taskFixture();
    const captures = new DrizzleTaskCaptureDao(setup.database);
    const captureId = crypto.randomUUID();
    await captures.start({ captureId, userId: setup.ownerId, sessionId: setup.sessionId, projectId: setup.project.id, taskId: null, expectedVersion: null, tokenHash: "opaque-hash", expiresAt: new Date(Date.now() + 60_000) });
    const controller = controllerFor(setup, captures);
    await expect(controller.preflight({ userId: setup.readerId, sessionId: "reader-session" }, { action: "cancel", projectId: setup.project.id, captureId })).rejects.toMatchObject({ reason: "author_required" });
    expect(await setup.database.select().from(taskCaptureLeases)).toHaveLength(1);
  });

  it("IT-122 cancellation expires the later upload", async () => {
    vi.stubEnv("GROQ_API_KEY", "configured");
    const setup = await taskFixture();
    const captures = new DrizzleTaskCaptureDao(setup.database);
    const controller = controllerFor(setup, captures);
    const actor = { userId: setup.ownerId, sessionId: setup.sessionId };
    const lease = await controller.preflight(actor, { action: "start", projectId: setup.project.id });
    if (!("captureToken" in lease)) throw new Error("Capture did not start");
    await controller.preflight(actor, { action: "cancel", projectId: setup.project.id, captureId: lease.captureId });
    const audio = readFileSync(new URL("./fixtures/audio/silence-1s.webm", import.meta.url));
    await expect(controller.transcribe(actor, { captureToken: lease.captureToken, audio: new Uint8Array(audio), mimeType: "audio/webm", signal: new AbortController().signal })).rejects.toThrowError(new TaskError("capture_expired"));
  });

  it("IT-259 returns provider text without persisting audio or messages", async () => {
    vi.stubEnv("GROQ_API_KEY", "configured");
    const setup = await taskFixture();
    await seedTask(setup);
    const captures = new DrizzleTaskCaptureDao(setup.database);
    const controller = new TranscriptionController(setup.taskDao, captures, setup.repositoryAccess, new AudioValidator(), { transcribe: async () => ({ text: "texto revisável" }) });
    const actor = { userId: setup.ownerId, sessionId: setup.sessionId };
    const lease = await controller.preflight(actor, { action: "start", projectId: setup.project.id, taskId: setup.taskId, expectedVersion: 7 });
    if (!("captureToken" in lease)) throw new Error("Capture did not start");
    const audio = readFileSync(new URL("./fixtures/audio/silence-1s.webm", import.meta.url));
    await expect(controller.transcribe(actor, { captureToken: lease.captureToken, audio: new Uint8Array(audio), mimeType: "audio/webm", signal: new AbortController().signal })).resolves.toMatchObject({ text: "texto revisável" });
    expect(await setup.database.select().from(taskCaptureLeases)).toHaveLength(0);
    expect(await setup.database.select().from(taskMessages)).toHaveLength(0);
  });

  it("IT-261 makes repeated cancellation idempotent against PostgreSQL", async () => {
    const setup = await taskFixture();
    const captures = new DrizzleTaskCaptureDao(setup.database);
    const captureId = crypto.randomUUID();
    await captures.start({ captureId, userId: setup.ownerId, sessionId: setup.sessionId, projectId: setup.project.id, taskId: null, expectedVersion: null, tokenHash: "opaque-hash", expiresAt: new Date(Date.now() + 60_000) });
    const controller = controllerFor(setup, captures);
    const actor = { userId: setup.ownerId, sessionId: setup.sessionId };
    const input = { action: "cancel" as const, projectId: setup.project.id, captureId };
    await expect(controller.preflight(actor, input)).resolves.toEqual({ released: true });
    await expect(controller.preflight(actor, input)).resolves.toEqual({ released: true });
    expect(await setup.database.select().from(taskCaptureLeases)).toHaveLength(0);
  });

  it("IT-123 allows only one capture across simultaneous tabs", async () => {
    const setup = await taskFixture();
    const first = new DrizzleTaskCaptureDao(setup.database);
    const second = new DrizzleTaskCaptureDao(setup.database);
    const start = (captureId: string) => first.start({ captureId, userId: setup.ownerId, sessionId: setup.sessionId, projectId: setup.project.id, taskId: null, expectedVersion: null, tokenHash: captureId, expiresAt: new Date(Date.now() + 60_000) });
    const results = await Promise.allSettled([start(crypto.randomUUID()), second.start({ captureId: crypto.randomUUID(), userId: setup.ownerId, sessionId: setup.sessionId, projectId: setup.project.id, taskId: null, expectedVersion: null, tokenHash: "tab-2", expiresAt: new Date(Date.now() + 60_000) })]);
    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    expect(results.filter((result) => result.status === "rejected")).toHaveLength(1);
    expect(await setup.database.select().from(taskCaptureLeases)).toHaveLength(1);
  });

});

function controllerFor(setup: Awaited<ReturnType<typeof taskFixture>>, captures: DrizzleTaskCaptureDao) {
  return new TranscriptionController(setup.taskDao, captures, setup.repositoryAccess, new AudioValidator(), { transcribe: async () => ({ text: "unreachable" }) });
}
