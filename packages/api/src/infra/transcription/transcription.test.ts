import { describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { chmod, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { AudioValidator, MAX_AUDIO_BYTES } from "./audioValidator";
import { GroqTranscriptionGateway } from "./groqTranscriptionGateway";
import { TaskError } from "../../application/services/tasks/taskErrors";

const webm = { format: { format_name: "matroska,webm", duration: "60.0" }, streams: [{ codec_type: "audio", codec_name: "opus" }] };
const signal = new AbortController().signal;

describe("transcription boundary", () => {
  it("UT-041 accepts one measured WebM audio stream", async () => {
    const validator = new AudioValidator("ffprobe", async () => webm);
    await expect(validator.inspect(new Uint8Array([1]), "audio/webm")).resolves.toMatchObject({ mimeType: "audio/webm", durationSeconds: 60, codec: "opus" });
  });
  it("validates the real WebM fixture with ffprobe", async () => {
    const audio = readFileSync(new URL("../../../test/fixtures/audio/capture.webm", import.meta.url));
    await expect(new AudioValidator().inspect(audio, "audio/webm")).resolves.toMatchObject({ mimeType: "audio/webm", codec: "opus" });
  });
  it("validates the real MP4 fixture with ffprobe", async () => {
    const audio = readFileSync(new URL("../../../test/fixtures/audio/capture.mp4", import.meta.url));
    await expect(new AudioValidator().inspect(audio, "audio/mp4")).resolves.toMatchObject({ mimeType: "audio/mp4", codec: "aac" });
  });
  it("UT-093 rejects a measured duration over 180 seconds regardless of submitted duration", async () => {
    const validator = new AudioValidator("ffprobe", async () => ({ ...webm, format: { ...webm.format, duration: "180.1" } }));
    await expect(validator.inspect(new Uint8Array([1]), "audio/webm")).rejects.toThrowError(new TaskError("invalid_audio"));
  });
  it("UT-094 rejects a MIME/container mismatch", async () => {
    const validator = new AudioValidator("ffprobe", async () => ({ ...webm, format: { ...webm.format, format_name: "mov,mp4,m4a" } }));
    await expect(validator.inspect(new Uint8Array([1]), "audio/webm")).rejects.toThrowError(new TaskError("invalid_audio"));
  });
  it("UT-092 accepts the exact duration and encoded byte limits", async () => {
    const boundary = { ...webm, format: { ...webm.format, duration: "180" } };
    await expect(new AudioValidator("ffprobe", async () => boundary).inspect(new Uint8Array(MAX_AUDIO_BYTES), "audio/webm")).resolves.toMatchObject({ durationSeconds: 180 });
  });
  it("UT-042 rejects ffprobe that exceeds its five-second deadline", async () => {
    const directory = await mkdtemp(join(tmpdir(), "flow-ffprobe-"));
    const executable = join(directory, "ffprobe");
    await writeFile(executable, "#!/bin/sh\nexec sleep 10\n");
    await chmod(executable, 0o755);
    try { await expect(new AudioValidator(executable).inspect(new Uint8Array([1]), "audio/webm")).rejects.toThrowError(new TaskError("invalid_audio")); }
    finally { await rm(directory, { recursive: true, force: true }); }
  }, 7_000);
  it("converts a closed ffprobe stdin into invalid audio", async () => {
    const directory = await mkdtemp(join(tmpdir(), "flow-ffprobe-"));
    const executable = join(directory, "ffprobe");
    await writeFile(executable, "#!/bin/sh\nexit 1\n");
    await chmod(executable, 0o755);
    try { await expect(new AudioValidator(executable).inspect(new Uint8Array(MAX_AUDIO_BYTES), "audio/webm")).rejects.toThrowError(new TaskError("invalid_audio")); }
    finally { await rm(directory, { recursive: true, force: true }); }
  });
  it("rejects the encoded audio size boundary before probing", async () => {
    const probe = vi.fn(async () => webm);
    const validator = new AudioValidator("ffprobe", probe);
    await expect(validator.inspect(new Uint8Array(MAX_AUDIO_BYTES + 1), "audio/webm")).rejects.toThrowError(new TaskError("audio_too_large"));
    expect(probe).not.toHaveBeenCalled();
  });
  it("UT-039 sends Groq's selected model, language, and JSON format", async () => {
    const fetcher = vi.fn(async (_url: string | URL | Request, init?: RequestInit) => {
      const form = init?.body as FormData;
      expect(form.get("model")).toBe("whisper-large-v3-turbo");
      expect(form.get("language")).toBe("pt");
      expect(form.get("response_format")).toBe("json");
      return new Response(JSON.stringify({ text: "Corrigir total" }), { status: 200 });
    });
    const gateway = new GroqTranscriptionGateway("secret", fetcher);
    await expect(gateway.transcribe({ audio: new Uint8Array([1]), mimeType: "audio/webm", signal })).resolves.toEqual({ text: "Corrigir total" });
  });
  it("UT-040 preserves the provider Retry-After value on rate limits", async () => {
    const gateway = new GroqTranscriptionGateway("secret", async () => new Response("", { status: 429, headers: { "retry-after": "30" } }));
    await expect(gateway.transcribe({ audio: new Uint8Array([1]), mimeType: "audio/webm", signal })).rejects.toMatchObject({ reason: "provider_rate_limited", retryAfterSeconds: 30 });
  });
  it("UT-095 rejects malformed provider text and UT-096 rejects empty speech", async () => {
    const invalid = new GroqTranscriptionGateway("secret", async () => new Response('{"unexpected":true}'));
    const empty = new GroqTranscriptionGateway("secret", async () => new Response('{"text":""}'));
    await expect(invalid.transcribe({ audio: new Uint8Array([1]), mimeType: "audio/mp4", signal })).rejects.toThrowError(new TaskError("invalid_provider_response"));
    await expect(empty.transcribe({ audio: new Uint8Array([1]), mimeType: "audio/mp4", signal })).rejects.toThrowError(new TaskError("no_speech"));
  });
  it("UT-107 does not call Groq without server configuration", async () => {
    const fetcher = vi.fn();
    const gateway = new GroqTranscriptionGateway(undefined, fetcher);
    await expect(gateway.transcribe({ audio: new Uint8Array([1]), mimeType: "audio/webm", signal })).rejects.toThrowError(new TaskError("transcription_unconfigured"));
    expect(fetcher).not.toHaveBeenCalled();
  });
});
