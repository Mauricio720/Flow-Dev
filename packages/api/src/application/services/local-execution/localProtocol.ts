import { z } from "zod";
import { LocalExecutionError } from "./localExecutionErrors";
import { localPayloadHash } from "./localHash";
import { FAILURE_DETAIL_MAX } from "./localFailureDetail";
import { QUESTION_CHOICES_MAX, QUESTION_STATES } from "./localQuestions";
import { ARTIFACT_BASE64_PATTERN, ARTIFACT_MAX_BASE64_LENGTH, ARTIFACT_MAX_BYTES, ARTIFACT_MAX_FILES, ARTIFACT_MAX_PARTS, ARTIFACT_PATH_PATTERN } from "./localArtifacts";

const UUID = z.string().uuid();
const SAFE_ID = z.string().min(1).max(128);
const TARGET = z.object({ machineId: UUID, linkId: UUID, linkRevision: z.number().int().positive(), checkoutHandle: SAFE_ID }).strict();
const EMPTY = z.object({}).strict();
const LOOP_TASK_FILES = z.array(z.object({ path: z.string().regex(ARTIFACT_PATH_PATTERN), content: z.string().min(1).max(ARTIFACT_MAX_BYTES) }).strict()).max(ARTIFACT_MAX_FILES);
const SHORT_LABEL = z.string().max(100);
export const ACTIVITY_KINDS = ["agent_message", "tool_call", "tool_result", "interaction", "lifecycle", "warning"] as const;
const SAFE_CATALOG_TEXT = z.string().trim().min(1).max(128).refine((value) => !/[\u0000-\u001f\u007f]|(?:^|\s)(?:\/home\/|\/Users\/|[A-Z]:\\Users\\)|(?:gh[pousr]_[A-Za-z0-9_]{20,}|sk-[A-Za-z0-9_-]{20,})/i.test(value));
export const localProviderCatalogSchema = z.array(z.object({
  providerId: z.enum(["codex", "claude"]),
  providerKind: z.enum(["codex", "claude"]),
  label: SAFE_CATALOG_TEXT,
  models: z.array(z.object({
    modelId: SAFE_CATALOG_TEXT,
    displayName: SAFE_CATALOG_TEXT,
    selectable: z.boolean(),
    unselectableReason: z.enum(["auth_required", "catalog_stale", "model_unavailable", "runtime_incompatible", "service_unavailable"]).nullable(),
    reasoningChoices: z.array(z.string().max(80).nullable()).max(32),
  }).strict()).max(256),
}).strict()).max(2).superRefine((catalog, context) => {
  if (new Set(catalog.map((provider) => provider.providerId)).size !== catalog.length) context.addIssue({ code: "custom", message: "duplicate_provider" });
  for (const provider of catalog) {
    if (provider.providerId !== provider.providerKind) context.addIssue({ code: "custom", message: "provider_kind_mismatch" });
    if (new Set(provider.models.map((model) => model.modelId)).size !== provider.models.length) context.addIssue({ code: "custom", message: "duplicate_model" });
    if (provider.models.some((model) => model.selectable && (model.unselectableReason !== null || !model.reasoningChoices.length))) context.addIssue({ code: "custom", message: "invalid_selectable_model" });
  }
});
const COMMAND_DATA = {
  protocolVersion: z.literal(1), commandId: UUID, machineId: UUID, projectId: UUID, runId: UUID,
  actorId: UUID, fence: z.number().int().positive(), leaseExpiresAt: z.string().datetime(), target: TARGET,
  payloadHash: z.string().regex(/^[a-f0-9]{64}$/i),
};
const EVENT_DATA = {
  protocolVersion: z.literal(1), commandId: UUID, runId: UUID, fence: z.number().int().positive(),
  sequence: z.number().int().positive(), payloadHash: z.string().regex(/^[a-f0-9]{64}$/i),
};

export const localCommandSchema = z.discriminatedUnion("kind", [
  z.object({ ...COMMAND_DATA, kind: z.literal("prepare"), payload: z.object({ preparationId: UUID, actionId: SAFE_ID, sourceSnapshotId: UUID, checkoutLabel: z.string().trim().min(1).max(80), action: z.record(z.string(), z.unknown()) }).strict() }).strict(),
  z.object({ ...COMMAND_DATA, kind: z.literal("start"), payload: z.object({ preparationId: UUID, actionId: SAFE_ID, taskId: UUID, snapshot: z.record(z.string(), z.unknown()), task: z.object({ issueNumber: z.number().int().positive(), title: z.string().min(1).max(256), bodyMarkdown: z.string().max(65_536) }).strict(), taskFiles: LOOP_TASK_FILES.optional() }).strict() }).strict(),
  z.object({ ...COMMAND_DATA, kind: z.literal("inspect"), payload: z.object({}).strict() }).strict(),
  z.object({ ...COMMAND_DATA, kind: z.literal("cancel"), payload: z.object({ requestKey: UUID }).strict() }).strict(),
  z.object({ ...COMMAND_DATA, kind: z.literal("answer"), payload: z.object({ interactionId: SAFE_ID, answer: z.string().min(1).max(8000) }).strict() }).strict(),
]);

export const localEventSchema = z.discriminatedUnion("kind", [
  z.object({ ...EVENT_DATA, kind: z.literal("accepted"), payload: z.object({ runtimeExecutionId: SAFE_ID, runtimeWorkspaceId: SAFE_ID, runtimeSessionId: SAFE_ID, runtimeTurnId: SAFE_ID.nullable() }).strict() }).strict(),
  z.object({ ...EVENT_DATA, kind: z.literal("prepared"), payload: z.object({ preparationId: UUID, checkoutLabel: z.string().trim().min(1).max(80), dirty: z.boolean(), checkoutDigest: z.string().regex(/^[a-f0-9]{64}$/i), manifestHash: z.string().regex(/^[a-f0-9]{64}$/i), capabilities: z.array(SAFE_ID).max(32), requiredGates: z.array(z.object({ id: SAFE_ID, label: z.string().trim().min(1).max(80), commandDigest: z.string().regex(/^[a-f0-9]{64}$/i), kind: z.enum(["command", "playwright"]) }).strict()).max(64) }).strict() }).strict(),
  z.object({ ...EVENT_DATA, kind: z.literal("activity"), payload: z.object({ summary: z.string().max(2048), relativeFiles: z.array(z.string().max(256)).max(50), kind: z.enum(ACTIVITY_KINDS).optional(), tool: SHORT_LABEL.nullable().optional(), status: SHORT_LABEL.nullable().optional(), at: z.string().datetime().optional() }).strict() }).strict(),
  z.object({ ...EVENT_DATA, kind: z.literal("question"), payload: z.object({ interactionId: SAFE_ID, status: z.enum(QUESTION_STATES), title: z.string().min(1).max(FAILURE_DETAIL_MAX), choices: z.array(z.string().min(1).max(FAILURE_DETAIL_MAX)).max(QUESTION_CHOICES_MAX) }).strict() }).strict(),
  z.object({ ...EVENT_DATA, kind: z.literal("artifact"), payload: z.object({ path: z.string().regex(ARTIFACT_PATH_PATTERN), part: z.number().int().positive().max(ARTIFACT_MAX_PARTS), parts: z.number().int().positive().max(ARTIFACT_MAX_PARTS), contentBase64: z.string().min(1).max(ARTIFACT_MAX_BASE64_LENGTH).regex(ARTIFACT_BASE64_PATTERN) }).strict() }).strict(),
  z.object({ ...EVENT_DATA, kind: z.literal("gate"), payload: z.object({ gateId: SAFE_ID, attempt: z.number().int().positive(), manifestHash: z.string().regex(/^[a-f0-9]{64}$/i), commandDigest: z.string().regex(/^[a-f0-9]{64}$/i), checkedCheckoutDigest: z.string().regex(/^[a-f0-9]{64}$/i), state: z.enum(["passed", "failed", "blocked", "unrun", "unknown"]), reason: SAFE_ID.nullable(), evidenceHash: z.string().regex(/^[a-f0-9]{64}$/i).nullable(), exitCode: z.number().int().nullable(), executionId: SAFE_ID, startedAt: z.string().datetime(), finishedAt: z.string().datetime().nullable() }).strict() }).strict(),
  z.object({ ...EVENT_DATA, kind: z.literal("terminal"), payload: z.object({ outcome: z.enum(["succeeded", "failed", "blocked", "canceled", "unknown"]), reason: SAFE_ID.nullable(), checkoutDigest: z.string().regex(/^[a-f0-9]{64}$/i).nullable(), artifactsSafe: z.boolean(), runtimeSucceeded: z.boolean(), detail: z.string().min(1).max(FAILURE_DETAIL_MAX).optional() }).strict() }).strict(),
]);

export type LocalCommand = z.infer<typeof localCommandSchema>;
export type LocalEvent = z.infer<typeof localEventSchema>;

export function validateLocalCommand(input: unknown): LocalCommand {
  assertVersion(input);
  const parsed = localCommandSchema.safeParse(input);
  if (!parsed.success) throw new LocalExecutionError("invalid_input");
  if (parsed.data.machineId !== parsed.data.target.machineId) throw new LocalExecutionError("command_unavailable");
  if (parsed.data.payloadHash !== localPayloadHash(parsed.data.payload)) throw new LocalExecutionError("invalid_input");
  return parsed.data;
}

export function validateLocalEvent(input: unknown): LocalEvent {
  assertVersion(input);
  const parsed = localEventSchema.safeParse(input);
  if (!parsed.success) throw new LocalExecutionError("invalid_input");
  if (parsed.data.payloadHash !== localPayloadHash(parsed.data.payload)) throw new LocalExecutionError("invalid_input");
  return parsed.data;
}

function assertVersion(input: unknown) {
  if (typeof input === "object" && input !== null && "protocolVersion" in input && input.protocolVersion !== 1) throw new LocalExecutionError("protocol_incompatible");
}
