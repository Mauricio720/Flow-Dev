import { createHash } from "node:crypto";
import { z } from "zod";
import { readBodyWithinLimit } from "./requestBodyLimit";

const MAX_BODY_BYTES = 256 * 1024;

export const pairingCreateInput = z.object({ protocolVersion: z.number().int().positive(), label: z.string().trim().min(1).max(80), pollingSecret: z.string().min(40).max(256) }).strict();
export const pairingExchangeInput = z.object({ pairingId: z.string().uuid(), pollingSecret: z.string().min(40).max(256), requestKey: z.string().uuid() }).strict();
export const heartbeatInput = z.object({ protocolVersion: z.number().int().positive(), capabilities: z.array(z.string().min(1).max(128)).max(32), catalogRevision: z.number().int().min(0), providerCatalog: z.array(z.unknown()).max(2).default([]), loopCatalog: z.array(z.unknown()).max(32).default([]), requestKey: z.string().uuid(), acknowledgedCredentialGeneration: z.number().int().positive().optional() }).strict();
export const linkPublishInput = z.object({ protocolVersion: z.number().int().positive(), projectId: z.string().uuid(), checkoutHandle: z.string().regex(/^[a-f0-9]{64}$/i), checkoutKey: z.string().regex(/^[a-f0-9]{64}$/i), repositoryOwner: z.string().trim().min(1).max(100), repositoryName: z.string().trim().min(1).max(100), safeLabel: z.string().trim().min(1).max(80), expectedRevision: z.number().int().min(0), requestKey: z.string().uuid() }).strict();
export const commandPollInput = z.object({ protocolVersion: z.number().int().positive(), lastAcknowledgedCommand: z.string().uuid().nullable().optional(), limit: z.number().int().min(1).max(20).default(10) }).strict();
export const commandEventsInput = z.object({ protocolVersion: z.number().int().positive(), events: z.array(z.unknown()).min(1).max(50) }).strict();
export const linkRequestClaimInput = z.object({ protocolVersion: z.number().int().positive() }).strict();
export const linkRequestSettleInput = z.object({ protocolVersion: z.number().int().positive(), requestId: z.string().uuid(), outcome: z.enum(["linked", "failed"]), reason: z.string().regex(/^[a-z_]{1,64}$/).nullable().optional() }).strict();
export const unpairInput = z.object({ protocolVersion: z.number().int().positive(), requestKey: z.string().uuid() }).strict();

export async function parseBoundedJson<T>(request: Request, schema: z.ZodType<T>) {
  const contentType = request.headers.get("content-type")?.split(";", 1)[0]?.trim().toLowerCase();
  if (contentType !== "application/json" && !contentType?.endsWith("+json")) return { response: failure("invalid_input", 400) } as const;
  const body = await readBodyWithinLimit(request, MAX_BODY_BYTES);
  if (!body) return { response: failure("payload_too_large", 413) } as const;
  let value: unknown;
  try { value = JSON.parse(new TextDecoder().decode(body)); } catch { return { response: failure("invalid_input", 400) } as const; }
  const parsed = schema.safeParse(value);
  return parsed.success ? { input: parsed.data } as const : { response: failure("invalid_input", 400) } as const;
}

export function guardConnectorRequest(request: Request, kind: "pairing" | "machine"): { response: Response | null; token: string | null; rateKey: string | null } {
  const forwardedProtocol = request.headers.get("x-forwarded-proto")?.split(",", 1)[0]?.trim();
  const requestProtocol = forwardedProtocol ? `${forwardedProtocol}:` : new URL(request.url).protocol;
  const transportError = process.env.NODE_ENV === "production" && requestProtocol !== "https:" ? failure("https_required", 400) : request.headers.has("cookie") ? failure("browser_auth_not_allowed", 401) : null;
  if (transportError) return { response: transportError, token: null, rateKey: null };
  const authorization = request.headers.get("authorization");
  if (kind === "pairing") {
    if (authorization) return { response: failure("invalid_input", 400), token: null, rateKey: null };
    const ip = request.headers.get("x-real-ip") ?? request.headers.get("x-forwarded-for")?.split(",", 1)[0]?.trim() ?? "unknown";
    return { response: null, token: null, rateKey: `flow-local:pairing:${createHash("sha256").update(ip).digest("hex")}` };
  }
  if (!authorization?.startsWith("Bearer ")) return { response: failure("machine_unauthorized", 401), token: null, rateKey: null };
  const token = authorization.slice(7).trim();
  if (!token || token.length > 512) return { response: failure("machine_unauthorized", 401), token: null, rateKey: null };
  const digest = createHash("sha256").update(token).digest("hex");
  return { response: null, token, rateKey: `flow-local:machine:${digest}` };
}

export function connectorFailure(error: unknown) {
  const reason = typeof error === "object" && error !== null && "reason" in error && typeof error.reason === "string" ? error.reason : "internal_error";
  const status = reason === "invalid_input" || reason === "invalid_cursor" ? 400
    : ["protocol_incompatible", "catalog_changed", "pairing_consumed", "request_key_reused", "link_changed", "stale_fence", "event_conflict", "event_gap", "checkout_busy"].includes(reason) ? 409
      : reason === "pairing_expired" ? 410
        : ["pairing_secret_invalid", "machine_unauthorized", "machine_revoked"].includes(reason) ? 401
          : ["project_unavailable", "link_unavailable", "command_unavailable"].includes(reason) ? 404
            : ["repository_mismatch", "evidence_rejected"].includes(reason) ? 412
              : 500;
  return failure(reason, status);
}

export function connectorJson(value: unknown, status = 200) {
  return Response.json(value, { status, headers: { "cache-control": "no-store", "x-content-type-options": "nosniff" } });
}

export function rateLimited(retryAfterSeconds: number) {
  return Response.json({ error: { reason: "rate_limited", message: "Limite de solicitações atingido" } }, { status: 429, headers: { "cache-control": "no-store", "x-content-type-options": "nosniff", "retry-after": String(retryAfterSeconds) } });
}

export function failure(reason: string, status: number) {
  return Response.json({ error: { reason, message: "Não foi possível concluir a operação do conector local" } }, { status, headers: { "cache-control": "no-store", "x-content-type-options": "nosniff", ...(status === 429 ? { "retry-after": "60" } : {}) } });
}
