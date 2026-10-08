import { z } from "zod";

const uuid = z.string().uuid();
const scope = z.object({ projectId: uuid, taskId: uuid });
const page = { cursor: z.string().max(1024).optional(), limit: z.number().int().min(1).max(50).default(20) };
const nodeId = z.string().min(1).max(256);

export const assignedIssuesListSchema = z.object({ projectId: uuid, ...page });
export const assignedIssueLookupSchema = z.object({ projectId: uuid, issueNodeId: nodeId, boardItemId: nodeId });
export const assignedIssueClaimSchema = assignedIssueLookupSchema.extend({ requestKey: uuid });
export const assignedIssueScopeSchema = scope;
export const assignedIssueReconcileSchema = scope.extend({ requestKey: uuid });
export const assignedIssueActiveSchema = z.object({ projectId: uuid, filter: z.enum(["mine", "shared"]).default("mine"), ...page });
