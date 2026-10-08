import { z } from "zod";

export const localProjectMineSchema = z.object({ projectId: z.string().uuid() }).strict();
export const localProjectUnlinkSchema = z.object({ projectId: z.string().uuid(), linkId: z.string().uuid(), expectedRevision: z.number().int().positive(), requestKey: z.string().uuid() }).strict();
export const localProjectLinkRequestSchema = z.object({ projectId: z.string().uuid() }).strict();
