import { z } from "zod";

const PROMPT_INPUT_MAX_LENGTH = 200_000;
const ID_LIST_MAX_LENGTH = 50;
const scope = z.object({ projectId: z.string().uuid(), taskId: z.string().uuid() }).strict();
const idList = z.array(z.string().uuid()).max(ID_LIST_MAX_LENGTH);

export const terminalPreflightInputSchema = scope;
export const terminalOpenInputSchema = scope.extend({ prompt: z.string().max(PROMPT_INPUT_MAX_LENGTH), requestKey: z.string().uuid(), attachmentIds: idList, issueImageIds: idList }).strict();
