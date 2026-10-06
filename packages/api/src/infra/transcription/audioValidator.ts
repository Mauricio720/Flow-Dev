import { spawn } from "node:child_process";
import { TaskError } from "../../application/services/tasks/taskErrors";

export const MAX_AUDIO_BYTES = 10 * 1024 * 1024;
export const MAX_AUDIO_SECONDS = 180;
const FFMPEG_PROBE_TIMEOUT_MS = 5_000;
const MIME_CONTAINERS = { "audio/webm": ["matroska", "webm"], "audio/mp4": ["mov", "mp4", "m4a", "3gp", "3g2", "mj2"] };
export type AudioMetadata = { mimeType: "audio/webm" | "audio/mp4"; durationSeconds: number; codec: string };
type ProbeResult = { format?: { format_name?: string; duration?: string }; streams?: Array<{ codec_type?: string; codec_name?: string }> };

export class AudioValidator {
  constructor(private readonly executable = "ffprobe", private readonly runProbe = probeAudio) {}

  async inspect(audio: Uint8Array, mimeType: string) {
    if (audio.byteLength > MAX_AUDIO_BYTES) throw new TaskError("audio_too_large");
    mimeType = mimeType.split(";")[0]?.trim().toLowerCase() ?? "";
    if (!(mimeType in MIME_CONTAINERS)) throw new TaskError("unsupported_audio_type");
    const metadata = await this.runProbe(this.executable, audio);
    return validateMetadata(metadata, mimeType as AudioMetadata["mimeType"]);
  }
}

function validateMetadata(metadata: ProbeResult, mimeType: AudioMetadata["mimeType"]): AudioMetadata {
  const durationSeconds = Number(metadata.format?.duration);
  const formatName = metadata.format?.format_name?.split(",") ?? [];
  const audioStream = metadata.streams?.find((stream) => stream.codec_type === "audio");
  const allowed = MIME_CONTAINERS[mimeType];
  if (!Number.isFinite(durationSeconds) || durationSeconds <= 0 || durationSeconds > MAX_AUDIO_SECONDS || !audioStream?.codec_name || !formatName.some((name) => allowed.includes(name))) throw new TaskError("invalid_audio");
  return { mimeType, durationSeconds, codec: audioStream.codec_name };
}

async function probeAudio(executable: string, audio: Uint8Array): Promise<ProbeResult> {
  return await new Promise((resolve, reject) => {
    const child = spawn(executable, ["-v", "error", "-show_entries", "format=format_name,duration:stream=codec_type,codec_name", "-of", "json", "-protocol_whitelist", "pipe", "-i", "pipe:0"], { stdio: ["pipe", "pipe", "ignore"] });
    let output = "";
    let settled = false;
    const finish = (result: () => void) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      result();
    };
    const fail = () => finish(() => reject(new TaskError("invalid_audio")));
    const timeout = setTimeout(() => {
      child.kill("SIGKILL");
      fail();
    }, FFMPEG_PROBE_TIMEOUT_MS);
    child.stdout.setEncoding("utf8");
    child.stdout.on("data", (chunk: string) => { output += chunk; });
    child.once("error", fail);
    child.stdin.once("error", () => {
      child.kill("SIGKILL");
      fail();
    });
    child.once("close", (code) => {
      if (code !== 0) return fail();
      try { finish(() => resolve(JSON.parse(output) as ProbeResult)); } catch { fail(); }
    });
    child.stdin.end(audio);
  });
}
