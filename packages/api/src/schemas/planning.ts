import { z } from "zod";

const version = z.number().int().positive().refine(Number.isSafeInteger);
const scope = z.object({ projectId: z.string().uuid(), taskId: z.string().uuid() }).strict();
const command = scope.extend({ requestKey: z.string().uuid(), expectedVersion: version }).strict();
export const planningCommandInputSchema = command;
export const planningRetryInputSchema = command.extend({ failedOperationId: z.string().uuid() }).strict();
export const planningSelectionInputSchema = command.extend({ decisionId: z.string().uuid(), expectedDecisionVersion: version, selectedRoute: z.enum(["direct_execution", "tech_spec", "prd"]) }).strict();
export const planningApprovalInputSchema = command.extend({ decisionId: z.string().uuid(), expectedDecisionVersion: version, reviewedRoute: z.enum(["direct_execution", "tech_spec", "prd"]) }).strict();
export const planningSubmissionInputSchema = scope.extend({ action: z.enum(["planning.start", "planning.retry", "planning.selectRoute", "planning.approve"]), requestKey: z.string().uuid() }).strict();
