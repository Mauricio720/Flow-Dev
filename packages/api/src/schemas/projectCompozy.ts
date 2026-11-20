import { z } from "zod";

const MAX_CHECKOUT_PATH_LENGTH = 4096;
const revisionSchema = z.number().int().positive();

export const projectCompozyGetSchema = z.object({ projectId: z.string().uuid() }).strict();
export const projectCompozySaveSchema = z.object({ projectId: z.string().uuid(), checkoutPath: z.string().max(MAX_CHECKOUT_PATH_LENGTH), expectedRevision: revisionSchema.optional() }).strict();
export const projectCompozyCheckSchema = z.object({ projectId: z.string().uuid(), expectedRevision: revisionSchema }).strict();
