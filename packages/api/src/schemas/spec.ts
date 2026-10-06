import { z } from "zod";
import { SPEC_STAGES } from "../application/services/spec/specContracts";
import { SPEC_BLOCKS_MAX_LIMIT, SPEC_EVENTS_DEFAULT_LIMIT, SPEC_EVENTS_MAX_LIMIT, SPEC_PACKAGES_DEFAULT_LIMIT, SPEC_PACKAGES_MAX_LIMIT, SPEC_TEXT_MAX_BYTES } from "../application/services/spec/specLimits";
import { isBoundedSpecText, specTextByteLength } from "../application/services/spec/specTextRules";

const CURSOR_MAX_LENGTH = 1024;
const MANIFEST_HASH_PATTERN = /^[0-9a-f]{64}$/;
const invalidInput = { error: "spec:invalid_input" };
const id = z.string().uuid(invalidInput);
const scope = z.object({ projectId: id, taskId: id }).strict();
const command = scope.extend({ requestKey: id, expectedSpecVersion: z.number().int().nonnegative().refine(Number.isSafeInteger) }).strict();
const stage = z.enum(SPEC_STAGES, invalidInput);
const cursor = z.string().min(1).max(CURSOR_MAX_LENGTH, { error: "spec:invalid_cursor" });
const manifestHash = z.string().regex(MANIFEST_HASH_PATTERN, invalidInput);
const boundedText = z.string().refine(isBoundedSpecText, invalidInput);

const answerIssue = (message: string) => ({ code: "custom" as const, message: `spec:${message}`, path: [] as string[] });
const answerResponse = z.object({ choiceIndex: z.number({ error: "spec:invalid_answer" }).int({ error: "spec:invalid_answer" }).min(0, { error: "spec:invalid_answer" }).optional(), text: z.string({ error: "spec:invalid_answer" }).optional() }).strict().superRefine((value, context) => {
  if ((value.choiceIndex === undefined) === (value.text === undefined)) context.addIssue(answerIssue("invalid_answer"));
  if (value.text !== undefined && !value.text.trim()) context.addIssue(answerIssue("invalid_answer"));
  if (value.text !== undefined && specTextByteLength(value.text) > SPEC_TEXT_MAX_BYTES) context.addIssue(answerIssue("invalid_input"));
});

export const specScopeInputSchema = scope;
export const specEventsInputSchema = scope.extend({ after: cursor.optional(), before: cursor.optional(), latest: z.boolean().optional(), limit: z.number().int().min(1).max(SPEC_EVENTS_MAX_LIMIT).default(SPEC_EVENTS_DEFAULT_LIMIT) }).strict().refine((input) => !(input.after && input.before) && !(input.latest && (input.after || input.before)), { path: ["before"], error: "spec:invalid_input" });
export const specEventInputSchema = scope.extend({ eventId: id }).strict();
export const specPackagesInputSchema = scope.extend({ cursor: cursor.optional(), limit: z.number().int().min(1).max(SPEC_PACKAGES_MAX_LIMIT).default(SPEC_PACKAGES_DEFAULT_LIMIT) }).strict();
export const specPackageInputSchema = scope.extend({ packageId: id }).strict();
export const specDocumentInputSchema = scope.extend({ packageId: id, documentId: id, cursor: cursor.optional(), limit: z.number().int().min(1).max(SPEC_BLOCKS_MAX_LIMIT).default(SPEC_BLOCKS_MAX_LIMIT) }).strict();
export const specSubmissionInputSchema = scope.extend({ action: z.enum(["spec.start", "spec.adjust", "spec.answer", "spec.permission", "spec.cancel", "spec.retry", "spec.returnToReview", "spec.approve"]), requestKey: id }).strict();
export const specStartInputSchema = command.extend({ stage }).strict();
export const specAdjustInputSchema = command.extend({ stage, packageId: id, manifestHash, text: boundedText }).strict();
export const specAnswerInputSchema = command.extend({ attemptId: id, interactionId: id, response: answerResponse }).strict();
export const specPermissionInputSchema = command.extend({ attemptId: id, interactionId: id, actionDigest: z.string({ error: "spec:invalid_permission" }).regex(MANIFEST_HASH_PATTERN, { error: "spec:invalid_permission" }), decision: z.enum(["allow_once", "deny_once"], { error: "spec:invalid_permission" }) }).strict();
export const specCancelInputSchema = command.extend({ attemptId: id }).strict();
export const specRetryInputSchema = command.extend({ failedAttemptId: id }).strict();
export const specReturnToReviewInputSchema = command.extend({ failedAttemptId: id, packageId: id, manifestHash }).strict();
export const specApproveInputSchema = command.extend({ stage, packageId: id, manifestHash }).strict();
