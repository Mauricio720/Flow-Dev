import type { DictationEvent } from "../dictationState";
import { captureFailureReason, openCapture, type CaptureSession } from "./captureSession";
import { DictationFailure, releaseCapture, requestCapture, transcribe, type CaptureGrant, type CaptureScope } from "./dictationApi";

export const LIMIT_REASON = "capture_limit";
export const INCOMPLETE_REASON = "incomplete_capture";
const OVERSIZE_REASON = "audio_too_large";
const MS_PER_SECOND = 1000;

function failureReason(error: unknown) {
  return error instanceof DictationFailure ? error.reason : captureFailureReason(error);
}

export class CaptureController {
  private captureId: string | null = null;
  private grant: CaptureGrant | null = null;
  private session: CaptureSession | null = null;
  private upload: AbortController | null = null;
  private limitTimer: number | null = null;

  constructor(private readonly emit: (event: DictationEvent) => void) {}

  async start(scope: CaptureScope) {
    if (this.captureId) return;
    const captureId = crypto.randomUUID();
    this.captureId = captureId;
    this.emit({ type: "requested", captureId });
    try {
      await this.acquire(scope, captureId);
    } catch (error) {
      if (this.captureId === captureId) this.settle({ type: "failed", captureId, reason: failureReason(error) });
    }
  }

  async stop(reason: string | null = null) {
    const { captureId, grant, session } = this;
    if (!captureId || !grant || !session || this.upload) return;
    const upload = (this.upload = new AbortController());
    this.emit({ type: "stopping", captureId, reason });
    try {
      const audio = await session.finish();
      if (audio.size > grant.maxBytes) throw new DictationFailure(OVERSIZE_REASON);
      const text = await transcribe(grant, audio, upload.signal);
      if (this.captureId === captureId) this.settle({ type: "transcribed", captureId, text }, false);
    } catch (error) {
      if (this.captureId === captureId) this.settle({ type: "failed", captureId, reason: failureReason(error) });
    }
  }

  cancel() {
    if (this.captureId) this.settle({ type: "canceled", captureId: this.captureId });
  }

  async interrupt(reason: string) {
    const captureId = this.captureId;
    if (!captureId) return;
    await this.teardown(true);
    this.emit({ type: "failed", captureId, reason });
  }

  dispose() {
    void this.teardown(true);
  }

  private async acquire(scope: CaptureScope, captureId: string) {
    const grant = await requestCapture(scope);
    if (this.captureId !== captureId) return void releaseCapture(grant);
    this.grant = grant;
    const session = await openCapture(() => void this.interrupt(INCOMPLETE_REASON));
    if (this.captureId !== captureId) return session.abort();
    this.session = session;
    this.limitTimer = window.setTimeout(() => void this.stop(LIMIT_REASON), grant.maxSeconds * MS_PER_SECOND);
    this.emit({ type: "listening", captureId });
  }

  private settle(event: DictationEvent, release = true) {
    void this.teardown(release);
    this.emit(event);
  }

  private async teardown(release: boolean) {
    const { grant, session, upload, limitTimer } = this;
    this.captureId = this.grant = this.session = this.upload = this.limitTimer = null;
    if (limitTimer !== null) window.clearTimeout(limitTimer);
    upload?.abort();
    session?.abort();
    if (release && grant) await releaseCapture(grant);
  }
}
