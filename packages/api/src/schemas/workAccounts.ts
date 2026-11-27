import { z } from "zod";

const taskId = z.string().uuid();
export const workAccountGetInputSchema = z.object({ taskId });
export const workAccountSetInputSchema = z.object({ taskId, provider: z.enum(["claude", "codex"]), accountId: z.string().uuid().nullable(), version: z.number().int().min(0) });
