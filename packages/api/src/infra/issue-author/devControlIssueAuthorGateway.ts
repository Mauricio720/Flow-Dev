import type { GenerationEnvelope, GenerationInput, IssueAuthorGateway, ToolOutcome } from "../../application/issue-author/issueAuthorGateway";
import { buildGenerationInput } from "../../application/services/tasks/inputRules";
import { authoredFields } from "../../application/services/tasks/draftMerge";
import { issueDraftSchema } from "../../application/services/tasks/draftRules";
import { TaskError } from "../../application/services/tasks/taskErrors";
import { patientFetch } from "../http/patientFetch";

const MAX_RESPONSE_BYTES = 256 * 1024;
const REQUEST_TIMEOUT_MS = 600_000;
const USAGE_LIMIT_STATUS = 429;
type Fetcher = typeof fetch;
type KnownToolCall = (executionId: string, toolCallId: string) => Promise<boolean>;

export class DevControlIssueAuthorGateway implements IssueAuthorGateway {
  constructor(private readonly baseUrl = process.env.ISSUE_AUTHOR_BASE_URL, private readonly apiKey = process.env.ISSUE_AUTHOR_API_KEY, private readonly fetcher: Fetcher = patientFetch, private readonly knownToolCall: KnownToolCall = async () => false) {}

  async generate(input: GenerationInput) {
    if (!this.baseUrl || !this.apiKey) throw new TaskError("service_unavailable");
    const { contextCapability, ...authorInput } = input;
    const body = JSON.stringify(buildGenerationInput({ ...authorInput, currentDraft: authoredFields(input.currentDraft) }));
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try { return await this.send(input, contextCapability, body, controller.signal); }
    catch (error) { if (controller.signal.aborted) throw new TaskError("generation_timeout"); throw error; }
    finally { clearTimeout(timeout); }
  }

  private async send(input: GenerationInput, contextCapability: string, body: string, signal: AbortSignal) {
    let response: Response;
    try { response = await this.fetcher(new URL("/flow-dev/issue-author/v1", this.baseUrl), { method: "POST", headers: { authorization: `Bearer ${this.apiKey}`, "x-flow-context-capability": contextCapability, "content-type": "application/json" }, body, signal, redirect: "error" }); }
    catch (error) { throw new TaskError("provider_unavailable", undefined, error); }
    if (response.status === USAGE_LIMIT_STATUS) throw new TaskError("provider_usage_limit", undefined, new Error("Issue Author model provider reached its usage limit"));
    if (!response.ok) throw new TaskError("provider_unavailable", undefined, new Error(`Issue Author responded with status ${response.status}`));
    const text = await readResponseText(response, MAX_RESPONSE_BYTES);
    return await validateEnvelope(text, input, this.knownToolCall);
  }
}

async function readResponseText(response: Response, limit: number) {
  if (!response.body) throw new TaskError("invalid_agent_output");
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > limit) { await reader.cancel(); throw new TaskError("invalid_agent_output"); }
    chunks.push(value);
  }
  const body = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { body.set(chunk, offset); offset += chunk.byteLength; }
  return new TextDecoder().decode(body);
}

async function validateEnvelope(text: string, input: GenerationInput, knownToolCall: KnownToolCall): Promise<GenerationEnvelope> {
  let value: unknown;
  try { value = JSON.parse(text); } catch { throw new TaskError("invalid_agent_output"); }
  const envelope = asEnvelope(value);
  if (envelope.operationId !== input.operationId || envelope.executionId !== input.executionId) throw new TaskError("execution_mismatch");
  for (const activity of envelope.activity) if (!(await knownToolCall(input.executionId, activity.toolCallId))) throw new TaskError("invalid_agent_activity");
  return envelope;
}

function asEnvelope(value: unknown): GenerationEnvelope {
  if (!value || typeof value !== "object") throw new TaskError("invalid_agent_output");
  const candidate = value as Record<string, unknown>;
  if (candidate.protocolVersion !== 1 || typeof candidate.operationId !== "string" || typeof candidate.executionId !== "string" || !Array.isArray(candidate.activity) || candidate.activity.length > 12) throw new TaskError("invalid_agent_output");
  return { protocolVersion: 1, operationId: candidate.operationId, executionId: candidate.executionId, result: parseResult(candidate.result), activity: candidate.activity.map(parseActivity) };
}

function parseResult(value: unknown): GenerationEnvelope["result"] {
  if (!value || typeof value !== "object") throw new TaskError("invalid_agent_output");
  const result = value as Record<string, unknown>;
  if (result.status === "needs_clarification" && result.draft == null && typeof result.question === "string" && result.question.trim()) return { status: "needs_clarification", question: result.question };
  if (result.status === "draft_ready" && result.question == null) { const parsed = issueDraftSchema.safeParse(result.draft); if (parsed.success) return { status: "draft_ready", draft: parsed.data }; }
  throw new TaskError("invalid_agent_output");
}

function parseActivity(value: unknown): ToolOutcome {
  if (!value || typeof value !== "object") throw new TaskError("invalid_agent_activity");
  const activity = value as Record<string, unknown>;
  if (typeof activity.toolCallId !== "string" || !["done", "empty", "unavailable"].includes(String(activity.status)) || !Array.isArray(activity.evidenceIds) || !Number.isInteger(activity.durationMs) || Number(activity.durationMs) < 0) throw new TaskError("invalid_agent_activity");
  return { toolCallId: activity.toolCallId, status: activity.status as ToolOutcome["status"], evidenceIds: activity.evidenceIds as string[], durationMs: Number(activity.durationMs), ...(typeof activity.reason === "string" ? { reason: activity.reason } : {}) };
}
