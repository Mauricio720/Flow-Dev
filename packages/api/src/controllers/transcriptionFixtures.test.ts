import { readFileSync } from "node:fs";
import { afterEach, describe, expect, it } from "vitest";
import type { TaskCapture, TaskCaptureDao } from "../application/database/dao/taskCaptureDao";
import type { TaskDao } from "../application/database/dao/taskDao";
import { AudioValidator } from "../infra/transcription/audioValidator";
import { TaskError } from "../application/services/tasks/taskErrors";
import { TranscriptionController } from "./transcriptionController";

const actor = { userId: "user-1", sessionId: "session-1" };
const repositoryAccess = { authoring: { requireAdmin: async () => {} }, requireRead: async () => ({ githubId: "1", nodeId: "repo-1" }) } as never;
const tasks = { findScoped: async () => null } as unknown as TaskDao;
let lease: TaskCapture | null = null;
const captures: TaskCaptureDao = {
  start: async (input) => { lease = { ...input, state: "capturing" }; },
  find: async () => lease,
  begin: async (input) => {
    if (!lease || lease.captureId !== input.captureId || lease.tokenHash !== input.tokenHash) return null;
    lease = { ...lease, state: "processing" };
    return lease;
  },
  complete: async () => true,
  release: async () => { lease = null; return "released"; },
};

afterEach(() => { lease = null; delete process.env.GROQ_API_KEY; });

describe("real transcription codecs", () => {
  it("IT-120 validates one complete WebM/Opus recording before provider upload", async () => {
    await uploadFixture("silence-1s.webm", "audio/webm", "opus");
  });

  it("IT-121 validates one complete MP4/AAC recording before provider upload", async () => {
    await uploadFixture("silence-1s.mp4", "audio/mp4", "aac");
  });

  it("IT-125 rejects a real 181-second recording before provider upload", async () => {
    const audio = readFileSync(new URL("../../test/fixtures/audio/silence-181s.webm", import.meta.url));
    await expect(new AudioValidator().inspect(audio, "audio/webm")).rejects.toThrowError(new TaskError("invalid_audio"));
  });
});

async function uploadFixture(name: string, mimeType: string, codec: string) {
  process.env.GROQ_API_KEY = "configured";
  const bytes = readFileSync(new URL(`../../test/fixtures/audio/${name}`, import.meta.url));
  let received = false;
  const controller = new TranscriptionController(tasks, captures, repositoryAccess, new AudioValidator(), {
    transcribe: async ({ audio, mimeType: providerMime }) => {
      expect(audio.byteLength).toBe(bytes.byteLength);
      expect(providerMime).toBe(mimeType);
      received = true;
      return { text: `validated ${codec}` };
    },
  });
  const started = await controller.preflight(actor, { action: "start", projectId: "project-1" });
  if (!("captureToken" in started)) throw new Error("Capture did not start");
  await expect(controller.transcribe(actor, { captureToken: started.captureToken, audio: new Uint8Array(bytes), mimeType, signal: new AbortController().signal })).resolves.toMatchObject({ text: `validated ${codec}` });
  expect(received).toBe(true);
}
