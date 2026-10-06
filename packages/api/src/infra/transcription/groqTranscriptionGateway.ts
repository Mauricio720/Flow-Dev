import type { TranscriptionGateway, TranscriptionInput } from "../../application/transcription/transcriptionGateway";
import { TaskError } from "../../application/services/tasks/taskErrors";

const GROQ_TRANSCRIPTION_URL = "https://api.groq.com/openai/v1/audio/transcriptions";
const GROQ_MODEL = "whisper-large-v3-turbo";
const REQUEST_TIMEOUT_MS = 60_000;
const MAX_PROVIDER_RESPONSE_BYTES = 64 * 1024;
type Fetcher = typeof fetch;

export class GroqTranscriptionGateway implements TranscriptionGateway {
  constructor(private readonly apiKey = process.env.GROQ_API_KEY, private readonly fetcher: Fetcher = fetch) {}

  async transcribe(input: TranscriptionInput) {
    if (!this.apiKey) throw new TaskError("transcription_unconfigured");
    const form = new FormData();
    form.set("file", new Blob([Buffer.from(input.audio)], { type: input.mimeType }), input.mimeType === "audio/webm" ? "capture.webm" : "capture.mp4");
    form.set("model", GROQ_MODEL);
    form.set("language", "pt");
    form.set("response_format", "json");
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    input.signal.addEventListener("abort", () => controller.abort(), { once: true });
    try { return await this.send(form, controller.signal); }
    catch (error) { if (controller.signal.aborted) throw new TaskError("transcription_timeout"); throw error; }
    finally { clearTimeout(timeout); }
  }

  private async send(form: FormData, signal: AbortSignal) {
    let response: Response;
    try { response = await this.fetcher(GROQ_TRANSCRIPTION_URL, { method: "POST", headers: { Authorization: `Bearer ${this.apiKey}` }, body: form, signal, redirect: "error" }); }
    catch { throw new TaskError("provider_unavailable"); }
    if (response.status === 429) throw new TaskError("provider_rate_limited", undefined, undefined, retryAfter(response.headers.get("retry-after")));
    if (!response.ok) throw new TaskError("provider_unavailable");
    return parseProviderResponse(await readResponseText(response, MAX_PROVIDER_RESPONSE_BYTES));
  }
}

function retryAfter(value: string | null) {
  if (!value || !/^\d+$/.test(value.trim())) return undefined;
  const seconds = Number(value);
  return Number.isSafeInteger(seconds) && seconds > 0 ? seconds : undefined;
}

async function readResponseText(response: Response, limit: number) {
  if (!response.body) throw new TaskError("invalid_provider_response");
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > limit) { await reader.cancel(); throw new TaskError("invalid_provider_response"); }
    chunks.push(value);
  }
  const body = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { body.set(chunk, offset); offset += chunk.byteLength; }
  return new TextDecoder().decode(body);
}

function parseProviderResponse(body: string) {
  let value: unknown;
  try { value = JSON.parse(body); } catch { throw new TaskError("invalid_provider_response"); }
  if (!value || typeof value !== "object" || !("text" in value) || typeof value.text !== "string") throw new TaskError("invalid_provider_response");
  if (!value.text.trim()) throw new TaskError("no_speech");
  if ([...value.text].length > 10_000) throw new TaskError("input_limit");
  return { text: value.text };
}
