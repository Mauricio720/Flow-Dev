import { z } from "zod";

const taskTargetSchema = z.object({ kind: z.literal("task"), projectId: z.string().uuid(), taskId: z.string().uuid() });
const queueTargetSchema = z.object({ kind: z.literal("queue"), projectId: z.string().uuid(), issueNodeId: z.string().min(1).max(120) });

export const deletionTargetSchema = z.discriminatedUnion("kind", [taskTargetSchema, queueTargetSchema]);
export const issueDeletionPreviewSchema = deletionTargetSchema;
export const issueDeletionStartSchema = z.object({ target: deletionTargetSchema, fingerprint: z.string().regex(/^[a-f\d]{64}$/i), requestKey: z.string().uuid() });
export const issueDeletionStatusSchema = z.object({ operationId: z.string().uuid() });
export const issueDeletionRetrySchema = z.object({ operationId: z.string().uuid(), requestKey: z.string().uuid() });
