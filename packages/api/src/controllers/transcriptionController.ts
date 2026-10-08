import { createHash, randomBytes, randomUUID } from "node:crypto";
import type { TaskCapture, TaskCaptureDao } from "../application/database/dao/taskCaptureDao";
import type { TaskDao } from "../application/database/dao/taskDao";
import type { TranscriptionGateway } from "../application/transcription/transcriptionGateway";
import type { SessionPrincipal } from "../context";
import type { RepositoryAccessService } from "../application/services/projects/repositoryAccessService";
import { AudioValidator, MAX_AUDIO_BYTES, MAX_AUDIO_SECONDS } from "../infra/transcription/audioValidator";
import { TaskError } from "../application/services/tasks/taskErrors";

const CAPTURE_TTL_MS = 300_000;
const BODY_LIMIT = 11 * 1024 * 1024;
const MAX_PROVIDER_SLOTS = 2;
let activeProviderCalls = 0;

export class TranscriptionController {
  constructor(private readonly tasks: TaskDao, private readonly captures: TaskCaptureDao, private readonly repositories: RepositoryAccessService, private readonly validator: AudioValidator, private readonly gateway: TranscriptionGateway, private readonly clock = () => new Date()) {}

  async preflight(actor: SessionPrincipal, input: { action: "start" | "cancel"; projectId: string; taskId?: string; expectedVersion?: number; captureId?: string }) {
    const sessionId = requireSession(actor);
    if (input.action === "cancel") return this.cancel(actor.userId, sessionId, input.captureId);
    if (!process.env.GROQ_API_KEY) throw new TaskError("service_unavailable");
    if (activeProviderCalls >= MAX_PROVIDER_SLOTS) throw new TaskError("transcription_capacity");
    const captureId = randomUUID();
    await this.repositories.requireRead(actor, input.projectId);
    await this.repositories.authoring.requireAdmin(actor);
    if (input.taskId) {
      if (input.expectedVersion === undefined) throw new TaskError("invalid_input");
      await this.requireWritableTask(actor, input.projectId, input.taskId, input.expectedVersion);
    }
    const token = `${captureId}.${randomBytes(32).toString("base64url")}`;
    const expiresAt = new Date(this.clock().getTime() + CAPTURE_TTL_MS);
    await this.captures.start({ captureId, userId: actor.userId, sessionId, projectId: input.projectId, taskId: input.taskId ?? null, expectedVersion: input.expectedVersion ?? null, tokenHash: hash(token), expiresAt });
    return { captureId, captureToken: token, expiresAt: expiresAt.toISOString(), limits: { maxSeconds: MAX_AUDIO_SECONDS, maxBytes: MAX_AUDIO_BYTES, bodyLimit: BODY_LIMIT } };
  }

  async transcribe(actor: SessionPrincipal, input: { captureToken: string; audio: Uint8Array; mimeType: string; signal: AbortSignal }) {
    try { return await this.processCapture(actor, input); }
    catch (error) {
      input.audio.fill(0);
      if (actor.sessionId && input.captureToken.length <= 128) await this.captures.release({ userId: actor.userId, sessionId: actor.sessionId, captureId: captureIdFromToken(input.captureToken) });
      throw error;
    }
  }

  private async processCapture(actor: SessionPrincipal, input: { captureToken: string; audio: Uint8Array; mimeType: string; signal: AbortSignal }) {
    const sessionId = requireSession(actor);
    if (input.captureToken.length > 128) throw new TaskError("capture_invalid");
    const captureId = captureIdFromToken(input.captureToken);
    const capture = await this.captures.find({ userId: actor.userId, sessionId, captureId });
    if (!capture || capture.tokenHash !== hash(input.captureToken)) throw new TaskError("capture_expired");
    await this.repositories.requireRead(actor, capture.projectId);
    await this.repositories.authoring.requireAdmin(actor);
    if (capture.taskId) await this.requireWritableTask(actor, capture.projectId, capture.taskId, capture.expectedVersion ?? undefined);
    const claimed = await this.captures.begin({ userId: actor.userId, sessionId, captureId, tokenHash: hash(input.captureToken) });
    if (!claimed) throw new TaskError("capture_expired");
    return this.transcribeAndRelease(actor, claimed, input);
  }

  private async cancel(userId: string, sessionId: string, captureId?: string) {
    if (!captureId) throw new TaskError("invalid_input");
    const result = await this.captures.release({ userId, sessionId, captureId });
    if (result === "forbidden") throw new TaskError("author_required");
    return { released: true };
  }

  private async requireWritableTask(actor: SessionPrincipal, projectId: string, taskId: string, expectedVersion?: number) {
    const task = await this.tasks.findScoped(projectId, taskId);
    if (!task) throw new TaskError("task_unavailable");
    if (task.authorUserId !== actor.userId) throw new TaskError("author_required");
    if (expectedVersion !== undefined && task.version !== expectedVersion) throw new TaskError("revision_conflict");
    if (task.activeOperationId || task.pendingProposalOperationId) throw new TaskError("operation_active");
    if (["publishing", "publication_uncertain", "published"].includes(task.status)) throw new TaskError("task_complete");
  }

  private async transcribeAndRelease(actor: SessionPrincipal, capture: TaskCapture, input: { captureToken: string; audio: Uint8Array; mimeType: string; signal: AbortSignal }) {
    let releaseSlot: (() => void) | null = null;
    try {
      releaseSlot = acquireProviderSlot();
      const metadata = await this.validator.inspect(input.audio, input.mimeType);
      const result = await this.gateway.transcribe({ audio: input.audio, mimeType: metadata.mimeType, signal: input.signal });
      if (!await this.captures.complete(capture)) throw new TaskError("capture_expired");
      return { captureId: capture.captureId, text: result.text };
    } finally {
      input.audio.fill(0);
      releaseSlot?.();
      await this.captures.release({ userId: actor.userId, sessionId: requireSession(actor), captureId: capture.captureId });
    }
  }
}

function requireSession(actor: SessionPrincipal) { if (!actor.sessionId) throw new TaskError("session_required"); return actor.sessionId; }
function hash(value: string) { return createHash("sha256").update(value).digest("hex"); }
function captureIdFromToken(token: string) { const captureId = token.split(".")[0]; if (!captureId) throw new TaskError("capture_invalid"); return captureId; }
function acquireProviderSlot() { if (activeProviderCalls >= MAX_PROVIDER_SLOTS) throw new TaskError("transcription_capacity"); activeProviderCalls += 1; return () => { activeProviderCalls -= 1; }; }
