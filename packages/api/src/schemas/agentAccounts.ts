import { z } from "zod";

const agentAccountId = z.string().uuid();

export const agentAccountCreateInputSchema = z.object({ provider: z.enum(["claude", "codex"]), label: z.string() });
export const agentAccountRenameInputSchema = z.object({ id: agentAccountId, label: z.string(), version: z.number().int().min(1) });
export const agentAccountIdInputSchema = z.object({ id: agentAccountId });
