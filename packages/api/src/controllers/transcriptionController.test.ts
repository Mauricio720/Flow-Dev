import { afterEach, describe, expect, it, vi } from "vitest";
import type { TaskCapture, TaskCaptureDao } from "../application/database/dao/taskCaptureDao";
import type { TaskDao } from "../application/database/dao/taskDao";
import { TaskError } from "../application/services/tasks/taskErrors";
import { AudioValidator } from "../infra/transcription/audioValidator";
import { TranscriptionController } from "./transcriptionController";

const task = { id: "00000000-0000-4000-8000-000000000011", projectId: "00000000-0000-4000-8000-000000000001", authorUserId: "00000000-0000-4000-8000-000000000021", repositoryId: "202", repositoryNodeId: "REPO202", status: "draft_ready", version: 7, currentRevisionId: null, activeOperationId: null, pendingProposalOperationId: null, title: "", lastError: null, createdAt: new Date(), updatedAt: new Date() };
const actor = { userId: task.authorUserId, sessionId: "session-1" };
let capture: TaskCapture | null = null;
const captureDao: TaskCaptureDao = {
  start: async (input) => { capture = { ...input, state: "capturing" }; },
  find: async (input) => capture?.captureId === input.captureId && capture.userId === input.userId && capture.sessionId === input.sessionId ? capture : null,
  begin: async () => { if (!capture) return null; capture = { ...capture, state: "processing" }; return capture; },
  complete: async (input) => { if (!matchesCapture(input)) return false; capture = null; return true; },
  release: async (input) => { if (!capture) return "missing"; if (!matchesCapture(input)) return "forbidden"; capture = null; return "released"; },
};

function matchesCapture(input: { userId: string; sessionId: string; captureId: string }) { return capture?.captureId === input.captureId && capture.userId === input.userId && capture.sessionId === input.sessionId; }

function makeController(userId = actor.userId, gateway = { transcribe: async () => ({ text: "Corrigir total" }) }) {
  const tasks = { findScoped: async () => ({ ...task, authorUserId: userId }) } as unknown as TaskDao;
  const repositories = { requireRead: vi.fn(async () => ({ githubId: "202", nodeId: "REPO202" })) } as never;
  const validator = new AudioValidator("ffprobe", async () => ({ format: { format_name: "webm", duration: "1" }, streams: [{ codec_type: "audio", codec_name: "opus" }] }));
  return new TranscriptionController(tasks, captureDao, repositories, validator, gateway);
}

afterEach(() => { capture = null; vi.unstubAllEnvs(); });

describe("TranscriptionController", () => {
  it("UT-037 preflights a new intention without creating a task", async () => {
    vi.stubEnv("GROQ_API_KEY", "configured");
    const result = await makeController().preflight(actor, { action: "start", projectId: task.projectId });
    expect(result).toMatchObject({ captureToken: expect.stringContaining("."), limits: { maxSeconds: 180, maxBytes: 10 * 1024 * 1024 } });
  });
  it("UT-038 rejects a reader trying to capture on another author's task", async () => {
    vi.stubEnv("GROQ_API_KEY", "configured");
    const reader = makeController("00000000-0000-4000-8000-000000000022");
    await expect(reader.preflight(actor, { action: "start", projectId: task.projectId, taskId: task.id, expectedVersion: 7 })).rejects.toThrowError(new TaskError("author_required"));
  });
  it("IT-259 returns reviewed text only and releases audio and capture storage", async () => {
    vi.stubEnv("GROQ_API_KEY", "configured");
    const controller = makeController();
    const started = await controller.preflight(actor, { action: "start", projectId: task.projectId });
    if (!("captureToken" in started)) throw new Error("Capture did not start");
    const audio = new Uint8Array([1, 2, 3]);
    const result = await controller.transcribe(actor, { captureToken: started.captureToken, audio, mimeType: "audio/webm", signal: new AbortController().signal });
    expect(result).toEqual({ captureId: started.captureId, text: "Corrigir total" });
    expect(audio.every((byte) => byte === 0)).toBe(true);
    expect(capture).toBeNull();
  });

  it("IT-258 releases the lease and clears the buffer when the provider times out", async () => {
    vi.stubEnv("GROQ_API_KEY", "configured");
    const controller = makeController(actor.userId, { transcribe: async () => { throw new TaskError("transcription_timeout"); } });
    const started = await controller.preflight(actor, { action: "start", projectId: task.projectId });
    if (!("captureToken" in started)) throw new Error("Capture did not start");
    const audio = new Uint8Array([1, 2, 3]);
    await expect(controller.transcribe(actor, { captureToken: started.captureToken, audio, mimeType: "audio/webm", signal: new AbortController().signal })).rejects.toThrowError(new TaskError("transcription_timeout"));
    expect(audio.every((byte) => byte === 0)).toBe(true);
    expect(capture).toBeNull();
  });

  it("IT-260 drops a late provider result when cancellation wins", async () => {
    vi.stubEnv("GROQ_API_KEY", "configured");
    let finish: (() => void) | undefined;
    let providerStarted: (() => void) | undefined;
    const started = new Promise<void>((resolve) => { providerStarted = resolve; });
    const wait = new Promise<void>((resolve) => { finish = resolve; });
    const controller = makeController(actor.userId, { transcribe: async () => { providerStarted?.(); await wait; return { text: "Não aplicar texto tardio" }; } });
    const lease = await controller.preflight(actor, { action: "start", projectId: task.projectId });
    if (!("captureToken" in lease)) throw new Error("Capture did not start");
    const audio = new Uint8Array([1, 2, 3]);
    const pending = controller.transcribe(actor, { captureToken: lease.captureToken, audio, mimeType: "audio/webm", signal: new AbortController().signal });
    await started;
    await expect(controller.preflight(actor, { action: "cancel", projectId: task.projectId, captureId: lease.captureId })).resolves.toEqual({ released: true });
    finish?.();
    await expect(pending).rejects.toThrowError(new TaskError("capture_expired"));
    expect(audio.every((byte) => byte === 0)).toBe(true);
    expect(capture).toBeNull();
  });

  it("IT-261 makes a repeated cancellation harmless", async () => {
    vi.stubEnv("GROQ_API_KEY", "configured");
    const controller = makeController();
    const lease = await controller.preflight(actor, { action: "start", projectId: task.projectId });
    if (!("captureToken" in lease)) throw new Error("Capture did not start");
    await expect(controller.preflight(actor, { action: "cancel", projectId: task.projectId, captureId: lease.captureId })).resolves.toEqual({ released: true });
    await expect(controller.preflight(actor, { action: "cancel", projectId: task.projectId, captureId: lease.captureId })).resolves.toEqual({ released: true });
  });
});
