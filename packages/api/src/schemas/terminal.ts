import { z } from "zod";
import { DEFAULT_PERMISSION_MODE, PERMISSION_MODES } from "../application/terminal/sessionInteraction";
import { agentChoiceSchema } from "./plan";

const PROMPT_INPUT_MAX_LENGTH = 200_000;
const ID_LIST_MAX_LENGTH = 50;
const scope = z.object({ projectId: z.string().uuid(), taskId: z.string().uuid() }).strict();
const idList = z.array(z.string().uuid()).max(ID_LIST_MAX_LENGTH);
const route = z.object({ kind: z.literal("route"), choice: agentChoiceSchema.optional() }).strict();
const planItem = z.object({ kind: z.literal("plan_item"), planItemId: z.string().uuid() }).strict();
const forcedPlanItem = z.object({ kind: z.literal("plan_item"), planItemId: z.string().uuid(), force: z.boolean().optional() }).strict();
const previewGeneration = z.object({ kind: z.literal("generate_tasks"), specArtifactId: z.string().uuid().optional() }).strict();
const openGeneration = z.object({ kind: z.literal("generate_tasks"), specArtifactId: z.string().uuid(), choice: agentChoiceSchema }).strict();
const ROUTE_DEFAULT = { kind: "route" as const };

export const terminalPreflightInputSchema = scope.extend({ purpose: z.discriminatedUnion("kind", [route, previewGeneration, planItem]).default(ROUTE_DEFAULT) }).strict();
export const terminalOpenInputSchema = scope.extend({ prompt: z.string().max(PROMPT_INPUT_MAX_LENGTH), requestKey: z.string().uuid(), attachmentIds: idList, issueImageIds: idList, allowAdditional: z.boolean(), permissionMode: z.enum(PERMISSION_MODES).default(DEFAULT_PERMISSION_MODE), purpose: z.discriminatedUnion("kind", [route, openGeneration, forcedPlanItem]).default(ROUTE_DEFAULT) }).strict();
