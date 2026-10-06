const PREFLIGHT_PATH = "/api/task-dictation/preflight";
const UPLOAD_PATH = "/api/task-dictation";
const AUDIO_FIELD = "file";
const TOKEN_FIELD = "captureToken";
const AUDIO_FILE_NAME = "captura";
const UNKNOWN_REASON = "transcription_failed";

export type CaptureScope = { projectId: string; taskId: string | null; expectedVersion: number | null };
export type CaptureGrant = { projectId: string; captureId: string; captureToken: string; maxSeconds: number; maxBytes: number };

export class DictationFailure extends Error {
  constructor(readonly reason: string) {
    super(reason);
  }
}

async function failureOf(response: Response) {
  const body: unknown = await response.json().catch(() => null);
  const error = body && typeof body === "object" && "error" in body ? body.error : null;
  const reason = error && typeof error === "object" && "reason" in error ? error.reason : null;
  return new DictationFailure(typeof reason === "string" ? reason : UNKNOWN_REASON);
}

async function preflight(body: object, keepalive = false) {
  const response = await fetch(PREFLIGHT_PATH, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body), keepalive });
  if (!response.ok) throw await failureOf(response);
  return response.json();
}

export async function requestCapture(scope: CaptureScope): Promise<CaptureGrant> {
  const task = scope.taskId ? { taskId: scope.taskId, expectedVersion: scope.expectedVersion } : {};
  const grant = await preflight({ action: "start", projectId: scope.projectId, ...task });
  return { projectId: scope.projectId, captureId: grant.captureId, captureToken: grant.captureToken, maxSeconds: grant.limits.maxSeconds, maxBytes: grant.limits.maxBytes };
}

export async function releaseCapture(grant: CaptureGrant) {
  await preflight({ action: "cancel", projectId: grant.projectId, captureId: grant.captureId }, true).catch(() => undefined);
}

export async function transcribe(grant: CaptureGrant, audio: Blob, signal: AbortSignal) {
  const form = new FormData();
  form.set(TOKEN_FIELD, grant.captureToken);
  form.set(AUDIO_FIELD, audio, AUDIO_FILE_NAME);
  const response = await fetch(UPLOAD_PATH, { method: "POST", body: form, signal });
  if (!response.ok) throw await failureOf(response);
  const body: unknown = await response.json();
  return body && typeof body === "object" && "text" in body && typeof body.text === "string" ? body.text : "";
}
