import { z } from "zod";
import { specDecisions } from "../application/services/execution/executionContracts";

const scope = { projectId: z.string().uuid(), taskId: z.string().uuid() };

export const taskExecutionStatusSchema = z.object(scope).strict();
export const taskExecutionStartSchema = z.object({ ...scope, decisionId: z.string().uuid(), expectedDecisionVersion: z.number().int().positive(), idempotencyKey: z.string().uuid() }).strict();
export const taskExecutionCancelSchema = z.object({ ...scope, executionId: z.string().uuid(), idempotencyKey: z.string().uuid() }).strict();
export const taskExecutionSpecFilesSchema = z.object({ ...scope, executionId: z.string().uuid() }).strict();
export const taskExecutionReviewSpecSchema = z.object({ ...scope, executionId: z.string().uuid(), round: z.number().int().positive(), decision: z.enum(specDecisions), note: z.string().optional(), idempotencyKey: z.string().uuid() }).strict();
