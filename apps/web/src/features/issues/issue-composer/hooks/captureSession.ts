const MIME_CANDIDATES = ["audio/webm;codecs=opus", "audio/mp4;codecs=mp4a.40.2", "audio/webm", "audio/mp4"];
const DEVICE_REASON = "device_error";
const UNSUPPORTED_REASON = "capture_unsupported";
const INACTIVE_STATE = "inactive";
const ENDED_EVENT = "ended";
const FAILURE_REASON: Record<string, string> = {
  NotAllowedError: "permission_denied",
  SecurityError: "permission_denied",
  NotFoundError: "no_microphone",
  OverconstrainedError: "no_microphone",
  NotReadableError: DEVICE_REASON,
  AbortError: DEVICE_REASON,
};

export type CaptureSession = { finish: () => Promise<Blob>; abort: () => void };

export class CaptureFailure extends Error {
  constructor(readonly reason: string) {
    super(reason);
  }
}

export function captureFailureReason(error: unknown) {
  if (error instanceof CaptureFailure) return error.reason;
  const name = error && typeof error === "object" && "name" in error ? String(error.name) : "";
  return FAILURE_REASON[name] ?? DEVICE_REASON;
}

function stopTracks(stream: MediaStream) {
  stream.getTracks().forEach((track) => track.stop());
}

function supportedMimeType() {
  const mimeType = MIME_CANDIDATES.find((candidate) => MediaRecorder.isTypeSupported(candidate));
  if (!mimeType) throw new CaptureFailure(UNSUPPORTED_REASON);
  return mimeType;
}

function record(stream: MediaStream, onInterrupted: () => void): CaptureSession {
  const recorder = new MediaRecorder(stream, { mimeType: supportedMimeType() });
  const chunks: Blob[] = [];
  const release = () => stream.getTracks().forEach((track) => track.removeEventListener(ENDED_EVENT, onInterrupted));
  recorder.addEventListener("dataavailable", (event) => event.data.size > 0 && chunks.push(event.data));
  stream.getTracks().forEach((track) => track.addEventListener(ENDED_EVENT, onInterrupted));
  recorder.start();
  function complete(resolve: (audio: Blob) => void) {
    stopTracks(stream);
    resolve(new Blob(chunks, { type: recorder.mimeType }));
  }
  function finish() {
    return new Promise<Blob>((resolve) => {
      recorder.addEventListener("stop", () => complete(resolve), { once: true });
      release();
      recorder.stop();
    });
  }
  function abort() {
    release();
    chunks.length = 0;
    if (recorder.state !== INACTIVE_STATE) recorder.stop();
    stopTracks(stream);
  }
  return { finish, abort };
}

export async function openCapture(onInterrupted: () => void): Promise<CaptureSession> {
  if (typeof MediaRecorder === "undefined" || !navigator.mediaDevices?.getUserMedia) throw new CaptureFailure(UNSUPPORTED_REASON);
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  try {
    return record(stream, onInterrupted);
  } catch (error) {
    stopTracks(stream);
    throw error;
  }
}
