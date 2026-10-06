import { afterEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { taskCaptureLeases } from "../src/infra/database/schema";
import { DrizzleTaskCaptureDao } from "../src/infra/database/dao/tasks/drizzleTaskCaptureDao";
import { AudioValidator } from "../src/infra/transcription/audioValidator";
import { TranscriptionController } from "../src/controllers/transcriptionController";
import { closeTaskFixture, taskFixture } from "./task-api-support";

const mocks = vi.hoisted(() => ({ session: null as { user: { id: string }; session: { id: string } } | null, controller: null as TranscriptionController | null }));

vi.mock("@/lib/auth/auth", () => ({ auth: { api: { getSession: vi.fn(async () => mocks.session) } } }));
vi.mock("@flow-dev/api/server", () => ({ createProductionTranscriptionController: () => mocks.controller }));

import { POST as preflight } from "../../../apps/web/src/app/api/task-dictation/preflight/route";
import { POST as transcribe } from "../../../apps/web/src/app/api/task-dictation/route";

const origin = "https://flow.test";

afterEach(async () => { vi.unstubAllEnvs(); await closeTaskFixture(); });

describe("dictation HTTP integration", () => {
  it("IT-047 and IT-056 use the real controller, capture DAO, and ffprobe validation", async () => {
    vi.stubEnv("BETTER_AUTH_URL", origin);
    vi.stubEnv("GROQ_API_KEY", "configured");
    const setup = await taskFixture();
    mocks.session = { user: { id: setup.ownerId }, session: { id: setup.sessionId } };
    mocks.controller = new TranscriptionController(setup.taskDao, new DrizzleTaskCaptureDao(setup.database), setup.repositoryAccess, new AudioValidator(), { transcribe: async () => ({ text: "Corrigir total do carrinho" }) });
    const started = await preflight(jsonRequest({ action: "start", projectId: setup.project.id }));
    const capture = await started.json() as { captureToken: string };
    const response = await transcribe(audioRequest(capture.captureToken));
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ text: "Corrigir total do carrinho" });
    expect(await setup.database.select().from(taskCaptureLeases)).toHaveLength(0);
  });
});

function jsonRequest(value: unknown) { return new Request(`${origin}/api/task-dictation/preflight`, { method: "POST", headers: { origin, "content-type": "application/json" }, body: JSON.stringify(value) }); }

function audioRequest(captureToken: string) {
  const form = new FormData();
  const audio = readFileSync(new URL("./fixtures/audio/silence-1s.webm", import.meta.url));
  form.set("captureToken", captureToken);
  form.set("file", new File([audio], "capture.webm", { type: "audio/webm" }));
  return new Request(`${origin}/api/task-dictation`, { method: "POST", headers: { origin }, body: form });
}
