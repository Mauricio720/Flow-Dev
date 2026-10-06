import { z } from "zod";

export const taskIdSchema = z.string().uuid();
const pageSchema = z.object({ projectId: z.string().uuid(), cursor: z.string().max(512).optional(), limit: z.number().int().min(1).max(100).default(30) });
const taskScopeSchema = z.object({ projectId: z.string().uuid(), taskId: taskIdSchema });
const commandSchema = taskScopeSchema.extend({ requestKey: z.string().uuid(), expectedVersion: z.number().int().positive() });
export const taskListInputSchema = pageSchema.extend({ search: z.string().optional() });
export const taskMessagesInputSchema = taskScopeSchema.extend({ cursor: z.string().max(512).optional(), limit: z.number().int().min(1).max(100).default(30) });
export const taskRevisionsInputSchema = taskMessagesInputSchema;
export const taskStartInputSchema = z.object({ projectId: z.string().uuid(), requestKey: z.string().uuid(), message: z.string().min(1) });
export const taskSendInputSchema = commandSchema.extend({ message: z.string().min(1) });
export const taskRetryInputSchema = commandSchema.extend({ failedOperationId: taskIdSchema });
export const taskResolveRefinementInputSchema = commandSchema.extend({ proposalOperationId: taskIdSchema, decision: z.enum(["apply", "discard"]), selectedPaths: z.array(z.string()).max(7) });
export const taskSubmissionInputSchema = z.object({ projectId: z.string().uuid(), action: z.enum(["start", "send", "saveDraft", "retryGeneration", "resolveRefinement", "publish", "reconcilePublication", "planning.start", "planning.retry", "planning.selectRoute", "planning.approve"]), requestKey: z.string().uuid() });
export const taskSaveDraftInputSchema = commandSchema.extend({ baseRevisionId: taskIdSchema, draft: z.unknown(), evidenceBindings: z.array(z.unknown()).max(100) });
export const taskPreviewInputSchema = taskScopeSchema.extend({ revisionId: taskIdSchema });
export const taskPublishInputSchema = commandSchema.extend({ revisionId: taskIdSchema, repositoryId: z.string().min(1).max(100), previewHash: z.string().regex(/^[a-f\d]{64}$/i) });
export const taskReconcilePublicationInputSchema = commandSchema.extend({ attemptId: taskIdSchema });
