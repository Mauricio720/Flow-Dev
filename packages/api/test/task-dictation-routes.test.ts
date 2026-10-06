import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  session: null as { user: { id: string }; session: { id: string } } | null,
  controller: { preflight: vi.fn(), transcribe: vi.fn() },
}));

vi.mock("@/lib/auth/auth", () => ({ auth: { api: { getSession: vi.fn(async () => mocks.session) } } }));
vi.mock("@flow-dev/api/server", () => ({ createProductionTranscriptionController: () => mocks.controller }));

import { POST as preflight } from "../../../apps/web/src/app/api/task-dictation/preflight/route";
import { POST as transcribe } from "../../../apps/web/src/app/api/task-dictation/route";

const origin = "https://flow.test";
const projectId = "00000000-0000-4000-8000-000000000001";
const taskId = "00000000-0000-4000-8000-000000000011";
const capture = { captureId: "00000000-0000-4000-8000-000000000021", captureToken: "capture.secret", limits: { maxSeconds: 180, maxBytes: 10 * 1024 * 1024 } };

beforeEach(() => {
  process.env.BETTER_AUTH_URL = origin;
  mocks.session = { user: { id: "user-1" }, session: { id: "session-1" } };
  mocks.controller.preflight.mockReset().mockResolvedValue(capture);
  mocks.controller.transcribe.mockReset().mockResolvedValue({ captureId: capture.captureId, text: "Corrigir total do carrinho" });
});
afterEach(() => { vi.restoreAllMocks(); });

describe("dictation HTTP boundaries", () => {
  it("IT-047 starts a scoped capture through the controller", async () => {
    const response = await preflight(jsonRequest("/api/task-dictation/preflight", { action: "start", projectId, taskId, expectedVersion: 7 }));
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject(capture);
    expect(mocks.controller.preflight).toHaveBeenCalledWith({ userId: "user-1", sessionId: "session-1" }, { action: "start", projectId, taskId, expectedVersion: 7 });
  });

  it("IT-048 rejects malformed project input before controller access", async () => {
    const response = await preflight(jsonRequest("/api/task-dictation/preflight", { action: "start", projectId: "bad" }));
    expect(response.status).toBe(400);
    expect(await reason(response)).toBe("invalid_input");
    expect(mocks.controller.preflight).not.toHaveBeenCalled();
  });

  it("IT-049 requires a verified session", async () => {
    mocks.session = null;
    const response = await preflight(jsonRequest("/api/task-dictation/preflight", { action: "start", projectId }));
    expect(response.status).toBe(401);
    expect(await reason(response)).toBe("session_required");
  });

  it.each([["IT-050", "author_required", 403], ["IT-051", "task_unavailable", 404], ["IT-052", "capture_active", 409], ["IT-053", "repository_authorization_needed", 412], ["IT-054", "transcription_capacity", 429], ["IT-055", "service_unavailable", 503]])("%s maps preflight %s", async (_id, error, status) => {
    mocks.controller.preflight.mockRejectedValue({ reason: error });
    const response = await preflight(jsonRequest("/api/task-dictation/preflight", { action: "start", projectId, taskId, expectedVersion: 7 }));
    expect(response.status).toBe(status);
    expect(await reason(response)).toBe(error);
  });

  it("IT-056 transcribes a multipart recording and returns editable text", async () => {
    const response = await transcribe(audioRequest());
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ captureId: capture.captureId, text: "Corrigir total do carrinho" });
    expect(mocks.controller.transcribe).toHaveBeenCalledWith({ userId: "user-1", sessionId: "session-1" }, expect.objectContaining({ captureToken: "capture.secret", mimeType: "audio/webm" }));
  });

  it.each([["IT-057", "invalid_audio", 400], ["IT-060", "task_unavailable", 404], ["IT-061", "capture_expired", 409], ["IT-062", "repository_authorization_needed", 412], ["IT-064", "unsupported_audio_type", 415], ["IT-065", "provider_rate_limited", 429], ["IT-066", "invalid_provider_response", 502], ["IT-067", "provider_unavailable", 503], ["IT-068", "transcription_timeout", 504]])("%s maps transcription %s", async (_id, error, status) => {
    mocks.controller.transcribe.mockRejectedValue({ reason: error });
    const response = await transcribe(audioRequest());
    expect(response.status).toBe(status);
    expect(await reason(response)).toBe(error);
  });

  it("IT-058 requires a session before reading the upload", async () => {
    mocks.session = null;
    const response = await transcribe(audioRequest());
    expect(response.status).toBe(401);
    expect(await reason(response)).toBe("session_required");
  });

  it("IT-059 rejects foreign origins before reading the upload", async () => {
    const response = await transcribe(audioRequest({ origin: "https://evil.test" }));
    expect(response.status).toBe(403);
    expect(await reason(response)).toBe("origin_denied");
  });

  it("IT-063 rejects audio above the encoded byte limit", async () => {
    mocks.controller.transcribe.mockRejectedValue({ reason: "audio_too_large" });
    const response = await transcribe(audioRequest({ bytes: 10 * 1024 * 1024 + 1 }));
    expect(response.status).toBe(413);
    expect(await reason(response)).toBe("audio_too_large");
    expect(mocks.controller.transcribe.mock.calls[0]?.[1].audio.byteLength).toBe(10 * 1024 * 1024 + 1);
  });
});

function jsonRequest(path: string, value: unknown) { return new Request(`${origin}${path}`, { method: "POST", headers: { origin, "content-type": "application/json" }, body: JSON.stringify(value) }); }
function audioRequest(options: { origin?: string; bytes?: number } = {}) {
  const form = new FormData();
  form.set("captureToken", "capture.secret");
  form.set("file", new File([new Uint8Array(options.bytes ?? 4)], "capture.webm", { type: "audio/webm" }));
  return new Request(`${origin}/api/task-dictation`, { method: "POST", headers: { origin: options.origin ?? origin }, body: form });
}
async function reason(response: Response) { return (await response.json()).error.reason as string; }
