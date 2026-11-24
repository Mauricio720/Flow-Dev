import { z } from "zod";
import { SESSION_AGENTS } from "../application/terminal/sessionAgentCatalog";

const MAX_TEXT_LENGTH = 64;
const MAX_LIST_LENGTH = 100;

const scope = z.object({ projectId: z.string().uuid(), taskId: z.string().uuid() }).strict();
export const agentChoiceSchema = z.object({ agent: z.enum(SESSION_AGENTS), model: z.string().min(1).max(MAX_TEXT_LENGTH), effort: z.string().min(1).max(MAX_TEXT_LENGTH) }).strict();
const item = z.object({ id: z.string().uuid().optional(), taskIds: z.array(z.string().min(1).max(MAX_TEXT_LENGTH)).max(MAX_LIST_LENGTH), choice: agentChoiceSchema }).strict();

export const planGetInputSchema = scope;
export const planSaveInputSchema = scope.extend({ version: z.number().int().min(0), items: z.array(item).max(MAX_LIST_LENGTH) }).strict();
