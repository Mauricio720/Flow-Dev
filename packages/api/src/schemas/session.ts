import { z } from "zod";
import { PERMISSION_DECISIONS } from "../application/terminal/sessionInteraction";

const TRANSPORT_TEXT_LIMIT = 200_000;
const TRANSPORT_FREE_TEXT_LIMIT = 10_000;
const MAX_QUESTIONS_PER_REQUEST = 4;
const MAX_LABELS_PER_QUESTION = 50;
const MAX_KEY_LENGTH = 2_000;
const CURSOR_LIMIT = 500;
const scope = z.object({ projectId: z.string().uuid(), taskId: z.string().uuid() }).strict();
const sessionScope = scope.extend({ sessionId: z.string().uuid() });
const answer = z.object({ labels: z.array(z.string().max(MAX_KEY_LENGTH)).max(MAX_LABELS_PER_QUESTION), other: z.string().max(TRANSPORT_FREE_TEXT_LIMIT).optional() }).strict();

export const sessionTimelineInputSchema = sessionScope.extend({ after: z.string().max(CURSOR_LIMIT).optional() }).strict();
export const sessionSendInputSchema = sessionScope.extend({ content: z.string().max(TRANSPORT_TEXT_LIMIT), requestKey: z.string().uuid() }).strict();
export const sessionControlInputSchema = sessionScope.strict();
export const sessionAnswerQuestionInputSchema = scope.extend({ requestId: z.string().uuid(), answers: z.record(z.string().max(MAX_KEY_LENGTH), answer).refine((value) => Object.keys(value).length <= MAX_QUESTIONS_PER_REQUEST) }).strict();
export const sessionDecidePermissionInputSchema = scope.extend({ requestId: z.string().uuid(), decision: z.enum(PERMISSION_DECISIONS), reason: z.string().max(TRANSPORT_FREE_TEXT_LIMIT).optional() }).strict();
export const sessionDecideRouteSwitchInputSchema = sessionScope.extend({ proposalId: z.string().uuid(), decision: z.enum(["confirm", "decline"]), requestKey: z.string().uuid() }).strict();
