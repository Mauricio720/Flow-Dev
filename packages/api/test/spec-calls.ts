import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import type { SpecSetup } from "./spec-support";
import { specCaller, specRouter, specScope } from "./spec-support";

export const SPEC_COMMANDS = ["start", "adjust", "answer", "permission", "cancel", "retry", "returnToReview", "approve"] as const;
export const SPEC_QUERIES = ["byTask", "events", "event", "packages", "package", "document", "submission"] as const;
export const SPEC_PROCEDURES = [...SPEC_QUERIES, ...SPEC_COMMANDS] as const;
export type SpecProcedure = (typeof SPEC_PROCEDURES)[number];
type Overrides = { requestKey?: string; expectedSpecVersion?: number; projectId?: string; taskId?: string };

const HASH = "a".repeat(64);

export function specInputs(setup: SpecSetup, overrides: Overrides = {}): Record<SpecProcedure, Record<string, unknown>> {
  const scope = { ...specScope(setup), ...(overrides.projectId ? { projectId: overrides.projectId } : {}), ...(overrides.taskId ? { taskId: overrides.taskId } : {}) };
  const command = { ...scope, requestKey: overrides.requestKey ?? crypto.randomUUID(), expectedSpecVersion: overrides.expectedSpecVersion ?? 0 };
  const targets = { attemptId: crypto.randomUUID(), interactionId: crypto.randomUUID(), packageId: crypto.randomUUID() };
  return {
    byTask: scope, events: { ...scope, limit: 50 }, event: { ...scope, eventId: crypto.randomUUID() }, packages: { ...scope, limit: 20 }, package: { ...scope, packageId: targets.packageId },
    document: { ...scope, packageId: targets.packageId, documentId: crypto.randomUUID(), limit: 100 }, submission: { ...scope, action: "spec.start", requestKey: crypto.randomUUID() },
    start: { ...command, stage: "prd" }, adjust: { ...command, stage: "prd", packageId: targets.packageId, manifestHash: HASH, text: "ajuste" },
    answer: { ...command, attemptId: targets.attemptId, interactionId: targets.interactionId, response: { choiceIndex: 0 } },
    permission: { ...command, attemptId: targets.attemptId, interactionId: targets.interactionId, actionDigest: HASH, decision: "allow_once" },
    cancel: { ...command, attemptId: targets.attemptId }, retry: { ...command, failedAttemptId: targets.attemptId },
    returnToReview: { ...command, failedAttemptId: targets.attemptId, packageId: targets.packageId, manifestHash: HASH }, approve: { ...command, stage: "tech_spec", packageId: targets.packageId, manifestHash: HASH },
  };
}

export function callProcedure(caller: ReturnType<typeof specCaller>, name: SpecProcedure, input: Record<string, unknown>) {
  return (caller[name] as unknown as (input: unknown) => Promise<unknown>)(input);
}

export async function httpProcedure(setup: SpecSetup, name: SpecProcedure, input: Record<string, unknown>) {
  const query = (SPEC_QUERIES as readonly string[]).includes(name);
  const url = `http://localhost/api/trpc/${name}${query ? `?input=${encodeURIComponent(JSON.stringify(input))}` : ""}`;
  const request = new Request(url, { method: query ? "GET" : "POST", headers: { "content-type": "application/json" }, body: query ? undefined : JSON.stringify(input) });
  const response = await fetchRequestHandler({ endpoint: "/api/trpc", req: request, router: specRouter(setup), createContext: () => ({ requestId: "spec-http", principal: { userId: setup.ownerId, sessionId: setup.sessionId } }) });
  const body = await response.json() as { error?: { data?: { reason?: string; code?: string } } };
  return { status: response.status, reason: body.error?.data?.reason };
}
