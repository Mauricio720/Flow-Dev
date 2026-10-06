import { timingSafeEqual } from "node:crypto";
import { createProductionIssueContextController } from "@flow-dev/api/server";
import type { IssueContextRequest } from "@flow-dev/api";
import { readBodyWithinLimit } from "@/lib/http/requestBodyLimit";

export const runtime = "nodejs";
const MAX_REQUEST_BYTES = 16 * 1024;
let controller: ReturnType<typeof createProductionIssueContextController> | undefined;
type ContextRequest = { executionId: string; toolCallId: string; request: IssueContextRequest };

export async function POST(request: Request) {
  if (!validServiceKey(request.headers.get("authorization"))) return failure("unauthorized", 401);
  const body = await readBodyWithinLimit(request, MAX_REQUEST_BYTES);
  if (!body) return failure("input_capacity", 413);
  let input: unknown;
  try { input = JSON.parse(new TextDecoder().decode(body)); } catch { return failure("invalid_input", 400); }
  const parsed = parseContextRequest(input);
  if (!parsed) return failure("invalid_input", 400);
  const capability = request.headers.get("x-flow-context-capability") ?? "";
  try {
    const result = await (controller ??= createProductionIssueContextController()).handle(parsed, capability);
    return Response.json(result, { headers: { "cache-control": "no-store" } });
  } catch (error) { return mapFailure(error); }
}

function validServiceKey(header: string | null) {
  const expected = process.env.FLOW_DEV_INTERNAL_API_KEY;
  if (!expected || !header?.startsWith("Bearer ")) return false;
  const supplied = Buffer.from(header.slice(7));
  const configured = Buffer.from(expected);
  return supplied.length === configured.length && timingSafeEqual(supplied, configured);
}

function parseContextRequest(value: unknown): ContextRequest | null {
  if (!isRecord(value) || !isExactKeys(value, ["executionId", "toolCallId", "request"]) || !isUuid(value.executionId) || !isUuid(value.toolCallId) || !isRecord(value.request)) return null;
  const request = value.request;
  if (request.tool === "searchProject" || request.tool === "searchGitHubIssues") return isExactKeys(request, ["tool", "query"]) && typeof request.query === "string" && request.query.length >= 2 && request.query.length <= 180 ? value as ContextRequest : null;
  if (request.tool === "readProjectFile") return isExactKeys(request, ["tool", "path", "fromLine", "toLine"]) && typeof request.path === "string" && request.path.length <= 240 && isPositive(request.fromLine) && isPositive(request.toLine) ? value as ContextRequest : null;
  if (request.tool === "getGitHubIssue") return isExactKeys(request, ["tool", "issueNumber"]) && isPositive(request.issueNumber) ? value as ContextRequest : null;
  return null;
}

function mapFailure(error: unknown) {
  const reason = isRecord(error) && typeof error.reason === "string" ? error.reason : "service_unavailable";
  const status = reason === "capability_invalid" || reason === "access_revoked" ? 403 : reason === "tool_key_reused" || reason === "stale_execution" ? 409 : reason === "invalid_input" || reason === "invalid_query" || reason === "invalid_path" ? 400 : reason === "input_capacity" ? 413 : 503;
  return failure(reason, status);
}

function failure(reason: string, status: number) { return Response.json({ error: { reason, message: "Não foi possível consultar o contexto autorizado" } }, { status, headers: { "cache-control": "no-store" } }); }
function isRecord(value: unknown): value is Record<string, unknown> { return Boolean(value && typeof value === "object" && !Array.isArray(value)); }
function isExactKeys(value: Record<string, unknown>, keys: string[]) { return Object.keys(value).length === keys.length && keys.every((key) => key in value); }
function isUuid(value: unknown): value is string { return typeof value === "string" && /^[\da-f]{8}-(?:[\da-f]{4}-){3}[\da-f]{12}$/i.test(value); }
function isPositive(value: unknown): value is number { return Number.isInteger(value) && Number(value) > 0; }
